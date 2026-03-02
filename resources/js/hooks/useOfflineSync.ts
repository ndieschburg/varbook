import { useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '@/api/client';
import {
    getUnsyncedPositions,
    markPositionsSynced,
    clearSyncedPositions,
    type OfflinePosition,
} from '@/services/offlineDb';

interface BatchUpdate {
    cfi: string;
    progress: number;
    timestamp: string;
}

export function useOfflineSync() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const syncingRef = useRef(false);

    const syncMutation = useMutation({
        mutationFn: async (updates: { bookId: number; positionIds: number[]; data: BatchUpdate[] }[]) => {
            const results = await Promise.allSettled(
                updates.map(({ bookId, data }) =>
                    api.post(`/books/${bookId}/progress/batch`, { updates: data })
                )
            );
            return results;
        },
    });

    const syncPendingPositions = useCallback(async () => {
        if (syncingRef.current || !navigator.onLine) return;

        syncingRef.current = true;

        try {
            const positions = await getUnsyncedPositions();
            if (positions.length === 0) {
                syncingRef.current = false;
                return;
            }

            // Group by bookId
            const grouped = positions.reduce(
                (acc, pos) => {
                    if (!acc[pos.bookId]) {
                        acc[pos.bookId] = [];
                    }
                    acc[pos.bookId].push(pos);
                    return acc;
                },
                {} as Record<number, OfflinePosition[]>
            );

            // Prepare batch updates with position IDs for tracking
            const batchUpdates = Object.entries(grouped).map(([bookId, bookPositions]) => ({
                bookId: Number(bookId),
                positionIds: bookPositions.map((p) => p.id!).filter(Boolean),
                data: bookPositions.map((p) => ({
                    cfi: p.cfi,
                    progress: p.progress,
                    timestamp: p.timestamp.toISOString(),
                })),
            }));

            const results = await syncMutation.mutateAsync(batchUpdates);

            // Only mark positions as synced for successful requests
            const successfulIds: number[] = [];
            let hasFailures = false;

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    successfulIds.push(...batchUpdates[index].positionIds);
                } else {
                    hasFailures = true;
                    console.error(`Failed to sync book ${batchUpdates[index].bookId}:`, result.reason);
                }
            });

            if (successfulIds.length > 0) {
                await markPositionsSynced(successfulIds);
                await clearSyncedPositions();
                queryClient.invalidateQueries({ queryKey: ['books'] });
            }

            // Show appropriate toast
            if (hasFailures && successfulIds.length > 0) {
                toast.success(t('Some reading progress synced'));
            } else if (!hasFailures) {
                toast.success(t('Reading progress synced'));
            } else {
                toast.error(t('Failed to sync reading progress'));
            }
        } catch (error) {
            console.error('Failed to sync positions:', error);
            toast.error(t('Failed to sync reading progress'));
        } finally {
            syncingRef.current = false;
        }
    }, [queryClient, syncMutation, t]);

    // Listen for online event and visibility changes
    useEffect(() => {
        const handleOnline = () => {
            console.log('[OfflineSync] Online event triggered');
            syncPendingPositions();
        };

        // Also sync when app becomes visible (handles case where navigator.onLine is unreliable)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                console.log('[OfflineSync] App visible, attempting sync');
                syncPendingPositions();
            }
        };

        // Sync on window focus (another opportunity to sync)
        const handleFocus = () => {
            if (navigator.onLine) {
                console.log('[OfflineSync] Window focused, attempting sync');
                syncPendingPositions();
            }
        };

        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        console.log('[OfflineSync] Listening for online/visibility/focus events');

        // Also try to sync on mount if online
        if (navigator.onLine) {
            console.log('[OfflineSync] Already online, syncing on mount');
            syncPendingPositions();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [syncPendingPositions]);

    return {
        syncPendingPositions,
        isSyncing: syncMutation.isPending,
    };
}
