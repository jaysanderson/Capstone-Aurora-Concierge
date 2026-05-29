import { usePersona, PERSONAS } from '../context/PersonaContext';
import { useLanguage } from '../context/LanguageContext';

export function Concierge() {
  const persona = usePersona();
  const language = useLanguage();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl text-sand-900">Two-voice concierge</h1>
        <p className="mt-1 text-sm text-sand-700">
          The floating chat bottom-right is the concierge. It speaks one of two voices depending on the active persona,
          and switches language based on the global selector.
        </p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {Object.values(PERSONAS).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => persona.setActive(p.id)}
            className={`card text-left transition-colors ${
              persona.active.id === p.id ? 'border-alpine-500 bg-alpine-50' : 'hover:border-alpine-300'
            }`}
          >
            <div className="text-xs uppercase tracking-wider text-rust-500">
              {p.voice === 'shopper' ? 'Shopper voice · 3 sentences + CTA' : 'Member voice · detailed + multi-source'}
            </div>
            <div className="mt-2 font-display text-xl text-sand-900">{p.displayName}</div>
            <p className="mt-2 text-sm text-sand-700">
              {p.voice === 'shopper'
                ? 'Concise. One call-to-action picked from the most-relevant product\'s callToAction field. Then stop.'
                : 'Detailed answer with multi-source citations. Member-exclusive recommendations where they fit. Ambassador picks surfaced.'}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-8 card">
        <div className="text-xs uppercase tracking-wider text-sand-500">Active configuration</div>
        <ul className="mt-2 space-y-1 text-sm text-sand-800">
          <li><strong>Persona:</strong> {persona.active.displayName}</li>
          <li><strong>Loyalty tier:</strong> {persona.active.loyaltyTier}</li>
          <li><strong>Region:</strong> {persona.active.region}</li>
          <li><strong>Language:</strong> {language.active}</li>
          <li><strong>Voice:</strong> {persona.active.voice}</li>
        </ul>
      </div>

      <div className="mt-8 card border-rust-400 bg-rust-50">
        <h2 className="font-display text-xl text-rust-700">Try it</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-sand-800">
          <li>Open the floating chat (bottom-right).</li>
          <li>Ask: <em>"What jacket do I need for Patagonia in November?"</em></li>
          <li>Toggle persona Sara → Mara. Same question. Watch the answer flip from 3-sentence + CTA to detailed expert voice.</li>
          <li>Toggle language English → Spanish. Same question. Watch the answer flip language.</li>
        </ol>
      </div>
    </div>
  );
}
