import { useRef, useCallback } from 'react';
import api from '@/api/client';
import { queuePositionSync } from '@/services/offlineDb';

interface PositionSyncOptions {
    bookId: number;
    debounceMs?: number;
}

// Get CSRF token from cookies for sendBeacon
function getCsrfToken(): string | null {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (match) {
        return decodeURIComponent(match[1]);
    }
    return null;
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

            // If offline, queue immediately without trying API
            if (!navigator.onLine) {
                try {
                    await queuePositionSync(bookId, cfi, progress);
                    lastSavedCfiRef.current = cfi;
                } catch (queueError) {
                    console.error('Failed to queue position for offline sync:', queueError);
                }
                return;
            }

            // Try API call with retry
            let retries = 2;
            while (retries >= 0) {
                try {
                    await api.put(`/books/${bookId}/progress`, {
                        progress,
                        position: cfi,
                        client: 'web',
                    });
                    lastSavedCfiRef.current = cfi;
                    return; // Success - exit
                } catch (error) {
                    retries--;
                    if (retries >= 0) {
                        // Wait before retry (exponential backoff: 500ms, 1000ms)
                        await new Promise(resolve => setTimeout(resolve, (2 - retries) * 500));
                    }
                }
            }

            // All retries failed - queue for offline sync
            console.warn('API save failed, queueing for offline sync');
            try {
                await queuePositionSync(bookId, cfi, progress);
                lastSavedCfiRef.current = cfi; // Mark as handled
            } catch (queueError) {
                console.error('Failed to queue position for offline sync:', queueError);
            }
        }, debounceMs);
    }, [bookId, debounceMs]);

    // Synchronous flush using sendBeacon - guaranteed to send even during page unload
    const flushSync = useCallback((cfi: string | null, progress: number) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (!cfi || cfi === lastSavedCfiRef.current) return;

        // If offline, queue for later sync
        if (!navigator.onLine) {
            queuePositionSync(bookId, cfi, progress).catch(err => {
                console.error('Failed to queue position for offline sync:', err);
            });
            lastSavedCfiRef.current = cfi;
            return;
        }

        // Use sendBeacon for reliable delivery during page unload
        // sendBeacon is fire-and-forget but guaranteed to be sent
        const csrfToken = getCsrfToken();
        const url = `/api/books/${bookId}/progress`;

        // Try sendBeacon first (works during unload)
        let sent = false;
        if (navigator.sendBeacon) {
            // sendBeacon doesn't support custom headers, so we need to include CSRF in the payload
            // Laravel accepts _token in the body as well
            const dataWithToken = JSON.stringify({
                progress,
                position: cfi,
                client: 'web',
                _token: csrfToken,
            });
            const blobWithToken = new Blob([dataWithToken], { type: 'application/json' });
            sent = navigator.sendBeacon(url, blobWithToken);
        }

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
