import { useCallback, useEffect, useRef, useState } from 'react';
import { streamAsk, type Citation } from '../lib/ragClient';
import { buildPrefix } from '../lib/buildPrefix';
import { ctaHrefFor } from '../lib/sanitizeExcerpt';
import { usePersona } from '../context/PersonaContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/conciergeStrings';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  streaming?: boolean;
}

const SHOPPER_PROMPT = {
  system:
    'You are an outdoor-gear concierge for Aurora Outfitters. STRICT RULES: ' +
    '(1) Maximum 3 sentences. ' +
    '(2) End with ONE call-to-action picked from the most-relevant resource\'s callToAction field. ' +
    '(3) Render the call-to-action as a markdown link, e.g. [Get the Aurora Helios →](https://aurora-outfitters.com/products/helios). ' +
    'Use a full https:// URL. Do NOT use relative paths or .md filenames. ' +
    '(4) STOP after the link. ' +
    '(5) Do NOT preface the answer with meta-narration like "Based on the context provided", "According to the retrieved documents", or "The provided sources indicate". Open directly with the substantive answer.',
  user: 'Context: {context}\n\nQuestion: {question}',
};

const MEMBER_PROMPT = {
  system:
    'You are an expert outdoor-gear concierge for Aurora Outfitters Trail Club Pro members. ' +
    'STRICT RULES: ' +
    '(1) HARD CAP — 6 sentences maximum across the entire answer. Count every sentence including ones inside lists. NEVER exceed 6. If you would exceed, end the response immediately. ' +
    '(2) Detailed, multi-source, well-cited — reference ambassador-authored content where relevant. ' +
    '(3) Include member-exclusive recommendations where they fit. ' +
    '(4) Do NOT preface the answer with meta-narration like "Based on the context provided", "According to the retrieved documents", or "The provided sources indicate". Open directly with the substantive answer.',
  user: 'Context (member-exclusive content included): {context}\n\nQuestion: {question}',
};

const FAB_TOOLTIP_KEY = 'aurora.concierge.fab.tooltip-seen';
const CONCIERGE_PREFILL_EVENT = 'aurora.concierge.prefill';

export interface ConciergePrefillDetail {
  question: string;
  autoSend?: boolean;
}

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
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

  // One-time first-visit tooltip on the FAB.
  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(FAB_TOOLTIP_KEY);
      if (!seen) {
        setShowTooltip(true);
        const t = window.setTimeout(() => {
          setShowTooltip(false);
          try { window.localStorage.setItem(FAB_TOOLTIP_KEY, '1'); } catch { /* ignore */ }
        }, 6000);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* localStorage may be unavailable; non-fatal */
    }
  }, []);

  const runQuery = useCallback(async (rawQuery: string) => {
    if (!rawQuery.trim()) return;
    const prefix = buildPrefix({ language: language.active, segment: persona.active.segment });
    const finalQuery = prefix + rawQuery;
    setStreaming(true);
    setTurns((t) => [
      ...t,
      { role: 'user', text: rawQuery },
      { role: 'assistant', text: '', streaming: true },
    ]);

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
      setTurns((t) => {
        const next = [...t];
        const last = next[next.length - 1];
        if (last && last.role === 'assistant') last.streaming = false;
        return next;
      });
    }
  }, [language, persona]);

  // Listen for prefill events from other surfaces (e.g. the Concierge page).
  useEffect(() => {
    function onPrefill(e: Event) {
      const detail = (e as CustomEvent<ConciergePrefillDetail>).detail;
      if (!detail?.question) return;
      setOpen(true);
      setShowTooltip(false);
      if (detail.autoSend) {
        // small delay so the panel mounts before we stream into it
        window.setTimeout(() => { void runQuery(detail.question); }, 80);
      } else {
        setInput(detail.question);
      }
    }
    window.addEventListener(CONCIERGE_PREFILL_EVENT, onPrefill as EventListener);
    return () => window.removeEventListener(CONCIERGE_PREFILL_EVENT, onPrefill as EventListener);
  }, [runQuery]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    const rawQuery = input.trim();
    setInput('');
    await runQuery(rawQuery);
  }

  const isMember = persona.active.voice === 'member';
  // FAB letter = the active persona's first-name initial. Previously this
  // was hardcoded "A" for shopper (intended as the Aurora brand mark) and
  // "TC" for member, which read as a persona-initial mismatch on testing.
  const fabInitial = (persona.active.displayName?.split(/[\s·]+/)[0]?.charAt(0) ?? 'A').toUpperCase();
  const fabLabel = `Open Aurora concierge chat — ${isMember ? 'member' : 'shopper'} voice`;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-30">
        {showTooltip && !open && (
          <div
            role="status"
            className="absolute -top-2 right-16 w-56 -translate-y-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-xs text-sand-700 shadow-lg"
          >
            <div className="eyebrow-ai"><span className="ai-dot" /> Aurora concierge</div>
            <div className="mt-1">Ask anything — the voice adapts to who you are.</div>
            <span className="absolute -bottom-1 right-6 h-2 w-2 rotate-45 border-b border-r border-sand-200 bg-white" />
          </div>
        )}
        <button
          type="button"
          onClick={() => { setOpen((o) => !o); setShowTooltip(false); }}
          aria-label={fabLabel}
          aria-expanded={open}
          className={
            'relative grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition-colors ' +
            (isMember
              ? 'bg-alpine-600 ring-2 ring-rust-300 ring-offset-2 ring-offset-sand-50 hover:bg-alpine-700'
              : 'bg-alpine-500 hover:bg-alpine-600')
          }
        >
          {!open && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-alpine-500/30"
              style={{ animationDuration: '2.4s' }}
            />
          )}
          <span aria-hidden="true" className="relative font-display text-xl leading-none">
            {fabInitial}
          </span>
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-alpine-400"
          />
          {isMember && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-2 rounded-full bg-rust-500 px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide text-white shadow"
            >
              PRO
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed bottom-24 right-6 z-30 flex h-[560px] w-[400px] flex-col rounded-2xl border border-sand-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
            <div>
              <div className="font-display text-base">Aurora Concierge</div>
              <div className="text-xs text-sand-600">
                {isMember ? t(language.active, 'memberVoice') : t(language.active, 'shopperVoice')} · {language.active}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTurns([])}
                disabled={turns.length === 0}
                className="rounded-full border border-sand-200 bg-white px-2.5 py-1 text-[11px] font-medium text-sand-700 hover:border-alpine-300 hover:text-alpine-700 transition disabled:cursor-default disabled:opacity-40"
                title="Clear chat and start over"
              >
                {t(language.active, 'newQuestion')}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t(language.active, 'closeAriaLabel')}
                className="rounded-full p-1.5 text-sand-600 hover:bg-sand-100 transition"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {turns.length === 0 && (
              <div className="rounded-lg border border-dashed border-sand-300 p-4 text-center text-xs text-sand-500">
                {isMember
                  ? t(language.active, 'emptyStateMember')
                  : t(language.active, 'emptyStateShopper')}
              </div>
            )}
            {turns.map((turn, idx) => (
              <TurnView
                key={idx}
                turn={turn}
                voice={persona.active.voice}
                isMember={isMember}
                language={language.active}
              />
            ))}
          </div>

          <form onSubmit={onSubmit} className="border-t border-sand-200 p-3">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder={
                  isMember
                    ? t(language.active, 'inputPlaceholderMember')
                    : t(language.active, 'inputPlaceholderShopper')
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={streaming}
                aria-label={
                  isMember
                    ? t(language.active, 'inputPlaceholderMember')
                    : t(language.active, 'inputPlaceholderShopper')
                }
              />
              <button
                type="submit"
                className="btn-primary !px-3 !py-1.5 active:scale-[0.95]"
                disabled={streaming || !input.trim()}
                aria-label={t(language.active, 'sendAriaLabel')}
                title={t(language.active, 'sendAriaLabel')}
              >
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
 * Trigger the floating concierge from any other surface.
 * detail.question is required; autoSend defaults to false.
 */
export function dispatchConciergePrefill(detail: ConciergePrefillDetail) {
  window.dispatchEvent(new CustomEvent<ConciergePrefillDetail>(CONCIERGE_PREFILL_EVENT, { detail }));
}

function TurnView({
  turn,
  voice,
  isMember,
  language,
}: {
  turn: Turn;
  voice: 'shopper' | 'member';
  isMember: boolean;
  language: string;
}) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-alpine-50 px-3 py-2 text-sm text-alpine-700">
          {turn.text}
        </div>
      </div>
    );
  }

  const isStreaming = !!turn.streaming;
  // Client-side belt-and-braces sentence cap. The system prompt sets a hard
  // limit (3 shopper / 6 member) but the LLM occasionally overruns when the
  // question invites depth. Truncate at the configured cap so the
  // promise-on-the-card matches what the user sees.
  const cappedText = !isStreaming
    ? capSentences(turn.text, isMember ? 6 : 3)
    : turn.text;
  const html = formatAssistantHtml(cappedText, voice);
  const fallbackCitations = turn.citations && turn.citations.length > 0
    ? turn.citations
    : deriveCitationsFromHtml(html);
  const citationCount = fallbackCitations.length;

  return (
    <div className="flex items-start gap-2">
      <PersonaAvatar voice={voice} />
      <div
        className="max-w-full flex-1 rounded-2xl rounded-tl-sm border border-sand-200 bg-sand-50 px-3 py-2"
        aria-live="polite"
        aria-busy={isStreaming}
      >
        {turn.text ? (
          <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: html }} />
        ) : null}
        {isStreaming && (
          <StreamingIndicator hasText={!!turn.text} />
        )}
        {!isStreaming && fallbackCitations.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {fallbackCitations.slice(0, 5).map((c, i) => {
              const cleanTitle = stripMarkdownHash(c.title);
              const href = ctaHrefFor({ title: cleanTitle, fallbackId: c.id });
              return (
                <a
                  key={`${c.id}-${i}`}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={c.title}
                  className="inline-flex items-center gap-1.5 rounded-full border border-alpine-300 bg-alpine-50/70 px-2.5 py-1 text-[11px] font-medium text-alpine-700 max-w-[260px] truncate transition hover:border-alpine-500 hover:bg-alpine-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alpine-300"
                >
                  <svg viewBox="0 0 16 16" className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="M4 3h6l2 2v8H4z" strokeLinejoin="round" />
                    <path d="M6 7h4M6 10h3" strokeLinecap="round" />
                  </svg>
                  <span className="truncate">{cleanTitle}</span>
                </a>
              );
            })}
          </div>
        )}
        {!isStreaming && (
          <details className="mt-3 group">
            <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-alpine-600 hover:text-alpine-700 select-none">
              <span className="mr-1.5">▸</span> {t(language, 'showHowBuilt')}
            </summary>
            <ol className="mt-2 space-y-1.5 rounded-md border border-sand-200 bg-sand-50/60 p-3 text-[12px] text-sand-700">
              <li className="flex gap-2"><span className="text-alpine-600 font-semibold">1.</span> {t(language, 'pipelineStep1')}</li>
              <li className="flex gap-2"><span className="text-alpine-600 font-semibold">2.</span> {t(language, 'pipelineStep2Template').replace('{n}', citationCount > 0 ? String(citationCount) : 'N')}</li>
              <li className="flex gap-2"><span className="text-alpine-600 font-semibold">3.</span> {isMember ? t(language, 'pipelineStep3MemberTemplate') : t(language, 'pipelineStep3ShopperTemplate')}</li>
              <li className="flex gap-2"><span className="text-alpine-600 font-semibold">4.</span> {t(language, 'pipelineStep4')}</li>
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}

function stripMarkdownHash(s: string): string {
  return (s ?? '').replace(/^#+\s*/, '').trim();
}

/**
 * Cap an LLM answer at N sentences. Preserves any trailing markdown link
 * (the field-engineered CTA) so the shopper-voice promise-of-one-CTA still
 * holds after truncation. Also strips common meta-narration prefaces.
 */
function capSentences(text: string, maxSentences: number): string {
  if (!text) return text;
  // Strip common LLM prefaces that the prompt told it not to use but
  // sometimes slip through anyway.
  let body = text.replace(
    /^\s*(based on (?:the )?(?:context|retrieved|provided)|according to (?:the )?(?:context|retrieved|provided|sources)|the (?:provided|retrieved) (?:context|sources?|documents?) (?:indicates?|shows?|suggests?))[^.!?]*[.!?]\s*/i,
    '',
  );
  // Pull out a trailing markdown link so we can re-attach after truncation.
  const linkMatch = body.match(/\[([^\]]+)\]\(([^)]+)\)\s*$/);
  const trailingLink = linkMatch ? linkMatch[0] : '';
  if (linkMatch) body = body.slice(0, body.length - linkMatch[0].length).trimEnd();
  // Sentence split — naive but good enough for English/Spanish/French/German prose.
  const sentences = body.match(/[^.!?]+[.!?]+["')\]]*\s*/g) ?? [body];
  if (sentences.length <= maxSentences) {
    return (body + (trailingLink ? '\n\n' + trailingLink : '')).trim();
  }
  const capped = sentences.slice(0, maxSentences).join('').trimEnd();
  return (capped + (trailingLink ? '\n\n' + trailingLink : '')).trim();
}

function PersonaAvatar({ voice }: { voice: 'shopper' | 'member' }) {
  const isMember = voice === 'member';
  return (
    <span
      aria-hidden="true"
      className={
        'mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full text-[10px] font-display ' +
        (isMember
          ? 'bg-alpine-600 text-white ring-2 ring-rust-300'
          : 'bg-alpine-500 text-white')
      }
    >
      {isMember ? 'TC' : 'A'}
    </span>
  );
}

function StreamingIndicator({ hasText }: { hasText: boolean }) {
  if (hasText) {
    return (
      <span aria-hidden="true" className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-alpine-500 align-middle" />
    );
  }
  return (
    <div aria-hidden="true" className="flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-alpine-500" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-alpine-500" style={{ animationDelay: '120ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-alpine-500" style={{ animationDelay: '240ms' }} />
    </div>
  );
}

// Synthesise lightweight citations from rendered links if the API returns
// no retrieval citations. Keeps the "Sources" row populated.
function deriveCitationsFromHtml(html: string): Citation[] {
  const out: Citation[] = [];
  const re = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = m[1];
    const label = stripTrailingArrow(m[2]);
    if (url === '#' || !label) continue;
    out.push({ id: url, title: label });
  }
  return out;
}

function stripTrailingArrow(s: string): string {
  return s.replace(/\s*→\s*$/, '').trim();
}

/**
 * Render assistant text as HTML.
 * - Shopper voice: convert FIRST markdown link to a pill CTA, truncate everything after it.
 * - Member voice: render all links inline; no truncation.
 * - Bold ** ** → <strong>.
 *
 * Everything is escaped first so stray '<' or HTML in label text can't break out.
 */
function formatAssistantHtml(text: string, voice: 'shopper' | 'member'): string {
  // Find markdown links FIRST against the raw text so we can capture their
  // label/url with the original characters, then escape everything around them.
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  type Part = { kind: 'text'; value: string } | { kind: 'link'; label: string; url: string };
  const parts: Part[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(text))) {
    if (match.index > lastIndex) parts.push({ kind: 'text', value: text.slice(lastIndex, match.index) });
    parts.push({ kind: 'link', label: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ kind: 'text', value: text.slice(lastIndex) });

  if (voice === 'shopper') {
    // Keep text up to (and including) the first link as a pill CTA. Drop the rest.
    const out: string[] = [];
    let usedLink = false;
    for (const p of parts) {
      if (p.kind === 'text') {
        out.push(renderInlineText(p.value));
      } else if (!usedLink) {
        out.push(`<a href="${escapeAttr(normaliseHref(p.url))}" class="pill-cta">${escapeHtml(p.label)} →</a>`);
        usedLink = true;
        break;
      }
    }
    return out.join('');
  }

  // member: render all links inline
  return parts.map((p) => {
    if (p.kind === 'text') return renderInlineText(p.value);
    return `<a href="${escapeAttr(normaliseHref(p.url))}" class="text-alpine-600 underline">${escapeHtml(p.label)}</a>`;
  }).join('');
}

// Escape raw text, then promote **bold** runs to <strong>. Anything inside the
// bold runs is also escaped — we only emit the <strong> tags ourselves.
function renderInlineText(raw: string): string {
  const escaped = escapeHtml(raw);
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function normaliseHref(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Relative paths (e.g., a markdown filename the LLM invented) → '#' so
  // the pill stays interactive-looking without navigating away.
  return '#';
}
