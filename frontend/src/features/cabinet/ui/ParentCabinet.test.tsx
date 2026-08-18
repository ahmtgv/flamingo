import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('gates adding a child on 152-FZ consent', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ParentCabinet me={me} refetchMe={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByRole('button', { name: 'Добавить ребёнка' }));
    await user.type(screen.getByLabelText(/Имя ребёнка/), 'Соня');
    await user.type(screen.getByLabelText(/Фамилия/), 'Петрова');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(
      await screen.findByText('Нужно согласие на обработку данных ребёнка'),
    ).toBeInTheDocument();
  });
});
