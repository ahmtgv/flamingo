// Pure helpers for the teacher's live class-attention view. The DATA is correct
// (one aggregate per ~10s bucket); these keep the RENDERING honest:
//  - a 0 means "no reading this bucket" (no face) — NOT "0 attention";
//  - the live line HOLDS the last real value across no-reading buckets (no saw-tooth);
//  - the summary is computed from real (non-zero) received buckets only — never from gaps.

/** Class average over students with a real (non-zero) reading this bucket; 0 if none. */
export function classAverage(latestPerStudent: number[]): number {
  const live = latestPerStudent.filter((v) => v > 0);
  if (live.length === 0) return 0;
  return Math.round(live.reduce((a, b) => a + b, 0) / live.length);
}

/** Step/hold: a no-reading bucket (avg 0) holds the previous value instead of decaying to 0. */
export function heldValue(prevClassAvg: number, avg: number): number {
  return avg > 0 ? avg : prevClassAvg;
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
