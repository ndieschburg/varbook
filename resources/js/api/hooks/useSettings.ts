import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../client';
import type { SettingsResponse, UpdateSettingResponse } from '@/types';

/**
 * Fetch user settings (only user-overridable settings)
 */
export function useSettings() {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async (): Promise<SettingsResponse> => {
            const { data } = await api.get('/settings');
            return data;
        },
    });
}

/**
 * Fetch admin settings (all settings)
 */
export function useAdminSettings() {
    return useQuery({
        queryKey: ['admin', 'settings'],
        queryFn: async (): Promise<SettingsResponse> => {
            const { data } = await api.get('/admin/settings');
            return data;
        },
    });
}

/**
 * Update a user setting
 */
export function useUpdateSetting() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ key, value }: { key: string; value: unknown }): Promise<UpdateSettingResponse> => {
            // Replace dots with underscores for URL
            const urlKey = key.replace(/\./g, '_');
            const { data } = await api.put(`/settings/${urlKey}`, { value });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
}

/**
 * Reset a user setting to default
 */
export function useResetSetting() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (key: string): Promise<UpdateSettingResponse> => {
            // Replace dots with underscores for URL
            const urlKey = key.replace(/\./g, '_');
            const { data } = await api.delete(`/settings/${urlKey}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
}

/**
 * Update an admin setting (system value)
 */
export function useUpdateAdminSetting() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ key, value }: { key: string; value: unknown }): Promise<UpdateSettingResponse> => {
            // Replace dots with underscores for URL
            const urlKey = key.replace(/\./g, '_');
            const { data } = await api.put(`/admin/settings/${urlKey}`, { value });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
}
