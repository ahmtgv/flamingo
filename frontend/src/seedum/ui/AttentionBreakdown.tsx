import { Eye, Focus, type LucideIcon, Sun, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge, type BadgeTone } from '@/shared/ui';

import type { BucketAggregate } from '../attention';
import { headState } from '../headTolerance';

import { HeadPoseBox } from './HeadPoseBox';
import { Meter } from './Meter';
import styles from './seedum.module.css';

/** One linear sub-metric row: icon + label · accent meter · raw value. No bands, no verdict. */
function MetricRow({
  icon: Icon,
  label,
  value,
  valueText,
  ariaLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  valueText: string;
  ariaLabel: string;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>
        <Icon size={16} aria-hidden />
        {label}
      </span>
      <Meter value={value} ariaLabel={ariaLabel} />
      <span className={styles.rowValue}>{valueText}</span>
    </div>
  );
}

/**
 * STUDENT self-view breakdown: a calm, encouraging read of what makes up the engagement number
 * (gaze / eye-openness / alertness as accent meters, head as a position box). Display-only —
 * fed by the on-device bucket aggregate; no value-band cutoffs, no alarm colors. Updates each
 * ~2.5s bucket. NOT in an aria-live region (passive read; a per-bucket announcement would spam).
 */
export function AttentionBreakdown({ bucket }: { bucket: BucketAggregate }) {
  const { t } = useTranslation('seedum');
  const meterAria = (label: string, n: number) => t('breakdown.meterAria', { label, n });
  const valuePct = (n: number) => t('breakdown.valuePct', { n });

  const state = headState(bucket.headYaw, bucket.headPitch);
  const headText =
    state === 'out'
      ? t('breakdown.headPose.turned')
      : state === 'unknown'
        ? t('breakdown.headPose.noData')
        : t('breakdown.headPose.inFrame');
  const headTone: BadgeTone = state === 'out' ? 'accent' : 'neutral';
  const fmtDeg = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <div className={styles.breakdown}>
      <p className={styles.breakdownTitle}>{t('breakdown.title')}</p>
      <div className={styles.list}>
        <MetricRow
          icon={Focus}
          label={t('breakdown.gaze')}
          value={bucket.gazeOnScreen}
          valueText={valuePct(bucket.gazeOnScreen)}
          ariaLabel={meterAria(t('breakdown.gaze'), bucket.gazeOnScreen)}
        />
        <MetricRow
          icon={Eye}
          label={t('breakdown.eyeOpenness')}
          value={bucket.eyeOpenness}
          valueText={valuePct(bucket.eyeOpenness)}
          ariaLabel={meterAria(t('breakdown.eyeOpenness'), bucket.eyeOpenness)}
        />
        <MetricRow
          icon={Sun}
          label={t('breakdown.alertness')}
          value={bucket.alertness}
          valueText={valuePct(bucket.alertness)}
          ariaLabel={meterAria(t('breakdown.alertness'), bucket.alertness)}
        />

        <div className={styles.poseRow}>
          <span className={styles.poseHead}>
            <span className={styles.rowLabel}>
              <UserRound size={16} aria-hidden />
              {t('breakdown.headPose.label')}
            </span>
            <Badge tone={headTone} dot>
              {headText}
            </Badge>
          </span>
          <div className={styles.poseBody}>
            <HeadPoseBox
              yaw={bucket.headYaw}
              pitch={bucket.headPitch}
              ariaLabel={t('breakdown.headPose.aria', { state: headText })}
            />
            {state !== 'unknown' && (
              <span className={styles.poseDeg}>
                {t('breakdown.headPose.angles', {
                  yaw: fmtDeg(Math.round(bucket.headYaw)),
                  pitch: fmtDeg(Math.round(bucket.headPitch)),
                })}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className={styles.hint}>{t('breakdown.hint')}</p>
    </div>
  );
}
