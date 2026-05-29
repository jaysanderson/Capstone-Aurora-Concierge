/**
 * Graph client — typed entity navigation via /graph and /graph/nodes.
 *
 * Every path query carries the {prop:'generated', by:'data-augmentation'}
 * filter so we only see entities from the Atlas custom extraction agent —
 * not the default NER noise (DATE, ORG, MONEY, etc.).
 *
 * Client-side blocklist filters out residual NER groups and GUID-shaped
 * entity values that the agent occasionally lets through.
 */

import { loadEnv, kbBaseUrl, authHeaders } from './env';

export interface GraphNode {
  value: string;
  type: 'ENTITY';
  group: string;
}

export interface GraphRelation {
  label: string;
  type?: string;
}

export interface GraphPath {
  source: GraphNode;
  relation: GraphRelation;
  destination: GraphNode;
}

const NER_BLOCKLIST = new Set([
  'DATE',
  'TIME',
  'MONEY',
  'PERCENT',
  'QUANTITY',
  'ORDINAL',
  'CARDINAL',
  'GPE',
  'LOC',
  'NORP',
  'WORK_OF_ART',
  'LAW',
  'LANGUAGE',
  'EVENT',
  // raw PERSON/ORG often appear from default NER even after custom agent
  // ran — we keep custom types like EMPLOYEE / CUSTOMER and drop these.
  'PERSON',
  'ORG',
]);

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function passesBlocklist(n: GraphNode | undefined): boolean {
  if (!n || !n.value) return false;
  if (NER_BLOCKLIST.has(n.group?.toUpperCase?.() ?? '')) return false;
  if (GUID_RE.test(n.value)) return false;
  return true;
}

const DATA_AUG_FILTER = { prop: 'generated', by: 'data-augmentation' } as const;

export async function queryNodesByGroup(group: string): Promise<GraphNode[]> {
  const env = loadEnv();
  const response = await fetch(`${kbBaseUrl(env)}/graph/nodes`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({
      query: { prop: 'node', group },
      top_k: 500,
    }),
  });
  if (!response.ok) {
    throw new Error(`/graph/nodes returned ${response.status}`);
  }
  const raw = (await response.json()) as { nodes?: GraphNode[] };
  return (raw.nodes ?? []).filter(passesBlocklist);
}

export async function queryFuzzyNodes(value: string): Promise<GraphNode[]> {
  if (!value || value.length < 2) return [];
  const env = loadEnv();
  const response = await fetch(`${kbBaseUrl(env)}/graph/nodes`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({
      query: { prop: 'node', value, match: 'fuzzy' },
      top_k: 50,
    }),
  });
  if (!response.ok) return [];
  const raw = (await response.json()) as { nodes?: GraphNode[] };
  return (raw.nodes ?? []).filter(passesBlocklist);
}

export async function queryPaths(node: { value: string; group: string }): Promise<GraphPath[]> {
  const env = loadEnv();
  const response = await fetch(`${kbBaseUrl(env)}/graph`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({
      query: {
        and: [
          { prop: 'path', source: node, undirected: true },
          DATA_AUG_FILTER,
        ],
      },
      top_k: 100,
    }),
  });
  if (!response.ok) return [];
  const raw = (await response.json()) as { paths?: GraphPath[] };
  return (raw.paths ?? []).filter(
    (p) => passesBlocklist(p.source) && passesBlocklist(p.destination),
  );
}

export async function searchRelatedResources(
  entityValue: string,
): Promise<Array<{ id: string; title: string; excerpt?: string }>> {
  const env = loadEnv();
  const response = await fetch(`${kbBaseUrl(env)}/find`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({
      query: entityValue,
      features: ['keyword', 'semantic'],
      page_size: 8,
      show: ['basic', 'values', 'origin'],
    }),
  });
  if (!response.ok) return [];
  const raw = (await response.json()) as {
    resources?: Record<string, { title?: string; fields?: Record<string, { paragraphs?: Array<{ text?: string }> }> }>;
    best_matches?: string[];
  };
  const resources = raw.resources ?? {};
  return (raw.best_matches ?? Object.keys(resources)).map((id) => {
    const r = resources[id];
    const firstParagraph = Object.values(r?.fields ?? {}).flatMap(
      (f) => f?.paragraphs ?? [],
    )[0];
    return {
      id,
      title: r?.title ?? id.slice(0, 8),
      excerpt: firstParagraph?.text?.slice(0, 240),
    };
  });
}
