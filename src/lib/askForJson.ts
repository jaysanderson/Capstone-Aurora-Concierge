/**
 * Schema-constrained generation wrapper.
 *
 * - Recursively injects additionalProperties: false at every object level.
 * - Falls back through three response shapes (answer_json, item.object,
 *   regex-extracted JSON from a prose answer).
 *
 * Same contract as Foundations Build 5's askForJson.mjs but with TS types.
 */

import { loadEnv, kbBaseUrl, authHeaders } from './env';

export interface SchemaParameters {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: false;
}

export interface AnswerJsonSchema {
  name: string;
  description?: string;
  parameters: SchemaParameters;
}

export interface AskForJsonOptions<T> {
  query: string;
  schema: AnswerJsonSchema;
  preferMarkdown?: boolean;
  rephrase?: boolean;
  promptConfig?: { system?: string; user?: string };
  // type guard / runtime validation hook
  validate?: (raw: unknown) => raw is T;
}

export async function askForJson<T = Record<string, unknown>>(
  opts: AskForJsonOptions<T>,
): Promise<T> {
  const env = loadEnv();
  const wrappedSchema: AnswerJsonSchema = {
    ...opts.schema,
    parameters: injectAdditionalProperties(opts.schema.parameters),
  };
  const body = JSON.stringify({
    query: opts.query,
    prefer_markdown: opts.preferMarkdown ?? false,
    rephrase: opts.rephrase ?? true,
    answer_json_schema: wrappedSchema,
    ...(opts.promptConfig ? { prompt: opts.promptConfig } : {}),
  });
  const response = await fetch(`${kbBaseUrl(env)}/ask`, {
    method: 'POST',
    headers: { ...authHeaders(env), 'x-synchronous': 'true' },
    body,
  });
  if (!response.ok) {
    throw new Error(`askForJson: ARAG /ask returned ${response.status} ${response.statusText}`);
  }
  const raw = (await response.json()) as Record<string, unknown>;

  // Path A: data.answer_json
  if (raw.answer_json && typeof raw.answer_json === 'object') {
    const candidate = raw.answer_json as T;
    if (!opts.validate || opts.validate(candidate)) return candidate;
  }

  // Path B: data.item.object (streaming-stash form)
  const item = (raw as { item?: { object?: T } }).item;
  if (item?.object && typeof item.object === 'object') {
    const candidate = item.object;
    if (!opts.validate || opts.validate(candidate)) return candidate;
  }

  // Path C: text fallback — strip ```json fences, regex match { ... } or [ ... ].
  const answer = raw.answer as string | undefined;
  if (typeof answer === 'string') {
    const stripped = answer.replace(/```json|```/gi, '').trim();
    const objMatch = stripped.match(/\{[\s\S]*\}/);
    const arrMatch = stripped.match(/\[[\s\S]*\]/);
    const candidate = objMatch?.[0] ?? arrMatch?.[0];
    if (candidate) {
      try {
        const parsed = JSON.parse(candidate) as T;
        if (!opts.validate || opts.validate(parsed)) return parsed;
      } catch {
        /* fall through */
      }
    }
  }

  throw new Error(
    `askForJson: could not extract a parseable JSON object from the ARAG response.\n` +
      `First 500 chars: ${JSON.stringify(raw).slice(0, 500)}`,
  );
}

/* ---- additionalProperties: false injector ---- */

export function injectAdditionalProperties<T extends object>(schema: T): T {
  const cloned = deepClone(schema) as Record<string, unknown>;
  walk(cloned);
  return cloned as T;
}

function walk(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(walk);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (obj.type === 'object') {
    obj.additionalProperties = false;
    if (obj.properties && typeof obj.properties === 'object') {
      for (const value of Object.values(obj.properties as Record<string, unknown>)) {
        walk(value);
      }
    }
  }
  if (obj.type === 'array' && obj.items) {
    walk(obj.items);
  }
}

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}
