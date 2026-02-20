import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    saveBookOffline,
    getOfflineBook,
    removeOfflineBook,
    isBookOffline,
    getAllOfflineBooks,
    getOfflineStorageUsage,
    type OfflineBook,
} from '@/services/offlineDb';

interface DownloadProgress {
    bookId: number;
    progress: number;
    status: 'downloading' | 'complete' | 'error';
}

export function useOfflineBook() {
    const queryClient = useQueryClient();
    const [downloadProgress, setDownloadProgress] = useState<Record<number, DownloadProgress>>({});

    const downloadBook = useCallback(
        async (
            bookId: number,
            title: string,
            author: string,
            coverUrl: string | null
        ): Promise<boolean> => {
            setDownloadProgress((prev) => ({
                ...prev,
                [bookId]: { bookId, progress: 0, status: 'downloading' },
            }));

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
                        setDownloadProgress((prev) => ({
                            ...prev,
                            [bookId]: {
                                bookId,
                                progress: Math.round((received / total) * 100),
                                status: 'downloading',
                            },
                        }));
                    }
                }

                const epubData = new Uint8Array(received);
                let offset = 0;
                for (const chunk of chunks) {
                    epubData.set(chunk, offset);
                    offset += chunk.length;
                }

                await saveBookOffline(bookId, title, author, coverUrl, epubData.buffer);

                setDownloadProgress((prev) => ({
                    ...prev,
                    [bookId]: { bookId, progress: 100, status: 'complete' },
                }));

                // Invalidate offline status queries
                queryClient.invalidateQueries({ queryKey: ['offline-books'] });

                return true;
            } catch (error) {
                console.error('Failed to download book:', error);
                setDownloadProgress((prev) => ({
                    ...prev,
                    [bookId]: { bookId, progress: 0, status: 'error' },
                }));
                return false;
            }
        },
        [queryClient]
    );

    const removeBook = useCallback(
        async (bookId: number): Promise<void> => {
            await removeOfflineBook(bookId);
            setDownloadProgress((prev) => {
                const newState = { ...prev };
                delete newState[bookId];
                return newState;
            });
            queryClient.invalidateQueries({ queryKey: ['offline-books'] });
        },
        [queryClient]
    );

    const checkOffline = useCallback(async (bookId: number): Promise<boolean> => {
        return isBookOffline(bookId);
    }, []);

    const getBook = useCallback(async (bookId: number): Promise<OfflineBook | undefined> => {
        return getOfflineBook(bookId);
    }, []);

    const getAll = useCallback(async (): Promise<OfflineBook[]> => {
        return getAllOfflineBooks();
    }, []);

    const getStorageUsage = useCallback(async () => {
        return getOfflineStorageUsage();
    }, []);

    return {
        downloadBook,
        removeBook,
        checkOffline,
        getBook,
        getAll,
        getStorageUsage,
        downloadProgress,
    };
}
