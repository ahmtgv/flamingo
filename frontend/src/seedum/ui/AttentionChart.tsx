import styles from './seedum.module.css';

/** Inline SVG sparkline of recent attention values (0..100), on design tokens.
 * Fed by the local pipeline for the student's own view, or by aggregates. */
export function AttentionChart({
  values,
  width = 280,
  height = 64,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length === 0) return <div className={styles.chartEmpty} aria-hidden="true" />;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (Math.max(0, Math.min(100, v)) / 100) * height).toFixed(1)}`)
    .join(' ');
  const last = values[values.length - 1];
  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Внимание: ${last}`}
    >
      <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
    </svg>
  );
}
