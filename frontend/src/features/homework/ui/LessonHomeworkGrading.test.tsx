import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  GradeSubmissionDocument,
  HomeworkSubmissionsDocument,
  LessonHomeworkDocument,
  MeDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LessonHomeworkScreen } from './LessonHomeworkScreen';

const teacherMe = {
  request: { query: MeDocument, variables: {} },
  result: {
    data: {
      me: {
        __typename: 'User',
        id: 't1',
        email: 't@example.com',
        firstName: 'Тимур',
        lastName: 'Учитель',
        role: 'TEACHER',
        locale: 'ru',
        studentProfile: null,
        teacherProfile: {
          __typename: 'TeacherProfile',
          verificationStatus: 'VERIFIED',
          specialty: 'Математика',
        },
        parentProfile: null,
      },
    },
  },
};

const homeworkRow = {
  __typename: 'Homework',
  id: 'h1',
  title: 'Задача 1',
  description: '',
  type: 'TEXT',
  dueAt: null,
  allowRedo: false,
  publishedAt: '2026-06-01T00:00:00Z',
  submissionStats: { __typename: 'SubmissionStats', total: 1, submitted: 1, graded: 0, late: 0 },
  viewerSubmission: null,
};
const lessonHomeworkMock = () => ({
  request: { query: LessonHomeworkDocument, variables: { lessonId: 'l1' } },
  result: { data: { lessonHomework: [homeworkRow] } },
});

const submission = (status: string, score: number | null) => ({
  __typename: 'Submission',
  id: 'sub1',
  attempt: 1,
  status,
  score,
  comment: '',
  contentText: 'мой ответ',
  submittedAt: '2026-06-10T10:00:00Z',
  student: {
    __typename: 'StudentProfile',
    user: { __typename: 'User', id: 'st1', firstName: 'Стёпа', lastName: 'Ученик' },
  },
});
const homeworkSubmissionsMock = (status: string, score: number | null) => ({
  request: { query: HomeworkSubmissionsDocument, variables: { homeworkId: 'h1' } },
  result: { data: { homeworkSubmissions: [submission(status, score)] } },
});

describe('LessonHomeworkScreen (teacher grading)', () => {
  it('grades a submission', async () => {
    const user = userEvent.setup();
    let graded = false;
    const gradeMock = {
      request: {
        query: GradeSubmissionDocument,
        variables: { input: { submissionId: 'sub1', score: 90, comment: '' } },
      },
      result: () => {
        graded = true;
        return {
          data: {
            gradeSubmission: {
              __typename: 'Submission',
              id: 'sub1',
              status: 'GRADED',
              score: 90,
              comment: '',
            },
          },
        };
      },
    };

    renderWithProviders(
      <Routes>
        <Route path="/lessons/:lessonId/homework" element={<LessonHomeworkScreen />} />
      </Routes>,
      {
        mocks: [
          teacherMe,
          lessonHomeworkMock(), // initial
          homeworkSubmissionsMock('SUBMITTED', null), // initial grading list
          gradeMock,
          homeworkSubmissionsMock('GRADED', 90), // refetch after grade
          lessonHomeworkMock(), // parent refetch after grade
        ],
        route: '/lessons/l1/homework',
      },
    );

    // Teacher sees the homework, opens the grading panel.
    expect(await screen.findByText('Задача 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Проверить' }));

    // The student's submission shows up in the grading list.
    expect(await screen.findByText('Стёпа Ученик')).toBeInTheDocument();

    // Enter a score and grade it.
    await user.type(screen.getByLabelText('Оценка'), '90');
    await user.click(screen.getByRole('button', { name: 'Оценить' }));

    // The gradeSubmission mutation fired with the right input, and the row updates.
    await waitFor(() => expect(graded).toBe(true));
    expect(await screen.findByText('Оценено')).toBeInTheDocument();
  });
});
