import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
    isBookOffline,
    saveBookOffline,
    removeOfflineBook,
    getOfflineBook,
    type OfflineBook,
} from '@/services/offlineDb';

interface UseBookOfflineStatusOptions {
    bookId: number;
    title?: string;
    author?: string;
    coverUrl?: string | null;
}

interface DownloadState {
    isDownloading: boolean;
    progress: number;
    error: string | null;
}

export function useBookOfflineStatus({ bookId, title, author, coverUrl }: UseBookOfflineStatusOptions) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [isOffline, setIsOffline] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [downloadState, setDownloadState] = useState<DownloadState>({
        isDownloading: false,
        progress: 0,
        error: null,
    });

    // Check offline status on mount and when bookId changes
    useEffect(() => {
        let mounted = true;

        const checkStatus = async () => {
            setIsChecking(true);
            try {
                const offline = await isBookOffline(bookId);
                if (mounted) {
                    setIsOffline(offline);
                }
            } catch (error) {
                console.error('Failed to check offline status:', error);
            } finally {
                if (mounted) {
                    setIsChecking(false);
                }
            }
        };

        checkStatus();

        return () => {
            mounted = false;
        };
    }, [bookId]);

    const downloadForOffline = useCallback(async () => {
        if (!title || !author) {
            toast.error(t('Book information missing'));
            return false;
        }

        setDownloadState({ isDownloading: true, progress: 0, error: null });

        try {
            const response = await fetch(`/api/books/${bookId}/download`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to download book');
            }

            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Failed to read response');
            }

            const chunks: Uint8Array[] = [];
            let received = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                received += value.length;

                if (total > 0) {
                    setDownloadState((prev) => ({
                        ...prev,
                        progress: Math.round((received / total) * 100),
                    }));
                }
            }

            const epubData = new Uint8Array(received);
            let offset = 0;
            for (const chunk of chunks) {
                epubData.set(chunk, offset);
                offset += chunk.length;
            }

            await saveBookOffline(bookId, title, author, coverUrl || null, epubData.buffer);

            setIsOffline(true);
            setDownloadState({ isDownloading: false, progress: 100, error: null });
            toast.success(t('Book saved for offline reading'));

            // Invalidate queries to update UI
            queryClient.invalidateQueries({ queryKey: ['offline-books'] });

            return true;
        } catch (error) {
            console.error('Failed to download book:', error);
            const errorMessage = error instanceof Error ? error.message : 'Download failed';
            setDownloadState({ isDownloading: false, progress: 0, error: errorMessage });
            toast.error(t('Failed to download book'));
            return false;
        }
    }, [bookId, title, author, coverUrl, queryClient, t]);

    const removeFromOffline = useCallback(async () => {
        try {
            await removeOfflineBook(bookId);
            setIsOffline(false);
            toast.success(t('Removed from offline storage'));
            queryClient.invalidateQueries({ queryKey: ['offline-books'] });
            return true;
        } catch (error) {
            console.error('Failed to remove offline book:', error);
            toast.error(t('Failed to remove from offline storage'));
            return false;
        }
    }, [bookId, queryClient, t]);

    const getOfflineData = useCallback(async (): Promise<OfflineBook | undefined> => {
        return getOfflineBook(bookId);
    }, [bookId]);

    return {
        isOffline,
        isChecking,
        downloadState,
        downloadForOffline,
        removeFromOffline,
        getOfflineData,
    };
}
