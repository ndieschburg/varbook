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
import { isEffectivelyOffline, isNetworkError, markAsOffline, markAsOnline } from '@/services/networkState';
import { debugLog, debugError } from '@/services/debugLogger';

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
        // Don't sync if already syncing or effectively offline
        if (syncingRef.current || isEffectivelyOffline()) {
            debugLog('OfflineSync', 'Skipping sync - already syncing or offline');
            return;
        }

        syncingRef.current = true;

        try {
            const positions = await getUnsyncedPositions();
            if (positions.length === 0) {
                syncingRef.current = false;
                return;
            }

            debugLog('OfflineSync', `Syncing ${positions.length} positions...`);

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
            let hasNetworkFailure = false;

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    successfulIds.push(...batchUpdates[index].positionIds);
                } else {
                    debugError('OfflineSync', `Failed to sync book ${batchUpdates[index].bookId}`, result.reason);
                    if (isNetworkError(result.reason)) {
                        hasNetworkFailure = true;
                    }
                }
            });

            // If we had network failures, mark as offline to prevent immediate retries
            if (hasNetworkFailure) {
                markAsOffline();
            } else if (successfulIds.length > 0) {
                // Success - mark as online
                markAsOnline();
            }

            if (successfulIds.length > 0) {
                await markPositionsSynced(successfulIds);
                await clearSyncedPositions();
                queryClient.invalidateQueries({ queryKey: ['books'] });
                debugLog('OfflineSync', `Successfully synced ${successfulIds.length} positions`);
                toast.success(t('Reading progress synced'));
            } else if (hasNetworkFailure) {
                // Don't show error toast for network failures - will retry later
                debugLog('OfflineSync', 'Network failure, will retry later');
            }
        } catch (error) {
            debugError('OfflineSync', 'Failed to sync positions', error);
            if (isNetworkError(error)) {
                markAsOffline();
            } else {
                toast.error(t('Failed to sync reading progress'));
            }
        } finally {
            syncingRef.current = false;
        }
    }, [queryClient, syncMutation, t]);

    // Listen for online event and visibility changes
    useEffect(() => {
        const handleOnline = () => {
            debugLog('OfflineSync', 'Online event triggered');
            syncPendingPositions();
        };

        // Also sync when app becomes visible (handles case where navigator.onLine is unreliable)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                debugLog('OfflineSync', 'App visible, attempting sync');
                syncPendingPositions();
            }
        };

        // Sync on window focus (another opportunity to sync)
        const handleFocus = () => {
            if (navigator.onLine) {
                debugLog('OfflineSync', 'Window focused, attempting sync');
                syncPendingPositions();
            }
        };

        // Listen for our custom network-restored event (fired when API call succeeds after being offline)
        const handleNetworkRestored = () => {
            debugLog('OfflineSync', 'Network restored event triggered');
            syncPendingPositions();
        };

        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('network-restored', handleNetworkRestored);
        debugLog('OfflineSync', 'Listening for online/visibility/focus/network-restored events');

        // Also try to sync on mount if online
        if (navigator.onLine) {
            debugLog('OfflineSync', 'Already online, syncing on mount');
            syncPendingPositions();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('network-restored', handleNetworkRestored);
        };
    }, [syncPendingPositions]);

    return {
        syncPendingPositions,
        isSyncing: syncMutation.isPending,
    };
}
