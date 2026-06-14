/**
 * Runtime configuration sourced from Vite env vars.
 *
 * Defaults to a same-origin path so there is no CORS in the browser: the Vite
 * dev server proxies `/graphql` to the API (see vite.config.ts), and in
 * production a reverse proxy forwards it the same way.
 */
export const GRAPHQL_HTTP_URL = import.meta.env.VITE_GRAPHQL_HTTP_URL ?? '/graphql/';
