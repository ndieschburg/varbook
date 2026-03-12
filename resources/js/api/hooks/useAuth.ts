import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { initCsrf } from '../client';
import type { User, LoginCredentials, LoginResponse, RegisterCredentials, RegisterResponse, RegistrationStatus } from '@/types';

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
            // Default to remember=true for PWA if not specified
            const { data } = await api.post('/login', {
                ...credentials,
                remember: credentials.remember ?? true,
            });
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

export function useRegistrationStatus() {
    return useQuery({
        queryKey: ['registration-status'],
        queryFn: async (): Promise<RegistrationStatus> => {
            const { data } = await api.get('/registration-status');
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useRegister() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (credentials: RegisterCredentials): Promise<RegisterResponse> => {
            await initCsrf();
            const { data } = await api.post('/register', credentials);
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['user'], data.user);
        },
    });
}

export function useResendVerification() {
    return useMutation({
        mutationFn: async (): Promise<{ message: string }> => {
            const { data } = await api.post('/email/verification-notification');
            return data;
        },
    });
}
