import { describe, expect, it } from 'vitest';

import { Calibration, CALIBRATION_STAGES } from './calibration';
import type { AttentionSignals } from './score';

const sig = (gazeOnScreen: number): AttentionSignals => ({
  facePresent: true,
  gazeOnScreen,
  eyeOpenness: 1,
  headYaw: 0,
  headPitch: 0,
  alertness: 1,
});

describe('Calibration (3-stage база тест)', () => {
  it('has 3 stages', () => {
    expect(CALIBRATION_STAGES).toEqual(['focus', 'read', 'relax']);
  });

  it('progresses focus -> read -> relax and derives the baseline from focus', () => {
    const c = new Calibration();
    expect(c.stage).toBe('focus');
    c.record(sig(0.9));
    c.record(sig(0.7)); // focus mean gaze 0.8
    c.next();
    expect(c.stage).toBe('read');
    c.record(sig(0.4));
    c.next();
    c.record(sig(0.1));
    c.next();

    expect(c.done).toBe(true);
    expect(c.stage).toBeNull();
    const r = c.finish();
    expect(r.baseline.gazeOnScreen).toBeCloseTo(0.8);
    expect(r.samplesPerStage).toEqual({ focus: 2, read: 1, relax: 1 });
  });
});
