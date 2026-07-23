// Pure helpers for the teacher's live class-attention view. The DATA is correct (one aggregate
// per ~10s bucket); these keep the RENDERING honest under the C-display-1 rule:
//  - a genuine 0 = "present but fully disengaged" and COUNTS in the class average;
//  - "no reading" is ABSENCE — no-face buckets are never reported, so the record goes stale
//    (freshValue → null); such students are EXCLUDED from the average (not read as 0);
//  - the live line HOLDS the last class value only across a no-reading gap (null), not a 0.

/** Class average over the FRESH readings, INCLUDING genuine 0s (present-but-disengaged).
 *  Returns null when there are no fresh readings — the caller holds the previous value. */
export function classAverage(freshValues: number[]): number | null {
  if (freshValues.length === 0) return null;
  return Math.round(freshValues.reduce((a, b) => a + b, 0) / freshValues.length);
}

/** Hold the previous class average only across a no-reading gap (avg null); a genuine 0
 *  (everyone present-but-disengaged) is a real value and replaces the held one. */
export function heldValue(prevClassAvg: number, avg: number | null): number {
  return avg == null ? prevClassAvg : avg;
}

/**
 * B-9 (0-vs-null): a reading is only live while buckets keep arriving. No-face buckets are
 * never reported (the worker skips them), so a student who left the frame simply goes
 * silent — after `staleMs` the tile honestly shows «нет данных» instead of a frozen number.
 */
export function freshValue<T>(
  rec: (T & { at: number }) | undefined,
  nowMs: number,
  staleMs: number,
): T | null {
  if (!rec) return null;
  return nowMs - rec.at <= staleMs ? rec : null;
}

/** Append one reading to a per-student series, capped to the most recent `cap` points
 *  (keeps each student's live sparkline bounded — purely a display buffer). */
export function pushSeries(prev: number[], value: number, cap = 60): number[] {
  return [...prev, value].slice(-cap);
}

export interface AttentionSummary {
  averageAttention: number;
  peak: number;
  low: number;
}

/** Среднее/Пик/Минимум from real received buckets only (never the between-bucket zeros). */
export function summaryStats(received: number[]): AttentionSummary | null {
  if (received.length === 0) return null;
  return {
    averageAttention: Math.round(received.reduce((a, b) => a + b, 0) / received.length),
    peak: Math.max(...received),
    low: Math.min(...received),
  };
}
