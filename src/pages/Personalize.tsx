import { useState } from 'react';
import { askForJson, type AnswerJsonSchema } from '../lib/askForJson';

type WorkflowId = 'adventure' | 'loyalty' | 'cross-sell';

const ADVENTURE_SCHEMA: AnswerJsonSchema = {
  name: 'adventure_plan',
  description: 'Trip plan combining packing list, daily itinerary, gear, ambassador tips, safety notes.',
  parameters: {
    type: 'object',
    properties: {
      trip_overview: { type: 'string' },
      packing_list: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            product_recommendation: { type: 'string' },
            source_url: { type: 'string' },
            why: { type: 'string' },
          },
          required: ['category', 'product_recommendation', 'source_url', 'why'],
        },
      },
      daily_plan: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'number' },
            distance_km: { type: 'number' },
            elevation_m: { type: 'number' },
            activity: { type: 'string' },
            gear_focus: { type: 'string' },
          },
          required: ['day', 'distance_km', 'elevation_m', 'activity', 'gear_focus'],
        },
      },
      ambassador_tips: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ambassador_name: { type: 'string' },
            tip: { type: 'string' },
            source_url: { type: 'string' },
          },
          required: ['ambassador_name', 'tip', 'source_url'],
        },
      },
      safety_notes: { type: 'array', items: { type: 'string' } },
    },
    required: ['trip_overview', 'packing_list', 'daily_plan', 'ambassador_tips', 'safety_notes'],
  },
};

const LOYALTY_SCHEMA: AnswerJsonSchema = {
  name: 'loyalty_plan',
  description: 'Trail Club member next-best-actions.',
  parameters: {
    type: 'object',
    properties: {
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, date: { type: 'string' }, region: { type: 'string' }, why_this_member: { type: 'string' } },
          required: ['name', 'date', 'region', 'why_this_member'],
        },
      },
      exclusive_products: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, tier_required: { type: 'string' }, why: { type: 'string' } },
          required: ['name', 'tier_required', 'why'],
        },
      },
      content_to_deliver: {
        type: 'array',
        items: {
          type: 'object',
          properties: { title: { type: 'string' }, format: { type: 'string' }, ambassador: { type: 'string' }, source_url: { type: 'string' } },
          required: ['title', 'format', 'ambassador', 'source_url'],
        },
      },
      partner_offers: {
        type: 'array',
        items: {
          type: 'object',
          properties: { partner_name: { type: 'string' }, offer: { type: 'string' }, expiry: { type: 'string' } },
          required: ['partner_name', 'offer', 'expiry'],
        },
      },
      points_optimization: {
        type: 'object',
        properties: { current_balance: { type: 'number' }, suggested_actions: { type: 'array', items: { type: 'string' } } },
        required: ['current_balance', 'suggested_actions'],
      },
    },
    required: ['events', 'exclusive_products', 'content_to_deliver', 'partner_offers', 'points_optimization'],
  },
};

const CROSS_SELL_SCHEMA: AnswerJsonSchema = {
  name: 'comparison_cross_sell',
  description: 'Product comparison table + journey-graph cross-sell.',
  parameters: {
    type: 'object',
    properties: {
      product: {
        type: 'object',
        properties: { name: { type: 'string' }, summary: { type: 'string' }, price_usd: { type: 'number' }, brand_pillars: { type: 'array', items: { type: 'string' } } },
        required: ['name', 'summary', 'price_usd', 'brand_pillars'],
      },
      comparison_table: {
        type: 'array',
        items: {
          type: 'object',
          properties: { attribute: { type: 'string' }, this_product: { type: 'string' }, alternative_1: { type: 'string' }, alternative_2: { type: 'string' } },
          required: ['attribute', 'this_product', 'alternative_1', 'alternative_2'],
        },
      },
      pairs_with: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, why_this_pairing: { type: 'string' }, source_url: { type: 'string' } },
          required: ['name', 'why_this_pairing', 'source_url'],
        },
      },
      ambassador_tips: {
        type: 'array',
        items: {
          type: 'object',
          properties: { ambassador_name: { type: 'string' }, tip: { type: 'string' }, source_url: { type: 'string' } },
          required: ['ambassador_name', 'tip', 'source_url'],
        },
      },
      segment_positioning: {
        type: 'object',
        properties: {
          for_weekend_adventurers: { type: 'string' },
          for_thru_hikers: { type: 'string' },
          for_alpine_pros: { type: 'string' },
        },
        required: ['for_weekend_adventurers', 'for_thru_hikers', 'for_alpine_pros'],
      },
    },
    required: ['product', 'comparison_table', 'pairs_with', 'ambassador_tips', 'segment_positioning'],
  },
};

const DESTINATIONS = ['Tasmania Overland Track', 'Patagonia W Trek', 'Tour du Mont Blanc', 'Annapurna Circuit', 'Yosemite High Sierra'];
const SEGMENTS = ['Weekend Adventurer', 'Thru-Hiker', 'Alpine Pro'];
const TIERS = ['Trail Club Standard', 'Trail Club Plus', 'Trail Club Pro'];
const PRODUCTS = ['Aurora TerraTrek 7', 'Aurora Skyline 45L', 'Aurora Helios', 'Aurora Cumulus 2P', 'Aurora Quill 850', 'Aurora Crag XR'];
const REGIONS = ['NORAM', 'EMEA', 'APAC', 'ANZ'];

export function Personalize() {
  const [active, setActive] = useState<WorkflowId>('adventure');
  const [adventure, setAdventure] = useState({ destination: 'Patagonia W Trek', nights: 6, party_size: 2, experience: 'intermediate', segment: 'Weekend Adventurer', sizing: 'Standard' });
  const [loyalty, setLoyalty] = useState({ segment: 'Thru-Hiker', tier: 'Trail Club Plus', recent_skus: 'Aurora Skyline 45L, Aurora Quill 850', region: 'EMEA' });
  const [crossSell, setCrossSell] = useState({ product: 'Aurora TerraTrek 7', segment: 'Weekend Adventurer' });
  const [output, setOutput] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setOutput(null);
    try {
      if (active === 'adventure') {
        const q = `Generate an adventure plan for ${adventure.destination}, ${adventure.nights} nights, party of ${adventure.party_size}, ${adventure.experience} experience level. The customer is a ${adventure.segment} with ${adventure.sizing} sizing. Use Aurora's product catalog, ambassador-authored content, and trail-guide content. Every gear pick is a deep link.`;
        setOutput(await askForJson({ query: q, schema: ADVENTURE_SCHEMA }));
      } else if (active === 'loyalty') {
        const q = `Generate next-best-actions for a Trail Club ${loyalty.tier} member. Segment: ${loyalty.segment}. Recent purchases: ${loyalty.recent_skus}. Region: ${loyalty.region}. Surface events, member-exclusive products, content to deliver this week, partner offers, and points optimization.`;
        setOutput(await askForJson({ query: q, schema: LOYALTY_SCHEMA }));
      } else {
        const q = `Generate a comparison and cross-sell for ${crossSell.product}, framed for ${crossSell.segment} customers. Traverse the Aurora journey graph to populate the pair-with section. Include ambassador tips from the source content.`;
        setOutput(await askForJson({ query: q, schema: CROSS_SELL_SCHEMA }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl text-sand-900">Personalization workflows</h1>
        <p className="mt-1 text-sm text-sand-700">Three Tier-3 workflows. Schema-constrained generation that drops into Klaviyo / Braze / Iterable in three lines.</p>
      </header>

      <div className="mt-6 inline-flex rounded-full border border-sand-300 bg-white p-1">
        {([
          { id: 'adventure', label: 'Adventure Plan' },
          { id: 'loyalty', label: 'Loyalty Personalization' },
          { id: 'cross-sell', label: 'Cross-Sell & Compare' },
        ] as Array<{ id: WorkflowId; label: string }>).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setActive(t.id); setOutput(null); setError(null); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active === t.id ? 'bg-alpine-500 text-white' : 'text-sand-700 hover:bg-sand-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-alpine-600">Inputs</h2>
          {active === 'adventure' && (
            <div className="mt-4 space-y-3">
              <SelectField label="Destination" value={adventure.destination} options={DESTINATIONS} onChange={(v) => setAdventure({ ...adventure, destination: v })} />
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Nights" value={adventure.nights} onChange={(v) => setAdventure({ ...adventure, nights: v })} />
                <NumField label="Party size" value={adventure.party_size} onChange={(v) => setAdventure({ ...adventure, party_size: v })} />
              </div>
              <SelectField label="Experience" value={adventure.experience} options={['beginner', 'intermediate', 'expert']} onChange={(v) => setAdventure({ ...adventure, experience: v })} />
              <SelectField label="Segment" value={adventure.segment} options={SEGMENTS} onChange={(v) => setAdventure({ ...adventure, segment: v })} />
              <SelectField label="Sizing profile" value={adventure.sizing} options={['Standard', 'Wide Foot', 'Narrow Foot', 'High Arch']} onChange={(v) => setAdventure({ ...adventure, sizing: v })} />
            </div>
          )}
          {active === 'loyalty' && (
            <div className="mt-4 space-y-3">
              <SelectField label="Segment" value={loyalty.segment} options={SEGMENTS} onChange={(v) => setLoyalty({ ...loyalty, segment: v })} />
              <SelectField label="Tier" value={loyalty.tier} options={TIERS} onChange={(v) => setLoyalty({ ...loyalty, tier: v })} />
              <TextField label="Recent purchases (comma-separated)" value={loyalty.recent_skus} onChange={(v) => setLoyalty({ ...loyalty, recent_skus: v })} />
              <SelectField label="Region" value={loyalty.region} options={REGIONS} onChange={(v) => setLoyalty({ ...loyalty, region: v })} />
            </div>
          )}
          {active === 'cross-sell' && (
            <div className="mt-4 space-y-3">
              <SelectField label="Product" value={crossSell.product} options={PRODUCTS} onChange={(v) => setCrossSell({ ...crossSell, product: v })} />
              <SelectField label="Segment" value={crossSell.segment} options={SEGMENTS} onChange={(v) => setCrossSell({ ...crossSell, segment: v })} />
            </div>
          )}
          <button type="button" className="btn-primary mt-6 w-full" onClick={run} disabled={running}>
            {running ? 'Generating…' : 'Generate'}
          </button>
        </div>

        <div className="card overflow-hidden">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-alpine-600">Output</h2>
          {!output && !error && <p className="mt-4 text-sm text-sand-500">Configure inputs and click Generate.</p>}
          {error && <pre className="mt-4 whitespace-pre-wrap text-xs text-rust-600">{error}</pre>}
          {output != null && (
            <pre className="mt-4 max-h-[600px] overflow-auto rounded-md bg-sand-100 p-3 font-mono text-xs text-sand-900">
              {JSON.stringify(output, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-sand-500">{label}</span>
      <select className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-sand-500">{label}</span>
      <input className="input mt-1" type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value || '0', 10))} />
    </label>
  );
}
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-sand-500">{label}</span>
      <input className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
