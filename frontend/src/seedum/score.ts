// Pure attention scoring. Maps ALREADY-DERIVED on-device face signals (computed
// in the Web Worker from MediaPipe FaceLandmarker) to a single 0..100 number.
// No raw frames or landmarks are retained or passed around — only these signals.

export interface AttentionSignals {
  facePresent: boolean;
  eyeOpenness: number; // 0..1 (1 = fully open)
  gazeCenter: number; // 0..1 (1 = looking at the screen)
  headForward: number; // 0..1 (1 = facing the screen)
}

export interface Baseline {
  gazeCenter: number; // the user's calibrated focused reference (≈1)
  headForward: number;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

function normalize(value: number, base: number): number {
  if (base <= 0) return clamp01(value);
  return clamp01(value / base);
}

/**
 * Combine face signals into an attention score 0..100. When a calibration
 * `baseline` is given, gaze/head are normalized against the user's personal
 * focused reference (the "база тест" result).
 */
export function scoreAttention(s: AttentionSignals, baseline?: Baseline): number {
  if (!s.facePresent) return 0;
  const gaze = baseline ? normalize(s.gazeCenter, baseline.gazeCenter) : clamp01(s.gazeCenter);
  const head = baseline ? normalize(s.headForward, baseline.headForward) : clamp01(s.headForward);
  const raw = 0.45 * gaze + 0.35 * head + 0.2 * clamp01(s.eyeOpenness);
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}
