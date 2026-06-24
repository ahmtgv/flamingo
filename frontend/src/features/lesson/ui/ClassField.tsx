import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CMF } from '@/seedum/cmfConfig';

import styles from './ClassField.module.css';

export interface FieldStudent {
  id: string;
  value: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
// Engagement → graphite DENSITY (fill opacity) + SIZE (scale). Pure display mappings (runtime
// data, not thresholds): attentive = denser/larger, drifting = fainter/smaller.
const density = (v: number) => 0.18 + clamp01(v / 100) * 0.72; // 0.18 .. 0.90
const orbScale = (v: number) => 0.55 + clamp01(v / 100) * 0.45; // 0.55 .. 1.0

/**
 * TEACHER ambient class field. Each student is a soft graphite orb whose grayscale density + size
 * encode engagement (NOT hue); name + exact % below. Orbs hold STABLE positions (rendered in the
 * subscription's insertion order, never reordered) so only density/size transition as values
 * change. The single restrained accent — a thin ring + a «нужно внимание» text tag (tag always
 * accompanies the ring → never color-only) — marks a student below the cmfConfig cutoff. Subtle
 * breathing motion, disabled under prefers-reduced-motion. Display-only; engagement only.
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
        <ul className={styles.field}>
          {students.map((s) => {
            const low = s.value < CMF.liveAttentionAlertBelow;
            return (
              <li key={s.id} className={styles.cell}>
                <span className={styles.orb} data-low={low}>
                  <span
                    className={styles.orbFill}
                    style={{ opacity: density(s.value), transform: `scale(${orbScale(s.value)})` }}
                    aria-hidden="true"
                  />
                </span>
                {!hideNames && <span className={styles.name}>{nameFor(s.id)}</span>}
                <span className={styles.value}>{t('field.valuePct', { n: s.value })}</span>
                {low && <span className={styles.tag}>{t('field.needsAttention')}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
