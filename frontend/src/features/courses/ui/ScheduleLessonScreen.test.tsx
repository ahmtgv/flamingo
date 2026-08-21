import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CourseAudienceDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ScheduleLessonScreen } from './ScheduleLessonScreen';

const audience = (members: unknown[]) => [
  {
    request: { query: CourseAudienceDocument, variables: { courseId: 'c1' } },
    result: { data: { courseAudience: members } },
  },
];

const member = (name: string, timezone: string | null) => ({
  __typename: 'AudienceMember',
  studentId: name,
  name,
  timezone,
});

const route = '/courses/c1/lessons/l1/schedule';
const path = '/courses/:courseId/lessons/:lessonId/schedule';

describe('создание занятия — лист «Создание курса и занятия»', () => {
  it('🔴 показывает время КАЖДОГО ученика в его поясе', async () => {
    renderWithProviders(<ScheduleLessonScreen />, {
      mocks: audience([member('Ли', 'Asia/Shanghai'), member('Даша', 'Europe/Kaliningrad')]),
      route,
      path,
    });

    const rail = await screen.findByRole('complementary', { name: 'кого это касается' });
    // 11:30 по умолчанию в поясе прогона; важна не цифра, а то, что у двоих она РАЗНАЯ.
    const times = within(rail)
      .getAllByText(/^\d{2}:\d{2}$/)
      .map((n) => n.textContent);
    expect(new Set(times).size).toBe(2);
  });

  it('пояс не назван — говорим это словами, а не подставляем свой', async () => {
    renderWithProviders(<ScheduleLessonScreen />, {
      mocks: audience([member('Соня', null)]),
      route,
      path,
    });
    const rail = await screen.findByRole('complementary', { name: 'кого это касается' });
    expect(within(rail).getByText('пояс не указан')).toBeInTheDocument();
  });

  it('🔴 занятие в прошлое не ставится, и сказано почему', async () => {
    renderWithProviders(<ScheduleLessonScreen />, {
      mocks: audience([member('Аня', 'Europe/Moscow')]),
      route,
      path,
    });
    await screen.findByRole('complementary', { name: 'кого это касается' });

    // Ставим время, которое заведомо прошло сегодня.
    const time = screen.getByLabelText('Во сколько начинаем');
    await userEvent.clear(time);
    await userEvent.type(time, '00:01');

    expect(screen.getByRole('button', { name: 'Поставить в расписание' })).toBeDisabled();
    expect(screen.getByText(/занятие в прошлое не ставится/)).toBeInTheDocument();
  });

  it('честно сказано, что письма и пуша нет — предупреждает преподаватель', async () => {
    renderWithProviders(<ScheduleLessonScreen />, {
      mocks: audience([member('Аня', 'Europe/Moscow')]),
      route,
      path,
    });
    await screen.findByRole('complementary', { name: 'кого это касается' });
    expect(screen.getByText(/письма и пуша у нас пока нет/)).toBeInTheDocument();
  });

  it('🔴 частичный отказ: список не пришёл, а занятие поставить можно', async () => {
    renderWithProviders(<ScheduleLessonScreen />, {
      mocks: [
        {
          request: { query: CourseAudienceDocument, variables: { courseId: 'c1' } },
          error: new Error('down'),
        },
      ],
      route,
      path,
    });

    expect(await screen.findByText('Не видно, кого это касается')).toBeInTheDocument();
    expect(screen.getByText(/работает: день · время/)).toBeInTheDocument();
    // Форма на месте — это и есть разница между отказом и частичным отказом.
    expect(screen.getByLabelText('Во сколько начинаем')).toBeInTheDocument();
  });
});
