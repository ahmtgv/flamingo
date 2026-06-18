import { Eye, Focus, type LucideIcon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { headState } from '@/seedum';
import { Badge, type BadgeTone } from '@/shared/ui';

import styles from './liveroom.module.css';
import type { StudentSubMetrics } from './subMetrics';

/** One compact, fixed-position stat cell: icon + raw value (or «—» when no reading). The
 *  invariant column order across cards is what lets the teacher scan 5 students at a glance. */
function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | null }) {
  const { t } = useTranslation('seedum');
  const text = value == null ? t('cell.noData') : t('cell.value', { n: value });
  const aria = value == null ? t('cell.ariaNoData', { label }) : t('cell.aria', { label, n: value });
  return (
    <span className={styles.stat} role="img" aria-label={aria}>
      <Icon size={14} aria-hidden />
      {text}
    </span>
  );
}

/**
 * TEACHER per-student strip: gaze · alertness · eyes-open · head, in a fixed grid so the columns
 * line up across all (≤5) cards. Display-only, near-live at the 2.5s cadence. Head in/out comes
 * solely from the shared headState (cmfConfig); the one salient mark a busy teacher's eye snaps
 * to is the accent-tone "out" badge — calm coral, never alarm red/amber. Null → «—» / «нет данных»
 * (a missing reading never renders a false «в кадре»).
 */
export function StudentSubRow({ m }: { m: StudentSubMetrics }) {
  const { t } = useTranslation('seedum');
  const state = headState(m.yaw, m.pitch);
  const headText =
    state === 'out'
      ? t('cell.head.out')
      : state === 'unknown'
        ? t('cell.head.noData')
        : t('cell.head.in');
  const headTone: BadgeTone = state === 'out' ? 'accent' : 'neutral';
  return (
    <div className={styles.subRow}>
      <Stat icon={Focus} label={t('cell.gaze')} value={m.gaze} />
      <Stat icon={Sun} label={t('cell.alertness')} value={m.alert} />
      <Stat icon={Eye} label={t('cell.eyes')} value={m.eyes} />
      {/* role="img" + aria-label gives SR users the full "Положение головы: …" context;
          the visible Badge carries it as text + tone (never color-only). */}
      <span className={styles.headCell} role="img" aria-label={t('cell.head.aria', { state: headText })}>
        <Badge tone={headTone} dot>
          {headText}
        </Badge>
      </span>
    </div>
  );
}
