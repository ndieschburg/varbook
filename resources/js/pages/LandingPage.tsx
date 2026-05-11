import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePublicConfig } from '@/api/hooks';
import { Button } from '@/components/ui';
import { LibraryIcon, RefreshIcon, CloudDownloadIcon, RssIcon } from '@/components/icons';

export function LandingPage() {
    const { t, i18n } = useTranslation();
    const { data: publicConfig } = usePublicConfig();

    const handleLanguageChange = (locale: string) => {
        i18n.changeLanguage(locale);
        localStorage.setItem('varbook-locale', locale);
    };

    const features = [
        {
            icon: LibraryIcon,
            titleKey: 'landing.feature.library.title',
            descriptionKey: 'landing.feature.library.description',
            gradient: 'from-blue-500 to-indigo-600',
        },
        {
            icon: RefreshIcon,
            titleKey: 'landing.feature.sync.title',
            descriptionKey: 'landing.feature.sync.description',
            gradient: 'from-purple-500 to-pink-600',
        },
        {
            icon: CloudDownloadIcon,
            titleKey: 'landing.feature.offline.title',
            descriptionKey: 'landing.feature.offline.description',
            gradient: 'from-emerald-500 to-teal-600',
        },
        {
            icon: RssIcon,
            titleKey: 'landing.feature.opds.title',
            descriptionKey: 'landing.feature.opds.description',
            gradient: 'from-orange-500 to-amber-600',
        },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-950">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <header className="relative z-10 px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/pwa-icons/logo.svg" alt="Varbook" className="w-10 h-10" />
                        <span className="text-xl font-bold text-white">Varbook</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login">
                            <Button variant="ghost" className="!text-gray-300 hover:!text-white hover:!bg-gray-700/50">
                                {t('Log in')}
                            </Button>
                        </Link>
                        {publicConfig?.allow_registration && (
                            <Link to="/register">
                                <Button className="!bg-indigo-600 hover:!bg-indigo-500 !rounded-xl">
                                    {t('Register')}
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Animated Logo */}
                    <div className="inline-block mb-8 animate-[bounce-slow_3s_ease-in-out_infinite]">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl scale-150" />
                            <img
                                src="/pwa-icons/logo.svg"
                                alt="Varbook"
                                className="relative w-32 h-32 mx-auto drop-shadow-2xl"
                            />
                        </div>
                    </div>

                    {/* Hero Text */}
                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 leading-tight">
                        {t('Welcome')}
                    </h1>

                    <p className="text-2xl md:text-3xl text-indigo-300/90 mb-4 font-medium">
                        {t('landing.hero.title')}
                    </p>

                    <p className="text-lg md:text-xl text-indigo-200/70 mb-6 max-w-2xl mx-auto leading-relaxed">
                        {t('landing.hero.subtitle')}
                    </p>

                    {/* PWA & Open Source Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
                            <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM12 17.5c-3.04 0-5.5-2.46-5.5-5.5s2.46-5.5 5.5-5.5 5.5 2.46 5.5 5.5-2.46 5.5-5.5 5.5z"/>
                            </svg>
                            <span className="text-sm font-medium text-indigo-300">{t('landing.badge.pwa')}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                            <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                            </svg>
                            <span className="text-sm font-medium text-emerald-300">{t('landing.badge.android')}</span>
                        </div>
                        <a
                            href="https://github.com/your-username/varbook"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-full hover:bg-gray-600/50 hover:border-gray-500/50 transition-all duration-200"
                        >
                            <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                            </svg>
                            <span className="text-sm font-medium text-gray-300">{t('landing.badge.opensource')}</span>
                        </a>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                        <Link to="/login">
                            <Button
                                size="lg"
                                className="!bg-indigo-600 hover:!bg-indigo-500 !px-8 !py-4 !text-lg !rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300"
                            >
                                {t('landing.cta.login')}
                            </Button>
                        </Link>
                        {publicConfig?.allow_registration && (
                            <Link to="/register">
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    className="!px-8 !py-4 !text-lg !rounded-xl !bg-gray-700/50 hover:!bg-gray-600/50 !text-white !border-gray-600/50 hover:!border-gray-500/50 transition-all duration-300"
                                >
                                    {t('landing.cta.register')}
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="group bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 text-left hover:border-gray-600/50 hover:bg-gray-800/70 transition-all duration-300"
                            >
                                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {t(feature.titleKey)}
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    {t(feature.descriptionKey)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-8">
                <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
                    {/* Language selector */}
                    <div className="flex justify-center gap-2">
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
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <p className="text-gray-500 text-sm">
                        {t('Your books, everywhere')}
                    </p>
                </div>
            </footer>
        </div>
    );
}
