import { CMF } from '../cmfConfig';
import { headState, POSE_AXIS_MULTIPLE } from '../headTolerance';

import styles from './seedum.module.css';

const HALF = 46; // SVG box half-span in viewBox units (geometry — NOT a metric cutoff)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * A framed "screen" with a dot: x ← headYaw, y ← headPitch (pitch negated so "look up" reads
 * up). The inner tolerance frame is DRAWN from cmfConfig, so retuning the tolerance moves both
 * the badge boundary (via headState) and the drawn frame together — zero UI edits. When the
 * reading is missing (unknown) the dot is not plotted (never shown falsely centred/in-frame).
 */
export function HeadPoseBox({
  yaw,
  pitch,
  ariaLabel,
}: {
  yaw: number | null | undefined;
  pitch: number | null | undefined;
  ariaLabel: string;
}) {
  const state = headState(yaw, pitch);
  const yawRange = CMF.headYawToleranceDeg * POSE_AXIS_MULTIPLE;
  const pitchRange = CMF.headPitchToleranceDeg * POSE_AXIS_MULTIPLE;
  const cx = 50 + clamp((yaw ?? 0) / yawRange, -1, 1) * HALF;
  const cy = 50 - clamp((pitch ?? 0) / pitchRange, -1, 1) * HALF; // minus → up tilt renders up
  // tolerance frame half-extents, derived from config (= HALF / POSE_AXIS_MULTIPLE)
  const tolHalfX = (CMF.headYawToleranceDeg / yawRange) * HALF;
  const tolHalfY = (CMF.headPitchToleranceDeg / pitchRange) * HALF;

  return (
    <svg
      className={styles.poseBox}
      viewBox="0 0 100 100"
      role="img"
      aria-label={ariaLabel}
      focusable="false"
    >
      <rect
        x="3"
        y="3"
        width="94"
        height="94"
        rx="12"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
        strokeWidth="1.5"
        aria-hidden="true"
      />
      <rect
        x={50 - tolHalfX}
        y={50 - tolHalfY}
        width={2 * tolHalfX}
        height={2 * tolHalfY}
        rx="8"
        fill="var(--color-accent-subtle)"
        stroke="var(--color-accent-subtle-border)"
        strokeWidth="1"
        aria-hidden="true"
      />
      <line x1="50" y1="10" x2="50" y2="90" stroke="var(--color-border)" strokeWidth="1" aria-hidden="true" />
      <line x1="10" y1="50" x2="90" y2="50" stroke="var(--color-border)" strokeWidth="1" aria-hidden="true" />
      {state !== 'unknown' && (
        <circle className={styles.poseDot} cx={cx} cy={cy} r="6" fill="var(--color-accent)" aria-hidden="true" />
      )}
    </svg>
  );
}
