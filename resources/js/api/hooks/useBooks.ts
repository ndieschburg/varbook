import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '../client';
import type { Book, BookProgress, ReadingSession, PaginatedResponse, ListBooksParams } from '@/types';

export function useBooks(params: ListBooksParams = {}) {
    return useQuery({
        queryKey: ['books', params],
        queryFn: async (): Promise<PaginatedResponse<Book>> => {
            const { data } = await api.get('/books', { params });
            return data;
        },
    });
}

export function useInfiniteBooks(params: Omit<ListBooksParams, 'page'> = {}) {
    return useInfiniteQuery({
        queryKey: ['books', 'infinite', params],
        queryFn: async ({ pageParam = 1 }): Promise<PaginatedResponse<Book>> => {
            const { data } = await api.get('/books', {
                params: { ...params, page: pageParam }
            });
            return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.meta.current_page < lastPage.meta.last_page) {
                return lastPage.meta.current_page + 1;
            }
            return undefined;
        },
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
            formData.append('epub', file);
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
