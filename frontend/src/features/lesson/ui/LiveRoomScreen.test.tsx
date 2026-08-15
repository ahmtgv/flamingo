import { type MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AttentionUpdatesDocument,
  MeDocument,
  type Role,
  SessionAttendeesDocument,
  SessionRoomDocument,
} from '@/entities/graphql/generated';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LiveRoomScreen } from './LiveRoomScreen';

// Mocks for the join path (LiveKit + the on-device CMF pipeline + camera).
const h = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  publishTrack: vi.fn(),
  startAttentionPipeline: vi.fn(() => ({ stop: vi.fn() })),
  getUserMedia: vi.fn(),
}));

vi.mock('@/shared/lib/env', () => ({
  GRAPHQL_HTTP_URL: '/graphql/',
  GRAPHQL_WS_URL: 'ws://localhost/graphql/',
  LIVEKIT_URL: 'wss://test.livekit',
}));
vi.mock('@/seedum/ubp', () => ({ loadUbp: () => Promise.resolve(null) }));
vi.mock('@/seedum', async (orig) => ({
  ...(await orig<typeof import('@/seedum')>()),
  startAttentionPipeline: h.startAttentionPipeline,
}));
vi.mock('livekit-client', () => {
  class Room {
    localParticipant = {
      publishTrack: h.publishTrack,
      getTrackPublication: () => undefined,
      isScreenShareEnabled: false,
      setScreenShareEnabled: vi.fn().mockResolvedValue(undefined),
    };
    remoteParticipants = new Map();
    on() {
      return this;
    }
    connect = h.connect;
    disconnect = h.disconnect;
  }
  return {
    Room,
    RoomEvent: { ParticipantConnected: 'pc', ParticipantDisconnected: 'pd', TrackSubscribed: 'ts', TrackUnsubscribed: 'tu', TrackPublished: 'tp', TrackUnpublished: 'tup', TrackMuted: 'tm', TrackUnmuted: 'tmu', LocalTrackPublished: 'ltp', LocalTrackUnpublished: 'ltu', ActiveSpeakersChanged: 'asc', Reconnecting: 'reconnecting', Reconnected: 'reconnected', ConnectionStateChanged: 'csc', Connected: 'connected', Disconnected: 'd' },
    ConnectionState: { Disconnected: 'disconnected', Connecting: 'connecting', Connected: 'connected', Reconnecting: 'reconnecting', SignalReconnecting: 'signalReconnecting' },
    DisconnectReason: { UNKNOWN_REASON: 0, CLIENT_INITIATED: 1, DUPLICATE_IDENTITY: 2, SERVER_SHUTDOWN: 3, PARTICIPANT_REMOVED: 4, ROOM_DELETED: 5, STATE_MISMATCH: 6, JOIN_FAILURE: 7, MIGRATION: 8, SIGNAL_CLOSE: 9, ROOM_CLOSED: 10, USER_UNAVAILABLE: 11, USER_REJECTED: 12, SIP_TRUNK_FAILURE: 13, CONNECTION_TIMEOUT: 14, MEDIA_FAILURE: 15, AGENT_ERROR: 16 },
    Track: { Source: { Camera: 'camera', Microphone: 'microphone', ScreenShare: 'screen' }, Kind: { Video: 'video', Audio: 'audio' } },
  };
});

const sessionRoomMock = {
  request: { query: SessionRoomDocument, variables: { id: 'sess-1' } },
  result: {
    data: {
      session: {
        __typename: 'LessonSession',
        id: 'sess-1',
        status: 'LIVE',
        roomToken: 'tok-1',
        teacherName: 'Тимур Учитель',
        lesson: { __typename: 'Lesson', id: 'l1', title: 'Урок' },
      },
    },
  },
};

const meMock = (role: Role) => ({
  request: { query: MeDocument, variables: {} },
  result: {
    data: {
      me: {
        __typename: 'User',
        id: 'u1',
        email: 'u@example.com',
        firstName: 'Имя',
        lastName: 'Фамилия', displayName: 'Имя', formalName: 'Имя', shortName: 'Имя', fullName: `${'Фамилия'} ${'Имя'}`,
        role,
        locale: 'ru',
        avatarUrl: null,
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

beforeEach(() => {
  h.connect.mockReset().mockResolvedValue(undefined);
  h.disconnect.mockReset().mockResolvedValue(undefined);
  h.publishTrack.mockReset().mockResolvedValue({});
  h.startAttentionPipeline.mockClear();
  h.getUserMedia.mockReset();
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: h.getUserMedia },
    configurable: true,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
    writable: true,
    value: null,
    configurable: true,
  });
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});

describe('LiveRoomScreen', () => {
  it('student view keeps the on-device CMF privacy claim and offers to join the call', async () => {
    renderRoom([meMock('STUDENT'), sessionRoomMock]);

    // CMF on-device indicator stays (scoped to attention analysis — still true).
    expect(await screen.findByText(/Анализ внимания идёт на вашем устройстве/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Войти в эфир/ })).toBeInTheDocument();
  });

  it('one getUserMedia feeds BOTH the LiveKit publish and the on-device CMF pipeline', async () => {
    const video = { kind: 'video', enabled: true, stop: vi.fn() };
    const audio = { kind: 'audio', enabled: true, stop: vi.fn() };
    const stream = {
      getVideoTracks: () => [video],
      getAudioTracks: () => [audio],
      getTracks: () => [video, audio],
    };
    h.getUserMedia.mockResolvedValue(stream);

    renderRoom([meMock('STUDENT'), sessionRoomMock]);
    fireEvent.click(await screen.findByRole('button', { name: /Войти в эфир/ }));

    // Exactly one camera acquisition, with audio for the call.
    await waitFor(() => expect(h.getUserMedia).toHaveBeenCalledTimes(1));
    expect(h.getUserMedia).toHaveBeenCalledWith({ video: true, audio: true });
    // Consumer A: LiveKit publishes the shared tracks.
    await waitFor(() => expect(h.publishTrack).toHaveBeenCalled());
    // Consumer B: the on-device CMF pipeline runs off the same stream.
    await waitFor(() => expect(h.startAttentionPipeline).toHaveBeenCalledTimes(1));
    // The call surface is honest that the camera is published.
    expect(await screen.findByText(/Камера в эфире/)).toBeInTheDocument();
  });

  it('classifies a camera/device failure into an actionable message + Retry that recovers', async () => {
    // First attempt fails with a device-busy error → classified "in use" + Retry (role=alert).
    h.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('busy'), { name: 'NotReadableError' }));
    renderRoom([meMock('STUDENT'), sessionRoomMock]);
    fireEvent.click(await screen.findByRole('button', { name: /Войти в эфир/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/занята/i); // "Камера занята другим приложением…"

    // Retry re-acquires; this time getUserMedia succeeds → we're in the call.
    const stream = {
      getVideoTracks: () => [{ kind: 'video', enabled: true, stop: vi.fn() }],
      getAudioTracks: () => [{ kind: 'audio', enabled: true, stop: vi.fn() }],
      getTracks: () => [{ stop: vi.fn() }],
    };
    h.getUserMedia.mockResolvedValueOnce(stream);
    fireEvent.click(screen.getByRole('button', { name: /Повторить/ }));
    expect(await screen.findByText(/Камера в эфире/)).toBeInTheDocument();
  });

  it('teacher view (v3): attentionUpdates feeds the class average + report; orb field retired', async () => {
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
            gazeOnScreen: 88,
            eyeOpenness: 95,
            headYaw: -6,
            headPitch: 3,
            alertness: 82,
          },
        },
      },
    };
    // Teacher-only roster → resolves studentId 'student-123456' to a real name.
    const attendeesMock = {
      request: { query: SessionAttendeesDocument, variables: { id: 'sess-1' } },
      result: {
        data: {
          session: {
            __typename: 'LessonSession',
            id: 'sess-1',
            attendance: [
              {
                __typename: 'Attendance',
                student: {
                  __typename: 'StudentProfile',
                  user: {
                    __typename: 'User',
                    id: 'student-123456',
                    firstName: 'Иван',
                    lastName: 'Петров', displayName: 'Иван', formalName: 'Иван', shortName: 'Иван', fullName: `${'Петров'} ${'Иван'}`,
                  },
                },
              },
            ],
          },
        },
      },
    };
    renderRoom([meMock('TEACHER'), sessionRoomMock, subMock, attendeesMock]);

    // Owner v3 (f9eff3d): the orb field is retired from the live view. Per-student
    // attention now lives on the video-tile chips (join-time; covered by
    // VideoRoom.focus.test.tsx). Pre-join, the subscription still feeds the class
    // average line, and the report stays on demand.
    expect(await screen.findByText('Среднее по классу: 80')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Отчёт/ })).toBeInTheDocument();
    // Orb-field surfaces must be gone from the live view.
    expect(screen.queryByText('нужно внимание')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Скрыть имена/ })).not.toBeInTheDocument();
  });
});
