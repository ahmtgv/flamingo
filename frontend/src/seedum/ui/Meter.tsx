import styles from './seedum.module.css';

export type MeterTone = 'accent' | 'mono' | 'graphite';

const TONE_CLASS: Record<MeterTone, string | undefined> = {
  accent: undefined,
  mono: styles.meterFillMono,
  graphite: styles.meterFillGraphite,
};

/**
 * Display-only token meter, 0..100. One track + one fill (width = value) — no qualitative
 * bands, no traffic-light coloring (calm by design; "more" is not "good/bad", it's just the
 * value). Tone picks the fill: `accent` (default, brand coral); `mono` near-white for the
 * dark frosted strip over the video; `graphite` for a monochrome panel on a light surface.
 * `ariaLabel` carries the localized name + value; `value === null` renders an empty track.
 */
export function Meter({
  value,
  ariaLabel,
  tone = 'accent',
}: {
  value: number | null;
  ariaLabel: string;
  tone?: MeterTone;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const toneClass = TONE_CLASS[tone];
  const fillClass = toneClass ? `${styles.meterFill} ${toneClass}` : styles.meterFill;
  return (
    // role="img" (not role="meter"): parity with AttentionChart + uniform SR output, and these
    // values mutate every ~2.5s — we deliberately avoid aria-valuenow polling. The visible
    // number always carries the meaning (a11y: never color-only).
    <span className={styles.meterTrack} role="img" aria-label={ariaLabel}>
      <span className={fillClass} style={{ inlineSize: `${pct}%` }} aria-hidden="true" />
    </span>
  );
}
