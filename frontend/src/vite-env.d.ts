/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_HTTP_URL?: string;
  readonly VITE_GRAPHQL_WS_URL?: string;
  readonly VITE_LIVEKIT_URL?: string;
  /** TEMPORARY: '1' runs the app on the in-browser demo layer (no backend). Remove before launch. */
  readonly VITE_PREVIEW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
