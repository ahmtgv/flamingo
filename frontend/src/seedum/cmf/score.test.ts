import { describe, expect, it } from 'vitest';

import { type AttentionSignals, engagementScore } from './score';

const sig = (o: Partial<AttentionSignals> = {}): AttentionSignals => ({
  facePresent: true,
  gazeOnScreen: 1,
  eyeOpenness: 1,
  headYaw: 0,
  headPitch: 0,
  alertness: 1,
  ...o,
});

describe('engagementScore', () => {
  it('is 0 when no face is present', () => {
    expect(engagementScore(sig({ facePresent: false }))).toBe(0);
  });

  it('is high for gaze on-screen + eyes open + head straight', () => {
    expect(engagementScore(sig())).toBe(100);
  });

  it('does NOT penalize head tilt alone while gaze stays on-screen', () => {
    expect(engagementScore(sig({ headYaw: 30, headPitch: 20 }))).toBe(100);
  });

  it('drops when gaze goes off-screen (the primary signal)', () => {
    expect(engagementScore(sig({ gazeOnScreen: 0.2 }))).toBeLessThan(30);
  });

  it('is near zero when eyes are closed even with gaze on-screen', () => {
    expect(engagementScore(sig({ eyeOpenness: 0 }))).toBe(0);
  });

  it('applies an extra penalty only when head is far AND gaze is off-screen', () => {
    const offOnly = engagementScore(sig({ gazeOnScreen: 0.4 }));
    const offAndHeadOut = engagementScore(sig({ gazeOnScreen: 0.4, headYaw: 40 }));
    expect(offAndHeadOut).toBeLessThan(offOnly);
  });

  it('normalizes gaze against a calibration baseline when given', () => {
    const s = sig({ gazeOnScreen: 0.5 });
    expect(engagementScore(s, { gazeOnScreen: 0.5 })).toBeGreaterThan(engagementScore(s));
  });
});
