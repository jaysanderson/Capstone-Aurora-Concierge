/**
 * Rate-limit-aware /ask client.
 *
 * - Coalesces identical in-flight requests (same query + prompt hash) so
 *   N concurrent identical calls produce 1 ARAG call.
 * - 429 backoff: 2^attempt seconds, capped at 8s, max 4 retries.
 * - 15s per-call timeout via AbortController.
 * - Structured logs to console (drop-in for whatever observability you wire).
 */

import { loadEnv, kbBaseUrl, authHeaders } from './env';
import type { PromptConfig } from './ragClient';

export interface RateLimitedAskResult {
  answer: string;
  citations: Array<{ id: string; title: string }>;
  latencyMs: number;
  retries: number;
  fromCoalescing: boolean;
}

const MAX_RETRIES = 4;
const TIMEOUT_MS = 15_000;
const BACKOFF_MAX_MS = 8_000;

export class RateLimitedRagClient {
  private inFlight = new Map<string, Promise<RateLimitedAskResult>>();

  async ask(query: string, promptConfig?: PromptConfig): Promise<RateLimitedAskResult> {
    const key = this.cacheKey(query, promptConfig);
    const existing = this.inFlight.get(key);
    if (existing) {
      const result = await existing;
      return { ...result, fromCoalescing: true };
    }
    const promise = this.askWithBackoff(query, promptConfig, 0);
    this.inFlight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private cacheKey(query: string, promptConfig?: PromptConfig): string {
    return `ask:${query}:${JSON.stringify(promptConfig ?? {})}`;
  }

  private async askWithBackoff(
    query: string,
    promptConfig: PromptConfig | undefined,
    attempt: number,
  ): Promise<RateLimitedAskResult> {
    const startedAt = Date.now();
    log('ask-start', { query, attempt });
    try {
      const { answer, citations } = await this.askOnce(query, promptConfig);
      log('ask-end', {
        query,
        attempt,
        latencyMs: Date.now() - startedAt,
        status: 'ok',
      });
      return {
        answer,
        citations,
        latencyMs: Date.now() - startedAt,
        retries: attempt,
        fromCoalescing: false,
      };
    } catch (e) {
      const isRateLimited = e instanceof RateLimitError;
      if (isRateLimited && attempt < MAX_RETRIES) {
        const backoffMs = Math.min(2 ** attempt * 1000, BACKOFF_MAX_MS);
        log('rate-limited', { query, attempt, backoffMs });
        await sleep(backoffMs);
        return this.askWithBackoff(query, promptConfig, attempt + 1);
      }
      log('ask-end', {
        query,
        attempt,
        latencyMs: Date.now() - startedAt,
        status: 'error',
        error: (e as Error).message,
      });
      throw e;
    }
  }

  private async askOnce(
    query: string,
    promptConfig: PromptConfig | undefined,
  ): Promise<{ answer: string; citations: Array<{ id: string; title: string }> }> {
    const env = loadEnv();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${kbBaseUrl(env)}/ask`, {
        method: 'POST',
        headers: { ...authHeaders(env), 'x-synchronous': 'true' },
        signal: controller.signal,
        body: JSON.stringify({
          query,
          prefer_markdown: true,
          rephrase: true,
          max_tokens: 400,
          ...(promptConfig ? { prompt: promptConfig } : {}),
        }),
      });
      if (response.status === 429) {
        throw new RateLimitError('429 Too Many Requests');
      }
      if (!response.ok) {
        throw new Error(`ARAG /ask returned ${response.status} ${response.statusText}`);
      }
      const raw = (await response.json()) as Record<string, unknown>;
      const answer = (raw.answer as string) ?? '';
      const resources =
        ((raw.retrieval_results as { resources?: Record<string, { title?: string }> })?.resources) ?? {};
      const bestMatches = ((raw.retrieval_best_matches ?? []) as string[]);
      const citations = (bestMatches.length ? bestMatches : Object.keys(resources))
        .map((id) => ({ id, title: resources[id]?.title ?? id.slice(0, 8) }))
        .slice(0, 10);
      return { answer, citations };
    } finally {
      clearTimeout(timer);
    }
  }
}

class RateLimitError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'RateLimitError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(event: string, data: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
}
