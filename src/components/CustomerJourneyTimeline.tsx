interface SessionEvent {
  // accept fixtures with various field names
  page?: string;
  url?: string;
  dwell_seconds?: number;
  dwellSeconds?: number;
  timestamp?: string;
  ts?: string;
  action?: string;
  product?: string;
  device?: string;
  inferred_intent?: string;
  inferredIntent?: string;
}

interface CustomerJourneyTimelineProps {
  customerName?: string;
  sessionHistory: SessionEvent[];
  abandonedItem?: string;
  abandonedAt?: string;
  className?: string;
}

function formatDwell(seconds?: number): string {
  if (seconds == null || Number.isNaN(seconds) || seconds <= 0) return '';
  if (seconds < 60) {
    const s = Math.round(seconds);
    return `0:${s.toString().padStart(2, '0')}`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds - mins * 60);
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function inferIntent(seconds?: number): string {
  if (seconds == null || Number.isNaN(seconds) || seconds <= 0) return 'browsing';
  if (seconds < 10) return 'browsing';
  if (seconds <= 60) return 'evaluating';
  return 'comparing';
}

function labelForEvent(event: SessionEvent): string {
  if (event.page) return event.page;
  if (event.url) return event.url;
  if (event.action && event.product) return `${event.action.replace(/_/g, ' ')} - ${event.product}`;
  if (event.action) return event.action.replace(/_/g, ' ');
  return 'Untitled step';
}

// Render a small time-of-day chip from an ISO-ish timestamp (e.g. 2028-04-12T14:14Z).
function formatTimeOfDay(ts?: string): string | undefined {
  if (!ts) return undefined;
  const match = ts.match(/T(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const hh = Number(match[1]);
  const mm = match[2];
  if (Number.isNaN(hh)) return undefined;
  const meridian = hh >= 12 ? 'pm' : 'am';
  const display = ((hh + 11) % 12) + 1;
  return `${display}:${mm}${meridian}`;
}

// Infer device when the fixture doesn't supply one. Session histories from the
// storefront default to "web" — kept short on purpose for the chip.
function inferDevice(event: SessionEvent): string {
  if (event.device) return event.device;
  return 'web';
}

// Pick a thumbnail block for known SKUs. We keep this as a small, stable
// look-up so we never 404 against a CDN at demo time.
function thumbnailFor(event: SessionEvent): { label: string; tone: 'alpine' | 'rust' | 'sand' } | undefined {
  const haystack = `${event.page ?? ''} ${event.url ?? ''} ${event.product ?? ''}`.toLowerCase();
  if (haystack.includes('terratrek')) return { label: 'TT7', tone: 'alpine' };
  if (haystack.includes('cart')) return { label: 'Cart', tone: 'sand' };
  if (haystack.includes('blog') || haystack.includes('overland')) return { label: 'Guide', tone: 'rust' };
  return undefined;
}

const THUMB_TONE: Record<'alpine' | 'rust' | 'sand', string> = {
  alpine: 'bg-alpine-50 text-alpine-700 ring-alpine-200',
  rust: 'bg-rust-50 text-rust-700 ring-rust-200',
  sand: 'bg-sand-100 text-sand-800 ring-sand-200',
};

function RustDotIcon(): JSX.Element {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <circle cx="4" cy="4" r="4" fill="#c45a2c" />
    </svg>
  );
}

export function CustomerJourneyTimeline({
  customerName,
  sessionHistory,
  abandonedItem,
  abandonedAt,
  className,
}: CustomerJourneyTimelineProps): JSX.Element {
  // Pull the three most informative page-style events (skip pure actions).
  const pageEvents = sessionHistory.filter((e) => e.page || e.url);
  const steps = (pageEvents.length > 0 ? pageEvents : sessionHistory).slice(0, 3);

  return (
    <div className={className ?? ''}>
      {customerName && (
        <div className="mb-3 flex items-baseline gap-2 text-sm text-sand-700">
          <span className="font-semibold text-sand-900">{customerName}</span>
          <span className="text-[10px] uppercase tracking-wider text-sand-500">the customer</span>
          <span className="text-sand-400">·</span>
          <span className="text-sand-500">last 3 session steps</span>
        </div>
      )}

      <ol className="relative">
        {steps.map((event, idx) => {
          const dwell = event.dwell_seconds ?? event.dwellSeconds;
          const intent = event.inferred_intent ?? event.inferredIntent ?? inferIntent(dwell);
          const dwellLabel = formatDwell(dwell);
          const timeLabel = formatTimeOfDay(event.ts ?? event.timestamp);
          const deviceLabel = inferDevice(event);
          const thumb = thumbnailFor(event);
          const isLast = idx === steps.length - 1;

          return (
            <li key={idx} className="relative pl-12 pb-4 last:pb-0">
              {/* Continuous vertical rule connecting all dots. */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-[14px] top-7 bottom-0 w-px bg-alpine-200"
                />
              )}
              {/* Numbered dot. */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full bg-alpine-100 text-xs font-semibold text-alpine-700 ring-4 ring-white"
              >
                {idx + 1}
              </span>

              <div className="flex items-start gap-3">
                {thumb && (
                  <div
                    aria-hidden="true"
                    className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-md text-[10px] font-semibold uppercase tracking-wide ring-1 ${THUMB_TONE[thumb.tone]}`}
                  >
                    {thumb.label}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium text-sand-900">{labelForEvent(event)}</div>
                    {dwellLabel && (
                      <div className="text-[11px] uppercase tracking-wider text-sand-500">{dwellLabel}</div>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {timeLabel && <span className="chip-metric">{timeLabel}</span>}
                    {deviceLabel && <span className="chip-metric">{deviceLabel}</span>}
                    {intent && <span className="chip-alpine">AI: {intent}</span>}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex items-center gap-2 rounded-md border border-rust-300 bg-rust-50 px-3 py-2 text-sm">
        <RustDotIcon />
        <div>
          <span className="font-medium text-rust-700">Cart abandoned</span>
          <span className="text-sand-700"> with {abandonedItem ?? 'item in cart'} - {abandonedAt ?? 'recently'}.</span>
        </div>
      </div>
    </div>
  );
}
