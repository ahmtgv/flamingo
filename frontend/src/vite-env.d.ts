/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_HTTP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
