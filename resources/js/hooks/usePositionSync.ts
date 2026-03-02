import { useRef, useCallback } from 'react';
import api from '@/api/client';
import { queuePositionSync } from '@/services/offlineDb';

// Track if we're effectively offline (network errors detected)
// This is shared across all hook instances
let effectivelyOffline = false;
let offlineUntil = 0; // Timestamp when we should retry

// Reset offline state when browser reports online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[PositionSync] Browser online event - resetting offline state');
        effectivelyOffline = false;
        offlineUntil = 0;
    });
}

function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes('network') ||
               message.includes('failed to fetch') ||
               message.includes('err_name_not_resolved') ||
               message.includes('err_internet_disconnected');
    }
    return false;
}

interface PositionSyncOptions {
    bookId: number;
    debounceMs?: number;
}

export function usePositionSync({ bookId, debounceMs = 2000 }: PositionSyncOptions) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedCfiRef = useRef<string | null>(null);

    const loadPosition = useCallback(async (): Promise<{ cfi: string | null; progress: number } | null> => {
        try {
            const response = await api.get(`/books/${bookId}/progress`);
            const data = response.data.data;
            if (data) {
                // Return progress even if CFI is null (allows percentage fallback)
                return { cfi: data.position || null, progress: data.progress || 0 };
            }
            return null;
        } catch (error) {
            console.error('Failed to load position:', error);
            return null;
        }
    }, [bookId]);

    const savePosition = useCallback(async (cfi: string, progress: number) => {
        // Debounce saves
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
            if (cfi === lastSavedCfiRef.current) return;

            // If offline (browser says so, or we detected network errors), queue immediately
            const isOffline = !navigator.onLine || (effectivelyOffline && Date.now() < offlineUntil);
            if (isOffline) {
                console.log('[PositionSync] Offline - queuing position for sync');
                try {
                    await queuePositionSync(bookId, cfi, progress);
                    lastSavedCfiRef.current = cfi;
                } catch (queueError) {
                    console.error('Failed to queue position for offline sync:', queueError);
                }
                return;
            }

            // Try API call (single attempt when effectively offline was recently reset)
            try {
                await api.put(`/books/${bookId}/progress`, {
                    progress,
                    position: cfi,
                    client: 'web',
                });
                lastSavedCfiRef.current = cfi;
                // Success - clear offline state
                if (effectivelyOffline) {
                    console.log('[PositionSync] API success - clearing offline state');
                    effectivelyOffline = false;
                    offlineUntil = 0;
                }
                return;
            } catch (error) {
                // Check if it's a network error
                if (isNetworkError(error)) {
                    console.log('[PositionSync] Network error detected - entering offline mode for 30s');
                    effectivelyOffline = true;
                    offlineUntil = Date.now() + 30000; // Don't retry API for 30 seconds
                }

                // Queue for offline sync
                console.warn('[PositionSync] API failed, queueing for offline sync');
                try {
                    await queuePositionSync(bookId, cfi, progress);
                    lastSavedCfiRef.current = cfi;
                } catch (queueError) {
                    console.error('Failed to queue position for offline sync:', queueError);
                }
            }
        }, debounceMs);
    }, [bookId, debounceMs]);

    // Synchronous flush using sendBeacon - guaranteed to send even during page unload
    const flushSync = useCallback((cfi: string | null, progress: number) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (!cfi || cfi === lastSavedCfiRef.current) return;

        // If offline (browser says so, or we detected network errors), queue for later sync
        const isOffline = !navigator.onLine || (effectivelyOffline && Date.now() < offlineUntil);
        if (isOffline) {
            console.log('[PositionSync] flushSync - Offline, queuing position');
            queuePositionSync(bookId, cfi, progress).catch(err => {
                console.error('Failed to queue position for offline sync:', err);
            });
            lastSavedCfiRef.current = cfi;
            return;
        }

        // Use sendBeacon for reliable delivery during page unload
        // sendBeacon is fire-and-forget but guaranteed to be sent
        const url = `/api/books/${bookId}/progress`;
        const data = JSON.stringify({
            progress,
            position: cfi,
            client: 'web',
        });
        const blob = new Blob([data], { type: 'application/json' });

        // Try sendBeacon (works during unload, CSRF disabled for this route)
        const sent = navigator.sendBeacon?.(url, blob) ?? false;

        if (sent) {
            lastSavedCfiRef.current = cfi;
        } else {
            // Fallback: queue for offline sync if sendBeacon fails
            console.warn('sendBeacon failed, queueing for offline sync');
            queuePositionSync(bookId, cfi, progress).catch(err => {
                console.error('Failed to queue position for offline sync:', err);
            });
            lastSavedCfiRef.current = cfi;
        }
    }, [bookId]);

    return {
        loadPosition,
        savePosition,
        flushSync,
    };
}
