# Frontend

Not scaffolded yet — this is the target layout. Scaffold in the first Claude Code session (see `../docs/FIRST_CLAUDE_CODE_SESSION.md`).

## Stack
TypeScript · React 18 · Vite · Apollo Client (server state) · Redux Toolkit (local/UI state only) · GraphQL Code Generator (typed operations from `../docs/flamingo_schema.graphql`) · i18next (`ru`) · CSS Modules consuming `src/shared/styles/tokens.css`. No utility-CSS framework — the brand is custom. On-device ML: MediaPipe Tasks Vision (`FaceLandmarker`) in a Web Worker.

## Layout (per CLAUDE.md §4 / architecture §3)
```
src/
  app/          # store, apolloClient (link chain: errorLink→authLink→split(ws,http)), router, providers
  shared/       # ui/ (design-system components, mirrors design-reference styleguide), styles/tokens.css, hooks/, lib/
  entities/     # graphql/ operations + generated types
  features/     # auth, dashboard, courses, schedule, lesson, homework, analytics, admin, notifications, profile
  seedum/       # mediapipe.worker.ts, attention pipeline, ubp (IndexedDB), calibration
  i18n/         # ru.json, i18n setup
```

## Rules
- Server state in Apollo; only UI/local state (theme, age mode, wizard steps, live-lesson local controls) in Redux. Don't duplicate server data into Redux.
- Generated GraphQL types for every operation — no `any`, no hand-written response types. Re-run codegen after schema changes.
- Build UI from `shared/ui` on tokens. Only semantic tokens (`--color-*`, `--radius-*`, …); never raw hex/px.
- Age adaptation via `data-mode="kids"` on the root (grades 1–4); size/leading/tap cascade. Content-level adaptation per component (see design system §6.1).
- Accessibility: visible focus ring, ARIA, keyboard nav, `prefers-reduced-motion` (WCAG 2.1 AA).
- Charts: inline SVG on tokens (see prototypes).

## design-reference/
Self-contained `.jsx` prototypes (inline tokens) showing the intended UX and visuals per role, plus the component styleguide. **Reference only** — port them into real TS components in `src/shared/ui` and `src/features/*`. Video panels are static mocks; only CMF charts animate.
