import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useResidency } from '../context/ResidencyContext';
import { useByoLlm, PROVIDER_LABELS } from '../context/ByoLlmContext';
import { SurfaceTile } from '../components/SurfaceTile';
import { ArchitectureDiagram } from '../components/ArchitectureDiagram';
import {
  queryNodesByGroup,
  queryPaths,
  type GraphPath,
} from '../lib/graphClient';
import {
  SearchIcon,
  SparkleIcon,
  ChatIcon,
  SchemaIcon,
  GraphIcon,
  PipelineIcon,
} from '../components/TileIcons';

// SAME seeds the JourneyGraph page uses so the headline counts on /
// match the live numbers on /journey-graph (CMO catches inconsistency).
const DEMO_SEEDS = [
  { value: 'Aurora Helios', group: 'PRODUCT' },
  { value: 'Aurora TerraTrek 7', group: 'PRODUCT' },
  { value: 'Aurora Skyline 45L', group: 'PRODUCT' },
  { value: 'Mara Chen', group: 'AMBASSADOR' },
] as const;

const ENTITY_GROUPS = [
  'PRODUCT', 'CATEGORY', 'ACTIVITY', 'DESTINATION', 'AMBASSADOR',
  'CONTENT', 'CUSTOMER_SEGMENT', 'LOYALTY_TIER', 'BRAND_PILLAR', 'SIZING_PROFILE',
] as const;

function useLiveGraphCounts() {
  const [entityCount, setEntityCount] = useState<number | null>(null);
  const [relationCount, setRelationCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [groupResults, pathResults] = await Promise.all([
        Promise.allSettled(ENTITY_GROUPS.map((g) => queryNodesByGroup(g))),
        Promise.allSettled(DEMO_SEEDS.map((s) => queryPaths(s))),
      ]);
      if (cancelled) return;
      const totalEntities = groupResults.reduce(
        (sum, r) => sum + (r.status === 'fulfilled' ? r.value.length : 0),
        0,
      );
      const all: GraphPath[] = [];
      for (const r of pathResults) {
        if (r.status === 'fulfilled') all.push(...r.value);
      }
      const seen = new Set<string>();
      let unique = 0;
      for (const p of all) {
        const k = `${p.source.value}|${p.relation.label}|${p.destination.value}`;
        if (seen.has(k)) continue;
        seen.add(k);
        unique += 1;
      }
      setEntityCount(totalEntities);
      setRelationCount(unique);
    })();
    return () => { cancelled = true; };
  }, []);

  return { entityCount, relationCount };
}

export function Landing() {
  const residency = useResidency();
  const byo = useByoLlm();
  const { entityCount, relationCount } = useLiveGraphCounts();
  const [conciergeQ, setConciergeQ] = useState('');

  const journeyTileDesc = useMemo(() => {
    const e = entityCount ?? 190;
    const r = relationCount ?? 108;
    return `${e} typed entities · ${r} canonical relations — all extracted autonomously.`;
  }, [entityCount, relationCount]);

  function onAskConcierge(e: React.FormEvent) {
    e.preventDefault();
    const q = conciergeQ.trim();
    if (!q) return;
    window.dispatchEvent(
      new CustomEvent('aurora.concierge.prefill', { detail: { question: q, autoSend: true } }),
    );
    setConciergeQ('');
  }

  return (
    <div>
      {/* Hero */}
      <section className="fade-in-up mx-auto max-w-7xl px-4 pt-12 pb-16 grid gap-10 lg:grid-cols-[1.1fr_1fr] items-center">
        <div>
          <h1 className="font-display text-5xl tracking-tight text-sand-900 leading-[1.05]">
            Built for the <span className="text-alpine-600">worst weather</span>.
            <br />
            Trail-tested by experts.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-sand-700 leading-relaxed">
            Every customer gets the answer a master fitter would give them — in their language, on their device,
            on their schedule.
          </p>
          {/* Decorative brand labels — restyled as tag-style labels (not
              chips) so they don't read as interactive affordances. Subtle
              leading dot keeps the brand expression without inviting clicks. */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sand-600">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-rust-500" />
              Repair-for-Life
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sand-600">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-alpine-500" />
              Carbon-Negative 2030
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sand-600">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-alpine-500" />
              Trail Club Pro
            </span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/storefront" className="btn-primary">
              Open the storefront
            </Link>
            <Link
              to="/for-you"
              className="rounded-full border border-alpine-300 bg-white px-4 py-2 text-sm font-medium text-alpine-700 hover:bg-alpine-50 transition"
            >
              See your personalised feed
            </Link>
            <a
              href="mailto:concierge@aurora-outfitters.example.com?subject=Aurora%20Concierge%20%E2%80%94%20book%20a%20walkthrough"
              className="rounded-full border border-rust-300 bg-white px-4 py-2 text-sm font-medium text-rust-700 hover:bg-rust-50 transition"
            >
              Book a walkthrough →
            </a>
          </div>
        </div>
        <div>
          <HeroArtwork />
        </div>
      </section>

      {/* Inline concierge demo strip — one live moment on the landing page so
          a visitor proves the claim before navigating away. */}
      <section className="mx-auto max-w-7xl px-4 -mt-4 mb-12">
        <form
          onSubmit={onAskConcierge}
          className="flex flex-col gap-3 rounded-2xl border border-alpine-300 bg-gradient-to-br from-alpine-50/80 via-white to-rust-50/30 p-4 shadow-sm sm:flex-row sm:items-center"
        >
          <div className="flex items-baseline gap-2 sm:flex-shrink-0">
            <span className="eyebrow-ai">
              <span className="ai-dot" /> Try it now
            </span>
            <span className="text-[11px] text-sand-600 hidden sm:inline">·</span>
            <span className="hidden text-xs text-sand-700 sm:inline">Ask the Aurora concierge anything</span>
          </div>
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={conciergeQ}
              onChange={(e) => setConciergeQ(e.target.value)}
              placeholder="e.g. warmest jacket for Patagonia in October"
              className="input flex-1 text-sm"
              aria-label="Ask the Aurora concierge"
            />
            <button type="submit" disabled={!conciergeQ.trim()} className="btn-primary text-sm disabled:cursor-default disabled:opacity-50">
              Ask
            </button>
          </div>
        </form>
      </section>

      {/* Retail brand pillars */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="eyebrow">The Aurora promise</div>
        <h2 className="h-section mt-2">Four things we never compromise</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BrandPillar title="Worst Weather">
            Tested at -40&deg;C and on the windward face. If it fails on the mountain, it never reaches the shelf.
          </BrandPillar>
          <BrandPillar title="Trail-Tested">
            Every product carries a field report from a guide, fitter, or athlete who actually put it through a season.
          </BrandPillar>
          <BrandPillar title="Repair-for-Life">
            We repair anything we sell, for as long as you own it. Send it back; we send it forward.
          </BrandPillar>
          <BrandPillar title="Carbon-Negative 2030">
            On track to remove more than we emit by 2030. Every order ships with its footprint receipt.
          </BrandPillar>
        </div>
      </section>

      {/* Tier 1+2 surfaces — editorial */}
      <section className="mx-auto max-w-7xl px-4 mt-16">
        <div className="eyebrow-alpine">For customers</div>
        <h2 className="h-section mt-2">The surfaces a shopper actually touches</h2>
        <p className="h-page-sub">
          Search, discovery, and conversation built on grounded retrieval. Every answer cites its source; every
          recommendation links to a field your merchandising team owns.
        </p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIER_12.map((tile, idx) => (
            <div
              key={tile.to}
              className="fade-in-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <SurfaceTile {...tile} variant="editorial" />
            </div>
          ))}
        </div>
      </section>

      {/* Tier 3+4 surfaces — data */}
      <section className="mx-auto max-w-7xl px-4 mt-16">
        <div className="my-12 flex items-center gap-4">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-sand-300 to-transparent" />
          <span className="eyebrow-alpine">Composite intelligence</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-sand-300 to-transparent" />
        </div>
        <div className="eyebrow-alpine">For the systems behind the shopper</div>
        <h2 className="h-section mt-2">Structured outputs your stack can consume</h2>
        <p className="h-page-sub">
          Schema-constrained generation, typed knowledge graphs, and multi-step composite pipelines your ESP, CDP, and
          loyalty platform can wire to directly.
        </p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIER_34.map((tile, idx) => {
            // Override the Journey tile's static "253 / 12" copy with the
            // SAME live counts the /journey-graph page renders, so the two
            // pages can never disagree on a number a CMO will see.
            const live = tile.to === '/journey-graph'
              ? {
                  desc: journeyTileDesc,
                  metrics: [
                    `${entityCount ?? 190}+ entities`,
                    `${relationCount ?? 108}+ relations`,
                    'auto-extracted',
                  ],
                }
              : null;
            const merged = live ? { ...tile, ...live } : tile;
            return (
              <div
                key={tile.to}
                className="fade-in-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <SurfaceTile {...merged} variant="data" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Architecture */}
      <ArchitectureDiagram />

      {/* How it works — platform claims */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="eyebrow-alpine">How it works</div>
        <h2 className="h-section mt-2">Why this experience is different under the hood</h2>
        <div className="mt-6 grid gap-6 rounded-2xl border border-sand-200 bg-white p-8 md:grid-cols-3">
          <Pillar title="Every recommendation is explainable">
            Every output cites its source. Every CTA links to the field your copywriter edited. No black-box
            recommender.
          </Pillar>
          <Pillar title="Content is the optimization surface">
            Your content and merchandising teams improve the AI every day. The next launch is a copy edit, not a
            sprint.
          </Pillar>
          <Pillar title="One platform, not five">
            Search, chat, personalization, journey reasoning, winback. Same API. Same KB. Same content team.
          </Pillar>
        </div>
      </section>

      {/* Built on — infra strip */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="flex flex-col gap-3 rounded-xl border border-sand-200 bg-sand-50/60 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="eyebrow">Built on</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip-metric">Residency &middot; {residency.region}</span>
            <span className="chip-metric">BYO-LLM &middot; {PROVIDER_LABELS[byo.active]}</span>
            <span className="chip-rust">Powered by Progress Agentic RAG</span>
          </div>
        </div>
      </section>
    </div>
  );
}

const TIER_12 = [
  {
    to: '/storefront',
    tier: 'Tier 1+2',
    title: 'Storefront',
    desc: 'Hybrid retrieval. AI summary up top, field-engineered product cards below.',
    icon: SearchIcon,
    caption: 'Browse',
  },
  {
    to: '/for-you',
    tier: 'Tier 1+2',
    title: 'Picks',
    desc: 'Five personalised sections written by the AI from the customer’s profile.',
    icon: SparkleIcon,
    caption: 'Discover',
  },
  {
    to: '/concierge',
    tier: 'Tier 1+2',
    title: 'Concierge',
    desc: 'Two voices, one chat. Shopper or member, depending on who’s asking.',
    icon: ChatIcon,
    caption: 'Converse',
  },
];

const TIER_34 = [
  {
    to: '/personalize',
    tier: 'Tier 3',
    title: 'Personalize',
    desc: 'Schema-constrained JSON your ESP can consume in three lines.',
    icon: SchemaIcon,
    metrics: ['JSON-validated', '5 sections', 'ESP-ready'],
  },
  {
    to: '/journey-graph',
    tier: 'Tier 4',
    title: 'Journey graph',
    desc: '253 typed entities, 12 canonical relations, all extracted autonomously.',
    icon: GraphIcon,
    metrics: ['253 entities', '12 relations', 'auto-extracted'],
  },
  {
    to: '/abandoned-cart',
    tier: 'Tier 4',
    title: 'Winback',
    desc: 'Composite RAG generates a calibrated abandoned-cart message end-to-end.',
    icon: PipelineIcon,
    metrics: ['4-step pipeline', 'calibrated tone', 'cite-checked'],
  },
];

function BrandPillar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-accent">
      <div className="font-display text-lg text-sand-900">{title}</div>
      <p className="mt-2 text-sm text-sand-700">{children}</p>
    </div>
  );
}

function Pillar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-lg text-alpine-600">{title}</div>
      <p className="mt-2 text-sm text-sand-700">{children}</p>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-lg ring-1 ring-sand-200">
      <svg viewBox="0 0 600 420" className="block w-full h-auto" aria-hidden="true">
        <defs>
          {/* Deep dusk sky behind the aurora */}
          <linearGradient id="aurora-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#0f3a4f" />
            <stop offset="0.55" stopColor="#1f5d75" />
            <stop offset="1" stopColor="#f3d3b4" />
          </linearGradient>
          {/* Aurora light wash — green/teal */}
          <linearGradient id="aurora-wash-a" x1="0" x2="1" y1="0" y2="0.4">
            <stop offset="0" stopColor="#7fe3c4" stopOpacity="0" />
            <stop offset="0.3" stopColor="#7fe3c4" stopOpacity="0.55" />
            <stop offset="0.7" stopColor="#3aa0c0" stopOpacity="0.5" />
            <stop offset="1" stopColor="#3aa0c0" stopOpacity="0" />
          </linearGradient>
          {/* Aurora light wash — magenta/rust */}
          <linearGradient id="aurora-wash-b" x1="0" x2="1" y1="0" y2="0.6">
            <stop offset="0" stopColor="#c45a2c" stopOpacity="0" />
            <stop offset="0.4" stopColor="#c45a2c" stopOpacity="0.4" />
            <stop offset="0.8" stopColor="#7a3a8a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#7a3a8a" stopOpacity="0" />
          </linearGradient>
          {/* Horizon haze */}
          <linearGradient id="aurora-haze" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fef3e7" stopOpacity="0" />
            <stop offset="1" stopColor="#fef3e7" stopOpacity="0.7" />
          </linearGradient>
          {/* Grain via feTurbulence */}
          <filter id="aurora-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.96  0 0 0 0 0.92  0 0 0 0 0.84  0 0 0 0.22 0"
            />
          </filter>
        </defs>

        <rect width="600" height="420" fill="url(#aurora-sky)" />

        {/* Aurora curtains */}
        <g style={{ mixBlendMode: 'screen' }}>
          <path
            d="M-20 60 C 120 20, 260 140, 380 80 S 620 60, 640 100 L 640 200 C 520 240, 380 160, 240 220 S 60 240, -20 220 Z"
            fill="url(#aurora-wash-a)"
            opacity="0.85"
          />
          <path
            d="M-20 110 C 140 80, 280 200, 420 140 S 620 130, 640 170 L 640 250 C 500 290, 360 210, 220 270 S 40 290, -20 260 Z"
            fill="url(#aurora-wash-b)"
            opacity="0.8"
          />
        </g>

        {/* Star specks */}
        <g fill="#fef3e7" opacity="0.7">
          <circle cx="80" cy="50" r="0.9" />
          <circle cx="150" cy="30" r="0.7" />
          <circle cx="240" cy="60" r="0.6" />
          <circle cx="330" cy="40" r="0.8" />
          <circle cx="430" cy="70" r="0.7" />
          <circle cx="520" cy="40" r="0.9" />
          <circle cx="560" cy="90" r="0.6" />
          {/* additional snow / star dots scattered across the upper sky */}
          <circle cx="110" cy="80" r="0.5" />
          <circle cx="200" cy="18" r="0.6" />
          <circle cx="290" cy="95" r="0.55" />
          <circle cx="380" cy="22" r="0.7" />
          <circle cx="475" cy="100" r="0.55" />
          <circle cx="500" cy="65" r="0.5" />
          <circle cx="585" cy="30" r="0.6" />
        </g>

        {/* Sun-flare rings — concentric, rust-tinted, behind the aurora */}
        <g style={{ mixBlendMode: 'screen' }}>
          <circle cx="470" cy="170" r="46" fill="none" stroke="#df7a4a" strokeWidth="0.7" opacity="0.18" />
          <circle cx="470" cy="170" r="26" fill="none" stroke="#df7a4a" strokeWidth="0.6" opacity="0.15" />
        </g>

        {/* Horizon haze */}
        <rect x="0" y="220" width="600" height="120" fill="url(#aurora-haze)" />

        {/* Low-poly mountain silhouette — back */}
        <path
          d="M0 320 L 90 220 L 170 290 L 250 200 L 340 270 L 420 220 L 510 280 L 600 240 L 600 420 L 0 420 Z"
          fill="#1f3d4d"
          opacity="0.7"
        />
        {/* Low-poly mountain silhouette — mid */}
        <path
          d="M0 360 L 70 290 L 160 350 L 240 270 L 330 330 L 420 280 L 520 340 L 600 310 L 600 420 L 0 420 Z"
          fill="#142a36"
          opacity="0.85"
        />
        {/* Low-poly mountain silhouette — front, alpine-700 */}
        <path
          d="M0 400 L 110 330 L 200 380 L 300 310 L 410 360 L 510 330 L 600 380 L 600 420 L 0 420 Z"
          fill="#286b88"
        />

        {/* Tiny hiker silhouette atop the foreground ridge */}
        <g fill="#0f3a4f" transform="translate(298 304)">
          <circle cx="0" cy="-3" r="1.4" />
          <path d="M-1.4 -1.6 L 1.4 -1.6 L 1.8 3 L -1.8 3 Z" />
          <line x1="-1.6" y1="3" x2="-2.6" y2="6.5" stroke="#0f3a4f" strokeWidth="0.8" />
          <line x1="1.6"  y1="3" x2="2.6"  y2="6.5" stroke="#0f3a4f" strokeWidth="0.8" />
          <line x1="2"    y1="-0.5" x2="5"  y2="2"  stroke="#0f3a4f" strokeWidth="0.7" />
          <line x1="5"    y1="-1"   x2="5"  y2="6"  stroke="#0f3a4f" strokeWidth="0.6" />
        </g>

        {/* Grain overlay */}
        <rect width="600" height="420" filter="url(#aurora-grain)" opacity="0.5" />
      </svg>
    </div>
  );
}
