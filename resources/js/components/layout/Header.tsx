import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useLogout, useUpdateLocale } from '@/api/hooks';
import { Button } from '@/components/ui';

const languages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
];

export function Header() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const { user } = useAuth();
    const logoutMutation = useLogout();
    const updateLocaleMutation = useUpdateLocale();

    const handleLanguageChange = async (locale: string) => {
        await updateLocaleMutation.mutateAsync(locale);
        i18n.changeLanguage(locale);
    };

    const handleLogout = async () => {
        await logoutMutation.mutateAsync();
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <header className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo & Navigation */}
                    <div className="flex items-center gap-8">
                        <Link to="/library" className="text-xl font-bold text-white">
                            BookShelf
                        </Link>
                        <nav className="hidden md:flex items-center gap-4">
                            <Link
                                to="/library"
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isActive('/library')
                                        ? 'bg-gray-900 text-white'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                {t('Library')}
                            </Link>
                            <Link
                                to="/stats"
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isActive('/stats')
                                        ? 'bg-gray-900 text-white'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                {t('Stats')}
                            </Link>
                            {user?.is_admin && (
                                <Link
                                    to="/admin/users"
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        location.pathname.startsWith('/admin')
                                            ? 'bg-gray-900 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    {t('Admin')}
                                </Link>
                            )}
                        </nav>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-4">
                        {/* Language selector */}
                        <select
                            value={i18n.language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="bg-gray-700 text-gray-200 text-sm rounded-md border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {languages.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.label}
                                </option>
                            ))}
                        </select>

                        {/* User menu */}
                        <div className="flex items-center gap-3">
                            <Link
                                to="/profile"
                                className={`text-sm transition-colors ${
                                    isActive('/profile')
                                        ? 'text-white'
                                        : 'text-gray-300 hover:text-white'
                                }`}
                            >
                                {user?.name}
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                isLoading={logoutMutation.isPending}
                            >
                                {t('Log Out')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
