import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useUser, useLogin, useLogout } from '@/api/hooks';
import type { User, LoginCredentials } from '@/types';

const CACHED_USER_KEY = 'bookshelf_cached_user';

interface AuthContextType {
    user: User | null | undefined;
    isLoading: boolean;
    isAuthenticated: boolean;
    isOffline: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getCachedUser(): User | null {
    try {
        const cached = localStorage.getItem(CACHED_USER_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

function setCachedUser(user: User | null) {
    try {
        if (user) {
            localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(CACHED_USER_KEY);
        }
    } catch {
        // localStorage might be full or disabled
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const { data: user, isLoading, isError, error } = useUser();
    const loginMutation = useLogin();
    const logoutMutation = useLogout();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Track online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Cache user when successfully fetched
    useEffect(() => {
        if (user) {
            setCachedUser(user);
        }
    }, [user]);

    const login = async (credentials: LoginCredentials) => {
        const result = await loginMutation.mutateAsync(credentials);
        if (result.user) {
            setCachedUser(result.user);
        }
    };

    const logout = async () => {
        await logoutMutation.mutateAsync();
        setCachedUser(null);
    };

    // Determine effective user: use cached user when offline or network error
    const cachedUser = getCachedUser();

    // Check for network errors (Axios sets code to ERR_NETWORK, or response is undefined)
    const axiosError = error as { code?: string; response?: unknown; message?: string } | null;
    const isNetworkError = isError && (
        !navigator.onLine ||
        axiosError?.code === 'ERR_NETWORK' ||
        axiosError?.code === 'ECONNABORTED' ||
        (!axiosError?.response && axiosError?.message?.includes('Network'))
    );

    // Use cached user if offline/network error, otherwise use API result
    const effectiveUser = (isOffline || isNetworkError) && cachedUser
        ? cachedUser
        : (isError ? null : user);

    const value: AuthContextType = {
        user: effectiveUser,
        isLoading: isLoading && !cachedUser,
        isAuthenticated: !!effectiveUser,
        isOffline,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
