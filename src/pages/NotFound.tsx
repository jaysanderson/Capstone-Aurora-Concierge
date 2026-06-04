import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Branded 404. Unknown routes used to fall through to <Landing />, which hid
 * broken links and confused anyone deep-linking a stale URL. This gives a real
 * "off the trail" state in the Aurora design vocabulary — Fraunces ordinal,
 * ridgeline motif, one primary way back. Sets document.title so the tab and
 * any share scrape reflect the error rather than the home page.
 */
export function NotFound() {
  const { pathname } = useLocation();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Off the trail (404) · Aurora Concierge';
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <section className="container-editorial">
      <div className="mx-auto max-w-2xl">
        <span className="eyebrow">Error 404</span>

        <div className="mt-3 flex items-baseline gap-4">
          <span className="ordinal-display" style={{ fontSize: '5rem' }} aria-hidden="true">
            404
          </span>
        </div>

        <h1 className="h-page mt-2">
          You&apos;ve wandered <span className="h-accent-italic">off the trail</span>.
        </h1>

        <p className="h-page-sub">
          There&apos;s no page at{' '}
          <code className="rounded bg-sand-100 px-1.5 py-0.5 font-mono text-[13px] text-sand-800">
            {pathname}
          </code>
          . It may have moved, or the link is out of date. Head back to base camp
          and pick a surface from there.
        </p>

        {/* ridgeline motif — same horizon language as the card headers */}
        <svg
          viewBox="0 0 480 96"
          preserveAspectRatio="none"
          className="mt-10 h-24 w-full text-alpine-700"
          aria-hidden="true"
        >
          <path
            d="M0 70 L60 44 L120 60 L200 30 L280 56 L360 38 L440 58 L480 46 L480 96 L0 96 Z"
            fill="currentColor"
            fillOpacity="0.06"
          />
          <path
            d="M0 70 L60 44 L120 60 L200 30 L280 56 L360 38 L440 58 L480 46"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.4"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link to="/" className="btn-primary">
            Back to base camp
          </Link>
          <Link to="/storefront" className="btn-ghost">
            Browse the storefront
          </Link>
        </div>
      </div>
    </section>
  );
}
