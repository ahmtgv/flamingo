import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  type MeQuery,
  type TeacherDashboardQuery,
  TeacherDashboardDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { TeacherCabinet } from './TeacherCabinet';

const teacherMe = {
  __typename: 'User',
  id: 'u-maria',
  email: 'maria@gymnasium1.ru',
  firstName: 'Мария',
  lastName: 'Петровна', displayName: 'Мария', formalName: 'Мария', shortName: 'Мария', fullName: `${'Петровна'} ${'Мария'}`,
  role: 'TEACHER',
  locale: 'ru',
  avatarUrl: null,
  studentProfile: null,
  teacherProfile: { __typename: 'TeacherProfile', verificationStatus: 'APPROVED', specialty: 'Математика' },
  parentProfile: null,
} as unknown as NonNullable<MeQuery['me']>;

const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();
const HOUR = 3_600_000;
const DAY = 86_400_000;

function dashboard(over: Partial<TeacherDashboardQuery['teacherDashboard']>): TeacherDashboardQuery {
  return {
    __typename: 'Query',
    teacherDashboard: {
      __typename: 'TeacherDashboard',
      studentCount: 23,
      newStudentsThisWeek: 2,
      courses: [
        { __typename: 'Course', id: 'c-1', title: 'Алгебра: от уравнений к функциям', status: 'PUBLISHED', lessonCount: 36, enrollmentCount: 18 },
        { __typename: 'Course', id: 'c-2', title: 'Геометрия: планиметрия с нуля', status: 'DRAFT', lessonCount: 4, enrollmentCount: 0 },
      ],
      upcomingSessions: [
        { __typename: 'LessonSession', id: 's-now', startAt: iso(-2 * 60_000), endAt: iso(40 * 60_000), status: 'SCHEDULED', lesson: { __typename: 'Lesson', id: 'les-1', title: 'Алгебра — линейные уравнения' } },
        { __typename: 'LessonSession', id: 's-later', startAt: iso(150 * 60_000), endAt: null, status: 'SCHEDULED', lesson: { __typename: 'Lesson', id: 'les-2', title: 'Алгебра — системы уравнений' } },
      ],
      pendingSubmissions: [
        { __typename: 'Submission', id: 'p-1', submittedAt: iso(-2 * DAY - 3 * HOUR), status: 'LATE', student: { __typename: 'StudentProfile', user: { __typename: 'User', id: 'u-t', firstName: 'Тимур', lastName: 'И.', displayName: 'Тимур', formalName: 'Тимур И.', shortName: 'Тимур И.' } }, homework: { __typename: 'Homework', id: 'h-1', title: 'Задачи 12–18', lesson: { __typename: 'Lesson', id: 'les-1', title: 'Линейные уравнения' } } },
        { __typename: 'Submission', id: 'p-2', submittedAt: iso(-4 * HOUR), status: 'SUBMITTED', student: { __typename: 'StudentProfile', user: { __typename: 'User', id: 'u-v', firstName: 'Вера', lastName: 'С.', displayName: 'Вера', formalName: 'Вера С.', shortName: 'Вера С.' } }, homework: { __typename: 'Homework', id: 'h-2', title: 'Графики', lesson: { __typename: 'Lesson', id: 'les-2', title: 'Функции' } } },
      ],
      ...over,
    },
  };
}

function mock(data: TeacherDashboardQuery) {
  return [{ request: { query: TeacherDashboardDocument }, result: { data } }];
}

describe('TeacherCabinet — atlas 03', () => {
  it('calm day: three metrics, a startable session, a countdown, and course cards', async () => {
    renderWithProviders(<TeacherCabinet me={teacherMe} />, { mocks: mock(dashboard({})), route: '/app' });

    // three metric captions
    expect(await screen.findByText('занятия сегодня')).toBeInTheDocument();
    expect(screen.getByText('домашних ждут проверки')).toBeInTheDocument();
    expect(screen.getByText('учеников на курсах')).toBeInTheDocument();
    // oldest-pending note (2 days) + students-this-week note
    expect(screen.getByText('старшей — 2 дня')).toBeInTheDocument();
    expect(screen.getByText('+2 за неделю')).toBeInTheDocument();
    // ungraded homework is the clickable task-metric (calm-day coral accent)
    expect(screen.getByRole('button', { name: /домашних ждут проверки/ })).toBeInTheDocument();
    // nearest session (started) is startable; the later one shows a countdown
    expect(screen.getByRole('button', { name: 'Начать занятие' })).toBeInTheDocument();
    expect(screen.getByText(/через/)).toBeInTheDocument();
    // course cards
    expect(screen.getByText('Алгебра: от уравнений к функциям')).toBeInTheDocument();
    expect(screen.getByText('не опубликован')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Новый курс/ })).toBeInTheDocument();
  });

  it('live session intercepts the accent: shows "Вернуться в эфир"', async () => {
    const data = dashboard({
      upcomingSessions: [
        { __typename: 'LessonSession', id: 's-live', startAt: iso(-20 * 60_000), endAt: iso(25 * 60_000), status: 'LIVE', lesson: { __typename: 'Lesson', id: 'les-1', title: 'Алгебра — линейные уравнения' } },
      ],
    });
    renderWithProviders(<TeacherCabinet me={teacherMe} />, { mocks: mock(data), route: '/app' });
    expect(await screen.findByRole('button', { name: /Вернуться в эфир/ })).toBeInTheDocument();
    expect(screen.getByText('идёт сейчас')).toBeInTheDocument();
  });

  it('new teacher (no courses): shows the create-your-first-course empty state', async () => {
    const data = dashboard({ courses: [], upcomingSessions: [], pendingSubmissions: [], studentCount: 0, newStudentsThisWeek: 0 });
    renderWithProviders(<TeacherCabinet me={teacherMe} />, { mocks: mock(data), route: '/app' });
    expect(await screen.findByText('Здесь появится ваш первый курс')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать курс' })).toBeInTheDocument();
  });

  it('all graded: the homework metric is a plain (non-clickable) number', async () => {
    const data = dashboard({ pendingSubmissions: [] });
    renderWithProviders(<TeacherCabinet me={teacherMe} />, { mocks: mock(data), route: '/app' });
    expect(await screen.findByText('всё проверено')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /домашних ждут проверки/ })).not.toBeInTheDocument();
  });

  it('network error (no data): shows a retryable error, not a broken dashboard', async () => {
    renderWithProviders(<TeacherCabinet me={teacherMe} />, {
      mocks: [{ request: { query: TeacherDashboardDocument }, error: new Error('network down') }],
      route: '/app',
    });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Не получилось загрузить кабинет. Проверьте подключение.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });
});
