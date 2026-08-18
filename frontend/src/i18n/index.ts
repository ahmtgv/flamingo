import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import accountRu from './locales/ru/account.json';
import adminRu from './locales/ru/admin.json';
import authRu from './locales/ru/auth.json';
import cabinetRu from './locales/ru/cabinet.json';
import commonRu from './locales/ru/common.json';
import coursesRu from './locales/ru/courses.json';
import homeworkRu from './locales/ru/homework.json';
import journalRu from './locales/ru/journal.json';
import landingRu from './locales/ru/landing.json';
import lessonRu from './locales/ru/lesson.json';
import scheduleRu from './locales/ru/schedule.json';
import seedumRu from './locales/ru/seedum.json';
import boardRu from './locales/ru/board.json';
import chatRu from './locales/ru/chat.json';
import exercisesRu from './locales/ru/exercises.json';
import summaryRu from './locales/ru/summary.json';
import demoRu from './locales/ru/demo.json';
import desktopRu from './locales/ru/desktop.json';
import dictionaryRu from './locales/ru/dictionary.json';
import meetingRu from './locales/ru/meeting.json';
import mylearningRu from './locales/ru/mylearning.json';
import repetitionRu from './locales/ru/repetition.json';
import roomRu from './locales/ru/room.json';
import sourcesRu from './locales/ru/sources.json';
import startRu from './locales/ru/start.json';
import subjectRu from './locales/ru/subject.json';
import uploadRu from './locales/ru/upload.json';

export const defaultNS = 'common';

// MVP ships `ru` only, but the setup is locale-agnostic: add a locale by
// dropping in its resource bundles and registering it here.
export const resources = {
  ru: {
    common: commonRu,
    account: accountRu,
    auth: authRu,
    cabinet: cabinetRu,
    courses: coursesRu,
    schedule: scheduleRu,
    homework: homeworkRu,
    admin: adminRu,
    seedum: seedumRu,
    board: boardRu,
    chat: chatRu,
    exercises: exercisesRu,
    summary: summaryRu,
    dictionary: dictionaryRu,
    desktop: desktopRu,
    meeting: meetingRu,
    repetition: repetitionRu,
    room: roomRu,
    sources: sourcesRu,
    start: startRu,
    subject: subjectRu,
    demo: demoRu,
    journal: journalRu,
    landing: landingRu,
    mylearning: mylearningRu,
    lesson: lessonRu,
    upload: uploadRu,
  },
} as const;

void i18n.use(initReactI18next).init({
  lng: 'ru',
  fallbackLng: 'ru',
  ns: [
    'common',
    'account',
    'auth',
    'cabinet',
    'courses',
    'schedule',
    'homework',
    'admin',
    'seedum',
    'lesson',
    'upload',
    'board',
    'chat',
    'exercises',
    'summary',
    'dictionary',
    'desktop',
    'meeting',
    'repetition',
    'room',
    'sources',
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
