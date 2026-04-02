import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForgotPassword } from '@/api/hooks';
import { Button } from '@/components/ui';
import { AxiosError } from 'axios';

export function ForgotPasswordPage() {
    const { t, i18n } = useTranslation();
    const forgotPasswordMutation = useForgotPassword();

    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        try {
            await forgotPasswordMutation.mutateAsync(email);
            setSuccess(true);
            setEmail('');
        } catch (err) {
            if (err instanceof AxiosError && err.response?.data) {
                if (err.response.data.message) {
                    setError(err.response.data.message);
                } else if (err.response.data.errors?.email) {
                    setError(err.response.data.errors.email[0]);
                }
            } else {
                setError(t('An error occurred. Please try again.'));
            }
        }
    };

    const handleLanguageChange = (locale: string) => {
        i18n.changeLanguage(locale);
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

                {/* Forgot password card */}
                <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
                    <h2 className="text-xl font-semibold text-white mb-4 text-center">
                        {t('Forgot Password')}
                    </h2>

                    <p className="text-sm text-gray-300 mb-6 text-center">
                        {t('Forgot your password? No problem. Just let us know your email address and we will email you a password reset link that will allow you to choose a new one.')}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-500/10 border border-green-500/50 text-green-300 px-4 py-3 rounded-xl text-sm">
                                {t('We have emailed your password reset link!')}
                            </div>
                        )}

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
                        </div>

                        <Button
                            type="submit"
                            className="w-full !bg-indigo-600 hover:!bg-indigo-500 !py-3 !text-base font-medium transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 !rounded-xl !mt-6"
                            isLoading={forgotPasswordMutation.isPending}
                        >
                            {t('Email Password Reset Link')}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-700/50 text-center">
                        <p className="text-gray-400 text-sm">
                            <Link
                                to="/login"
                                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                            >
                                {t('Back to login')}
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
