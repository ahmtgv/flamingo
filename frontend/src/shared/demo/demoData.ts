/**
 * TEMPORARY browser demo dataset (VITE_PREVIEW=1) — synthetic, client-only, $0.
 *
 * A single source of truth for the preview personas + entities, aligned with the design
 * atlas (docs/design-previews/atlas/): Гимназия №1, teacher Мария Петровна, student
 * Саша Иванов, parent Ольга И., admin Галина А., the «Алгебра» course + live session, etc.
 *
 * Nothing here ever leaves the device: the demo Apollo link resolves entirely in-memory
 * (see demoLink.ts / resolveDemoOperation.ts). Remove this module with the VITE_PREVIEW
 * short-circuit before real launch.
 */
import type { AgeBand, BoardQuery, MeQuery } from '@/entities/graphql/generated';

/** One element of the preview board — the same shape the Board query returns. */
type DemoBoardElement = BoardQuery['board']['elements'][number];

// --- shared user leaf refs (id + name [+ email]) -----------------------------------------
type UserRef = {
  __typename: 'User';
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export const users = {
  sasha: {
    __typename: 'User',
    id: 'u-sasha',
    firstName: 'Саша',
    lastName: 'Иванов',
    email: 'sasha@example.ru',
  },
  maria: {
    __typename: 'User',
    id: 'u-maria',
    firstName: 'Мария',
    lastName: 'Петровна',
    email: 'maria@gymnasium1.ru',
  },
  ilya: {
    __typename: 'User',
    id: 'u-ilya',
    firstName: 'Илья',
    lastName: 'Сергеевич',
    email: 'ilya@gymnasium1.ru',
  },
  dmitry: {
    __typename: 'User',
    id: 'u-dmitry',
    firstName: 'Дмитрий',
    lastName: 'Абрамов',
    email: 'dmitry@gymnasium1.ru',
  },
  olga: {
    __typename: 'User',
    id: 'u-olga',
    firstName: 'Ольга',
    lastName: 'Иванова',
    email: 'olga@example.ru',
  },
  galina: {
    __typename: 'User',
    id: 'u-galina',
    firstName: 'Галина',
    lastName: 'Андреева',
    email: 'admin@gymnasium1.ru',
  },
  mila: {
    __typename: 'User',
    id: 'u-mila',
    firstName: 'Мила',
    lastName: 'Иванова',
    email: 'mila@example.ru',
  },
  vera: {
    __typename: 'User',
    id: 'u-vera',
    firstName: 'Вера',
    lastName: 'Смирнова',
    email: 'vera@example.ru',
  },
  timur: {
    __typename: 'User',
    id: 'u-timur',
    firstName: 'Тимур',
    lastName: 'Ибрагимов',
    email: 'timur@example.ru',
  },
  kostya: {
    __typename: 'User',
    id: 'u-kostya',
    firstName: 'Костя',
    lastName: 'Орлов',
    email: 'kostya@example.ru',
  },
  liza: {
    __typename: 'User',
    id: 'u-liza',
    firstName: 'Лиза',
    lastName: 'Козлова',
    email: 'liza@example.ru',
  },
  mark: {
    __typename: 'User',
    id: 'u-mark',
    firstName: 'Марк',
    lastName: 'Волков',
    email: 'mark@example.ru',
  },
  anya: {
    __typename: 'User',
    id: 'u-anya',
    firstName: 'Аня',
    lastName: 'Морозова',
    email: 'anya@example.ru',
  },
  dima: {
    __typename: 'User',
    id: 'u-dima',
    firstName: 'Дима',
    lastName: 'Соколов',
    email: 'dima@example.ru',
  },
  annaR: {
    __typename: 'User',
    id: 'u-anna-r',
    firstName: 'Анна',
    lastName: 'Рожкова',
    email: 'anna.r@example.ru',
  },
  petrK: {
    __typename: 'User',
    id: 'u-petr-k',
    firstName: 'Пётр',
    lastName: 'Ковалёв',
    email: 'petr.k@example.ru',
  },
} satisfies Record<string, UserRef>;

// The live-session cohort (8 pupils) with a live attention score — used by the teacher's
// class view / preview room (avgAttention only; Тимур is the «нужно внимание» outlier).
export const cohort: { user: UserRef; attention: number }[] = [
  { user: users.sasha, attention: 86 },
  { user: users.vera, attention: 72 },
  { user: users.timur, attention: 41 },
  { user: users.kostya, attention: 64 },
  { user: users.liza, attention: 78 },
  { user: users.mark, attention: 69 },
  { user: users.anya, attention: 81 },
  { user: users.dima, attention: 74 },
];

// --- canonical ids -----------------------------------------------------------------------
export const IDS = {
  institution: 'inst-gymnasium-1',
  course: {
    algebra: 'c-algebra',
    english: 'c-english',
    physics: 'c-physics',
    geometry: 'c-geometry',
  },
  session: {
    live: 'ses-algebra-live',
    english: 'ses-english',
    physics: 'ses-physics',
    past: 'ses-past',
    canceled: 'ses-canceled',
  },
  homework: { linear: 'hw-linear', present: 'hw-present', motion: 'hw-motion', essay: 'hw-essay' },
  group: { g7a: 'grp-7a', g7b: 'grp-7b', g8a: 'grp-8a' },
} as const;

// --- time helpers (relative to the real run date, so «сегодня» always reads as today) ----
function at(dayOffset: number, h: number, m: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
export const times = {
  todayLive: at(0, 14, 0),
  todayLiveEnd: at(0, 14, 45),
  todayEnglish: at(0, 16, 30),
  tomorrowPhysics: at(1, 10, 0),
  yesterdayPast: at(-1, 14, 0),
  yesterdayCanceled: at(-1, 17, 0),
};

// --- mutable store (optimistic in-memory updates for a few visible flows) ----------------
type MeChild = NonNullable<NonNullable<MeQuery['me']>['parentProfile']>['children'][number];

const initialChildren: MeChild[] = [
  {
    __typename: 'StudentProfile',
    ageBand: 'TEEN',
    gradeLevel: '7 класс',
    user: {
      __typename: 'User',
      id: users.sasha.id,
      firstName: users.sasha.firstName,
      lastName: users.sasha.lastName,
    },
  },
  {
    __typename: 'StudentProfile',
    ageBand: 'JUNIOR',
    gradeLevel: '3 класс',
    user: {
      __typename: 'User',
      id: users.mila.id,
      firstName: users.mila.firstName,
      lastName: users.mila.lastName,
    },
  },
];

/** Learning-profile ids for the preview (same "<kind>:<uuid>" shape the server projects). */
export const PROFILE_IDS = {
  pupil: `pupil:${IDS.institution}`,
  cadet: `cadet:${IDS.course.english}`,
  teacher: `teacher:${IDS.institution}`,
} as const;

export const store = {
  /** Parent's linked children — AddChild appends here so refetch(Me) reflects it. */
  children: [...initialChildren],
  /** Which education the demo account is currently in — SetActiveLearningProfile moves it,
   *  so the switch behaves like the real one (and survives a refetch within the session). */
  activeLearningProfile: '' as string,
  /** Course ids the student is enrolled in — Enroll/Unenroll toggle these. */
  enrolled: new Set<string>([IDS.course.algebra]),
  /** Saved subject materials/sources, keyed by the material or source id (atlas 01 quiet
   *  corner) — SaveItem/RemoveSavedItem toggle these so the preview shows the real gesture. */
  saved: new Map<
    string,
    {
      savedId: string;
      note: string;
      watchLater: boolean;
      title: string;
      url: string | null;
      sourceName: string | null;
    }
  >(),
  /** Teacher's programme edits (atlas 01 edit mode) — so a reorder or an added lesson
   *  actually sticks in the preview instead of snapping back on the next read. */
  programme: {
    edits: new Map<
      string,
      { title?: string; description?: string; kind?: string; deviceKey?: string }
    >(),
    order: new Map<string, string[]>(),
    removed: new Set<string>(),
    added: new Map<
      string,
      { id: string; title: string; description: string; kind: string; deviceKey: string }[]
    >(),
  },
  /** Chat (R2): messages sent in the preview stay in the conversation, and marking a
   *  channel read actually clears its badge. */
  chat: {
    sent: new Map<string, { id: string; text: string; sentAt: string }[]>(),
    read: new Set<string>(),
    reported: new Set<string>(),
  },
  /** Board (R3.2): edits stick for the session so the preview canvas behaves like the real
   *  one, including the teacher's open/closed switch. */
  board: {
    open: false,
    edits: new Map<string, DemoBoardElement>(),
    added: [] as DemoBoardElement[],
    removed: new Set<string>(),
    saved: [] as { id: string; title: string; savedAt: string }[],
  },
  /** Exercises (R4.1): an answer given in the preview stays answered, and shows up in the
   *  teacher's histogram — otherwise the showcase would not show the feature working. */
  exercises: {
    answers: new Map<string, { choice?: number; correct: boolean | null; at: string }>(),
  },
  /** Dictionary (R4.3): «в мои слова» sticks, and «показать всем» is remembered so the
   *  preview shows the gesture landing. Neither is content — the words themselves are
   *  seeded, licences and all. */
  dictionary: {
    mine: new Set<string>(),
    shown: null as string | null,
  },
  /** Repetition (R4.4): a reviewed card leaves the queue and the milestone sticks, so the
   *  preview shows the loop closing. 🔴 Nothing here is comparable with another learner. */
  repetition: {
    reviewed: new Set<string>(),
    achievements: new Set<string>(),
  },
  /** Summary (R4.2): a message sent in the preview lands in the summary's CHAT section —
   *  there is no second list for it here either, because there is none in the database. */
  summary: {
    sent: false,
    edits: new Map<string, string>(),
    removed: new Set<string>(),
    chat: [] as {
      id: string;
      text: string;
      senderId: string;
      senderName: string;
      atOffsetSec: number;
    }[],
  },
  /** Monotonic counter for synthetic ids minted by create-mutations. */
  seq: 1000,
};

export function resetDemoStore(): void {
  store.children = [...initialChildren];
  store.enrolled = new Set<string>([IDS.course.algebra]);
  store.activeLearningProfile = '';
  store.saved = new Map();
  store.programme = { edits: new Map(), order: new Map(), removed: new Set(), added: new Map() };
  store.chat = { sent: new Map(), read: new Set(), reported: new Set() };
  store.board = { open: false, edits: new Map(), added: [], removed: new Set(), saved: [] };
  store.exercises = { answers: new Map() };
  store.dictionary = { mine: new Set(), shown: null };
  store.repetition = { reviewed: new Set(), achievements: new Set() };
  store.summary = { sent: false, edits: new Map(), removed: new Set(), chat: [] };
  store.seq = 1000;
}

export function nextId(prefix: string): string {
  store.seq += 1;
  return `${prefix}-${store.seq}`;
}

/** Build a fresh MeChild for AddChild (ageBand inferred loosely from the grade text). */
export function makeChild(firstName: string, lastName: string, gradeLevel: string | null): MeChild {
  const gradeNum = gradeLevel ? parseInt(gradeLevel, 10) : NaN;
  const ageBand: AgeBand = !Number.isNaN(gradeNum) && gradeNum <= 4 ? 'JUNIOR' : 'TEEN';
  return {
    __typename: 'StudentProfile',
    ageBand,
    gradeLevel,
    user: { __typename: 'User', id: nextId('u-child'), firstName, lastName: lastName || '' },
  };
}
