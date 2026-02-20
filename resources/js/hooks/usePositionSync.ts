import { useRef, useCallback } from 'react';
import api from '@/api/client';

interface PositionSyncOptions {
    bookId: number;
    debounceMs?: number;
}

export function usePositionSync({ bookId, debounceMs = 2000 }: PositionSyncOptions) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedCfiRef = useRef<string | null>(null);

    const loadPosition = useCallback(async (): Promise<{ cfi: string; progress: number } | null> => {
        try {
            const response = await api.get(`/books/${bookId}/progress`);
            const data = response.data.data;
            if (data?.position) {
                return { cfi: data.position, progress: data.progress };
            }
            return null;
        } catch (error) {
            console.error('Failed to load position:', error);
            return null;
        }
    }, [bookId]);

    const savePosition = useCallback(async (cfi: string, progress: number) => {
        // Debounce saves
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
            if (cfi === lastSavedCfiRef.current) return;

            try {
                await api.put(`/books/${bookId}/progress`, {
                    progress,
                    position: cfi,
                    client: 'web',
                });
                lastSavedCfiRef.current = cfi;
            } catch (error) {
                console.error('Failed to save position:', error);
            }
        }, debounceMs);
    }, [bookId, debounceMs]);

    const flushSync = useCallback(async (cfi: string | null, progress: number) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (!cfi || cfi === lastSavedCfiRef.current) return;

        try {
            await api.put(`/books/${bookId}/progress`, {
                progress,
                position: cfi,
                client: 'web',
            });
            lastSavedCfiRef.current = cfi;
        } catch (error) {
            console.error('Failed to save position:', error);
        }
    }, [bookId]);

    return {
        loadPosition,
        savePosition,
        flushSync,
    };
}
