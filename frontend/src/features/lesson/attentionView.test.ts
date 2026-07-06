import { describe, expect, it } from 'vitest';

import { classAverage, freshValue, heldValue, pushSeries, summaryStats } from './attentionView';

describe('attentionView (teacher live class attention)', () => {
  it('classAverage ignores no-reading (0) students; 0 only when nobody is readable', () => {
    expect(classAverage([88, 90])).toBe(89);
    expect(classAverage([88, 0])).toBe(88); // a no-reading student does not drag the average down
    expect(classAverage([0, 0])).toBe(0);
    expect(classAverage([])).toBe(0);
  });

  it('heldValue holds the last value across a no-reading bucket (no decay to 0)', () => {
    expect(heldValue(89, 91)).toBe(91); // real bucket → update
    expect(heldValue(89, 0)).toBe(89); // no reading → hold, never drop to 0
    expect(heldValue(0, 0)).toBe(0); // nothing yet
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
