import AuroraLogo from './AuroraLogo';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-sand-200 bg-sand-50/50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AuroraLogo className="opacity-70" />
            <span className="text-xs text-sand-600">
              Built for the worst weather. Trail-tested by experts.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wider text-sand-600">
            <span>Powered by</span>
            <span className="chip-alpine">Progress Agentic RAG</span>
            <span>Residency EU</span>
            <span>SOC 2</span>
            <span>GDPR</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
