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

/**
 * Aggregates per-frame attention scores into fixed-duration buckets. Calls
 * `onBucket(bucketStartMs, avg)` when a bucket closes. Raw per-frame scores never
 * leave this object — only the aggregate is emitted.
 */
export class Bucketer {
  private currentStart = -1;
  private scores: number[] = [];

  constructor(
    private readonly onBucket: (bucketStartMs: number, avg: number) => void,
    private readonly bucketMs = BUCKET_MS,
  ) {}

  add(tsMs: number, score: number): void {
    const start = bucketStartFor(tsMs, this.bucketMs);
    if (this.currentStart === -1) this.currentStart = start;
    if (start !== this.currentStart) {
      this.flush();
      this.currentStart = start;
    }
    this.scores.push(score);
  }

  /** Emit the in-progress bucket (e.g. on session end) and reset. */
  flush(): void {
    if (this.currentStart !== -1 && this.scores.length > 0) {
      this.onBucket(this.currentStart, average(this.scores));
    }
    this.scores = [];
  }
}
