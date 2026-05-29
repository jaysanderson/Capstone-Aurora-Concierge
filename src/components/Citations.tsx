import type { Citation } from '../lib/ragClient';

export function Citations({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-sand-200 pt-3">
      <div className="w-full text-xs uppercase tracking-wider text-sand-500">Sources · {citations.length}</div>
      {citations.slice(0, 8).map((c) => (
        <div key={c.id} className="rounded-md border border-sand-300 bg-sand-50 px-2 py-1 text-xs text-sand-700" title={c.id}>
          <span>{c.title}</span>
          {typeof c.confidence === 'number' && (
            <span className="ml-2 text-sand-500">{c.confidence.toFixed(2)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
