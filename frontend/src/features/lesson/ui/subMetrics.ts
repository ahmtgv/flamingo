/** Latest per-student sub-metrics off attentionUpdates. All nullable over the wire
 *  (the sub-metrics are live-only — broadcast, never persisted). Display data only. */
export interface StudentSubMetrics {
  gaze: number | null;
  eyes: number | null;
  alert: number | null;
  yaw: number | null;
  pitch: number | null;
}

export const EMPTY_SUB: StudentSubMetrics = {
  gaze: null,
  eyes: null,
  alert: null,
  yaw: null,
  pitch: null,
};
