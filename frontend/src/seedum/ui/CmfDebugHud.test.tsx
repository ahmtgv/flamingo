import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CmfDebugHud, type CmfHudFeed } from './CmfDebugHud';

describe('CmfDebugHud (D0 — dev-only, on-device diagnostics)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('samples pushed scores + the latest bucket on its slow clock (no per-push renders)', () => {
    const ref = createRef<CmfHudFeed>();
    render(<CmfDebugHud ref={ref} status="running" />);

    act(() => {
      ref.current!.pushScore(80);
      ref.current!.pushScore(84);
      ref.current!.pushBucket({
        avgAttention: 82,
        gazeOnScreen: 90,
        eyeOpenness: 70,
        headYaw: 3,
        headPitch: -5,
        alertness: 88,
      });
    });
    // Nothing shown until the 2 Hz sampling tick fires.
    expect(screen.getByText('score').nextElementSibling?.textContent).toBe('—');

    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText('score').nextElementSibling?.textContent).toBe('84');
    expect(screen.getByText(/att 82 · gaze 90 · eyes 70/)).toBeInTheDocument();
    expect(screen.getByText('status').nextElementSibling?.textContent).toBe('running');
  });

  it('renders honest placeholders when no data has arrived', () => {
    const ref = createRef<CmfHudFeed>();
    render(<CmfDebugHud ref={ref} status="starting" />);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText('score').nextElementSibling?.textContent).toBe('—');
    expect(screen.getByText('bucket').nextElementSibling?.textContent).toBe('—');
  });
});
