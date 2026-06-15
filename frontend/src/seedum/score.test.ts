import { describe, expect, it } from 'vitest';

import { scoreAttention } from './score';

describe('scoreAttention', () => {
  it('is 0 when no face is present', () => {
    expect(scoreAttention({ facePresent: false, eyeOpenness: 1, gazeCenter: 1, headForward: 1 })).toBe(0);
  });

  it('is high for centered gaze + forward head + open eyes', () => {
    expect(scoreAttention({ facePresent: true, eyeOpenness: 1, gazeCenter: 1, headForward: 1 })).toBe(100);
  });

  it('drops when looking away', () => {
    const focused = scoreAttention({ facePresent: true, eyeOpenness: 1, gazeCenter: 1, headForward: 1 });
    const away = scoreAttention({ facePresent: true, eyeOpenness: 1, gazeCenter: 0.1, headForward: 0.2 });
    expect(away).toBeLessThan(focused);
  });

  it('normalizes against a calibration baseline', () => {
    const s = { facePresent: true, eyeOpenness: 1, gazeCenter: 0.5, headForward: 0.5 } as const;
    const raw = scoreAttention(s);
    const normalized = scoreAttention(s, { gazeCenter: 0.5, headForward: 0.5 });
    expect(normalized).toBeGreaterThan(raw);
  });
});
