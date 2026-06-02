import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraphQueryError,
  queryFuzzyNodes,
  queryNodesByGroup,
  queryPaths,
  queryPathsAround,
  searchRelatedResources,
  type GraphNode,
  type GraphPath,
} from '../lib/graphClient';
import { GraphCanvas } from '../components/GraphCanvas';
import { PersonaToggle } from '../components/PersonaToggle';
import { sanitizeExcerpt } from '../lib/sanitizeExcerpt';
import { colourForGroup } from '../styles/tokens';

// ---------------------------------------------------------------------------
// Demo seeds — chosen for outbound-path density (40+ each). The previous
// "Tour du Mont Blanc" seed had only 1 outbound path because destinations are
// leaf nodes in this directed graph; products + ambassadors are where the
// stories live.
// ---------------------------------------------------------------------------
const DEMO_SEEDS: GraphNode[] = [
  { value: 'Aurora Helios', group: 'PRODUCT', type: 'ENTITY' },
  { value: 'Aurora TerraTrek 7', group: 'PRODUCT', type: 'ENTITY' },
  { value: 'Aurora Skyline 45L', group: 'PRODUCT', type: 'ENTITY' },
  { value: 'Mara Chen', group: 'AMBASSADOR', type: 'ENTITY' },
];

const ENTITY_GROUPS = [
  'PRODUCT', 'CATEGORY', 'ACTIVITY', 'DESTINATION', 'AMBASSADOR',
  'CONTENT', 'CUSTOMER_SEGMENT', 'LOYALTY_TIER', 'BRAND_PILLAR', 'SIZING_PROFILE',
] as const;
type EntityCounts = Partial<Record<(typeof ENTITY_GROUPS)[number], number>>;

// ---------------------------------------------------------------------------
// 3 CMO insight cards — real numbers from the live KB (curl-verified).
// Each card has an entity that loads into the graph on click, so the CMO
// jumps from the story to the proof in one gesture.
// ---------------------------------------------------------------------------
interface InsightCard {
  eyebrow: string;
  title: string;
  story: string;
  cmoRead: string;
  entity: GraphNode;
  buttonLabel: string;
  stats: Array<{ value: string; label: string }>;
}

const INSIGHT_CARDS: InsightCard[] = [
  {
    eyebrow: "Ambassador influence",
    title: "Mara Chen, mapped",
    story:
      "She field-tested 5 products, has trail experience across 16 destinations, " +
      "drove the wide-foot sizing on the TerraTrek 7, and authored 4 pieces of trail content. " +
      "The AI surfaced every connection from her ambassador posts and product copy.",
    cmoRead:
      "This is how you know your ambassador programme is working — and which ambassador to put in front of which customer.",
    entity: { value: 'Mara Chen', group: 'AMBASSADOR', type: 'ENTITY' },
    buttonLabel: "Explore Mara's neighbourhood",
    stats: [
      { value: '49', label: 'typed relations' },
      { value: '19', label: 'products' },
      { value: '16', label: 'destinations' },
      { value: '4', label: 'content pieces' },
    ],
  },
  {
    eyebrow: "Product neighbourhood",
    title: "TerraTrek 7 — what it pairs with, who endorses it",
    story:
      "Connected to 5 ambassadors, 12 destinations, 4 sister products, 3 customer segments, " +
      "and 4 sizing profiles. The AI knows this boot belongs in the same pack as the Skyline 45L " +
      "for thru-hikers — without anyone telling it.",
    cmoRead:
      "This is what makes a recommendation intelligent rather than random.",
    entity: { value: 'Aurora TerraTrek 7', group: 'PRODUCT', type: 'ENTITY' },
    buttonLabel: "Explore the TerraTrek neighbourhood",
    stats: [
      { value: '40', label: 'typed relations' },
      { value: '12', label: 'destinations' },
      { value: '5', label: 'ambassadors' },
      { value: '3', label: 'segments' },
    ],
  },
  {
    eyebrow: "Flagship product",
    title: "Helios — the AI's most-cited recommendation",
    story:
      "Worn_by Mara Chen, suited to Patagonia and Tasmania, featured in 4 trail guides, " +
      "wins_against the Patagonia Macro Puff on warmth-per-gram. Every fact pulled from product " +
      "pages and ambassador write-ups — no rules, no spreadsheet.",
    cmoRead:
      "This is what 'grounded answer' actually means. Every concierge response cites this graph.",
    entity: { value: 'Aurora Helios', group: 'PRODUCT', type: 'ENTITY' },
    buttonLabel: "Explore the Helios neighbourhood",
    stats: [
      { value: '21', label: 'typed relations' },
      { value: '6', label: 'destinations' },
      { value: '1', label: 'rival product' },
      { value: '4', label: 'guides cite it' },
    ],
  },
];

// "What this powers" surfaces — closing strip linking the graph to the rest
// of the demo. The point: the graph is the engine under every page.
const POWERS = [
  { to: '/concierge',      label: 'Concierge answers',  blurb: 'cites this graph' },
  { to: '/for-you',        label: 'For You picks',      blurb: 'queries this graph' },
  { to: '/abandoned-cart', label: 'Winback emails',     blurb: 'traverses this graph' },
] as const;

// Ordered relation-type wave for the canvas storytelling animation.
// First few are the most legible "this means X" relations.
const RELATION_WAVE_ORDER = [
  'worn_by', 'field tester for', 'has experience in', 'recommends',
  'used_in', 'used in', 'used for', 'suited_to', 'suited to',
  'pairs_with', 'pairs with', 'collaborates on',
  'featured_in', 'featured in', 'recommend reading', 'authored',
];

// Default selection on page load — TerraTrek 7 tells the strongest CMO
// story (product connected to ambassadors, destinations, segments, sizing)
// so the dual-persona panel is populated and visible on first paint.
const DEFAULT_SELECTION: GraphNode = {
  value: 'Aurora TerraTrek 7',
  group: 'PRODUCT',
  type: 'ENTITY',
};

export function JourneyGraph() {
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<GraphNode[]>([]);
  const [paths, setPaths] = useState<GraphPath[]>([]);
  const [overviewPaths, setOverviewPaths] = useState<GraphPath[]>([]);
  const [selected, setSelected] = useState<GraphNode | null>(DEFAULT_SELECTION);
  const [pendingSelection, setPendingSelection] = useState<GraphNode | null>(null);
  const [related, setRelated] = useState<Array<{ id: string; title: string; excerpt?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<EntityCounts>({});
  // Live ticker for the "canonical relations" counter — bumps when the
  // underlying relation count changes (because the agent is still running).
  const [pulseRelations, setPulseRelations] = useState(false);
  const prevRelationCountRef = useRef(0);
  // Filter chips: each entity type can be toggled on/off. Default = all on.
  const [enabledGroups, setEnabledGroups] = useState<Set<string>>(
    () => new Set(ENTITY_GROUPS),
  );
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load overview (the 4 seed neighbourhoods, parallel) + default selection
  // on mount. The default selection drives the dual-persona panel from the
  // very first paint — no empty state below the canvas.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [overview, defaultPaths, defaultHits] = await Promise.all([
          Promise.allSettled(DEMO_SEEDS.map((n) => queryPaths(n))),
          queryPaths(DEFAULT_SELECTION).catch(() => [] as GraphPath[]),
          searchRelatedResources(DEFAULT_SELECTION.value).catch(() => []),
        ]);
        if (cancelled) return;
        const all: GraphPath[] = [];
        const errors: GraphQueryError[] = [];
        for (const s of overview) {
          if (s.status === 'fulfilled') all.push(...s.value);
          else if (s.reason instanceof GraphQueryError) errors.push(s.reason);
        }
        const overviewMerged = dedupe(all);
        setOverviewPaths(overviewMerged);
        // Page opens with the default selection's neighbourhood populated.
        setPaths(dedupe(defaultPaths));
        setRelated(defaultHits);
        if (overviewMerged.length === 0 && defaultPaths.length === 0 && errors.length > 0) {
          setError(`Couldn't load the journey graph (HTTP ${errors[0].status}).`);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof GraphQueryError
              ? `Couldn't load the journey graph (HTTP ${e.status}).`
              : "Couldn't load the journey graph.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Pulse the canonical-relations stat when the overview count changes —
  // proves the graph is live without the user having to count to spot it.
  useEffect(() => {
    if (overviewPaths.length === prevRelationCountRef.current) return;
    if (prevRelationCountRef.current !== 0) {
      setPulseRelations(true);
      const t = window.setTimeout(() => setPulseRelations(false), 1800);
      prevRelationCountRef.current = overviewPaths.length;
      return () => window.clearTimeout(t);
    }
    prevRelationCountRef.current = overviewPaths.length;
  }, [overviewPaths.length]);

  // Re-poll the overview every 30s so the "live" indicator is honest —
  // when the agent re-runs in the background, the count updates here.
  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const settled = await Promise.allSettled(DEMO_SEEDS.map((n) => queryPaths(n)));
        const all: GraphPath[] = [];
        for (const s of settled) if (s.status === 'fulfilled') all.push(...s.value);
        setOverviewPaths((prev) => {
          const merged = dedupe(all);
          return merged.length !== prev.length ? merged : prev;
        });
      } catch {
        /* swallow background polling errors */
      }
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Live entity counts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settled = await Promise.allSettled(ENTITY_GROUPS.map((g) => queryNodesByGroup(g)));
      if (cancelled) return;
      const next: EntityCounts = {};
      ENTITY_GROUPS.forEach((g, i) => {
        const s = settled[i];
        if (s.status === 'fulfilled') next[g] = s.value.length;
      });
      setCounts(next);
    })();
    return () => { cancelled = true; };
  }, []);

  // Fuzzy search — density-ranked. Two near-identical hits like "Aurora
  // Helios" (20 paths) and "Aurora Helios down jacket" (1 path) are a real
  // demo footgun; we re-order so the denser neighbourhood floats up.
  useEffect(() => {
    if (!search) { setMatches([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const nodes = await queryFuzzyNodes(search);
      if (cancelled || nodes.length === 0) {
        if (!cancelled) setMatches([]);
        return;
      }
      const top = nodes.slice(0, 10);
      // Pre-fetch outbound path counts (cheap; top-K=10) and sort by density.
      const counts = await Promise.all(
        top.map((n) => queryPaths(n).then((p) => p.length).catch(() => 0)),
      );
      if (cancelled) return;
      const ranked = top
        .map((n, i) => ({ n, c: counts[i] }))
        .sort((a, b) => b.c - a.c)
        .map((x) => x.n);
      setMatches(ranked);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  const onSelect = useCallback(async (node: GraphNode) => {
    // Optimistic selection: update the panel headers + canvas highlight
    // immediately. pendingSelection drives a "Loading X's neighbourhood…"
    // overlay until the paths arrive.
    setSelected(node);
    setPendingSelection(node);
    setError(null);
    try {
      // queryPathsAround = outbound + inbound merged. Leaf nodes (competitor
      // products, sparse destinations) get their inbound edges so the canvas
      // never strands the demo on an empty graph.
      const [newPaths, hits] = await Promise.all([
        queryPathsAround(node),
        searchRelatedResources(node.value),
      ]);
      setPaths(dedupe(newPaths));
      setRelated(hits);
      // Scroll the canvas back into view so the user sees the new neighbourhood.
      setTimeout(() => canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (e) {
      if (e instanceof GraphQueryError) {
        setError(`Couldn't traverse from ${node.value} (HTTP ${e.status}).`);
      }
      setRelated([]);
    } finally {
      setPendingSelection(null);
    }
  }, []);

  // Enter inside the search input: select the first match (or, when nothing
  // matched yet, the most-recent search-derived top hit).
  const onSearchSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const term = search.trim();
      if (!term) return;
      // Use the live matches if any; otherwise refetch synchronously here.
      let hit = matches[0];
      if (!hit) {
        const nodes = await queryFuzzyNodes(term);
        hit = nodes[0];
      }
      if (hit) {
        await onSelect(hit);
        setSearch('');
        setMatches([]);
      }
    },
    [search, matches, onSelect],
  );

  const onResetView = useCallback(() => {
    setSelected(null);
    setRelated([]);
    setError(null);
    setPaths(overviewPaths);
  }, [overviewPaths]);

  const totalEntities = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0),
    [counts],
  );

  // Visible paths after filter-chip toggles: an edge survives only if BOTH
  // endpoints belong to enabled groups, so the canvas never paints dangling
  // edges to invisible nodes.
  const visiblePaths = useMemo(
    () =>
      paths.filter(
        (p) => enabledGroups.has(p.source.group) && enabledGroups.has(p.destination.group),
      ),
    [paths, enabledGroups],
  );

  // Per-group visible-node counts driven from the CURRENT paths set — these
  // power the chip labels so the user can see what each toggle would hide.
  const visibleGroupCounts = useMemo(() => {
    const acc = new Map<string, Set<string>>();
    for (const p of paths) {
      for (const n of [p.source, p.destination]) {
        if (!acc.has(n.group)) acc.set(n.group, new Set());
        acc.get(n.group)!.add(n.value);
      }
    }
    const out: Partial<Record<string, number>> = {};
    for (const [g, set] of acc) out[g] = set.size;
    return out;
  }, [paths]);

  function toggleGroup(group: string) {
    setEnabledGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }
  const enableAll = () => setEnabledGroups(new Set(ENTITY_GROUPS));
  const enableNone = () => setEnabledGroups(new Set());

  // Compute the ordered relation labels touching the selection for the wave.
  const relationWave = useMemo(() => {
    if (!selected) return undefined;
    const selectedKey = `${selected.group}::${selected.value}`;
    const touching = new Set<string>();
    for (const p of visiblePaths) {
      const sKey = `${p.source.group}::${p.source.value}`;
      const tKey = `${p.destination.group}::${p.destination.value}`;
      if (sKey === selectedKey || tKey === selectedKey) {
        touching.add(p.relation.label);
      }
    }
    const ordered: string[] = [];
    for (const rel of RELATION_WAVE_ORDER) {
      if (touching.has(rel)) { ordered.push(rel); touching.delete(rel); }
    }
    return [...ordered, ...touching];
  }, [visiblePaths, selected]);

  // For the persona split panels — partition VISIBLE paths by audience lens.
  const personaPanels = useMemo(
    () => splitPathsByPersona(visiblePaths, selected),
    [visiblePaths, selected],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 fade-in-up">
      {/* ===== Hero ===== */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <div className="eyebrow-ai"><span className="ai-dot" /> The intelligence engine</div>
          <h1 className="h-page mt-3">
            <span>{overviewPaths.length > 0 ? overviewPaths.length : 108} decisions your merchandiser used to make manually.</span>{' '}
            <span className="text-alpine-600 italic">Now made automatically.</span>
          </h1>
          <p className="h-page-sub mt-3">
            Before Aurora, your merchandiser maps — by hand, in spreadsheets — which products suit
            which trails, which ambassadors endorse which gear, which segments buy in which seasons.
            After Aurora, the AI reads every product page, guide, review and ambassador post, and
            draws the same map in minutes. What you're looking at is that map.
          </p>
        </div>
        <PersonaToggle />
      </header>

      {/* ===== Stat banner ===== */}
      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <StatCard
          big={totalEntities > 0 ? String(totalEntities) : '190'}
          label="typed entities"
          sub="Products · trails · ambassadors · content · segments"
        />
        <StatCard
          big={overviewPaths.length > 0 ? String(overviewPaths.length) : '108'}
          label="canonical relations"
          sub="The agent re-runs on a schedule, so this number ticks up as the corpus grows."
          accent
          live
          pulse={pulseRelations}
        />
        <StatCard
          big="0"
          label="spreadsheets touched"
          sub="The agent runs on the corpus, on a schedule."
        />
      </section>

      {/* ===== Before / after compact ===== */}
      <section className="mt-8 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-sand-200 bg-white/70 p-5">
          <div className="eyebrow text-sand-700">Before Aurora</div>
          <p className="mt-2 text-sm text-sand-800 leading-relaxed">
            Your merchandiser opens a spreadsheet. Maps which boot belongs with which trail, which
            ambassador endorses which gear, which segments buy in which seasons. Two days a week.
            Stale a week later.
          </p>
        </div>
        <div className="rounded-2xl border border-alpine-300 bg-alpine-50/60 p-5">
          <div className="eyebrow-alpine">After Aurora</div>
          <p className="mt-2 text-sm text-sand-900 leading-relaxed">
            The agent reads every product page, trail guide, ambassador post and gear review.
            Extracts <strong>typed relations</strong> the merchandiser would write by hand. Re-runs
            on a schedule. Powers every other surface on this site.
          </p>
        </div>
      </section>

      {/* ===== 3 CMO insight cards ===== */}
      <section className="mt-10">
        <div className="eyebrow">Three stories the graph already tells</div>
        <h2 className="h-section mt-2">Click any one to see the proof.</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {INSIGHT_CARDS.map((c, i) => (
            <article
              key={c.title}
              className="fade-in-up rounded-2xl border border-sand-200 bg-white p-5 shadow-aurora hover:shadow-aurora-lift hover:-translate-y-0.5 hover:border-alpine-300 transition-all"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="eyebrow-alpine">{c.eyebrow}</div>
              <h3 className="mt-2 font-display text-xl text-sand-900 leading-snug">{c.title}</h3>
              <p className="mt-2 text-sm text-sand-700 leading-relaxed">{c.story}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {c.stats.map((s) => (
                  <div key={s.label} className="rounded-md border border-sand-200 bg-sand-50/60 px-2.5 py-1.5">
                    <div className="tabular font-display text-lg text-alpine-700 leading-none">{s.value}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-sand-600">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-md border-l-2 border-rust-400 bg-rust-50/50 px-3 py-2 text-xs text-sand-800 italic">
                <span className="not-italic font-semibold text-rust-700">CMO read · </span>
                {c.cmoRead}
              </div>

              <button
                type="button"
                onClick={() => onSelect(c.entity)}
                className="btn-primary mt-4 w-full text-sm"
              >
                {c.buttonLabel}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ===== Search + try chips ===== */}
      <section ref={canvasRef} className="mt-12">
        <div className="eyebrow">Walk the graph yourself</div>
        <h2 className="h-section mt-2">Search any entity. Click any node.</h2>

        <form onSubmit={onSearchSubmit} className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_auto]">
          <input
            className="input"
            placeholder="Search any entity (e.g. 'terratrek', 'patagonia', 'mara chen') — hit Enter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            disabled={!search.trim()}
            className="btn-primary self-start px-5 disabled:cursor-default disabled:opacity-50"
          >
            Walk it
          </button>
          {selected && (
            <button type="button" onClick={onResetView} className="chip self-start">
              ← Back to overview
            </button>
          )}
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="eyebrow">Try</span>
          {(matches.length > 0 ? matches : DEMO_SEEDS).map((n) => (
            <button
              key={`${n.group}::${n.value}`}
              type="button"
              onClick={() => {
                onSelect(n);
                setSearch('');
                setMatches([]);
              }}
              className="chip"
              style={{ borderColor: colourForGroup(n.group), color: colourForGroup(n.group) }}
            >
              {n.value}
            </button>
          ))}
        </div>

        {/* ===== Entity-type filter chips ===== */}
        <div className="mt-5 rounded-2xl border border-sand-200 bg-white/70 p-3">
          <div className="flex items-baseline justify-between gap-3 px-1 mb-2">
            <div className="eyebrow">Show entity types</div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="tabular text-sand-600">
                {enabledGroups.size}/{ENTITY_GROUPS.length} on
                {' · '}
                {visiblePaths.length} of {paths.length} relations visible
              </span>
              <button
                type="button"
                onClick={enableAll}
                disabled={enabledGroups.size === ENTITY_GROUPS.length}
                className="rounded-full border border-sand-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-sand-700 hover:border-alpine-300 hover:text-alpine-700 transition disabled:cursor-default disabled:opacity-40"
              >
                All
              </button>
              <button
                type="button"
                onClick={enableNone}
                disabled={enabledGroups.size === 0}
                className="rounded-full border border-sand-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-sand-700 hover:border-rust-300 hover:text-rust-700 transition disabled:cursor-default disabled:opacity-40"
              >
                None
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ENTITY_GROUPS.map((grp) => {
              const on = enabledGroups.has(grp);
              const tone = colourForGroup(grp);
              const visible = visibleGroupCounts[grp] ?? 0;
              return (
                <button
                  key={grp}
                  type="button"
                  onClick={() => toggleGroup(grp)}
                  aria-pressed={on}
                  className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-all active:scale-[0.97] ${
                    on
                      ? 'bg-white shadow-sm hover:shadow'
                      : 'bg-sand-50 opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: on ? tone : 'rgb(232,217,191)',
                    color: on ? tone : 'rgb(122,90,43)',
                  }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white transition-opacity"
                    style={{
                      background: tone,
                      opacity: on ? 1 : 0.35,
                    }}
                  />
                  <span className="capitalize">{grp.toLowerCase().replace('_', ' ')}</span>
                  <span className={`tabular text-[11px] ${on ? 'text-sand-500' : 'text-sand-400'}`}>
                    {visible}
                  </span>
                  {on && (
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== Now exploring banner — confirms selection BEFORE paths load ===== */}
        {selected && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-alpine-200 bg-alpine-50/40 px-3 py-2">
            <div className="flex items-center gap-2.5">
              <span className="eyebrow-alpine">Now exploring</span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  background: `${colourForGroup(selected.group)}18`,
                  color: colourForGroup(selected.group),
                  border: `1px solid ${colourForGroup(selected.group)}`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: colourForGroup(selected.group) }} />
                {selected.value}
              </span>
              <span className="text-[11px] text-sand-600">
                {selected.group.toLowerCase().replace('_', ' ')}
              </span>
              {pendingSelection && (
                <span className="text-[11px] text-alpine-700 animate-pulse">
                  loading neighbourhood…
                </span>
              )}
            </div>
            <button type="button" onClick={onResetView} className="chip">
              ← Back to overview
            </button>
          </div>
        )}

        {/* ===== Canvas — full width, fed by visiblePaths ===== */}
        <div className="mt-4">
          <GraphCanvas
            paths={visiblePaths}
            onNodeClick={onSelect}
            loading={loading || !!pendingSelection}
            error={error}
            selectedId={selected ? `${selected.group}::${selected.value}` : null}
            onResetView={selected ? onResetView : undefined}
            spotlight={selected ? undefined : DEMO_SEEDS.map((n) => `${n.group}::${n.value}`)}
            relationWave={relationWave}
          />
        </div>
      </section>

      {/* ===== Persona split-view (the killer moment) ===== */}
      {selected && (
        <section className="mt-10 fade-in-up">
          <div className="eyebrow-ai"><span className="ai-dot" /> Same node, two audiences</div>
          <h2 className="h-section mt-2">
            The graph reasons about <em className="text-alpine-600 not-italic">who's asking</em>.
          </h2>
          <p className="h-page-sub mt-2">
            Below: the same selected entity, viewed through Sara's prospect lens (left) and Mara's
            Trail Club Pro lens (right). Different relations surface, different content gets cited,
            different products get pitched — from the same underlying graph.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <PersonaPanel
              variant="sara"
              entity={selected}
              groupedPaths={personaPanels.sara}
              relatedContent={related.slice(0, 3)}
            />
            <PersonaPanel
              variant="mara"
              entity={selected}
              groupedPaths={personaPanels.mara}
              relatedContent={related.slice(0, 5)}
            />
          </div>
        </section>
      )}

      {/* ===== What this powers ===== */}
      <section className="mt-14">
        <div className="rounded-3xl border border-alpine-200 bg-gradient-to-br from-alpine-50/80 via-white to-rust-50/40 p-6 md:p-8 shadow-aurora">
          <div className="grid items-center gap-6 md:grid-cols-[1.4fr_2fr]">
            <div>
              <div className="eyebrow-ai"><span className="ai-dot" /> The engine</div>
              <h2 className="h-section mt-2">
                This isn't a visualisation. <span className="text-alpine-600 italic">It's the engine.</span>
              </h2>
              <p className="mt-3 text-sm text-sand-700 leading-relaxed">
                Every answer in the Concierge, every pick on the For You page, every winback message
                in the abandoned-cart pipeline is reasoned from this graph.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {POWERS.map((p) => (
                <Link
                  key={p.to}
                  to={p.to}
                  className="group rounded-xl border border-sand-200 bg-white p-4 hover:border-alpine-400 hover:shadow-aurora-lift hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center gap-2 text-alpine-600">
                    <ArrowFromGraphIcon className="h-4 w-4" />
                    <span className="eyebrow-alpine">{p.label}</span>
                  </div>
                  <div className="mt-2 text-sm text-sand-800">{p.blurb}</div>
                  <div className="mt-3 text-[11px] text-alpine-700 group-hover:translate-x-1 transition-transform">
                    See it →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Live entity-types overview (kept, but compact) ===== */}
      <section className="mt-8">
        <div className="eyebrow">What the agent extracts</div>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ENTITY_GROUPS.map((grp) => (
            <li key={grp} className="flex items-center gap-2 rounded-md border border-sand-200 bg-white/70 px-2.5 py-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: colourForGroup(grp) }} />
              <span className="text-xs text-sand-800 capitalize">{grp.toLowerCase().replace('_', ' ')}</span>
              <span className="ml-auto tabular text-[11px] text-sand-500">
                {counts[grp] !== undefined ? counts[grp] : '–'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  big,
  label,
  sub,
  accent = false,
  live = false,
  pulse = false,
}: {
  big: string;
  label: string;
  sub: string;
  accent?: boolean;
  live?: boolean;
  pulse?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-aurora relative ${accent ? 'border-alpine-400 bg-alpine-50/60' : 'border-sand-200 bg-white'}`}>
      {live && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Live</span>
        </div>
      )}
      <div
        className={`font-display tabular text-4xl text-sand-900 leading-none transition-colors duration-700 ${
          pulse ? 'text-emerald-600' : ''
        }`}
      >
        {big}
      </div>
      <div className="mt-2 eyebrow-alpine">{label}</div>
      <div className="mt-2 text-xs text-sand-700">{sub}</div>
    </div>
  );
}

interface PersonaPanelProps {
  variant: 'sara' | 'mara';
  entity: GraphNode;
  groupedPaths: Map<string, GraphPath[]>;
  relatedContent: Array<{ id: string; title: string; excerpt?: string }>;
}

function PersonaPanel({ variant, entity, groupedPaths, relatedContent }: PersonaPanelProps) {
  const sara = variant === 'sara';
  const personaTitle = sara ? 'Sara · Prospect · NORAM' : 'Mara · Trail Club Pro · EMEA';
  const headline = sara
    ? "What surfaces in her storefront"
    : "What surfaces in her member feed";
  const intent = sara
    ? "Conversion intent. The graph picks the shoppable nodes: products that fit her segment, destinations that match her trip length, the field-engineered CTA on the most-relevant SKU."
    : "Loyalty intent. The graph adds ambassadors, member-exclusive content, alternative products, and the technical depth Pro members expect. Same entity, deeper lens.";
  const borderTone = sara ? 'border-rust-300' : 'border-alpine-300';
  const eyebrowTone = sara ? 'text-rust-600' : 'text-alpine-700';

  return (
    <article className={`rounded-2xl border-2 ${borderTone} bg-white p-5 shadow-aurora`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`eyebrow ${eyebrowTone}`}>{personaTitle}</div>
          <h3 className="mt-1 font-display text-lg text-sand-900">{headline}</h3>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          style={{ border: `1px solid ${colourForGroup(entity.group)}`, color: colourForGroup(entity.group) }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: colourForGroup(entity.group) }} />
          {entity.value}
        </span>
      </div>

      <p className="mt-3 text-xs italic text-sand-700">{intent}</p>

      {/* Relations */}
      <div className="mt-4">
        <div className="eyebrow">Surfaced relations</div>
        {groupedPaths.size === 0 ? (
          <div className="mt-2 text-xs text-sand-500">No relations of this kind for this entity.</div>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {[...groupedPaths.entries()].slice(0, 5).map(([rel, list]) => (
              <li key={rel}>
                <div className="text-[11px] uppercase tracking-wider text-alpine-600 font-semibold">{rel}</div>
                <ul className="mt-1 space-y-0.5 text-sand-800 text-[13px]">
                  {list.slice(0, 4).map((p, i) => (
                    <li key={i} className="flex items-baseline gap-2">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 translate-y-[1px]"
                        style={{ background: colourForGroup(p.destination.group) }}
                      />
                      <span>{p.destination.value}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Content / picks */}
      <div className="mt-5">
        <div className="eyebrow">{sara ? 'Suggested picks' : 'Suggested reading'}</div>
        <ul className="mt-2 space-y-1.5">
          {relatedContent.map((r) => {
            const t = sanitizeExcerpt(r.title, 80) ?? r.title;
            return (
              <li key={r.id} className="rounded-md border border-sand-200 bg-sand-50/60 px-2.5 py-1.5">
                <div className="text-[13px] text-sand-900 font-medium">{t}</div>
              </li>
            );
          })}
          {relatedContent.length === 0 && (
            <li className="text-xs text-sand-500">No matches yet.</li>
          )}
        </ul>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Persona-aware filtering — proves the graph reasons about audience.
// Sara (shopper) sees the SHOPPABLE side of the neighbourhood: products,
// destinations, activities. Mara (member) sees the FULL neighbourhood
// including ambassadors, member-exclusive content and loyalty edges.
// ---------------------------------------------------------------------------
const SARA_VISIBLE_GROUPS = new Set([
  'PRODUCT', 'DESTINATION', 'ACTIVITY', 'CATEGORY', 'SIZING_PROFILE',
]);
const MARA_PREFERRED_GROUPS = new Set([
  'AMBASSADOR', 'CONTENT', 'LOYALTY_TIER', 'BRAND_PILLAR', 'CUSTOMER_SEGMENT',
  'PRODUCT', 'DESTINATION', 'ACTIVITY',
]);

function splitPathsByPersona(paths: GraphPath[], selected: GraphNode | null) {
  if (!selected) return { sara: new Map<string, GraphPath[]>(), mara: new Map<string, GraphPath[]>() };
  const selectedKey = `${selected.group}::${selected.value}`;
  const sara: GraphPath[] = [];
  const mara: GraphPath[] = [];
  for (const p of paths) {
    const sKey = `${p.source.group}::${p.source.value}`;
    const tKey = `${p.destination.group}::${p.destination.value}`;
    if (sKey !== selectedKey && tKey !== selectedKey) continue;
    const other = sKey === selectedKey ? p.destination : p.source;
    if (SARA_VISIBLE_GROUPS.has(other.group)) sara.push(p);
    if (MARA_PREFERRED_GROUPS.has(other.group)) mara.push(p);
  }
  return { sara: groupBy(sara, (p) => p.relation.label), mara: groupBy(mara, (p) => p.relation.label) };
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

// Inline arrow icon for the "what this powers" cards.
function ArrowFromGraphIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="5" cy="12" r="2" />
      <path d="M7 12h10" />
      <path d="M14 8l4 4-4 4" />
    </svg>
  );
}
