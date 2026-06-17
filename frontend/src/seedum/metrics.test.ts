import { describe, expect, it } from 'vitest';

import { AlertnessTracker, ema, eyeOpennessEAR, gazeOnScreen, headEuler, type Point } from './metrics';

describe('gazeOnScreen', () => {
  it('is ~1 when all gaze blendshapes are centered (zero)', () => {
    expect(gazeOnScreen(() => 0)).toBeCloseTo(1);
  });

  it('drops when looking strongly off to one side', () => {
    const look = (n: string) => (n === 'eyeLookOutLeft' || n === 'eyeLookOutRight' ? 0.8 : 0);
    expect(gazeOnScreen(look)).toBeLessThan(0.3);
  });

  it('keeps a small within-screen saccade attentive (no fixation required)', () => {
    const small = (n: string) => (n.startsWith('eyeLook') ? 0.1 : 0);
    expect(gazeOnScreen(small)).toBeGreaterThan(0.7);
  });
});

describe('eyeOpennessEAR', () => {
  // 478 dummy landmarks; set the eyelid indices to make the EAR open/closed.
  const pts = (vGap: number): Point[] => {
    const arr: Point[] = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
    for (const [hA, hB, vA, vB, vC, vD] of [
      [33, 133, 159, 145, 158, 153],
      [362, 263, 386, 374, 385, 380],
    ]) {
      arr[hA] = { x: 0, y: 0 };
      arr[hB] = { x: 1, y: 0 }; // eye width 1
      arr[vA] = { x: 0.5, y: 0 };
      arr[vB] = { x: 0.5, y: vGap };
      arr[vC] = { x: 0.5, y: 0 };
      arr[vD] = { x: 0.5, y: vGap };
    }
    return arr;
  };

  it('open eyes (wide EAR) → high openness', () => {
    expect(eyeOpennessEAR(pts(0.35), 0)).toBeGreaterThan(0.8);
  });

  it('closed eyes (tiny EAR) → near-zero openness', () => {
    expect(eyeOpennessEAR(pts(0.05), 0.9)).toBeLessThan(0.1);
  });

  it('falls back to the blink openness when landmarks are missing', () => {
    expect(eyeOpennessEAR(undefined, 0.42)).toBeCloseTo(0.42);
  });
});

describe('headEuler', () => {
  it('identity matrix → facing the screen (≈0 yaw/pitch)', () => {
    const { yaw, pitch } = headEuler([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    expect(Math.abs(yaw)).toBeLessThan(1);
    expect(Math.abs(pitch)).toBeLessThan(1);
  });

  it('forward vector tilted sideways → nonzero yaw', () => {
    // column 2 (forward) = (0.5, 0, 0.87)
    const m = [1, 0, 0, 0, 0, 1, 0, 0, 0.5, 0, 0.87, 0, 0, 0, 0, 1];
    expect(Math.abs(headEuler(m).yaw)).toBeGreaterThan(20);
  });
});

describe('ema', () => {
  it('moves toward the new value by alpha', () => {
    expect(ema(0, 100, 0.5)).toBe(50);
    expect(ema(50, 100, 0.5)).toBe(75);
  });
});

describe('AlertnessTracker', () => {
  it('few blinks + open eyes → alert (~1)', () => {
    const t = new AlertnessTracker();
    for (let i = 0; i < 50; i += 1) t.add(i * 200, 0.9); // 10s open, no blinks
    expect(t.value(50 * 200)).toBeGreaterThan(0.9);
  });

  it('very frequent blinks → drowsy (lower)', () => {
    const t = new AlertnessTracker();
    let ts = 0;
    for (let b = 0; b < 30; b += 1) {
      t.add(ts, 0.05); // eyes close
      ts += 200;
      t.add(ts, 0.9); // recover → one blink counted
      ts += 200;
    }
    expect(t.value(ts)).toBeLessThanOrEqual(0.5);
  });

  it('sustained heavy lids → drowsy (lower)', () => {
    const t = new AlertnessTracker();
    for (let i = 0; i < 50; i += 1) t.add(i * 200, 0.2); // half-open, no blinks
    expect(t.value(50 * 200)).toBeLessThan(0.6);
  });
});
