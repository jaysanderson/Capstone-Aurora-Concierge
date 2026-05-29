import { NavLink } from 'react-router-dom';
import { useByoLlm, PROVIDER_LABELS } from '../context/ByoLlmContext';
import { useResidency } from '../context/ResidencyContext';
import { useLanguage } from '../context/LanguageContext';
import { usePersona, PERSONAS } from '../context/PersonaContext';

const NAV = [
  { to: '/', label: 'Aurora' },
  { to: '/storefront', label: 'Storefront' },
  { to: '/concierge', label: 'Concierge' },
  { to: '/personalize', label: 'Personalize' },
  { to: '/journey-graph', label: 'Journey' },
  { to: '/abandoned-cart', label: 'Win-back' },
];

export function Header() {
  const byo = useByoLlm();
  const residency = useResidency();
  const language = useLanguage();
  const persona = usePersona();

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-alpine-500 text-white font-display text-base">A</div>
          <div className="leading-tight">
            <div className="font-display text-base text-sand-900">Aurora Outfitters</div>
            <div className="text-[10px] uppercase tracking-wider text-sand-600">Trail-tested · Repairable for Life</div>
          </div>
        </NavLink>

        <nav className="ml-6 hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-alpine-500 text-white' : 'text-sand-700 hover:bg-sand-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={persona.active.id}
            onChange={(e) => persona.setActive(e.target.value as 'sara' | 'mara')}
            className="input !w-auto !py-1 text-xs"
            title="Persona"
          >
            {Object.values(PERSONAS).map((p) => (
              <option key={p.id} value={p.id}>{p.displayName}</option>
            ))}
          </select>

          <select
            value={language.active}
            onChange={(e) => language.set(e.target.value)}
            className="input !w-auto !py-1 text-xs"
            title="Language"
          >
            {language.available.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>

          <button
            type="button"
            onClick={() => residency.set(residency.region === 'EU' ? 'US' : 'EU')}
            className="badge badge-alpine"
            title="Residency"
          >
            {residency.region}
          </button>

          <select
            value={byo.active}
            onChange={(e) => byo.set(e.target.value as typeof byo.active)}
            className="input !w-auto !py-1 text-xs"
            title="BYO-LLM"
          >
            {byo.available.map((p) => (
              <option key={p} value={p}>BYO · {PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
