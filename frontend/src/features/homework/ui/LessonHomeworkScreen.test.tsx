import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LessonHomeworkDocument,
  MeDocument,
  RequestUploadDocument,
  SubmitHomeworkDocument,
} from '@/entities/graphql/generated';
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
        lastName: 'Сидоров', displayName: 'Пётр', formalName: 'Пётр', shortName: 'Пётр', fullName: `${'Сидоров'} ${'Пётр'}`,
        role: 'STUDENT',
        locale: 'ru',
        avatarUrl: null,
        studentProfile: {
          __typename: 'StudentProfile',
          markless: false, ageBand: 'TEEN',
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

  it('submits a typed answer', async () => {
    const user = userEvent.setup();
    let submitted = false;
    const submitMock = {
      request: {
        query: SubmitHomeworkDocument,
        variables: { input: { homeworkId: 'h1', contentText: 'ответ', fileKeys: [] } },
      },
      result: () => {
        submitted = true;
        return {
          data: {
            submitHomework: { __typename: 'Submission', id: 'sub1', status: 'SUBMITTED', attempt: 1 },
          },
        };
      },
    };

    renderWithProviders(
      <Routes>
        <Route path="/lessons/:lessonId/homework" element={<LessonHomeworkScreen />} />
      </Routes>,
      // homeworkMock twice: initial load + refetch after submit.
      { mocks: [meMock, homeworkMock, submitMock, homeworkMock], route: '/lessons/l1/homework' },
    );

    await screen.findByText('Задача 1');
    await user.type(screen.getByLabelText(/Ваш ответ/), 'ответ');
    await user.click(screen.getByRole('button', { name: 'Сдать работу' }));

    await waitFor(() => expect(submitted).toBe(true));
  });

  it('uploads an attached file (presigned PUT) and submits its fileKey — no bytes via GraphQL', async () => {
    const user = userEvent.setup();
    const fileKey = 'submission/u1/abc/hw.pdf';
    // Bytes go straight to S3 via the presigned PUT — stub fetch, never GraphQL.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const requestUploadMock = {
      request: {
        query: RequestUploadDocument,
        variables: {
          input: { filename: 'hw.pdf', contentType: 'application/pdf', purpose: 'SUBMISSION' },
        },
      },
      result: {
        data: {
          requestUpload: {
            __typename: 'UploadTicket',
            uploadUrl: 'https://s3.example/put?sig=abc',
            fileKey,
            expiresAt: '2026-06-17T00:00:00Z',
          },
        },
      },
    };
    let submittedKeys: string[] | null = null;
    const submitMock = {
      request: {
        query: SubmitHomeworkDocument,
        variables: { input: { homeworkId: 'h1', contentText: '', fileKeys: [fileKey] } },
      },
      result: () => {
        submittedKeys = [fileKey];
        return {
          data: {
            submitHomework: { __typename: 'Submission', id: 'sub2', status: 'SUBMITTED', attempt: 1 },
          },
        };
      },
    };

    const { container } = renderWithProviders(
      <Routes>
        <Route path="/lessons/:lessonId/homework" element={<LessonHomeworkScreen />} />
      </Routes>,
      {
        mocks: [meMock, homeworkMock, requestUploadMock, submitMock, homeworkMock],
        route: '/lessons/l1/homework',
      },
    );

    await screen.findByText('Задача 1');
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, new File(['hi'], 'hw.pdf', { type: 'application/pdf' }));
    expect(screen.getByText('hw.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Сдать работу' }));

    // requestUpload → direct PUT to the presigned URL → submitHomework with the returned key.
    await waitFor(() => expect(submittedKeys).toEqual([fileKey]));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.example/put?sig=abc',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
