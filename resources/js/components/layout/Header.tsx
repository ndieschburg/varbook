import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useLogout, useUpdateLocale } from '@/api/hooks';
import { Button } from '@/components/ui';
import { CogIcon, MenuIcon, XIcon, LogoutIcon } from '@/components/icons';

const languages = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
    { code: 'es', label: 'ES' },
];

export function Header() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const { user } = useAuth();
    const logoutMutation = useLogout();
    const updateLocaleMutation = useUpdateLocale();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLanguageChange = async (locale: string) => {
        await updateLocaleMutation.mutateAsync(locale);
        i18n.changeLanguage(locale);
    };

    const handleLogout = async () => {
        await logoutMutation.mutateAsync();
    };

    const isActive = (path: string) => location.pathname === path;

    const navLinks = [
        { path: '/library', label: t('Library') },
        { path: '/stats', label: t('Stats') },
    ];

    const adminLinks = user?.is_admin ? [
        { path: '/admin/users', label: t('Users Management') },
        { path: '/admin/settings', label: t('System Settings') },
        { path: '/admin/logs', label: t('Progress Logs') },
    ] : [];

    return (
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14 md:h-16">
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                        {mobileMenuOpen ? (
                            <XIcon className="h-6 w-6" />
                        ) : (
                            <MenuIcon className="h-6 w-6" />
                        )}
                    </button>

                    {/* Logo & Desktop Navigation */}
                    <div className="flex items-center gap-8">
                        <Link to="/library" className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                            BookShelf
                        </Link>
                        <nav className="hidden md:flex items-center gap-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        isActive(link.path)
                                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            {adminLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        isActive(link.path)
                                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Right side - Desktop */}
                    <div className="hidden md:flex items-center gap-4">
                        {/* Language selector */}
                        <div className="flex gap-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                        i18n.language === lang.code
                                            ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white'
                                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                    }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>

                        {/* User menu */}
                        <div className="flex items-center gap-2">
                            <Link
                                to="/settings"
                                className={`p-2 rounded-md transition-colors ${
                                    isActive('/settings')
                                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                                }`}
                                title={t('Settings')}
                            >
                                <CogIcon className="h-5 w-5" />
                            </Link>
                            <Link
                                to="/profile"
                                className={`text-sm transition-colors ${
                                    isActive('/profile')
                                        ? 'text-gray-900 dark:text-white'
                                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                }`}
                            >
                                {user?.name}
                            </Link>
                            <button
                                onClick={handleLogout}
                                disabled={logoutMutation.isPending}
                                className="p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white rounded-md transition-colors disabled:opacity-50"
                                title={t('Log Out')}
                            >
                                <LogoutIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Right side - Mobile */}
                    <div className="flex md:hidden items-center gap-2">
                        <Link
                            to="/settings"
                            className={`p-2 rounded-md transition-colors ${
                                isActive('/settings')
                                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                            }`}
                        >
                            <CogIcon className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <nav className="px-4 py-3 space-y-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                    isActive(link.path)
                                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {adminLinks.length > 0 && (
                            <>
                                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                                <p className="px-3 py-1 text-xs text-gray-500 uppercase">{t('Admin')}</p>
                                {adminLinks.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                                            isActive(link.path)
                                                ? 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </>
                        )}
                    </nav>

                    {/* Language & User section */}
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                        {/* Language */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-gray-500">{t('Language')}:</span>
                            <div className="flex gap-1">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLanguageChange(lang.code)}
                                        className={`px-2 py-1 text-xs rounded transition-colors ${
                                            i18n.language === lang.code
                                                ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white'
                                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                        }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* User */}
                        <div className="flex items-center justify-between">
                            <Link
                                to="/profile"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
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
            )}
        </header>
    );
}
