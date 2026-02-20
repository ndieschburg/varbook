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

// Get initial locale from HTML lang attribute or default to 'en'
const getInitialLocale = (): string => {
    const htmlLang = document.documentElement.lang;
    if (htmlLang && ['en', 'fr', 'es'].includes(htmlLang)) {
        return htmlLang;
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
