import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { initCsrf } from '../client';
import type { User, LoginCredentials, LoginResponse } from '@/types';

export function useUser() {
    return useQuery({
        queryKey: ['user'],
        queryFn: async (): Promise<User> => {
            const { data } = await api.get('/user');
            return data.data;
        },
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
            await initCsrf();
            const { data } = await api.post('/login', credentials);
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['user'], data.user);
        },
    });
}

export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<void> => {
            await api.post('/logout');
        },
        onSuccess: () => {
            queryClient.setQueryData(['user'], null);
            queryClient.clear();
        },
    });
}

export function useUpdateLocale() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (locale: string): Promise<void> => {
            await api.put('/user/locale', { locale });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
}
