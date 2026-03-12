import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
    requireVerified?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireVerified = true }: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Redirect unverified users to verification page
    if (requireVerified && user && user.email_verified === false) {
        return <Navigate to="/verify-email" replace />;
    }

    if (requireAdmin && !user?.is_admin) {
        return <Navigate to="/library" replace />;
    }

    return <>{children}</>;
}
