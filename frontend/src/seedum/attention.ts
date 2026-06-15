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
  const worker = new Worker(new URL('./mediapipe.worker.ts', import.meta.url), { type: 'module' });
  let running = true;
  let ready = false;

  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === 'ready') {
      ready = true;
      cb.onReady?.();
    } else if (m.type === 'unavailable') {
      cb.onUnavailable?.(m.reason);
    } else if (m.type === 'score') {
      cb.onScore?.(m.value);
    } else if (m.type === 'bucket') {
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
        } catch {
          /* frame skipped */
        }
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
