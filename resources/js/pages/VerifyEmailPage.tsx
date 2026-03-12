import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useResendVerification, useLogout } from '@/api/hooks';
import { Button, LoadingSpinner } from '@/components/ui';

export function VerifyEmailPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isLoading, isAuthenticated } = useAuth();
    const resendMutation = useResendVerification();
    const logoutMutation = useLogout();

    const [message, setMessage] = useState<string | null>(null);
    const verified = searchParams.get('verified') === '1';
    const alreadyVerified = searchParams.get('already') === '1';

    // Handle verified query parameter
    useEffect(() => {
        if (verified) {
            if (alreadyVerified) {
                setMessage(t('Email already verified'));
            } else {
                setMessage(t('Email Verified Successfully'));
            }
            // Clear query params and redirect after showing message
            const timer = setTimeout(() => {
                navigate('/library', { replace: true });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [verified, alreadyVerified, navigate, t]);

    // Show loading
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // Redirect if not authenticated
    if (!isAuthenticated) {
        navigate('/login', { replace: true });
        return null;
    }

    // Redirect if already verified and no success message to show
    if (user?.email_verified && !verified) {
        navigate('/library', { replace: true });
        return null;
    }

    const handleResend = async () => {
        setMessage(null);
        try {
            await resendMutation.mutateAsync();
            setMessage(t('A new verification link has been sent to your email address.'));
        } catch {
            setMessage(t('An error occurred. Please try again.'));
        }
    };

    const handleLogout = async () => {
        await logoutMutation.mutateAsync();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="max-w-md w-full">
                <div className="bg-gray-800 rounded-lg shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white">Varbook</h1>
                        <p className="text-gray-400 mt-2">{t('Verify Your Email')}</p>
                    </div>

                    {verified ? (
                        <div className="text-center">
                            <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-3 rounded mb-6">
                                {message}
                            </div>
                            <p className="text-gray-400">
                                {t('Your email has been verified. You can now access all features.')}
                            </p>
                            <p className="text-gray-500 mt-2 text-sm">
                                {t('Redirecting...')}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-6">
                                <p className="text-gray-300">
                                    {t('Thanks for signing up! Before getting started, could you verify your email address by clicking on the link we just emailed to you?')}
                                </p>
                                {user?.email && (
                                    <p className="text-gray-400 mt-2">
                                        {user.email}
                                    </p>
                                )}
                            </div>

                            {message && (
                                <div className="bg-green-900/50 border border-green-500 text-green-300 px-4 py-3 rounded mb-6">
                                    {message}
                                </div>
                            )}

                            <div className="space-y-4">
                                <Button
                                    onClick={handleResend}
                                    className="w-full"
                                    isLoading={resendMutation.isPending}
                                >
                                    {t('Resend Verification Email')}
                                </Button>

                                <Button
                                    onClick={handleLogout}
                                    variant="secondary"
                                    className="w-full"
                                    isLoading={logoutMutation.isPending}
                                >
                                    {t('Log out')}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
