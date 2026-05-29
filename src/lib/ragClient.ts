/**
 * Core ARAG client — sync /ask, streaming /ask, /find.
 *
 * Single source of truth for HTTP calls into the Atlas KB.
 * No SDK. Plain fetch + NDJSON parsing for the streaming case.
 */

import { loadEnv, kbBaseUrl, authHeaders } from './env';

export interface PromptConfig {
  system?: string;
  user?: string;
}

export interface AskOptions {
  query: string;
  promptConfig?: PromptConfig;
  preferMarkdown?: boolean;
  rephrase?: boolean;
  maxTokens?: number;
  filters?: string[];
}

export interface Citation {
  id: string;
  title: string;
  excerpt?: string;
  confidence?: number;
}

export interface AskSyncResult {
  answer: string;
  citations: Citation[];
  raw: Record<string, unknown>;
}

export interface FindOptions {
  query: string;
  pageSize?: number;
  features?: Array<'keyword' | 'semantic'>;
  filters?: string[];
  show?: string[];
}

export interface FindResult {
  resources: Record<string, ResourceHit>;
  bestMatches: string[];
  raw: Record<string, unknown>;
}

export interface ResourceHit {
  id: string;
  title: string;
  excerpt?: string;
  topScore: number;
  classifications: Array<{ labelset: string; label: string }>;
  callToAction?: string;
  searchResultDisplay?: { title?: string; description?: string; ctaLabel?: string };
}

/**
 * Streaming /ask — yields { type: 'answer-chunk' | 'citations' | 'done' }
 * Parses NDJSON across stream-chunk boundaries by accumulating a buffer
 * and locating balanced JSON objects.
 */
export type StreamEvent =
  | { type: 'answer-chunk'; text: string }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

export async function* streamAsk(opts: AskOptions): AsyncGenerator<StreamEvent> {
  const env = loadEnv();
  const body = JSON.stringify({
    query: opts.query,
    prefer_markdown: opts.preferMarkdown ?? true,
    rephrase: opts.rephrase ?? true,
    max_tokens: opts.maxTokens ?? 500,
    ...(opts.promptConfig ? { prompt: opts.promptConfig } : {}),
    ...(opts.filters && opts.filters.length > 0 ? { filters: opts.filters } : {}),
  });

  let response: Response;
  try {
    response = await fetch(`${kbBaseUrl(env)}/ask`, {
      method: 'POST',
      headers: authHeaders(env),
      body,
    });
  } catch (e) {
    yield { type: 'error', message: (e as Error).message };
    return;
  }

  if (!response.ok) {
    yield {
      type: 'error',
      message: `ARAG /ask returned ${response.status} ${response.statusText}`,
    };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', message: 'Response body has no reader.' };
    return;
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        const item = parsed?.item;
        if (!item) continue;
        if (item.type === 'answer' && typeof item.text === 'string') {
          yield { type: 'answer-chunk', text: item.text };
        } else if (item.type === 'retrieval' && item.results) {
          yield {
            type: 'citations',
            citations: extractCitations(item.results),
          };
        } else if (item.type === 'status') {
          yield { type: 'done' };
        }
      } catch {
        // Partial JSON — wait for more chunks.
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }
  yield { type: 'done' };
}

/**
 * Sync /ask — single JSON blob.
 */
export async function askSync(opts: AskOptions): Promise<AskSyncResult> {
  const env = loadEnv();
  const response = await fetch(`${kbBaseUrl(env)}/ask`, {
    method: 'POST',
    headers: {
      ...authHeaders(env),
      'x-synchronous': 'true',
    },
    body: JSON.stringify({
      query: opts.query,
      prefer_markdown: opts.preferMarkdown ?? true,
      rephrase: opts.rephrase ?? true,
      max_tokens: opts.maxTokens ?? 400,
      ...(opts.promptConfig ? { prompt: opts.promptConfig } : {}),
      ...(opts.filters && opts.filters.length > 0 ? { filters: opts.filters } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`ARAG /ask (sync) returned ${response.status} ${response.statusText}`);
  }
  const raw = (await response.json()) as Record<string, unknown>;
  return {
    answer: (raw.answer as string) ?? '',
    citations: extractCitations(raw.retrieval_results as Record<string, unknown> | undefined),
    raw,
  };
}

/**
 * /find — hybrid retrieval.
 */
export async function find(opts: FindOptions): Promise<FindResult> {
  const env = loadEnv();
  const response = await fetch(`${kbBaseUrl(env)}/find`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({
      query: opts.query,
      page_size: opts.pageSize ?? 10,
      features: opts.features ?? ['keyword', 'semantic'],
      show: opts.show ?? ['basic', 'values', 'origin'],
      ...(opts.filters && opts.filters.length > 0 ? { filters: opts.filters } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`ARAG /find returned ${response.status} ${response.statusText}`);
  }
  const raw = (await response.json()) as {
    resources?: Record<string, unknown>;
    best_matches?: string[];
  };
  const resources: Record<string, ResourceHit> = {};
  for (const [id, r] of Object.entries(raw.resources ?? {})) {
    resources[id] = normaliseResource(id, r as Record<string, unknown>);
  }
  return {
    resources,
    bestMatches: raw.best_matches ?? [],
    raw: raw as unknown as Record<string, unknown>,
  };
}

/* ---- helpers ---- */

function extractCitations(retrievalResults: Record<string, unknown> | undefined): Citation[] {
  if (!retrievalResults) return [];
  const resources = (retrievalResults as { resources?: Record<string, unknown> }).resources ?? {};
  const bestMatches = (retrievalResults as { best_matches?: string[] }).best_matches ?? [];
  const orderedIds = bestMatches.length > 0 ? bestMatches : Object.keys(resources);
  return orderedIds
    .map((id) => {
      const r = resources[id] as Record<string, unknown> | undefined;
      if (!r) return null;
      const title = (r.title as string) ?? (id.slice(0, 8) as string);
      const excerpt = extractExcerpt(r);
      const topScore = extractTopScore(r);
      return { id, title, excerpt, confidence: topScore } as Citation;
    })
    .filter((c): c is Citation => c !== null);
}

function normaliseResource(id: string, r: Record<string, unknown>): ResourceHit {
  const classifications = extractClassifications(r);
  return {
    id,
    title: (r.title as string) ?? id.slice(0, 8),
    excerpt: extractExcerpt(r),
    topScore: extractTopScore(r),
    classifications,
    callToAction: extractCustomField(r, 'callToAction') as string | undefined,
    searchResultDisplay: extractCustomField(r, 'searchResultDisplay') as ResourceHit['searchResultDisplay'],
  };
}

function extractExcerpt(r: Record<string, unknown>): string | undefined {
  const fields = (r.fields as Record<string, unknown>) ?? {};
  for (const field of Object.values(fields)) {
    const paragraphs = (field as { paragraphs?: Array<{ text?: string }> }).paragraphs;
    if (paragraphs && paragraphs[0]?.text) return paragraphs[0].text.slice(0, 240);
  }
  return undefined;
}

function extractTopScore(r: Record<string, unknown>): number {
  const fields = (r.fields as Record<string, unknown>) ?? {};
  let best = 0;
  for (const field of Object.values(fields)) {
    const paragraphs = (field as { paragraphs?: Array<{ score?: number }> }).paragraphs ?? [];
    for (const p of paragraphs) {
      if (typeof p.score === 'number' && p.score > best) best = p.score;
    }
  }
  return best;
}

function extractClassifications(
  r: Record<string, unknown>,
): Array<{ labelset: string; label: string }> {
  const usermeta = (r.usermetadata as Record<string, unknown>) ?? {};
  const cls = (usermeta.classifications ?? r.classifications ?? []) as Array<{
    labelset?: string;
    label?: string;
  }>;
  return cls
    .filter((c) => c.labelset && c.label)
    .map((c) => ({ labelset: c.labelset as string, label: c.label as string }));
}

function extractCustomField(r: Record<string, unknown>, name: string): unknown {
  const usermeta = (r.usermetadata as Record<string, unknown>) ?? {};
  const custom = (usermeta.custom as Record<string, unknown>) ?? {};
  if (custom[name] !== undefined) {
    return typeof custom[name] === 'string'
      ? safeJsonParse(custom[name] as string)
      : custom[name];
  }
  const data = (r.data as { texts?: Record<string, { body?: unknown }> }) ?? {};
  const text = data.texts?.[name]?.body;
  if (typeof text === 'string') return safeJsonParse(text);
  return undefined;
}

function safeJsonParse(s: string): unknown {
  const trimmed = s.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fall through */
    }
  }
  return s;
}
