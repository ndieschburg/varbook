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
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
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
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="max-w-md w-full">
                <div className="bg-gray-800 rounded-lg shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white">Varbook</h1>
                        <p className="text-gray-400 mt-2">{t('Create Account')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                                {t('Name')}
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {getFieldError('name') && (
                                <p className="mt-1 text-sm text-red-400">{getFieldError('name')}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                                {t('Email')}
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {getFieldError('email') && (
                                <p className="mt-1 text-sm text-red-400">{getFieldError('email')}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                                {t('Password')}
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {getFieldError('password') && (
                                <p className="mt-1 text-sm text-red-400">{getFieldError('password')}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-300">
                                {t('Confirm Password')}
                            </label>
                            <input
                                type="password"
                                id="password_confirmation"
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <Button type="submit" className="w-full" isLoading={registerMutation.isPending}>
                            {t('Register')}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400">
                            {t('Already registered?')}{' '}
                            <Link to="/login" className="text-blue-400 hover:text-blue-300">
                                {t('Log in')}
                            </Link>
                        </p>
                    </div>

                    {/* Language selector */}
                    <div className="mt-6 flex justify-center gap-2">
                        {['en', 'fr', 'es'].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => handleLanguageChange(lang)}
                                className={`px-3 py-1 rounded text-sm ${
                                    i18n.language === lang
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {t(lang === 'en' ? 'English' : lang === 'fr' ? 'French' : 'Spanish')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
