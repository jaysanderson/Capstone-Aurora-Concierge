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
  const e = import.meta.env;
  const providers = parseProviders(e.VITE_BYO_LLM_PROVIDERS as string);
  return {
    apiUrl: need('VITE_NUCLIA_API_URL', e.VITE_NUCLIA_API_URL as string),
    kbId: need('VITE_NUCLIA_KB_ID', e.VITE_NUCLIA_KB_ID as string),
    apiKey: need('VITE_NUCLIA_API_KEY', e.VITE_NUCLIA_API_KEY as string),
    region: (e.VITE_AURORA_REGION as 'EU' | 'US') ?? 'EU',
    byoLlmProviders: providers,
    byoLlmDefault: (e.VITE_BYO_LLM_DEFAULT as ByoLlmProvider) ?? providers[0] ?? 'azure-openai',
    languages: ((e.VITE_LANGUAGES as string) ?? 'English,Spanish,French,German,Japanese,Mandarin')
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
