import type { CompositeStep } from '../lib/compositeRag';
import { LoadingSpinner } from './States';

const STEP_ACCENT: Record<CompositeStep['step'], { dot: string; ring: string; label: string }> = {
  'initial-ask': { dot: 'bg-alpine-500', ring: 'ring-alpine-200', label: 'text-alpine-700' },
  evaluate:     { dot: 'bg-sand-500',   ring: 'ring-sand-200',   label: 'text-sand-800' },
  find:         { dot: 'bg-rust-500',   ring: 'ring-rust-200',   label: 'text-rust-700' },
  graph:        { dot: 'bg-alpine-500', ring: 'ring-alpine-200', label: 'text-alpine-700' },
  're-ask':     { dot: 'bg-rust-500',   ring: 'ring-rust-200',   label: 'text-rust-700' },
};

function CheckGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className="text-white">
      <path
        d="M2.5 6.2l2.4 2.4L9.5 3.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface PipelineStepsProps {
  steps: CompositeStep[];
  /** True while a pipeline run is in-flight — the next step pulses. */
  running?: boolean;
  /**
   * True when downstream work (e.g. the structured email) succeeded after a
   * Timeout step fired. Re-styles the Timeout row as a recovered/green state
   * instead of leaving a persistent orange warning on a successful run.
   */
  recovered?: boolean;
}

export function PipelineSteps({ steps, running = false, recovered = false }: PipelineStepsProps) {
  if (!steps.length) {
    // Two zero-states: idle (waiting on user) vs running (waiting on pipeline).
    // The running variant shows a spinner instead of "click to start" copy so
    // the user knows the pipeline is actually working, not stalled.
    return (
      <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 p-6 text-center">
        {running ? (
          <div className="flex justify-center">
            <LoadingSpinner label="Composite pipeline starting" />
          </div>
        ) : (
          <p className="text-sm text-sand-600">
            No pipeline steps yet. Click &ldquo;Generate winback&rdquo; to start.
          </p>
        )}
      </div>
    );
  }

  return (
    <ol className="relative">
      {steps.map((s, idx) => {
        const accent = STEP_ACCENT[s.step];
        const isLast = idx === steps.length - 1;
        const isRunning = running && isLast;
        // A "Timeout" step is only a warning if nothing downstream succeeded.
        // When the structured email lands afterwards, the pipeline recovered
        // — re-frame as a soft "returned early" note in emerald, not as a
        // permanent orange flag a CMO will read as broken.
        const isTimeout = s.label === 'Timeout';
        const isRecoveredTimeout = isTimeout && recovered;
        const dotClass = isRecoveredTimeout
          ? 'bg-emerald-500 ring-emerald-200'
          : `${accent.dot} ${accent.ring}`;
        const labelClass = isRecoveredTimeout ? 'text-emerald-700' : accent.label;
        const displayLabel = isRecoveredTimeout ? 'Returned early · recovered' : s.label;
        const displayOutcome = isRecoveredTimeout
          ? 'Composite reached the 12s budget; the structured email below was generated from the partial context the pipeline had already retrieved.'
          : s.outcome;
        return (
          <li key={idx} className="relative pl-10 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[14px] top-7 bottom-0 w-px bg-alpine-200"
              />
            )}
            <span
              aria-hidden="true"
              className={`absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white ring-4 ${dotClass} ${isRunning ? 'animate-pulse' : ''}`}
            >
              {isRunning ? idx + 1 : <CheckGlyph />}
            </span>
            <div className={`rounded-lg border bg-white p-3 shadow-sm ${isRecoveredTimeout ? 'border-emerald-200' : 'border-sand-200'}`}>
              <div className="flex items-baseline justify-between gap-3">
                <div className={`font-semibold ${labelClass}`}>{displayLabel}</div>
                {isRunning ? (
                  <LoadingSpinner label="Working" />
                ) : (
                  <div className="chip-metric">{s.durationMs}ms</div>
                )}
              </div>
              <div className="mt-1 text-sm text-sand-700">{displayOutcome}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
