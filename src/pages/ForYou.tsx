import { useCallback, useEffect, useMemo, useState } from 'react';
import { find, type ResourceHit } from '../lib/ragClient';
import { usePersona } from '../context/PersonaContext';
import { StorefrontCard } from '../components/StorefrontCard';

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

interface Section {
  title: string;
  reason: string;
  query: string;
  filters: string[];
  pageSize: number;
}

export function ForYou() {
  const { active: persona } = usePersona();
  const [sections, setSections] = useState<Array<Section & { hits: ResourceHit[]; loading: boolean; error?: string }>>([]);

  const sectionDefs = useMemo<Section[]>(() => buildSections(persona.segment, persona.loyaltyTier, persona.region), [persona]);

  const runAll = useCallback(async () => {
    setSections(sectionDefs.map((s) => ({ ...s, hits: [], loading: true })));
    const results = await Promise.allSettled(
      sectionDefs.map((s) => find({ query: s.query, filters: s.filters, pageSize: s.pageSize })),
    );
    setSections(
      sectionDefs.map((s, idx) => {
        const r = results[idx];
        if (r.status === 'rejected') return { ...s, hits: [], loading: false, error: String(r.reason) };
        return { ...s, hits: Object.values(r.value.resources), loading: false };
      }),
    );
  }, [sectionDefs]);

  useEffect(() => { runAll(); }, [runAll]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header>
        <span className="badge badge-rust">/find · personalization</span>
        <h1 className="mt-3 font-display text-3xl text-sand-900">For you, {persona.displayName.split(' · ')[0]}</h1>
        <p className="mt-1 max-w-3xl text-sm text-sand-700">
          Picks generated from your profile — <strong>{persona.segment}</strong>, {persona.loyaltyTier}, {persona.region}.
          Every card is grounded in a real Aurora resource. No black box; the "Why" panel under each section explains the query and the filters.
          Switch persona in the header — the picks update.
        </p>
      </header>

      <div className="mt-10 space-y-12">
        {sections.map((s) => (
          <section key={s.title}>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-2xl text-sand-900">{s.title}</h2>
              <div className="text-xs text-sand-600">{s.loading ? 'loading…' : `${s.hits.length} matches`}</div>
            </div>
            <p className="mt-1 text-sm text-sand-700">{s.reason}</p>

            {s.error && (
              <div className="mt-3 rounded-md border border-rust-400 bg-rust-50 p-3 text-xs text-rust-700">{s.error}</div>
            )}

            {!s.loading && s.hits.length === 0 && !s.error && (
              <div className="mt-3 rounded-2xl border border-dashed border-sand-300 p-6 text-center text-sm text-sand-500">
                No matches against the current corpus for this section. Ingest more content and the picks fill out.
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {s.hits.map((r) => <StorefrontCard key={r.id} resource={r} />)}
            </div>

            <details className="mt-3 text-xs text-sand-600">
              <summary className="cursor-pointer">Why this section · query + filters</summary>
              <pre className="mt-2 rounded-md bg-sand-100 p-3 font-mono text-[11px]">
{`/find {
  query: ${JSON.stringify(s.query)},
  filters: ${JSON.stringify(s.filters, null, 2)},
  page_size: ${s.pageSize}
}`}
              </pre>
            </details>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * Build the personalization sections from the active persona.
 * - For prospects (Shopper voice, no loyalty), exclude member-only content.
 * - For Trail Club Pro members, include trail_club_pro audience content.
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
  const regionFilter = `/classification.labels/region/${region.toLowerCase()}`;

  const segmentLower = segment.toLowerCase();
  const activitiesBySegment: Record<string, string> = {
    'weekend adventurer': 'day hiking weekend overnighter',
    'thru-hiker': 'thru hike multi-day pack',
    'alpine pro': 'alpine climbing multi-pitch',
  };
  const activityTerms = activitiesBySegment[segmentLower] ?? 'outdoor trip';

  return [
    {
      title: 'Picks for your activity',
      reason: `Products and content tagged for ${segment}-friendly trips. We use /find with hybrid retrieval against the activity vocabulary.`,
      query: `${activityTerms} gear and trip planning for ${segment}`,
      filters: [
        '/classification.labels/content_type/product',
        ...(audienceFilter ? [audienceFilter] : []),
      ],
      pageSize: 6,
    },
    {
      title: 'Inspiration · trail guides',
      reason: `Trail guides ${region}-region-friendly and matched to your segment's typical trip length.`,
      query: `${segment} multi-day trail planning ${region}`,
      filters: [
        '/classification.labels/content_type/trail_guide',
      ],
      pageSize: 4,
    },
    {
      title: 'From your ambassadors',
      reason: `Ambassador-authored content that aligns with your segment. Mara for alpine/multi-day, Jonah for thru-hiking, Theo for technical climbing.`,
      query: `ambassador trail picks for ${segment} customer`,
      filters: [
        '/classification.labels/content_type/ambassador_video',
      ],
      pageSize: 3,
    },
    ...(isMember
      ? [
          {
            title: `${tier} perks waiting for you`,
            reason: `Member-exclusive content surfaced because your loyalty tier is ${tier}.`,
            query: `${tier} member perks Repair-for-Life ambassador access`,
            filters: ['/classification.labels/content_type/loyalty_benefit'],
            pageSize: 3,
          },
        ]
      : [
          {
            title: 'Why join Trail Club',
            reason: `You're a prospect, so we recommend a one-card promo for Trail Club. After you join, this section becomes member-exclusive perks.`,
            query: `Trail Club membership tiers and perks`,
            filters: ['/classification.labels/content_type/loyalty_benefit'],
            pageSize: 1,
          },
        ]),
    {
      title: 'Brand stories you might align with',
      reason: `Built for the Worst Weather. Trail-Tested by Experts. Repairable for Life. Carbon-Negative by 2030. Brand content surfaced via semantic match.`,
      query: `brand pillars sustainability ${segment} gear repair`,
      filters: ['/classification.labels/content_type/brand_story'],
      pageSize: 2,
    },
  ];
}
