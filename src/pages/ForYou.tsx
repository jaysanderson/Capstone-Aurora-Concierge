import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { find, type ResourceHit } from '../lib/ragClient';
import { sanitizeExcerpt, ctaHrefFor } from '../lib/sanitizeExcerpt';
import { usePersona } from '../context/PersonaContext';
import { StorefrontCard } from '../components/StorefrontCard';
import { PersonaToggle } from '../components/PersonaToggle';
import { SkeletonCard, EmptyState, ErrorPanel } from '../components/States';

const firstName = (n: string) => n.split(' ')[0].replace(/[·,]/g, '');

/**
 * Personalized "For You" — driven by /find.
 *
 * Not a search box. The query is derived from the active persona profile
 * (segment, loyalty tier, region). The /find filters compose with the
 * persona's audience tier so member-exclusive content only surfaces for
 * members.
 *
 * This is the explainable-personalization surface: every card cites its
 * source resource and the panel explains *why* this was recommended.
 */

type Layout = 'hero-plus-three' | 'carousel' | 'banner' | 'grid';

interface Section {
  title: string;
  reason: string;
  query: string;
  filters: string[];
  pageSize: number;
  layout: Layout;
}

/**
 * Sanitize a single ResourceHit so raw markdown ('# Title', '**Status:**',
 * raw body) never reaches the card. We mutate a shallow copy — the
 * StorefrontCard prefers `searchResultDisplay.description` over `excerpt`,
 * so both must be cleaned.
 */
function cleanHit(r: ResourceHit): ResourceHit {
  const cleanDescription = sanitizeExcerpt(
    r.searchResultDisplay?.description ?? r.excerpt,
  );
  return {
    ...r,
    excerpt: cleanDescription,
    searchResultDisplay: r.searchResultDisplay
      ? { ...r.searchResultDisplay, description: cleanDescription }
      : undefined,
  };
}

export function ForYou() {
  const { active: persona } = usePersona();
  const [sections, setSections] = useState<Array<Section & { hits: ResourceHit[]; loading: boolean; error?: string }>>([]);
  const [showDevQuery, setShowDevQuery] = useState(false);
  // Banner above the page that announces "Re-retrieving for <name>…" during
  // a persona switch — the actual retrieval is fast so without a deliberate
  // beat the audience can't tell the AI is doing anything (Issue #4).
  const [retrievingFor, setRetrievingFor] = useState<string | null>(null);
  const firstLoadRef = useRef(true);

  const sectionDefs = useMemo<Section[]>(() => buildSections(persona.segment, persona.loyaltyTier, persona.region), [persona]);

  const runAll = useCallback(async () => {
    setSections(sectionDefs.map((s) => ({ ...s, hits: [], loading: true })));
    // Skip the announcement on first load (it's the initial fetch, not a switch).
    if (!firstLoadRef.current) {
      setRetrievingFor(firstName(persona.displayName));
    }
    firstLoadRef.current = false;
    const minDuration = new Promise((r) => setTimeout(r, 550));
    const [results] = await Promise.all([
      Promise.allSettled(
        sectionDefs.map((s) => find({ query: s.query, filters: s.filters, pageSize: s.pageSize })),
      ),
      minDuration,
    ]);
    setSections(
      sectionDefs.map((s, idx) => {
        const r = results[idx];
        if (r.status === 'rejected') return { ...s, hits: [], loading: false, error: String(r.reason) };
        const hits = Object.values(r.value.resources).map(cleanHit);
        // Cap to declared pageSize so layouts never break on overflow.
        return { ...s, hits: hits.slice(0, s.pageSize), loading: false };
      }),
    );
    setRetrievingFor(null);
  }, [sectionDefs, persona.displayName]);

  useEffect(() => { runAll(); }, [runAll]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow-ai"><span className="ai-dot" /> Personalised retrieval</div>
          <h1 className="h-page mt-2">For you, <span className="text-alpine-600">{firstName(persona.displayName)}</span>.</h1>
          <p className="h-page-sub">Every section below was retrieved by the AI from your segment, tier, and region — no search box, no rule engine, no editorial calendar.</p>
        </div>
        <PersonaToggle />
      </header>

      {/* Persona-switch announcement — gives the audience a beat to see the
          AI working. Without this, the switch is instant and undersells the
          live retrieval (Issue #4). */}
      {retrievingFor && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-alpine-300 bg-alpine-50/70 px-3 py-2 text-sm text-alpine-700 fade-in">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-alpine-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-alpine-500" />
          </span>
          <span>
            <strong className="font-semibold">Re-retrieving for {retrievingFor}…</strong>{' '}
            <span className="text-sand-700">five scoped queries running against the knowledge base.</span>
          </span>
        </div>
      )}

      <WhyAmISeeingThis
        persona={persona}
        sections={sections}
        showDevQuery={showDevQuery}
        onToggleDevQuery={() => setShowDevQuery((v) => !v)}
      />

      <div className="mt-10 space-y-14">
        {sections.map((s) => (
          <SectionBlock key={s.title} section={s} />
        ))}
      </div>
    </div>
  );
}

interface SectionState extends Section {
  hits: ResourceHit[];
  loading: boolean;
  error?: string;
}

function SectionBlock({ section: s }: { section: SectionState }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="h-section">{s.title}</h2>
        {s.loading && <span className="chip-metric">searching</span>}
      </div>
      <p className="mt-1 text-sm text-sand-700">{s.reason}</p>

      {s.loading && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!s.loading && s.error && (
        <div className="mt-3">
          <ErrorPanel message={s.error} />
        </div>
      )}

      {!s.loading && !s.error && s.hits.length === 0 && (
        <div className="mt-3">
          <EmptyState
            title="No matches yet"
            body="No content in the current corpus lines up with this section. Ingest a few more resources and the picks fill out — retrieval here is fully driven by what Aurora can see."
          />
        </div>
      )}

      {!s.loading && s.hits.length > 0 && (
        <SectionLayout layout={s.layout} hits={s.hits} />
      )}
    </section>
  );
}

/**
 * Render hits according to the section's declared layout.
 * - hero-plus-three: first card spans 2 cols (large hero), next 3 in a row.
 * - carousel: horizontal scroll, portrait cards.
 * - banner: full-width single card.
 * - grid: original 3-up grid.
 */
function SectionLayout({ layout, hits }: { layout: Layout; hits: ResourceHit[] }) {
  if (layout === 'hero-plus-three') {
    // Render exactly 1 hero + up to 3 supporting cards (4 total).
    // This is what gives the page its "magazine feel" and avoids the
    // orphan-card problem the old 7-of-2-rows grid had.
    const [hero, ...rest] = hits;
    return (
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {hero && (
          <div className="lg:col-span-3 fade-in-up" style={{ animationDelay: '0ms' }}>
            <StorefrontCard resource={hero} eyebrow="Top pick" eyebrowVariant="alpine" />
          </div>
        )}
        {rest.slice(0, 3).map((r, idx) => (
          <div
            key={r.id}
            className="fade-in-up"
            style={{ animationDelay: `${(idx + 1) * 60}ms` }}
          >
            <StorefrontCard resource={r} />
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'carousel') {
    return (
      <div className="mt-4 -mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-4 snap-x snap-mandatory">
          {hits.map((r, idx) => (
            <div
              key={r.id}
              className="w-72 shrink-0 snap-start fade-in-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <StorefrontCard resource={r} eyebrow="Ambassador" eyebrowVariant="alpine" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'banner') {
    const [first] = hits;
    if (!first) return null;
    const bannerTitle = (first.searchResultDisplay?.title ?? first.title ?? '').replace(/^#+\s*/, '').trim();
    const bannerContentType = first.classifications?.find((c) => c.labelset === 'content_type')?.label;
    const bannerHref = ctaHrefFor({ contentType: bannerContentType, title: bannerTitle, fallbackId: first.id });
    return (
      <div className="mt-4 fade-in-up">
        <div className="card-accent">
          <div className="eyebrow-alpine">Member preview</div>
          <h3 className="mt-2 font-display text-xl text-sand-900">{bannerTitle}</h3>
          {first.excerpt && (
            <p className="mt-2 text-sm text-sand-700">{first.excerpt}</p>
          )}
          <a
            href={bannerHref}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-full bg-rust-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-rust-600 hover:shadow-md active:scale-[0.98]"
          >
            {first.searchResultDisplay?.ctaLabel ?? first.callToAction ?? 'Explore Trail Club'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {hits.map((r, idx) => (
        <div
          key={r.id}
          className="fade-in-up"
          style={{ animationDelay: `${idx * 60}ms` }}
        >
          <StorefrontCard resource={r} />
        </div>
      ))}
    </div>
  );
}

/**
 * Page-level explanation panel. Replaces the per-section JSON disclosures
 * with a single, human-readable account of *why* the user is seeing what
 * they're seeing, plus an opt-in dev mode that exposes the raw /find
 * filters for debugging.
 */
function WhyAmISeeingThis({
  persona,
  sections,
  showDevQuery,
  onToggleDevQuery,
}: {
  persona: ReturnType<typeof usePersona>['active'];
  sections: SectionState[];
  showDevQuery: boolean;
  onToggleDevQuery: () => void;
}) {
  // First-load pulse hint on the developer-view button so a CMO sees it
  // exists without being told. Fires once per mount.
  const [hint, setHint] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 4500);
    return () => window.clearTimeout(t);
  }, []);

  const tierLine =
    persona.loyaltyTier === 'Prospect'
      ? `you're not yet a Trail Club member, so we're restricting picks to shopper-audience content`
      : `you're a ${persona.loyaltyTier} member, so member-exclusive perks and stories are unlocked`;
  return (
    <div className="mt-6 card-accent">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="eyebrow-ai">
            <span className="ai-dot" />
            Why am I seeing this?
          </div>
          <p className="mt-2 text-sm leading-relaxed text-sand-900">
            Because you're a <strong>{persona.segment}</strong> in{' '}
            <strong>{persona.region}</strong>, and {tierLine}. Each section below
            runs its own scoped retrieval against the Aurora knowledge base — the
            AI matches against content type, audience tier, and trip style.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { onToggleDevQuery(); setHint(false); }}
          aria-pressed={showDevQuery}
          className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
            showDevQuery
              ? 'border-alpine-500 bg-alpine-500 text-white shadow-sm'
              : 'border-alpine-400 bg-white text-alpine-700 hover:bg-alpine-50 hover:shadow-md'
          } ${hint && !showDevQuery ? 'ring-2 ring-alpine-300 ring-offset-2 ring-offset-white animate-pulse' : ''}`}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M5 4l-3 4 3 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 4l3 4-3 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {showDevQuery ? 'Hide the AI\'s queries' : "See the AI's actual queries"}
        </button>
      </div>
      {showDevQuery && (
        <div className="mt-4 space-y-3">
          {sections.map((s) => (
            <div
              key={s.title}
              className="rounded-md border border-alpine-200 bg-white p-3 font-mono text-[11px] text-sand-900 whitespace-pre-wrap"
            >
{`# ${s.title}
/find {
  query: ${JSON.stringify(s.query)},
  filters: ${JSON.stringify(s.filters, null, 2)},
  page_size: ${s.pageSize}
}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Build the personalization sections from the active persona.
 * - For prospects (Shopper voice, no loyalty), audienceFilter is applied to
 *   *every* section so member-only content never leaks through. (Previously
 *   only the first section enforced this — see bug #2.)
 * - For Trail Club Pro members, the audience filter is omitted entirely
 *   so they see standard + tier-specific content.
 */
function buildSections(
  segment: string,
  tier: string,
  region: string,
): Section[] {
  const isMember = tier !== 'Prospect';
  const audienceFilter = isMember
    ? null  // members see everything (their own tier + standard shopper content)
    : '/classification.labels/audience/shopper';
  // Region filter is currently unused by the corpus; kept for future use.
  void region;

  const segmentLower = segment.toLowerCase();
  const activitiesBySegment: Record<string, string> = {
    'weekend adventurer': 'day hiking weekend overnighter',
    'thru-hiker': 'thru hike multi-day pack',
    'alpine pro': 'alpine climbing multi-pitch',
  };
  const activityTerms = activitiesBySegment[segmentLower] ?? 'outdoor trip';

  // Helper: compose a content-type filter array with the audience filter
  // appended whenever the persona is a prospect.
  const withAudience = (typeFilter: string): string[] =>
    audienceFilter ? [typeFilter, audienceFilter] : [typeFilter];

  return [
    {
      title: 'Picks for your activity',
      reason: `Products and stories chosen for the trips your segment actually takes.`,
      query: `${activityTerms} gear and trip planning for ${segment}`,
      filters: withAudience('/classification.labels/content_type/product'),
      // Hero-plus-three layout renders exactly 4 cards (1 hero + 3
      // supporting). That kills the Mara orphan-card bug (#5) by design.
      pageSize: 4,
      layout: 'hero-plus-three',
    },
    {
      title: 'Inspiration · trail guides',
      reason: `Routes close to home, sized to the kind of weekend you have.`,
      query: `${segment} multi-day trail planning ${region}`,
      filters: withAudience('/classification.labels/content_type/trail_guide'),
      pageSize: 4,
      layout: 'grid',
    },
    {
      title: 'From your ambassadors',
      reason: `Voices in the corpus whose audience overlaps yours.`,
      query: `ambassador trail picks for ${segment} customer`,
      filters: withAudience('/classification.labels/content_type/ambassador_video'),
      pageSize: 4,
      layout: 'carousel',
    },
    ...(isMember
      ? [
          {
            title: `${tier} perks waiting for you`,
            reason: `Why members beat prospects.`,
            query: `${tier} member perks Repair-for-Life ambassador access`,
            filters: ['/classification.labels/content_type/loyalty_benefit'],
            pageSize: 3,
            layout: 'grid' as Layout,
          },
        ]
      : [
          {
            title: 'Why join Trail Club',
            reason: `What you unlock the moment you become a member.`,
            query: `Trail Club membership tiers and perks`,
            filters: withAudience('/classification.labels/content_type/loyalty_benefit'),
            pageSize: 1,
            layout: 'banner' as Layout,
          },
        ]),
    {
      title: 'Brand stories you might align with',
      reason: `The Aurora pillars that resonate with how you adventure.`,
      query: `brand pillars sustainability ${segment} gear repair`,
      filters: withAudience('/classification.labels/content_type/brand_story'),
      pageSize: 2,
      layout: 'grid',
    },
  ];
}
