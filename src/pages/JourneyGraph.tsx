import { useCallback, useEffect, useState } from 'react';
import {
  queryFuzzyNodes,
  queryNodesByGroup,
  queryPaths,
  searchRelatedResources,
  type GraphNode,
  type GraphPath,
} from '../lib/graphClient';
import { GraphCanvas } from '../components/GraphCanvas';
import { colourForGroup } from '../styles/tokens';

const SEED_GROUP = 'PRODUCT';

export function JourneyGraph() {
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<GraphNode[]>([]);
  const [paths, setPaths] = useState<GraphPath[]>([]);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [related, setRelated] = useState<Array<{ id: string; title: string; excerpt?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const initial = await queryNodesByGroup(SEED_GROUP);
        const seeds = initial.slice(0, 4);
        const all = await Promise.all(seeds.map((n) => queryPaths(n).catch(() => [])));
        setPaths(dedupe(all.flat()));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!search) { setMatches([]); return; }
    const t = setTimeout(async () => {
      const nodes = await queryFuzzyNodes(search);
      setMatches(nodes.slice(0, 10));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const onSelect = useCallback(async (node: GraphNode) => {
    setSelected(node);
    const [newPaths, hits] = await Promise.all([
      queryPaths(node),
      searchRelatedResources(node.value),
    ]);
    setPaths((existing) => dedupe([...existing, ...newPaths]));
    setRelated(hits);
  }, []);

  const groupedPaths = groupBy(
    paths.filter((p) => !selected || p.source.value === selected.value || p.destination.value === selected.value),
    (p) => p.relation.label,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl text-sand-900">Customer-journey graph</h1>
        <p className="mt-1 text-sm text-sand-700">
          Typed entities extracted from Aurora's product, content, and loyalty corpus by the data-augmentation agent.
          Click any node — product, activity, destination, ambassador, brand pillar — to traverse.
        </p>
      </header>

      <div className="mt-6 space-y-2">
        <input className="input" placeholder="Search any entity (e.g., 'terratrek', 'tasmania', 'mara')" value={search} onChange={(e) => setSearch(e.target.value)} />
        {matches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {matches.map((n) => (
              <button
                key={`${n.group}::${n.value}`}
                type="button"
                onClick={() => { onSelect(n); setSearch(''); setMatches([]); }}
                className="chip"
                style={{ borderColor: colourForGroup(n.group), color: colourForGroup(n.group) }}
              >
                {n.value} · {n.group}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <GraphCanvas paths={paths} onNodeClick={onSelect} />

        <aside className="card">
          {loading && <div className="text-sm text-sand-500">Loading initial journey graph…</div>}
          {!selected && !loading && (
            <div className="text-sm text-sand-500">Click an entity to traverse the journey graph.</div>
          )}
          {selected && (
            <div className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-sand-500">Selected</div>
                <div className="mt-1 font-display text-xl text-sand-900">{selected.value}</div>
                <span className="badge mt-1" style={{ borderColor: colourForGroup(selected.group), color: colourForGroup(selected.group) }}>{selected.group}</span>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-sand-500">Paths</div>
                <ul className="mt-2 space-y-2 text-sm">
                  {[...groupedPaths.entries()].map(([rel, list]) => (
                    <li key={rel}>
                      <div className="font-medium text-alpine-600">{rel}</div>
                      <ul className="mt-1 space-y-1 text-sand-800">
                        {list.slice(0, 6).map((p, idx) => (
                          <li key={idx}>{p.source.value} → <span className="text-sand-900">{p.destination.value}</span></li>
                        ))}
                      </ul>
                    </li>
                  ))}
                  {groupedPaths.size === 0 && <li className="text-sand-500">No paths returned.</li>}
                </ul>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-sand-500">Related content</div>
                <ul className="mt-2 space-y-2 text-sm">
                  {related.map((r) => (
                    <li key={r.id} className="rounded-md border border-sand-200 bg-sand-50 p-2">
                      <div className="font-medium text-sand-900">{r.title}</div>
                      <p className="text-xs text-sand-700 line-clamp-3">{r.excerpt}</p>
                    </li>
                  ))}
                  {related.length === 0 && <li className="text-sand-500">No hybrid-retrieval matches.</li>}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function dedupe(paths: GraphPath[]): GraphPath[] {
  const seen = new Set<string>();
  const out: GraphPath[] = [];
  for (const p of paths) {
    const k = `${p.source.value}|${p.relation.label}|${p.destination.value}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const t of items) {
    const k = key(t);
    const list = m.get(k) ?? [];
    list.push(t);
    m.set(k, list);
  }
  return m;
}
