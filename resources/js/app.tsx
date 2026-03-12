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

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
        },
    },
});

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

                        {/* Redirect root to library */}
                        <Route path="/" element={<Navigate to="/library" replace />} />
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
