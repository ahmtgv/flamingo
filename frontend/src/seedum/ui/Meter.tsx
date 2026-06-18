import styles from './seedum.module.css';

/**
 * Display-only token meter, 0..100. One track + one accent fill (width = value) — no
 * qualitative bands, no traffic-light coloring (calm by design; "more" is not "good/bad",
 * it's just the value). `ariaLabel` carries the localized name + value; `value === null`
 * renders an empty track (ariaLabel should already read "нет данных").
 */
export function Meter({ value, ariaLabel }: { value: number | null; ariaLabel: string }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    // role="img" (not role="meter"): parity with AttentionChart + uniform SR output, and these
    // values mutate every ~2.5s — we deliberately avoid aria-valuenow polling. The visible
    // number always carries the meaning (a11y: never color-only).
    <span className={styles.meterTrack} role="img" aria-label={ariaLabel}>
      <span className={styles.meterFill} style={{ inlineSize: `${pct}%` }} aria-hidden="true" />
    </span>
  );
}
