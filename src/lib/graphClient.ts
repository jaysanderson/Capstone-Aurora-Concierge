/**
 * Graph client — typed entity navigation via /graph and /graph/nodes.
 *
 * EVERY query — node-by-group, fuzzy, and path — carries the
 * {prop:'generated', by:'data-augmentation'} filter so we ONLY see entities
 * from Aurora's custom journey-graph agent. Default Nuclia NER (PERSON,
 * ORG, GPE, DATE, MONEY, etc.) is never surfaced. This is critical:
 * without the filter, fuzzy("mara") returns NER's PERSON "Mara" alongside
 * AMBASSADOR "Mara Chen" and the page becomes noise.
 *
 * Client-side blocklist is a belt-and-braces safety net for any residual
 * NER groups + GUID-shaped values the API occasionally lets slip.
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

/**
 * Collapse entity-resolution duplicates inside a single group. When the
 * data-augmentation agent emits both 'Mara' and 'Mara Chen' for the same
 * ambassador we keep the longer (canonical) value. Strict-substring match
 * only — short, distinct names like 'Sam' / 'Sam Walker' collapse, but
 * 'Tasmania' and 'Tasmania Overland Track' would too, which we want for
 * a single canonical destination node.
 */
function dedupeBySubstring(nodes: GraphNode[]): GraphNode[] {
  const values = nodes.map((n) => n.value);
  return nodes.filter((n) => {
    const v = n.value.toLowerCase();
    return !values.some((other) => {
      if (other === n.value) return false;
      const o = other.toLowerCase();
      return o.length > v.length && o.includes(v);
    });
  });
}

export async function queryNodesByGroup(group: string): Promise<GraphNode[]> {
  const env = loadEnv();
  const response = await fetch(`${kbBaseUrl(env)}/graph/nodes`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({
      query: {
        and: [
          { prop: 'node', group },
          DATA_AUG_FILTER,
        ],
      },
      top_k: 500,
    }),
  });
  if (!response.ok) {
    throw new Error(`/graph/nodes returned ${response.status}`);
  }
  const raw = (await response.json()) as { nodes?: GraphNode[] };
  const filtered = (raw.nodes ?? []).filter(passesBlocklist);
  return dedupeBySubstring(filtered);
}

export async function queryFuzzyNodes(value: string): Promise<GraphNode[]> {
  if (!value || value.length < 2) return [];
  const env = loadEnv();
  const response = await fetch(`${kbBaseUrl(env)}/graph/nodes`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({
      query: {
        and: [
          { prop: 'node', value, match: 'fuzzy' },
          DATA_AUG_FILTER,
        ],
      },
      top_k: 50,
    }),
  });
  if (!response.ok) return [];
  const raw = (await response.json()) as { nodes?: GraphNode[] };
  return (raw.nodes ?? []).filter(passesBlocklist);
}

export class GraphQueryError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, detail?: string) {
    super(`/graph returned ${status}${detail ? `: ${detail}` : ''}`);
    this.name = 'GraphQueryError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Build the /graph path-query body.
 *
 * IMPORTANT: only pass `value` + `group` on the source. The GraphNode type
 * carries `type: 'ENTITY'` (uppercase) because that's how we model it
 * client-side, but Nuclia's schema validator expects `type` to be one of
 * 'entity' | 'label' | 'resource' | 'user' (lowercase) and 422s on
 * 'ENTITY'. Earlier builds spread the whole node into source and got a
 * universal 422 — "Input should be 'entity', 'label', 'resource' or 'user'".
 * Strip the type to be safe regardless of source.
 */
function pathQueryBody(node: { value: string; group: string }) {
  return {
    query: {
      and: [
        { prop: 'path', source: { value: node.value, group: node.group } },
        DATA_AUG_FILTER,
      ],
    },
    top_k: 100,
  };
}

export async function queryPaths(node: { value: string; group: string }): Promise<GraphPath[]> {
  const env = loadEnv();
  const response = await fetch(`${kbBaseUrl(env)}/graph`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify(pathQueryBody(node)),
  });
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = await response.text();
      detail = body.slice(0, 240);
    } catch {
      /* no body */
    }
    throw new GraphQueryError(response.status, detail);
  }
  const raw = (await response.json()) as { paths?: GraphPath[] };
  return (raw.paths ?? []).filter(
    (p) => passesBlocklist(p.source) && passesBlocklist(p.destination),
  );
}

/**
 * Reverse-direction path query: paths where `node` is the DESTINATION.
 * Crucial for leaf entities (competitor products, sparse destinations) that
 * have no outbound edges but DO show up on the receiving end of a relation
 * — e.g. "Patagonia Macro Puff" has 0 outbound but is the destination of
 * "Aurora Helios wins_against Patagonia Macro Puff". Without this, clicking
 * such a node lands on an empty canvas mid-demo.
 */
export async function queryPathsTo(node: { value: string; group: string }): Promise<GraphPath[]> {
  const env = loadEnv();
  const response = await fetch(`${kbBaseUrl(env)}/graph`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({
      query: {
        and: [
          { prop: 'path', destination: { value: node.value, group: node.group } },
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

/**
 * Both-direction lookup. Use this for navigation so leaf nodes never strand
 * the user on an empty canvas. Returns paths where node is either source
 * OR destination, de-duped.
 */
export async function queryPathsAround(node: { value: string; group: string }): Promise<GraphPath[]> {
  const [out, inb] = await Promise.all([
    queryPaths(node).catch(() => [] as GraphPath[]),
    queryPathsTo(node).catch(() => [] as GraphPath[]),
  ]);
  const seen = new Set<string>();
  const merged: GraphPath[] = [];
  for (const p of [...out, ...inb]) {
    const k = `${p.source.value}|${p.relation.label}|${p.destination.value}`;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(p);
  }
  return merged;
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
    resources?: Record<string, {
      title?: string;
      data?: { texts?: Record<string, { value?: { body?: string } }> };
    }>;
  };
  const resources = raw.resources ?? {};
  return Object.entries(resources).slice(0, 8).map(([id, r]) => {
    const rawTitle = (r?.title ?? '').replace(/^#+\s*/, '').trim();
    const body = r?.data?.texts?.body?.value?.body ?? '';
    const stripped = body.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^#+\s+/, '');
    const title = rawTitle || stripped.split('\n')[0]?.slice(0, 80) || id.slice(0, 8);
    const excerpt = stripped.replace(/^#+\s+.*\n+/, '').slice(0, 200);
    return { id, title, excerpt };
  });
}
