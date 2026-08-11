// Pure attention scoring. Maps ALREADY-DERIVED on-device face signals (computed in the Web
// Worker from MediaPipe FaceLandmarker via metrics.ts) to a single 0..100 engagement number.
// No raw frames or landmarks are retained or passed around — only these derived scalars.

import { CMF } from './cmfConfig';

export interface AttentionSignals {
  facePresent: boolean;
  gazeOnScreen: number; // 0..1 (1 = looking at the screen) — PRIMARY signal
  eyeOpenness: number; // 0..1 (1 = fully open), EAR-derived
  headYaw: number; // degrees (0 = facing screen)
  headPitch: number; // degrees
  alertness: number; // 0..1 (1 = alert) — exposed sub-metric; not folded into engagement (v1)
}

export interface Baseline {
  gazeOnScreen?: number; // the user's calibrated focused reference (≈1) from the «база тест»
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * Composite engagement 0..100. Rules (Product):
 *  - PRIMARY is gaze-on-screen (not head-straightness, not fixation).
 *  - Head tilt alone is NOT penalized — head only lowers the score when beyond tolerance AND
 *    gaze is already off-screen.
 *  - Within-screen saccades stay attentive (gazeOnScreen is a region confidence, not fixation).
 *  - Eyes closed (sustained) lowers it; brief blinks are smoothed upstream (EMA + bucket).
 * When a calibration `baseline` is given, gaze is normalized against the user's focused reference.
 */
export function engagementScore(s: AttentionSignals, baseline?: Baseline): number {
  if (!s.facePresent) return 0;
  let gaze = clamp01(s.gazeOnScreen);
  if (baseline?.gazeOnScreen && baseline.gazeOnScreen > 0) gaze = clamp01(gaze / baseline.gazeOnScreen);
  let score = gaze * clamp01(s.eyeOpenness);
  const headOut =
    Math.abs(s.headYaw) > CMF.headYawToleranceDeg ||
    Math.abs(s.headPitch) > CMF.headPitchToleranceDeg;
  if (headOut && s.gazeOnScreen < CMF.gazeOffScreenConfidence) score *= CMF.headOffScreenPenalty;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}
