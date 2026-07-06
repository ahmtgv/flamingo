// D0 diagnostics HUD (masterplan «SEduM 2.0», phase D0). DEV-ONLY, enabled with the
// `?cmfDebug=1` query flag. Everything here renders values that ALREADY exist on this
// device (per-frame scores + per-bucket aggregates from the local worker) — the HUD adds
// ZERO egress: it never touches reportAttention, the network, or storage. It exists so the
// owner can run the real-camera protocol (look at screen / look away / write in notebook /
// bad light / glasses) and SEE where the score lies or jitters before we tune cmfConfig.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import type { BucketAggregate } from '../attention';
import { CMF } from '../cmfConfig';
import styles from './seedum.module.css';

/** Imperative feed: the room pushes; the HUD samples on its own slow clock (2 Hz) so
 *  per-frame pushes never cause React render storms. */
export interface CmfHudFeed {
  pushScore: (value: number) => void;
  pushBucket: (bucket: BucketAggregate) => void;
}

interface HudView {
  lastScore: number | null;
  scoreHz: number; // measured per-frame score rate (expect ≈ 1000 / CMF.frameIntervalMs)
  maxGapMs: number; // worst inter-score gap in the window (stalls / dropped frames)
  jitter: number; // mean |Δscore| between consecutive scores (instability the owner sees)
  series: number[]; // recent raw scores for the sparkline
  bucket: BucketAggregate | null;
  bucketAgeMs: number | null;
}

const WINDOW_MS = 10_000;
const SPARK = 80;

/** Dev-only on-device diagnostics panel. Mono voice, tokens only, no egress. */
export const CmfDebugHud = forwardRef<CmfHudFeed, { status: string }>(function CmfDebugHud(
  { status },
  ref,
) {
  // Buffers live in refs — pushes are O(1) and render nothing.
  const scoresRef = useRef<{ t: number; v: number }[]>([]);
  const bucketRef = useRef<{ t: number; b: BucketAggregate } | null>(null);
  const [view, setView] = useState<HudView>({
    lastScore: null,
    scoreHz: 0,
    maxGapMs: 0,
    jitter: 0,
    series: [],
    bucket: null,
    bucketAgeMs: null,
  });

  useImperativeHandle(ref, () => ({
    pushScore(value: number) {
      const now = performance.now();
      const buf = scoresRef.current;
      buf.push({ t: now, v: value });
      const cutoff = now - WINDOW_MS;
      while (buf.length && buf[0].t < cutoff) buf.shift();
    },
    pushBucket(bucket: BucketAggregate) {
      bucketRef.current = { t: performance.now(), b: bucket };
    },
  }));

  // Slow sampling clock: 2 Hz is plenty for a diagnostics read-out.
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      const buf = scoresRef.current;
      const spanMs = buf.length > 1 ? buf[buf.length - 1].t - buf[0].t : 0;
      let maxGap = 0;
      let jitterSum = 0;
      for (let i = 1; i < buf.length; i += 1) {
        maxGap = Math.max(maxGap, buf[i].t - buf[i - 1].t);
        jitterSum += Math.abs(buf[i].v - buf[i - 1].v);
      }
      const b = bucketRef.current;
      setView({
        lastScore: buf.length ? buf[buf.length - 1].v : null,
        scoreHz: spanMs > 0 ? Math.round(((buf.length - 1) / spanMs) * 1000 * 10) / 10 : 0,
        maxGapMs: Math.round(maxGap),
        jitter: buf.length > 1 ? Math.round((jitterSum / (buf.length - 1)) * 10) / 10 : 0,
        series: buf.slice(-SPARK).map((s) => s.v),
        bucket: b?.b ?? null,
        bucketAgeMs: b ? Math.round(now - b.t) : null,
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  const expectedHz = Math.round((1000 / CMF.frameIntervalMs) * 10) / 10;
  const w = 160;
  const h = 36;
  const pts = view.series
    .map((v, i) => `${((i / Math.max(view.series.length - 1, 1)) * w).toFixed(1)},${(h - (v / 100) * h).toFixed(1)}`)
    .join(' ');

  return (
    <div className={styles.hud} data-testid="cmf-debug-hud">
      <p className={styles.hudTitle}>CMF debug · on-device only · без отправки</p>
      <svg
        className={styles.hudSpark}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`score ${view.lastScore ?? '—'}`}
      >
        {pts && <polyline points={pts} fill="none" strokeWidth="1.5" stroke="currentColor" />}
      </svg>
      <dl className={styles.hudGrid}>
        <dt>status</dt>
        <dd>{status}</dd>
        <dt>score</dt>
        <dd>{view.lastScore ?? '—'}</dd>
        <dt>rate</dt>
        <dd>
          {view.scoreHz} / {expectedHz} Hz
        </dd>
        <dt>max gap</dt>
        <dd>{view.maxGapMs} ms</dd>
        <dt>jitter</dt>
        <dd>±{view.jitter}</dd>
        <dt>bucket</dt>
        <dd>
          {view.bucket
            ? `att ${view.bucket.avgAttention} · gaze ${view.bucket.gazeOnScreen} · eyes ${view.bucket.eyeOpenness} · yaw ${view.bucket.headYaw} · pitch ${view.bucket.headPitch} · alert ${view.bucket.alertness}`
            : '—'}
        </dd>
        <dt>bucket age</dt>
        <dd>{view.bucketAgeMs != null ? `${view.bucketAgeMs} ms` : '—'}</dd>
      </dl>
    </div>
  );
});
