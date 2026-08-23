import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMediaCheck } from './useMediaCheck';

/**
 * 🔴 КАМЕРА ОТПУСКАЕТСЯ, КОГДА С ЭКРАНА УШЛИ (наряд 47 §6).
 *
 * Замерено владельцем 23.08: индикатор камеры macOS загорелся на шаге 4 мастера в 08:51 и
 * горел в 09:10 — через мастер, кабинет и вход в комнату. Хук держал поток только в состоянии
 * React, гашение шло через `setStream`, и поток, пришедший после ухода с шага, оставался
 * гореть ничьим.
 *
 * Проверяется поведение, а не исходник: дорожки обязаны быть остановлены.
 */
function makeTrack() {
  return { kind: 'video', stop: vi.fn(), getSettings: () => ({ deviceId: 'cam-1' }) };
}
function makeStream(tracks: ReturnType<typeof makeTrack>[]) {
  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    getAudioTracks: () => [],
  } as unknown as MediaStream;
}

function Probe() {
  const media = useMediaCheck();
  // Как в мастере: спрашиваем при появлении экрана.
  if (media.state === 'idle') void media.start();
  return <div>{media.state}</div>;
}

let tracks: ReturnType<typeof makeTrack>[];

beforeEach(() => {
  tracks = [makeTrack()];
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => makeStream(tracks)),
      enumerateDevices: vi.fn(async () => [{ kind: 'videoinput', deviceId: 'cam-1', label: 'FaceTime' }]),
    },
  });
  // Анализатор звука не участвует в этой проверке — заглушаем целиком.
  vi.stubGlobal('AudioContext', class {
    state = 'running';
    createMediaStreamSource() { return { connect: () => {} }; }
    createAnalyser() { return { fftSize: 0, frequencyBinCount: 8, getByteTimeDomainData: () => {} }; }
    close() { return Promise.resolve(); }
  });
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => vi.unstubAllGlobals());

describe('камера мастера', () => {
  it('гаснет, когда экран ушёл', async () => {
    const view = render(<Probe />);
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());

    view.unmount();

    await waitFor(() => expect(tracks[0].stop).toHaveBeenCalled());
  });

  it('гаснет и тогда, когда разрешение пришло ПОСЛЕ ухода с экрана', async () => {
    // Ровно случай владельца: человек ушёл, пока висело системное окно macOS.
    let resolveMedia: (s: MediaStream) => void = () => {};
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise<MediaStream>((r) => { resolveMedia = r; }),
    );
    const view = render(<Probe />);
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());

    view.unmount();
    resolveMedia(makeStream(tracks));

    await waitFor(() => expect(tracks[0].stop).toHaveBeenCalled());
  });
});
