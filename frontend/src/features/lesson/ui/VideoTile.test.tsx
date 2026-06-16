import { screen } from '@testing-library/react';
import { type RemoteParticipant } from 'livekit-client';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { VideoTile } from './VideoTile';

vi.mock('livekit-client', () => ({
  Track: { Source: { Camera: 'camera', Microphone: 'microphone' } },
}));

// Minimal fake remote participant exposing the publications VideoTile reads.
function makeParticipant(opts: {
  camTrack: boolean;
  camMuted?: boolean;
  micMuted?: boolean;
  identity?: string;
}): RemoteParticipant {
  const track = { attach: vi.fn(), detach: vi.fn() };
  const pubs: Record<string, { track: typeof track | null; isMuted: boolean }> = {
    camera: { track: opts.camTrack ? track : null, isMuted: !!opts.camMuted },
    microphone: { track, isMuted: opts.micMuted ?? false },
  };
  return {
    sid: 's1',
    identity: opts.identity ?? 'student1',
    getTrackPublication: (src: string) => pubs[src],
  } as unknown as RemoteParticipant;
}

describe('VideoTile remote mute / camera-off', () => {
  it('camera on + mic on: the tile is labelled with just the name', () => {
    renderWithProviders(
      <VideoTile participant={makeParticipant({ camTrack: true, micMuted: false })} version={0} />,
    );
    expect(screen.getByRole('img', { name: 'student1' })).toBeInTheDocument();
  });

  it('camera off (no track): the tile announces camera off', () => {
    renderWithProviders(
      <VideoTile participant={makeParticipant({ camTrack: false, micMuted: false })} version={0} />,
    );
    expect(screen.getByRole('img', { name: /Камера выключена/ })).toBeInTheDocument();
  });

  it('camera present but muted: also announces camera off', () => {
    renderWithProviders(
      <VideoTile
        participant={makeParticipant({ camTrack: true, camMuted: true, micMuted: false })}
        version={0}
      />,
    );
    expect(screen.getByRole('img', { name: /Камера выключена/ })).toBeInTheDocument();
  });

  it('mic muted: the tile announces mic off', () => {
    renderWithProviders(
      <VideoTile participant={makeParticipant({ camTrack: true, micMuted: true })} version={0} />,
    );
    expect(screen.getByRole('img', { name: /Микрофон выключен/ })).toBeInTheDocument();
  });
});
