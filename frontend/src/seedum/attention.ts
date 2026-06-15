// Orchestrates the on-device pipeline for a <video> element: reads frames
// locally, hands them to the worker, and surfaces ONLY per-bucket aggregates
// (plus the user's own per-frame score for their local chart). Frames never
// leave the device.

import type { Baseline } from './score';

export interface PipelineCallbacks {
  onBucket: (bucketStartMs: number, avgAttention: number) => void;
  onScore?: (score: number) => void;
  onReady?: () => void;
  onUnavailable?: (reason: string) => void;
}

export interface PipelineHandle {
  stop: () => void;
}

// Vendored locally (no third-party CDN at runtime) — see scripts/vendor-seedum-assets.mjs.
const WASM_BASE = '/seedum/wasm';
const MODEL_URL = '/seedum/models/face_landmarker.task';
const FRAME_INTERVAL_MS = 200; // ~5 fps is ample for attention; cheap on the CPU

export function startAttentionPipeline(
  video: HTMLVideoElement,
  baseline: Baseline | undefined,
  cb: PipelineCallbacks,
): PipelineHandle {
  // Module worker so `vite dev` + `vite build` both serve it as ESM (a classic worker
  // can't use ESM imports in dev). MediaPipe loads its ES-module WASM build inside
  // the worker via forVisionTasks(base, true) — see mediapipe.worker.ts.
  const worker = new Worker(new URL('./mediapipe.worker.ts', import.meta.url), {
    type: 'module',
  });
  let running = true;
  let ready = false;

  let _frames = 0; // [CMF-DEBUG] temporary
  let _loggedIdle = false; // [CMF-DEBUG] temporary
  worker.onerror = (e) => console.error('[CMF] worker.onerror', e.message, e.filename, e.lineno); // [CMF-DEBUG]
  worker.onmessageerror = () => console.error('[CMF] worker.onmessageerror'); // [CMF-DEBUG]
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === 'ready') {
      ready = true;
      console.log('[CMF] worker READY'); // [CMF-DEBUG]
      cb.onReady?.();
    } else if (m.type === 'unavailable') {
      console.warn('[CMF] worker UNAVAILABLE:', m.reason); // [CMF-DEBUG]
      cb.onUnavailable?.(m.reason);
    } else if (m.type === 'score') {
      if (_frames === 1 || _frames % 25 === 0) console.log('[CMF] score', m.value); // [CMF-DEBUG]
      cb.onScore?.(m.value);
    } else if (m.type === 'bucket') {
      console.log('[CMF] BUCKET', m.bucketStart, m.avgAttention); // [CMF-DEBUG]
      cb.onBucket(m.bucketStart, m.avgAttention);
    }
  };

  worker.postMessage({ type: 'init', wasmBase: WASM_BASE, modelUrl: MODEL_URL, baseline });

  async function pump() {
    while (running) {
      if (ready && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const bitmap = await createImageBitmap(video);
          worker.postMessage({ type: 'frame', bitmap, ts: performance.now() }, [bitmap]);
          if (_frames++ % 25 === 0) console.log('[CMF] frame sent #', _frames); // [CMF-DEBUG]
        } catch (err) {
          console.warn('[CMF] frame error', err); // [CMF-DEBUG]
        }
      } else if (running && !_loggedIdle) {
        _loggedIdle = true; // [CMF-DEBUG] one-shot: why aren't we feeding frames yet?
        console.log('[CMF] not feeding', {
          ready,
          readyState: video.readyState,
          videoWidth: video.videoWidth,
        });
      }
      await new Promise((r) => setTimeout(r, FRAME_INTERVAL_MS));
    }
  }
  void pump();

  return {
    stop() {
      running = false;
      worker.postMessage({ type: 'flush' });
      worker.terminate();
    },
  };
}
