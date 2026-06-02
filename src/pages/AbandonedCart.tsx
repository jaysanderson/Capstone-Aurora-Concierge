import { useMemo, useRef, useState } from 'react';
import { askForJson, type AnswerJsonSchema } from '../lib/askForJson';
import { compositeAsk, type CompositeResult, AURORA_SITE_ORIGIN } from '../lib/compositeRag';
import { PipelineSteps } from '../components/PipelineSteps';
import { Citations } from '../components/Citations';
import { CustomerJourneyTimeline } from '../components/CustomerJourneyTimeline';
import { ErrorPanel } from '../components/States';
import { buildPrefix } from '../lib/buildPrefix';
import { useLanguage } from '../context/LanguageContext';
import saraFixture from '../fixtures/sara-session.json';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const WINBACK_SCHEMA: AnswerJsonSchema = {
  name: 'winback_message',
  description: 'Structured abandoned-cart winback message dropping into Klaviyo / Braze.',
  parameters: {
    type: 'object',
    properties: {
      subject_line: { type: 'string' },
      body: { type: 'string' },
      cta_label: { type: 'string' },
      cta_url: { type: 'string' },
      cross_sell_products: { type: 'array', items: { type: 'string' } },
      ambassador_quote: {
        type: 'object',
        properties: { quote: { type: 'string' }, attribution: { type: 'string' }, source_url: { type: 'string' } },
        required: ['quote', 'attribution', 'source_url'],
      },
      send_window: { type: 'string' },
    },
    required: ['subject_line', 'body', 'cta_label', 'cta_url', 'cross_sell_products', 'ambassador_quote', 'send_window'],
  },
};

interface WinbackPayload {
  subject_line?: string;
  body?: string;
  cta_label?: string;
  cta_url?: string;
  cross_sell_products?: string[];
  ambassador_quote?: { quote?: string; attribution?: string; source_url?: string };
  send_window?: string;
}

// ---------------------------------------------------------------------------
// Persona variants — the same retrieved context goes to BOTH prompts in
// parallel so the CMO can compare side-by-side. The prompts are sharply
// differentiated on subject, body voice, send-window logic and CTA.
// ---------------------------------------------------------------------------
type VariantId = 'prospect' | 'pro';

interface Variant {
  id: VariantId;
  label: string;
  tier: string;
  segment: string;
  accent: 'rust' | 'alpine';
  promptOverride: string;
}

const VARIANTS: Variant[] = [
  {
    id: 'prospect',
    label: 'Prospect lens',
    tier: 'New shopper',
    segment: 'Weekend Adventurer · NORAM',
    accent: 'rust',
    promptOverride:
      'Audience is a PROSPECT - first-time shopper who has never bought from Aurora. ' +
      'Write in shopper voice: warm, brand-introductory, focus on confidence-building. ' +
      'CRITICAL: the customer\'s first name is "Sara" — address her as Sara verbatim. Do NOT substitute any other name (Mara, Maya, etc.) regardless of any other persona context. ' +
      'Subject line MUST be action-oriented, under 60 chars, and reference completing the purchase. ' +
      'Body: 3 short paragraphs max. Lead with a beat of empathy ("we saw you eyeing..."), then one fit/quality fact pulled from the corpus, then a clear single CTA. ' +
      'Cross-sell 1-2 entry-level pairings only. Send window: morning weekend slot.',
  },
  {
    id: 'pro',
    label: 'Pro member lens',
    tier: 'Trail Club Pro',
    segment: 'Alpine Pro · EMEA',
    accent: 'alpine',
    promptOverride:
      'Audience is a TRAIL CLUB PRO MEMBER - knows the product well, has read the reviews, owns adjacent Aurora gear. ' +
      'Write in member voice: insider, technical, conversational, never promotional. ' +
      'CRITICAL: the customer\'s first name is STILL "Sara" — address her as Sara verbatim. The "Pro member" framing is HOW Aurora writes to her (as if she were a Pro member); it does NOT change her name. Do NOT substitute "Mara", "Maya", or any ambassador name as the recipient. Mara Chen can appear inside the body as the AMBASSADOR being quoted, never as the customer addressed in the greeting. ' +
      'Subject line MUST reference specific insider knowledge — a specific trail name, a technical spec, a member perk, or an ambassador insight — NOT a generic "complete your order" line. Aim for 50-65 chars. ' +
      'CRITICAL subject-line constraint: NEVER lead the subject with an ambassador\'s first name in possessive form (e.g. "Mara\'s TerraTrek 7 Insights..."). Such constructions read as if the email is FROM the ambassador TO the recipient, mixing the two personas in one line. If attributing insight to an ambassador in the subject, use a full-name + role construction that makes the attribution unambiguous: "Ambassador Mara Chen on the TerraTrek 7", "Pro insider notes — TerraTrek 7", or "Mara Chen\'s day-3 read on Patagonia" (full name, not first-name possessive). Default to the trail / product / perk angle when in doubt — ambassador name is a secondary lever, not the lead. ' +
      'Body: 4-5 paragraphs. Open with an ambassador-specific take (e.g. "Mara\'s day 3 note on Patagonia..."). Reference Pro-tier perks (free guide swap, priority sizing). Include a technical fit detail from a gear review. CTA is a quiet "complete your order" with the member-priced url path. ' +
      'Cross-sell up to 3 advanced pairings. Send window: weekday evening pre-trip planning slot.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatAbandonedAt(hoursAgo?: number): string {
  if (hoursAgo == null || Number.isNaN(hoursAgo)) return 'recently';
  if (hoursAgo < 1) return 'less than an hour ago';
  if (hoursAgo < 24) return `${Math.round(hoursAgo)}h ago`;
  const days = Math.round(hoursAgo / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function renderEmailBody(body?: string): JSX.Element[] {
  if (!body) return [];
  return body.split(/\n{2,}/).map((para, idx) => (
    <p key={idx} className="whitespace-pre-line">
      {para.trim()}
    </p>
  ));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function AbandonedCart() {
  const language = useLanguage();
  const [composite, setComposite] = useState<CompositeResult | null>(null);
  const [variants, setVariants] = useState<Partial<Record<VariantId, WinbackPayload>>>({});
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  // Ref-based double-fire guard. setRunning(true) is async; an accidental
  // double-click or any future effect would slip past the running-state
  // check. The ref blocks re-entrant calls synchronously.
  const inFlight = useRef(false);

  const customer = saraFixture.customer;
  const cart = saraFixture.cart;
  // Stabilise firstItem so its referential identity doesn't churn every
  // render — protects baseQuery's useMemo from re-evaluating without cause.
  const firstItem = useMemo(() => cart?.items?.[0], [cart]);

  const baseQuery = useMemo(
    () =>
      `${customer?.name ?? 'Sara'} abandoned a cart ${formatAbandonedAt(cart?.abandoned_hours_ago)} with the ` +
      `${firstItem?.name ?? 'Aurora TerraTrek 7'}${firstItem?.variant ? ` (${firstItem.variant})` : ''}. ` +
      `The customer's first name is "${customer?.name ?? 'Sara'}" — every greeting and salutation in the email body MUST use this exact name. ` +
      `Write a winback message. Use Aurora trail guides, gear reviews, ambassador content, and loyalty content. ` +
      `Include cross-sell products that pair from the journey graph, and an ambassador quote. ` +
      `Use Aurora Outfitters product URLs (origin ${AURORA_SITE_ORIGIN}) - never example.com.`,
    [customer?.name, cart?.abandoned_hours_ago, firstItem],
  );

  async function run() {
    // Hard guard against re-entrant invocations (the user reported a
    // spontaneous mid-scroll pipeline restart — likely a stray double-fire
    // pathway).
    if (inFlight.current) return;
    inFlight.current = true;
    setRunning(true);
    setError(null);

    // Inject the global language prefix the same way Concierge does.
    // Without this, switching the header language toggle to Spanish leaves
    // the winback emails in English while the Concierge correctly switches.
    const langPrefix = buildPrefix({ language: language.active, segment: 'Weekend Adventurer' });
    const languagedBase = langPrefix + baseQuery;
    try {
      const c = await compositeAsk({
        query: languagedBase,
        initialFilters: ['/classification.labels/content_type/product'],
        graphSeedEntities: [
          { value: firstItem?.name ?? 'Aurora TerraTrek 7', group: 'PRODUCT' },
          { value: 'Mara Chen', group: 'AMBASSADOR' },
        ],
      });
      setComposite(c);

      // BOTH variants generated in parallel from the same retrieved context.
      const [prospect, pro] = await Promise.all(
        VARIANTS.map((v) =>
          askForJson<WinbackPayload>({
            query:
              `${languagedBase}\n\n${v.promptOverride}\n\n` +
              `Ground every fact in the retrieved context. Suggest a send window in the customer's local time. ` +
              `All URLs must use the ${AURORA_SITE_ORIGIN} origin.`,
            schema: WINBACK_SCHEMA,
          }).catch(() => null),
        ),
      );
      setVariants({
        prospect: prospect ?? undefined,
        pro: pro ?? undefined,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
      inFlight.current = false;
    }
  }

  const hasResults = !!(variants.prospect || variants.pro);
  const buttonLabel = running
    ? 'Generating both lenses…'
    : hasResults
    ? 'Re-generate both lenses ↻'
    : 'Generate both lenses';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <div className="eyebrow">Composite RAG</div>
          <h1 className="h-page mt-2">
            One cart. <span className="text-alpine-600 italic">Two emails.</span>
          </h1>
          <p className="h-page-sub mt-2">
            Composite-RAG retrieves the cart context once, then drafts two structured winbacks in parallel —
            one for a first-time prospect, one for a Trail Club Pro member — so you can see how the same
            grounded context produces sharply different revenue moves.
          </p>
        </div>
      </header>

      {/* ===== Top: customer + pipeline strip ===== */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1.5fr]">
        <section className="card">
          <div className="flex items-baseline justify-between gap-3">
            <div className="eyebrow">Customer journey</div>
            <div className="chip-metric">fixture · live retrieval</div>
          </div>
          <div className="mt-4">
            <CustomerJourneyTimeline
              customerName={customer?.name}
              sessionHistory={customer?.session_history ?? []}
              abandonedItem={firstItem?.name}
              abandonedAt={formatAbandonedAt(cart?.abandoned_hours_ago)}
            />
          </div>
          <button
            type="button"
            className="btn-primary mt-5 w-full"
            onClick={run}
            disabled={running}
          >
            {buttonLabel}
          </button>
          <p className="mt-3 text-[11px] text-sand-600">
            The customer is always the same — what changes is the segment lens the AI writes through.
          </p>
          {error && (
            <div className="mt-4">
              <ErrorPanel message={error} onRetry={run} />
            </div>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-3">
            <div className="eyebrow">Pipeline</div>
            {composite && hasResults && (
              <div className="chip-alpine">Both lenses generated · {composite.steps.length} steps</div>
            )}
          </div>
          <div className="mt-3">
            <PipelineSteps
              steps={composite?.steps ?? []}
              running={running}
              recovered={hasResults}
            />
          </div>
        </section>
      </div>

      {/* ===== The split-view money shot ===== */}
      {(hasResults || running) && (
        <section className="mt-10">
          <div className="eyebrow-ai"><span className="ai-dot" /> One context, two lenses</div>
          <h2 className="h-section mt-2">
            Same cart. Same retrieved facts. <span className="text-alpine-600 italic">Different revenue move.</span>
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-sand-700">
            Left: the AI writes to a first-time prospect — confident, brand-introductory, one clean CTA.
            Right: the AI writes to a Trail Club Pro member — insider, technical, ambassador-grounded,
            referencing member perks. Both came from the same composite-RAG context in a single pipeline run.
          </p>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {VARIANTS.map((v) => (
              <div key={v.id} className="fade-in-up">
                <VariantHeader variant={v} />
                {running && !variants[v.id] ? (
                  <WinbackSkeleton accent={v.accent} />
                ) : variants[v.id] ? (
                  <WinbackEmailPreview
                    winback={variants[v.id]!}
                    composite={composite}
                    accent={v.accent}
                    dimmed={running}
                  />
                ) : (
                  <div className="card-accent text-sm text-sand-500">
                    No payload returned for this lens.
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!hasResults && !running && !error && (
        <div className="mt-10 rounded-2xl border border-dashed border-sand-300 bg-white/60 p-8 text-center text-sm text-sand-600">
          Click <strong className="text-sand-900">Generate both lenses</strong> to see how the same
          retrieved context produces a prospect email <em>and</em> a Pro member email — side by side.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant header — labels the two columns + colour-codes them
// ---------------------------------------------------------------------------
function VariantHeader({ variant }: { variant: Variant }) {
  const isRust = variant.accent === 'rust';
  return (
    <div className={`mb-2 flex items-center justify-between gap-2 rounded-t-xl border-x border-t px-3 py-1.5 text-[11px] ${isRust ? 'border-rust-300 bg-rust-50/60 text-rust-700' : 'border-alpine-300 bg-alpine-50/60 text-alpine-700'}`}>
      <div className="flex items-baseline gap-2">
        <span className="font-semibold uppercase tracking-wider">{variant.label}</span>
        <span className={isRust ? 'text-rust-600' : 'text-alpine-600'}>·</span>
        <span>{variant.tier}</span>
      </div>
      <span className="text-[10px] tabular">{variant.segment}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email preview - now accent-aware so the two columns visually distinct
// ---------------------------------------------------------------------------
interface WinbackEmailPreviewProps {
  winback: WinbackPayload;
  composite: CompositeResult | null;
  accent: 'rust' | 'alpine';
  dimmed?: boolean;
}

function WinbackEmailPreview({ winback, composite, accent, dimmed }: WinbackEmailPreviewProps): JSX.Element {
  const crossSell = winback.cross_sell_products ?? [];
  const ambassador = winback.ambassador_quote;
  const ctaHref = winback.cta_url ?? `${AURORA_SITE_ORIGIN}/cart`;
  const ctaLabel = winback.cta_label ?? 'Complete your order';
  const isRust = accent === 'rust';
  const cardBorder = isRust ? 'border-rust-200' : 'border-alpine-200';

  return (
    <div className={`rounded-b-2xl rounded-tr-2xl border bg-white p-5 shadow-aurora transition-opacity ${cardBorder} ${dimmed ? 'opacity-60' : ''}`}>
      {/* Faux-inbox header. */}
      <div className="overflow-hidden rounded-lg border border-sand-200 bg-white">
        <div className="border-b border-sand-200 bg-sand-50 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-[11px] uppercase tracking-wider text-sand-500">From</div>
            {winback.send_window && (
              <div className={isRust ? 'chip-rust' : 'chip-alpine'}>
                Send · {winback.send_window}
              </div>
            )}
          </div>
          <div className="mt-0.5 text-sm font-medium text-sand-900">
            Aurora Outfitters &lt;hello@aurora-outfitters.com&gt;
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-wider text-sand-500">Subject</div>
          <div className="text-base font-semibold text-sand-900">
            {winback.subject_line ?? 'Your TerraTrek 7 is still in the cart'}
          </div>
        </div>

        {/* Body. */}
        <div className="space-y-3 px-4 py-4 text-sm leading-relaxed text-sand-800">
          {renderEmailBody(winback.body)}

          <div className="pt-1">
            <a href={ctaHref} className="pill-cta" target="_blank" rel="noreferrer">
              {ctaLabel}
            </a>
            <div className="mt-1 text-[11px] text-sand-500">{ctaHref}</div>
          </div>

          {crossSell.length > 0 && (
            <div className="pt-3">
              <div className={`mb-2 ${isRust ? 'eyebrow' : 'eyebrow-alpine'}`}>Pairs well with</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {crossSell.slice(0, 3).map((sku, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-sand-200 bg-sand-50 p-3 text-sm font-medium text-sand-900"
                  >
                    {sku}
                  </div>
                ))}
              </div>
            </div>
          )}

          {ambassador?.quote && (
            <figure className={`mt-2 border-l-2 ${isRust ? 'border-rust-400 bg-rust-50' : 'border-alpine-400 bg-alpine-50'} px-3 py-2`}>
              <blockquote className="text-sm italic text-sand-800">
                &ldquo;{ambassador.quote}&rdquo;
              </blockquote>
              <figcaption className={`mt-1 text-[12px] ${isRust ? 'text-rust-700' : 'text-alpine-700'}`}>
                — {ambassador.attribution ?? 'Aurora ambassador'}
                {ambassador.source_url && (
                  <>
                    {' · '}
                    <a
                      href={ambassador.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`underline underline-offset-2 ${isRust ? 'decoration-rust-300 hover:text-rust-900' : 'decoration-alpine-300 hover:text-alpine-900'}`}
                    >
                      source
                    </a>
                  </>
                )}
              </figcaption>
            </figure>
          )}
        </div>
      </div>

      {composite && <Citations citations={composite.citations} />}

      <details className="mt-4 text-xs text-sand-600">
        <summary className="cursor-pointer select-none text-sand-700 hover:text-sand-900">
          View payload
        </summary>
        <pre className="mt-2 max-h-[280px] overflow-auto rounded-md bg-sand-100 p-3 font-mono text-[11px] text-sand-900">
          {JSON.stringify(winback, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function WinbackSkeleton({ accent }: { accent: 'rust' | 'alpine' }) {
  const cardBorder = accent === 'rust' ? 'border-rust-200' : 'border-alpine-200';
  return (
    <div className={`rounded-b-2xl rounded-tr-2xl border bg-white p-5 shadow-aurora ${cardBorder}`} aria-busy="true" aria-live="polite">
      <div className="overflow-hidden rounded-lg border border-sand-200 bg-white">
        <div className="space-y-2 border-b border-sand-200 bg-sand-50 px-4 py-3">
          <div className="skeleton-shimmer h-3 w-32 rounded" />
          <div className="skeleton-shimmer h-4 w-3/4 rounded" />
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="skeleton-shimmer h-3 w-full rounded" />
          <div className="skeleton-shimmer h-3 w-11/12 rounded" />
          <div className="skeleton-shimmer h-3 w-10/12 rounded" />
          <div className="skeleton-shimmer h-9 w-40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
