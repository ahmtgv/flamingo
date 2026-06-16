import { type MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AttentionUpdatesDocument,
  MeDocument,
  type Role,
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
    RoomEvent: { ParticipantConnected: 'pc', ParticipantDisconnected: 'pd', TrackSubscribed: 'ts', TrackUnsubscribed: 'tu', TrackPublished: 'tp', TrackUnpublished: 'tup', LocalTrackPublished: 'ltp', LocalTrackUnpublished: 'ltu', ActiveSpeakersChanged: 'asc', Reconnecting: 'reconnecting', Reconnected: 'reconnected', ConnectionStateChanged: 'csc', Connected: 'connected', Disconnected: 'd' },
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
    renderRoom([meMock('TEACHER'), sessionRoomMock, subMock]);

    expect(await screen.findByText('Внимание класса')).toBeInTheDocument();
    expect(await screen.findAllByText('80')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: /Отчёт/ })).toBeInTheDocument();
  });
});
