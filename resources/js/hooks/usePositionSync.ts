import { useRef, useCallback, useEffect } from 'react';
import api from '@/api/client';
import {
    saveLocalPosition,
    getBookSyncState,
    updateServerState,
    getUnsyncedPositions,
    markPositionsSynced,
} from '@/services/offlineDb';
import {
    isEffectivelyOffline,
    isNetworkError,
    markAsOffline,
    markAsOnline,
} from '@/services/networkState';
import { debugLog, debugWarn, debugError } from '@/services/debugLogger';

interface PositionSyncOptions {
    bookId: number;
    debounceMs?: number;
}

export interface LoadedPosition {
    cfi: string | null;
    progress: number;
    source: 'local' | 'server';
}

// Threshold for considering server position as "newer" (from another device)
const MULTI_DEVICE_THRESHOLD_MS = 5000;

/**
 * Local-first position synchronization hook
 *
 * Strategy:
 * - Always save to IndexedDB first (guaranteed persistence)
 * - Sync to server in background (best effort)
 * - On load: use local position immediately, check server in background
 * - Detect multi-device sync via timestamp comparison
 */
export function usePositionSync({ bookId, debounceMs = 500 }: PositionSyncOptions) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef<{ cfi: string; timestamp: number } | null>(null);
    const isMountedRef = useRef(true);

    // Track mount state to avoid state updates after unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    /**
     * Load position with local-first strategy:
     * 1. Return local position immediately if available
     * 2. Fetch server position in background
     * 3. If server is significantly newer, dispatch event for reader to handle
     */
    const loadPosition = useCallback(async (): Promise<LoadedPosition | null> => {
        debugLog('PositionSync', 'Loading position for book', bookId);

        // Step 1: Get local sync state
        const localState = await getBookSyncState(bookId);

        // Step 2: Start server fetch (non-blocking)
        const serverPromise = fetchServerPosition(bookId);

        // Step 3: If we have local data, use it immediately for fast UX
        if (localState?.lastLocalCfi) {
            debugLog('PositionSync', 'Using local position', {
                cfi: localState.lastLocalCfi,
                progress: localState.lastLocalProgress,
            });

            // Check server in background for multi-device sync
            serverPromise
                .then((serverPos) => {
                    if (!serverPos || !isMountedRef.current) return;

                    const serverTime = serverPos.timestamp?.getTime() || 0;
                    const localTime = localState.lastLocalTimestamp?.getTime() || 0;

                    // Check if server position is significantly ahead (another device read further)
                    if (
                        serverTime > localTime + MULTI_DEVICE_THRESHOLD_MS &&
                        serverPos.progress > localState.lastLocalProgress
                    ) {
                        debugLog('PositionSync', 'Server position is newer (another device)', {
                            serverProgress: serverPos.progress,
                            localProgress: localState.lastLocalProgress,
                            timeDiff: serverTime - localTime,
                        });

                        // Dispatch event for reader to handle multi-device sync
                        window.dispatchEvent(
                            new CustomEvent('position-sync-available', {
                                detail: { bookId, serverPosition: serverPos },
                            })
                        );
                    }

                    // Update server state cache regardless
                    updateServerState(
                        bookId,
                        serverPos.cfi,
                        serverPos.progress,
                        serverPos.timestamp || new Date()
                    );
                })
                .catch((err) => {
                    debugWarn('PositionSync', 'Failed to fetch server position in background', err);
                });

            return {
                cfi: localState.lastLocalCfi,
                progress: localState.lastLocalProgress,
                source: 'local',
            };
        }

        // Step 4: No local data, wait for server response
        try {
            const serverPos = await serverPromise;
            if (serverPos) {
                debugLog('PositionSync', 'Using server position (no local)', serverPos);
                await updateServerState(
                    bookId,
                    serverPos.cfi,
                    serverPos.progress,
                    serverPos.timestamp || new Date()
                );
                return {
                    cfi: serverPos.cfi,
                    progress: serverPos.progress,
                    source: 'server',
                };
            }
        } catch (error) {
            debugError('PositionSync', 'Failed to load position from server', error);
        }

        return null;
    }, [bookId]);

    /**
     * Save position with local-first strategy:
     * 1. Always write to IndexedDB first (guaranteed)
     * 2. Attempt server sync (best effort)
     */
    const savePosition = useCallback(
        (cfi: string, progress: number) => {
            // Skip 0% progress - meaningless and would overwrite real progress
            if (progress === 0) {
                debugLog('PositionSync', 'Ignoring 0% progress');
                return;
            }

            // Skip duplicate saves within 1 second
            const now = Date.now();
            if (lastSavedRef.current?.cfi === cfi && now - lastSavedRef.current.timestamp < 1000) {
                debugLog('PositionSync', 'Skipping duplicate save');
                return;
            }

            // Clear existing debounce timer
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(async () => {
                try {
                    // STEP 1: Always save locally first (guaranteed persistence)
                    debugLog('PositionSync', 'Saving to IndexedDB', { cfi, progress });
                    await saveLocalPosition(bookId, cfi, progress);
                    lastSavedRef.current = { cfi, timestamp: Date.now() };

                    // STEP 2: Attempt server sync (best effort, non-blocking)
                    if (!isEffectivelyOffline()) {
                        syncToServer(bookId, cfi, progress);
                    } else {
                        debugLog('PositionSync', 'Offline - skipping server sync');
                    }
                } catch (error) {
                    debugError('PositionSync', 'Failed to save position locally', error);
                }
            }, debounceMs);
        },
        [bookId, debounceMs]
    );

    /**
     * Immediate flush for visibility change / page unload
     * Critical: saves to IndexedDB synchronously, sendBeacon as backup
     */
    const flushSync = useCallback(
        (cfi: string | null, progress: number) => {
            // Clear pending debounce
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Skip invalid saves
            if (!cfi || progress === 0) {
                debugLog('PositionSync', 'flushSync - skipping (no cfi or 0%)');
                return;
            }

            // Skip duplicate saves
            if (lastSavedRef.current?.cfi === cfi) {
                debugLog('PositionSync', 'flushSync - skipping (already saved)');
                return;
            }

            debugLog('PositionSync', 'flushSync - saving position', { cfi, progress });

            // CRITICAL: Save to IndexedDB first (this is the guaranteed save)
            // In pagehide/visibilitychange, browser gives a short window for async work
            saveLocalPosition(bookId, cfi, progress)
                .then(() => {
                    debugLog('PositionSync', 'flushSync - IndexedDB save complete');
                })
                .catch((err) => {
                    debugError('PositionSync', 'flushSync - IndexedDB save failed', err);
                });

            lastSavedRef.current = { cfi, timestamp: Date.now() };

            // Also try sendBeacon as backup (may or may not succeed)
            if (!isEffectivelyOffline()) {
                const url = `/api/books/${bookId}/progress`;
                const data = JSON.stringify({
                    progress,
                    position: cfi,
                    client: 'web',
                    timestamp: new Date().toISOString(),
                });
                const blob = new Blob([data], { type: 'application/json' });
                const sent = navigator.sendBeacon?.(url, blob) ?? false;
                debugLog('PositionSync', `flushSync - sendBeacon ${sent ? 'queued' : 'failed'}`);
            }
        },
        [bookId]
    );

    return {
        loadPosition,
        savePosition,
        flushSync,
    };
}

/**
 * Fetch position from server
 */
async function fetchServerPosition(bookId: number): Promise<{
    cfi: string | null;
    progress: number;
    timestamp: Date | null;
} | null> {
    try {
        const response = await api.get(`/books/${bookId}/progress`);
        markAsOnline();
        const data = response.data.data;
        if (data) {
            return {
                cfi: data.position || null,
                progress: data.progress || 0,
                timestamp: data.last_sync_at ? new Date(data.last_sync_at) : null,
            };
        }
    } catch (error) {
        if (isNetworkError(error)) {
            markAsOffline();
        }
        throw error;
    }
    return null;
}

/**
 * Sync position to server (fire-and-forget)
 */
async function syncToServer(bookId: number, cfi: string, progress: number): Promise<void> {
    try {
        await api.put(`/books/${bookId}/progress`, {
            progress,
            position: cfi,
            client: 'web',
            timestamp: new Date().toISOString(),
        });
        markAsOnline();
        debugLog('PositionSync', 'Server sync successful');

        // Mark local positions as synced
        const positions = await getUnsyncedPositions();
        const bookPositions = positions.filter((p) => p.bookId === bookId);
        if (bookPositions.length > 0) {
            const ids = bookPositions.map((p) => p.id).filter((id): id is number => id !== undefined);
            await markPositionsSynced(ids);
        }
    } catch (error) {
        if (isNetworkError(error)) {
            markAsOffline();
        }
        debugWarn('PositionSync', 'Server sync failed, will retry later', error);
        // Position is already saved locally, so this is OK
    }
}
