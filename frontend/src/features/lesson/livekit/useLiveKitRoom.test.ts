import { act, renderHook, waitFor } from '@testing-library/react';
import { DisconnectReason } from 'livekit-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { classifyDisconnect, useLiveKitRoom } from './useLiveKitRoom';

const lk = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  publishTrack: vi.fn(),
  setScreenShareEnabled: vi.fn(),
  remoteCount: 0, // drives remoteParticipants.size for the ≤5 guard test
  // Captured RoomEvent handlers (keyed by the mock's event string) so tests can fire
  // connection-lifecycle events: reconnecting / reconnected / disconnected.
  handlers: {} as Record<string, (arg?: unknown) => void>,
}));

vi.mock('livekit-client', () => {
  class Room {
    localParticipant = {
      publishTrack: lk.publishTrack,
      getTrackPublication: () => undefined,
      isScreenShareEnabled: false,
      setScreenShareEnabled: lk.setScreenShareEnabled,
    };
    get remoteParticipants() {
      const m = new Map();
      for (let i = 0; i < lk.remoteCount; i += 1)
        m.set(`p${i}`, { sid: `p${i}`, identity: `p${i}`, getTrackPublication: () => undefined });
      return m;
    }
    on(event: string, handler: (arg?: unknown) => void) {
      lk.handlers[event] = handler; // capture so tests can fire lifecycle events
      return this; // chainable
    }
    connect = lk.connect;
    disconnect = lk.disconnect;
  }
  return {
    Room,
    RoomEvent: {
      ParticipantConnected: 'pc',
      ParticipantDisconnected: 'pd',
      TrackSubscribed: 'ts',
      TrackUnsubscribed: 'tu',
      TrackPublished: 'tp',
      TrackUnpublished: 'tup',
      LocalTrackPublished: 'ltp',
      LocalTrackUnpublished: 'ltu',
      ActiveSpeakersChanged: 'asc',
      Reconnecting: 'reconnecting',
      Reconnected: 'reconnected',
      ConnectionStateChanged: 'csc',
      Connected: 'connected',
      Disconnected: 'd',
    },
    ConnectionState: {
      Disconnected: 'disconnected',
      Connecting: 'connecting',
      Connected: 'connected',
      Reconnecting: 'reconnecting',
      SignalReconnecting: 'signalReconnecting',
    },
    // Numeric enum (0–16) mirroring @livekit/protocol's DisconnectReason.
    DisconnectReason: {
      UNKNOWN_REASON: 0,
      CLIENT_INITIATED: 1,
      DUPLICATE_IDENTITY: 2,
      SERVER_SHUTDOWN: 3,
      PARTICIPANT_REMOVED: 4,
      ROOM_DELETED: 5,
      STATE_MISMATCH: 6,
      JOIN_FAILURE: 7,
      MIGRATION: 8,
      SIGNAL_CLOSE: 9,
      ROOM_CLOSED: 10,
      USER_UNAVAILABLE: 11,
      USER_REJECTED: 12,
      SIP_TRUNK_FAILURE: 13,
      CONNECTION_TIMEOUT: 14,
      MEDIA_FAILURE: 15,
      AGENT_ERROR: 16,
    },
    Track: {
      Source: { Camera: 'camera', Microphone: 'microphone', ScreenShare: 'screen' },
      Kind: { Video: 'video', Audio: 'audio' },
    },
  };
});

function fakeStream() {
  const video = { kind: 'video', enabled: true, stop: vi.fn() };
  const audio = { kind: 'audio', enabled: true, stop: vi.fn() };
  const stream = {
    getVideoTracks: () => [video],
    getAudioTracks: () => [audio],
    getTracks: () => [video, audio],
  } as unknown as MediaStream;
  return { stream, video, audio };
}

describe('useLiveKitRoom', () => {
  beforeEach(() => {
    lk.connect.mockReset().mockResolvedValue(undefined);
    lk.disconnect.mockReset().mockResolvedValue(undefined);
    lk.publishTrack.mockReset().mockResolvedValue({});
    lk.setScreenShareEnabled.mockReset().mockResolvedValue(undefined);
    lk.remoteCount = 0;
    lk.handlers = {};
  });

  it('connects with the room token and publishes the SHARED stream tracks (call + CMF feed)', async () => {
    const { stream, video, audio } = fakeStream();
    renderHook(() => useLiveKitRoom({ url: 'wss://x', token: 'tok-1', stream, active: true }));

    await waitFor(() => expect(lk.connect).toHaveBeenCalledWith('wss://x', 'tok-1'));
    await waitFor(() => expect(lk.publishTrack).toHaveBeenCalledTimes(2));
    expect(lk.publishTrack).toHaveBeenCalledWith(video, { source: 'camera' });
    expect(lk.publishTrack).toHaveBeenCalledWith(audio, { source: 'microphone' });
  });

  it('does not connect until active, and toggles flip the shared track enabled flag', async () => {
    const { stream, video, audio } = fakeStream();
    const { result, rerender } = renderHook(
      ({ active }) => useLiveKitRoom({ url: 'wss://x', token: 'tok-1', stream, active }),
      { initialProps: { active: false } },
    );
    expect(lk.connect).not.toHaveBeenCalled();

    rerender({ active: true });
    await waitFor(() => expect(lk.connect).toHaveBeenCalled());

    act(() => result.current.toggleCamera());
    expect(video.enabled).toBe(false); // pauses LiveKit publish AND the on-device CMF feed
    act(() => result.current.toggleMic());
    expect(audio.enabled).toBe(false);
  });

  it('screen share is additive — toggling calls setScreenShareEnabled (camera untouched)', async () => {
    const { stream, video } = fakeStream();
    const { result } = renderHook(() =>
      useLiveKitRoom({ url: 'wss://x', token: 'tok-1', stream, active: true }),
    );
    await waitFor(() => expect(lk.connect).toHaveBeenCalled());

    act(() => result.current.toggleScreenShare());
    expect(lk.setScreenShareEnabled).toHaveBeenCalledWith(true);
    expect(video.enabled).toBe(true); // camera (and the CMF feed) keeps running
  });

  it('≤5 soft guard: blocks the 6th joiner — no publish, roomFull set', async () => {
    lk.remoteCount = 5; // 5 already present → this client would be the 6th
    const { stream } = fakeStream();
    const { result } = renderHook(() =>
      useLiveKitRoom({ url: 'wss://x', token: 'tok-1', stream, active: true }),
    );
    await waitFor(() => expect(result.current.roomFull).toBe(true));
    expect(lk.publishTrack).not.toHaveBeenCalled();
  });

  it('surfaces reconnecting, then classifies a fault as failed', async () => {
    const { stream } = fakeStream();
    const { result } = renderHook(() =>
      useLiveKitRoom({ url: 'wss://x', token: 'tok-1', stream, active: true }),
    );
    await waitFor(() => expect(result.current.connectionState).toBe('connected'));

    act(() => lk.handlers['reconnecting']?.());
    expect(result.current.connectionState).toBe('reconnecting');

    act(() => lk.handlers['d']?.(DisconnectReason.SERVER_SHUTDOWN));
    expect(result.current.connectionState).toBe('failed');
  });

  it('classifies a clean (client-initiated) disconnect as disconnected, not a fault', async () => {
    const { stream } = fakeStream();
    const { result } = renderHook(() =>
      useLiveKitRoom({ url: 'wss://x', token: 'tok-1', stream, active: true }),
    );
    await waitFor(() => expect(result.current.connectionState).toBe('connected'));

    act(() => lk.handlers['d']?.(DisconnectReason.CLIENT_INITIATED));
    expect(result.current.connectionState).toBe('disconnected');
  });

  it('a recovered reconnect shows "reconnected", then settles to connected', () => {
    vi.useFakeTimers();
    try {
      const { stream } = fakeStream();
      // Hold connect open so it never races the lifecycle events under fake timers.
      lk.connect.mockReturnValue(new Promise<void>(() => undefined));
      const { result } = renderHook(() =>
        useLiveKitRoom({ url: 'wss://x', token: 'tok-1', stream, active: true }),
      );
      act(() => lk.handlers['reconnecting']?.());
      expect(result.current.connectionState).toBe('reconnecting');
      act(() => lk.handlers['reconnected']?.());
      expect(result.current.connectionState).toBe('reconnected');
      act(() => vi.advanceTimersByTime(3000));
      expect(result.current.connectionState).toBe('connected');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a disconnect during the reconnected settle window wins — stays disconnected (no stale flip)', () => {
    vi.useFakeTimers();
    try {
      const { stream } = fakeStream();
      // Hold connect open so the connect IIFE never races the lifecycle events.
      lk.connect.mockReturnValue(new Promise<void>(() => undefined));
      const { result } = renderHook(() =>
        useLiveKitRoom({ url: 'wss://x', token: 'tok-1', stream, active: true }),
      );
      act(() => lk.handlers['reconnected']?.());
      expect(result.current.connectionState).toBe('reconnected');
      // A clean disconnect arrives mid-settle → the settle timer must be cleared so it
      // can't later flip 'connected' over the disconnected overlay.
      act(() => lk.handlers['d']?.(DisconnectReason.CLIENT_INITIATED));
      expect(result.current.connectionState).toBe('disconnected');
      act(() => vi.advanceTimersByTime(5000));
      expect(result.current.connectionState).toBe('disconnected');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejoin() re-runs the connect WITHOUT stopping the shared camera (no release)', async () => {
    const { stream, video, audio } = fakeStream();
    const { result } = renderHook(() =>
      useLiveKitRoom({ url: 'wss://x', token: 'tok-1', stream, active: true }),
    );
    await waitFor(() => expect(lk.connect).toHaveBeenCalledTimes(1));

    act(() => lk.handlers['d']?.(DisconnectReason.SERVER_SHUTDOWN));
    expect(result.current.connectionState).toBe('failed');

    act(() => result.current.rejoin());
    await waitFor(() => expect(lk.connect).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.connectionState).toBe('connected'));

    // The shared MediaStream is retained — the camera (and CMF feed) is never stopped.
    expect(video.stop).not.toHaveBeenCalled();
    expect(audio.stop).not.toHaveBeenCalled();
  });

  it('a failed initial connect surfaces the failed state', async () => {
    lk.connect.mockReset().mockRejectedValue(new Error('nope'));
    const { stream } = fakeStream();
    const { result } = renderHook(() =>
      useLiveKitRoom({ url: 'wss://x', token: 'tok-1', stream, active: true }),
    );
    await waitFor(() => expect(result.current.connectionState).toBe('failed'));
    expect(result.current.error).toBeTruthy();
  });
});

describe('classifyDisconnect', () => {
  const CLEAN = [
    DisconnectReason.CLIENT_INITIATED,
    DisconnectReason.ROOM_DELETED,
    DisconnectReason.ROOM_CLOSED,
    DisconnectReason.PARTICIPANT_REMOVED,
    DisconnectReason.DUPLICATE_IDENTITY,
  ];

  it('maps every DisconnectReason to disconnected (clean) or failed (fault)', () => {
    const reasons = (Object.values(DisconnectReason) as DisconnectReason[]).filter(
      (v) => typeof v === 'number',
    );
    expect(reasons.length).toBeGreaterThan(10); // sanity: the whole enum is present
    for (const reason of reasons) {
      const out = classifyDisconnect(reason);
      expect(['disconnected', 'failed']).toContain(out);
      expect(out).toBe(CLEAN.includes(reason) ? 'disconnected' : 'failed');
    }
  });

  it('treats an unknown / absent reason as failed', () => {
    expect(classifyDisconnect(undefined)).toBe('failed');
    expect(classifyDisconnect(DisconnectReason.UNKNOWN_REASON)).toBe('failed');
  });
});
