/**
 * Composite RAG — chain initial /ask → eval → /find → graph traversal → re-ask.
 *
 * Used by /incident-root-cause. The pipeline steps are exposed in the
 * return value so the UI can visualise each step's outcome.
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
const PIPELINE_TIMEOUT_MS = 15_000;

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
  steps.push({
    step: 'initial-ask',
    label: 'Initial /ask',
    durationMs: Date.now() - initStart,
    outcome: `${initial.citations.length} citations, top confidence ${formatScore(topConfidence(initial))}`,
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

  const findStart = Date.now();
  const broader = await find({
    query: opts.query,
    pageSize: 8,
    features: ['keyword', 'semantic'],
    show: ['basic', 'values', 'origin'],
  });
  const additionalResources = Object.values(broader.resources);
  steps.push({
    step: 'find',
    label: 'Broaden via /find',
    durationMs: Date.now() - findStart,
    outcome: `${additionalResources.length} additional candidates retrieved.`,
  });

  let graphPaths: GraphPath[] = [];
  const graphStart = Date.now();
  if (opts.graphSeedEntities && opts.graphSeedEntities.length > 0) {
    const allPaths = await Promise.all(
      opts.graphSeedEntities.map((seed) =>
        queryPaths(seed).catch(() => [] as GraphPath[]),
      ),
    );
    graphPaths = dedupePaths(allPaths.flat()).slice(0, 12);
    steps.push({
      step: 'graph',
      label: 'Graph traversal',
      durationMs: Date.now() - graphStart,
      outcome: `${graphPaths.length} typed paths from ${opts.graphSeedEntities.length} seed entities.`,
    });
  }

  const reaskStart = Date.now();
  const augmentedPrompt = buildAugmentedPrompt(opts.query, additionalResources, graphPaths);
  const reasked = await askSync({
    query: opts.query,
    maxTokens: 700,
    promptConfig: {
      system:
        'You are an expert analyst with access to additional augmented context. ' +
        'Use it to produce a more complete and well-cited answer than the initial retrieval allowed.',
      user: augmentedPrompt,
    },
  });
  steps.push({
    step: 're-ask',
    label: 'Re-ask with augmented context',
    durationMs: Date.now() - reaskStart,
    outcome: `${reasked.citations.length} merged citations.`,
  });

  const mergedCitations = mergeCitations(initial.citations, reasked.citations);
  return {
    answer: reasked.answer,
    citations: mergedCitations,
    steps,
    graphPaths,
    finalConfidence: topConfidence(reasked),
  };
}

function isConfident(r: AskSyncResult, minCitations: number, minTopConfidence: number): boolean {
  return r.citations.length >= minCitations && topConfidence(r) >= minTopConfidence;
}

function topConfidence(r: AskSyncResult): number {
  return r.citations.reduce((m, c) => Math.max(m, c.confidence ?? 0), 0);
}

function mergeCitations(a: Citation[], b: Citation[]): Citation[] {
  const map = new Map<string, Citation>();
  for (const c of [...a, ...b]) {
    const existing = map.get(c.id);
    if (!existing || (c.confidence ?? 0) > (existing.confidence ?? 0)) map.set(c.id, c);
  }
  return [...map.values()].sort((x, y) => (y.confidence ?? 0) - (x.confidence ?? 0));
}

function dedupePaths(paths: GraphPath[]): GraphPath[] {
  const seen = new Set<string>();
  const out: GraphPath[] = [];
  for (const p of paths) {
    const key = `${p.source.value}|${p.relation.label}|${p.destination.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function buildAugmentedPrompt(
  query: string,
  resources: Array<{ id: string; title: string; excerpt?: string }>,
  graphPaths: GraphPath[],
): string {
  const context = resources
    .map((r, idx) => `Source ${idx + 1}: ${r.title}\n${(r.excerpt ?? '').slice(0, 240)}`)
    .join('\n\n');
  const graphSummary = graphPaths.length
    ? '\n\nGraph traversal results:\n' +
      graphPaths
        .map((p) => `${p.source.value} -[${p.relation.label}]-> ${p.destination.value}`)
        .join('\n')
    : '';
  return `Initial context: {context}\n\nAdditional context:\n${context}${graphSummary}\n\nQuestion: ${query}\n\nProvide a complete, well-cited answer using ALL the available context.`;
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
    outcome: 'Pipeline exceeded 15s — returning partial result.',
  });
  return {
    answer: 'Composite pipeline timed out. Partial result returned.',
    citations: [],
    steps,
    graphPaths: [],
    finalConfidence: 0,
  };
}