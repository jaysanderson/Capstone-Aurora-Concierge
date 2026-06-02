import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  FOUNDATIONS_GITHUB_BASE,
  featuresForRoute,
  type PageFeature,
} from '../lib/pageFeatures';

const FRAMEWORK_ROOT_URL =
  'https://github.com/jaysanderson/ARAG-Partner-Enablement-Framework';

export function LearnHowThisWorks() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const map = featuresForRoute(pathname);

  // Close panel on route change so the next page opens fresh.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Lock body scroll while panel is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!map) return null;

  const panel = (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-sand-900/30 backdrop-blur-[1px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Slide-up drawer (anchored bottom-left) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-panel-title"
        className={`fixed bottom-4 left-4 z-50 flex w-[420px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-sand-200 bg-white shadow-xl transition-all duration-300 ease-out ${
          open
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        style={{ height: 'min(90vh, 760px)' }}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-sand-200 px-5 py-4">
          <div className="min-w-0">
            <div className="eyebrow-alpine flex items-center gap-1.5">
              <span className="ai-dot" />
              Learn how this works
            </div>
            <h2
              id="learn-panel-title"
              className="card-title mt-1 truncate"
              title={map.title}
            >
              {map.title}
            </h2>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-sand-500">
              Aurora Concierge × Developer Foundations
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close learn panel"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-sand-200 text-sand-600 transition-colors hover:border-alpine-400 hover:bg-alpine-50 hover:text-alpine-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-300"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm leading-relaxed text-sand-700">
            {map.one_line_summary}
          </p>

          <ul className="mt-5 flex flex-col gap-3">
            {map.features.map((feature) => (
              <li key={feature.primitive_id}>
                <FeatureCard feature={feature} />
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <footer className="border-t border-sand-200 px-5 py-3 text-[11px] leading-relaxed text-sand-600">
          These mappings link to the{' '}
          <a
            href={FRAMEWORK_ROOT_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-alpine-600 underline decoration-alpine-200 underline-offset-2 hover:decoration-alpine-500"
          >
            Developer Foundations
          </a>{' '}
          course on GitHub.
        </footer>
      </aside>
    </>
  );

  return (
    <>
      {/* Floating trigger button — bottom-LEFT to avoid the Concierge FAB.
          On mobile (< sm), collapses to a compact 44px icon-only circle so
          it doesn't crowd the Concierge avatar in the bottom-right. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Learn how this page works"
        aria-expanded={open}
        className="fixed bottom-6 left-6 z-30 inline-flex items-center gap-2 rounded-full border border-alpine-300 bg-sand-50 p-3 sm:px-4 sm:py-2.5 text-sm font-medium text-alpine-700 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-alpine-500 hover:bg-white hover:shadow-md active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-300 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
      >
        <BookIcon />
        <span className="hidden sm:inline">Learn how this works</span>
      </button>

      {typeof document !== 'undefined'
        ? createPortal(panel, document.body)
        : null}
    </>
  );
}

function FeatureCard({ feature }: { feature: PageFeature }) {
  return (
    <div className="card p-4">
      <div className="h-section text-base text-alpine-700" style={{ fontSize: '0.95rem' }}>
        {feature.label}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-sand-700">
        {feature.summary}
      </p>
      {feature.covered_in.length > 0 ? (
        <div className="mt-3">
          <div className="eyebrow mb-1.5 text-sand-500">Taught in</div>
          <div className="flex flex-wrap gap-1.5">
            {feature.covered_in.map((build) => (
              <a
                key={build.build_slug}
                href={`${FOUNDATIONS_GITHUB_BASE}/${build.build_slug}`}
                target="_blank"
                rel="noreferrer noopener"
                className="chip-alpine transition-colors hover:bg-alpine-100"
                title={`Open Build ${build.build_number} on GitHub`}
              >
                Build {build.build_number} · {build.build_title}
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 text-[11px] italic text-sand-500">
          Capstone-only refinement — not a separate Foundations build.
        </div>
      )}
    </div>
  );
}

function BookIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
