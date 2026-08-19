import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MyHomeworkDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { StudentHomeworkScreen } from './StudentHomeworkScreen';

/**
 * Экран пересобран с листа «Задания и конспект» (наряд 42) и переехал с `mySubmissions` на
 * `myHomework`: первый возвращает только СДАННОЕ, и колонку «Сдать» строить было не из чего.
 * Проверки те же по смыслу — оценка видна, отказ предлагает повтор, — плюс то, что принёс
 * лист: разделение «сдать / проверено» и безотметочный ученик.
 */
function hw(over: Record<string, unknown> = {}) {
  return {
    __typename: 'Homework',
    id: 'h1',
    title: 'Задача 1',
    description: 'решить и прислать фото',
    type: 'TEXT',
    dueAt: null,
    allowRedo: true,
    courseTitle: 'Математика 7',
    course: { __typename: 'Course', id: 'c1', title: 'Математика 7' },
    lesson: { __typename: 'Lesson', id: 'l1', title: 'Урок 1' },
    viewerSubmission: null,
    ...over,
  };
}

const graded = {
  __typename: 'Submission',
  id: 's1',
  status: 'GRADED',
  score: 5,
  markless: false,
  comment: 'Молодец, следи за оформлением',
  attempt: 1,
  submittedAt: '2026-06-10T10:00:00Z',
};

const ok = (items: unknown[]) => [
  { request: { query: MyHomeworkDocument, variables: {} }, result: { data: { myHomework: items } } },
];

describe('«Задания» ученика', () => {
  it('проверенная работа показывает оценку и слова преподавателя', async () => {
    renderWithProviders(<StudentHomeworkScreen />, {
      mocks: ok([hw({ viewerSubmission: graded })]),
      route: '/homework',
    });
    // Сданное лежит под «Проверено» — по умолчанию открыто «Сдать».
    await userEvent.click(await screen.findByRole('tab', { name: 'Проверено' }));

    // ⚠️ Ищем по областям, а не по всей странице: название работы стоит и в списке, и в
    // рельсе (там оно подписывает, к какой работе относятся слова преподавателя).
    const rail = screen.getByRole('complementary', { name: 'Ближайшее и отзывы' });
    expect(screen.getByRole('heading', { name: 'Задача 1' })).toBeInTheDocument();
    expect(screen.getByText('Оценка: 5')).toBeInTheDocument();
    expect(within(rail).getByText('Молодец, следи за оформлением')).toBeInTheDocument();
  });

  it('🔴 безотметочному ученику отметку не показывают — ФГОС НОО и ФЗ-273', async () => {
    renderWithProviders(<StudentHomeworkScreen />, {
      mocks: ok([hw({ viewerSubmission: { ...graded, markless: true } })]),
      route: '/homework',
    });
    await userEvent.click(await screen.findByRole('tab', { name: 'Проверено' }));

    expect(screen.getByRole('heading', { name: 'Задача 1' })).toBeInTheDocument();
    // Ни цифры, ни значка вместо неё: значок — та же отметка.
    expect(screen.queryByText(/Оценка/)).not.toBeInTheDocument();
    // А слова преподавателя остаются: они не отметка.
    const rail = screen.getByRole('complementary', { name: 'Ближайшее и отзывы' });
    expect(within(rail).getByText('Молодец, следи за оформлением')).toBeInTheDocument();
  });

  it('несданное и сданное разведены: «Сдать» не показывает уже сданного', async () => {
    renderWithProviders(<StudentHomeworkScreen />, {
      mocks: ok([
        hw({ id: 'h1', title: 'Ещё не сдал' }),
        hw({ id: 'h2', title: 'Уже сдал', viewerSubmission: graded }),
      ]),
      route: '/homework',
    });
    // Список и рельс — разные области: ближайшая работа стоит в обеих, и это не дубль.
    const list = await screen.findByRole('region', { name: 'Что задано' });
    expect(within(list).getByRole('heading', { name: 'Ещё не сдал' })).toBeInTheDocument();
    expect(within(list).queryByRole('heading', { name: 'Уже сдал' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Всё' }));
    expect(within(list).getByRole('heading', { name: 'Уже сдал' })).toBeInTheDocument();
  });

  it('отказ называет причину и предлагает повтор, а не пустую рамку (B-states-1)', async () => {
    renderWithProviders(<StudentHomeworkScreen />, {
      mocks: [{ request: { query: MyHomeworkDocument, variables: {} }, error: new Error('down') }],
      route: '/homework',
    });
    const alert = await screen.findByRole('alert');
    // ПРАВИЛА 6.4: «что-то пошло не так» запрещено — причина названа.
    expect(alert).toHaveTextContent('сервер не ответил');
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
    // И сказано, что уцелело: черновик работы на устройстве.
    expect(screen.getByText(/черновик работы сохраняется/)).toBeInTheDocument();
  });

  it('пусто объясняет словами и даёт одно действие (ПРАВИЛА 6.2)', async () => {
    renderWithProviders(<StudentHomeworkScreen />, { mocks: ok([]), route: '/homework' });

    expect(await screen.findByText('Пока ничего не задано')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть расписание' })).toBeInTheDocument();
  });
});

describe('срок словом', () => {
  /**
   * 🔴 СРОК СЧИТАЛСЯ СУТКАМИ, А НЕ КАЛЕНДАРНЫМИ ДНЯМИ, и работа, которую надо сдать ЗАВТРА,
   * подписывалась «до сегодня»: до неё оставалось 23 часа — ноль полных суток. Ученик читает
   * такую подпись и либо делает работу на день раньше, либо считает, что уже опоздал.
   */
  it('завтрашний срок называется завтрашним, даже если до него меньше суток', async () => {
    const at = new Date();
    at.setDate(at.getDate() + 1);
    at.setHours(9, 0, 0, 0);
    renderWithProviders(<StudentHomeworkScreen />, {
      mocks: ok([hw({ dueAt: at.toISOString() })]),
      route: '/homework',
    });
    const list = await screen.findByRole('region', { name: 'Что задано' });
    expect(within(list).getByText('до завтра')).toBeInTheDocument();
  });

  it('прошедший срок назван прошедшим, а не тихим «до вт»', async () => {
    const at = new Date();
    at.setDate(at.getDate() - 2);
    renderWithProviders(<StudentHomeworkScreen />, {
      mocks: ok([hw({ dueAt: at.toISOString() })]),
      route: '/homework',
    });
    const list = await screen.findByRole('region', { name: 'Что задано' });
    expect(within(list).getByText('срок прошёл')).toBeInTheDocument();
  });
});
