/**
 * Runtime configuration sourced from Vite env vars.
 *
 * Defaults to a same-origin path so there is no CORS in the browser: the Vite
 * dev server proxies `/graphql` to the API (see vite.config.ts), and in
 * production a reverse proxy forwards it the same way.
 */
export const GRAPHQL_HTTP_URL = import.meta.env.VITE_GRAPHQL_HTTP_URL ?? '/graphql/';

/**
 * WebSocket endpoint for GraphQL subscriptions (graphql-ws). Defaults to the same
 * same-origin `/graphql/` path upgraded to ws(s): the Vite dev server proxies it to
 * the API (vite.config.ts `ws: true`); in production the reverse proxy does the same.
 */
export const GRAPHQL_WS_URL =
  import.meta.env.VITE_GRAPHQL_WS_URL ??
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/graphql/`;

/**
 * LiveKit server URL (e.g. wss://<project>.livekit.cloud). The URL is public; the
 * API key/secret stay server-side (the backend mints the room token). Empty in dev
 * until set in frontend/.env (VITE_LIVEKIT_URL) — the room then degrades gracefully.
 */
export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL ?? '';

/**
 * Канонический адрес продукта — тот, что печатается людям (решение владельца 14.08).
 *
 * 🔴 Ссылка группы собирается **только отсюда**, никогда из `window.location.origin`. Иначе
 * преподаватель, открывший панель на `localhost:5173` или на стенде, скопирует и разошлёт
 * классу адрес, которого у детей нет. Один раз — и половина группы стучится не туда.
 *
 * Пусто в разработке — тогда `joinUrl` честно падает на текущий origin, и это видно на экране,
 * а не выясняется у ученика.
 */
export const PUBLIC_ORIGIN: string = import.meta.env.VITE_PUBLIC_ORIGIN ?? '';
