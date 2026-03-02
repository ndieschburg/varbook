import { useMutation, useQuery, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../client';
import type { Book, BookProgress, ReadingSession, PaginatedResponse, ListBooksParams } from '@/types';

export function useBooks(params: ListBooksParams = {}) {
    return useQuery({
        queryKey: ['books', params],
        queryFn: async (): Promise<PaginatedResponse<Book>> => {
            const { data } = await api.get('/books', { params });
            return data;
        },
        staleTime: 0, // Always consider data stale
        refetchOnMount: 'always', // Refetch when component mounts (e.g., returning from reader)
    });
}

export function useCurrentlyReading() {
    return useQuery({
        queryKey: ['books', 'currently-reading'],
        queryFn: async (): Promise<Book[]> => {
            const { data } = await api.get('/books', {
                params: { status: 'reading', per_page: 50 }
            });
            return data.data;
        },
        staleTime: 0,
        refetchOnMount: 'always',
    });
}

export function useInfiniteBooks(params: Omit<ListBooksParams, 'page'> = {}) {
    return useInfiniteQuery({
        queryKey: ['books', 'infinite', params],
        queryFn: async ({ pageParam }): Promise<PaginatedResponse<Book>> => {
            // Ensure page is always a single integer (defensive against array concatenation bugs)
            const page = typeof pageParam === 'number' ? pageParam : Number(pageParam) || 1;
            const { data } = await api.get('/books', {
                params: { ...params, page }
            });
            return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            // Safety check for missing meta
            if (!lastPage?.meta) {
                return undefined;
            }
            const { current_page, last_page } = lastPage.meta;
            // Force integers to prevent array/string issues from corrupted cache
            const currentPageNum = Array.isArray(current_page) ? Number(current_page[0]) : Number(current_page);
            const lastPageNum = Array.isArray(last_page) ? Number(last_page[0]) : Number(last_page);
            if (currentPageNum < lastPageNum) {
                return currentPageNum + 1;
            }
            return undefined;
        },
        // Keep previous data while fetching new results (prevents input focus loss)
        placeholderData: keepPreviousData,
        // Keep pages in cache to avoid refetching from page 1
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
}

export function useBook(id: number) {
    return useQuery({
        queryKey: ['books', id],
        queryFn: async (): Promise<Book> => {
            const { data } = await api.get(`/books/${id}`);
            return data.data;
        },
        enabled: !!id,
    });
}

export function useBookSessions(bookId: number) {
    return useQuery({
        queryKey: ['books', bookId, 'sessions'],
        queryFn: async (): Promise<PaginatedResponse<ReadingSession>> => {
            const { data } = await api.get(`/books/${bookId}/sessions`);
            return data;
        },
        enabled: !!bookId,
    });
}

export function useBookProgress(bookId: number) {
    return useQuery({
        queryKey: ['books', bookId, 'progress'],
        queryFn: async (): Promise<BookProgress> => {
            const { data } = await api.get(`/books/${bookId}/progress`);
            return data.data;
        },
        enabled: !!bookId,
    });
}

export function useUpdateProgress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            bookId,
            progress,
            position,
            client = 'web'
        }: {
            bookId: number;
            progress: number;
            position?: string;
            client?: string;
        }): Promise<void> => {
            await api.put(`/books/${bookId}/progress`, { progress, position, client });
        },
        onSuccess: (_, { bookId }) => {
            queryClient.invalidateQueries({ queryKey: ['books', bookId] });
            queryClient.invalidateQueries({ queryKey: ['books', bookId, 'progress'] });
        },
    });
}

export function useDeleteBook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (bookId: number): Promise<void> => {
            await api.delete(`/books/${bookId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['books'] });
        },
    });
}

export function useUploadBook() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (file: File): Promise<Book> => {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post('/books', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['books'] });
        },
    });
}

export function useResetBookStats() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (bookId: number): Promise<void> => {
            await api.delete(`/books/${bookId}/stats`);
        },
        onSuccess: (_, bookId) => {
            queryClient.invalidateQueries({ queryKey: ['books'] });
            queryClient.invalidateQueries({ queryKey: ['books', bookId] });
            queryClient.invalidateQueries({ queryKey: ['books', bookId, 'sessions'] });
            queryClient.invalidateQueries({ queryKey: ['books', bookId, 'progress'] });
        },
    });
}
