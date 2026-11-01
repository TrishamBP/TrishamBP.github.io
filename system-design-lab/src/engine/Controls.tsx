import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { Speed, Timeline } from "./useTimeline";

const Icon = ({ d, label }: { d: string; label: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><title>{label}</title><path d={d} /></svg>
);
const I = {
  play: "M8 5v14l11-7z",
  pause: "M6 5h4v14H6zM14 5h4v14h-4z",
  reset: "M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z",
  next: "M6 6l8.5 6L6 18zM16 6h2v12h-2z",
  prev: "M18 6l-8.5 6L18 18zM6 6h2v12H6z",
};

export function Btn({ onClick, label, children, pressed, disabled }: {
  onClick: () => void; label: string; children: ReactNode; pressed?: boolean; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={pressed} disabled={disabled}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:opacity-40 ${
        pressed ? "border-sky-400/60 bg-sky-400/15 text-sky-200" : "border-lab-line bg-lab-raised text-lab-text hover:border-slate-500"
      }`}>
      {children}
    </button>
  );
}

/** Play / pause / reset / step back / step forward / speed / explain. */
export function Controls({ tl, explain, onExplain }: { tl: Timeline; explain: boolean; onExplain: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Animation controls">
      <Btn onClick={tl.toggle} label={tl.playing ? "Pause" : "Play"}>
        <Icon d={tl.playing ? I.pause : I.play} label="" />{tl.playing ? "Pause" : tl.finished ? "Replay" : "Play"}
      </Btn>
      <Btn onClick={tl.prev} label="Step backward" disabled={tl.index === 0 && tl.t === 0}><Icon d={I.prev} label="" /></Btn>
      <Btn onClick={tl.next} label="Step forward" disabled={tl.finished}><Icon d={I.next} label="" /></Btn>
      <Btn onClick={tl.reset} label="Reset"><Icon d={I.reset} label="" /></Btn>
      <div className="ml-1 inline-flex overflow-hidden rounded-md border border-lab-line" role="group" aria-label="Playback speed">
        {([0.5, 1, 2] as Speed[]).map((s) => (
          <button key={s} type="button" onClick={() => tl.setSpeed(s)} aria-pressed={tl.speed === s}
            className={`h-8 px-2.5 text-xs ${tl.speed === s ? "bg-sky-400/20 text-sky-200" : "bg-lab-raised text-lab-muted hover:text-white"}`}>
            {s}x
          </button>
        ))}
      </div>
      <Btn onClick={onExplain} label="Explain this step" pressed={explain}>? Explain this step</Btn>
      <span className="ml-auto font-mono text-xs text-lab-muted">step {tl.index + 1}/{tl.count}</span>
    </div>
  );
}

/** Step title, caption, optional detail and the wire payload of the step. */
export function StepPanel({ tl, explain }: { tl: Timeline; explain: boolean }) {
  const s = tl.step;
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <div aria-live="polite">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">Step {tl.index + 1} · {s.title}</p>
        <p className="mt-1 text-sm text-lab-text">{s.caption}</p>
        <AnimatePresence initial={false}>
          {explain && s.detail && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="mt-2 space-y-2 border-l-2 border-sky-400/50 pl-3 text-sm text-slate-300">
                {s.detail.map((d, i) => <p key={i}>{d}</p>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {s.wire && s.wire.length > 0 && <WireInspector wire={s.wire} />}
    </div>
  );
}

function WireInspector({ wire }: { wire: { label: string; body: string }[] }) {
  const [i, setI] = useState(0);
  const cur = wire[Math.min(i, wire.length - 1)];
  return (
    <div className="w-full min-w-0 rounded-lg border border-lab-line bg-[#070d18] md:w-[340px]">
      <div className="flex gap-1 border-b border-lab-line p-1" role="tablist" aria-label="Network messages in this step">
        {wire.map((w, j) => (
          <button key={j} type="button" role="tab" aria-selected={j === i} onClick={() => setI(j)}
            className={`rounded px-2 py-1 font-mono text-[10.5px] ${j === i ? "bg-lab-raised text-white" : "text-lab-muted hover:text-white"}`}>
            {w.label}
          </button>
        ))}
      </div>
      <pre className="lab-scroll max-h-56 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-emerald-200 whitespace-pre">{cur.body}</pre>
    </div>
  );
}

export function StepChips({ tl, titles }: { tl: Timeline; titles: string[] }) {
  return (
    <ol className="lab-scroll flex gap-1.5 overflow-x-auto pb-1" aria-label="Jump to step">
      {titles.map((t, i) => (
        <li key={i}>
          <button type="button" onClick={() => tl.goTo(i)} aria-current={i === tl.index ? "step" : undefined}
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] ${
              i === tl.index ? "border-sky-400 bg-sky-400/15 text-sky-100" : i < tl.index ? "border-lab-line text-slate-300" : "border-lab-line text-lab-muted"
            }`}>
            {i + 1}. {t}
          </button>
        </li>
      ))}
    </ol>
  );
}
