export interface AuroraEnv {
  apiUrl: string;
  kbId: string;
  apiKey: string;
  region: 'EU' | 'US';
  byoLlmProviders: ByoLlmProvider[];
  byoLlmDefault: ByoLlmProvider;
  languages: string[];
}

export type ByoLlmProvider = 'azure-openai' | 'google-vertex' | 'aws-bedrock';

/**
 * Runtime config bag. In production the container entrypoint writes
 * /config.js (`window.__AURORA_ENV__ = {...}`) from the machine's env / Fly
 * secrets, loaded before the app bundle. This lets a static nginx build read
 * secrets at RUNTIME instead of baking them in at Docker-build time — so a
 * plain `flyctl deploy` no longer needs --build-arg and can't ship an empty
 * bundle. Falls back to Vite's build-time import.meta.env for local `npm run
 * dev` (where /config.js is the empty placeholder in public/).
 */
function runtimeEnv(): Record<string, string | undefined> {
  if (typeof window !== 'undefined') {
    const w = (window as unknown as { __AURORA_ENV__?: Record<string, string> }).__AURORA_ENV__;
    if (w && typeof w === 'object') return w;
  }
  return {};
}

/** Prefer a non-empty runtime value; otherwise the build-time value. */
function readVar(name: string): string | undefined {
  const rt = runtimeEnv()[name];
  if (typeof rt === 'string' && rt.trim() !== '') return rt;
  return (import.meta.env as Record<string, string | undefined>)[name];
}

function need(name: string, v: string | undefined): string {
  if (!v || v.startsWith('paste-')) {
    throw new Error(`Missing env var ${name}. Set it in .env (copy from .env.example).`);
  }
  return v;
}

function parseProviders(raw: string | undefined): ByoLlmProvider[] {
  if (!raw) return ['azure-openai', 'google-vertex', 'aws-bedrock'];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is ByoLlmProvider =>
      s === 'azure-openai' || s === 'google-vertex' || s === 'aws-bedrock',
    );
}

export function loadEnv(): AuroraEnv {
  const providers = parseProviders(readVar('VITE_BYO_LLM_PROVIDERS'));
  return {
    apiUrl: need('VITE_NUCLIA_API_URL', readVar('VITE_NUCLIA_API_URL')),
    kbId: need('VITE_NUCLIA_KB_ID', readVar('VITE_NUCLIA_KB_ID')),
    apiKey: need('VITE_NUCLIA_API_KEY', readVar('VITE_NUCLIA_API_KEY')),
    region: (readVar('VITE_AURORA_REGION') as 'EU' | 'US') ?? 'EU',
    byoLlmProviders: providers,
    byoLlmDefault: (readVar('VITE_BYO_LLM_DEFAULT') as ByoLlmProvider) ?? providers[0] ?? 'azure-openai',
    languages: (readVar('VITE_LANGUAGES') ?? 'English,Spanish,French,German,Japanese,Mandarin')
      .split(',').map((s) => s.trim()),
  };
}

export function kbBaseUrl(env: AuroraEnv): string {
  return `${env.apiUrl}/kb/${env.kbId}`;
}

export function authHeaders(env: AuroraEnv): HeadersInit {
  return {
    'X-NUCLIA-SERVICEACCOUNT': `Bearer ${env.apiKey}`,
    'Content-Type': 'application/json',
  };
}
