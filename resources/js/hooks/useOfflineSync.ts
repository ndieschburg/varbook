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
        mutationFn: async (updates: { bookId: number; data: BatchUpdate[] }[]) => {
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

            // Prepare batch updates
            const batchUpdates = Object.entries(grouped).map(([bookId, positions]) => ({
                bookId: Number(bookId),
                data: positions.map((p) => ({
                    cfi: p.cfi,
                    progress: p.progress,
                    timestamp: p.timestamp.toISOString(),
                })),
            }));

            await syncMutation.mutateAsync(batchUpdates);

            // Mark as synced
            const ids = positions.map((p) => p.id!).filter(Boolean);
            await markPositionsSynced(ids);

            // Clean up synced positions
            await clearSyncedPositions();

            // Invalidate progress queries
            queryClient.invalidateQueries({ queryKey: ['books'] });

            // Show success toast
            toast.success(t('Reading progress synced'));
        } catch (error) {
            console.error('Failed to sync positions:', error);
            toast.error(t('Failed to sync reading progress'));
        } finally {
            syncingRef.current = false;
        }
    }, [queryClient, syncMutation, t]);

    // Listen for online event
    useEffect(() => {
        const handleOnline = () => {
            syncPendingPositions();
        };

        window.addEventListener('online', handleOnline);

        // Also try to sync on mount if online
        if (navigator.onLine) {
            syncPendingPositions();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [syncPendingPositions]);

    return {
        syncPendingPositions,
        isSyncing: syncMutation.isPending,
    };
}
