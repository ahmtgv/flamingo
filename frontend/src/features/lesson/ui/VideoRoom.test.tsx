import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { type RoomConnectionState } from '../livekit/useLiveKitRoom';
import { VideoRoom } from './VideoRoom';

// VideoRoom pulls in VideoTile, which imports Track from livekit-client. We render VideoRoom
// directly (no Room is created), so a tiny value-only mock is enough.
vi.mock('livekit-client', () => ({
  Track: { Source: { Camera: 'camera', Microphone: 'microphone', ScreenShare: 'screen' } },
  RoomEvent: {},
}));

// cameraEnabled is false so the (role="status") live badge doesn't collide with the
// reconnecting banner in role queries — the lifecycle UI is independent of the camera flag.
function renderRoom(
  connectionState: RoomConnectionState,
  { cameraEnabled = false, liveBadgeLabel = 'Камера в эфире', error = null as string | null } = {},
) {
  const onRejoin = vi.fn();
  const utils = renderWithProviders(
    <VideoRoom
      localStream={null}
      liveBadgeLabel={liveBadgeLabel}
      connecting={false}
      connectionState={connectionState}
      error={error}
      roomFull={false}
      micEnabled
      cameraEnabled={cameraEnabled}
      screenSharing={false}
      participants={[]}
      version={0}
      activeSpeakers={new Set<string>()}
      screenShare={null}
      onToggleMic={vi.fn()}
      onToggleCamera={vi.fn()}
      onToggleScreenShare={vi.fn()}
      onRejoin={onRejoin}
      onLeave={vi.fn()}
    />,
  );
  return { ...utils, onRejoin };
}

/**
 * 🔴 ПОДПИСЬ ГОВОРИТ ПРО ЭФИР, А НЕ ПРО КАМЕРУ (наряд 35 §1.4).
 *
 * Замер 18.08: медиасервер не отвечает — а на экране «Ваша камера в эфире», ровно как при
 * исправном эфире. Преподаватель ведёт урок, уверенный, что класс его видит. Камера включена
 * и эфир поднят — разные факты.
 */
describe('подпись «в эфире» не врёт', () => {
  it('пока эфир не поднялся, обещания «в эфире» нет', () => {
    renderRoom('connecting', { cameraEnabled: true, liveBadgeLabel: 'Ваша камера в эфире' });
    expect(screen.queryByText('Ваша камера в эфире')).toBeNull();
    expect(screen.getByText('Подключаем эфир…')).toBeTruthy();
  });

  it('поднялся — говорим про эфир', () => {
    renderRoom('connected', { cameraEnabled: true, liveBadgeLabel: 'Ваша камера в эфире' });
    expect(screen.getByText('Ваша камера в эфире')).toBeTruthy();
  });

  it('не поднялся совсем — называем причину, а не «что-то пошло не так»', () => {
    renderRoom('failed', {
      cameraEnabled: true,
      error: 'ConnectionError: could not establish signal connection',
    });
    expect(screen.getByText(/Сервер видео не отвечает/)).toBeTruthy();
  });
});

describe('VideoRoom connection lifecycle UI', () => {
  it('connected: live region empty, no overlay; the local <video> and tiles are mounted', () => {
    const { container } = renderRoom('connected');
    expect(container.querySelector('video')).toBeTruthy();
    expect(screen.getByText('Вы')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    // The persistent polite live region exists but announces nothing when connected.
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('reconnecting: non-blocking status banner while tiles + <video> stay mounted', () => {
    const { container } = renderRoom('reconnecting');
    expect(screen.getByRole('status')).toHaveTextContent(/переподключаемся/i);
    // The 7686a9c guard: the tiles container is NOT unmounted during a reconnect, so the
    // shared camera <video> keeps its srcObject.
    expect(container.querySelector('video')).toBeTruthy();
    expect(screen.getByText('Вы')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disconnected: rejoin overlay OVER still-mounted tiles; focus moves to Rejoin', () => {
    const { container, onRejoin } = renderRoom('disconnected');
    // Tiles + local <video> remain mounted underneath the overlay (the camera survives).
    expect(container.querySelector('video')).toBeTruthy();
    expect(screen.getByText('Вы')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/потеряно/i);
    const rejoin = screen.getByRole('button', { name: /Переподключиться/ });
    expect(rejoin).toHaveFocus(); // a11y: focus lands on the primary recovery action
    fireEvent.click(rejoin);
    expect(onRejoin).toHaveBeenCalledTimes(1);
  });

  it('failed: overlay shows the failed copy and still keeps the tiles mounted', () => {
    const { container } = renderRoom('failed');
    expect(container.querySelector('video')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent(/Не удалось/i);
  });

  it('exposes an accessible, labelled control group with keyboard-operable buttons', () => {
    renderRoom('connected');
    expect(screen.getByRole('group', { name: /Управление эфиром/ })).toBeInTheDocument();
    // Native <button>s with ru aria-labels → keyboard-operable + screen-reader-named.
    expect(screen.getByRole('button', { name: /микрофон/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /камер/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Выйти из эфира/ })).toBeInTheDocument();
  });

  it('renders the role-specific live-badge label from the parent (no cross-role leak)', () => {
    renderRoom('connected', { cameraEnabled: true, liveBadgeLabel: 'Ваша камера в эфире' });
    expect(screen.getByText('Ваша камера в эфире')).toBeInTheDocument();
  });
});
