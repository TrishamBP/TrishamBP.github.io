import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { KIND_COLOR, KIND_LABEL } from "./Diagram";
import type { DEdge, DNode, NodeStatus } from "./types";

/** Outer card of every lab: title, "educational model" badge, body. */
export function LabFrame({ eyebrow, title, children, simulated = true }: {
  eyebrow: string; title: string; children: ReactNode; simulated?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-lab-line bg-lab-panel shadow-2xl shadow-black/40">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-lab-line bg-gradient-to-r from-[#0f1a31] to-lab-panel px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-sky-300">{eyebrow}</span>
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        {simulated && (
          <span className="ml-auto rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10.5px] text-amber-200">
            Educational model · simulated, not Uber telemetry
          </span>
        )}
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

/** Click-to-inspect explanation panel for a diagram component. */
export function InfoPanel({ node, nodes, edges, status, onClose, actions }: {
  node: DNode | null; nodes: DNode[]; edges: DEdge[]; status?: NodeStatus;
  onClose: () => void; actions?: ReactNode;
}) {
  const name = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
  const incoming = node ? edges.filter((e) => e.to === node.id && !e.hidden).map((e) => name(e.from)) : [];
  const outgoing = node ? edges.filter((e) => e.from === node.id && !e.hidden).map((e) => name(e.to)) : [];
  return (
    <AnimatePresence mode="wait">
      {node?.info ? (
        <motion.aside key={node.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }} aria-label={`${node.label} details`}
          className="rounded-xl border border-lab-line bg-lab-raised p-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: KIND_COLOR[node.kind] }} />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-lab-muted">{KIND_LABEL[node.kind]}{status === "down" ? " · DOWN" : ""}</p>
              <h4 className="text-base font-semibold text-white">{node.label}</h4>
            </div>
            <button type="button" onClick={onClose} aria-label="Close details"
              className="ml-auto rounded-md px-2 text-lg leading-none text-lab-muted hover:text-white">×</button>
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <Field t="What it does">{node.info.does}</Field>
            <Field t="Why it exists">{node.info.why}</Field>
            {node.info.api && <Field t="API it exposes"><Mono items={node.info.api} /></Field>}
            {(node.info.db || node.info.stores) && <Field t="Data it stores">{node.info.db ? <><b className="text-slate-200">{node.info.db}</b>. </> : null}{node.info.stores}</Field>}
            <Field t="Incoming requests from">{incoming.length ? incoming.join(", ") : "—"}</Field>
            <Field t="Outgoing requests to">{outgoing.length ? outgoing.join(", ") : node.info.deps?.join(", ") ?? "—"}</Field>
            <Field t="If it fails" tone="err">{node.info.onFail}</Field>
            <Field t="If traffic increases" tone="hot">{node.info.onTraffic}</Field>
          </dl>
          {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
        </motion.aside>
      ) : (
        <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="rounded-xl border border-dashed border-lab-line p-3 text-center text-xs text-lab-muted">
          Click any component in the diagram to see what it does, what it talks to, and what happens when it fails.
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function Field({ t, children, tone }: { t: string; children: ReactNode; tone?: "err" | "hot" }) {
  const c = tone === "err" ? "text-rose-300" : tone === "hot" ? "text-orange-300" : "text-sky-300";
  return (
    <div>
      <dt className={`text-[11px] font-semibold uppercase tracking-wider ${c}`}>{t}</dt>
      <dd className="mt-0.5 text-slate-300">{children}</dd>
    </div>
  );
}

const Mono = ({ items }: { items: string[] }) => (
  <span className="flex flex-wrap gap-1">
    {items.map((x) => <code key={x} className="rounded bg-[#070d18] px-1.5 py-0.5 font-mono text-[11px] text-emerald-200">{x}</code>)}
  </span>
);

export function Metric({ label, value, unit, tone, hint }: {
  label: ReactNode; value: string; unit?: string; tone?: "ok" | "warn" | "bad"; hint?: string;
}) {
  const c = tone === "bad" ? "text-rose-300" : tone === "warn" ? "text-amber-300" : "text-white";
  return (
    <div className="rounded-lg border border-lab-line bg-lab-raised px-3 py-2" title={hint}>
      <p className="text-[10.5px] uppercase tracking-wider text-lab-muted">{label}</p>
      <p className={`font-mono text-lg font-semibold tabular-nums ${c}`}>{value}<span className="ml-1 text-xs font-normal text-lab-muted">{unit}</span></p>
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, format, log }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string; log?: boolean;
}) {
  // Log sliders map position 0..1000 onto min..max exponentially.
  const toPos = (v: number) => (log ? (Math.log(v / min) / Math.log(max / min)) * 1000 : v);
  const fromPos = (p: number) => (log ? Math.round(min * Math.pow(max / min, p / 1000)) : p);
  return (
    <label className="block text-xs text-lab-muted">
      <span className="flex justify-between"><span>{label}</span><span className="font-mono text-slate-200">{format ? format(value) : value}</span></span>
      <input type="range" className="mt-1 w-full" min={log ? 0 : min} max={log ? 1000 : max} step={log ? 1 : step}
        value={toPos(value)} onChange={(e) => onChange(fromPos(Number(e.target.value)))} aria-label={label} />
    </label>
  );
}

export function Toggle({ label, on, onChange, tone = "err" }: { label: string; on: boolean; onChange: (v: boolean) => void; tone?: "err" | "ok" }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs ${
        on ? (tone === "err" ? "border-rose-400/60 bg-rose-500/15 text-rose-200" : "border-emerald-400/60 bg-emerald-500/15 text-emerald-200") : "border-lab-line bg-lab-raised text-lab-text"
      }`}>
      <span className={`h-3.5 w-6 rounded-full p-0.5 transition-colors ${on ? (tone === "err" ? "bg-rose-400" : "bg-emerald-400") : "bg-slate-600"}`}>
        <span className={`block h-2.5 w-2.5 rounded-full bg-white transition-transform ${on ? "translate-x-2.5" : ""}`} />
      </span>
      {label}
    </button>
  );
}
