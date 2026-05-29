import { useCallback, useEffect, useMemo, useState } from 'react';
import { find, askSync, type FindResult, type AskSyncResult } from '../lib/ragClient';
import { StorefrontCard } from '../components/StorefrontCard';

const CONTENT_TYPES = [
  { label: 'All', value: null },
  { label: 'Products', value: '/classification.labels/content_type/product' },
  { label: 'Trail Guides', value: '/classification.labels/content_type/trail_guide' },
  { label: 'Gear Reviews', value: '/classification.labels/content_type/gear_review' },
  { label: 'Ambassador Video', value: '/classification.labels/content_type/ambassador_video' },
  { label: 'Loyalty', value: '/classification.labels/content_type/loyalty_benefit' },
];

export function Storefront() {
  const [query, setQuery] = useState('I need a boot for the Overland Track in November.');
  const [debounced, setDebounced] = useState(query);
  const [contentType, setContentType] = useState<string | null>(null);
  const [result, setResult] = useState<FindResult | null>(null);
  const [summary, setSummary] = useState<AskSyncResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 500);
    return () => clearTimeout(t);
  }, [query]);

  const filters = useMemo(
    () => (contentType ? [contentType] : []),
    [contentType],
  );

  const run = useCallback(async () => {
    if (!debounced.trim()) return;
    setLoading(true);
    try {
      const [r, s] = await Promise.allSettled([
        find({ query: debounced, pageSize: 9, filters }),
        askSync({ query: debounced, filters, maxTokens: 260 }),
      ]);
      setResult(r.status === 'fulfilled' ? r.value : null);
      setSummary(s.status === 'fulfilled' ? s.value : null);
    } finally {
      setLoading(false);
    }
  }, [debounced, filters]);

  useEffect(() => { run(); }, [run]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl text-sand-900">Conversational discovery</h1>
        <p className="mt-1 text-sm text-sand-700">Hybrid retrieval over products, guides, reviews, ambassador content. CTAs are picked from custom fields on each resource.</p>
      </header>

      <div className="mt-6 space-y-3">
        <input className="input text-lg" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask anything…" />
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct.label}
              type="button"
              onClick={() => setContentType(contentType === ct.value ? null : ct.value)}
              className={`chip ${contentType === ct.value ? 'chip-active' : ''}`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {summary && summary.answer && (
        <div className="mt-8 card border-alpine-400 bg-alpine-50">
          <div className="text-xs uppercase tracking-wider text-alpine-600">Aurora AI summary</div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-sand-900">{summary.answer}</p>
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <div className="col-span-full text-center text-sm text-sand-500">Searching…</div>
        )}
        {!loading && result && Object.values(result.resources).map((r) => (
          <StorefrontCard key={r.id} resource={r} />
        ))}
        {!loading && result && Object.keys(result.resources).length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-sand-300 p-12 text-center text-sm text-sand-500">
            No matches. Try a different query.
          </div>
        )}
      </div>
    </div>
  );
}
