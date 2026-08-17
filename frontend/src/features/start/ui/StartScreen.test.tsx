import { type MockedResponse } from '@apollo/client/testing';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  ChatPolicyDocument,
  ChatUnreadDocument,
  LearningProfilesDocument,
  MyChannelsDocument,
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
        lastName: 'Коваль', displayName: 'Аня', formalName: 'Аня', shortName: 'Аня', fullName: `${'Коваль'} ${'Аня'}`,
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
      teaching: [],
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
      pageMock(
        page({
          profile: teacherProfile,
          attention: [queue],
          now: null,
          today: [],
          teaching: [
            {
              __typename: 'StartCourse',
              courseId: 'c-alg',
              title: 'Алгебра',
              subject: 'Математика',
              sectionCount: 3,
              lessonCount: 20,
              publishedLessons: 14,
              studentCount: 8,
              isDraft: false,
              nextAt: null,
              nextLessonTitle: null,
            },
            {
              __typename: 'StartCourse',
              courseId: 'c-geo',
              title: 'Геометрия',
              subject: 'Математика',
              sectionCount: 1,
              lessonCount: 0,
              publishedLessons: 0,
              studentCount: 0,
              isDraft: true,
              nextAt: null,
              nextLessonTitle: null,
            },
          ],
        }),
      ),
    ]);

    // 🔴 Решение владельца 14.08 (лист D1): «приветствие на стартовой уменьшено и оставлено
    // ИМЕНЕМ БЕЗ "Здравствуйте"» — рабочая площадь важнее подписей. Правка сделана 17.08,
    // до неё стартовая противоречила листу, а тест держал это противоречие зелёным.
    expect(await screen.findByText('Аня')).toBeInTheDocument();
    expect(screen.queryByText(/Здравствуйте/)).not.toBeInTheDocument();
    expect(screen.getByText('11 работ на проверке')).toBeInTheDocument();
    expect(screen.getByText('старшей 2 дня')).toBeInTheDocument();
    // "Продолжить" belongs to a learner, not to a teaching context.
    expect(screen.queryByRole('region', { name: 'Продолжить' })).not.toBeInTheDocument();

    // 🔴 Находка владельца 15.08, п.2: у преподавателя слот прогресса стоял пустым, и «что я
    // веду» не отвечалось нигде. Теперь в нём его курсы — ВСЕ, а не тот один, что открыт.
    const mine = screen.getByRole('region', { name: 'Мои курсы' });
    expect(screen.queryByRole('region', { name: 'Прогресс' })).not.toBeInTheDocument();
    expect(within(mine).getByText('Алгебра')).toBeInTheDocument();
    expect(within(mine).getByText('Геометрия')).toBeInTheDocument();
    // Состояние курса читается со строки, без открытия: сколько уроков и сколько готово.
    expect(within(mine).getByText(/20 уроков/)).toBeInTheDocument();
    expect(within(mine).getByText('опубликовано 14 из 20')).toBeInTheDocument();
    expect(within(mine).getByText('черновик')).toBeInTheDocument();
    // Занятие не назначено — так и сказано, а не пусто.
    expect(within(mine).getAllByText('занятия не назначены')).toHaveLength(2);
  });

  it('cadet: no timetable, and the week says so instead of inventing repetitions', async () => {
    const activeCadet = { ...CADET, isActive: true };
    render([
      meMock(),
      profilesMock([{ ...PUPIL, isActive: false }, activeCadet]),
      pageMock(page({ profile: activeCadet, now: null, today: [], week: week() })),
    ]);

    expect(
      await screen.findByText('Расписания нет — занимайтесь когда удобно'),
    ).toBeInTheDocument();
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

  it('chat opens as a window over the page — the header button and the bubble share it', async () => {
    // R2 replaced the R0.4 stub: the chat is real now, and it is still a window, not a screen.
    const user = userEvent.setup();
    render([
      meMock(),
      profilesMock(),
      pageMock(page()),
      {
        request: { query: ChatUnreadDocument, variables: {} },
        result: { data: { chatUnread: 3 } },
      },
      {
        request: { query: MyChannelsDocument, variables: {} },
        result: { data: { myChannels: [] } },
      },
      {
        request: { query: ChatPolicyDocument, variables: {} },
        result: {
          data: {
            chatPolicy: {
              __typename: 'ChatPolicyView',
              peerChat: true,
              directMessages: true,
              teacherVisibleAlways: false,
              premoderation: false,
            },
          },
        },
      },
    ]);
    await screen.findByText('Привет, Аня');

    // The count reaches the header, per the sheet. (The bubble carries it too, hence exact.)
    const header = screen.getByRole('button', { name: 'Чат 3' });
    expect(within(header).getByText('3')).toBeInTheDocument();

    await user.click(header);
    expect(screen.getByRole('region', { name: 'Сообщения' })).toBeInTheDocument();
    // Still a window: the page underneath is not replaced.
    expect(screen.getByText('Привет, Аня')).toBeInTheDocument();
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

  it('a progress row is the way into the subject cabinet (atlas sheet 01)', async () => {
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

    expect(await screen.findByRole('button', { name: /Астрономия/ })).toBeInTheDocument();
  });
});
