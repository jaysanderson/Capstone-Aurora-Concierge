import { Link } from 'react-router-dom';
import type { ComponentType, SVGProps } from 'react';

export type SurfaceTileVariant = 'editorial' | 'data';

export interface SurfaceTileProps {
  to: string;
  tier: string;
  title: string;
  desc: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  variant?: SurfaceTileVariant;
  /** Optional small metric chips shown on data-variant tiles. */
  metrics?: string[];
  /** Optional editorial caption strip shown on editorial-variant tiles. */
  caption?: string;
  /** When false, the tier label is hidden (CMOs don't speak Tier). */
  showTier?: boolean;
}

export function SurfaceTile({
  to,
  tier,
  title,
  desc,
  icon: Icon,
  variant = 'editorial',
  metrics,
  caption,
  showTier = false,
}: SurfaceTileProps) {
  if (variant === 'data') {
    return (
      <Link
        to={to}
        className="group flex flex-col gap-4 rounded-2xl border border-sand-200 bg-gradient-to-br from-white to-sand-50 p-5 hover:border-alpine-400 hover:-translate-y-0.5 hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-alpine-200 bg-alpine-50 px-2.5 text-alpine-700 group-hover:border-alpine-400 transition">
            <Icon className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">schema</span>
          </div>
          {showTier && <span className="eyebrow">{tier}</span>}
        </div>
        <div>
          <h3 className="font-display text-xl text-sand-900">{title}</h3>
          <p className="mt-1 text-sm text-sand-700">{desc}</p>
        </div>
        {metrics && metrics.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 border-t border-dashed border-sand-200 pt-3">
            {metrics.map((m) => (
              <span key={m} className="chip-metric">
                {m}
              </span>
            ))}
          </div>
        )}
      </Link>
    );
  }

  // editorial variant — taller, image-led feel for customer-facing surfaces
  return (
    <Link
      to={to}
      className="group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white hover:border-alpine-400 hover:-translate-y-0.5 hover:shadow-lg transition-all"
    >
      <EditorialHeader icon={Icon} caption={caption} title={title} />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-sand-900">{title}</h3>
          {showTier && <span className="eyebrow">{tier}</span>}
        </div>
        <p className="text-sm text-sand-700">{desc}</p>
      </div>
    </Link>
  );
}

function EditorialHeader({
  icon: Icon,
  caption,
  title,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  caption?: string;
  title: string;
}) {
  return (
    <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-alpine-700 via-alpine-500 to-rust-300">
      {/* Topographic contour wash */}
      <svg
        viewBox="0 0 400 160"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full opacity-30"
        aria-hidden="true"
      >
        <g fill="none" stroke="#fef3e7" strokeWidth="0.6">
          <path d="M0 130 Q 100 90 200 110 T 400 95" />
          <path d="M0 115 Q 100 70 200 95 T 400 80" />
          <path d="M0 100 Q 100 55 200 80 T 400 65" />
          <path d="M0 85 Q 100 40 200 65 T 400 50" />
          <path d="M0 70 Q 100 25 200 50 T 400 35" />
        </g>
      </svg>
      {/* Grain */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />
      <div className="relative flex h-full items-end justify-between p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/85 text-alpine-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        {caption && (
          <span className="rounded-full bg-sand-50/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-alpine-700">
            {caption}
          </span>
        )}
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
