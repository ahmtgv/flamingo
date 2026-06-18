// On-device aggregation buckets (CLAUDE.md §7). Per-frame scores are aggregated ON DEVICE
// here; only the per-bucket average ever leaves the device. Cadence is tunable in cmfConfig
// (now ~2.5s for a near-live teacher view).

import { CMF } from './cmfConfig';

export const BUCKET_MS = CMF.bucketMs;

export function bucketStartFor(tsMs: number, bucketMs = BUCKET_MS): number {
  return Math.floor(tsMs / bucketMs) * bucketMs;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** A per-frame sample: a record of named scalars (engagement + sub-metrics). */
export type Sample = Record<string, number>;

function averageSample(samples: Sample[]): Sample {
  const out: Sample = {};
  for (const key of Object.keys(samples[0])) out[key] = average(samples.map((s) => s[key]));
  return out;
}

/**
 * Aggregates per-frame samples into fixed-duration buckets. Calls `onBucket(bucketStartMs, avg)`
 * when a bucket closes, where `avg` is the per-key average over the bucket. Raw per-frame samples
 * never leave this object — ONLY the per-bucket aggregate record is emitted.
 */
export class Bucketer {
  private currentStart = -1;
  private samples: Sample[] = [];

  constructor(
    private readonly onBucket: (bucketStartMs: number, avg: Sample) => void,
    private readonly bucketMs = BUCKET_MS,
  ) {}

  add(tsMs: number, sample: Sample): void {
    const start = bucketStartFor(tsMs, this.bucketMs);
    if (this.currentStart === -1) this.currentStart = start;
    if (start !== this.currentStart) {
      this.flush();
      this.currentStart = start;
    }
    this.samples.push(sample);
  }

  /** Emit the in-progress bucket (e.g. on session end) and reset. */
  flush(): void {
    if (this.currentStart !== -1 && this.samples.length > 0) {
      this.onBucket(this.currentStart, averageSample(this.samples));
    }
    this.samples = [];
  }
}
