import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import frCommon from './locales/fr/common.json';

const savedLanguage = localStorage.getItem('app_language') || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
    },
    fr: {
      common: frCommon,
    },
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;