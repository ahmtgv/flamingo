import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';

import { CheckStep } from './CheckStep';

/**
 * 🔴 КАМЕРА НЕ ВКЛЮЧАЕТСЯ САМА, А ГДЕ КАРТИНКА — ТАМ СКАЗАНО ПРО КАДРЫ (наряд 48 §2).
 *
 * Замерено на живой машине 23.08: шаг открывался и сам брал камеру с микрофоном (два
 * обращения подряд), на маке загорался зелёный индикатор — а на экране не было ни слова
 * о том, куда идут кадры. `CLAUDE.md §7` требует показатель приватности на КАЖДОМ экране
 * с камерой, и это первый экран после установки.
 *
 * Прибора «где getUserMedia — там показатель» не существовало; этот и есть первый.
 */
const tracks = [{ kind: 'video', stop: vi.fn(), getSettings: () => ({ deviceId: 'cam-1' }) }];
const stream = {
  getTracks: () => tracks,
  getVideoTracks: () => tracks,
  getAudioTracks: () => [],
} as unknown as MediaStream;

let asked = 0;

beforeEach(() => {
  asked = 0;
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => {
        asked += 1;
        return stream;
      }),
      enumerateDevices: vi.fn(async () => [
        { kind: 'videoinput', deviceId: 'cam-1', label: 'FaceTime HD' },
        { kind: 'audioinput', deviceId: 'mic-1', label: 'Встроенный' },
      ]),
    },
  });
  vi.stubGlobal(
    'AudioContext',
    class {
      state = 'running';
      createMediaStreamSource() { return { connect: () => {} }; }
      createAnalyser() { return { fftSize: 0, frequencyBinCount: 8, getByteTimeDomainData: () => {} }; }
      close() { return Promise.resolve(); }
    },
  );
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => vi.unstubAllGlobals());

function step() {
  return render(
    <MockedProvider mocks={[]}>
      <I18nextProvider i18n={i18n}>
        <CheckStep onNext={() => {}} />
      </I18nextProvider>
    </MockedProvider>,
  );
}

describe('шаг камеры', () => {
  it('до нажатия камеру не берёт вовсе', async () => {
    step();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Включить камеру' })).toBeInTheDocument());
    expect(asked).toBe(0);
    // И сказано, что камера пока выключена.
    expect(screen.getByText(/камера выключена/i)).toBeInTheDocument();
  });

  it('после нажатия берёт камеру и говорит, куда идут кадры', async () => {
    step();

    await userEvent.click(screen.getByRole('button', { name: 'Включить камеру' }));

    await waitFor(() => expect(asked).toBe(1));
    // Показатель приватности — вместе с картинкой.
    // Ролей `status` на шаге несколько (уровень микрофона тоже), поэтому спрашиваем ту,
    // что про кадры: важно не «есть строка», а «строка про кадры пришла вместе с картинкой».
    await waitFor(() => {
      const said = screen
        .getAllByRole('status')
        .some((n) => /Кадры остаются на этом компьютере/.test(n.textContent ?? ''));
      expect(said).toBe(true);
    });
  });

  it('пока картинки нет — показателя тоже нет, он не украшение', async () => {
    step();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Включить камеру' })).toBeInTheDocument());
    expect(screen.queryByText(/Кадры остаются на этом компьютере/)).not.toBeInTheDocument();
  });
});
