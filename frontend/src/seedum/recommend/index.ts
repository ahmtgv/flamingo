/**
 * SEduM · recommend (Bioimef) — study-rhythm suggestions.
 *
 * Kept apart from ../cmf for the same reason as ../selfreport, plus one of its own
 * (docs/rnd/RND_01_JURISDICTION.md §4, matrix row (g)): a recommendation built on
 * camera-derived signals inherits the AI Act art. 5(1)(f) prohibition, while one built on
 * self-report and explicit preferences does not. The EU profile is therefore
 * `cmf=off, selfreport=on, recommend=on (self-report input only)`, and that is expressible
 * here as a type: `RecommendationInput` accepts self-declared readings, so a camera-derived
 * signal is not assignable to it.
 *
 * **This module must never import from ../cmf** (`seedum/boundary.test.ts` enforces it).
 *
 * Two substantive limits from the research, for whoever implements the rules:
 *  - SanPiN 1.2.3685-21 continuous-screen-time limits per school year are a hard constraint,
 *    not a parameter to optimise against;
 *  - a personal claim about time-of-day needs enough observations behind it; below that,
 *    the honest form is a population statement, not a statement about this child.
 */

import type { SelfReportSnapshot } from '../selfreport';

/** The only input shape a recommendation may be computed from. */
export interface RecommendationInput {
  readonly selfReport: SelfReportSnapshot;
  /** Choices the learner made explicitly (preferred study times, session length, …). */
  readonly explicitPreferences: Readonly<Record<string, string | number | boolean>>;
}

/** Feature key in the server-side policy matrix (backend/common/compliance/matrix.json). */
export const RECOMMEND_FEATURE = 'recommend_schedule';
