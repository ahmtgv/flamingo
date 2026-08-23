import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MeQuery } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ParentCabinet } from './ParentCabinet';

const me = {
  __typename: 'User',
  id: 'p1',
  email: 'maria@example.com',
  firstName: 'Мария',
  lastName: 'Петрова', displayName: 'Мария', formalName: 'Мария', shortName: 'Мария', fullName: `${'Петрова'} ${'Мария'}`,
  role: 'PARENT',
  locale: 'ru',
  studentProfile: null,
  teacherProfile: null,
  parentProfile: {
    __typename: 'ParentProfile',
    children: [
      {
        __typename: 'StudentProfile',
        markless: false, ageBand: 'TEEN',
        gradeLevel: '7',
        user: {
          __typename: 'User',
          id: 'c1',
          firstName: 'Пётр',
          lastName: 'Сидоров',
          displayName: 'Пётр', formalName: 'Пётр',
          shortName: 'Пётр С.',
        },
      },
    ],
  },
} as unknown as NonNullable<MeQuery['me']>;

describe('ParentCabinet', () => {
  it('lists existing children', () => {
    renderWithProviders(<ParentCabinet me={me} refetchMe={vi.fn().mockResolvedValue(undefined)} />);
    // Родитель видит своего ребёнка по имени — так его и зовут дома (§24).
    expect(screen.getByText('Пётр')).toBeInTheDocument();
  });

  /*
   * §59: кабинет родителя в этот заход не рисуется, и дверь «Добавить ребёнка» приглушена:
   * видна, названа, не нажимается, причина рядом. Проверка добавления ребёнка через форму
   * снята вместе с дверью — она описывала бы путь, которого сейчас нет.
   *
   * ⚠️ Сама проверка согласия на сервере при этом на месте (`apps/accounts`), и это
   * важно: приглушение — про экран, а не про правило.
   */
  it('дверь «Добавить ребёнка» видна, не нажимается и объясняет, почему', () => {
    renderWithProviders(<ParentCabinet me={me} refetchMe={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByText('Добавить ребёнка')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Добавить ребёнка' })).not.toBeInTheDocument();
    expect(screen.getByText(/Кабинет родителя ещё не оформлен/)).toBeInTheDocument();
  });
});
