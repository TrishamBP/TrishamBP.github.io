import { motion } from "motion/react";
import { useMemo, useRef, useState, type ReactNode, type PointerEvent, type WheelEvent } from "react";
import { bezier, clamp01, easeInOut, edgeGeom, size } from "./geometry";
import type { DEdge, DNode, NodeKind, NodeStatus, Packet, Tone } from "./types";

export const KIND_COLOR: Record<NodeKind, string> = {
  client: "#cbd5e1", edge: "#fbbf24", gateway: "#f59e0b", presentation: "#fb7185",
  product: "#fb923c", service: "#38bdf8", db: "#a78bfa", cache: "#f87171",
  queue: "#4ade80", external: "#64748b",
};
export const KIND_LABEL: Record<NodeKind, string> = {
  client: "Client", edge: "Edge / proxy", gateway: "API gateway", presentation: "Presentation service",
  product: "Product service", service: "Domain microservice", db: "Database", cache: "Cache",
  queue: "Message queue", external: "External",
};
export const TONE_COLOR: Record<Tone, string> = { req: "#38bdf8", res: "#4ade80", err: "#f43f5e", evt: "#facc15" };

export interface DiagramProps {
  width: number;
  height: number;
  nodes: DNode[];
  edges: DEdge[];
  packets?: Packet[];
  /** Step progress 0..1 that drives packet positions. */
  t?: number;
  active?: string[];
  status?: Record<string, NodeStatus>;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  /** Extra SVG drawn under the nodes (group boxes, layer bands...). */
  underlay?: ReactNode;
  overlay?: ReactNode;
  ariaLabel: string;
  zoomable?: boolean;
  minHeight?: number;
}

export function Diagram(p: DiagramProps) {
  const byId = useMemo(() => new Map(p.nodes.map((n) => [n.id, n])), [p.nodes]);
  const active = useMemo(() => new Set(p.active ?? []), [p.active]);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const vw = p.width / view.k, vh = p.height / view.k;
  const zoom = (f: number) =>
    setView((v) => {
      const k = Math.max(1, Math.min(3, v.k * f));
      const cx = v.x + p.width / v.k / 2, cy = v.y + p.height / v.k / 2;
      return clampView({ k, x: cx - p.width / k / 2, y: cy - p.height / k / 2 });
    });
  const clampView = (v: { x: number; y: number; k: number }) => ({
    k: v.k,
    x: Math.max(0, Math.min(p.width - p.width / v.k, v.x)),
    y: Math.max(0, Math.min(p.height - p.height / v.k, v.y)),
  });

  const onWheel = (e: WheelEvent) => {
    if (!p.zoomable || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };
  const onDown = (e: PointerEvent) => {
    if (!p.zoomable || view.k === 1) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    const el = svgRef.current;
    if (!d || !el) return;
    const scale = vw / el.getBoundingClientRect().width;
    setView((v) => clampView({ k: v.k, x: d.vx - (e.clientX - d.x) * scale, y: d.vy - (e.clientY - d.y) * scale }));
  };
  const onUp = () => (drag.current = null);

  return (
    <div className="relative rounded-xl border border-lab-line bg-lab-bg">
      {p.zoomable && (
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          {[["−", () => zoom(1 / 1.25), "Zoom out"], ["Fit", () => setView({ x: 0, y: 0, k: 1 }), "Reset zoom"], ["+", () => zoom(1.25), "Zoom in"]].map(
            ([l, f, a]) => (
              <button key={a as string} type="button" aria-label={a as string} onClick={f as () => void}
                className="h-7 min-w-7 rounded-md border border-lab-line bg-lab-panel/90 px-2 text-xs text-lab-muted hover:text-white">
                {l as string}
              </button>
            ),
          )}
        </div>
      )}
      <svg
        ref={svgRef}
        role="img"
        aria-label={p.ariaLabel}
        viewBox={`${view.x} ${view.y} ${vw} ${vh}`}
        className="block h-auto w-full select-none"
        style={{ minHeight: p.minHeight, cursor: p.zoomable && view.k > 1 ? "grab" : undefined, touchAction: view.k > 1 ? "none" : undefined }}
        onWheel={onWheel}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onClick={(e) => { if (e.target === e.currentTarget) p.onSelect?.(null); }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#475569" />
          </marker>
          <marker id="arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
          </marker>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {p.underlay}

        {p.edges.map((e) => {
          const a = byId.get(e.from), b = byId.get(e.to);
          if (!a || !b) return null;
          const g = edgeGeom(a, b, e.curve);
          const hot = active.has(e.from) && active.has(e.to);
          const hidden = e.hidden || a.hidden || b.hidden;
          return (
            <motion.g key={e.id} initial={false} animate={{ opacity: hidden ? 0 : 1 }} transition={{ duration: 0.4 }}>
              <motion.path
                initial={false}
                animate={{ d: g.d }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                fill="none"
                stroke={hot ? "#94a3b8" : "#334155"}
                strokeWidth={hot ? 2 : 1.5}
                strokeDasharray={e.dashed ? "5 5" : undefined}
                markerEnd={hot ? "url(#arrow-hot)" : "url(#arrow)"}
              />
              {e.label && !hidden && (
                <text x={g.mid.x} y={g.mid.y - 6} textAnchor="middle" fontSize="10.5" fill="#94a3b8" fontFamily="var(--font-mono)">
                  {e.label}
                </text>
              )}
            </motion.g>
          );
        })}

        {p.nodes.map((n) => (
          <NodeView key={n.id} n={n} active={active.has(n.id)} status={p.status?.[n.id] ?? "ok"}
            selected={p.selected === n.id} onSelect={p.onSelect} />
        ))}

        {(p.packets ?? []).map((pk, i) => <PacketView key={i} pk={pk} t={p.t ?? 0} byId={byId} edges={p.edges} />)}

        {p.overlay}
      </svg>
    </div>
  );
}

function NodeView({ n, active, status, selected, onSelect }: {
  n: DNode; active: boolean; status: NodeStatus; selected: boolean; onSelect?: (id: string) => void;
}) {
  const { w, h } = size(n);
  const color = status === "down" ? "#f43f5e" : KIND_COLOR[n.kind];
  const fill = status === "down" ? "#3b0d18" : status === "hot" || status === "degraded" ? "#3a1d0c" : active ? "#1b2a47" : "#111a2e";
  const stroke = selected ? "#ffffff" : status === "hot" ? "#fb923c" : status === "degraded" ? "#fbbf24" : color;
  const opacity = n.hidden ? 0 : status === "dim" ? 0.35 : 1;
  const clickable = !!onSelect && !!n.info;
  const shape = n.shape ?? "rect";

  return (
    <motion.g
      initial={false}
      animate={{ x: n.x, y: n.y, opacity }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      style={{ cursor: clickable ? "pointer" : "default", pointerEvents: n.hidden ? "none" : "auto" }}
      onClick={(e) => { e.stopPropagation(); if (clickable) onSelect!(n.id); }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Inspect ${n.label}` : undefined}
      onKeyDown={(e) => { if (clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect!(n.id); } }}
    >
      {active && <rect x={-w / 2 - 4} y={-h / 2 - 4} width={w + 8} height={h + 8} rx={14} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={6} filter="url(#glow)" />}
      {shape === "circle" ? (
        <circle r={w / 2} fill={fill} stroke={stroke} strokeWidth={selected ? 2.5 : 1.5} />
      ) : shape === "cylinder" ? (
        <g>
          <path d={`M${-w / 2},${-h / 2 + 7} v${h - 14} a${w / 2},7 0 0 0 ${w},0 v${-(h - 14)}`} fill={fill} stroke={stroke} strokeWidth={selected ? 2.5 : 1.5} />
          <ellipse cy={-h / 2 + 7} rx={w / 2} ry={7} fill={fill} stroke={stroke} strokeWidth={selected ? 2.5 : 1.5} />
        </g>
      ) : (
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={shape === "phone" ? 12 : shape === "bar" ? 4 : 9}
          fill={fill} stroke={stroke} strokeWidth={selected ? 2.5 : 1.5} />
      )}
      {shape !== "circle" && shape !== "cylinder" && <rect x={-w / 2} y={-h / 2} width={4} height={h} rx={2} fill={color} opacity={0.9} />}
      <text textAnchor="middle" y={n.sub ? -2 : 4} fontSize={shape === "circle" ? 11 : 12.5} fontWeight={600} fill="#e6edf7">{n.label}</text>
      {n.sub && <text textAnchor="middle" y={13} fontSize="10" fill="#94a3b8" fontFamily="var(--font-mono)">{n.sub}</text>}
      {status === "down" && <text textAnchor="middle" y={-h / 2 - 8} fontSize="10" fontWeight={700} fill="#f43f5e">DOWN</text>}
      {status === "degraded" && <text textAnchor="middle" y={-h / 2 - 8} fontSize="10" fontWeight={700} fill="#fbbf24">DEGRADED</text>}
      {status === "hot" && <text textAnchor="middle" y={-h / 2 - 8} fontSize="10" fontWeight={700} fill="#fb923c">OVERLOADED</text>}
    </motion.g>
  );
}

function PacketView({ pk, t, byId, edges }: { pk: Packet; t: number; byId: Map<string, DNode>; edges: DEdge[] }) {
  const e = edges.find((x) => x.id === pk.edge);
  if (!e) return null;
  const a = byId.get(e.from), b = byId.get(e.to);
  if (!a || !b) return null;
  const [s0, s1] = pk.at ?? [0, 1];
  const local = clamp01((t - s0) / Math.max(1e-6, s1 - s0));
  if (t < s0 || t > s1 + 0.0001 || local <= 0 || local >= 1) return null;
  const g = edgeGeom(a, b, e.curve);
  const u = easeInOut(pk.reverse ? 1 - local : local);
  const pt = bezier(g.p0, g.c, g.p2, u);
  const color = TONE_COLOR[pk.tone ?? (pk.reverse ? "res" : "req")];
  return (
    <g transform={`translate(${pt.x},${pt.y})`} pointerEvents="none">
      <circle r={9} fill={color} opacity={0.25} />
      <circle r={5} fill={color} filter="url(#glow)" />
      {pk.label && (
        <g transform="translate(0,-16)">
          <rect x={-pk.label.length * 3.4 - 6} y={-9} width={pk.label.length * 6.8 + 12} height={17} rx={8} fill="#0b1220" stroke={color} strokeWidth={1} />
          <text textAnchor="middle" y={4} fontSize="10.5" fill={color} fontFamily="var(--font-mono)">{pk.label}</text>
        </g>
      )}
    </g>
  );
}

export function Legend({ kinds }: { kinds: NodeKind[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-lab-muted" aria-label="Diagram legend">
      {kinds.map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: KIND_COLOR[k] }} />
          {KIND_LABEL[k]}
        </li>
      ))}
      <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TONE_COLOR.req }} />request</li>
      <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TONE_COLOR.res }} />response</li>
      <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TONE_COLOR.err }} />error</li>
    </ul>
  );
}
