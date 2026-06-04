/**
 * Core ARAG client — sync /ask, streaming /ask, /find.
 *
 * Single source of truth for HTTP calls into the Aurora KB.
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

/**
 * Fetch a single KB resource by id and return its full Markdown document.
 * Backs the internal resource viewer (/r/:id). The body lives at
 * data.texts.body.value.body (verified against the live KB).
 */
export interface ResourceDoc {
  id: string;
  title: string;
  body: string; // markdown, frontmatter + duplicate H1 stripped
  contentType?: string;
  classifications: Array<{ labelset: string; label: string }>;
}

export class ResourceNotFoundError extends Error {
  constructor(id: string) {
    super(`Resource ${id} not found`);
    this.name = 'ResourceNotFoundError';
  }
}

export async function getResource(id: string): Promise<ResourceDoc> {
  const env = loadEnv();
  const response = await fetch(
    `${kbBaseUrl(env)}/resource/${encodeURIComponent(id)}?show=basic&show=values`,
    { headers: authHeaders(env) },
  );
  if (response.status === 404) throw new ResourceNotFoundError(id);
  if (!response.ok) {
    throw new Error(`ARAG /resource returned ${response.status} ${response.statusText}`);
  }
  const raw = (await response.json()) as Record<string, unknown>;
  const title = String((raw.title as string) ?? '').replace(/^#+\s*/, '').trim();
  const classifications = extractClassifications(raw);
  const contentType = classifications.find((c) => c.labelset === 'content_type')?.label;
  return {
    id,
    title: title || 'Untitled resource',
    body: extractBody(raw, title),
    contentType,
    classifications,
  };
}

function extractBody(raw: Record<string, unknown>, title: string): string {
  const texts =
    ((raw as { data?: { texts?: Record<string, { value?: { body?: unknown } }> } })?.data?.texts) ?? {};
  let body = (texts.body?.value?.body as string | undefined) ?? '';
  if (typeof body !== 'string') return '';
  // Strip YAML frontmatter (same shape as extractExcerpt) and a leading BOM.
  body = body.replace(/^﻿?/, '').replace(/^\s*---\n[\s\S]*?\n---\n/, '').trimStart();
  // Drop a leading H1 that just repeats the resource title (no double heading).
  if (title) {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    body = body.replace(/^#\s+(.+?)\s*\n+/, (m, h1: string) => (norm(h1) === norm(title) ? '' : m));
  }
  return body.trim();
}

/* ---- helpers ---- */

function extractCitations(retrievalResults: Record<string, unknown> | undefined): Citation[] {
  if (!retrievalResults) return [];
  const resources = (retrievalResults as { resources?: Record<string, unknown> }).resources ?? {};
  const bestMatches = (retrievalResults as { best_matches?: string[] }).best_matches ?? [];
  // best_matches contains paragraph references shaped like
  //   "<resource_id>/t/body/0-484"
  // — NOT resource IDs — so a naive resources[id] lookup always misses and
  // every /ask answer reads "0 sources" downstream (the page-1 credibility
  // bug on Storefront). Strip the paragraph suffix to derive the real rid,
  // de-dup, and preserve best_matches ordering.
  let orderedIds: string[];
  if (bestMatches.length > 0) {
    const seen = new Set<string>();
    orderedIds = [];
    for (const ref of bestMatches) {
      const rid = String(ref).split('/')[0];
      if (!rid || seen.has(rid)) continue;
      seen.add(rid);
      orderedIds.push(rid);
    }
  } else {
    orderedIds = Object.keys(resources);
  }
  return orderedIds
    .map((id) => {
      const r = resources[id] as Record<string, unknown> | undefined;
      if (!r) return null;
      const rawTitle = (r.title as string) ?? '';
      const title = rawTitle.replace(/^#+\s*/, '').trim() || id.slice(0, 8);
      const excerpt = extractExcerpt(r);
      const topScore = extractTopScore(r);
      return { id, title, excerpt, confidence: topScore } as Citation;
    })
    .filter((c): c is Citation => c !== null);
}

function normaliseResource(id: string, r: Record<string, unknown>): ResourceHit {
  // Defensive: any helper failing should not abort the whole find() —
  // surface degraded but renderable data, not a TypeError.
  try {
    return {
      id,
      title: (r?.title as string) ?? id.slice(0, 8),
      excerpt: extractExcerpt(r),
      topScore: extractTopScore(r),
      classifications: extractClassifications(r),
      callToAction: extractCustomField(r, 'callToAction') as string | undefined,
      searchResultDisplay: extractCustomField(r, 'searchResultDisplay') as ResourceHit['searchResultDisplay'],
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[ragClient] normaliseResource failed for ${id}:`, e);
    return {
      id,
      title: (r?.title as string) ?? id.slice(0, 8),
      topScore: 0,
      classifications: [],
    };
  }
}

function extractExcerpt(r: Record<string, unknown> | undefined | null): string | undefined {
  if (!r) return undefined;
  try {
    // Modern Nuclia tenants surface text under data.texts.<field>.value.body.
    // Older tenants (Foundation builds) use r.fields.<field>.paragraphs.
    const data = (r as { data?: { texts?: Record<string, unknown> } })?.data;
    const texts = (data?.texts as Record<string, { value?: { body?: unknown } }> | undefined) ?? {};
    const body = (texts.body?.value?.body as string | undefined);
    if (typeof body === 'string' && body.length > 0) {
      // Strip YAML frontmatter so the excerpt isn't all frontmatter metadata.
      const stripped = body.replace(/^---\n[\s\S]*?\n---\n/, '');
      return stripped.replace(/^#+\s+.*\n+/, '').trim().slice(0, 240);
    }
    // Fallback: older paragraphs path.
    const fields = ((r as { fields?: Record<string, unknown> })?.fields as Record<string, unknown> | undefined) ?? {};
    for (const field of Object.values(fields)) {
      const paragraphs = (field as { paragraphs?: Array<{ text?: string }> })?.paragraphs;
      if (Array.isArray(paragraphs) && paragraphs[0]?.text) return paragraphs[0].text.slice(0, 240);
    }
  } catch { /* fall through */ }
  return undefined;
}

function extractTopScore(r: Record<string, unknown> | undefined | null): number {
  if (!r) return 0;
  try {
    let best = 0;
    // Modern Nuclia tenant path — paragraphs hang off data.texts.<field>.
    // Each paragraph entry may expose `score` directly, or nest it under
    // `metadata.score` / `score_type`. Try both shapes so this works across
    // tenant versions.
    const texts = ((r as { data?: { texts?: Record<string, unknown> } })?.data?.texts as
      Record<string, unknown> | undefined) ?? {};
    for (const field of Object.values(texts)) {
      const paragraphs =
        ((field as { value?: { paragraphs?: Array<{ score?: number; metadata?: { score?: number } }> } })?.value?.paragraphs) ??
        ((field as { paragraphs?: Array<{ score?: number; metadata?: { score?: number } }> })?.paragraphs) ??
        [];
      if (!Array.isArray(paragraphs)) continue;
      for (const p of paragraphs) {
        const s = typeof p?.score === 'number' ? p.score : p?.metadata?.score;
        if (typeof s === 'number' && s > best) best = s;
      }
    }
    // Legacy Foundation-tenant path — r.fields.<field>.paragraphs.
    const fields = ((r as { fields?: Record<string, unknown> })?.fields as Record<string, unknown> | undefined) ?? {};
    for (const field of Object.values(fields)) {
      const paragraphs = ((field as { paragraphs?: Array<{ score?: number }> })?.paragraphs) ?? [];
      if (!Array.isArray(paragraphs)) continue;
      for (const p of paragraphs) {
        if (typeof p?.score === 'number' && p.score > best) best = p.score;
      }
    }
    // Top-level best_match score, when /find surfaces it on the resource hit itself.
    const topLevelScore = (r as { score?: number; top_score?: number })?.score ??
      (r as { top_score?: number })?.top_score;
    if (typeof topLevelScore === 'number' && topLevelScore > best) best = topLevelScore;
    return best;
  } catch { return 0; }
}

function extractClassifications(
  r: Record<string, unknown> | undefined | null,
): Array<{ labelset: string; label: string }> {
  if (!r) return [];
  try {
    const usermeta = ((r as { usermetadata?: Record<string, unknown> })?.usermetadata as Record<string, unknown> | undefined) ?? {};
    const raw = usermeta.classifications ?? (r as { classifications?: unknown }).classifications ?? [];
    if (!Array.isArray(raw)) return [];
    return (raw as Array<{ labelset?: string; label?: string }>)
      .filter((c) => c && c.labelset && c.label)
      .map((c) => ({ labelset: c.labelset as string, label: c.label as string }));
  } catch { return []; }
}

function extractCustomField(r: Record<string, unknown> | undefined | null, name: string): unknown {
  if (!r) return undefined;
  try {
    // Path 1 — usermetadata.custom (some tenant configs).
    const usermeta = ((r as { usermetadata?: Record<string, unknown> })?.usermetadata as Record<string, unknown> | undefined) ?? {};
    const custom = (usermeta.custom as Record<string, unknown> | undefined) ?? {};
    if (custom[name] !== undefined) {
      return typeof custom[name] === 'string'
        ? safeJsonParse(custom[name] as string)
        : custom[name];
    }
    // Path 2 — data.texts.<name>.value.body (the canonical Nuclia text-field path).
    // populate-custom-fields.mjs PATCHes here.
    const data = ((r as { data?: { texts?: Record<string, unknown> } })?.data?.texts as Record<string, { value?: { body?: unknown } }> | undefined) ?? {};
    const text = data[name]?.value?.body;
    if (typeof text === 'string') return safeJsonParse(text);
  } catch { /* fall through */ }
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
