import { type MockedResponse } from '@apollo/client/testing';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  LearningProfilesDocument,
  type LearningProfilesQuery,
  MeDocument,
  SetActiveLearningProfileDocument,
  StartPageDocument,
  type StartPageQuery,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { StartScreen } from './StartScreen';

const meMock = (role: 'STUDENT' | 'TEACHER' | 'PARENT' = 'STUDENT') => ({
  request: { query: MeDocument, variables: {} },
  result: {
    data: {
      me: {
        __typename: 'User',
        id: 'u1',
        email: 'a@example.com',
        firstName: 'Аня',
        lastName: 'Коваль',
        role,
        locale: 'ru',
        avatarUrl: null,
        studentProfile: null,
        teacherProfile: null,
        parentProfile: null,
      },
    },
  },
});

const profile = (over: Partial<LearningProfilesQuery['learningProfiles'][number]>) => ({
  __typename: 'LearningProfile' as const,
  id: 'pupil:i1',
  kind: 'PUPIL' as const,
  institutionId: 'i1',
  institutionName: 'Гимназия №1',
  groupName: '9А',
  courseId: null,
  courseTitle: null,
  courseCount: 3,
  isActive: true,
  ...over,
});

const PUPIL = profile({});
const CADET = profile({
  id: 'cadet:c1',
  kind: 'CADET',
  institutionId: null,
  institutionName: null,
  groupName: null,
  courseId: 'c1',
  courseTitle: 'English A2',
  courseCount: 1,
  isActive: false,
});

const profilesMock = (profiles = [PUPIL, CADET]) => ({
  request: { query: LearningProfilesDocument, variables: {} },
  result: { data: { learningProfiles: profiles } },
});

// Superset of every StartEntry selection in the document (`now` asks for the most fields),
// so the mocks satisfy the query shape exactly and Apollo has nothing to warn about.
const entry = (over: Record<string, unknown> = {}) => ({
  __typename: 'StartEntry' as const,
  id: 'session:s1',
  kind: 'LESSON_SESSION' as const,
  title: 'Экзопланеты',
  courseTitle: 'Астрономия',
  teacherName: 'Мария Петровна',
  at: new Date(Date.now() + 17 * 60_000).toISOString(),
  count: null,
  ageDays: null,
  sessionId: 's1',
  lessonId: 'l1',
  courseId: 'c1',
  isLive: false,
  ...over,
});

const week = () =>
  Array.from({ length: 7 }, (_, i) => ({
    __typename: 'StartDay' as const,
    date: new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10),
    isToday: i === 0,
    entries: [] as never[],
  }));

function page(over: Partial<StartPageQuery['startPage']> = {}): StartPageQuery {
  return {
    __typename: 'Query',
    startPage: {
      __typename: 'StartPage',
      profile: PUPIL,
      now: entry(),
      today: [entry()],
      attention: [],
      week: week(),
      continueEntries: [],
      progress: [],
      ...over,
    } as StartPageQuery['startPage'],
  };
}

const pageMock = (data: StartPageQuery) => ({
  request: { query: StartPageDocument, variables: {} },
  result: { data },
});

const render = (mocks: MockedResponse[]) =>
  renderWithProviders(<StartScreen />, { mocks, route: '/start' });

describe('StartScreen — atlas sheet 00', () => {
  it('pupil: greets, shows the lesson about to start and its countdown', async () => {
    render([meMock(), profilesMock(), pageMock(page())]);

    expect(await screen.findByText('Привет, Аня')).toBeInTheDocument();
    expect(screen.getByText('урок начинается')).toBeInTheDocument();
    expect(screen.getAllByText('Экзопланеты').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Войти в урок' })).toBeInTheDocument();
    expect(screen.getByText(/через 17 минут/)).toBeInTheDocument();
  });

  it('keeps the sheet-00 slot order: сейчас → сегодня → внимание → неделя → продолжить → прогресс', async () => {
    render([meMock(), profilesMock(), pageMock(page())]);
    await screen.findByText('Привет, Аня');

    const labels = screen
      .getAllByRole('region')
      .map((section) => section.getAttribute('aria-label'));
    expect(labels).toEqual([
      'Сейчас',
      'Сегодня',
      'Требует внимания',
      'Неделя',
      'Продолжить',
      'Прогресс',
      'Быстрые входы',
    ]);
  });

  it('a live lesson is marked as running rather than counted down', async () => {
    const live = entry({ isLive: true });
    render([meMock(), profilesMock(), pageMock(page({ now: live, today: [live] }))]);
    expect(await screen.findByText('идёт сейчас')).toBeInTheDocument();
    expect(screen.queryByText(/через/)).not.toBeInTheDocument();
  });

  it('teacher: gets the grading queue and no learner-only slots', async () => {
    const queue = entry({
      id: 'grading-queue',
      kind: 'GRADING_QUEUE',
      title: '',
      count: 11,
      ageDays: 2,
      at: null,
      sessionId: null,
      lessonId: null,
      courseId: null,
    });
    const teacherProfile = profile({
      id: 'teacher:i1',
      kind: 'TEACHER',
      groupName: null,
      isActive: true,
    });
    render([
      meMock('TEACHER'),
      profilesMock([teacherProfile]),
      pageMock(page({ profile: teacherProfile, attention: [queue], now: null, today: [] })),
    ]);

    expect(await screen.findByText('Здравствуйте, Аня')).toBeInTheDocument();
    expect(screen.getByText('11 работ на проверке')).toBeInTheDocument();
    expect(screen.getByText('старшей 2 дня')).toBeInTheDocument();
    // "Продолжить" belongs to a learner, not to a teaching context.
    expect(screen.queryByRole('region', { name: 'Продолжить' })).not.toBeInTheDocument();
  });

  it('cadet: no timetable, and the week says so instead of inventing repetitions', async () => {
    const activeCadet = { ...CADET, isActive: true };
    render([
      meMock(),
      profilesMock([{ ...PUPIL, isActive: false }, activeCadet]),
      pageMock(page({ profile: activeCadet, now: null, today: [], week: week() })),
    ]);

    expect(await screen.findByText('Расписания нет — занимайтесь когда удобно')).toBeInTheDocument();
    expect(screen.getByText(/Жёсткого расписания нет/)).toBeInTheDocument();
  });

  it('the account menu lists both educations and switching refetches the page', async () => {
    const user = userEvent.setup();
    const switched = { ...CADET, isActive: true };
    let switchCalled = false;

    render([
      meMock(),
      profilesMock(),
      pageMock(page()),
      {
        request: { query: SetActiveLearningProfileDocument, variables: { id: 'cadet:c1' } },
        result: () => {
          switchCalled = true;
          return {
            data: {
              setActiveLearningProfile: {
                __typename: 'LearningProfile',
                id: 'cadet:c1',
                kind: 'CADET',
                isActive: true,
              },
            },
          };
        },
      },
      pageMock(page({ profile: switched, now: null, today: [] })),
      profilesMock([{ ...PUPIL, isActive: false }, switched]),
    ]);

    await screen.findByText('Привет, Аня');
    await user.click(screen.getByRole('button', { name: 'Меню учётной записи' }));

    const menu = screen.getByRole('menu');
    // Labels are composed on the client from kind + data — sheet 00 wording.
    expect(within(menu).getByText('Ученик · 9А')).toBeInTheDocument();
    expect(within(menu).getByText('Курсант · English A2')).toBeInTheDocument();
    expect(within(menu).getByText('Гимназия №1 · 3 предмета')).toBeInTheDocument();

    await user.click(within(menu).getByRole('menuitemradio', { name: /Курсант/ }));
    await waitFor(() => expect(switchCalled).toBe(true));
  });

  it('an account with no education yet gets a way forward, not a blank page', async () => {
    render([
      meMock(),
      profilesMock([]),
      pageMock(page({ profile: null, now: null, today: [], week: [] })),
    ]);
    expect(await screen.findByText('Здесь появится ваше обучение')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть каталог курсов' })).toBeInTheDocument();
  });

  it('a failed load offers a retry instead of an empty frame', async () => {
    render([
      meMock(),
      profilesMock(),
      { request: { query: StartPageDocument, variables: {} }, error: new Error('network down') },
    ]);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('chat is a labelled stub, not a dead button (the window itself is R2)', async () => {
    const user = userEvent.setup();
    render([meMock(), profilesMock(), pageMock(page())]);
    await screen.findByText('Привет, Аня');

    await user.click(screen.getByRole('button', { name: 'Открыть чат' }));
    const dialog = screen.getByRole('dialog', { name: 'Чат' });
    expect(within(dialog).getByText('Чат скоро откроется')).toBeInTheDocument();
  });

  it('progress is announced to assistive tech, not just drawn', async () => {
    render([
      meMock(),
      profilesMock(),
      pageMock(
        page({
          progress: [
            {
              __typename: 'StartProgress',
              courseId: 'c1',
              courseTitle: 'Астрономия',
              doneLessons: 12,
              totalLessons: 34,
              progressPct: 35,
            },
          ],
        }),
      ),
    ]);
    const bar = await screen.findByRole('progressbar', { name: 'Астрономия' });
    expect(bar).toHaveAttribute('aria-valuenow', '35');
    expect(screen.getByText('12/34 занятий')).toBeInTheDocument();
  });
});
