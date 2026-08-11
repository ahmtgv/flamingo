// Pure on-device metric helpers. Each maps ALREADY-DERIVED MediaPipe outputs (blendshape
// scores, eyelid landmarks, the face transformation matrix) to a derived scalar. Frames and
// raw landmarks stay in the worker; these return only scalars. All thresholds come from
// cmfConfig (one place to tune). Pure + deterministic → unit-testable without a camera.

import { CMF } from './cmfConfig';

export type Blend = (name: string) => number;
export interface Point {
  x: number;
  y: number;
  z?: number;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * On-screen gaze confidence (0..1) from the 8 gaze blendshapes (v1, blendshape-based). Per eye:
 * horizontal deviation = max(in,out), vertical = max(up,down); offset = mean magnitude across
 * eyes; confidence ramps 1 (centered) → 0 (offset ≥ span). It's a REGION confidence, not
 * fixation — so small within-screen saccades stay ≈1 (no fixation required). Iris-landmark gaze
 * is a deferred v2 upgrade if this proves too rough on a real camera.
 */
export function gazeOnScreen(blend: Blend): number {
  const g = CMF.gazeBlendshapes;
  const hL = Math.max(blend(g.inLeft), blend(g.outLeft));
  const vL = Math.max(blend(g.upLeft), blend(g.downLeft));
  const hR = Math.max(blend(g.inRight), blend(g.outRight));
  const vR = Math.max(blend(g.upRight), blend(g.downRight));
  const offset = (Math.hypot(hL, vL) + Math.hypot(hR, vR)) / 2;
  return clamp01(1 - offset / CMF.gazeOffScreenSpan);
}

interface EyeSpec {
  h: readonly number[];
  v: readonly (readonly number[])[];
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function earOfEye(landmarks: Point[], eye: EyeSpec): number {
  const h = dist(landmarks[eye.h[0]], landmarks[eye.h[1]]);
  if (h <= 0) return 0;
  const v = eye.v.reduce((s, [a, b]) => s + dist(landmarks[a], landmarks[b]), 0) / eye.v.length;
  return v / h;
}

/**
 * Eye openness 0..1 (1 = open) via the Eye Aspect Ratio (vertical lid gap ÷ eye width) averaged
 * over both eyes, mapped through earClosed..earOpen. Falls back to `fallbackOpenness` (the blink
 * blendshape openness) when refined landmarks are unavailable.
 */
export function eyeOpennessEAR(landmarks: Point[] | undefined, fallbackOpenness: number): number {
  if (!landmarks || landmarks.length < 478) return clamp01(fallbackOpenness);
  const raw =
    (earOfEye(landmarks, CMF.eyeLandmarks.left) + earOfEye(landmarks, CMF.eyeLandmarks.right)) / 2;
  return clamp01((raw - CMF.earClosed) / (CMF.earOpen - CMF.earClosed));
}

/**
 * Head yaw/pitch (degrees) from the 4×4 facial transformation matrix (column-major 16-array).
 * v1: derived from the face FORWARD vector (column 2 = m[8],m[9],m[10]); identity → (0,0).
 * Provisional — sign/convention to validate on a real camera (head only matters when gaze is
 * also off-screen, so a rough value is acceptable for v1).
 */
export function headEuler(matrix: number[] | undefined): { yaw: number; pitch: number } {
  if (!matrix || matrix.length < 16) return { yaw: 0, pitch: 0 };
  const fx = matrix[8];
  const fy = matrix[9];
  const fz = matrix[10];
  return {
    yaw: (Math.atan2(fx, fz) * 180) / Math.PI,
    pitch: (Math.atan2(fy, fz) * 180) / Math.PI,
  };
}

/** Exponential moving average — smooths the per-frame engagement (worker holds the prev value). */
export function ema(prev: number, value: number, alpha: number = CMF.emaAlpha): number {
  return prev + alpha * (value - prev);
}

/**
 * Alert-vs-drowsy estimator (temporal). Counts blinks (openness dipping below `blinkClosed` then
 * recovering above `blinkOpen`) over a rolling window → blink rate, combined with sustained mean
 * openness (heavy lids). Returns 0..1 (1 = alert). Deterministic given the (ts, openness) stream
 * (no wall-clock) → unit-testable. Only scalars in/out; no frames or landmarks.
 */
export class AlertnessTracker {
  private blinks: number[] = [];
  private opens: Array<readonly [number, number]> = [];
  private closed = false;

  add(tsMs: number, openness: number): void {
    const a = CMF.alertness;
    if (!this.closed && openness <= a.blinkClosedOpenness) {
      this.closed = true;
    } else if (this.closed && openness >= a.blinkOpenOpenness) {
      this.closed = false;
      this.blinks.push(tsMs);
    }
    this.opens.push([tsMs, openness]);
    const cutoff = tsMs - a.windowMs;
    this.blinks = this.blinks.filter((t) => t >= cutoff);
    this.opens = this.opens.filter(([t]) => t >= cutoff);
  }

  value(nowMs: number): number {
    if (this.opens.length === 0) return 1;
    const a = CMF.alertness;
    const spanMs = Math.max(a.windowMs, nowMs - this.opens[0][0]);
    const blinkRate = this.blinks.length / (spanMs / 60_000); // blinks per minute
    const rateFactor =
      blinkRate <= a.drowsyBlinkRatePerMin
        ? 1
        : Math.max(0.4, 1 - (blinkRate - a.drowsyBlinkRatePerMin) / a.drowsyBlinkRatePerMin);
    const meanOpen = this.opens.reduce((s, [, o]) => s + o, 0) / this.opens.length;
    const openFactor = clamp01(meanOpen / a.drowsyOpenness);
    return clamp01(Math.min(rateFactor, openFactor));
  }
}
