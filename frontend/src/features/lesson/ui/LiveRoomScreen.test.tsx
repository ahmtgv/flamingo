import { type MockedResponse } from '@apollo/client/testing';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  AttentionUpdatesDocument,
  MeDocument,
  type Role,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LiveRoomScreen } from './LiveRoomScreen';

const meMock = (role: Role) => ({
  request: { query: MeDocument, variables: {} },
  result: {
    data: {
      me: {
        __typename: 'User',
        id: 'u1',
        email: 'u@example.com',
        firstName: 'Имя',
        lastName: 'Фамилия',
        role,
        locale: 'ru',
        studentProfile:
          role === 'STUDENT'
            ? { __typename: 'StudentProfile', ageBand: 'TEEN', gradeLevel: '7', points: 0 }
            : null,
        teacherProfile:
          role === 'TEACHER'
            ? { __typename: 'TeacherProfile', verificationStatus: 'VERIFIED', specialty: null }
            : null,
        parentProfile: null,
      },
    },
  },
});

function renderRoom(mocks: MockedResponse[]) {
  return renderWithProviders(
    <Routes>
      <Route path="/sessions/:sessionId/room" element={<LiveRoomScreen />} />
    </Routes>,
    { mocks, route: '/sessions/sess-1/room' },
  );
}

describe('LiveRoomScreen', () => {
  it('student view shows the on-device privacy guarantee and a camera control', async () => {
    renderRoom([meMock('STUDENT')]);

    // The privacy indicator is mandatory on the camera screen.
    expect(await screen.findByText(/видео не покидает устройство/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Включить камеру/ })).toBeInTheDocument();
  });

  it('teacher view renders a live class-attention metric from attentionUpdates (aggregate only)', async () => {
    const subMock = {
      request: { query: AttentionUpdatesDocument, variables: { sessionId: 'sess-1' } },
      result: {
        data: {
          attentionUpdates: {
            __typename: 'AttentionMetric',
            id: 'm1',
            sessionId: 'sess-1',
            studentId: 'student-123456',
            bucketStart: '2026-06-15T10:00:00Z',
            avgAttention: 80,
          },
        },
      },
    };
    renderRoom([meMock('TEACHER'), subMock]);

    expect(await screen.findByText('Внимание класса')).toBeInTheDocument();
    // The streamed aggregate surfaces as the class value + a per-student row.
    expect(await screen.findAllByText('80')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: /Отчёт/ })).toBeInTheDocument();
  });
});
