import { useState } from 'react';
import { askForJson, type AnswerJsonSchema } from '../lib/askForJson';
import { PersonaToggle } from '../components/PersonaToggle';
import { LoadingSpinner, ErrorPanel } from '../components/States';

type WorkflowId = 'adventure' | 'loyalty' | 'cross-sell';

/**
 * Schema design note:
 *   We deliberately avoid asking the LLM to invent full source_url strings —
 *   that path produced hallucinated URLs like
 *   `https://aurora.example/product/terratrek-7` when the actual KB callToAction
 *   path is `/p/terratrek-7`. Instead we ask for `citation_resource_id`,
 *   which the model can quote verbatim from retrieved resources, and let the
 *   client rebuild the link deterministically (`/p/{resource_id}`).
 *   The system prompt below reinforces this: copy IDs, do not invent URLs.
 */

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
            citation_resource_id: { type: 'string' },
            why: { type: 'string' },
          },
          required: ['category', 'product_recommendation', 'citation_resource_id', 'why'],
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
            citation_resource_id: { type: 'string' },
          },
          required: ['ambassador_name', 'tip', 'citation_resource_id'],
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
          properties: { title: { type: 'string' }, format: { type: 'string' }, ambassador: { type: 'string' }, citation_resource_id: { type: 'string' } },
          required: ['title', 'format', 'ambassador', 'citation_resource_id'],
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
          properties: { name: { type: 'string' }, why_this_pairing: { type: 'string' }, citation_resource_id: { type: 'string' } },
          required: ['name', 'why_this_pairing', 'citation_resource_id'],
        },
      },
      ambassador_tips: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ambassador_name: { type: 'string' },
            tip: { type: 'string' },
            citation_resource_id: { type: 'string' },
          },
          required: ['ambassador_name', 'tip', 'citation_resource_id'],
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

const SCHEMAS: Record<WorkflowId, AnswerJsonSchema> = {
  adventure: ADVENTURE_SCHEMA,
  loyalty: LOYALTY_SCHEMA,
  'cross-sell': CROSS_SELL_SCHEMA,
};

const SYSTEM_PROMPT =
  'You are filling a strict JSON schema for downstream ESP delivery. ' +
  'Every `citation_resource_id` MUST be the verbatim resource identifier of a ' +
  'document returned by retrieval (e.g. `terratrek-7`, `mara-chen`). ' +
  'Do NOT invent URLs, slugs, hostnames, or paths. If you cannot find a ' +
  'matching retrieved resource for a field, omit that item rather than fabricating one.';

const DESTINATIONS = ['Tasmania Overland Track', 'Patagonia W Trek', 'Tour du Mont Blanc', 'Annapurna Circuit', 'Yosemite High Sierra'];
const SEGMENTS = ['Weekend Adventurer', 'Thru-Hiker', 'Alpine Pro'];
const TIERS = ['Trail Club Standard', 'Trail Club Plus', 'Trail Club Pro'];
const PRODUCTS = ['Aurora TerraTrek 7', 'Aurora Skyline 45L', 'Aurora Helios', 'Aurora Cumulus 2P', 'Aurora Quill 850', 'Aurora Crag XR'];
const REGIONS = ['NORAM', 'EMEA', 'APAC', 'ANZ'];

const TABS = [
  { id: 'adventure', title: 'Adventure Plan', sub: 'Trip itinerary + packing list + ambassador tips' },
  { id: 'loyalty', title: 'Loyalty Personalization', sub: 'Member next-best-actions across content, events, perks' },
  { id: 'cross-sell', title: 'Cross-Sell & Compare', sub: 'Comparison table + pairs-with + segment positioning' },
] as const;

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkleIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" fill="currentColor" />
    </svg>
  );
}

function WarningIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M8 1.5L15 14H1L8 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6.5V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.75" r="0.75" fill="currentColor" />
    </svg>
  );
}

function MailIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.25 4.5L8 9L13.75 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="4" y="4" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 4V3.5C11 2.67 10.33 2 9.5 2H4C3.17 2 2.5 2.67 2.5 3.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function resourceHref(id: unknown): string | null {
  if (typeof id !== 'string' || id.trim().length === 0) return null;
  // Deterministic client-side link reconstruction. KB callToActions resolve to /p/{id}.
  return `/p/${id.trim()}`;
}

function isDev(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('dev');
}

/* ---------- Defensive renderers (FIX 1 + FIX 2) ---------- */

/**
 * FIX 1 — Suppress "$0" pricing. Render em-dash for null / undefined / 0 / NaN / empty-string.
 * The em-dash reads as "value not set in this catalogue", not as "$0 free product".
 */
function fmtPrice(v: unknown): string {
  if (v == null) return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

/**
 * FIX 2 — LLM occasionally returns placeholder strings like "Not enough data to answer this"
 * when retrieval coverage is thin. We catch that family of variants and swap the raw string
 * for a styled empty-state so the demo doesn't read as a literal model failure.
 */
function isInsufficientData(s: unknown): boolean {
  if (typeof s !== 'string') return !s;
  const t = s.toLowerCase().trim();
  if (t.length === 0) return true;
  return /not enough data|insufficient|cannot answer|no data|unable to|n\/a/.test(t);
}

function InsufficientDataNote() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-sand-200 bg-sand-50/60 px-3 py-2.5 text-[12px] text-sand-600">
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 flex-shrink-0 text-sand-500" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <circle cx="8" cy="8" r="6.5" />
        <path d="M5 8h6" strokeLinecap="round" />
      </svg>
      <div>
        <span className="font-semibold text-sand-700">Insufficient graph coverage.</span>{' '}
        Ingest more content tagged for this segment and the positioning resolves.
      </div>
    </div>
  );
}

/* ---------- Cache + age helpers (FIX 4) ---------- */

interface CachedOutput {
  payload: unknown;
  generatedAt: number; // performance.now() at write
  runMs: number;
}
type Outputs = Partial<Record<WorkflowId, CachedOutput>>;

function humanAgo(generatedAt: number): string {
  const elapsedMs = performance.now() - generatedAt;
  if (elapsedMs < 5_000) return 'just now';
  const seconds = Math.round(elapsedMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

async function copyJson(payload: unknown): Promise<void> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  } catch {
    /* ignore — clipboard unavailable */
  }
}

export function Personalize() {
  const [active, setActive] = useState<WorkflowId>('adventure');
  const [adventure, setAdventure] = useState({ destination: 'Patagonia W Trek', nights: 6, party_size: 2, experience: 'intermediate', segment: 'Weekend Adventurer', sizing: 'Standard' });
  const [loyalty, setLoyalty] = useState({ segment: 'Thru-Hiker', tier: 'Trail Club Plus', recent_skus: 'Aurora Skyline 45L, Aurora Quill 850', region: 'EMEA' });
  const [crossSell, setCrossSell] = useState({ product: 'Aurora TerraTrek 7', segment: 'Weekend Adventurer' });
  // FIX 4 — per-tab cache so switching tabs doesn't blow away the previously generated payload.
  const [outputs, setOutputs] = useState<Outputs>({});
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const cached = outputs[active];
  const output = cached?.payload ?? null;
  const currentSchema = SCHEMAS[active];
  const topLevelFieldCount = Object.keys(currentSchema.parameters.properties).length;
  const activeIdx = TABS.findIndex((t) => t.id === active);

  function switchTab(id: WorkflowId) {
    setActive(id);
    setError(null);
    setShowJson(false); // structured view leads on every tab change
  }

  async function run() {
    setRunning(true);
    setError(null);
    // Clear only THIS tab's cached output — other tabs stay pinned.
    setOutputs((prev) => {
      const next = { ...prev };
      delete next[active];
      return next;
    });
    setShowJson(false);
    const startedAt = performance.now();
    try {
      let payload: unknown;
      if (active === 'adventure') {
        const q = `Generate an adventure plan for ${adventure.destination}, ${adventure.nights} nights, party of ${adventure.party_size}, ${adventure.experience} experience level. The customer is a ${adventure.segment} with ${adventure.sizing} sizing. Use Aurora's product catalog, ambassador-authored content, and trail-guide content. Every gear pick must reference a retrieved resource by its citation_resource_id.`;
        payload = await askForJson({ query: q, schema: ADVENTURE_SCHEMA, promptConfig: { system: SYSTEM_PROMPT } });
      } else if (active === 'loyalty') {
        const q = `Generate next-best-actions for a Trail Club ${loyalty.tier} member. Segment: ${loyalty.segment}. Recent purchases: ${loyalty.recent_skus}. Region: ${loyalty.region}. Surface events, member-exclusive products, content to deliver this week, partner offers, and points optimization.`;
        payload = await askForJson({ query: q, schema: LOYALTY_SCHEMA, promptConfig: { system: SYSTEM_PROMPT } });
      } else {
        const q = `Generate a comparison and cross-sell for ${crossSell.product}, framed for ${crossSell.segment} customers. Traverse the Aurora journey graph to populate the pair-with section. Include ambassador tips from the source content.`;
        payload = await askForJson({ query: q, schema: CROSS_SELL_SCHEMA, promptConfig: { system: SYSTEM_PROMPT } });
      }
      const finishedAt = performance.now();
      setOutputs((prev) => ({
        ...prev,
        [active]: { payload, generatedAt: finishedAt, runMs: finishedAt - startedAt },
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow-ai"><span className="ai-dot" /> Schema-constrained generation</div>
          <h1 className="h-page mt-2">Personalization that drops into your ESP.</h1>
          <p className="h-page-sub">Three Tier-3 workflows. The LLM is forced to return validated JSON the shape of which is fixed by code &mdash; three lines wire it into Klaviyo, Braze, or Iterable.</p>
        </div>
        <PersonaToggle />
      </header>

      {/* FIX 3 — sticky workflow step indicator. Header above scrolls away; this stays. */}
      <div className="sticky top-[56px] z-20 -mx-4 mt-8 mb-6 bg-sand-50/85 px-4 pt-4 pb-3 backdrop-blur supports-[backdrop-filter]:bg-sand-50/70">
        <div className="eyebrow mb-2">Workflow &middot; step {activeIdx + 1} of {TABS.length}</div>
        <WorkflowStepper active={active} onChange={switchTab} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="eyebrow">Inputs</div>
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
          <button
            type="button"
            className="btn-primary mt-6 w-full inline-flex items-center justify-center gap-2 py-3"
            onClick={run}
            disabled={running}
          >
            {running ? (
              <>
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Generating structured output...
              </>
            ) : (
              <>
                <SparkleIcon className="h-4 w-4" />
                Generate
              </>
            )}
          </button>
        </div>

        <div className={output != null ? 'card-accent overflow-hidden relative' : 'card overflow-hidden relative'}>
          {/* FIX 4 — pinned cached-output hint above the toolbar. */}
          {output != null && cached && (
            <div className="-mx-5 -mt-5 mb-0 border-b border-alpine-100 bg-alpine-50/30 px-5 py-1.5">
              <span className="eyebrow-alpine">Pinned: {TABS[activeIdx].title} output. Switch tabs without losing it.</span>
            </div>
          )}

          {/* Top toolbar — ESP-ready actions + FIX 5 JSON toggle promoted into the action bar. */}
          {output != null && cached && (
            <div className={`-mx-5 ${cached ? 'mt-0' : '-mt-5'} mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-alpine-100 bg-alpine-50/50 px-5 py-2.5`}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 chip-alpine">
                  <span className="ai-dot" />
                  Schema-enforced &middot; {topLevelFieldCount} top-level fields
                </div>
                <span className="chip-metric">Generated {humanAgo(cached.generatedAt)} &middot; {Math.round(cached.runMs)}ms</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowJson((v) => !v)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    showJson
                      ? 'border-alpine-500 bg-alpine-50 text-alpine-700'
                      : 'border-sand-200 bg-white text-sand-700 hover:border-alpine-300'
                  }`}
                  aria-pressed={showJson}
                >
                  &lt;/&gt; JSON
                </button>
                <button type="button" className="btn-ghost gap-1.5 py-1 text-xs" onClick={() => copyJson(output)}>
                  <CopyIcon className="h-3.5 w-3.5" /> Copy JSON
                </button>
                <button type="button" className="btn-ghost gap-1.5 py-1 text-xs" onClick={() => copyHtmlToClipboard(output, active)}>
                  <MailIcon className="h-3.5 w-3.5" /> Copy as HTML
                </button>
                <button type="button" className="pill-cta py-1 text-xs" onClick={() => sendToKlaviyo(output)}>
                  Send to Klaviyo
                </button>
              </div>
            </div>
          )}

          {!output && (
            <div className="flex items-center justify-between">
              <div className="eyebrow">Output</div>
            </div>
          )}

          {!output && !error && !running && (
            <PersonalizePreGenerate workflow={active} />
          )}

          {running && (
            <div className="mt-6 flex flex-col items-center justify-center py-12 gap-3">
              <LoadingSpinner label="Generating structured output" />
              <p className="text-xs text-sand-500">Calling /ask with answer_json_schema</p>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <ErrorPanel message={error} onRetry={run} />
            </div>
          )}

          {output != null && (
            <div className="fade-in-up max-h-[640px] overflow-y-auto pr-1">
              <StructuredOutput workflow={active} output={output} />
              {/* FIX 5 — structured cards first, raw payload appended below when toggle is on. */}
              {(showJson || isDev()) && (
                <div className="mt-6">
                  <div className="eyebrow">Raw payload</div>
                  <pre className="mt-2 max-h-[400px] overflow-auto rounded-md border border-sand-200 bg-sand-50 p-3 font-mono text-[11px] text-sand-900">
                    {JSON.stringify(output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Workflow stepper ---------- */

function WorkflowStepper({ active, onChange }: { active: WorkflowId; onChange: (id: WorkflowId) => void }) {
  const activeIdx = TABS.findIndex((t) => t.id === active);
  const featured = TABS[activeIdx];
  const others = TABS.filter((t) => t.id !== active);

  return (
    <div className="space-y-3">
      <div className="card-accent flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="eyebrow-ai"><span className="ai-dot" /> Active workflow</div>
          <h2 className="h-section mt-1">{featured.title}</h2>
          <p className="mt-1 text-sm text-sand-700">{featured.sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {others.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className="chip"
              title={t.sub}
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Pre-generate state ---------- */

/**
 * Pre-generate state for the output card. Previously rendered three
 * SkeletonCards above the prompt — testers consistently mistook the
 * shimmering bars for a stuck loading state. This version uses a
 * distinct empty-state treatment (muted dashed panel + sample-output
 * preview chips) so there is no visual ambiguity with the in-flight
 * skeleton that appears during a real run.
 */
function PersonalizePreGenerate({ workflow }: { workflow: WorkflowId }) {
  const heading =
    workflow === 'adventure'
      ? 'Adventure plan'
      : workflow === 'loyalty'
        ? 'Loyalty week'
        : 'Cross-sell brief';
  const previewFields =
    workflow === 'adventure'
      ? ['plan_summary', 'gear_picks', 'training_notes', 'send_window']
      : workflow === 'loyalty'
        ? ['benefit_picks', 'recommended_actions', 'subject_line', 'send_window']
        : ['hero_pairings', 'positioning_note', 'cta_copy', 'send_window'];

  return (
    <div className="mt-4">
      <div className="rounded-2xl border-2 border-dashed border-sand-300 bg-sand-50/60 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-sand-300 bg-white text-alpine-500" aria-hidden="true">
          <SchemaIcon />
        </div>
        <div className="mt-3 text-sm font-medium text-sand-800">
          {heading} — empty state
        </div>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-sand-600">
          Configure the inputs on the left and press <span className="font-semibold text-sand-800">Generate</span>. The validated payload will land here.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {previewFields.map((field) => (
            <span
              key={field}
              className="rounded-full border border-sand-200 bg-white px-2 py-0.5 text-[10px] font-mono text-sand-500"
            >
              {field}
            </span>
          ))}
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-sand-400">
          Output schema preview
        </div>
      </div>
    </div>
  );
}

function SchemaIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16M9 4v16" />
    </svg>
  );
}

/* ---------- Output toolbar helpers (clipboard / outbound) ---------- */

function copyHtmlToClipboard(output: unknown, workflow: WorkflowId) {
  // Minimal ESP-ready HTML — real integration would template per ESP.
  const title = workflow === 'adventure' ? 'Your Aurora trip plan' : workflow === 'loyalty' ? 'Your Trail Club week' : 'Aurora cross-sell brief';
  const html = `<!doctype html><html><body><h1>${title}</h1><pre>${escapeHtml(JSON.stringify(output, null, 2))}</pre></body></html>`;
  try {
    navigator.clipboard?.writeText(html);
  } catch {
    /* swallow */
  }
}

function sendToKlaviyo(_output: unknown) {
  // Demo stub — real integration would POST to /api/klaviyo/profiles
  // or queue an ESP event with the validated payload.
  // Intentionally a no-op surface — CMOs see the affordance is wired up.
  try {
    window.alert('Queued for Klaviyo (demo stub) — payload validated against schema.');
  } catch {
    /* swallow */
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/* ---------- Form fields (token-driven) ---------- */

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="group relative mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="select-form"
        >
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-alpine-600 transition-transform duration-200 group-focus-within:rotate-180" />
      </div>
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  // Type=text + inputMode=numeric so the displayed value is fully controlled
  // by us and matches the canonical number form. With type=number the browser
  // keeps the user's literal text ("05") and the prop ("5") drift apart;
  // here `String(value)` always renders the canonical form, so typing "05"
  // collapses to "5" the moment React commits the new state.
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={String(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          const next = digits === '' ? 0 : parseInt(digits, 10);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className="input-form mt-1.5"
      />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-form mt-1.5"
      />
    </label>
  );
}

/* ---------- Structured output renderers ---------- */

function StructuredOutput({ workflow, output }: { workflow: WorkflowId; output: unknown }) {
  const data = (output ?? {}) as Record<string, unknown>;
  if (workflow === 'adventure') return <AdventurePlanView data={data} />;
  if (workflow === 'loyalty') return <LoyaltyPlanView data={data} />;
  return <CrossSellView data={data} />;
}

interface AnyObj { [k: string]: unknown }

function asArray<T = AnyObj>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function CitationLink({ id }: { id: unknown }) {
  const href = resourceHref(id);
  if (!href) return null;
  return (
    <a href={href} className="mt-2 inline-block text-[11px] text-alpine-600 underline" target="_blank" rel="noreferrer">
      source: {String(id)}
    </a>
  );
}

function CitationInline({ id }: { id: unknown }) {
  const href = resourceHref(id);
  if (!href) return null;
  return (
    <a href={href} className="ml-2 text-alpine-600 underline" target="_blank" rel="noreferrer">
      source: {String(id)}
    </a>
  );
}

function AmbassadorAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-alpine-500 text-[11px] font-semibold text-white">
      {initials}
    </div>
  );
}

function AdventurePlanView({ data }: { data: AnyObj }) {
  const packing = asArray<AnyObj>(data.packing_list);
  const daily = asArray<AnyObj>(data.daily_plan);
  const tips = asArray<AnyObj>(data.ambassador_tips);
  const safety = asArray<string>(data.safety_notes);

  return (
    <div className="space-y-5">
      {typeof data.trip_overview === 'string' && data.trip_overview.length > 0 && (
        <div className="rounded-xl border border-alpine-200 bg-white p-4">
          <div className="eyebrow-ai"><span className="ai-dot" /> Trip overview</div>
          {isInsufficientData(data.trip_overview) ? (
            <div className="mt-2"><InsufficientDataNote /></div>
          ) : (
            <p className="mt-2 text-sm text-sand-900 leading-relaxed">{data.trip_overview}</p>
          )}
        </div>
      )}

      {packing.length > 0 && (
        <div>
          <div className="eyebrow">Packing list</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {packing.map((p, idx) => (
              <div key={idx} className="rounded-xl border border-sand-200 bg-white p-3">
                <div className="text-[11px] uppercase tracking-wider text-rust-500">{String(p?.category ?? '')}</div>
                <div className="mt-1 font-medium text-sand-900">{String(p?.product_recommendation ?? '')}</div>
                {isInsufficientData(p?.why) ? (
                  <div className="mt-2"><InsufficientDataNote /></div>
                ) : (
                  <div className="mt-1 text-xs text-sand-700">{String(p?.why ?? '')}</div>
                )}
                <CitationLink id={p?.citation_resource_id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {daily.length > 0 && (
        <div>
          <div className="eyebrow">Daily plan</div>
          <ul className="mt-2 space-y-2">
            {daily.map((d, idx) => (
              <li key={idx} className="flex items-start gap-3 rounded-xl border border-sand-200 bg-white p-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-alpine-100 font-semibold text-alpine-700 text-sm">
                  {String(d?.day ?? idx + 1)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sand-900">{String(d?.activity ?? '')}</div>
                  <div className="mt-0.5 text-xs text-sand-600">
                    {String(d?.distance_km ?? '0')} km &middot; {String(d?.elevation_m ?? '0')} m elevation
                  </div>
                  <div className="mt-1 text-xs text-alpine-700">Gear focus: {String(d?.gear_focus ?? '')}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tips.length > 0 && (
        <div>
          <div className="eyebrow">Ambassador tips</div>
          <div className="mt-2 space-y-2">
            {tips.map((t, idx) => (
              <div key={idx} className="card-accent flex items-start gap-3 p-4">
                <AmbassadorAvatar name={String(t?.ambassador_name ?? '')} />
                <div className="min-w-0 flex-1">
                  {isInsufficientData(t?.tip) ? (
                    <InsufficientDataNote />
                  ) : (
                    <p className="text-sm italic text-sand-900">&ldquo;{String(t?.tip ?? '')}&rdquo;</p>
                  )}
                  <div className="mt-2 text-xs text-sand-700">
                    &mdash; {String(t?.ambassador_name ?? '')}
                    <CitationInline id={t?.citation_resource_id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {safety.length > 0 && (
        <div className="rounded-xl border border-rust-300 bg-rust-50/60 p-4">
          <div className="flex items-center gap-2 text-rust-700">
            <WarningIcon className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Safety notes</span>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-sand-900">
            {safety.map((n, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rust-500" />
                <span>{String(n)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LoyaltyPlanView({ data }: { data: AnyObj }) {
  const events = asArray<AnyObj>(data.events);
  const exclusive = asArray<AnyObj>(data.exclusive_products);
  const content = asArray<AnyObj>(data.content_to_deliver);
  const partnerOffers = asArray<AnyObj>(data.partner_offers);
  const points = (data.points_optimization ?? {}) as AnyObj;
  const suggestedActions = asArray<string>(points.suggested_actions);

  return (
    <div className="space-y-5">
      {events.length > 0 && (
        <div>
          <div className="eyebrow">Events</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {events.map((e, idx) => (
              <div key={idx} className="rounded-xl border border-sand-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sand-900">{String(e?.name ?? '')}</div>
                  <span className="text-[10px] uppercase tracking-wider text-alpine-600">{String(e?.region ?? '')}</span>
                </div>
                <div className="mt-0.5 text-xs text-sand-600">{String(e?.date ?? '')}</div>
                {isInsufficientData(e?.why_this_member) ? (
                  <div className="mt-2"><InsufficientDataNote /></div>
                ) : (
                  <div className="mt-1 text-xs text-sand-700">{String(e?.why_this_member ?? '')}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {exclusive.length > 0 && (
        <div>
          <div className="eyebrow">Exclusive products</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {exclusive.map((p, idx) => (
              <div key={idx} className="rounded-xl border border-sand-200 bg-white p-3">
                <div className="text-[11px] uppercase tracking-wider text-rust-500">{String(p?.tier_required ?? '')}</div>
                <div className="mt-1 font-medium text-sand-900">{String(p?.name ?? '')}</div>
                {isInsufficientData(p?.why) ? (
                  <div className="mt-2"><InsufficientDataNote /></div>
                ) : (
                  <div className="mt-1 text-xs text-sand-700">{String(p?.why ?? '')}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {content.length > 0 && (
        <div>
          <div className="eyebrow">Content to deliver</div>
          <ul className="mt-2 space-y-2">
            {content.map((c, idx) => (
              <li key={idx} className="rounded-xl border border-sand-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sand-900">{String(c?.title ?? '')}</div>
                  <span className="text-[10px] uppercase tracking-wider text-alpine-600">{String(c?.format ?? '')}</span>
                </div>
                <div className="mt-1 text-xs text-sand-700">By {String(c?.ambassador ?? '')}</div>
                <CitationLink id={c?.citation_resource_id} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {partnerOffers.length > 0 && (
        <div>
          <div className="eyebrow">Partner offers</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {partnerOffers.map((o, idx) => (
              <div key={idx} className="rounded-xl border border-sand-200 bg-white p-3">
                <div className="font-medium text-sand-900">{String(o?.partner_name ?? '')}</div>
                {isInsufficientData(o?.offer) ? (
                  <div className="mt-2"><InsufficientDataNote /></div>
                ) : (
                  <div className="mt-1 text-xs text-sand-700">{String(o?.offer ?? '')}</div>
                )}
                <div className="mt-1 text-[11px] uppercase tracking-wider text-rust-500">Expires {String(o?.expiry ?? '')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(typeof points.current_balance === 'number' || suggestedActions.length > 0) && (
        <div>
          <div className="eyebrow">Points optimization</div>
          <div className="mt-2 rounded-xl border border-alpine-200 bg-alpine-50 p-4">
            {typeof points.current_balance === 'number' && (
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl text-alpine-700">{points.current_balance.toLocaleString()}</span>
                <span className="text-xs uppercase tracking-wider text-sand-700">current balance</span>
              </div>
            )}
            {suggestedActions.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-sand-800">
                {suggestedActions.map((a, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-alpine-500" />
                    {String(a)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CrossSellView({ data }: { data: AnyObj }) {
  const product = (data.product ?? {}) as AnyObj;
  const pillars = asArray<string>(product.brand_pillars);
  const comparison = asArray<AnyObj>(data.comparison_table);
  const pairs = asArray<AnyObj>(data.pairs_with);
  const tips = asArray<AnyObj>(data.ambassador_tips);
  const positioning = (data.segment_positioning ?? {}) as AnyObj;

  return (
    <div className="space-y-5">
      {(Boolean(product.name) || Boolean(product.summary)) && (
        <div className="rounded-xl border border-alpine-200 bg-white p-4">
          <div className="eyebrow-ai"><span className="ai-dot" /> Product</div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="h-section">{String(product.name ?? '')}</h3>
            {/* FIX 1 — guard price rendering; em-dash for missing / zero / invalid. */}
            <div className="font-display text-xl text-alpine-700">{fmtPrice(product.price_usd)}</div>
          </div>
          {typeof product.summary === 'string' && (
            isInsufficientData(product.summary) ? (
              <div className="mt-2"><InsufficientDataNote /></div>
            ) : (
              <p className="mt-2 text-sm text-sand-900 leading-relaxed">{product.summary}</p>
            )
          )}
          {pillars.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {pillars.map((p, idx) => (
                <span key={idx} className="chip-rust">{String(p)}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {comparison.length > 0 && (
        <div>
          <div className="eyebrow">Comparison table</div>
          <div className="mt-2 overflow-x-auto rounded-xl border border-sand-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-sand-50 text-[11px] uppercase tracking-wider text-sand-700">
                <tr>
                  <th className="px-3 py-2 font-semibold">Attribute</th>
                  <th className="px-3 py-2 font-semibold text-alpine-700">This product</th>
                  <th className="px-3 py-2 font-semibold">Alternative 1</th>
                  <th className="px-3 py-2 font-semibold">Alternative 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200 bg-white">
                {comparison.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-medium text-sand-900">{renderComparisonCell(row?.attribute, false)}</td>
                    <td className="px-3 py-2 text-alpine-700 font-medium">{renderComparisonCell(row?.this_product, isPriceAttribute(row?.attribute))}</td>
                    <td className="px-3 py-2 text-sand-800">{renderComparisonCell(row?.alternative_1, isPriceAttribute(row?.attribute))}</td>
                    <td className="px-3 py-2 text-sand-800">{renderComparisonCell(row?.alternative_2, isPriceAttribute(row?.attribute))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pairs.length > 0 && (
        <div>
          <div className="eyebrow">Pairs with</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {pairs.map((p, idx) => (
              <div key={idx} className="rounded-xl border border-sand-200 bg-white p-3">
                <div className="font-medium text-sand-900">{String(p?.name ?? '')}</div>
                {isInsufficientData(p?.why_this_pairing) ? (
                  <div className="mt-2"><InsufficientDataNote /></div>
                ) : (
                  <div className="mt-1 text-xs text-sand-700">{String(p?.why_this_pairing ?? '')}</div>
                )}
                <CitationLink id={p?.citation_resource_id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div>
          <div className="eyebrow">Ambassador tips</div>
          <div className="mt-2 space-y-2">
            {tips.map((t, idx) => (
              <div key={idx} className="card-accent flex items-start gap-3 p-4">
                <AmbassadorAvatar name={String(t?.ambassador_name ?? '')} />
                <div className="min-w-0 flex-1">
                  {isInsufficientData(t?.tip) ? (
                    <InsufficientDataNote />
                  ) : (
                    <p className="text-sm italic text-sand-900">&ldquo;{String(t?.tip ?? '')}&rdquo;</p>
                  )}
                  <div className="mt-2 text-xs text-sand-700">
                    &mdash; {String(t?.ambassador_name ?? '')}
                    <CitationInline id={t?.citation_resource_id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(Boolean(positioning.for_weekend_adventurers) || Boolean(positioning.for_thru_hikers) || Boolean(positioning.for_alpine_pros)) && (
        <div>
          <div className="eyebrow">Segment positioning</div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-sand-200 bg-white p-3">
              <div className="text-[11px] uppercase tracking-wider text-alpine-600">Weekend Adventurers</div>
              {isInsufficientData(positioning.for_weekend_adventurers) ? (
                <div className="mt-2"><InsufficientDataNote /></div>
              ) : (
                <p className="mt-1 text-sm text-sand-900">{String(positioning.for_weekend_adventurers ?? '')}</p>
              )}
            </div>
            <div className="rounded-xl border border-sand-200 bg-white p-3">
              <div className="text-[11px] uppercase tracking-wider text-alpine-600">Thru-Hikers</div>
              {isInsufficientData(positioning.for_thru_hikers) ? (
                <div className="mt-2"><InsufficientDataNote /></div>
              ) : (
                <p className="mt-1 text-sm text-sand-900">{String(positioning.for_thru_hikers ?? '')}</p>
              )}
            </div>
            <div className="rounded-xl border border-sand-200 bg-white p-3">
              <div className="text-[11px] uppercase tracking-wider text-alpine-600">Alpine Pros</div>
              {isInsufficientData(positioning.for_alpine_pros) ? (
                <div className="mt-2"><InsufficientDataNote /></div>
              ) : (
                <p className="mt-1 text-sm text-sand-900">{String(positioning.for_alpine_pros ?? '')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Heuristic — if a comparison row's attribute name reads like "price" / "msrp" / "cost",
 * route the cell value through fmtPrice so "$0" / blank become em-dash.
 */
function isPriceAttribute(attr: unknown): boolean {
  if (typeof attr !== 'string') return false;
  return /price|msrp|cost|\$|usd/i.test(attr);
}

function renderComparisonCell(value: unknown, isPrice: boolean): string {
  if (isPrice) {
    // Try numeric extraction from strings like "$0" or "0".
    const stripped = typeof value === 'string' ? value.replace(/[^0-9.\-]/g, '') : value;
    return fmtPrice(stripped);
  }
  const s = String(value ?? '');
  if (isInsufficientData(s)) return '—';
  return s;
}
