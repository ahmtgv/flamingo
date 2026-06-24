import styles from './seedum.module.css';

export type MeterTone = 'accent' | 'mono';

/**
 * Display-only token meter, 0..100. One track + one fill (width = value) — no qualitative
 * bands, no traffic-light coloring (calm by design; "more" is not "good/bad", it's just the
 * value). `tone='accent'` (default) fills with the brand accent; `tone='mono'` fills near-white
 * for the monochrome strip over the dark video. `ariaLabel` carries the localized name + value;
 * `value === null` renders an empty track (ariaLabel should already read "нет данных").
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
  const fillClass =
    tone === 'mono' ? `${styles.meterFill} ${styles.meterFillMono}` : styles.meterFill;
  return (
    // role="img" (not role="meter"): parity with AttentionChart + uniform SR output, and these
    // values mutate every ~2.5s — we deliberately avoid aria-valuenow polling. The visible
    // number always carries the meaning (a11y: never color-only).
    <span className={styles.meterTrack} role="img" aria-label={ariaLabel}>
      <span className={fillClass} style={{ inlineSize: `${pct}%` }} aria-hidden="true" />
    </span>
  );
}
