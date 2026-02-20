import { useQuery } from '@tanstack/react-query';
import api from '../client';
import type { UserStats } from '@/types';

export function useStats() {
    return useQuery({
        queryKey: ['stats'],
        queryFn: async (): Promise<UserStats> => {
            const { data } = await api.get('/stats');
            return data.data;
        },
    });
}
