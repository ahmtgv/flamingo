import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import authRu from './locales/ru/auth.json';
import cabinetRu from './locales/ru/cabinet.json';
import commonRu from './locales/ru/common.json';

export const defaultNS = 'common';

// MVP ships `ru` only, but the setup is locale-agnostic: add a locale by
// dropping in its resource bundles and registering it here.
export const resources = {
  ru: {
    common: commonRu,
    auth: authRu,
    cabinet: cabinetRu,
  },
} as const;

void i18n.use(initReactI18next).init({
  lng: 'ru',
  fallbackLng: 'ru',
  ns: ['common', 'auth', 'cabinet'],
  defaultNS,
  resources,
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    // Resources are bundled and ready synchronously — no Suspense fallback needed.
    useSuspense: false,
  },
});

export default i18n;
