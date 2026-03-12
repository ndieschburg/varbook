import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useRegister, useRegistrationStatus } from '@/api/hooks';
import { Button, LoadingSpinner } from '@/components/ui';
import { AxiosError } from 'axios';

export function RegisterPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { data: registrationStatus, isLoading: isLoadingStatus } = useRegistrationStatus();
    const registerMutation = useRegister();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    // Redirect if already authenticated
    if (isAuthenticated) {
        if (user && !user.email_verified) {
            navigate('/verify-email', { replace: true });
        } else {
            navigate('/library', { replace: true });
        }
        return null;
    }

    // Show loading while checking registration status
    if (isLoadingStatus) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-950">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // If registration is disabled, redirect to login
    if (!registrationStatus?.enabled) {
        navigate('/login', { replace: true });
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});

        try {
            await registerMutation.mutateAsync({
                name,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });
            navigate('/verify-email', { replace: true });
        } catch (err) {
            if (err instanceof AxiosError && err.response?.data) {
                if (err.response.data.message) {
                    setError(err.response.data.message);
                }
                if (err.response.data.errors) {
                    setFieldErrors(err.response.data.errors);
                }
            } else {
                setError(t('An error occurred. Please try again.'));
            }
        }
    };

    const handleLanguageChange = (locale: string) => {
        i18n.changeLanguage(locale);
    };

    const getFieldError = (field: string): string | undefined => {
        return fieldErrors[field]?.[0];
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
                    <p className="text-indigo-300/80 text-sm">
                        {t('Your personal EPUB library')}
                    </p>
                </div>

                {/* Register card */}
                <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
                    <h2 className="text-xl font-semibold text-white mb-6 text-center">
                        {t('Create Account')}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
                                {t('Name')}
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder={t('Your name')}
                                className="w-full px-4 py-3 rounded-xl bg-gray-700/50 border border-gray-600/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            />
                            {getFieldError('name') && (
                                <p className="mt-1.5 text-sm text-red-400">{getFieldError('name')}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                                {t('Email')}
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-xl bg-gray-700/50 border border-gray-600/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            />
                            {getFieldError('email') && (
                                <p className="mt-1.5 text-sm text-red-400">{getFieldError('email')}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                                {t('Password')}
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl bg-gray-700/50 border border-gray-600/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            />
                            {getFieldError('password') && (
                                <p className="mt-1.5 text-sm text-red-400">{getFieldError('password')}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-300 mb-1.5">
                                {t('Confirm Password')}
                            </label>
                            <input
                                type="password"
                                id="password_confirmation"
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl bg-gray-700/50 border border-gray-600/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full !bg-indigo-600 hover:!bg-indigo-500 !py-3 !text-base font-medium transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 !rounded-xl !mt-6"
                            isLoading={registerMutation.isPending}
                        >
                            {t('Register')}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-700/50 text-center">
                        <p className="text-gray-400 text-sm">
                            {t('Already registered?')}{' '}
                            <Link
                                to="/login"
                                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                            >
                                {t('Log in')}
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Language selector */}
                <div className="mt-8 flex justify-center gap-2">
                    {['en', 'fr', 'es'].map((lang) => (
                        <button
                            key={lang}
                            onClick={() => handleLanguageChange(lang)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                i18n.language === lang
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                            }`}
                        >
                            {lang === 'en' ? 'EN' : lang === 'fr' ? 'FR' : 'ES'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
