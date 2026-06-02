import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePersona, PERSONAS, type Persona } from '../context/PersonaContext';
import { useLanguage } from '../context/LanguageContext';
import { useByoLlm, PROVIDER_LABELS } from '../context/ByoLlmContext';
import { useResidency } from '../context/ResidencyContext';
import type { ByoLlmProvider } from '../lib/env';

function ChevronDown({ className, open }: { className?: string; open?: boolean }) {
  return (
    <svg
      viewBox="0 0 8 8"
      fill="none"
      aria-hidden="true"
      className={`${className ?? 'h-2 w-2'} transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M1.5 3l2.5 2.5L6.5 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className ?? 'h-3 w-3'}
    >
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1" />
      <path
        d="M1.5 6h9M6 1.5c1.5 2 1.5 7 0 9M6 1.5c-1.5 2-1.5 7 0 9"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function useOutsideClose(ref: React.RefObject<HTMLDivElement>, onClose: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ref, onClose]);
}

function Popover({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, onClose);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className="absolute right-0 z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-sand-200 bg-white py-1 shadow-lg"
    >
      {children}
    </div>
  );
}

const PERSONA_TIER_STYLES: Record<string, string> = {
  Prospect: 'bg-sand-100 text-sand-700',
  'Trail Club Standard': 'bg-alpine-50 text-alpine-700',
  'Trail Club Plus': 'bg-alpine-100 text-alpine-700',
  'Trail Club Pro': 'bg-rust-50 text-rust-500',
};

function personaDotClass(id: Persona) {
  return id === 'mara' ? 'bg-rust-500' : 'bg-alpine-500';
}

export function PersonaChip() {
  const persona = usePersona();
  const [open, setOpen] = useState(false);
  const first = persona.active.displayName.split(' ')[0];
  const tierStyle = PERSONA_TIER_STYLES[persona.active.loyaltyTier] ?? 'bg-sand-100 text-sand-700';
  const shortTier = persona.active.loyaltyTier === 'Prospect' ? 'Prospect' : 'Pro';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Persona: ${first}, ${shortTier}. Change persona.`}
        className="flex items-center gap-2 rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-medium text-alpine-700 transition hover:border-alpine-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-400 focus-visible:ring-offset-1 focus-visible:ring-offset-sand-50"
      >
        <span
          className={`h-2 w-2 rounded-full ${personaDotClass(persona.active.id)}`}
          aria-hidden="true"
        />
        <span>{first}</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tierStyle}`}
        >
          {shortTier}
        </span>
        <ChevronDown className="h-2 w-2 text-sand-600" open={open} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        {Object.values(PERSONAS).map((p) => {
          const rowTier = PERSONA_TIER_STYLES[p.loyaltyTier] ?? 'bg-sand-100 text-sand-700';
          const rowShort = p.loyaltyTier === 'Prospect' ? 'Prospect' : 'Pro';
          const isActive = p.id === persona.active.id;
          return (
            <button
              key={p.id}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              onClick={() => {
                persona.setActive(p.id);
                setOpen(false);
              }}
              className={`flex w-full items-start gap-3 px-3 py-2 text-left text-xs transition hover:bg-sand-50 focus:outline-none focus-visible:bg-sand-100 ${
                isActive ? 'bg-sand-50' : ''
              }`}
            >
              <span
                className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${personaDotClass(p.id)}`}
                aria-hidden="true"
              />
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-sand-900">{p.displayName.split(' ')[0]}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${rowTier}`}
                  >
                    {rowShort}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] text-sand-600">
                  {p.segment} · {p.region}
                </span>
              </span>
            </button>
          );
        })}
      </Popover>
    </div>
  );
}

export function LanguageChip() {
  const language = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${language.active}. Change language.`}
        className="flex items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-medium text-alpine-700 transition hover:border-alpine-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-400 focus-visible:ring-offset-1 focus-visible:ring-offset-sand-50"
      >
        <GlobeGlyph className="h-3 w-3 text-alpine-600" />
        <span className="uppercase">{language.active}</span>
        <ChevronDown className="h-2 w-2 text-sand-600" open={open} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        {language.available.map((code) => {
          const isActive = code === language.active;
          return (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              onClick={() => {
                language.set(code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-sand-50 focus:outline-none focus-visible:bg-sand-100 ${
                isActive ? 'bg-sand-50 font-semibold' : ''
              }`}
            >
              <GlobeGlyph className="h-3 w-3 text-alpine-600" />
              <span className="uppercase tracking-wider">{code}</span>
            </button>
          );
        })}
      </Popover>
    </div>
  );
}

export function ByoLlmChip() {
  const byo = useByoLlm();
  const [open, setOpen] = useState(false);
  const activeLabel = PROVIDER_LABELS[byo.active];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`AI model: ${activeLabel}. Choose a different model provider.`}
        title="Generative model provider"
        className="flex items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-medium text-alpine-700 transition hover:border-alpine-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-400 focus-visible:ring-offset-1 focus-visible:ring-offset-sand-50"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-alpine-500 to-rust-500" aria-hidden="true" />
        <span>{activeLabel}</span>
        <ChevronDown className="h-2 w-2 text-sand-600" open={open} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        <div className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.14em] text-sand-500">
          Generative model
        </div>
        {byo.available.map((p) => {
          const isActive = p === byo.active;
          return (
            <button
              key={p}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              onClick={() => {
                byo.set(p as ByoLlmProvider);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-sand-50 focus:outline-none focus-visible:bg-sand-100 ${
                isActive ? 'bg-sand-50 font-semibold' : ''
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-alpine-500 to-rust-500" aria-hidden="true" />
              <span className="text-sand-900">{PROVIDER_LABELS[p]}</span>
            </button>
          );
        })}
      </Popover>
    </div>
  );
}

export function RegionBadge() {
  const residency = useResidency();
  const next = residency.region === 'EU' ? 'US' : 'EU';
  return (
    <button
      type="button"
      onClick={() => residency.set(next)}
      aria-label={`Data residency: ${residency.region}. Switch to ${next}.`}
      aria-pressed={residency.region === 'EU'}
      title="Data residency"
      className="flex items-center gap-1 rounded-full border border-alpine-300 bg-alpine-50 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-alpine-700 transition hover:border-alpine-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-400 focus-visible:ring-offset-1 focus-visible:ring-offset-sand-50"
    >
      <GlobeGlyph className="h-3 w-3 text-alpine-600" />
      <span>{residency.region}</span>
    </button>
  );
}
