import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import AuroraLogo from './AuroraLogo';
import {
  PersonaChip,
  LanguageOptions,
  ResidencyOptions,
  ByoLlmOptions,
} from './NavControls';

const NAV = [
  { to: '/', label: 'Aurora' },
  { to: '/storefront', label: 'Storefront' },
  { to: '/for-you', label: 'Picks' },
  { to: '/concierge', label: 'Concierge' },
  { to: '/personalize', label: 'Personalize' },
  { to: '/journey-graph', label: 'Journey' },
  { to: '/abandoned-cart', label: 'Winback' },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5 text-sand-700"
    >
      {open ? (
        <path
          d="M5 5l10 10M15 5L5 15"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M3 6h14M3 10h14M3 14h14"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function GearIcon() {
  // Cog with chunky outer teeth — at 16px the previous radial-spokes rendering
  // read as a sun icon (it implied a theme toggle that doesn't exist). This
  // version uses a closed gear silhouette so the affordance reads as Settings.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4 text-sand-700"
    >
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close menus on route change.
  useEffect(() => {
    setMobileOpen(false);
    setSettingsOpen(false);
  }, [location.pathname]);

  // Close the settings popover when clicking outside.
  useEffect(() => {
    if (!settingsOpen) return;
    function onDown(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [settingsOpen]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setSettingsOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Skip-to-content link for keyboard + screen reader users. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-alpine-500 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-300"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <NavLink
            to="/"
            className="flex-shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-400"
            aria-label="Aurora Outfitters, home"
          >
            <AuroraLogo className="h-8 w-auto" />
          </NavLink>

          {/* Primary nav — desktop. */}
          <nav
            aria-label="Primary"
            className="ml-6 hidden flex-1 items-center gap-1 lg:flex"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-400 ${
                    isActive
                      ? 'bg-alpine-500 text-white'
                      : 'text-sand-700 hover:bg-sand-100 hover:text-alpine-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Persona stays inline — it's the primary demo selector. */}
            <div className="hidden sm:block">
              <PersonaChip />
            </div>

            {/* Settings gear consolidates Language / Region / Model. */}
            <div ref={settingsRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={settingsOpen}
                aria-label="Settings: language, region, AI model"
                className="flex items-center gap-1.5 rounded-full border border-sand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-sand-700 transition hover:border-alpine-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-400 focus-visible:ring-offset-1 focus-visible:ring-offset-sand-50"
              >
                <GearIcon />
                <span className="hidden md:inline">Settings</span>
              </button>
              {settingsOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-sand-200 bg-white p-4 shadow-xl"
                >
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="eyebrow-alpine">Language</span>
                      <div className="mt-2">
                        <LanguageOptions />
                      </div>
                    </div>
                    <span className="h-px bg-sand-200" aria-hidden="true" />
                    <div>
                      <span className="eyebrow-alpine">Data residency</span>
                      <div className="mt-2">
                        <ResidencyOptions />
                      </div>
                    </div>
                    <span className="h-px bg-sand-200" aria-hidden="true" />
                    <div>
                      <span className="eyebrow-alpine">AI model</span>
                      <div className="mt-2">
                        <ByoLlmOptions />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hamburger — visible below lg. */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-sand-200 bg-white transition hover:border-alpine-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-400 lg:hidden"
            >
              <MenuIcon open={mobileOpen} />
            </button>
          </div>
        </div>

        {/* Mobile sheet — collapses nav + settings into a single column. */}
        {mobileOpen && (
          <div
            id="mobile-menu"
            role="menu"
            aria-label="Mobile primary navigation"
            className="border-t border-sand-200 bg-sand-50/95 px-4 py-4 lg:hidden"
          >
            <nav aria-label="Primary mobile" className="flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-400 ${
                      isActive
                        ? 'bg-alpine-500 text-white'
                        : 'text-sand-700 hover:bg-sand-100 hover:text-alpine-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-4 border-t border-sand-200 pt-4">
              <div className="eyebrow-alpine mb-2">Persona</div>
              <PersonaChip />
            </div>
            <div className="mt-4 flex flex-col gap-4 border-t border-sand-200 pt-4">
              <div>
                <span className="eyebrow-alpine">Language</span>
                <div className="mt-2">
                  <LanguageOptions />
                </div>
              </div>
              <div>
                <span className="eyebrow-alpine">Data residency</span>
                <div className="mt-2">
                  <ResidencyOptions />
                </div>
              </div>
              <div>
                <span className="eyebrow-alpine">AI model</span>
                <div className="mt-2">
                  <ByoLlmOptions />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
