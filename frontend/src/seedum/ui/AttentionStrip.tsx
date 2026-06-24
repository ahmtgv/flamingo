import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BucketAggregate } from '../attention';
import { headState } from '../headTolerance';

import styles from './AttentionStrip.module.css';
import { Meter } from './Meter';

type CmfStatus = 'starting' | 'running' | 'unavailable';

/** One expanded sub-metric row: label + slim mono meter + value (same grammar everywhere). */
function Row({ label, value, valueText, ariaLabel }: { label: string; value: number | null; valueText: string; ariaLabel: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <Meter value={value} ariaLabel={ariaLabel} tone="mono" />
      <span className={styles.rowValue}>{valueText}</span>
    </div>
  );
}

/**
 * STUDENT self-view attention strip — a frosted, monochrome strip pinned over the top of the
 * student's own video tile. Collapsed: «Внимание» + fill meter + number. The chevron expands the
 * four sub-metrics downward (gaze / eyes / head-in-frame / alertness). Display-only: driven by the
 * on-device bucket aggregate (the same data already sent via reportAttention); no value-band
 * verdicts, no color. Manual toggle only; starts collapsed each session.
 */
export function AttentionStrip({ bucket, status }: { bucket: BucketAggregate | null; status: CmfStatus }) {
  const { t } = useTranslation('seedum');
  const [expanded, setExpanded] = useState(false);

  const running = status === 'running' && bucket != null;
  const engagement = running ? bucket.avgAttention : null;
  const valuePct = (n: number) => t('strip.valuePct', { n });
  const meterAria = (label: string, n: number | null) =>
    n == null ? `${label}: —` : t('strip.meterAria', { label, n });

  const head = running ? headState(bucket.headYaw, bucket.headPitch) : 'unknown';
  const headText = t(`strip.headState.${head}`);

  return (
    <div className={styles.strip} data-open={expanded}>
      <div className={styles.head}>
        <span className={styles.headLabel}>{t('strip.title')}</span>
        <Meter value={engagement} ariaLabel={meterAria(t('strip.title'), engagement)} tone="mono" />
        <span className={styles.headValue}>
          {status === 'unavailable' ? t('strip.unavailable') : engagement == null ? '—' : engagement}
        </span>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-label={t('strip.toggle')}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown className={styles.chevron} size={16} aria-hidden="true" />
        </button>
      </div>

      {expanded && (
        <div className={styles.list}>
          <Row
            label={t('strip.gaze')}
            value={running ? bucket.gazeOnScreen : null}
            valueText={running ? valuePct(bucket.gazeOnScreen) : '—'}
            ariaLabel={meterAria(t('strip.gaze'), running ? bucket.gazeOnScreen : null)}
          />
          <Row
            label={t('strip.eyes')}
            value={running ? bucket.eyeOpenness : null}
            valueText={running ? valuePct(bucket.eyeOpenness) : '—'}
            ariaLabel={meterAria(t('strip.eyes'), running ? bucket.eyeOpenness : null)}
          />
          {/* Head row: an in-frame indicator (full = in frame), state carried by text — NOT a
              0..100 value. State comes solely from headState (cmfConfig), null-safe. */}
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t('strip.head')}</span>
            <Meter
              value={head === 'unknown' ? null : head === 'in' ? 100 : 0}
              ariaLabel={t('strip.headAria', { state: headText })}
              tone="mono"
            />
            <span className={styles.rowValue}>{headText}</span>
          </div>
          <Row
            label={t('strip.alertness')}
            value={running ? bucket.alertness : null}
            valueText={running ? valuePct(bucket.alertness) : '—'}
            ariaLabel={meterAria(t('strip.alertness'), running ? bucket.alertness : null)}
          />
        </div>
      )}
    </div>
  );
}
