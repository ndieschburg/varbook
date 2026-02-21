import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations directly from lang files
import en from '../../../lang/en.json';
import fr from '../../../lang/fr.json';
import es from '../../../lang/es.json';

const resources = {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
};

const SUPPORTED_LANGUAGES = ['en', 'fr', 'es'];

// Get initial locale: HTML lang > browser language > 'en'
const getInitialLocale = (): string => {
    // First check HTML lang attribute (set by backend for authenticated users)
    const htmlLang = document.documentElement.lang;
    if (htmlLang && SUPPORTED_LANGUAGES.includes(htmlLang)) {
        return htmlLang;
    }

    // Then check browser language preferences
    const browserLanguages = navigator.languages || [navigator.language];
    for (const lang of browserLanguages) {
        // Extract base language code (e.g., 'fr-FR' -> 'fr')
        const baseLang = lang.split('-')[0].toLowerCase();
        if (SUPPORTED_LANGUAGES.includes(baseLang)) {
            return baseLang;
        }
    }

    return 'en';
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: getInitialLocale(),
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
