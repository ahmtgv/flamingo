/** Shared lesson-room view types. */

/** Per-student live view row (teacher): engagement + the live-only sub-metrics (display only,
 *  never persisted/egressed). Populated from the attentionUpdates subscription. */
export interface FieldStudent {
  id: string;
  value: number; // engagement (avgAttention)
  gaze: number | null;
  eyes: number | null;
  headYaw: number | null;
  headPitch: number | null;
  alert: number | null;
}
