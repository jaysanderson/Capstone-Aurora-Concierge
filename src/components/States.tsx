/**
 * Shared empty / loading / error state primitives.
 *
 * Loading and empty states are the #1 tell for "vibe coded" UIs.
 * Centralising them here so every page reaches for the same vocabulary —
 * sand/alpine/rust tones, rounded-2xl, dashed empty surfaces, an
 * understated alpine spinner for inline work, and a rust-tinged error
 * panel that never looks alarming.
 */

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-sand-200 bg-white p-5 ${className ?? ''}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-3 w-20 rounded-full bg-sand-100" />
      <div className="mt-3 h-5 w-3/4 rounded bg-sand-100" />
      <div className="mt-2 h-4 w-full rounded bg-sand-100" />
      <div className="mt-1 h-4 w-5/6 rounded bg-sand-100" />
      <div className="mt-4 h-9 w-full rounded-full bg-sand-100" />
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className ?? ''}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function LoadingSpinner({ label = 'Working' }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-alpine-700">
      <svg
        className="h-4 w-4 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2.5"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span>{label}...</span>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 p-10 text-center">
      <div className="mx-auto h-10 w-10 rounded-full border border-alpine-300 bg-alpine-50 grid place-items-center text-alpine-600">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="mt-4 font-display text-lg text-sand-900">{title}</div>
      <p className="mt-1 text-sm text-sand-700 max-w-md mx-auto">{body}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-full border border-alpine-300 bg-white px-4 py-2 text-xs font-medium text-alpine-700 hover:bg-alpine-50 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-2xl border border-rust-300 bg-rust-50/60 p-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-rust-100 text-rust-700">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-rust-700">
            Something went sideways
          </div>
          <p className="mt-1 text-xs text-sand-800 whitespace-pre-wrap">
            {message}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-xs font-medium text-alpine-700 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
