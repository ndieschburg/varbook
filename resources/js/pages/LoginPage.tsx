import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { AxiosError } from 'axios';

export function LoginPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const from = (location.state as { from?: Location })?.from?.pathname || '/library';

    // Redirect if already authenticated
    if (isAuthenticated) {
        navigate(from, { replace: true });
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login({ email, password });
            navigate(from, { replace: true });
        } catch (err) {
            if (err instanceof AxiosError && err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('An error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLanguageChange = (locale: string) => {
        i18n.changeLanguage(locale);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="max-w-md w-full">
                <div className="bg-gray-800 rounded-lg shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white">Varbook</h1>
                        <p className="text-gray-400 mt-2">{t('Log in')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

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
                        </div>

                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            {t('Log in')}
                        </Button>
                    </form>

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
