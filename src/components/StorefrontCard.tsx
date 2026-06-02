import type { SVGProps } from 'react';
import type { ResourceHit } from '../lib/ragClient';
import { sanitizeExcerpt, ctaHrefFor } from '../lib/sanitizeExcerpt';

interface Props {
  resource: ResourceHit;
  eyebrow?: string;
  eyebrowVariant?: 'default' | 'alpine';
  /** Show retrieval score chip + raw match info. Off by default in live mode. */
  devMode?: boolean;
}

/**
 * Card-header illustrations — one per content_type. Locked mapping; this
 * is the visual contract documented in the design vocab.
 *
 *   product           -> boot silhouette on alpine tone
 *   trail_guide       -> contour-line topographic motif (rust)
 *   gear_review       -> star + verified-check motif (amber/rust mix)
 *   ambassador_video  -> headshot + play-glyph (warm rust)
 *   loyalty_benefit   -> ribbon / membership ticket (alpine deep)
 *   brand_story /
 *   brand_pillar      -> ridge-line horizon (sand + alpine)
 *
 * Each illustration is on a soft brand-tone wash, never a generic Tailwind
 * gradient. Header height matches the prior layout (h-24) so other surfaces
 * (ForYou, JourneyGraph) keep their rhythm.
 */
type HeaderTone = {
  bg: string;
  fg: string; // stroke colour for the SVG
  Illustration: (p: SVGProps<SVGSVGElement>) => JSX.Element;
};

const CATEGORY_HEADER: Record<string, HeaderTone> = {
  product: {
    bg: 'bg-gradient-to-br from-alpine-50 to-alpine-100',
    fg: 'text-alpine-700',
    Illustration: BootIllustration,
  },
  trail_guide: {
    bg: 'bg-gradient-to-br from-sand-100 to-rust-50',
    fg: 'text-rust-700',
    Illustration: ContourIllustration,
  },
  gear_review: {
    bg: 'bg-gradient-to-br from-rust-50 to-sand-100',
    fg: 'text-rust-700',
    Illustration: StarIllustration,
  },
  ambassador_video: {
    bg: 'bg-gradient-to-br from-sand-100 to-alpine-50',
    fg: 'text-alpine-700',
    Illustration: AmbassadorIllustration,
  },
  loyalty_benefit: {
    bg: 'bg-gradient-to-br from-alpine-100 to-alpine-50',
    fg: 'text-alpine-700',
    Illustration: RibbonIllustration,
  },
  brand_story: {
    bg: 'bg-gradient-to-br from-sand-100 to-alpine-50',
    fg: 'text-alpine-700',
    Illustration: RidgelineIllustration,
  },
  brand_pillar: {
    bg: 'bg-gradient-to-br from-sand-100 to-alpine-50',
    fg: 'text-alpine-700',
    Illustration: RidgelineIllustration,
  },
};

const FALLBACK_HEADER: HeaderTone = {
  bg: 'bg-gradient-to-br from-sand-100 to-sand-200',
  fg: 'text-sand-700',
  Illustration: RidgelineIllustration,
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  product: 'Product',
  trail_guide: 'Trail guide',
  gear_review: 'Gear review',
  ambassador_video: 'Ambassador story',
  loyalty_benefit: 'Loyalty perk',
  brand_story: 'Brand story',
  brand_pillar: 'Brand pillar',
};

const DEFAULT_CTA: Record<string, string> = {
  product: 'Shop the product',
  trail_guide: 'Read the guide',
  gear_review: 'Read the review',
  ambassador_video: 'Watch the story',
  loyalty_benefit: 'Explore the perk',
  brand_story: 'Read the story',
  brand_pillar: 'Read the story',
};

function scorePhrase(score: number | undefined): string | null {
  if (typeof score !== 'number' || score <= 0.5) return null;
  if (score >= 0.85) return 'Strong match';
  if (score >= 0.7) return 'Good match';
  return 'Possible match';
}

export function StorefrontCard({
  resource,
  eyebrow,
  eyebrowVariant = 'default',
  devMode = false,
}: Props) {
  const display = resource.searchResultDisplay;

  const contentType = resource.classifications?.find(
    (c) => c.labelset === 'content_type',
  )?.label;
  const contentTypeLabel = (contentType && CONTENT_TYPE_LABEL[contentType]) || 'Resource';

  const rawTitle = display?.title ?? resource.title ?? '';
  const strippedTitle = rawTitle.replace(/^#+\s*/, '').trim();
  // Never render a raw KB UUID as the title; fall back to the typed content
  // label or a neutral "Untitled resource" phrase.
  const cleanTitle =
    strippedTitle && !/^[0-9a-f-]{8,}$/i.test(strippedTitle)
      ? strippedTitle
      : contentTypeLabel !== 'Resource'
        ? contentTypeLabel
        : 'Untitled resource';

  const rawDescription = display?.description ?? resource.excerpt;
  // Tighter cap so the description finishes on a sentence inside ~4 lines.
  // sanitizeExcerpt now prefers sentence-boundary truncation over mid-word
  // ellipsis (Issue #1 on /for-you — "the Towers themsel" etc).
  const description = sanitizeExcerpt(rawDescription, 180);

  const ctaHref = ctaHrefFor({
    contentType,
    title: cleanTitle,
    fallbackId: resource.id,
  });

  const cta =
    display?.ctaLabel ??
    resource.callToAction ??
    (contentType && DEFAULT_CTA[contentType]) ??
    'View details';

  const header = (contentType && CATEGORY_HEADER[contentType]) || FALLBACK_HEADER;
  const Illustration = header.Illustration;

  const matchPhrase = scorePhrase(resource.topScore);

  return (
    <article className="card flex flex-col overflow-hidden p-0 hover:border-alpine-400">
      <div className={`relative h-28 w-full overflow-hidden ${header.bg}`}>
        <Illustration
          className={`absolute inset-0 h-full w-full ${header.fg} opacity-90`}
          aria-hidden="true"
        />
        {/* Oversized content-type lockup overlaid on the illustration so the
            header reads as INTENTIONAL design rather than placeholder line
            art. Sits behind the badge chip; mix-blend keeps it tonal. */}
        <div className="pointer-events-none absolute inset-0 flex items-end px-4 pb-2">
          <span
            className={`font-display text-[42px] leading-none tracking-tight ${header.fg} opacity-30`}
          >
            {contentTypeLabel}
          </span>
        </div>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sand-700 backdrop-blur">
          {contentTypeLabel}
        </span>
        {devMode && matchPhrase && (
          <span className="chip-metric absolute right-3 top-3">
            {matchPhrase}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {eyebrow && (
          <span
            className={eyebrowVariant === 'alpine' ? 'eyebrow-alpine' : 'eyebrow'}
          >
            {eyebrow}
          </span>
        )}

        <h3 className="card-title">{cleanTitle}</h3>

        {description && (
          // No line-clamp — sanitizeExcerpt now ends on sentence boundaries
          // up to ~180 chars, so mid-word visual cuts can't happen.
          <p className="card-body">{description}</p>
        )}

        <div className="mt-auto pt-2">
          {/* CTAs render as buttons, not anchors. aurora-outfitters.com is a
              brand-fiction host — clicking through landed a real CMO on a
              browser error page during testing. The button still LOOKS like
              a primary CTA but its onClick is a no-op (a brief toast via
              the title attr) so the demo flow never breaks. The href is
              still computed via ctaHrefFor for any future place that wants
              to wire a copy-link / share affordance. */}
          <button
            type="button"
            title={`Demo CTA — would route to ${ctaHref} in production`}
            onClick={(e) => e.preventDefault()}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-rust-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-rust-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-300"
          >
            <span>{cta}</span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ------------------------- illustrations ------------------------- */

function ChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function BootIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 96"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* boot silhouette right-leaning */}
      <path
        d="M150 22 L150 56 Q150 64 158 64 L208 64 Q216 64 216 56 L216 52 Q216 46 210 44 L188 38 Q178 35 174 28 L172 22 Z"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path d="M150 56 L216 56" strokeOpacity="0.5" />
      <path d="M158 64 L158 72 Q158 76 162 76 L212 76 Q216 76 216 72 L216 64" />
      <path d="M168 30 L172 30" strokeOpacity="0.6" />
      <path d="M168 38 L176 38" strokeOpacity="0.6" />
      {/* repeating contour ground lines */}
      <path d="M0 86 Q40 80 80 86 T160 86 T240 86" strokeOpacity="0.35" />
      <path d="M0 92 Q40 86 80 92 T160 92 T240 92" strokeOpacity="0.25" />
    </svg>
  );
}

function ContourIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 96"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* concentric topographic rings */}
      <path d="M-20 80 Q 60 30 140 80 T 300 80" strokeOpacity="0.45" />
      <path d="M-20 70 Q 60 25 140 70 T 300 70" strokeOpacity="0.4" />
      <path d="M-20 60 Q 60 20 140 60 T 300 60" strokeOpacity="0.35" />
      <path d="M-20 50 Q 60 18 140 50 T 300 50" strokeOpacity="0.3" />
      <path d="M-20 40 Q 60 16 140 40 T 300 40" strokeOpacity="0.25" />
      <path d="M-20 30 Q 60 14 140 30 T 300 30" strokeOpacity="0.2" />
      {/* trail markers */}
      <circle cx="60" cy="58" r="2.5" fill="currentColor" />
      <circle cx="140" cy="50" r="2.5" fill="currentColor" />
      <circle cx="200" cy="62" r="2.5" fill="currentColor" />
    </svg>
  );
}

function StarIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 96"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* 4 stars + check */}
      {[40, 80, 120, 160].map((cx) => (
        <path
          key={cx}
          d={`M${cx} 30 L${cx + 4} 42 L${cx + 16} 44 L${cx + 7} 52 L${cx + 9} 64 L${cx} 58 L${cx - 9} 64 L${cx - 7} 52 L${cx - 16} 44 L${cx - 4} 42 Z`}
          fill="currentColor"
          fillOpacity="0.18"
        />
      ))}
      {/* fifth star outline (uneven rating mood) */}
      <path
        d="M200 30 L204 42 L216 44 L207 52 L209 64 L200 58 L191 64 L193 52 L184 44 L196 42 Z"
        strokeOpacity="0.5"
      />
      {/* verified check ribbon under */}
      <path d="M70 78 L106 78" strokeOpacity="0.5" />
      <path d="M114 76 L120 82 L132 70" strokeWidth="2" />
    </svg>
  );
}

function AmbassadorIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 96"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* portrait bust circle */}
      <circle cx="58" cy="48" r="20" fill="currentColor" fillOpacity="0.1" />
      <circle cx="58" cy="42" r="8" />
      <path d="M40 70 Q58 56 76 70" />
      {/* play glyph */}
      <circle cx="170" cy="48" r="22" strokeOpacity="0.5" />
      <path
        d="M163 38 L183 48 L163 58 Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
      {/* horizon line */}
      <path d="M0 88 L240 88" strokeOpacity="0.3" />
    </svg>
  );
}

function RibbonIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 96"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* membership ticket */}
      <path
        d="M70 26 L170 26 Q176 26 176 32 L176 44 Q170 44 170 50 Q170 56 176 56 L176 64 Q176 70 170 70 L70 70 Q64 70 64 64 L64 56 Q70 56 70 50 Q70 44 64 44 L64 32 Q64 26 70 26 Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path d="M88 40 L152 40" strokeOpacity="0.5" />
      <path d="M88 50 L132 50" strokeOpacity="0.4" />
      <path d="M88 60 L120 60" strokeOpacity="0.3" />
      {/* ribbon ends */}
      <path d="M30 82 L48 70 L50 88 L60 76 L66 88" strokeOpacity="0.4" />
      <path d="M210 82 L192 70 L190 88 L180 76 L174 88" strokeOpacity="0.4" />
    </svg>
  );
}

function RidgelineIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 96"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* layered ridges, back to front */}
      <path
        d="M0 70 L40 50 L70 62 L110 38 L150 58 L190 44 L240 60 L240 96 L0 96 Z"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path
        d="M0 78 L30 64 L60 72 L100 54 L140 70 L180 60 L240 74 L240 96 L0 96 Z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path d="M0 70 L40 50 L70 62 L110 38 L150 58 L190 44 L240 60" strokeOpacity="0.5" />
      {/* sun */}
      <circle cx="180" cy="30" r="8" strokeOpacity="0.6" />
    </svg>
  );
}
