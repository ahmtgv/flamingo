import { describe, expect, it } from 'vitest';

import { classAverage, freshValue, heldValue, pushSeries, summaryStats } from './attentionView';

describe('attentionView (teacher live class attention)', () => {
  it('classAverage counts genuine 0s (present-but-disengaged); null when no fresh readings', () => {
    expect(classAverage([88, 90])).toBe(89);
    expect(classAverage([88, 0])).toBe(44); // C-display-1: a present-but-disengaged 0 counts
    expect(classAverage([0, 0])).toBe(0);
    expect(classAverage([])).toBeNull(); // no fresh readings — caller holds the previous value
  });

  it('heldValue holds only across a no-reading gap (null); a genuine 0 replaces the held value', () => {
    expect(heldValue(89, 91)).toBe(91); // real bucket → update
    expect(heldValue(89, 0)).toBe(0); // genuine 0 = everyone disengaged → real value, not a gap
    expect(heldValue(89, null)).toBe(89); // no reading (stale/no-face) → hold
  });

  it('summaryStats uses real received buckets only — between-bucket zeros never counted', () => {
    // A steadily-attentive student (~89) never looks like Среднее 10 / Минимум 0.
    expect(summaryStats([88, 90, 89, 91])).toEqual({ averageAttention: 90, peak: 91, low: 88 });
    expect(summaryStats([])).toBeNull(); // nothing received yet → no misleading zeros
  });

  it('B-9 freshValue: stale/absent records read as null («нет данных»), fresh ones pass through', () => {
    const rec = { value: 73, at: 10_000 };
    expect(freshValue(rec, 12_000, 6_000)).toBe(rec); // 2s old, fresh
    expect(freshValue(rec, 16_000, 6_000)).toBe(rec); // exactly at the limit — still fresh
    expect(freshValue(rec, 16_001, 6_000)).toBeNull(); // buckets stopped → «нет данных»
    expect(freshValue(undefined, 12_000, 6_000)).toBeNull(); // never reported
  });

  it('pushSeries appends and caps to the most recent N (per-student sparkline buffer)', () => {
    expect(pushSeries([], 80)).toEqual([80]);
    expect(pushSeries([80], 90)).toEqual([80, 90]);
    const full = Array.from({ length: 60 }, (_, i) => i);
    const next = pushSeries(full, 999, 60);
    expect(next).toHaveLength(60);
    expect(next[59]).toBe(999); // newest kept
    expect(next[0]).toBe(1); // oldest (0) dropped
  });
});
