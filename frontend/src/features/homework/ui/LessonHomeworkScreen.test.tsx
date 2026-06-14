import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { LessonHomeworkDocument, MeDocument } from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LessonHomeworkScreen } from './LessonHomeworkScreen';

const meMock = {
  request: { query: MeDocument, variables: {} },
  result: {
    data: {
      me: {
        __typename: 'User',
        id: 'u1',
        email: 's@example.com',
        firstName: 'Пётр',
        lastName: 'Сидоров',
        role: 'STUDENT',
        locale: 'ru',
        studentProfile: {
          __typename: 'StudentProfile',
          ageBand: 'TEEN',
          gradeLevel: '7',
          points: 0,
        },
        teacherProfile: null,
        parentProfile: null,
      },
    },
  },
};

const homeworkMock = {
  request: { query: LessonHomeworkDocument, variables: { lessonId: 'l1' } },
  result: {
    data: {
      lessonHomework: [
        {
          __typename: 'Homework',
          id: 'h1',
          title: 'Задача 1',
          description: 'Решите уравнение',
          type: 'TEXT',
          dueAt: null,
          allowRedo: false,
          publishedAt: '2026-06-01T00:00:00Z',
          submissionStats: {
            __typename: 'SubmissionStats',
            total: 0,
            submitted: 0,
            graded: 0,
            late: 0,
          },
          viewerSubmission: null,
        },
      ],
    },
  },
};

describe('LessonHomeworkScreen (student)', () => {
  it('shows a published homework with a submit affordance', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/lessons/:lessonId/homework" element={<LessonHomeworkScreen />} />
      </Routes>,
      { mocks: [meMock, homeworkMock], route: '/lessons/l1/homework' },
    );

    expect(await screen.findByText('Задача 1')).toBeInTheDocument();
    expect(screen.getByText('Не сдано')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сдать работу' })).toBeInTheDocument();
  });
});
