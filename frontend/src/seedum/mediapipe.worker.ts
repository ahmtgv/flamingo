/// <reference lib="webworker" />
// On-device attention worker. MediaPipe FaceLandmarker runs HERE (in the browser,
// in a Web Worker); frames are analysed and immediately discarded. The worker
// emits ONLY a per-frame score (for the user's own live chart, stays on device)
// and per-bucket aggregates. It NEVER posts frames/landmarks, and when MediaPipe
// or its vendored model are unavailable it reports 'unavailable' — never a faked
// score (CLAUDE.md §2/§7).

import { Bucketer } from './bucketing';
import { type AttentionSignals, type Baseline, scoreAttention } from './score';

type InMsg =
  | { type: 'init'; wasmBase: string; modelUrl: string; baseline?: Baseline }
  | { type: 'frame'; bitmap: ImageBitmap; ts: number }
  | { type: 'flush' };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

// MediaPipe types are not installed offline; treat the module as untyped.
/* eslint-disable @typescript-eslint/no-explicit-any */
let landmarker: any = null;
let baseline: Baseline | undefined;
let bucketer: Bucketer | null = null;

function blend(categories: any[], name: string): number {
  const c = categories?.find((x) => x.categoryName === name);
  return c ? c.score : 0;
}

function extractSignals(result: any): AttentionSignals {
  const present = (result?.faceLandmarks?.length ?? 0) > 0;
  if (!present) return { facePresent: false, eyeOpenness: 0, gazeCenter: 0, headForward: 0 };
  const cats = result.faceBlendshapes?.[0]?.categories ?? [];
  const blink = Math.max(blend(cats, 'eyeBlinkLeft'), blend(cats, 'eyeBlinkRight'));
  const lookAway =
    (blend(cats, 'eyeLookOutLeft') +
      blend(cats, 'eyeLookOutRight') +
      blend(cats, 'eyeLookUpLeft') +
      blend(cats, 'eyeLookDownRight')) /
    4;
  const matrix = result.facialTransformationMatrixes?.[0]?.data;
  const headForward = matrix ? Math.max(0, 1 - (Math.abs(matrix[8]) + Math.abs(matrix[9]))) : 0.8;
  return {
    facePresent: true,
    eyeOpenness: 1 - blink,
    gazeCenter: 1 - Math.min(1, lookAway),
    headForward,
  };
}

ctx.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    baseline = msg.baseline;
    bucketer = new Bucketer((bucketStart, avg) =>
      ctx.postMessage({ type: 'bucket', bucketStart, avgAttention: avg }),
    );
    try {
      // Variable specifier so the bundler does not try to resolve the optional dep.
      const specifier = '@mediapipe/tasks-vision';
      const vision: any = await import(/* @vite-ignore */ specifier);
      const fileset = await vision.FilesetResolver.forVisionTasks(msg.wasmBase);
      landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
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
    const score = scoreAttention(extractSignals(result), baseline);
    ctx.postMessage({ type: 'score', value: score });
    bucketer.add(msg.ts, score);
    return;
  }

  if (msg.type === 'flush') {
    bucketer?.flush();
  }
};
