import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../client';
import type { User, PaginatedResponse } from '@/types';

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
