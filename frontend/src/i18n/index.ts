import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import adminRu from './locales/ru/admin.json';
import authRu from './locales/ru/auth.json';
import cabinetRu from './locales/ru/cabinet.json';
import commonRu from './locales/ru/common.json';
import coursesRu from './locales/ru/courses.json';
import homeworkRu from './locales/ru/homework.json';
import lessonRu from './locales/ru/lesson.json';
import scheduleRu from './locales/ru/schedule.json';
import seedumRu from './locales/ru/seedum.json';
import chatRu from './locales/ru/chat.json';
import roomRu from './locales/ru/room.json';
import startRu from './locales/ru/start.json';
import subjectRu from './locales/ru/subject.json';
import uploadRu from './locales/ru/upload.json';

export const defaultNS = 'common';

// MVP ships `ru` only, but the setup is locale-agnostic: add a locale by
// dropping in its resource bundles and registering it here.
export const resources = {
  ru: {
    common: commonRu,
    auth: authRu,
    cabinet: cabinetRu,
    courses: coursesRu,
    schedule: scheduleRu,
    homework: homeworkRu,
    admin: adminRu,
    seedum: seedumRu,
    chat: chatRu,
    room: roomRu,
    start: startRu,
    subject: subjectRu,
    lesson: lessonRu,
    upload: uploadRu,
  },
} as const;

void i18n.use(initReactI18next).init({
  lng: 'ru',
  fallbackLng: 'ru',
  ns: [
    'common',
    'auth',
    'cabinet',
    'courses',
    'schedule',
    'homework',
    'admin',
    'seedum',
    'lesson',
    'upload',
    'chat',
    'room',
    'start',
    'subject',
  ],
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
