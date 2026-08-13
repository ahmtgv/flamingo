import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBroadcastSource } from './useBroadcastSource';

/** A track that records whether anybody stopped it — the thing §2.7 forbids for the camera. */
interface FakeTrack {
  kind: string;
  enabled: boolean;
  stopped: boolean;
  stop(): void;
  addEventListener: ReturnType<typeof vi.fn>;
}

function fakeTrack(kind: 'video' | 'audio' = 'video') {
  const track: FakeTrack = {
    kind,
    enabled: true,
    stopped: false,
    stop() {
      track.stopped = true;
    },
    addEventListener: vi.fn(),
  };
  return track as unknown as MediaStreamTrack & { stopped: boolean };
}

/** A MediaStream whose object identity we can assert on across source switches. */
function fakeStream(tracks: MediaStreamTrack[]) {
  const list = [...tracks];
  return {
    id: 'shared-stream',
    getVideoTracks: () => list.filter((t) => t.kind === 'video'),
    getTracks: () => list,
    addTrack: (t: MediaStreamTrack) => list.push(t),
    removeTrack: (t: MediaStreamTrack) => {
      const i = list.indexOf(t);
      if (i >= 0) list.splice(i, 1);
    },
  } as unknown as MediaStream;
}

describe('useBroadcastSource — the §2.7 video rules', () => {
  let camera: ReturnType<typeof fakeTrack>;
  let stream: MediaStream;

  beforeEach(() => {
    camera = fakeTrack();
    stream = fakeStream([camera]);
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockResolvedValue(fakeStream([fakeTrack()])),
        getUserMedia: vi.fn().mockResolvedValue(fakeStream([fakeTrack()])),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam-1' },
          { kind: 'videoinput', deviceId: 'cam-2' },
        ]),
      },
    });
  });

  it('turning the camera off DISABLES the track and never stops it', () => {
    // A stopped track cannot come back — the only way back would be a new getUserMedia,
    // which is a new object, which is the remount the rule exists to prevent.
    const { result } = renderHook(() => useBroadcastSource(stream));

    act(() => result.current.setCameraOn(false));
    expect(camera.enabled).toBe(false);
    expect(camera.stopped).toBe(false);

    act(() => result.current.setCameraOn(true));
    expect(camera.enabled).toBe(true);
  });

  it('switching the source keeps the SAME MediaStream object', async () => {
    // Identity is what keeps <video> mounted: the element renders this object, and the
    // tracks are swapped inside it.
    const { result } = renderHook(() => useBroadcastSource(stream));
    const before = result.current.stream;

    await act(async () => {
      await result.current.switchTo('screen');
    });

    expect(result.current.source).toBe('screen');
    expect(result.current.stream).toBe(before);
  });

  it('sharing the screen does not stop the camera — it comes back on switch', async () => {
    const { result } = renderHook(() => useBroadcastSource(stream));

    await act(async () => {
      await result.current.switchTo('screen');
    });
    expect(camera.stopped).toBe(false);

    await act(async () => {
      await result.current.switchTo('camera');
    });
    expect(result.current.source).toBe('camera');
    expect(stream.getVideoTracks()).toContain(camera);
    expect(camera.enabled).toBe(true);
  });

  it('the room camera is a second device, and its track replaces the published video', async () => {
    const { result } = renderHook(() => useBroadcastSource(stream));

    await act(async () => {
      await result.current.switchTo('roomCamera');
    });

    expect(result.current.source).toBe('roomCamera');
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: { deviceId: 'cam-2' },
    });
    expect(stream.getVideoTracks()).toHaveLength(1);
  });

  it('a refused screen share is reported, not swallowed, and the source does not move', async () => {
    const denied = Object.assign(new Error('no'), { name: 'NotAllowedError' });
    (navigator.mediaDevices.getDisplayMedia as ReturnType<typeof vi.fn>).mockRejectedValue(denied);
    const { result } = renderHook(() => useBroadcastSource(stream));

    await act(async () => {
      await result.current.switchTo('screen');
    });

    expect(result.current.error).toBe('denied');
    expect(result.current.source).toBe('camera');
  });

  it('knows whether the classroom actually has a second camera', async () => {
    const { result } = renderHook(() => useBroadcastSource(stream));
    await expect(result.current.hasRoomCamera()).resolves.toBe(true);

    (navigator.mediaDevices.enumerateDevices as ReturnType<typeof vi.fn>).mockResolvedValue([
      { kind: 'videoinput', deviceId: 'cam-1' },
    ]);
    await expect(result.current.hasRoomCamera()).resolves.toBe(false);
  });
});
