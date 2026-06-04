import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { find, askSync, type FindResult, type AskSyncResult, type Citation } from '../lib/ragClient';
import { StorefrontCard } from '../components/StorefrontCard';
import { PersonaToggle } from '../components/PersonaToggle';
import { SkeletonGrid, ErrorPanel } from '../components/States';
import { usePersona } from '../context/PersonaContext';
import { useLanguage } from '../context/LanguageContext';
import { ctaHrefFor } from '../lib/sanitizeExcerpt';
import { t } from '../lib/conciergeStrings';

type ChipDef = {
  label: string;
  value: string | null;
  Icon: (p: { className?: string }) => JSX.Element;
};

const CONTENT_TYPES: ChipDef[] = [
  { label: 'All', value: null, Icon: AllIcon },
  { label: 'Products', value: '/classification.labels/content_type/product', Icon: BootIcon },
  { label: 'Trail Guides', value: '/classification.labels/content_type/trail_guide', Icon: ContourIcon },
  { label: 'Gear Reviews', value: '/classification.labels/content_type/gear_review', Icon: StarIcon },
  { label: 'Ambassador Video', value: '/classification.labels/content_type/ambassador_video', Icon: PlayIcon },
  { label: 'Loyalty', value: '/classification.labels/content_type/loyalty_benefit', Icon: RibbonIcon },
];

const STARTER_QUERIES = [
  'I need a boot for the Overland Track in November.',
  'Repair-for-Life ambassadors near Tasmania.',
  'Best alpine shell under 600g.',
  'Trail guides for first-time thru-hikers.',
];

// Canonical strings returned by /ask when retrieval is empty. Detect &
// suppress so we never render "Not enough data to answer this." alongside
// a populated grid of results.
const NOT_ENOUGH_DATA_PATTERNS = [
  /not enough data to answer/i,
  /no relevant information/i,
  /cannot answer/i,
];

function isEmptyAnswer(answer: string | undefined | null): boolean {
  if (!answer) return true;
  const trimmed = answer.trim();
  if (!trimmed) return true;
  return NOT_ENOUGH_DATA_PATTERNS.some((re) => re.test(trimmed));
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of citations) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return '< 1s';
  return `${(ms / 1000).toFixed(1)}s`;
}

function LatencyIcon(): JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 2 L4 14 L11 14 L10 22 L20 9 L13 9 Z" />
    </svg>
  );
}

function SourceIcon(): JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 4 H17 L20 7 V18 H8 Z" />
      <path d="M5 8 V21 H16" />
    </svg>
  );
}

export function Storefront() {
  const { active: persona } = usePersona();
  const { active: language } = useLanguage();
  const [query, setQuery] = useState('I need a boot for the Overland Track in November.');
  const [debounced, setDebounced] = useState(query);
  const [contentType, setContentType] = useState<string | null>(null);
  const [result, setResult] = useState<FindResult | null>(null);
  // baseResult = the unfiltered /find for the active query. Lives separately
  // from `result` so chip counts stay STABLE across content-type toggles
  // (user complaint: clicking "Products" dropped Trail Guides / Gear Reviews
  // to 0 and disabled the chips). Counts are derived from baseResult, the
  // grid renders from `result`.
  const [baseResult, setBaseResult] = useState<FindResult | null>(null);
  const [summary, setSummary] = useState<AskSyncResult | null>(null);
  const [summaryMs, setSummaryMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cache of /ask answers keyed by (debounced query + content_type + audience).
  // Switching content_type chips no longer regenerates the AI summary if we
  // already have one for that key (chip-click latency ~0ms now vs ~2.5s).
  const askCache = useRef<Map<string, { summary: AskSyncResult; ms: number }>>(new Map());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 500);
    return () => clearTimeout(t);
  }, [query]);

  // Persona-scoped retrieval. Prospects (Sara) see ONLY shopper-audience
  // content — Trail Club Pro perks and member-exclusive reviews are gated
  // out. Members (Mara) get the full corpus.
  const audienceFilter = useMemo(
    () => (persona.loyaltyTier === 'Prospect' ? '/classification.labels/audience/shopper' : null),
    [persona.loyaltyTier],
  );

  const filters = useMemo(() => {
    const out: string[] = [];
    if (contentType) out.push(contentType);
    if (audienceFilter) out.push(audienceFilter);
    return out;
  }, [contentType, audienceFilter]);

  // Whenever the query OR persona changes (NOT contentType), fire ONE
  // unfiltered /find to drive chip counts. This is the heavy lift; the
  // content_type filter changes only re-fire the SCOPED /find for the grid.
  //
  // Clear baseResult BEFORE the fetch so the chip counts don't flash the
  // PREVIOUS persona's numbers during the in-flight load (Bug 5: switching
  // Sara -> Mara briefly showed Sara's "Loyalty 2" count before the new
  // numbers landed). With baseResult=null, typeCounts returns {} and the
  // chips render an em-dash placeholder until the new data arrives.
  useEffect(() => {
    if (!debounced.trim()) return;
    let cancelled = false;
    setBaseResult(null);
    const baseFilters = audienceFilter ? [audienceFilter] : [];
    find({ query: debounced, pageSize: 30, filters: baseFilters }).then(
      (r) => { if (!cancelled) setBaseResult(r); },
      () => { /* ignored — chip counts gracefully degrade */ },
    );
    return () => { cancelled = true; };
  }, [debounced, audienceFilter]);

  const run = useCallback(async () => {
    if (!debounced.trim()) return;
    const cacheKey = `${debounced}|${contentType ?? '_all'}|${audienceFilter ?? '_all'}`;
    // Serve from cache when we already have an answer for this exact
    // (query, content_type, audience) tuple. Eliminates the 2.5s LLM
    // round-trip on every chip click.
    const cached = askCache.current.get(cacheKey);
    if (cached) {
      setSummary(cached.summary);
      setSummaryMs(cached.ms);
      // Still need a fresh /find for the grid (page_size + filter changes).
      try {
        const r = await find({ query: debounced, pageSize: 9, filters });
        setResult(r);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);
    setSummaryMs(null);
    setResult(null);
    const askStart = performance.now();
    try {
      const [r, s] = await Promise.allSettled([
        find({ query: debounced, pageSize: 9, filters }),
        askSync({
          query: debounced,
          filters,
          maxTokens: 260,
          // Explicit system prompt — otherwise Nuclia's default prefaces
          // answers with "Based on the context provided…" which reads as
          // prompt scaffolding leaking to the customer.
          promptConfig: {
            system:
              'You are Aurora Outfitters\' product summary writer. ' +
              'STRICT: open with the SUBSTANTIVE answer in 2-3 sentences. ' +
              'NEVER preface with "Based on the context provided", "According to the retrieved documents", "The provided sources indicate", or any similar meta-narration. ' +
              'Cite product names verbatim from the context. Do not invent SKUs.',
            user: 'Context: {context}\n\nQuestion: {question}',
          },
        }),
      ]);
      const ms = Math.round(performance.now() - askStart);
      setResult(r.status === 'fulfilled' ? r.value : null);
      setSummary(s.status === 'fulfilled' ? s.value : null);
      setSummaryMs(ms);
      if (s.status === 'fulfilled') {
        askCache.current.set(cacheKey, { summary: s.value, ms });
      }
      if (r.status === 'rejected' && s.status === 'rejected') {
        setError(String(r.reason ?? s.reason ?? 'Retrieval failed.'));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [debounced, filters, contentType, audienceFilter]);

  useEffect(() => { run(); }, [run]);

  // Bust the ask cache when the user types a new query — keep cache scoped
  // to the active (debounced) query only so it doesn't grow unbounded.
  useEffect(() => {
    askCache.current = new Map();
  }, [debounced, audienceFilter]);

  // Count results per content_type FROM THE UNFILTERED BASE — so chip
  // counts stay stable across content-type toggles. When baseResult is
  // null (persona just changed, fetch in-flight), counts is empty and the
  // chips render an em-dash placeholder rather than the previous
  // persona's stale numbers (Bug 5).
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!baseResult) return counts;
    let total = 0;
    for (const r of Object.values(baseResult.resources)) {
      total += 1;
      const ct = r.classifications?.find((c) => c.labelset === 'content_type')?.label;
      if (ct) counts[ct] = (counts[ct] ?? 0) + 1;
    }
    counts.__all__ = total;
    return counts;
  }, [baseResult]);
  const countsReady = baseResult !== null;

  const dedupedCitations = summary ? dedupeCitations(summary.citations) : [];
  const showSummaryCard = !!summary && !isEmptyAnswer(summary.answer);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Hybrid retrieval</div>
          <h1 className="h-page mt-2">Conversational discovery</h1>
          <p className="h-page-sub">Hybrid retrieval over products, guides, reviews, ambassador content. CTAs are picked from custom fields on each resource.</p>
        </div>
        <PersonaToggle />
      </header>

      <div className="mt-6 space-y-3">
        <input className="input text-lg" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask anything…" />
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((ct) => {
            const isActive = contentType === ct.value;
            const count =
              ct.value === null
                ? typeCounts.__all__
                : typeCounts[contentTypeFromFilter(ct.value)];
            // Dim chips whose content type has 0 matches in the current
            // result set. 'All' is never dimmed; an active chip is never
            // dimmed (so the user can still un-toggle it). Don't dim while
            // counts are still loading — wait for the new persona's data
            // before deciding anything is "empty" (Bug 5).
            const isEmpty =
              countsReady &&
              ct.value !== null &&
              !isActive &&
              (typeof count !== 'number' || count === 0);
            return (
              <button
                key={ct.label}
                type="button"
                onClick={() => setContentType(contentType === ct.value ? null : ct.value)}
                disabled={isEmpty}
                aria-disabled={isEmpty}
                title={isEmpty ? `No ${ct.label.toLowerCase()} in this result set` : undefined}
                className={`chip ${isActive ? 'chip-active' : ''} ${isEmpty ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <ct.Icon className="h-3.5 w-3.5" />
                <span>{ct.label}</span>
                {!countsReady && (
                  <span
                    className={`ml-1 rounded-full px-1.5 text-[10px] ${isActive ? 'bg-alpine-100 text-alpine-700' : 'bg-sand-100 text-sand-500'}`}
                    aria-label="Loading"
                  >
                    —
                  </span>
                )}
                {countsReady && typeof count === 'number' && count > 0 && (
                  <span className={`ml-1 rounded-full px-1.5 text-[10px] ${isActive ? 'bg-alpine-100 text-alpine-700' : 'bg-sand-100 text-sand-600'}`}>
                    {count}
                  </span>
                )}
                {countsReady && isEmpty && (
                  <span className="ml-1 rounded-full bg-sand-100 px-1.5 text-[10px] text-sand-500">0</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <AiSummarySkeleton />
      )}

      {!loading && error && (
        <div className="mt-8">
          <ErrorPanel message={error} onRetry={run} />
        </div>
      )}

      {!loading && !error && showSummaryCard && summary && (
        <AiSummaryCard
          answer={summary.answer}
          citations={dedupedCitations}
          summaryMs={summaryMs}
          language={language}
        />
      )}

      {loading && (
        <div className="mt-8">
          <SkeletonGrid count={6} />
        </div>
      )}

      {!loading && !error && (
        <div className="mt-8">
          {result && Object.keys(result.resources).length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.values(result.resources).map((r, idx) => (
                <div
                  key={r.id}
                  className="fade-in-up"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <StorefrontCard resource={r} />
                </div>
              ))}
            </div>
          )}
          {result && Object.keys(result.resources).length === 0 && (
            <StorefrontEmptyState onPick={(q) => setQuery(q)} />
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------- subcomponents --------------------- */

function AiSummaryCard({
  answer,
  citations,
  summaryMs,
  language,
}: {
  answer: string;
  citations: Citation[];
  summaryMs: number | null;
  language: string;
}) {
  // Belt-and-braces preface strip in case the LLM ignores the system prompt.
  const cleanAnswer = useMemo(() => stripMetaPreface(answer), [answer]);
  const answerHtml = useMemo(() => renderInlineMarkdown(cleanAnswer), [cleanAnswer]);
  return (
    <div className="mt-8 relative overflow-hidden rounded-2xl border border-alpine-300 bg-white p-5 pl-6 shadow-sm ring-1 ring-alpine-100/60">
      {/* alpine vertical rule */}
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-alpine-500 to-alpine-600" aria-hidden="true" />
      {/* faint gradient wash */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-alpine-50/60 via-transparent to-rust-50/40" aria-hidden="true" />
      <div className="relative">
        <div className="eyebrow-ai">
          <span className="ai-dot" />
          Aurora AI summary
        </div>
        <div
          className="ai-typed mt-3 whitespace-pre-wrap text-sm leading-relaxed text-sand-900"
          dangerouslySetInnerHTML={{ __html: answerHtml }}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {typeof summaryMs === 'number' && (
            <span className="chip-metric">
              <LatencyIcon />
              {formatLatency(summaryMs)}
            </span>
          )}
          <span className="chip-metric">
            <SourceIcon />
            {citations.length} {citations.length === 1 ? t(language, 'sourcesSingular') : t(language, 'sourcesPlural')}
          </span>
        </div>
        {citations.length > 0 && (
          <div className="mt-3 border-t border-alpine-100 pt-3">
            <div className="eyebrow-alpine mb-2">{t(language, 'citedFrom')}</div>
            <div className="flex flex-wrap gap-1.5">
              {citations.slice(0, 6).map((c) => {
                const href = ctaHrefFor({ title: c.title, fallbackId: c.id });
                return (
                  <Link
                    key={c.id}
                    to={href}
                    title={c.excerpt ?? c.title}
                    className="inline-flex max-w-[280px] items-center gap-1.5 truncate rounded-full border border-alpine-300 bg-alpine-50/70 px-2.5 py-1 text-[11px] font-medium text-alpine-700 no-underline transition hover:border-alpine-500 hover:bg-alpine-50 hover:shadow-sm"
                  >
                    <svg viewBox="0 0 16 16" className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                      <path d="M4 3h6l2 2v8H4z" strokeLinejoin="round" />
                      <path d="M6 7h4M6 10h3" strokeLinecap="round" />
                    </svg>
                    <span className="truncate">{c.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tiny inline-markdown renderer for the AI summary. Handles **bold** and
 * single newlines without pulling in a markdown lib. Escapes HTML first
 * so model output can't inject script tags via dangerouslySetInnerHTML.
 */
function renderInlineMarkdown(src: string): string {
  const escaped = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`\n]+?)`/g, '<code>$1</code>');
}

/**
 * Strip the LLM's meta-narration preface ("Based on the context provided...")
 * that occasionally slips through despite the system prompt forbidding it.
 * Matches the first sentence if it opens with a known preface pattern; leaves
 * the rest untouched.
 */
function stripMetaPreface(src: string): string {
  if (!src) return src;
  return src.replace(
    /^\s*(based on (?:the )?(?:context|retrieved|provided)[^.!?]*[.!?]|according to (?:the )?(?:context|retrieved|provided|sources)[^.!?]*[.!?]|the (?:provided|retrieved) (?:context|sources?|documents?)[^.!?]*[.!?]|from the (?:context|sources?|documents?) provided[^.!?]*[.!?])\s*/i,
    '',
  ).trimStart();
}

function AiSummarySkeleton() {
  return (
    <div className="mt-8 relative overflow-hidden rounded-2xl border border-alpine-300 bg-white p-5 pl-6 shadow-sm ring-1 ring-alpine-100/60">
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-alpine-500 to-alpine-600" aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-alpine-50/60 via-transparent to-rust-50/40" aria-hidden="true" />
      <div className="relative">
        <div className="eyebrow-ai">
          <span className="ai-dot" />
          Aurora AI summary
        </div>
        <div className="mt-3 space-y-2" aria-label="Streaming response">
          <div className="skeleton-shimmer h-3 w-11/12 rounded-full bg-sand-100" />
          <div className="skeleton-shimmer h-3 w-10/12 rounded-full bg-sand-100" />
          <div className="skeleton-shimmer h-3 w-9/12 rounded-full bg-sand-100" />
          <div className="skeleton-shimmer h-3 w-7/12 rounded-full bg-sand-100" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="skeleton-shimmer chip-metric w-16 text-transparent">.</span>
          <span className="skeleton-shimmer chip-metric w-20 text-transparent">.</span>
        </div>
      </div>
    </div>
  );
}

function StorefrontEmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 bg-white p-10 text-center">
      <div className="mx-auto max-w-md space-y-3">
        <div className="eyebrow-alpine">No match yet</div>
        <h3 className="font-display text-xl text-sand-900">
          Aurora couldn't find a fit for that one.
        </h3>
        <p className="text-sm text-sand-700">
          Try a different angle — or start from one of these. Hybrid retrieval works
          best with a destination, an activity, or a piece of gear.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {STARTER_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onPick(q)}
              className="chip"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------- helpers --------------------- */

function contentTypeFromFilter(filter: string): string {
  // '/classification.labels/content_type/product' -> 'product'
  return filter.split('/').pop() ?? '';
}

/* --------------------- chip icons --------------------- */

function chipIconBase(props: { className?: string; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={props.className}
    >
      {props.children}
    </svg>
  );
}

function AllIcon({ className }: { className?: string }) {
  return chipIconBase({
    className,
    children: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M4 12h16" />
        <path d="M12 4c3 3 3 13 0 16" />
        <path d="M12 4c-3 3-3 13 0 16" />
      </>
    ),
  });
}

function BootIcon({ className }: { className?: string }) {
  return chipIconBase({
    className,
    children: (
      <>
        <path d="M8 4v10a3 3 0 0 0 3 3h8a2 2 0 0 0 2-2v-1a3 3 0 0 0-2.1-2.85l-3.4-1.05A3 3 0 0 1 13.4 8L13 4z" />
        <path d="M8 17v2a1 1 0 0 0 1 1h11" />
      </>
    ),
  });
}

function ContourIcon({ className }: { className?: string }) {
  return chipIconBase({
    className,
    children: (
      <>
        <path d="M3 18c3-4 6-4 9 0s6 4 9 0" />
        <path d="M4 14c3-3 5-3 8 0s5 3 8 0" />
        <path d="M6 10c2-2 4-2 6 0s4 2 6 0" />
      </>
    ),
  });
}

function StarIcon({ className }: { className?: string }) {
  return chipIconBase({
    className,
    children: (
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />
    ),
  });
}

function PlayIcon({ className }: { className?: string }) {
  return chipIconBase({
    className,
    children: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5l6 3.5-6 3.5z" />
      </>
    ),
  });
}

function RibbonIcon({ className }: { className?: string }) {
  return chipIconBase({
    className,
    children: (
      <>
        <path d="M6 3h12v12l-6-3-6 3z" />
        <path d="M8 17l-2 4 6-3 6 3-2-4" />
      </>
    ),
  });
}
