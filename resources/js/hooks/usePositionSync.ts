import { useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { queuePositionSync } from '@/services/offlineDb';

interface PositionSyncOptions {
    bookId: number;
    debounceMs?: number;
}

export function usePositionSync({ bookId, debounceMs = 2000 }: PositionSyncOptions) {
    const queryClient = useQueryClient();
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

    const flushSync = useCallback(async (cfi: string | null, progress: number) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (!cfi || cfi === lastSavedCfiRef.current) return;

        // If offline, queue immediately
        if (!navigator.onLine) {
            try {
                await queuePositionSync(bookId, cfi, progress);
                lastSavedCfiRef.current = cfi;
            } catch (queueError) {
                console.error('Failed to queue position for offline sync:', queueError);
            }
            return;
        }

        try {
            await api.put(`/books/${bookId}/progress`, {
                progress,
                position: cfi,
                client: 'web',
            });
            lastSavedCfiRef.current = cfi;
            // Invalidate books list cache so "Continue Reading" updates
            queryClient.invalidateQueries({ queryKey: ['books'] });
        } catch (error) {
            // Queue for offline sync when flush fails (e.g., network error)
            console.warn('Flush failed, queueing for offline sync');
            try {
                await queuePositionSync(bookId, cfi, progress);
                lastSavedCfiRef.current = cfi;
            } catch (queueError) {
                console.error('Failed to queue position for offline sync:', queueError);
            }
        }
    }, [bookId, queryClient]);

    return {
        loadPosition,
        savePosition,
        flushSync,
    };
}
