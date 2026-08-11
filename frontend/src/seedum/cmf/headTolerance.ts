// SINGLE source of the head in/out-of-frame decision for the UI. Imported by BOTH the
// student breakdown and the teacher per-student strip so they can never disagree, and
// mirrors the engine predicate (score.ts engagement: head beyond tolerance) INVERTED.
// Tolerances come ONLY from cmfConfig — tuning them later needs no UI edit.

import { CMF } from './cmfConfig';

export type HeadState = 'in' | 'out' | 'unknown';

/**
 * Tri-state head tolerance. `null`/`undefined` → 'unknown' (NEVER a false 'in' — guards the
 * `Math.abs(null) <= tol === true` trap, since the teacher sub-metrics arrive as `number | null`).
 * Beyond tolerance on either axis → 'out'; otherwise 'in'.
 */
export function headState(
  yaw: number | null | undefined,
  pitch: number | null | undefined,
): HeadState {
  if (yaw == null || pitch == null) return 'unknown';
  const out =
    Math.abs(yaw) > CMF.headYawToleranceDeg || Math.abs(pitch) > CMF.headPitchToleranceDeg;
  return out ? 'out' : 'in';
}

/**
 * Display zoom for the student pose box: how far off-axis (in multiples of the tolerance) the
 * dot travels before clamping. A LAYOUT multiple, NOT a metric cutoff — `headState` never reads
 * it, so it cannot move the decision boundary. Lives here with the other tunables so the
 * component carries zero standalone constants.
 */
export const POSE_AXIS_MULTIPLE = 2;
