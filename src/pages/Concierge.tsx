import { PersonaToggle } from '../components/PersonaToggle';
import { dispatchConciergePrefill } from '../components/FloatingChat';
import { usePersona } from '../context/PersonaContext';

interface DemoQuestion {
  q: string;
  expects: string;
  voice: 'shopper' | 'member';
}

const SHOPPER_QUESTIONS: DemoQuestion[] = [
  {
    voice: 'shopper',
    q: "What's the warmest jacket you sell for Patagonia in October?",
    expects: 'Aurora Helios down jacket · 3 sentences · single CTA',
  },
  {
    voice: 'shopper',
    q: 'Best boot for the Tasmania Overland Track?',
    expects: 'Aurora TerraTrek 7 · 3 sentences · single CTA',
  },
  {
    voice: 'shopper',
    q: "I'm planning my first multi-day thru-hike — what pack?",
    expects: 'Aurora Skyline 45L · 3 sentences · single CTA',
  },
  {
    voice: 'shopper',
    q: 'Two-person tent for shoulder-season weekends?',
    expects: 'Aurora Cumulus 2P · 3 sentences · single CTA',
  },
];

const MEMBER_QUESTIONS: DemoQuestion[] = [
  {
    voice: 'member',
    q: 'Does the Crag XR work in Chamonix in winter?',
    expects: 'Trail Club Plus exclusive · Theo Sundberg quote · multi-cite',
  },
  {
    voice: 'member',
    q: 'How does Mara Chen pair the TerraTrek 7 with the Skyline 45L for the Greater Patagonian Trail?',
    expects: 'Ambassador-grounded · 4-6 sentences · technical depth',
  },
  {
    voice: 'member',
    q: 'Compare the Helios to the Quill 850 for shoulder-season warmth-per-gram.',
    expects: 'Two-product comparison · spec-heavy · member tone',
  },
  {
    voice: 'member',
    q: 'What member-exclusive perks ship with the Trail Club Pro tier?',
    expects: 'Loyalty content · ambassador day-bookings · 2028 events',
  },
];

export function Concierge() {
  const persona = usePersona();
  const isMember = persona.active.voice === 'member';
  const primarySet = isMember ? MEMBER_QUESTIONS : SHOPPER_QUESTIONS;
  const secondarySet = isMember ? SHOPPER_QUESTIONS : MEMBER_QUESTIONS;
  const primaryLabel = isMember ? 'Member voice' : 'Shopper voice';
  const secondaryLabel = isMember ? 'Also try as a shopper' : 'Also try as a member';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow-ai"><span className="ai-dot" /> Floating concierge</div>
          <h1 className="h-page mt-2">Two voices. One conversation.</h1>
          <p className="h-page-sub">The same question, answered for two different shoppers. Switch personas to see the voice shift live — or open the concierge bottom-right and try it yourself.</p>
        </div>
        <PersonaToggle />
      </header>

      <p className="mt-2 text-[12px] text-sand-600 italic">
        Switching personas above changes which voice the live widget speaks in. The two cards below stay visible so you can see the contrast.
      </p>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <VoiceCard
          voice="shopper"
          isActive={!isMember}
          eyebrow="Shopper voice"
          title="For Sara — and everyone like her."
          tagline="Three sentences, one call-to-action, then stop. The AI knows the prospect doesn't want a lecture."
          bullets={[
            'Maximum three sentences',
            'Field-engineered CTA pulled from the most-relevant product',
            'Conversational, never patronising',
          ]}
        />
        <VoiceCard
          voice="member"
          isActive={isMember}
          eyebrow="Member voice"
          title="For Mara — and the technical core."
          tagline="Detailed, multi-source, cites everything. Trail Club Pro members get the long answer, every time."
          bullets={[
            'Four to six sentences with inline citations',
            'References ambassador-authored and member-exclusive content',
            'Surfaces Trail Club Pro perks where they fit',
          ]}
        />
      </section>

      <section className="mt-10">
        <div className="eyebrow">Curated demo questions</div>
        <h2 className="h-section mt-1">Questions the corpus can answer cleanly.</h2>
        <p className="mt-1 max-w-3xl text-sm text-sand-700">
          Hand-picked so every answer is grounded in the live Aurora knowledge base — no hallucinations, no mismatched gear. Click any chip to send it into the floating concierge.
        </p>

        <div className="mt-5">
          <div className="eyebrow-alpine mb-2">{primaryLabel} · primary</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {primarySet.map((dq) => (
              <QuestionChip key={dq.q} dq={dq} emphasis="primary" />
            ))}
          </div>
        </div>

        <div className="mt-7">
          <div className="eyebrow mb-2">{secondaryLabel}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {secondarySet.map((dq) => (
              <QuestionChip key={dq.q} dq={dq} emphasis="secondary" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function VoiceCard({
  voice,
  isActive,
  eyebrow,
  title,
  tagline,
  bullets,
}: {
  voice: 'shopper' | 'member';
  isActive: boolean;
  eyebrow: string;
  title: string;
  tagline: string;
  bullets: string[];
}) {
  const eyebrowCls = voice === 'member' ? 'eyebrow-alpine' : 'eyebrow';
  const activeBorder = voice === 'member' ? 'border-alpine-400 ring-2 ring-alpine-100' : 'border-rust-400 ring-2 ring-rust-100';
  const baseCard = 'rounded-2xl border bg-white p-5 shadow-aurora transition-all duration-200';
  const stateCls = isActive
    ? `${activeBorder} relative`
    : 'border-sand-200 opacity-75 [filter:grayscale(0.15)]';

  return (
    <div className={`${baseCard} ${stateCls}`}>
      {isActive && (
        <span
          className={
            'absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ' +
            (voice === 'member' ? 'bg-alpine-100 text-alpine-700' : 'bg-rust-100 text-rust-700')
          }
        >
          <span
            className={
              'h-1.5 w-1.5 rounded-full ' + (voice === 'member' ? 'bg-alpine-500' : 'bg-rust-500')
            }
          />
          Active
        </span>
      )}
      <div className={eyebrowCls}>{eyebrow}</div>
      <h3 className="mt-2 font-display text-xl text-sand-900">{title}</h3>
      <p className="mt-2 text-sm text-sand-700">{tagline}</p>
      <ul className="mt-4 space-y-1 text-xs text-sand-600">
        {bullets.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>
    </div>
  );
}

function QuestionChip({ dq, emphasis }: { dq: DemoQuestion; emphasis: 'primary' | 'secondary' }) {
  const isPrimary = emphasis === 'primary';
  const buttonCls = isPrimary
    ? 'group flex w-full items-start gap-3 rounded-xl border border-alpine-300 bg-alpine-50/50 px-4 py-3 text-left transition hover:border-alpine-500 hover:bg-alpine-50 hover:shadow-aurora active:scale-[0.99]'
    : 'group flex w-full items-start gap-3 rounded-xl border border-sand-200 bg-white px-4 py-3 text-left transition hover:border-alpine-400 hover:bg-sand-50 active:scale-[0.99]';
  const arrowCls = isPrimary
    ? 'mt-0.5 flex-none text-alpine-600 transition group-hover:translate-x-0.5'
    : 'mt-0.5 flex-none text-sand-500 transition group-hover:text-alpine-600 group-hover:translate-x-0.5';
  return (
    <button
      type="button"
      onClick={() => dispatchConciergePrefill({ question: dq.q, autoSend: true })}
      className={buttonCls}
    >
      <span className={arrowCls} aria-hidden="true">
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-sand-900">{dq.q}</span>
        <span className="mt-1 block text-[11px] text-sand-600">{dq.expects}</span>
      </span>
    </button>
  );
}
