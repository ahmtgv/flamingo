---
name: flamingo-design
description: Flamingo's design system rules for building or restyling ANY frontend screen/component — monochrome graphite palette, tokens-only styling, single-accent color discipline, meter grammar, calm CMF tone, ru i18n, AA accessibility, stable live-update motion. Use whenever creating or modifying UI in frontend/src.
---

# Flamingo design system

Source of truth: `frontend/src/shared/styles/tokens.css` + `docs/Flamingo_DesignSystem_v1.md`.
Reference implementations (shipped, reviewed): `frontend/src/seedum/ui/AttentionStrip.tsx`,
`frontend/src/features/lesson/ui/ClassField.tsx`, `frontend/src/seedum/ui/Meter.tsx`.

## 1. Palette — cold-neutral «Flamingo Air» (v2, 2026-07-03), one accent

Cold light-gray canvas, near-black ink (Apple-grade neutral). Everything is the neutral scale
**except** the single coral accent, used ONLY where action/attention is needed.
(v1 warm-graphite palette retired by owner decision — see `docs/Flamingo_Redesign_Prompt_v2.md`.
Primitive names `--fl-warm-*` are retained for compatibility but hold the cool ramp.)

| Role | Token | Light value |
|---|---|---|
| Canvas | `--color-bg` | `#f1f1ef` |
| Card surface | `--color-surface` | `#ffffff` |
| Subtle / track | `--color-surface-subtle` / `--color-surface-hover` | `#e9e9e6` |
| Ink | `--color-text` | `#1d1d1f` |
| Secondary ink | `--color-text-secondary` | `#6e6e73` |
| Muted (decor/captions only) | `--color-text-tertiary` | `#98989e` — decoration-grade, NOT for essential body text |
| Border (hairline) | `--color-border` / `--color-border-strong` | `#d9d9d6` / `#c4c4c1` |
| **The accent** | `--color-accent` (graphics) / `--color-accent-text` (text) | `#e14e1f` / `#c23f14` |

**Two voices (v2):** UI voice = SF/system (`--font-body`, Inter fallback); MACHINE voice =
`--font-mono` (JetBrains Mono) for numbers, time, kickers, statuses, counters, meta. Hairlines
instead of boxes: surfaces only for clickable objects; depth only for floating elements.

Rules:
- **Accent = action needed.** One accent element per screen state (e.g. the teacher's
  "needs attention" ring). Everything informational stays graphite.
- **Never color-only meaning.** Any accent mark is accompanied by text
  (ring + «нужно внимание» tag). Status = text + tone, never tone alone.
- Dark theme comes free via `[data-theme="dark"]` — consume semantic tokens and it works.

## 2. Tokens only — no literals in components

Consume semantic tokens (`--color-*`, `--space-*`, `--text-*`, `--radius-*`, `--duration-*`),
never primitives (`--fl-*`) and never raw values.

```css
/* GOOD */                             /* BAD */
color: var(--color-text-secondary);    color: #6e6456;
gap: var(--space-3);                   gap: 12px;
font-size: var(--text-small);          font-size: 14px;
transition: opacity var(--duration-base) var(--ease-standard);   transition: opacity 300ms ease;
```

Sanctioned exceptions (flag them in the commit message): `1px` hairline borders, `2px`
rings (matches the `.tile` active-ring convention), and effect values with no token
(e.g. `backdrop-filter: blur(8px)`, long animation durations). Runtime data
(`style={{ inlineSize: `${pct}%` }}`, SVG viewBox geometry) is not a literal.

## 3. Live numbers — tabular figures

Any value that updates live (2.5 s CMF cadence) must not shift width:

```css
font-family: var(--font-mono);
font-variant-numeric: tabular-nums;
min-inline-size: 2.5ch;   /* reserve the widest expected width */
```

## 4. Metric language — the horizontal fill meter

One grammar for all 0–100 metrics: label · fill meter · value. **Reuse
`seedum/ui/Meter.tsx`** (`tone="accent" | "mono" | "graphite"`) — do not build new meters.

- `accent` — default on light surfaces where the metric IS the call to action.
- `mono` — near-white fill for dark/frosted overlays (over video).
- `graphite` — monochrome panels on light surfaces.
- **No value bands, no traffic-light coloring.** A meter shows the raw value with a single
  fill; "more" is not "good/bad". Never invent qualitative cutoffs in the UI — threshold
  constants live in `frontend/src/seedum/cmfConfig.ts` only (e.g. `liveAttentionAlertBelow`,
  the head tolerances read by `headState()` in `frontend/src/seedum/headTolerance.ts`),
  so tuning never requires a UI rebuild.
- Binary states (head in/out of frame) render as full/empty meter + the state **as text**
  («в кадре / вне кадра / нет данных»), null-safe (`unknown` never displays as a false positive).

## 5. Tone — support, not surveillance

CMF/wellness UI is calm and non-clinical. Encouraging framing, no judgment language, no alarm
colors (never `--color-error/-warning` for attention states).

- GOOD: «Внимание», «Бодрость», «Поверните к экрану», «Это подсказки для вас. Не оценка.»
- BAD: «Нарушение!», red flashing values, per-student rankings, "score: FAIL".

## 6. ru i18n — every user-facing string

All labels via `useTranslation` + `src/i18n/locales/ru/*.json`. No hardcoded Cyrillic in
components (JSDoc/comments are fine). Interpolate numbers in the JSON template
(`"valuePct": "{{n}} %"`), round in the component. Prefer declension-free phrasing for
counts («84 из 100», not «84 процентов»). No `text-transform: uppercase` +
`--tracking-wide` on Cyrillic micro-labels — sentence case.

## 7. Accessibility — WCAG 2.1 AA

- Toggles/disclosures are real `<button>`s with `aria-expanded` (disclosure) or
  `aria-pressed` (toggle), and a visible focus ring: `box-shadow: var(--focus-ring)` on
  `:focus-visible`.
- Meters/SVG: `role="img"` + computed `aria-label` carrying label + value as text
  (parity with `AttentionChart`). Decorative fills/icons `aria-hidden`.
- **No `aria-live` on fast-updating values** (2.5 s cadence = SR spam). Passive read only.
- `prefers-reduced-motion`: token durations zero automatically (tokens.css §5); any
  free-running `animation` needs an explicit `@media (prefers-reduced-motion: reduce) { animation: none; }`.
- Contrast: body text on surfaces ≥ 4.5:1 (secondary ink passes at 5.06:1+); graphics ≥ 3:1
  (accent on track passes at 3.34:1). `--color-text-tertiary` is decoration-grade only.

## 8. Motion & stability on live data

- Live value changes transition smoothly (`--duration-base`/`--duration-slow`, i.e. 200–320 ms,
  `--ease-standard`) — fill width, opacity, scale. No jitter, no snap.
- **Stable positions:** never reorder elements on a data update (orbs/rows keep insertion
  order; React `key` = stable id). Salience comes from the accent mark, not reordering.
- Expansion/selection state is manual only — never auto-collapse or auto-open on data updates.

## Pre-merge checklist

- [ ] Only semantic tokens (grep the diff for `#[0-9a-f]{3,6}` and `px` outside sanctioned exceptions)
- [ ] Accent appears only for action-needed, always paired with text
- [ ] Live numbers tabular + reserved width; transitions on token durations
- [ ] Metrics use the shared `Meter`; no invented thresholds (cmfConfig only)
- [ ] All strings in `ru/*.json`; calm non-clinical copy
- [ ] Buttons keyboard-operable, aria-expanded/pressed, focus-visible ring, reduced-motion honored
- [ ] Element positions stable across data updates
