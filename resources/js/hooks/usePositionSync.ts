import { useRef, useCallback, useEffect } from 'react';
import api from '@/api/client';
import {
    saveLocalPosition,
    getBookSyncState,
    updateServerState,
    getUnsyncedPositions,
    markPositionsSynced,
    cleanupOldPositions,
    type BookSyncState,
} from '@/services/offlineDb';
import {
    isEffectivelyOffline,
    isNetworkError,
    markAsOffline,
    markAsOnline,
} from '@/services/networkState';
import { debugLog, debugWarn, debugError } from '@/services/debugLogger';
import type { PivotData } from '@/types/book';

export interface ServerPosition {
    cfi: string | null;
    progress: number;
    lastSyncClient: string | null;
    pivot: PivotData | null;
}

interface PositionSyncOptions {
    bookId: number;
    debounceMs?: number;
    /** Callback when server has newer position from another device */
    onMultiDeviceSync?: (serverPosition: ServerPosition) => void;
    /** Extract pivot data from the current epub.js location */
    extractPivot?: () => PivotData | null;
}

export interface LoadedPosition {
    cfi: string | null;
    progress: number;
    source: 'local' | 'server';
    lastSyncClient: string | null;
    pivot: PivotData | null;
}


/**
 * Determine if the local reader should navigate to the server position.
 *
 * - Web-to-web (same client type): only sync if server progress is strictly AHEAD.
 *   This prevents going backwards due to clock skew between browser and server.
 * - Cross-client (koreader/moon → web): sync if server timestamp is newer.
 *   The other device's position is authoritative regardless of progress delta.
 */
function shouldSyncFromServer(
    serverPos: { cfi: string | null; progress: number; timestamp: Date | null; lastSyncClient: string | null; pivot: PivotData | null },
    localState: BookSyncState
): boolean {
    const isCrossClient = serverPos.lastSyncClient !== 'web' && serverPos.lastSyncClient !== null;
    const localProgress = localState.lastLocalProgress || 0;

    if (isCrossClient) {
        const serverTime = serverPos.timestamp?.getTime() || 0;
        const localTime = localState.lastLocalTimestamp?.getTime() || 0;
        const pivotTime = serverPos.pivot?.updated_at
            ? new Date(serverPos.pivot.updated_at).getTime() : 0;

        const serverIsNewer = serverTime > localTime || pivotTime > localTime;

        // For cross-client sync, timestamp alone is sufficient.
        // The position from another device is authoritative when newer,
        // even if progress difference is small (e.g. < 1%).
        return serverIsNewer;
    }

    // Web-to-web: only sync forward, never backwards
    const serverIsAhead = serverPos.progress > localProgress + 1;
    const hasDifferentPosition = !!serverPos.cfi && serverPos.cfi !== localState.lastLocalCfi;

    return serverIsAhead && hasDifferentPosition;
}

/**
 * Local-first position synchronization hook
 *
 * Strategy:
 * - Always save to IndexedDB first (guaranteed persistence)
 * - Sync to server in background (best effort)
 * - On load: use local position immediately, check server in background
 * - Cross-client sync via timestamp, same-client sync via progress comparison
 */
export function usePositionSync({ bookId, debounceMs = 500, onMultiDeviceSync, extractPivot }: PositionSyncOptions) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef<{ cfi: string; timestamp: number } | null>(null);
    const isMountedRef = useRef(true);
    // Store callbacks in refs to avoid re-creating loadPosition when they change
    const onMultiDeviceSyncRef = useRef(onMultiDeviceSync);
    onMultiDeviceSyncRef.current = onMultiDeviceSync;
    const extractPivotRef = useRef(extractPivot);
    extractPivotRef.current = extractPivot;

    // Track mount state and cleanup old positions on mount
    useEffect(() => {
        isMountedRef.current = true;
        // Cleanup old synced positions to prevent IndexedDB bloat
        cleanupOldPositions().catch(() => {});
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Check server position when app becomes visible again
    // This handles the case where user switches apps and comes back
    useEffect(() => {
        let visibilityTimeout: ReturnType<typeof setTimeout> | null = null;

        const handleVisibilityChange = () => {
            // Clear any pending check
            if (visibilityTimeout) {
                clearTimeout(visibilityTimeout);
                visibilityTimeout = null;
            }

            if (document.visibilityState !== 'visible' || !isMountedRef.current) return;

            // Wait 1 second before checking - avoids false positives from quick app switcher gestures
            visibilityTimeout = setTimeout(async () => {
                debugLog('PositionSync', 'App became visible, checking server position');

                try {
                    const serverPos = await fetchServerPosition(bookId);
                    if (!serverPos || !isMountedRef.current) return;

                    const localState = await getBookSyncState(bookId);
                    if (!localState) return;

                    if (shouldSyncFromServer(serverPos, localState)) {
                        debugLog('PositionSync', 'Server position changed while app was hidden, syncing', {
                            serverCfi: serverPos.cfi,
                            localCfi: localState.lastLocalCfi,
                            serverProgress: serverPos.progress,
                            localProgress: localState.lastLocalProgress,
                            lastSyncClient: serverPos.lastSyncClient,
                        });
                        onMultiDeviceSyncRef.current?.({
                            cfi: serverPos.cfi,
                            progress: serverPos.progress,
                            lastSyncClient: serverPos.lastSyncClient,
                            pivot: serverPos.pivot,
                        });
                    }

                    // Update local cache
                    updateServerState(bookId, serverPos.cfi, serverPos.progress, serverPos.timestamp || new Date());
                } catch (error) {
                    debugWarn('PositionSync', 'Failed to check server position on visibility change', error);
                }
            }, 1000);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (visibilityTimeout) clearTimeout(visibilityTimeout);
        };
    }, [bookId]);

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

            // Check server in background for sync
            serverPromise
                .then((serverPos) => {
                    if (!serverPos || !isMountedRef.current) return;

                    if (shouldSyncFromServer(serverPos, localState)) {
                        debugLog('PositionSync', 'Server position is more recent, syncing', {
                            serverProgress: serverPos.progress,
                            localProgress: localState.lastLocalProgress,
                            serverCfi: serverPos.cfi,
                            localCfi: localState.lastLocalCfi,
                            lastSyncClient: serverPos.lastSyncClient,
                        });

                        // Notify reader to navigate to server position
                        onMultiDeviceSyncRef.current?.({
                            cfi: serverPos.cfi,
                            progress: serverPos.progress,
                            lastSyncClient: serverPos.lastSyncClient,
                            pivot: serverPos.pivot,
                        });
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
                lastSyncClient: null,
                pivot: null,
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
                    lastSyncClient: serverPos.lastSyncClient,
                    pivot: serverPos.pivot,
                };
            }
        } catch (error) {
            debugError('PositionSync', 'Failed to load position from server', error);
        }

        return null;
    }, [bookId]);

    /**
     * Save position with local-first strategy:
     * 1. Always write to IndexedDB IMMEDIATELY (guaranteed, no debounce)
     * 2. Debounce server sync (to avoid hammering the server)
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

            // STEP 1: Save to IndexedDB IMMEDIATELY (no debounce)
            // This ensures position is persisted even if user switches apps quickly
            debugLog('PositionSync', 'Saving to IndexedDB immediately', { cfi, progress });
            saveLocalPosition(bookId, cfi, progress)
                .then(() => {
                    lastSavedRef.current = { cfi, timestamp: Date.now() };
                    debugLog('PositionSync', 'IndexedDB save complete');
                })
                .catch((error) => {
                    debugError('PositionSync', 'Failed to save position locally', error);
                });

            // STEP 2: Debounce server sync (to avoid too many requests)
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                if (!isEffectivelyOffline()) {
                    const pivot = extractPivotRef.current?.() || null;
                    debugLog('PositionSync', 'Syncing to server', { cfi, progress, hasPivot: !!pivot });
                    syncToServer(bookId, cfi, progress, pivot);
                } else {
                    debugLog('PositionSync', 'Offline - skipping server sync');
                }
            }, debounceMs);
        },
        [bookId, debounceMs]
    );

    /**
     * Force-push the current local position to the server immediately.
     * Useful after browsing ahead and returning to original position.
     */
    const forceSync = useCallback(
        async (cfi: string, progress: number): Promise<boolean> => {
            if (isEffectivelyOffline()) {
                debugWarn('PositionSync', 'Cannot force sync: offline');
                return false;
            }

            debugLog('PositionSync', 'Force sync triggered', { cfi, progress });

            // Save locally first
            await saveLocalPosition(bookId, cfi, progress);

            // Sync to server immediately (no debounce)
            const pivot = extractPivotRef.current?.() || null;
            try {
                await syncToServer(bookId, cfi, progress, pivot);
                debugLog('PositionSync', 'Force sync successful');
                return true;
            } catch (error) {
                debugError('PositionSync', 'Force sync failed', error);
                return false;
            }
        },
        [bookId]
    );

    return {
        loadPosition,
        savePosition,
        forceSync,
    };
}

/**
 * Fetch position from server
 */
async function fetchServerPosition(bookId: number): Promise<{
    cfi: string | null;
    progress: number;
    timestamp: Date | null;
    lastSyncClient: string | null;
    pivot: PivotData | null;
} | null> {
    try {
        const response = await api.get(`/books/${bookId}/progress`);
        markAsOnline();
        const data = response.data.data;
        if (data) {
            debugLog('PositionSync', 'Server response', {
                progress: data.progress,
                hasCfi: !!data.position,
                lastSyncClient: data.last_sync_client,
                lastSyncAt: data.last_sync_at,
                hasPivot: !!data.pivot,
            });
            return {
                cfi: data.position || null,
                progress: data.progress || 0,
                timestamp: data.last_sync_at ? new Date(data.last_sync_at) : null,
                lastSyncClient: data.last_sync_client || null,
                pivot: data.pivot || null,
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
async function syncToServer(bookId: number, cfi: string, progress: number, pivot: PivotData | null): Promise<void> {
    try {
        // Sync progress + CFI
        await api.put(`/books/${bookId}/progress`, {
            progress,
            position: cfi,
            client: 'web',
            timestamp: new Date().toISOString(),
        });

        // Sync pivot alongside (for cross-client navigation)
        if (pivot) {
            await api.put(`/books/${bookId}/pivot`, {
                ...pivot,
                progress,
            });
        }

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
