import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../client';
import type { User, PaginatedResponse, ProgressLog, ProgressLogsStats, AdminActivityStats, AdminBookReading } from '@/types';

export function useAdminUsers() {
    return useQuery({
        queryKey: ['admin', 'users'],
        queryFn: async (): Promise<PaginatedResponse<User>> => {
            const { data } = await api.get('/admin/users');
            return data;
        },
    });
}

export function useAdminUser(id: number) {
    return useQuery({
        queryKey: ['admin', 'users', id],
        queryFn: async (): Promise<User> => {
            const { data } = await api.get(`/admin/users/${id}`);
            return data.data;
        },
        enabled: !!id,
    });
}

interface CreateUserData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    is_admin: boolean;
}

interface UpdateUserData {
    name: string;
    email: string;
    password?: string;
    password_confirmation?: string;
    is_admin?: boolean;
}

export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateUserData): Promise<User> => {
            const { data: response } = await api.post('/admin/users', data);
            return response.user;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateUserData }): Promise<User> => {
            const { data: response } = await api.put(`/admin/users/${id}`, data);
            return response.user;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
}

export function useVerifyUserEmail() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number): Promise<User> => {
            const { data } = await api.post(`/admin/users/${id}/verify-email`);
            return data.user;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number): Promise<void> => {
            await api.delete(`/admin/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
}

// Admin Activity Stats
export interface AdminActivityParams {
    start_date?: string;
    end_date?: string;
}

export function useAdminActivityStats(params: AdminActivityParams = {}) {
    const searchParams = new URLSearchParams();
    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);

    const queryString = searchParams.toString();
    const url = `/admin/stats/activity${queryString ? `?${queryString}` : ''}`;

    return useQuery({
        queryKey: ['admin', 'stats', 'activity', params],
        queryFn: async (): Promise<AdminActivityStats> => {
            const { data } = await api.get(url);
            return data.data;
        },
    });
}

// Admin Books Reading Activity
export interface AdminBooksReadingParams {
    page?: number;
    per_page?: number;
}

export function useAdminBooksReading(params: AdminBooksReadingParams = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));

    const queryString = searchParams.toString();
    const url = `/admin/stats/books-reading${queryString ? `?${queryString}` : ''}`;

    return useQuery({
        queryKey: ['admin', 'stats', 'books-reading', params],
        queryFn: async (): Promise<PaginatedResponse<AdminBookReading>> => {
            const { data } = await api.get(url);
            return data;
        },
    });
}

// Progress Logs
export interface ProgressLogsParams {
    page?: number;
    per_page?: number;
    user_id?: number;
    book_id?: number;
    action?: string;
    client?: string;
    success?: boolean;
}

export function useProgressLogs(params: ProgressLogsParams = {}, options?: { refetchInterval?: number }) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.user_id) searchParams.set('user_id', String(params.user_id));
    if (params.book_id) searchParams.set('book_id', String(params.book_id));
    if (params.action) searchParams.set('action', params.action);
    if (params.client) searchParams.set('client', params.client);
    if (params.success !== undefined) searchParams.set('success', String(params.success));

    const queryString = searchParams.toString();
    const url = `/admin/progress-logs${queryString ? `?${queryString}` : ''}`;

    return useQuery({
        queryKey: ['admin', 'progress-logs', params],
        queryFn: async (): Promise<PaginatedResponse<ProgressLog>> => {
            const { data } = await api.get(url);
            return data;
        },
        refetchInterval: options?.refetchInterval,
    });
}

export function useProgressLogsStats() {
    return useQuery({
        queryKey: ['admin', 'progress-logs', 'stats'],
        queryFn: async (): Promise<ProgressLogsStats> => {
            const { data } = await api.get('/admin/progress-logs/stats');
            return data.data;
        },
    });
}

export function useClearProgressLogs() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (daysToKeep: number = 7): Promise<{ deleted_count: number }> => {
            const { data } = await api.delete('/admin/progress-logs', {
                data: { days_to_keep: daysToKeep },
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'progress-logs'] });
        },
    });
}
