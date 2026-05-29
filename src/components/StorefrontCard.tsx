import type { ResourceHit } from '../lib/ragClient';

interface Props {
  resource: ResourceHit;
}

export function StorefrontCard({ resource }: Props) {
  const display = resource.searchResultDisplay;
  const headline = display?.title ?? resource.title;
  const description = display?.description ?? resource.excerpt;
  const cta = display?.ctaLabel;

  return (
    <article className="card flex flex-col gap-3 hover:border-alpine-400">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lg text-sand-900">{headline}</h3>
        {typeof resource.topScore === 'number' && (
          <span className="badge badge-sand">{resource.topScore.toFixed(2)}</span>
        )}
      </div>
      {description && (
        <p className="text-sm text-sand-700 line-clamp-4">{description}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {resource.classifications.slice(0, 4).map((c, idx) => (
          <span key={idx} className="badge badge-sand !text-[10px]">
            {c.label}
          </span>
        ))}
      </div>
      {cta && (
        <button type="button" className="btn-primary self-start text-xs !py-1.5">
          {cta}
        </button>
      )}
    </article>
  );
}
