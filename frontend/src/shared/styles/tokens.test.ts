/**
 * The design system has one rule that nothing enforces at build time: styles consume
 * SEMANTIC TOKENS, and a token has to exist.
 *
 * CSS does not fail on `var(--typo)` — it silently drops the declaration and the element
 * falls back to whatever it inherits. That is how `var(--text-micro)` (a token that was
 * never defined) shipped in the subject cabinet and rendered 10px captions at the inherited
 * 16px: everything looked "fine", just wrong. The type checker cannot see inside a CSS file
 * and the linter does not know the token vocabulary, so this test is the only place the
 * mistake can be caught.
 *
 * The check is deliberately blunt: every `var(--…)` in every stylesheet must name a custom
 * property that `tokens.css` defines. A fallback (`var(--x, 12px)`) does not excuse a
 * missing token — a phantom name that always resolves to its fallback is a token nobody
 * can theme, and it reads like a real one.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../..');
const TOKENS = join(SRC, 'shared/styles/tokens.css');

/** Custom properties a stylesheet may legitimately define for itself, not theme tokens. */
const LOCAL_PREFIXES: string[] = [];

function cssFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) cssFiles(full, found);
    else if (entry.endsWith('.css')) found.push(full);
  }
  return found;
}

function definedIn(css: string): Set<string> {
  return new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]));
}

function usedIn(css: string): { name: string; line: number }[] {
  const out: { name: string; line: number }[] = [];
  css.split('\n').forEach((text, i) => {
    for (const m of text.matchAll(/var\(\s*(--[a-z0-9-]+)/gi))
      out.push({ name: m[1], line: i + 1 });
  });
  return out;
}

describe('design tokens — every var(--…) resolves', () => {
  const tokens = readFileSync(TOKENS, 'utf8');
  const defined = definedIn(tokens);
  const files = cssFiles(SRC);

  it('finds the token file and the stylesheets that consume it', () => {
    // Guards the guard: a broken path would make every assertion below vacuously pass.
    expect(defined.size).toBeGreaterThan(50);
    expect(files.length).toBeGreaterThan(5);
    expect(files.some((f) => f.endsWith('.module.css'))).toBe(true);
  });

  it('no stylesheet uses a token that tokens.css does not define', () => {
    const missing: string[] = [];
    for (const file of files) {
      const css = readFileSync(file, 'utf8');
      const local = definedIn(css); // a file may define its own scoped property
      for (const { name, line } of usedIn(css)) {
        if (defined.has(name) || local.has(name)) continue;
        if (LOCAL_PREFIXES.some((p) => name.startsWith(p))) continue;
        missing.push(`${relative(SRC, file)}:${line} → var(${name})`);
      }
    }
    expect(missing, `undefined design tokens:\n${missing.join('\n')}`).toEqual([]);
  });

  it('tokens.css does not reference a token it never defines', () => {
    const missing = usedIn(tokens)
      .filter(({ name }) => !defined.has(name))
      .map(({ name, line }) => `tokens.css:${line} → var(${name})`);
    expect(missing, `undefined design tokens:\n${missing.join('\n')}`).toEqual([]);
  });

  it('catches a typo like the one that shipped (var(--text-micro))', () => {
    // The check has to bite on the real mistake, not just pass on clean input.
    const sample = '.caption { font-size: var(--text-micro); color: var(--color-text); }';
    const unresolved = usedIn(sample).filter(({ name }) => !defined.has(name));
    expect(unresolved.map((u) => u.name)).toEqual(['--text-micro']);
  });

  it('a fallback does not excuse a missing token', () => {
    const sample = '.menu { z-index: var(--z-popover, 60); }';
    const unresolved = usedIn(sample).filter(({ name }) => !defined.has(name));
    expect(unresolved.map((u) => u.name)).toEqual(['--z-popover']);
  });
});
