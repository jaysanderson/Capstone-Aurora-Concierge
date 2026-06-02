import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphNode, GraphPath } from '../lib/graphClient';
import { colourForGroup } from '../styles/tokens';
import { LoadingSpinner } from './States';

interface VizNode extends GraphNode {
  id: string;
}
interface VizLink {
  source: string;
  target: string;
  label: string;
}

interface Props {
  paths: GraphPath[];
  onNodeClick?: (node: GraphNode) => void;
  loading?: boolean;
  error?: string | null;
  selectedId?: string | null;
  onResetView?: () => void;
  /** Optional list of node ids that should pulse to invite clicks */
  spotlight?: string[];
  /**
   * Ordered relation labels for the storytelling wave. When a node is
   * selected, edges of relations[i] light up at i * 420ms after selection,
   * one type at a time, so the eye can read each business dimension
   * (worn_by, then has_experience_in, then field_tester_for, ...).
   */
  relationWave?: string[];
}

// --- canvas palette ------------------------------------------------------
// Painted onto the <canvas>, so these are raw hex / rgba, not Tailwind classes.
const BG_SAND = '#fbf7f0';
const BG_SAND_DARK = '#efe6d4';
const AURORA_A = 'rgba(64, 153, 185, 0.18)';   // alpine-bright
const AURORA_B = 'rgba(112, 196, 161, 0.14)';  // mint
const AURORA_C = 'rgba(196, 90, 44, 0.12)';    // rust dawn
const GRID = 'rgba(122, 90, 43, 0.05)';
const NODE_STROKE = '#1f3245';     // alpine-900
const NODE_STROKE_DIM = '#2b4a66'; // alpine-800
const LABEL_DARK = '#241910';
const LABEL_LIGHT_BG = 'rgba(255,255,255,0.92)';

// --- layout constants ---------------------------------------------------
// Generous fit-padding so node + edge label pills (which can extend
// ~80-140px past their anchor point) don't get clipped at the canvas
// edge. The previous value of 40px was tight enough that wider labels
// like "expedition support" and "the European..." clipped on the right.
const FIT_PADDING = 140;
// Edges shorter than this (in world units) skip their relation label —
// they'd otherwise pile up into an unreadable smear in dense clusters.
const EDGE_LABEL_MIN_LEN = 70;

// --- group → display label ----------------------------------------------
const GROUP_LABEL: Record<string, string> = {
  PRODUCT: 'Product',
  CATEGORY: 'Category',
  ACTIVITY: 'Activity',
  DESTINATION: 'Destination',
  AMBASSADOR: 'Ambassador',
  CONTENT: 'Content',
  CUSTOMER_SEGMENT: 'Segment',
  LOYALTY_TIER: 'Loyalty',
  BRAND_PILLAR: 'Pillar',
  SIZING_PROFILE: 'Sizing',
};

export function GraphCanvas({
  paths,
  onNodeClick,
  loading,
  error,
  selectedId,
  onResetView,
  spotlight,
  relationWave,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [hover, setHover] = useState<VizNode | null>(null);
  const [hoverLink, setHoverLink] = useState<{
    source: VizNode;
    target: VizNode;
    label: string;
    x: number;
    y: number;
  } | null>(null);
  const [staggerSeed, setStaggerSeed] = useState(0);
  const [selectionTs, setSelectionTs] = useState(0);
  const [, setTick] = useState(0);

  // Reset the wave clock when the selection changes so the storytelling
  // animation re-fires per click.
  useEffect(() => {
    if (!selectedId) return;
    setSelectionTs(performance.now());
  }, [selectedId]);

  // Centering / fit policy:
  //   - If something is selected, centre on the selected node + zoom in.
  //   - If nothing is selected, fit the whole graph in view.
  // Fire at THREE timings (snap, settle, safety net) so we never strand the
  // user looking at empty canvas because the d3 sim hadn't placed nodes yet.
  useEffect(() => {
    function centreOrFit() {
      if (!fgRef.current) return;
      try {
        if (selectedId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nodes: VizNode[] = (fgRef.current.graphData?.() as any)?.nodes ?? [];
          const n = nodes.find((x) => x.id === selectedId) as VizNode & { x?: number; y?: number } | undefined;
          if (n && typeof n.x === 'number' && typeof n.y === 'number') {
            fgRef.current.centerAt(n.x, n.y, 700);
            fgRef.current.zoom(2.0, 700);
            return;
          }
        }
        fgRef.current.zoomToFit(600, FIT_PADDING);
      } catch {
        /* engine not settled */
      }
    }
    const t1 = window.setTimeout(centreOrFit, 250);
    const t2 = window.setTimeout(centreOrFit, 900);
    const t3 = window.setTimeout(centreOrFit, 1900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths.length, selectedId]);

  // Build viz data + group counts for the legend.
  const { data, legend } = useMemo(() => {
    const nodes = new Map<string, VizNode>();
    const links: VizLink[] = [];
    for (const p of paths) {
      const sId = `${p.source.group}::${p.source.value}`;
      const dId = `${p.destination.group}::${p.destination.value}`;
      if (!nodes.has(sId)) nodes.set(sId, { id: sId, ...p.source });
      if (!nodes.has(dId)) nodes.set(dId, { id: dId, ...p.destination });
      links.push({ source: sId, target: dId, label: p.relation.label });
    }
    const counts = new Map<string, number>();
    for (const n of nodes.values()) {
      counts.set(n.group, (counts.get(n.group) ?? 0) + 1);
    }
    return {
      data: { nodes: [...nodes.values()], links },
      legend: [...counts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [paths]);

  // Trigger entrance fade when the node-set changes.
  useEffect(() => {
    setStaggerSeed(performance.now());
  }, [data.nodes.length]);

  // Drive a 60fps re-render so node pulses + edge flow animate continuously.
  // Cheap: ForceGraph2D's own engine is the heavy thing; this is just a tick.
  useEffect(() => {
    if (data.nodes.length === 0) return;
    let raf = 0;
    const loop = () => {
      setTick((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [data.nodes.length]);

  // Force-graph engine tuning: gentler repulsion + shorter links makes
  // dense neighbourhoods cluster legibly instead of flying apart.
  useEffect(() => {
    if (!fgRef.current) return;
    try {
      fgRef.current.d3Force('charge')?.strength(-260);
      fgRef.current.d3Force('link')?.distance(95);
    } catch {
      /* engine not ready */
    }
  }, [data.nodes.length]);

  function fitToView() {
    if (!fgRef.current) return;
    try {
      fgRef.current.zoomToFit(700, FIT_PADDING);
    } catch {
      /* engine not settled */
    }
  }

  function centerOnSelection() {
    if (!fgRef.current || !selectedId) return;
    const n = data.nodes.find((x) => x.id === selectedId);
    if (!n) return;
    const nx = (n as VizNode & { x?: number }).x ?? 0;
    const ny = (n as VizNode & { y?: number }).y ?? 0;
    try {
      fgRef.current.centerAt(nx, ny, 800);
      fgRef.current.zoom(2.6, 800);
    } catch {
      /* engine not settled */
    }
  }

  const spotlightSet = useMemo(() => new Set(spotlight ?? []), [spotlight]);

  return (
    <div
      ref={wrap}
      className="relative h-[720px] w-full overflow-hidden rounded-2xl border border-sand-200 shadow-aurora"
      style={{
        background: `
          radial-gradient(900px 380px at 50% -10%, ${AURORA_A}, transparent 65%),
          radial-gradient(700px 320px at 18% 0%, ${AURORA_B}, transparent 70%),
          radial-gradient(620px 280px at 88% 8%, ${AURORA_C}, transparent 70%),
          linear-gradient(180deg, ${BG_SAND} 0%, ${BG_SAND_DARK} 100%)
        `,
      }}
    >
      {/* fine topographic grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage: `
            linear-gradient(${GRID} 1px, transparent 1px),
            linear-gradient(90deg, ${GRID} 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 80% 90% at 50% 50%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 90% at 50% 50%, black, transparent)',
        }}
      />

      {error ? (
        <div className="grid h-full place-items-center px-6 text-center text-sm">
          <div className="max-w-md space-y-3 rounded-2xl border border-rust-200 bg-white/90 px-5 py-6 shadow-sm backdrop-blur">
            <div className="eyebrow text-rust-500">Graph unavailable</div>
            <p className="text-sand-700">{error}</p>
            <p className="text-xs text-sand-500">
              The page will retry on next selection; try a suggested chip above.
            </p>
          </div>
        </div>
      ) : data.nodes.length === 0 && loading ? (
        <div className="grid h-full place-items-center px-6 text-center text-sm text-sand-500">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/70 px-6 py-5 backdrop-blur">
            <LoadingSpinner label="Loading the typed entity neighbourhood" />
            <div className="flex items-center gap-2">
              {[0, 150, 300, 450].map((d) => (
                <span
                  key={d}
                  className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-alpine-500"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : data.nodes.length === 0 ? (
        <div className="grid h-full place-items-center px-6 text-center text-sm text-sand-500">
          <div>No paths yet. Try a suggested chip above.</div>
        </div>
      ) : (
        <>
          <ForceGraph2D
            ref={fgRef}
            graphData={data}
            nodeId="id"
            nodeRelSize={6}
            nodeLabel={() => ''}
            linkLabel={(l: VizLink) => l.label}
            backgroundColor="transparent"
            cooldownTicks={140}
            onEngineStop={fitToView}
            /* ---- custom link painter: curved gradient strokes + a flowing
                    bead that runs along edges connected to the selection. */
            linkCanvasObjectMode={() => 'replace'}
            linkCanvasObject={(link: VizLink, ctx, scale) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const s = link.source as any;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const t = link.target as any;
              if (s?.x == null || t?.x == null) return;
              const sx = s.x as number;
              const sy = s.y as number;
              const tx = t.x as number;
              const ty = t.y as number;

              const sId: string = typeof s === 'string' ? s : s.id;
              const tId: string = typeof t === 'string' ? t : t.id;
              const isTouched =
                !!selectedId && (sId === selectedId || tId === selectedId);

              // Storytelling wave: each relation label lights up sequentially.
              // Edges not yet "lit" are dim; once lit, they stay highlighted.
              let waveLit = true;
              if (isTouched && relationWave && relationWave.length > 0) {
                const idx = relationWave.indexOf(link.label);
                if (idx >= 0) {
                  const litAt = idx * 420;
                  const elapsed = performance.now() - selectionTs;
                  waveLit = elapsed >= litAt;
                }
              }
              const emphasised = isTouched && waveLit;

              const sColor = colourForGroup(s.group ?? '');
              const tColor = colourForGroup(t.group ?? '');

              // Gentle quadratic curve for character.
              const mx = (sx + tx) / 2;
              const my = (sy + ty) / 2;
              const dx = tx - sx;
              const dy = ty - sy;
              const len = Math.max(1, Math.hypot(dx, dy));
              const nx = -dy / len;
              const ny = dx / len;
              const curveAmt = Math.min(28, len * 0.18);
              const cx = mx + nx * curveAmt;
              const cy = my + ny * curveAmt;

              const grad = ctx.createLinearGradient(sx, sy, tx, ty);
              grad.addColorStop(0, sColor + (emphasised ? 'F0' : isTouched ? '90' : '40'));
              grad.addColorStop(1, tColor + (emphasised ? 'F0' : isTouched ? '90' : '40'));

              ctx.save();
              ctx.lineWidth = (emphasised ? 1.9 : isTouched ? 1.2 : 0.9) / scale;
              ctx.strokeStyle = grad;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.quadraticCurveTo(cx, cy, tx, ty);
              ctx.stroke();

              // Flowing bead only on edges that have been lit by the wave.
              if (emphasised) {
                const now = performance.now();
                const phase = ((now / 1400) % 1);
                // quadratic Bezier point at t = phase
                const u = 1 - phase;
                const bx = u * u * sx + 2 * u * phase * cx + phase * phase * tx;
                const by = u * u * sy + 2 * u * phase * cy + phase * phase * ty;
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.9;
                ctx.beginPath();
                ctx.arc(bx, by, 2.4 / scale, 0, 2 * Math.PI);
                ctx.fill();
                ctx.globalAlpha = 0.35;
                ctx.beginPath();
                ctx.arc(bx, by, 5.5 / scale, 0, 2 * Math.PI);
                ctx.fill();
                ctx.globalAlpha = 1;
              }

              // Relation label on every edge touching the selection — without
              // these, the canvas shows that things are connected but never
              // says WHY ("worn_by", "used_in", "wins_against"). Only render
              // on touched edges so the overview canvas stays uncluttered.
              // Skip very short edges so labels don't pile up into an
              // unreadable smear in dense clusters.
              // TODO: edge-label collision mitigation — for medium-length
              // edges that still overlap, consider alternating perpendicular
              // offsets keyed off a stable index hash of the label.
              if (isTouched && link.label && len >= EDGE_LABEL_MIN_LEN) {
                const label = link.label.length > 22
                  ? `${link.label.slice(0, 20)}…`
                  : link.label;
                // Label sits at the curve's midpoint (Bezier t=0.5).
                const lx = 0.25 * sx + 0.5 * cx + 0.25 * tx;
                const ly = 0.25 * sy + 0.5 * cy + 0.25 * ty;
                const fontPx = 10 / scale;
                ctx.font = `500 ${fontPx}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const textW = ctx.measureText(label).width;
                const padX = 4 / scale;
                const padY = 2 / scale;
                const pillW = textW + padX * 2;
                const pillH = fontPx + padY * 2;
                // White pill background for legibility over coloured gradient strokes.
                ctx.fillStyle = emphasised
                  ? 'rgba(255,255,255,0.96)'
                  : 'rgba(255,255,255,0.82)';
                roundRect(ctx, lx - pillW / 2, ly - pillH / 2, pillW, pillH, 3 / scale);
                ctx.fill();
                ctx.lineWidth = 0.5 / scale;
                ctx.strokeStyle = emphasised
                  ? 'rgba(15, 76, 129, 0.45)'   // alpine-700 @ 45% — match emphasised edges
                  : 'rgba(122, 90, 43, 0.25)';  // sand-600 @ 25% — subtle for dim
                ctx.stroke();
                ctx.fillStyle = emphasised ? '#194256' : '#3a2a18'; // alpine-700 / sand-800
                ctx.fillText(label, lx, ly);
              }
              ctx.restore();
            }}
            linkDirectionalArrowLength={0}
            /* ---- custom node painter: halo + filled disc + label pill ---- */
            nodeCanvasObjectMode={() => 'replace'}
            nodeCanvasObject={(node: VizNode, ctx, scale) => {
              const x = (node as VizNode & { x?: number }).x ?? 0;
              const y = (node as VizNode & { y?: number }).y ?? 0;

              // Per-node entrance fade.
              const sinceSeed = (performance.now() - staggerSeed) / 1000;
              const hash = simpleHash(node.id) % 600;
              const localT = sinceSeed - hash / 1000;
              const alpha = Math.max(0, Math.min(1, localT * 1.6));

              const color = colourForGroup(node.group);
              const isSelected = selectedId === node.id;
              const isSpotlit = spotlightSet.has(node.id);
              const isHover = hover?.id === node.id;
              const baseR = isSelected ? 9 : isHover ? 7 : 5.2;

              ctx.save();
              ctx.globalAlpha = alpha;

              // Outer aurora halo for selected / spotlit / hover.
              if (isSelected || isSpotlit || isHover) {
                const now = performance.now();
                const pulse =
                  0.5 +
                  0.5 *
                    Math.sin(
                      (now / (isSelected ? 700 : 1100)) +
                        (isSpotlit ? simpleHash(node.id) % 7 : 0),
                    );
                const haloR = baseR + 6 + pulse * 4;
                const haloGrad = ctx.createRadialGradient(x, y, baseR, x, y, haloR);
                haloGrad.addColorStop(0, color + '55');
                haloGrad.addColorStop(1, color + '00');
                ctx.fillStyle = haloGrad;
                ctx.beginPath();
                ctx.arc(x, y, haloR, 0, 2 * Math.PI);
                ctx.fill();
              }

              // Disc
              ctx.beginPath();
              ctx.arc(x, y, baseR, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
              ctx.lineWidth = (isSelected ? 1.8 : 1) / scale;
              ctx.strokeStyle = isSelected ? NODE_STROKE : NODE_STROKE_DIM;
              ctx.stroke();

              // Inner sheen
              const sheen = ctx.createRadialGradient(
                x - baseR * 0.35,
                y - baseR * 0.4,
                0,
                x,
                y,
                baseR,
              );
              sheen.addColorStop(0, 'rgba(255,255,255,0.55)');
              sheen.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.fillStyle = sheen;
              ctx.beginPath();
              ctx.arc(x, y, baseR, 0, 2 * Math.PI);
              ctx.fill();

              // Label pill — only at sufficient zoom or when emphasized.
              const showLabel = scale > 1.05 || isSelected || isHover || isSpotlit;
              if (showLabel) {
                const label =
                  node.value.length > 28
                    ? `${node.value.slice(0, 26)}…`
                    : node.value;
                const fontPx = (isSelected ? 12 : 11) / scale;
                ctx.font = `500 ${fontPx}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const textW = ctx.measureText(label).width;
                const padX = 5 / scale;
                const padY = 3 / scale;
                const pillX = x - textW / 2 - padX;
                const pillY = y + baseR + 6 / scale;
                const pillW = textW + padX * 2;
                const pillH = fontPx + padY * 2;

                ctx.fillStyle = LABEL_LIGHT_BG;
                roundRect(ctx, pillX, pillY, pillW, pillH, 4 / scale);
                ctx.fill();
                ctx.lineWidth = 0.6 / scale;
                ctx.strokeStyle = 'rgba(122,90,43,0.18)';
                ctx.stroke();

                ctx.fillStyle = LABEL_DARK;
                ctx.fillText(label, x, pillY + pillH / 2);
              }
              ctx.restore();
            }}
            onNodeClick={(n: VizNode) => onNodeClick?.(n)}
            onNodeHover={(n: VizNode | null) => setHover(n)}
            /* Generous, invisible hit area so a CMO doesn't have to pixel-hunt
               the 7px disc. Painted offscreen by ForceGraph; never visible. */
            nodePointerAreaPaint={(node: VizNode, color: string, ctx: CanvasRenderingContext2D) => {
              const x = (node as VizNode & { x?: number }).x ?? 0;
              const y = (node as VizNode & { y?: number }).y ?? 0;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(x, y, 14, 0, 2 * Math.PI);
              ctx.fill();
            }}
            onLinkHover={(link: VizLink | null) => {
              if (!link) { setHoverLink(null); return; }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const s = link.source as any;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const t = link.target as any;
              if (!s || !t || s.x == null || t.x == null) { setHoverLink(null); return; }
              setHoverLink({
                source: s as VizNode,
                target: t as VizNode,
                label: link.label,
                x: (s.x + t.x) / 2,
                y: (s.y + t.y) / 2,
              });
            }}
          />

          {/* Legend (top-left) */}
          <div className="pointer-events-none absolute left-3 top-3 max-w-[220px] rounded-xl border border-sand-200/80 bg-white/85 px-3 py-2.5 shadow-sm backdrop-blur">
            <div className="eyebrow-alpine">In view</div>
            <ul className="mt-1.5 grid grid-cols-1 gap-y-1 text-[11px]">
              {legend.map(([grp, count]) => (
                <li key={grp} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white"
                    style={{ background: colourForGroup(grp) }}
                  />
                  <span className="text-sand-800">{GROUP_LABEL[grp] ?? grp}</span>
                  <span className="ml-auto tabular text-sand-500">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Edge-flow legend hint (bottom-left) */}
          {selectedId && (
            <div className="pointer-events-none absolute left-3 bottom-3 rounded-full border border-alpine-200 bg-white/85 px-3 py-1 text-[11px] text-alpine-700 shadow-sm backdrop-blur">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-alpine-500 align-middle" />
              Edges flowing from selection
            </div>
          )}

          {/* Controls (bottom-right) */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={fitToView}
              className="rounded-md border border-sand-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-sand-700 shadow-sm hover:bg-sand-100 transition"
            >
              Reset view
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={centerOnSelection}
                className="rounded-md border border-sand-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-sand-700 shadow-sm hover:bg-sand-100 transition"
              >
                Zoom to selection
              </button>
            )}
            {onResetView && (
              <button
                type="button"
                onClick={onResetView}
                className="rounded-md border border-sand-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-sand-700 shadow-sm hover:bg-sand-100 transition"
              >
                Back to overview
              </button>
            )}
          </div>
        </>
      )}

      {/* Hover card — node */}
      {hover && !hoverLink && (
        <div className="pointer-events-none absolute right-4 top-4 max-w-xs rounded-xl border border-sand-200 bg-white/95 px-3 py-2 text-xs text-sand-900 shadow-md backdrop-blur">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: colourForGroup(hover.group) }}
            />
            <span className="eyebrow-alpine">{GROUP_LABEL[hover.group] ?? hover.group}</span>
          </div>
          <div className="mt-1 font-medium leading-tight">{hover.value}</div>
        </div>
      )}

      {/* Hover card — edge: shows source → label → target as the AI sees it */}
      {hoverLink && (
        <div className="pointer-events-none absolute right-4 top-4 max-w-sm rounded-xl border border-alpine-200 bg-white/95 px-3 py-2.5 text-xs text-sand-900 shadow-md backdrop-blur">
          <div className="eyebrow-alpine">Typed relation</div>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: `${colourForGroup(hoverLink.source.group)}18`,
                color: colourForGroup(hoverLink.source.group),
                border: `1px solid ${colourForGroup(hoverLink.source.group)}`,
              }}
            >
              <span className="h-1 w-1 rounded-full" style={{ background: colourForGroup(hoverLink.source.group) }} />
              {hoverLink.source.value}
            </span>
            <span className="text-alpine-600">→</span>
            <span className="italic text-alpine-700 font-semibold">{hoverLink.label}</span>
            <span className="text-alpine-600">→</span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: `${colourForGroup(hoverLink.target.group)}18`,
                color: colourForGroup(hoverLink.target.group),
                border: `1px solid ${colourForGroup(hoverLink.target.group)}`,
              }}
            >
              <span className="h-1 w-1 rounded-full" style={{ background: colourForGroup(hoverLink.target.group) }} />
              {hoverLink.target.value}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-sand-600">
            One of {' '}
            <span className="tabular font-semibold text-sand-800">108+</span>
            {' '}
            relations the data-augmentation agent extracted autonomously.
          </div>
        </div>
      )}
    </div>
  );
}

// ----- helpers --------------------------------------------------------------

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
