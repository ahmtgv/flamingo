import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLiveKitRoom } from './useLiveKitRoom';

const lk = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  publishTrack: vi.fn(),
  setScreenShareEnabled: vi.fn(),
  remoteCount: 0, // drives remoteParticipants.size for the ≤5 guard test
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
    on() {
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
      LocalTrackPublished: 'ltp',
      LocalTrackUnpublished: 'ltu',
      ActiveSpeakersChanged: 'asc',
      Disconnected: 'd',
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
});
