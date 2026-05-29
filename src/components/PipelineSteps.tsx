import type { CompositeStep } from '../lib/compositeRag';

const STEP_COLOURS: Record<CompositeStep['step'], string> = {
  'initial-ask': 'border-alpine-400 bg-alpine-50 text-alpine-700',
  evaluate: 'border-sand-400 bg-sand-100 text-sand-800',
  find: 'border-rust-400 bg-rust-50 text-rust-600',
  graph: 'border-alpine-300 bg-alpine-50 text-alpine-600',
  're-ask': 'border-rust-500 bg-rust-50 text-rust-700',
};

export function PipelineSteps({ steps }: { steps: CompositeStep[] }) {
  if (!steps.length) {
    return (
      <div className="rounded-lg border border-dashed border-sand-300 p-6 text-center text-sm text-sand-500">
        No pipeline steps yet. Click "Generate winback" to start.
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {steps.map((s, idx) => (
        <li key={idx} className={`flex items-start gap-3 rounded-lg border bg-white p-3 ${STEP_COLOURS[s.step]}`}>
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold">
            {idx + 1}
          </span>
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <div className="font-semibold">{s.label}</div>
              <div className="text-xs text-sand-500">{s.durationMs}ms</div>
            </div>
            <div className="mt-1 text-sm">{s.outcome}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
