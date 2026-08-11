/**
 * SEduM module boundaries as a COMPLIANCE ARTIFACT (docs/rnd/RND_01_JURISDICTION.md §3, §6.5).
 *
 * The self-report module is outside the EU AI Act's emotion-recognition prohibition only
 * because it is not based on biometric data (Guidelines cl. 251/265). Wire it to the camera
 * pipeline — one shared model, one blended score, one fused display — and the biometric
 * element comes back, taking the whole product with it into art. 5(1)(f).
 *
 * A comment saying "do not fuse these" is not a control. This test is: it reads the actual
 * import graph, so the boundary fails the build rather than eroding over time.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// vitest runs from the frontend project root (import.meta.url is not a file: URL under the
// jsdom transform, so it cannot anchor this).
const SEEDUM = join(process.cwd(), 'src', 'seedum');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Every module specifier a file imports from (static imports, type imports, re-exports and
 *  dynamic import()). */
function importsOf(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const specifiers: string[] = [];
  const patterns = [
    /(?:^|\n)\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*export\s[^;]*?from\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g,
  ];
  for (const re of patterns) {
    for (const match of src.matchAll(re)) specifiers.push(match[1]);
  }
  return specifiers;
}

/** Does this specifier reach the given sibling module, however it is spelled
 *  ('@/seedum/cmf/score', '../cmf', './cmf/metrics')? */
function reaches(specifier: string, moduleName: string): boolean {
  let rest: string | null = null;
  if (specifier.startsWith('@/seedum/')) rest = specifier.slice('@/seedum/'.length);
  else if (specifier.startsWith('.')) rest = specifier.replace(/^(\.\.?\/)+/, '');
  if (rest === null) return false;
  return rest === moduleName || rest.startsWith(`${moduleName}/`);
}

function crossImports(fromModule: string, toModule: string): string[] {
  const offenders: string[] = [];
  for (const file of sourceFiles(join(SEEDUM, fromModule))) {
    for (const specifier of importsOf(file)) {
      if (reaches(specifier, toModule)) {
        offenders.push(`${file.replace(SEEDUM, 'seedum/')} → ${specifier}`);
      }
    }
  }
  return offenders;
}

describe('SEduM module boundaries', () => {
  it('keeps the three modules physically separate', () => {
    for (const module of ['cmf', 'selfreport', 'recommend']) {
      expect(statSync(join(SEEDUM, module)).isDirectory()).toBe(true);
    }
  });

  it('never fuses self-report with the camera pipeline', () => {
    // Both directions: a shared import in either direction is a shared model in the making.
    expect(crossImports('selfreport', 'cmf')).toEqual([]);
    expect(crossImports('cmf', 'selfreport')).toEqual([]);
  });

  it('keeps recommendations off camera-derived input', () => {
    // EU profile: recommend runs on self-report + explicit preferences, never on the camera.
    expect(crossImports('recommend', 'cmf')).toEqual([]);
  });
});
