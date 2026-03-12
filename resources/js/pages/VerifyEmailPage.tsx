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
    const [isSuccess, setIsSuccess] = useState(false);
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
            setIsSuccess(true);
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-950">
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
        setIsSuccess(false);
        try {
            await resendMutation.mutateAsync();
            setMessage(t('A new verification link has been sent to your email address.'));
            setIsSuccess(true);
        } catch {
            setMessage(t('An error occurred. Please try again.'));
            setIsSuccess(false);
        }
    };

    const handleLogout = async () => {
        await logoutMutation.mutateAsync();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-950 px-4 py-8">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo and branding */}
                <div className="text-center mb-8">
                    <div className="inline-block mb-4">
                        <img
                            src="/pwa-icons/logo.svg"
                            alt="Varbook"
                            className="w-20 h-20 mx-auto drop-shadow-2xl"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Varbook</h1>
                </div>

                {/* Verify card */}
                <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
                    {verified ? (
                        <div className="text-center">
                            {/* Success icon */}
                            <div className="w-16 h-16 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-4">
                                {message}
                            </h2>
                            <p className="text-gray-400 mb-4">
                                {t('Your email has been verified. You can now access all features.')}
                            </p>
                            <p className="text-indigo-400 text-sm animate-pulse">
                                {t('Redirecting...')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Email icon */}
                            <div className="w-16 h-16 mx-auto mb-6 bg-indigo-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>

                            <h2 className="text-xl font-semibold text-white mb-2 text-center">
                                {t('Welcome')}
                            </h2>
                            <h3 className="text-lg text-gray-300 mb-4 text-center">
                                {t('Verify Your Email')}
                            </h3>

                            <p className="text-gray-300 text-center mb-4 text-sm leading-relaxed">
                                {t('Thanks for signing up! Before getting started, could you verify your email address by clicking on the link we just emailed to you?')}
                            </p>

                            {user?.email && (
                                <p className="text-indigo-400 font-medium text-center mb-6">
                                    {user.email}
                                </p>
                            )}

                            {message && (
                                <div className={`${isSuccess ? 'bg-green-500/10 border-green-500/50 text-green-300' : 'bg-red-500/10 border-red-500/50 text-red-300'} border px-4 py-3 rounded-xl text-sm mb-6 text-center`}>
                                    {message}
                                </div>
                            )}

                            <div className="space-y-3">
                                <Button
                                    onClick={handleResend}
                                    className="w-full !bg-indigo-600 hover:!bg-indigo-500 !py-3 !text-base font-medium transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 !rounded-xl"
                                    isLoading={resendMutation.isPending}
                                >
                                    {t('Resend Verification Email')}
                                </Button>

                                <Button
                                    onClick={handleLogout}
                                    variant="ghost"
                                    className="w-full !py-3 !text-gray-400 hover:!text-white !rounded-xl"
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
