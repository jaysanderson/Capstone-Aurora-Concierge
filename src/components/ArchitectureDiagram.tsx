import { useEffect, useRef, useState } from 'react';

interface PipelineNode {
  label: string;
  sub: string;
  timing: string;
}

const NODES: PipelineNode[] = [
  { label: 'Customer query', sub: 'natural language', timing: 'instant' },
  { label: 'Embeddings', sub: 'multilingual', timing: '~40ms' },
  { label: 'Hybrid retrieval', sub: 'vector + keyword', timing: '~60ms' },
  { label: 'Reranker', sub: 'cross-encoder', timing: '~80ms' },
  { label: 'LLM', sub: 'BYO — Azure / Vertex / Bedrock', timing: '~240ms' },
  { label: 'Surface', sub: 'chat · JSON · email', timing: 'streamed' },
];

export function ArchitectureDiagram() {
  const ref = useRef<HTMLOListElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.18 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-16">
      {/* Topographic contour-line background */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
      >
        <g fill="none" stroke="#286b88" strokeWidth="1">
          <path d="M0 320 Q 300 230 600 270 T 1200 240" />
          <path d="M0 290 Q 300 195 600 240 T 1200 205" />
          <path d="M0 255 Q 300 160 600 205 T 1200 170" />
          <path d="M0 220 Q 300 125 600 170 T 1200 135" />
          <path d="M0 185 Q 300 90 600 135 T 1200 100" />
          <path d="M0 150 Q 300 55 600 100 T 1200 65" />
        </g>
      </svg>

      <div className="relative">
        <div className="eyebrow-alpine">Inside the experience</div>
        <h2 className="h-section mt-2">How a single answer gets built</h2>
        <p className="mt-2 max-w-3xl text-sm text-sand-700">
          Every surface on this page is the same pipeline expressed differently. Retrieval is grounded; the LLM is
          swappable; the output adapts to where it lands.
        </p>

        <ol
          ref={ref}
          className="relative mt-10 grid grid-flow-col auto-cols-fr items-stretch gap-3 overflow-x-auto pb-2"
        >
          {NODES.map((n, idx) => (
            <li
              key={n.label}
              className="group relative flex flex-col items-stretch"
              style={{
                transition: 'opacity 480ms ease-out, transform 480ms ease-out',
                transitionDelay: `${idx * 90}ms`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
              }}
            >
              <div className="relative flex h-full flex-col rounded-2xl border border-alpine-200 bg-white px-3 py-3 shadow-sm ring-1 ring-alpine-100/40 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-alpine-400 group-hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-alpine-600">
                    Step {idx + 1}
                  </div>
                  <span className="chip-metric border-rust-200 text-rust-700">{n.timing}</span>
                </div>
                <div className="mt-1.5 font-display text-sm text-sand-900">{n.label}</div>
                <div className="mt-0.5 text-[11px] text-sand-600">{n.sub}</div>
              </div>
              {idx < NODES.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-[42%] -right-2.5 hidden -translate-y-1/2 lg:inline"
                >
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                    <path
                      d="M1 7h13"
                      stroke="#c45a2c"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="m12 2 5 5-5 5"
                      stroke="#c45a2c"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </span>
              )}
            </li>
          ))}
        </ol>

        <p className="mt-4 text-[11px] text-sand-600">
          Retrieve, reason, write — every output cites its source and every step is observable.
        </p>
      </div>
    </section>
  );
}
