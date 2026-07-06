import { fireEvent, screen } from '@testing-library/react';
import type { RemoteParticipant } from 'livekit-client';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { VideoRoom } from './VideoRoom';

// VideoRoom pulls in VideoTile, which imports Track from livekit-client. We render VideoRoom
// directly (no Room is created), so a tiny value-only mock is enough.
vi.mock('livekit-client', () => ({
  Track: { Source: { Camera: 'camera', Microphone: 'microphone', ScreenShare: 'screen' } },
  RoomEvent: {},
}));

function fakeParticipant(sid: string, identity: string): RemoteParticipant {
  return { sid, identity, getTrackPublication: () => undefined } as unknown as RemoteParticipant;
}

const NAMES: Record<string, string> = { u1: 'Тимур', u2: 'Вера' };
const ATTENTION: Record<string, number> = { u1: 41, u2: 86 };
const METRICS: Record<string, { gaze: number | null; eyes: number | null; headYaw: number | null; headPitch: number | null; alert: number | null }> = {
  u1: { gaze: 38, eyes: 70, headYaw: 25, headPitch: -4, alert: 55 },
  u2: { gaze: 92, eyes: 84, headYaw: 2, headPitch: 1, alert: 90 },
};

function renderTeacherRoom(
  participants: RemoteParticipant[] = [fakeParticipant('s1', 'u1'), fakeParticipant('s2', 'u2')],
) {
  return renderWithProviders(
    <VideoRoom
      localStream={null}
      liveBadgeLabel="Ваша камера в эфире"
      connecting={false}
      connectionState="connected"
      roomFull={false}
      micEnabled
      cameraEnabled={false}
      screenSharing={false}
      participants={participants}
      version={0}
      activeSpeakers={new Set<string>()}
      screenShare={null}
      onToggleMic={vi.fn()}
      onToggleCamera={vi.fn()}
      onToggleScreenShare={vi.fn()}
      onRejoin={vi.fn()}
      onLeave={vi.fn()}
      nameFor={(id) => NAMES[id] ?? id}
      focusable
      attentionFor={(id) => ATTENTION[id] ?? null}
      metricsFor={(id) => METRICS[id] ?? null}
      selfInRail
    />,
  );
}

describe('VideoRoom F1 — teacher focus mode (final design v2, no overlap)', () => {
  it('renders the self tile in the side rail, remote tiles as focusable buttons', () => {
    const { container } = renderTeacherRoom();
    // Rail: self view + caption; the grid contains ONLY the remote tiles.
    expect(screen.getByText('Так вас видят ученики')).toBeInTheDocument();
    const tiles = container.querySelector('[data-count]');
    expect(tiles).toBeTruthy();
    expect(tiles!.querySelectorAll('button').length).toBe(2);
    expect(screen.getAllByRole('button', { name: /Развернуть видео/ }).length).toBe(2);
  });

  it('click focuses a student (aria-pressed + data attributes), second click collapses', () => {
    const { container } = renderTeacherRoom();
    const [timur] = screen.getAllByRole('button', { name: /Развернуть видео: Тимур/ });
    fireEvent.click(timur);
    expect(timur).toHaveAttribute('aria-pressed', 'true');
    expect(timur).toHaveAttribute('data-focused', 'true');
    expect(container.querySelector('[data-focus="true"]')).toBeTruthy();
    // Focus bar: value + the below-threshold text accent (41 < liveAttentionAlertBelow).
    expect(screen.getByText('41')).toBeInTheDocument();
    expect(screen.getAllByText('нужно внимание').length).toBeGreaterThan(0);
    expect(screen.getByText('Esc — свернуть')).toBeInTheDocument();
    // Owner v3: the focused bar carries the full live sub-metrics for the teacher.
    expect(screen.getByText('взгляд')).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
    expect(screen.getByText('вне кадра')).toBeInTheDocument();
    // Collapse via a second click (button label flips to «Свернуть видео…»).
    fireEvent.click(screen.getByRole('button', { name: /Свернуть видео: Тимур/ }));
    expect(container.querySelector('[data-focus="true"]')).toBeNull();
  });

  it('no «нужно внимание» accent for a student above the threshold', () => {
    renderTeacherRoom();
    const [veraBtn] = screen.getAllByRole('button', { name: /Развернуть видео: Вера/ });
    fireEvent.click(veraBtn);
    expect(screen.getAllByText('86').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Свернуть видео: Вера/ })).toHaveAttribute(
      'data-alert',
      'false',
    );
  });

  it('Esc collapses the focus', () => {
    const { container } = renderTeacherRoom();
    fireEvent.click(screen.getAllByRole('button', { name: /Развернуть видео: Тимур/ })[0]);
    expect(container.querySelector('[data-focus="true"]')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelector('[data-focus="true"]')).toBeNull();
  });

  it('7686a9c guard: entering/leaving focus never remounts the <video> elements', () => {
    const { container } = renderTeacherRoom();
    const before = Array.from(container.querySelectorAll('video'));
    const [timur] = screen.getAllByRole('button', { name: /Развернуть видео: Тимур/ });
    fireEvent.click(timur); // focus
    const during = Array.from(container.querySelectorAll('video'));
    fireEvent.keyDown(window, { key: 'Escape' }); // collapse
    const after = Array.from(container.querySelectorAll('video'));
    expect(during.length).toBe(before.length);
    before.forEach((el, i) => {
      expect(during[i]).toBe(el); // same DOM nodes — layout flipped via data attributes only
      expect(after[i]).toBe(el);
    });
  });

  it('drops the focus if the focused participant leaves', () => {
    const p1 = fakeParticipant('s1', 'u1');
    const p2 = fakeParticipant('s2', 'u2');
    const { container, rerender } = renderTeacherRoom([p1, p2]);
    fireEvent.click(screen.getAllByRole('button', { name: /Развернуть видео: Тимур/ })[0]);
    expect(container.querySelector('[data-focus="true"]')).toBeTruthy();
    rerender(
      <VideoRoom
        localStream={null}
        liveBadgeLabel="Ваша камера в эфире"
        connecting={false}
        connectionState="connected"
        roomFull={false}
        micEnabled
        cameraEnabled={false}
        screenSharing={false}
        participants={[p2]}
        version={1}
        activeSpeakers={new Set<string>()}
        screenShare={null}
        onToggleMic={vi.fn()}
        onToggleCamera={vi.fn()}
        onToggleScreenShare={vi.fn()}
        onRejoin={vi.fn()}
        onLeave={vi.fn()}
        nameFor={(id) => NAMES[id] ?? id}
        focusable
        attentionFor={(id) => ATTENTION[id] ?? null}
        metricsFor={(id) => METRICS[id] ?? null}
        selfInRail
      />,
    );
    expect(container.querySelector('[data-focus="true"]')).toBeNull();
  });
});

describe('B-6 — data-count matches the tiles actually in the grid', () => {
  it('selfInRail: local tile is NOT counted (1 student → wide stage, no empty column)', () => {
    const { container } = renderTeacherRoom([fakeParticipant('s1', 'u1')]);
    const tiles = container.querySelector('[data-count]')!;
    expect(tiles.getAttribute('data-count')).toBe('1');
    expect(tiles.querySelectorAll('button').length).toBe(1);
  });

  it('selfInRail: 3 students → data-count 3 (2×2 grid, no phantom 4th slot)', () => {
    const { container } = renderTeacherRoom([
      fakeParticipant('s1', 'u1'),
      fakeParticipant('s2', 'u2'),
      fakeParticipant('s3', 'u3'),
    ]);
    expect(container.querySelector('[data-count]')!.getAttribute('data-count')).toBe('3');
  });

  it('without selfInRail (student layout): the local tile IS counted', () => {
    const { container } = renderWithProviders(
      <VideoRoom
        localStream={null}
        liveBadgeLabel="Камера в эфире"
        connecting={false}
        connectionState="connected"
        roomFull={false}
        micEnabled
        cameraEnabled={false}
        screenSharing={false}
        participants={[fakeParticipant('s1', 'u1')]}
        version={0}
        activeSpeakers={new Set<string>()}
        screenShare={null}
        onToggleMic={vi.fn()}
        onToggleCamera={vi.fn()}
        onToggleScreenShare={vi.fn()}
        onRejoin={vi.fn()}
        onLeave={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-count]')!.getAttribute('data-count')).toBe('2');
  });
});

describe('owner v3 — parameters live ON the tiles at all times', () => {
  it('every tile chip shows name · attention; the low tile carries the alert ring + text', () => {
    renderTeacherRoom();
    // Name chips include the live value even WITHOUT focusing.
    expect(screen.getByText(/Тимур/)).toBeInTheDocument();
    expect(screen.getByText('· 41')).toBeInTheDocument();
    expect(screen.getByText('· 86')).toBeInTheDocument();
    const [timur] = screen.getAllByRole('button', { name: /Развернуть видео: Тимур/ });
    expect(timur).toHaveAttribute('data-alert', 'true');
    expect(screen.getByText('нужно внимание')).toBeInTheDocument();
    const [vera] = screen.getAllByRole('button', { name: /Развернуть видео: Вера/ });
    expect(vera).toHaveAttribute('data-alert', 'false');
  });
});
