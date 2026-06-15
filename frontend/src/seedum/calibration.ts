// The 3-stage baseline test ("база тест", Product Brief MVP). Drives FOCUS →
// READ → RELAX, collecting on-device signal samples per stage and deriving a
// personal Baseline that normalizes the attention score and seeds the UBP.
// Pure state machine — no media is stored.

import type { AttentionSignals, Baseline } from './score';

export type CalibrationStage = 'focus' | 'read' | 'relax';
export const CALIBRATION_STAGES: CalibrationStage[] = ['focus', 'read', 'relax'];

export interface CalibrationResult {
  baseline: Baseline;
  samplesPerStage: Record<CalibrationStage, number>;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export class Calibration {
  private index = 0;
  private readonly samples: Record<CalibrationStage, AttentionSignals[]> = {
    focus: [],
    read: [],
    relax: [],
  };

  get stage(): CalibrationStage | null {
    return this.done ? null : CALIBRATION_STAGES[this.index];
  }

  get done(): boolean {
    return this.index >= CALIBRATION_STAGES.length;
  }

  get progress(): number {
    return this.index / CALIBRATION_STAGES.length;
  }

  /** Record a sample for the current stage. */
  record(signals: AttentionSignals): void {
    const stage = this.stage;
    if (stage) this.samples[stage].push(signals);
  }

  /** Advance to the next stage. */
  next(): void {
    if (!this.done) this.index += 1;
  }

  /** Derive the baseline from the FOCUS stage (the user's "attentive" reference). */
  finish(): CalibrationResult {
    const focus = this.samples.focus;
    return {
      baseline: {
        gazeCenter: mean(focus.map((s) => s.gazeCenter)) || 1,
        headForward: mean(focus.map((s) => s.headForward)) || 1,
      },
      samplesPerStage: {
        focus: this.samples.focus.length,
        read: this.samples.read.length,
        relax: this.samples.relax.length,
      },
    };
  }
}
