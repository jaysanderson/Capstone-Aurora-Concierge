/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NUCLIA_API_URL: string;
  readonly VITE_NUCLIA_KB_ID: string;
  readonly VITE_NUCLIA_API_KEY: string;
  readonly VITE_AURORA_REGION?: 'EU' | 'US';
  readonly VITE_BYO_LLM_PROVIDERS?: string;
  readonly VITE_BYO_LLM_DEFAULT?: string;
  readonly VITE_LANGUAGES?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.json' {
  const value: unknown;
  export default value;
}
