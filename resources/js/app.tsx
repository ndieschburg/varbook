import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import '@/i18n';
import { AuthProvider } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
    LandingPage,
    LoginPage,
    RegisterPage,
    VerifyEmailPage,
    LibraryPage,
    BookDetailPage,
    ReaderPage,
    StatsPage,
    ProfilePage,
    SettingsPage,
    UsersPage,
    AdminSettingsPage,
    ProgressLogsPage,
} from '@/pages';
import { usePublicConfig, useUser } from '@/api/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
        },
    },
});

function RootRoute() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { data: publicConfig, isLoading: configLoading } = usePublicConfig();

    // Import useUser to check if auth verification is in progress
    const { isFetching: authFetching } = useUser();

    // Show loading while checking auth state, config, or verifying auth
    // We wait for authFetching to complete to avoid using stale cached data
    if (authLoading || configLoading || authFetching) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // If authenticated, go to library
    if (isAuthenticated) {
        return <Navigate to="/library" replace />;
    }

    // If landing page is enabled, show it
    if (publicConfig?.show_landing_page) {
        return <LandingPage />;
    }

    // Otherwise, redirect to login
    return <Navigate to="/login" replace />;
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        {/* Public routes */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Email verification (auth required but not verified) */}
                        <Route
                            path="/verify-email"
                            element={
                                <ProtectedRoute requireVerified={false}>
                                    <VerifyEmailPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Protected routes with layout */}
                        <Route
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/library" element={<LibraryPage />} />
                            <Route path="/books/:id" element={<BookDetailPage />} />
                            <Route path="/stats" element={<StatsPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route
                                path="/admin/users"
                                element={
                                    <ProtectedRoute requireAdmin>
                                        <UsersPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/settings"
                                element={
                                    <ProtectedRoute requireAdmin>
                                        <AdminSettingsPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/logs"
                                element={
                                    <ProtectedRoute requireAdmin>
                                        <ProgressLogsPage />
                                    </ProtectedRoute>
                                }
                            />
                        </Route>

                        {/* Reader route (full screen, no layout) */}
                        <Route
                            path="/books/:id/read"
                            element={
                                <ProtectedRoute>
                                    <ReaderPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Root route - shows landing page or redirects */}
                        <Route path="/" element={<RootRoute />} />
                        <Route path="*" element={<Navigate to="/library" replace />} />
                    </Routes>

                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            className: 'bg-gray-800 text-white',
                            style: {
                                background: '#1f2937',
                                color: '#fff',
                            },
                        }}
                    />
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

// Mount the app
const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    );
}
