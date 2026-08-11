/// <reference lib="webworker" />
// On-device attention worker. MediaPipe FaceLandmarker runs HERE (in the browser,
// in a Web Worker); frames are analysed and immediately discarded. The worker
// emits ONLY a per-frame score (for the user's own live chart, stays on device)
// and per-bucket aggregates. It NEVER posts frames/landmarks, and when MediaPipe
// or its vendored model are unavailable it reports 'unavailable' — never a faked
// score (CLAUDE.md §2/§7).

import {
  type Category,
  FaceLandmarker,
  type FaceLandmarkerResult,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

import { Bucketer } from './bucketing';
import { AlertnessTracker, ema, eyeOpennessEAR, gazeOnScreen, headEuler } from './metrics';
import { type AttentionSignals, type Baseline, engagementScore } from './score';

type InMsg =
  | { type: 'init'; wasmBase: string; modelUrl: string; baseline?: Baseline }
  | { type: 'frame'; bitmap: ImageBitmap; ts: number }
  | { type: 'flush' };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let landmarker: FaceLandmarker | null = null;
let baseline: Baseline | undefined;
let bucketer: Bucketer | null = null;
let alertness: AlertnessTracker | null = null;
let emaScore = -1; // EMA of the per-frame engagement (smooths brief blinks/glances)

function blend(categories: Category[], name: string): number {
  const c = categories.find((x) => x.categoryName === name);
  return c ? c.score : 0;
}

// Derive on-device scalars from MediaPipe outputs. Sub-metrics (gaze/openness/yaw/pitch/
// alertness) are computed here for the engagement composite + the alertness accumulator; the
// worker still emits ONLY the engagement score + per-bucket aggregate (richer payload lands in
// a later sub-slice). Frames/landmarks never leave this worker.
function extractSignals(result: FaceLandmarkerResult, tsMs: number): AttentionSignals {
  const present = (result.faceLandmarks?.length ?? 0) > 0;
  if (!present) {
    return { facePresent: false, gazeOnScreen: 0, eyeOpenness: 0, headYaw: 0, headPitch: 0, alertness: 0 };
  }
  const cats = result.faceBlendshapes?.[0]?.categories ?? [];
  const blendFn = (name: string): number => blend(cats, name);
  const blinkFallback = 1 - Math.max(blend(cats, 'eyeBlinkLeft'), blend(cats, 'eyeBlinkRight'));
  const eyeOpenness = eyeOpennessEAR(result.faceLandmarks?.[0], blinkFallback);
  const { yaw, pitch } = headEuler(result.facialTransformationMatrixes?.[0]?.data);
  alertness?.add(tsMs, eyeOpenness);
  return {
    facePresent: true,
    gazeOnScreen: gazeOnScreen(blendFn),
    eyeOpenness,
    headYaw: yaw,
    headPitch: pitch,
    alertness: alertness ? alertness.value(tsMs) : 1,
  };
}

ctx.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    baseline = msg.baseline;
    alertness = new AlertnessTracker();
    emaScore = -1;
    bucketer = new Bucketer((bucketStart, avg) =>
      ctx.postMessage({
        type: 'bucket',
        bucketStart,
        // Per-bucket AGGREGATES only — never per-frame, never raw. Sub-metrics ride alongside.
        avgAttention: avg.engagement,
        gazeOnScreen: avg.gazeOnScreen,
        eyeOpenness: avg.eyeOpenness,
        headYaw: avg.headYaw,
        headPitch: avg.headPitch,
        alertness: avg.alertness,
      }),
    );
    try {
      // WASM runtime + model are vendored under /seedum/ (see scripts/vendor-seedum-assets.mjs);
      // nothing is fetched from a third-party CDN. If either is missing/unloadable we report
      // 'unavailable' below — we never fabricate a score (CLAUDE.md §2/§7).
      // useModule=true → the ES-module WASM build (vision_wasm_module_internal.*),
      // which loads via dynamic import() and works inside a module worker (no importScripts).
      const fileset = await FilesetResolver.forVisionTasks(msg.wasmBase, true);
      landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: msg.modelUrl },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      ctx.postMessage({ type: 'ready' });
    } catch (err) {
      ctx.postMessage({ type: 'unavailable', reason: String(err) });
    }
    return;
  }

  if (msg.type === 'frame') {
    if (!landmarker || !bucketer) {
      msg.bitmap.close();
      return;
    }
    const result = landmarker.detectForVideo(msg.bitmap, msg.ts);
    msg.bitmap.close(); // discard the frame immediately — never stored or sent
    const signals = extractSignals(result, msg.ts);
    if (!signals.facePresent) {
      // B-9 (0-vs-null): a no-face frame is NOT "attention 0". It is marked (face:false,
      // on-device only), does not move the EMA, and does not feed the bucket — a window
      // with no valid frames is never emitted (Bucketer skips empty flushes), so
      // reportAttention is skipped instead of egressing false zeros. Egress schema is
      // unchanged: still the same 8 aggregate scalars whenever a bucket IS reported.
      ctx.postMessage({ type: 'score', value: emaScore < 0 ? 0 : emaScore, face: false });
      return;
    }
    const raw = engagementScore(signals, baseline);
    emaScore = emaScore < 0 ? raw : Math.round(ema(emaScore, raw));
    ctx.postMessage({ type: 'score', value: emaScore, face: true }); // per-frame, stays on device
    // Per-frame sub-metric SAMPLES feed the bucket; only the per-bucket AVERAGE is emitted/leaves.
    bucketer.add(msg.ts, {
      engagement: emaScore,
      gazeOnScreen: Math.round(signals.gazeOnScreen * 100),
      eyeOpenness: Math.round(signals.eyeOpenness * 100),
      headYaw: Math.round(signals.headYaw),
      headPitch: Math.round(signals.headPitch),
      alertness: Math.round(signals.alertness * 100),
    });
    return;
  }

  if (msg.type === 'flush') {
    bucketer?.flush();
  }
};
