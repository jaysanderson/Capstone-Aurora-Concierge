import { Link } from 'react-router-dom';
import { useResidency } from '../context/ResidencyContext';
import { useByoLlm, PROVIDER_LABELS } from '../context/ByoLlmContext';

export function Landing() {
  const residency = useResidency();
  const byo = useByoLlm();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-alpine">Residency · {residency.region}</span>
        <span className="badge badge-sand">BYO-LLM · {PROVIDER_LABELS[byo.active]}</span>
      </div>
      <h1 className="mt-6 font-display text-5xl leading-tight text-sand-900 md:text-6xl">
        Built for the worst weather. <span className="text-alpine-500">Trail-tested by experts.</span>
      </h1>
      <p className="mt-6 max-w-3xl text-lg text-sand-700">
        Aurora Concierge is the digital-experience platform Aurora Outfitters runs on top of Progress Agentic RAG.
        Conversational discovery, two-voice concierge, structured personalization, customer-journey reasoning, and
        abandoned-cart intelligence — all behind one API key, all from one corpus of product, content, and customer data.
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SURFACES.map((s) => (
          <Link key={s.to} to={s.to} className="card hover:border-alpine-400">
            <div className="text-xs uppercase tracking-wider text-rust-500">{s.tier}</div>
            <div className="mt-2 font-display text-xl text-sand-900">{s.title}</div>
            <p className="mt-2 text-sm text-sand-700">{s.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-16 grid gap-6 rounded-2xl border border-sand-200 bg-white p-8 md:grid-cols-3">
        <Pillar title="Every recommendation is explainable">
          Every output cites its source. Every CTA links to the field your copywriter edited. No black-box recommender.
        </Pillar>
        <Pillar title="Content is the optimization surface">
          Your content and merchandising teams improve the AI every day. The next launch is a copy edit, not a sprint.
        </Pillar>
        <Pillar title="One platform, not five">
          Search, chat, personalization, journey reasoning, win-back. Same API. Same KB. Same content team.
        </Pillar>
      </div>
    </div>
  );
}

const SURFACES = [
  { tier: 'Tier 1 + 2', title: 'Storefront', description: 'Hybrid product discovery with CTAs picked from custom fields.', to: '/storefront' },
  { tier: 'Tier 1 · /find', title: 'For You', description: 'Persona-driven personalization grid. No query box — derived from segment, tier, region.', to: '/for-you' },
  { tier: 'Tier 2', title: 'Concierge', description: 'Two-voice floating chat. Shopper vs Trail Club Member. Multilingual.', to: '/concierge' },
  { tier: 'Tier 3', title: 'Personalize', description: 'Three schema-constrained workflows — Adventure Plan, Loyalty, Cross-Sell.', to: '/personalize' },
  { tier: 'Tier 4', title: 'Journey Graph', description: 'Customer-journey reasoning over products, ambassadors, destinations, content.', to: '/journey-graph' },
  { tier: 'Tier 4 · Composite', title: 'Abandoned Cart', description: 'Four-step composite-RAG pipeline that drops into Klaviyo / Braze in three lines.', to: '/abandoned-cart' },
];

function Pillar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-lg text-alpine-600">{title}</div>
      <p className="mt-2 text-sm text-sand-700">{children}</p>
    </div>
  );
}
