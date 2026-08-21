import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CreateCourseDocument, MeDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { CreateCourseScreen } from './CreateCourseScreen';

const meOk = {
  request: { query: MeDocument },
  result: {
    data: {
      me: {
        __typename: 'User',
        id: 'u1',
        email: 't@example.com',
        firstName: 'Люция',
        lastName: 'В',
        displayName: 'Люция',
        formalName: 'Люция В',
        shortName: 'Люция',
        fullName: 'В Люция',
        role: 'TEACHER',
        locale: 'ru',
        avatarUrl: null,
        consentAttention: null,
        studentProfile: null,
        teacherProfile: null,
        parentProfile: null,
      },
    },
  },
};

describe('создание курса — лист «Создание курса и занятия»', () => {
  it('превью показывает то, что человек печатает, до всякого сохранения', async () => {
    renderWithProviders(<CreateCourseScreen />, { mocks: [meOk], route: '/courses/new' });

    const rail = await screen.findByRole('complementary', { name: 'что увидит ученик' });
    // Пока пусто — превью честно говорит «Новый курс», а не выдумывает название.
    expect(within(rail).getAllByText('Новый курс').length).toBeGreaterThan(0);

    await userEvent.type(screen.getByLabelText(/Название/), 'Химия · неорганика');
    expect(within(rail).getByText('Химия · неорганика')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'химия' }));
    expect(within(rail).getByText('химия')).toBeInTheDocument();
  });

  it('без названия и предмета курс не заводится, и сказано почему', async () => {
    const created = vi.fn();
    renderWithProviders(<CreateCourseScreen />, {
      mocks: [meOk, { request: { query: CreateCourseDocument }, result: created }],
      route: '/courses/new',
    });
    await screen.findByRole('complementary', { name: 'что увидит ученик' });

    await userEvent.click(screen.getByRole('button', { name: 'Сохранить черновиком' }));
    expect(created).not.toHaveBeenCalled();
    expect(screen.getByText('Укажите название')).toBeInTheDocument();
    expect(screen.getByText('Выберите предмет')).toBeInTheDocument();
  });

  it('🔴 частичный отказ: превью не пришло, а курс завести всё равно можно', async () => {
    renderWithProviders(<CreateCourseScreen />, {
      mocks: [{ request: { query: MeDocument }, error: new Error('down') }],
      route: '/courses/new',
    });

    // ПРАВИЛА 6.5: сломанное названо внутри своей области, карточки поверх кадра нет.
    expect(await screen.findByText('Превью не собралось — курс завести можно')).toBeInTheDocument();
    expect(screen.getByText(/работает: название/)).toBeInTheDocument();
    expect(screen.getByText(/не работает: только превью/)).toBeInTheDocument();
    // И форма на месте — это и есть разница между отказом и частичным отказом.
    expect(screen.getByLabelText(/Название/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Опубликовать курс' })).toBeInTheDocument();
  });
});
