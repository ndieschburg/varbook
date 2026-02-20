import { createContext, useContext, ReactNode } from 'react';
import { useUser, useLogin, useLogout } from '@/api/hooks';
import type { User, LoginCredentials } from '@/types';

interface AuthContextType {
    user: User | null | undefined;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { data: user, isLoading, isError } = useUser();
    const loginMutation = useLogin();
    const logoutMutation = useLogout();

    const login = async (credentials: LoginCredentials) => {
        await loginMutation.mutateAsync(credentials);
    };

    const logout = async () => {
        await logoutMutation.mutateAsync();
    };

    const value: AuthContextType = {
        user: isError ? null : user,
        isLoading,
        isAuthenticated: !!user && !isError,
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
