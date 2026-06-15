import { describe, expect, it } from 'vitest';

import { Calibration, CALIBRATION_STAGES } from './calibration';

const sig = (gazeCenter: number, headForward: number) => ({
  facePresent: true,
  eyeOpenness: 1,
  gazeCenter,
  headForward,
});

describe('Calibration (3-stage база тест)', () => {
  it('has 3 stages', () => {
    expect(CALIBRATION_STAGES).toEqual(['focus', 'read', 'relax']);
  });

  it('progresses focus -> read -> relax and derives the baseline from focus', () => {
    const c = new Calibration();
    expect(c.stage).toBe('focus');
    c.record(sig(0.9, 0.8));
    c.record(sig(0.7, 0.6)); // focus mean 0.8 / 0.7
    c.next();
    expect(c.stage).toBe('read');
    c.record(sig(0.4, 0.4));
    c.next();
    c.record(sig(0.1, 0.1));
    c.next();

    expect(c.done).toBe(true);
    expect(c.stage).toBeNull();
    const r = c.finish();
    expect(r.baseline.gazeCenter).toBeCloseTo(0.8);
    expect(r.baseline.headForward).toBeCloseTo(0.7);
    expect(r.samplesPerStage).toEqual({ focus: 2, read: 1, relax: 1 });
  });
});
