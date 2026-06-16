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
function renderRoom(connectionState: RoomConnectionState, onRejoin = vi.fn()) {
  const utils = renderWithProviders(
    <VideoRoom
      localStream={null}
      connecting={false}
      connectionState={connectionState}
      roomFull={false}
      micEnabled
      cameraEnabled={false}
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

describe('VideoRoom connection lifecycle UI', () => {
  it('connected: no banner, no overlay; the local <video> and tiles are mounted', () => {
    const { container } = renderRoom('connected');
    expect(container.querySelector('video')).toBeTruthy();
    expect(screen.getByText('Вы')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
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

  it('disconnected: rejoin overlay layered OVER still-mounted tiles (not an early return)', () => {
    const { container, onRejoin } = renderRoom('disconnected');
    // Tiles + local <video> remain mounted underneath the overlay (the camera survives).
    expect(container.querySelector('video')).toBeTruthy();
    expect(screen.getByText('Вы')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/потеряно/i);
    fireEvent.click(screen.getByRole('button', { name: /Переподключиться/ }));
    expect(onRejoin).toHaveBeenCalledTimes(1);
  });

  it('failed: overlay shows the failed copy and still keeps the tiles mounted', () => {
    const { container } = renderRoom('failed');
    expect(container.querySelector('video')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent(/Не удалось/i);
  });
});
