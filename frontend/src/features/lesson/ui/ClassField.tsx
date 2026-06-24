import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { headState } from '@/seedum';
import { CMF } from '@/seedum/cmfConfig';
import { Meter } from '@/seedum/ui/Meter';

import styles from './ClassField.module.css';

export interface FieldStudent {
  id: string;
  value: number; // engagement (avgAttention)
  // Live-only sub-metrics (display only; revealed on orb click). All nullable over the wire.
  gaze: number | null;
  eyes: number | null;
  headYaw: number | null;
  headPitch: number | null;
  alert: number | null;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
// Engagement → graphite DENSITY (fill opacity) + SIZE (scale). Pure display mappings (runtime
// data, not thresholds): attentive = denser/larger, drifting = fainter/smaller.
const density = (v: number) => 0.18 + clamp01(v / 100) * 0.72; // 0.18 .. 0.90
const orbScale = (v: number) => 0.55 + clamp01(v / 100) * 0.45; // 0.55 .. 1.0

/** Sub-metric detail row — reuses the student strip's Meter grammar (graphite on light surface). */
function DetailRow({ label, value, valueText, ariaLabel }: { label: string; value: number | null; valueText: string; ariaLabel: string }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <Meter value={value} ariaLabel={ariaLabel} tone="graphite" />
      <span className={styles.detailValue}>{valueText}</span>
    </div>
  );
}

/**
 * TEACHER ambient class field. Each student is a soft graphite orb whose grayscale density + size
 * encode engagement (NOT hue); name + exact % below. Orbs hold STABLE positions (rendered in the
 * subscription's insertion order, never reordered). The single restrained accent — a thin ring +
 * a «нужно внимание» text tag (never color-only) — marks a student below the cmfConfig cutoff.
 * Clicking an orb (keyboard-operable; Esc / second click collapses; one at a time) reveals THAT
 * student's sub-metrics in a calm detail panel — the rest of the field stays ambient. Display-only.
 */
export function ClassField({
  students,
  nameFor,
  classAvg,
}: {
  students: FieldStudent[];
  nameFor: (id: string) => string;
  classAvg: number;
}) {
  const { t } = useTranslation('seedum');
  const [hideNames, setHideNames] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelId = useId();

  // Esc collapses the open detail (manual only; no auto-collapse on value updates).
  useEffect(() => {
    if (!selectedId) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const selected = selectedId ? (students.find((s) => s.id === selectedId) ?? null) : null;
  const pctText = (v: number | null) => (v == null ? '—' : t('strip.valuePct', { n: v }));
  const meterAria = (label: string, v: number | null) =>
    v == null ? `${label}: —` : t('strip.meterAria', { label, n: v });

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <span className={styles.classAvg}>{t('field.classAverage', { n: classAvg })}</span>
        <button
          type="button"
          className={styles.namesToggle}
          aria-pressed={hideNames}
          onClick={() => setHideNames((v) => !v)}
        >
          {hideNames ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
          {hideNames ? t('field.showNames') : t('field.hideNames')}
        </button>
      </div>

      {students.length === 0 ? (
        <p className={styles.waiting}>{t('field.waiting')}</p>
      ) : (
        <>
          <ul className={styles.field}>
            {students.map((s) => {
              const low = s.value < CMF.liveAttentionAlertBelow;
              const isOpen = selectedId === s.id;
              return (
                <li key={s.id} className={styles.cell}>
                  <button
                    type="button"
                    className={styles.orb}
                    data-low={low}
                    data-selected={isOpen}
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? panelId : undefined}
                    aria-label={t('field.orbAria', { name: nameFor(s.id), n: s.value })}
                    onClick={() => setSelectedId((cur) => (cur === s.id ? null : s.id))}
                  >
                    <span
                      className={styles.orbFill}
                      style={{ opacity: density(s.value), transform: `scale(${orbScale(s.value)})` }}
                      aria-hidden="true"
                    />
                  </button>
                  {!hideNames && <span className={styles.name}>{nameFor(s.id)}</span>}
                  <span className={styles.value}>{t('field.valuePct', { n: s.value })}</span>
                  {low && <span className={styles.tag}>{t('field.needsAttention')}</span>}
                </li>
              );
            })}
          </ul>

          {selected && (
            <div id={panelId} className={styles.detail}>
              <p className={styles.detailName}>{nameFor(selected.id)}</p>
              <div className={styles.detailList}>
                <DetailRow
                  label={t('strip.gaze')}
                  value={selected.gaze}
                  valueText={pctText(selected.gaze)}
                  ariaLabel={meterAria(t('strip.gaze'), selected.gaze)}
                />
                <DetailRow
                  label={t('strip.eyes')}
                  value={selected.eyes}
                  valueText={pctText(selected.eyes)}
                  ariaLabel={meterAria(t('strip.eyes'), selected.eyes)}
                />
                {(() => {
                  const head = headState(selected.headYaw, selected.headPitch);
                  const headText = t(`strip.headState.${head}`);
                  return (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>{t('strip.head')}</span>
                      <Meter
                        value={head === 'unknown' ? null : head === 'in' ? 100 : 0}
                        ariaLabel={t('strip.headAria', { state: headText })}
                        tone="graphite"
                      />
                      <span className={styles.detailValue}>{headText}</span>
                    </div>
                  );
                })()}
                <DetailRow
                  label={t('strip.alertness')}
                  value={selected.alert}
                  valueText={pctText(selected.alert)}
                  ariaLabel={meterAria(t('strip.alertness'), selected.alert)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
