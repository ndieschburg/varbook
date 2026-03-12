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
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                        {t('landing.hero.title')}
                    </h1>

                    <p className="text-xl md:text-2xl text-indigo-200/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                        {t('landing.hero.subtitle')}
                    </p>

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
