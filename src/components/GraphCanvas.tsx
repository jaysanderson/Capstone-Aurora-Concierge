import { useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphNode, GraphPath } from '../lib/graphClient';
import { colourForGroup } from '../styles/tokens';

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
}

export function GraphCanvas({ paths, onNodeClick }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<VizNode | null>(null);

  const data = useMemo(() => {
    const nodes = new Map<string, VizNode>();
    const links: VizLink[] = [];
    for (const p of paths) {
      const sId = `${p.source.group}::${p.source.value}`;
      const dId = `${p.destination.group}::${p.destination.value}`;
      if (!nodes.has(sId)) nodes.set(sId, { id: sId, ...p.source });
      if (!nodes.has(dId)) nodes.set(dId, { id: dId, ...p.destination });
      links.push({ source: sId, target: dId, label: p.relation.label });
    }
    return { nodes: [...nodes.values()], links };
  }, [paths]);

  return (
    <div ref={wrap} className="relative h-[640px] w-full overflow-hidden rounded-2xl border border-sand-200 bg-white">
      {data.nodes.length === 0 ? (
        <div className="grid h-full place-items-center text-sm text-sand-500">
          The journey graph is empty. Configure the Aurora data-augmentation agent (`scripts/graph-agent.py`) and run extraction.
        </div>
      ) : (
        <ForceGraph2D
          graphData={data}
          nodeId="id"
          nodeLabel={(n: VizNode) => `${n.value}\n${n.group}`}
          nodeColor={(n: VizNode) => colourForGroup(n.group)}
          linkLabel={(l: VizLink) => l.label}
          linkColor={() => 'rgba(122, 90, 43, 0.35)'}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          backgroundColor="transparent"
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(node: VizNode, ctx, scale) => {
            const label = node.value.length > 26 ? `${node.value.slice(0, 24)}…` : node.value;
            ctx.font = `${11 / scale}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#3a2a18';
            ctx.fillText(label, (node as VizNode & { x: number }).x ?? 0, ((node as VizNode & { y: number }).y ?? 0) + 8);
          }}
          onNodeClick={(n: VizNode) => onNodeClick?.(n)}
          onNodeHover={(n: VizNode | null) => setHover(n)}
        />
      )}
      {hover && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-xs rounded-md border border-sand-300 bg-white/95 px-3 py-2 text-xs text-sand-900 shadow">
          <div className="font-medium">{hover.value}</div>
          <div className="text-sand-600">{hover.group}</div>
        </div>
      )}
    </div>
  );
}
