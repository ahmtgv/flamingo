---
name: a11y-audit
description: Systematic WCAG 2.1/2.2 AA accessibility audit for the Flamingo frontend (React 18 + CSS Modules + i18next). Use when asked to audit, review, or check accessibility of screens/components — produces a findings report with file:line references and concrete fixes.
---

# A11y audit (WCAG 2.1/2.2 AA) — Flamingo frontend

Stack: React 18 function components, CSS Modules on `tokens.css`, i18next (`ru`).
Audit scope = the files the user names, else the changed files (`git diff --name-only`).

## Procedure

1. List the in-scope `.tsx` + their `.module.css` files.
2. Run every check below against each file; note violations as `file:line`.
3. Verify each suspected violation by reading the surrounding code (props may supply
   the aria/label from a parent — follow the component's call sites before flagging).
4. Report using the format at the bottom. No findings = say so explicitly per category.

## Checks

### 1. Color contrast (SC 1.4.3 text ≥4.5:1, SC 1.4.11 non-text ≥3:1)
Pre-computed ratios for the token palette (light theme; dark passes wherever light does):

| Pair | Ratio | Verdict |
|---|---|---|
| `--color-text` on `--color-bg`/`--color-surface` | 13.25 / 14.31 | AA+ any size |
| `--color-text-secondary` on bg/surface | 5.06 / 5.47 | AA normal text |
| `--color-text-tertiary` on surface | **3.71** | **FAILS normal text** — decorative/large-text only |
| `--color-accent` (graphic) on `--color-surface-hover` track | 3.34 | AA non-text (≥3:1) |
| `--color-accent-text` on surface | 6.27 | AA normal text |
| `--color-text-on-accent` (white) on `--color-accent-strong` | 5.14 | AA normal text |
| Dark: `--color-text` on `--fl-dark-bg` / text-2 on surface | 13.69 / 8.06 | AA+ |

Flag: `--color-text-tertiary` carrying essential normal-size text; any raw hex (token bypass =
unaudited contrast); accent used as a text color via `--color-accent` instead of `--color-accent-text`.

### 2. Keyboard operability (SC 2.1.1)
- Every click target is a `<button>`/`<a>`/input — never `onClick` on `div`/`span`/`li`/SVG.
- `Escape` closes transient panels/overlays; listener cleaned up on unmount.
- No `tabIndex > 0`; no keyboard traps; logical DOM order = visual order.

### 3. ARIA on interactive elements (SC 4.1.2 name/role/value)
- Disclosure → `aria-expanded` (+ `aria-controls` to the panel id when open).
- Toggle → `aria-pressed`. Icon-only button → `aria-label` from i18n.
- Meters/charts/SVG → `role="img"` + `aria-label` carrying label AND value as text;
  decorative fills/icons/`lucide` glyphs → `aria-hidden="true"`.
- **No `aria-live` on fast-updating values** (CMF updates every 2.5 s → SR spam). The
  project convention is passive `role="img"`; flag any live region wrapping live metrics.
- Overlays: terminal alerts `role="alert"`; transient status via ONE polite `role="status"`
  region (see `VideoRoom.tsx` — don't double-announce).

### 4. Focus visibility (SC 2.4.7, 2.4.11)
- Interactive elements show `box-shadow: var(--focus-ring)` (or `--focus-ring-inset`) on
  `:focus-visible`. Flag `outline: none` without a replacement ring.
- Programmatic focus moves to the primary action when a blocking overlay appears
  (pattern: `rejoinRef` focus in `VideoRoom.tsx`); focus is not lost on unmount.

### 5. Reduced motion (SC 2.3.3)
- Token-duration transitions auto-zero via tokens.css §5 — OK by construction.
- Any `animation:` with a literal duration MUST have
  `@media (prefers-reduced-motion: reduce) { animation: none; }` (pattern: `.orb` breathing
  in `ClassField.module.css`). Flag free-running/looping animations without it.

### 6. Color-only meaning (SC 1.4.1)
- Every state conveyed by color (accent ring, tone change, fill) is ALSO conveyed by
  visible text or a value (e.g. ring + «нужно внимание»; badge tone + label).
- Meters always pair the fill with a printed number; selection states also expose
  `aria-expanded`/a rendered panel.

### 7. Forms (SC 1.3.1, 3.3.2)
- Every input has a programmatic label (`<label htmlFor>` or the `shared/ui` field
  components which wire it). Placeholder is never the only label.
- Errors: text + `role="alert"` (not color alone); the failing field referenced via
  `aria-describedby` where present.
- All label/error strings from i18n (`useTranslation`), not hardcoded.

### 8. Misc AA
- Target size ≥ `--tap-min` (44px; 48px kids mode) for primary touch controls (SC 2.5.8).
- Text alternatives: `<img alt>`, `<video>` decorative → `aria-hidden` + `muted`.
- `lang`: the app is ru — dynamic non-ru content (none shipped) would need `lang` attrs.

## Report format

```
## A11y audit — <scope>  (WCAG 2.1/2.2 AA)

### Findings (severity-ordered)
1. [BLOCKER|MAJOR|MINOR] SC <x.x.x> — <one-line defect>
   Where: <file>:<line>
   Why: <what a keyboard/SR/low-vision user experiences>
   Fix: <concrete code change, tokens-only>

### Passed
- Contrast: … · Keyboard: … · ARIA: … · Focus: … · Reduced motion: … · Color-only: … · Forms: …
```

Severity: BLOCKER = a user group cannot complete the task; MAJOR = degraded but possible;
MINOR = polish/robustness. Verify every finding against the actual code before reporting —
a prop-supplied `aria-label` at the call site is not a violation.
