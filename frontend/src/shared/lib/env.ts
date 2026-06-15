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
