import { fireEvent, screen } from '@testing-library/react';
import type { RemoteParticipant } from 'livekit-client';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { StudentViewPreview, VideoRoom } from './VideoRoom';

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
    expect(screen.getByText('нужно внимание')).toBeInTheDocument();
    expect(screen.getByText('Esc — свернуть')).toBeInTheDocument();
    // Collapse via a second click (button label flips to «Свернуть видео…»).
    fireEvent.click(screen.getByRole('button', { name: /Свернуть видео: Тимур/ }));
    expect(container.querySelector('[data-focus="true"]')).toBeNull();
  });

  it('no «нужно внимание» accent for a student above the threshold', () => {
    renderTeacherRoom();
    const [vera] = screen.getAllByRole('button', { name: /Развернуть видео: Вера/ });
    fireEvent.click(vera);
    expect(screen.getByText('86')).toBeInTheDocument();
    expect(screen.queryByText('нужно внимание')).toBeNull();
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
        selfInRail
      />,
    );
    expect(container.querySelector('[data-focus="true"]')).toBeNull();
  });
});

describe('StudentViewPreview («что видит ученик»)', () => {
  it('is a toggle; opens the local-state preview card (no second stream)', () => {
    renderWithProviders(<StudentViewPreview stream={null} peers={3} />);
    const toggle = screen.getByRole('button', { name: 'Что видит ученик' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Экран ученика — макет' })).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByRole('img', { name: 'Экран ученика — макет' })).toBeNull();
  });
});
