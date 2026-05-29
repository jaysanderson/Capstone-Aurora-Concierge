import { useEffect, useRef, useState } from 'react';
import { streamAsk, type Citation } from '../lib/ragClient';
import { buildPrefix } from '../lib/buildPrefix';
import { usePersona } from '../context/PersonaContext';
import { useLanguage } from '../context/LanguageContext';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
}

const SHOPPER_PROMPT = {
  system:
    'You are an outdoor-gear concierge for Aurora Outfitters. STRICT RULES: ' +
    '(1) Maximum 3 sentences. ' +
    '(2) End with ONE call-to-action picked from the most-relevant resource\'s callToAction field. ' +
    '(3) Render the call-to-action as a markdown link. ' +
    '(4) STOP after the link.',
  user: 'Context: {context}\n\nQuestion: {question}',
};

const MEMBER_PROMPT = {
  system:
    'You are an expert outdoor-gear concierge for Aurora Outfitters Trail Club Pro members. ' +
    'Provide a detailed, multi-source, well-cited answer with technical depth. Reference ambassador-authored content where relevant. ' +
    '4-6 sentences. Include member-exclusive recommendations where they fit.',
  user: 'Context (member-exclusive content included): {context}\n\nQuestion: {question}',
};

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const persona = usePersona();
  const language = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  // Persona switch clears the chat — different voice, different context.
  useEffect(() => {
    setTurns([]);
  }, [persona.active.id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    const rawQuery = input.trim();
    const prefix = buildPrefix({ language: language.active, segment: persona.active.segment });
    const finalQuery = prefix + rawQuery;
    setInput('');
    setStreaming(true);
    setTurns((t) => [...t, { role: 'user', text: rawQuery }, { role: 'assistant', text: '' }]);

    const promptConfig = persona.active.voice === 'member' ? MEMBER_PROMPT : SHOPPER_PROMPT;

    try {
      for await (const evt of streamAsk({ query: finalQuery, promptConfig })) {
        if (evt.type === 'answer-chunk') {
          setTurns((t) => {
            const next = [...t];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') last.text += evt.text;
            return next;
          });
        } else if (evt.type === 'citations') {
          setTurns((t) => {
            const next = [...t];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') last.citations = evt.citations;
            return next;
          });
        } else if (evt.type === 'error') {
          setTurns((t) => {
            const next = [...t];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') last.text = `Error: ${evt.message}`;
            return next;
          });
          break;
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-alpine-500 text-white shadow-lg hover:bg-alpine-600"
        title={`Chat with the ${persona.active.voice} concierge`}
      >
        <span className="font-display text-xl">A</span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-30 flex h-[560px] w-[400px] flex-col rounded-2xl border border-sand-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
            <div>
              <div className="font-display text-base">Aurora Concierge</div>
              <div className="text-xs text-sand-600">
                {persona.active.voice === 'member' ? 'Member voice' : 'Shopper voice'} · {language.active}
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-sand-500 hover:text-sand-900" aria-label="Close">×</button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {turns.length === 0 && (
              <div className="rounded-lg border border-dashed border-sand-300 p-4 text-center text-xs text-sand-500">
                {persona.active.voice === 'member'
                  ? 'Member access. Ask me for detailed gear advice, ambassador picks, or member-exclusive recommendations.'
                  : 'Ask me about gear, trails, or what would work for your trip.'}
              </div>
            )}
            {turns.map((turn, idx) => (
              <div key={idx} className={turn.role === 'user' ? 'flex justify-end' : ''}>
                <div
                  className={
                    turn.role === 'user'
                      ? 'max-w-[80%] rounded-2xl bg-alpine-50 px-3 py-2 text-sm text-alpine-700'
                      : 'max-w-full rounded-2xl border border-sand-200 bg-sand-50 px-3 py-2'
                  }
                >
                  <div
                    className="whitespace-pre-wrap text-sm"
                    dangerouslySetInnerHTML={{
                      __html: turn.role === 'assistant' ? formatAssistantHtml(turn.text, persona.active.voice) : turn.text,
                    }}
                  />
                  {turn.citations && turn.citations.length > 0 && (
                    <div className="mt-2 border-t border-sand-200 pt-2 text-xs text-sand-600">
                      Sources: {turn.citations.slice(0, 3).map((c) => c.title).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="border-t border-sand-200 p-3">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder={persona.active.voice === 'member' ? 'Ask anything…' : 'What gear are you looking for?'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={streaming}
              />
              <button type="submit" className="btn-primary !px-3 !py-1.5" disabled={streaming || !input.trim()}>
                {streaming ? '…' : '→'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/**
 * Render assistant text as HTML.
 * - Shopper voice: convert FIRST markdown link to a pill CTA, truncate everything after it.
 * - Member voice: render all links inline; no truncation.
 * - Bold ** ** → <strong>.
 */
function formatAssistantHtml(text: string, voice: 'shopper' | 'member'): string {
  const bolded = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  if (voice === 'member') {
    return bolded.replace(
      /\[([^\]]+)\]\((https?:[^)]+)\)/g,
      (_m, label: string, url: string) => `<a href="${url}" class="text-alpine-600 underline">${label}</a>`,
    );
  }
  // shopper: pill + truncate after first link
  const m = bolded.match(/\[([^\]]+)\]\((https?:[^)]+)\)/);
  if (!m) return bolded;
  const before = bolded.slice(0, m.index ?? 0);
  return `${before}<a href="${m[2]}" class="pill-cta">${m[1]} →</a>`;
}
