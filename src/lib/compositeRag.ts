/**
 * Composite RAG — chain initial /ask → eval → /find → graph traversal → re-ask.
 *
 * Used by /abandoned-cart (winback pipeline). The pipeline steps are exposed
 * in the return value so the UI can visualise each step's outcome.
 */

import { askSync, find, type Citation, type AskSyncResult } from './ragClient';
import { queryPaths, type GraphPath } from './graphClient';

export interface CompositeStep {
  step: 'initial-ask' | 'evaluate' | 'find' | 'graph' | 're-ask';
  label: string;
  durationMs: number;
  outcome: string;
}

export interface CompositeResult {
  answer: string;
  citations: Citation[];
  steps: CompositeStep[];
  graphPaths: GraphPath[];
  finalConfidence: number;
}

export interface CompositeOptions {
  query: string;
  initialFilters?: string[];
  graphSeedEntities?: Array<{ value: string; group: string }>;
  citationCountThreshold?: number;
  topConfidenceThreshold?: number;
}

const DEFAULT_CITATION_COUNT = 3;
const DEFAULT_TOP_CONFIDENCE = 0.7;
const PIPELINE_TIMEOUT_MS = 12_000;

// Realistic dev URLs used by structured outputs (e.g. winback CTAs).
// Surfaced from a single constant so demos never leak example.com TLDs.
export const AURORA_SITE_ORIGIN = 'https://aurora-outfitters.com';

export async function compositeAsk(opts: CompositeOptions): Promise<CompositeResult> {
  const startedAt = Date.now();
  const steps: CompositeStep[] = [];
  const result = await Promise.race([
    runPipeline(opts, steps),
    timeoutGuard(startedAt, steps),
  ]);
  return result;
}

async function runPipeline(
  opts: CompositeOptions,
  steps: CompositeStep[],
): Promise<CompositeResult> {
  const initStart = Date.now();
  const initial = await askSync({
    query: opts.query,
    filters: opts.initialFilters,
    maxTokens: 500,
  });
  const initialTop = topConfidence(initial);
  steps.push({
    step: 'initial-ask',
    label: 'Initial /ask',
    durationMs: Date.now() - initStart,
    // Confidence metric is only emitted when the response actually carries
    // paragraph scores — otherwise it reads as "top confidence 0.00" and
    // contradicts the cited output (Issue #4).
    outcome: initialTop > 0
      ? `${initial.citations.length} citations, top confidence ${formatScore(initialTop)}`
      : `${initial.citations.length} citations retrieved`,
  });

  const evalStart = Date.now();
  const initialConfident = isConfident(
    initial,
    opts.citationCountThreshold ?? DEFAULT_CITATION_COUNT,
    opts.topConfidenceThreshold ?? DEFAULT_TOP_CONFIDENCE,
  );
  steps.push({
    step: 'evaluate',
    label: 'Evaluate confidence',
    durationMs: Date.now() - evalStart,
    outcome: initialConfident
      ? 'Confident — returning initial answer.'
      : 'Low confidence — running augmentation pipeline.',
  });

  if (initialConfident) {
    return {
      answer: initial.answer,
      citations: initial.citations,
      steps,
      graphPaths: [],
      finalConfidence: topConfidence(initial),
    };
  }

  // Parallelise /find broadening and graph traversal — they're independent
  // lookups, so we don't pay the latency twice.
  const findStart = Date.now();
  const graphStart = findStart;
  const findPromise = find({
    query: opts.query,
    pageSize: 5,
    features: ['keyword', 'semantic'],
    show: ['basic', 'values', 'origin'],
  });
  const graphPromise: Promise<GraphPath[]> =
    opts.graphSeedEntities && opts.graphSeedEntities.length > 0
      ? Promise.all(
          opts.graphSeedEntities.map((seed) =>
            queryPaths(seed).catch(() => [] as GraphPath[]),
          ),
        ).then((all) => dedupePaths(all.flat()).slice(0, 8))
      : Promise.resolve([]);

  const [broader, graphPaths] = await Promise.all([findPromise, graphPromise]);
  const additionalResources = Object.values(broader.resources);
  steps.push({
    step: 'find',
    label: 'Broaden via /find',
    durationMs: Date.now() - findStart,
    outcome: `${additionalResources.length} additional candidates retrieved.`,
  });
  if (opts.graphSeedEntities && opts.graphSeedEntities.length > 0) {
    steps.push({
      step: 'graph',
      label: 'Graph traversal',
      durationMs: Date.now() - graphStart,
      outcome: `${graphPaths.length} typed paths from ${opts.graphSeedEntities.length} seed entities.`,
    });
  }

  // Re-ask with a tighter augmented context: top-K only, shorter excerpts.
  // Cuts the re-ask round-trip dramatically without losing recall.
  const reaskStart = Date.now();
  const augmentedPrompt = buildAugmentedPrompt(opts.query, additionalResources, graphPaths);
  const reasked = await askSync({
    query: opts.query,
    maxTokens: 500,
    promptConfig: {
      system:
        'You are an expert analyst with access to additional augmented context. ' +
        'Use it to produce a more complete and well-cited answer than the initial retrieval allowed.',
      user: augmentedPrompt,
    },
  });
  const mergedCitations = mergeCitations(initial.citations, reasked.citations);
  steps.push({
    step: 're-ask',
    label: 'Re-ask with augmented context',
    durationMs: Date.now() - reaskStart,
    // Bind to merged citation count, not just the re-ask response —
    // otherwise the metric shows 0 even when the initial pass found sources.
    outcome: `${mergedCitations.length} merged citations`,
  });
  return {
    answer: reasked.answer,
    citations: mergedCitations,
    steps,
    graphPaths,
    finalConfidence: topConfidence(reasked),
  };
}

function isConfident(r: AskSyncResult, minCitations: number, minTopConfidence: number): boolean {
  const cites = Array.isArray(r?.citations) ? r.citations : [];
  return cites.length >= minCitations && topConfidence(r) >= minTopConfidence;
}

function topConfidence(r: AskSyncResult): number {
  const cites = Array.isArray(r?.citations) ? r.citations : [];
  return cites.reduce((m, c) => Math.max(m, c?.confidence ?? 0), 0);
}

function mergeCitations(a: Citation[] | undefined, b: Citation[] | undefined): Citation[] {
  // Defensive: a malformed askSync response could return undefined here.
  // Spreading undefined throws "o is not iterable" in minified bundles.
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  const map = new Map<string, Citation>();
  for (const c of [...left, ...right]) {
    if (!c || !c.id) continue;
    const existing = map.get(c.id);
    if (!existing || (c.confidence ?? 0) > (existing.confidence ?? 0)) map.set(c.id, c);
  }
  return [...map.values()].sort((x, y) => (y.confidence ?? 0) - (x.confidence ?? 0));
}

function dedupePaths(paths: GraphPath[] | undefined): GraphPath[] {
  if (!Array.isArray(paths)) return [];
  const seen = new Set<string>();
  const out: GraphPath[] = [];
  for (const p of paths) {
    if (!p?.source?.value || !p?.relation?.label || !p?.destination?.value) continue;
    const key = `${p.source.value}|${p.relation.label}|${p.destination.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

// Augmented prompt is intentionally tight: top-K resources, short excerpts,
// truncated graph summary. The re-ask round-trip scales with payload size.
const AUGMENT_TOP_K = 4;
const AUGMENT_EXCERPT_CHARS = 140;
const AUGMENT_MAX_GRAPH_PATHS = 8;

function buildAugmentedPrompt(
  query: string,
  resources: Array<{ id: string; title: string; excerpt?: string }>,
  graphPaths: GraphPath[],
): string {
  const context = resources
    .slice(0, AUGMENT_TOP_K)
    .map((r, idx) => `Source ${idx + 1}: ${r.title}\n${(r.excerpt ?? '').slice(0, AUGMENT_EXCERPT_CHARS)}`)
    .join('\n\n');
  const graphSummary = graphPaths.length
    ? '\n\nGraph traversal results:\n' +
      graphPaths
        .slice(0, AUGMENT_MAX_GRAPH_PATHS)
        .map((p) => `${p.source.value} -[${p.relation.label}]-> ${p.destination.value}`)
        .join('\n')
    : '';
  return `Additional context:\n${context}${graphSummary}\n\nQuestion: ${query}\n\nProvide a complete, well-cited answer using the context above.`;
}

function formatScore(score: number): string {
  return score.toFixed(2);
}

async function timeoutGuard(
  startedAt: number,
  steps: CompositeStep[],
): Promise<CompositeResult> {
  await new Promise((resolve) => setTimeout(resolve, PIPELINE_TIMEOUT_MS));
  steps.push({
    step: 're-ask',
    label: 'Timeout',
    durationMs: Date.now() - startedAt,
    outcome: 'Pipeline exceeded 12s — returning partial result.',
  });
  return {
    answer: 'Composite pipeline timed out. Partial result returned.',
    citations: [],
    steps,
    graphPaths: [],
    finalConfidence: 0,
  };
}