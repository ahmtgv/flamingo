/**
 * SEduM · self-report — what the learner tells us about their own state.
 *
 * This module exists as a SEPARATE module for a legal reason, not a tidiness one
 * (docs/rnd/RND_01_JURISDICTION.md §3). Inferring emotion from a camera is prohibited in EU
 * education (AI Act art. 5(1)(f)); a person's own statement about how they feel is not
 * biometric data at all, so Guidelines cl. 251/265 place it outside that prohibition. It is
 * therefore the module that can legally carry this product's value in the EU.
 *
 * That exemption survives only while the two stay apart. Combining a self-report with
 * camera-derived signals — in one model, one score, even one blended display — reintroduces
 * the biometric element and pulls the whole thing back inside the prohibition. Hence:
 *
 *   **This module must never import from ../cmf, and ../cmf must never import from it.**
 *
 * `seedum/boundary.test.ts` enforces that as a build-time check rather than a convention.
 */

/** A single self-declared reading. Deliberately carries no derived score: the value is the
 *  learner's own answer, on a scale they were shown, at a moment they chose. */
export interface SelfReportEntry {
  /** Question the learner answered, e.g. 'energy' | 'focus_felt' | 'difficulty'. */
  readonly prompt: string;
  /** The learner's answer on the prompt's own scale (see `scaleMax`). */
  readonly value: number;
  readonly scaleMax: number;
  /** When the learner answered (ISO-8601). */
  readonly at: string;
}

/** Everything this module may hand downstream: self-declared readings, nothing else.
 *  The type is the contract — a camera-derived reading is not assignable to it. */
export interface SelfReportSnapshot {
  readonly entries: readonly SelfReportEntry[];
}

/** Feature key in the server-side policy matrix (backend/common/compliance/matrix.json).
 *  The client asks for the module; the server decides whether the tenant may use it. */
export const SELFREPORT_FEATURE = 'selfreport_state';
