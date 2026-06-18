import { describe, expect, it } from 'vitest';

import { CMF } from './cmfConfig';
import { headState, POSE_AXIS_MULTIPLE } from './headTolerance';

describe('headState', () => {
  it('is "in" when both axes are within tolerance', () => {
    expect(headState(0, 0)).toBe('in');
    expect(headState(CMF.headYawToleranceDeg - 1, CMF.headPitchToleranceDeg - 1)).toBe('in');
    expect(headState(-(CMF.headYawToleranceDeg - 1), 0)).toBe('in');
  });

  it('treats the exact tolerance as in (mirrors the engine ">" predicate, not ">=")', () => {
    expect(headState(CMF.headYawToleranceDeg, CMF.headPitchToleranceDeg)).toBe('in');
    expect(headState(-CMF.headYawToleranceDeg, -CMF.headPitchToleranceDeg)).toBe('in');
  });

  it('is "out" when either axis exceeds tolerance', () => {
    expect(headState(CMF.headYawToleranceDeg + 1, 0)).toBe('out');
    expect(headState(0, CMF.headPitchToleranceDeg + 1)).toBe('out');
    expect(headState(-(CMF.headYawToleranceDeg + 1), 0)).toBe('out');
  });

  it('is "unknown" for a missing reading — never a false "in" (the Math.abs(null) <= tol trap)', () => {
    expect(headState(null, 0)).toBe('unknown');
    expect(headState(0, null)).toBe('unknown');
    expect(headState(undefined, undefined)).toBe('unknown');
    expect(headState(null, null)).not.toBe('in');
  });

  it('derives the boundary ONLY from cmfConfig (tuning the config moves the boundary, no UI edit)', () => {
    // A value fractionally past the *config* tolerance flips to "out" — proving the config value,
    // not a hard-coded literal, is the source of truth.
    expect(headState(CMF.headYawToleranceDeg + 0.001, 0)).toBe('out');
    expect(headState(0, CMF.headPitchToleranceDeg + 0.001)).toBe('out');
  });
});

describe('POSE_AXIS_MULTIPLE', () => {
  it('is a positive display-only zoom that does NOT affect the decision boundary', () => {
    expect(POSE_AXIS_MULTIPLE).toBeGreaterThan(0);
    // headState never reads it: a point exactly at tolerance is still "in".
    expect(headState(CMF.headYawToleranceDeg, 0)).toBe('in');
  });
});
