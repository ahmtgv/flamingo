import { describe, expect, it } from 'vitest';

import { average, BUCKET_MS, Bucketer, bucketStartFor, type Sample } from './bucketing';

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

  it('B-9: a window with no samples is never emitted (no-face frames are skipped upstream)', () => {
    const out: Array<[number, Sample]> = [];
    const b = new Bucketer((start, avg) => out.push([start, avg]));
    b.add(0, { engagement: 80 }); // bucket 0 (face present)
    // bucket 1 window passes with NO adds (face absent) …
    b.add(BUCKET_MS * 2 + 10, { engagement: 60 }); // bucket 2 → flushes bucket 0 only
    b.flush();
    // bucket 1 never appears — no false zero bucket, reportAttention is simply skipped.
    expect(out.map(([start]) => start)).toEqual([0, BUCKET_MS * 2]);
  });

  it('B-9: flush() with zero collected samples emits nothing', () => {
    const out: Array<[number, Sample]> = [];
    const b = new Bucketer((start, avg) => out.push([start, avg]));
    b.flush();
    expect(out).toEqual([]);
  });

  it('emits one aggregate RECORD per closed bucket (per-key averages; raw samples never escape)', () => {
    const out: Array<[number, Sample]> = [];
    const b = new Bucketer((start, avg) => out.push([start, avg]));
    b.add(0, { engagement: 80, gazeOnScreen: 90 });
    b.add(1000, { engagement: 60, gazeOnScreen: 70 }); // bucket 0
    b.add(BUCKET_MS + 100, { engagement: 40, gazeOnScreen: 50 }); // bucket 1 → bucket 0 flushes
    expect(out).toEqual([[0, { engagement: 70, gazeOnScreen: 80 }]]);
    b.flush(); // close the in-progress bucket
    expect(out).toEqual([
      [0, { engagement: 70, gazeOnScreen: 80 }],
      [BUCKET_MS, { engagement: 40, gazeOnScreen: 50 }],
    ]);
  });
});
