// Vendors the SEduM on-device ML assets INTO the repo (frontend/public/seedum/),
// so neither the build nor the running app ever depends on a third-party CDN
// (CLAUDE.md §2/§7: "host-it-ourselves"; open-source only). The vendored files
// are committed; re-run this only to update them:
//
//   node scripts/vendor-seedum-assets.mjs           # vendor missing assets
//   node scripts/vendor-seedum-assets.mjs --force   # re-fetch even if present
//
// What it vendors:
//  - MediaPipe Tasks-Vision WASM runtime (from the installed @mediapipe/tasks-vision
//    package) — the SIMD build + the no-SIMD fallback that FilesetResolver.forVisionTasks
//    selects between at runtime. The GPU/_module_ variant is not used and skipped.
//  - The FaceLandmarker model bundle (face_landmarker.task, float16) from Google's
//    public model storage. It runs entirely on-device; no frames/biometrics leave it.

import { mkdir, copyFile, access, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicSeedum = resolve(here, '..', 'public', 'seedum');
const force = process.argv.includes('--force');

// The SEduM worker is a MODULE worker (vite dev can't serve a classic worker that
// uses ESM imports), so MediaPipe loads via FilesetResolver.forVisionTasks(base, true)
// → the ES-module WASM build `vision_wasm_module_internal.{js,wasm}` (module mode
// assumes SIMD, so there is no _nosimd module variant to vendor).
const WASM_FILES = ['vision_wasm_module_internal.js', 'vision_wasm_module_internal.wasm'];

// Pinned float16 FaceLandmarker bundle (landmarks + blendshapes + transform matrix).
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const exists = (p) =>
  access(p)
    .then(() => true)
    .catch(() => false);

async function vendorWasm() {
  // Resolve the package root via its main entry (its `exports` map hides package.json).
  const entry = fileURLToPath(import.meta.resolve('@mediapipe/tasks-vision'));
  const wasmDir = join(dirname(entry), 'wasm');
  const dest = join(publicSeedum, 'wasm');
  await mkdir(dest, { recursive: true });
  for (const name of WASM_FILES) {
    const to = join(dest, name);
    if (!force && (await exists(to))) {
      console.log(`  skip (present): wasm/${name}`);
      continue;
    }
    await copyFile(join(wasmDir, name), to);
    const { size } = await stat(to);
    console.log(`  copied: wasm/${name} (${(size / 1e6).toFixed(1)} MB)`);
  }
}

async function vendorModel() {
  const dest = join(publicSeedum, 'models');
  await mkdir(dest, { recursive: true });
  const to = join(dest, 'face_landmarker.task');
  if (!force && (await exists(to))) {
    console.log('  skip (present): models/face_landmarker.task');
    return;
  }
  console.log(`  downloading: ${MODEL_URL}`);
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`model download failed: ${res.status} ${res.statusText}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeFile(to, bytes);
  console.log(`  saved: models/face_landmarker.task (${(bytes.length / 1e6).toFixed(1)} MB)`);
}

console.log('Vendoring SEduM on-device assets into public/seedum/ …');
await vendorWasm();
await vendorModel();
console.log('Done.');
