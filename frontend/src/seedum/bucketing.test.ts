import { describe, expect, it } from 'vitest';

import { average, BUCKET_MS, Bucketer, bucketStartFor } from './bucketing';

describe('bucketing', () => {
  it('averages and rounds', () => {
    expect(average([10, 20, 30])).toBe(20);
    expect(average([])).toBe(0);
    expect(average([1, 2])).toBe(2); // 1.5 -> 2
  });

  it('floors timestamps to bucket starts', () => {
    expect(bucketStartFor(0)).toBe(0);
    expect(bucketStartFor(BUCKET_MS - 1)).toBe(0);
    expect(bucketStartFor(BUCKET_MS + 5)).toBe(BUCKET_MS);
  });

  it('emits one aggregate per closed bucket (raw scores never escape)', () => {
    const out: Array<[number, number]> = [];
    const b = new Bucketer((start, avg) => out.push([start, avg]));
    b.add(0, 80);
    b.add(1000, 60); // bucket 0
    b.add(BUCKET_MS + 100, 40); // bucket 1 opens -> bucket 0 flushes (avg 70)
    expect(out).toEqual([[0, 70]]);
    b.flush(); // close the in-progress bucket
    expect(out).toEqual([
      [0, 70],
      [BUCKET_MS, 40],
    ]);
  });
});
