import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLiveKitRoom } from './useLiveKitRoom';

const lk = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  publishTrack: vi.fn(),
}));

vi.mock('livekit-client', () => {
  class Room {
    localParticipant = { publishTrack: lk.publishTrack };
    remoteParticipants = new Map();
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
      Disconnected: 'd',
    },
    Track: {
      Source: { Camera: 'camera', Microphone: 'microphone' },
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
});
