import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MySubmissionsDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { StudentHomeworkScreen } from './StudentHomeworkScreen';

const mocks = [
  {
    request: { query: MySubmissionsDocument, variables: {} },
    result: {
      data: {
        mySubmissions: [
          {
            __typename: 'Submission',
            id: 's1',
            status: 'GRADED',
            score: 92,
            comment: 'Молодец',
            attempt: 1,
            submittedAt: '2026-06-10T10:00:00Z',
            homework: { __typename: 'Homework', id: 'h1', title: 'Задача 1' },
          },
        ],
      },
    },
  },
];

describe('StudentHomeworkScreen', () => {
  it('lists a graded submission with its score', async () => {
    renderWithProviders(<StudentHomeworkScreen />, { mocks, route: '/homework' });

    expect(await screen.findByText('Задача 1')).toBeInTheDocument();
    expect(screen.getByText('Оценено')).toBeInTheDocument();
    expect(screen.getByText('Оценка: 92')).toBeInTheDocument();
  });

  it('shows a retryable error state (not the empty placeholder) when the query fails (B-states-1)', async () => {
    renderWithProviders(<StudentHomeworkScreen />, {
      mocks: [{ request: { query: MySubmissionsDocument, variables: {} }, error: new Error('down') }],
      route: '/homework',
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });
});
