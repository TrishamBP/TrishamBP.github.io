import { useEffect, useRef, useState } from "react";
import { fmt, LineChart } from "../engine/Chart";
import { Btn } from "../engine/Controls";
import { LabFrame, Metric, Slider, Toggle } from "../engine/LabFrame";
import { QueueSim, type SimParams, type SimSnapshot } from "../engine/sim/queueSim";

const PRESETS: { name: string; p: Partial<SimParams> }[] = [
  { name: "Normal load", p: { rps: 1000, instances: 1, down: false, crashRate: 0 } },
  { name: "Evening peak", p: { rps: 1500, instances: 1, down: false, crashRate: 0 } },
  { name: "New Year's Eve spike", p: { rps: 4000, instances: 1, down: false, crashRate: 0 } },
  { name: "Spike + scale out ×3", p: { rps: 4000, instances: 3, down: false, crashRate: 0 } },
];

const DEFAULTS: SimParams = { rps: 1000, instances: 1, workers: 64, serviceMs: 40, queueCap: 600, timeoutMs: 2000, down: false, crashRate: 0 };
type Speed = 0.5 | 1 | 2;

interface Particle { x: number; y: number; vx: number; vy: number; c: string; life: number }

export default function Gen2Traffic() {
  const [p, setP] = useState<SimParams>(DEFAULTS);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);
  const [explain, setExplain] = useState(true);
  const [snap, setSnap] = useState<SimSnapshot | null>(null);
  const [hist, setHist] = useState<{ p99: number[]; err: number[]; q: number[] }>({ p99: [], err: [], q: [] });

  const sim = useRef(new QueueSim(DEFAULTS, 11));
  const canvas = useRef<HTMLCanvasElement>(null);
  const parts = useRef<Particle[]>([]);
  const st = useRef({ running, speed, p });
  st.current = { running, speed, p };
  sim.current.p = p;

  const reset = () => {
    sim.current = new QueueSim(p, 11);
    parts.current = [];
    setHist({ p99: [], err: [], q: [] });
    setSnap(sim.current.snapshot());
  };
  const advance = (ms: number) => { for (let t = 0; t < ms; t += 10) sim.current.step(10); };

  // Simulation + drawing loop.
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0, sampleAcc = 0;
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const { running, speed } = st.current;
      if (running) {
        acc += dt * speed;
        while (acc >= 10) { sim.current.step(10); acc -= 10; }
        sampleAcc += dt * speed;
        if (sampleAcc >= 250) {
          sampleAcc = 0;
          const s = sim.current.snapshot();
          setSnap(s);
          setHist((h) => ({
            p99: [...h.p99, s.p99].slice(-120), err: [...h.err, s.errorRate * 100].slice(-120), q: [...h.q, s.queued].slice(-120),
          }));
        }
      }
      draw(canvas.current, sim.current, parts.current, running ? dt * speed : 0);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const set = (patch: Partial<SimParams>) => setP((x) => ({ ...x, ...patch }));
  const s = snap ?? sim.current.snapshot();
  const rho = s.utilisation;
  const regime = p.down ? "down" : rho < 0.7 ? "healthy" : rho < 1 ? "knee" : "overload";

  return (
    <LabFrame eyebrow="Module 1 · Lab 3" title="Overload the gateway: what happens when every request goes through one tier">
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Simulation controls">
        <Btn onClick={() => setRunning((r) => !r)} label={running ? "Pause" : "Play"}>{running ? "❚❚ Pause" : "▶ Play"}</Btn>
        <Btn onClick={() => { advance(1000); setSnap(sim.current.snapshot()); }} label="Step forward 1 simulated second" disabled={running}>+1 s</Btn>
        <Btn onClick={reset} label="Reset">↺ Reset</Btn>
        <div className="inline-flex overflow-hidden rounded-md border border-lab-line" role="group" aria-label="Simulation speed">
          {([0.5, 1, 2] as Speed[]).map((v) => (
            <button key={v} type="button" onClick={() => setSpeed(v)} aria-pressed={speed === v}
              className={`h-8 px-2.5 text-xs ${speed === v ? "bg-sky-400/20 text-sky-200" : "bg-lab-raised text-lab-muted"}`}>{v}x</button>
          ))}
        </div>
        <Btn onClick={() => setExplain((e) => !e)} label="Explain what I'm seeing" pressed={explain}>? Explain</Btn>
        <span className="ml-auto font-mono text-xs text-lab-muted">sim time {(s.now / 1000).toFixed(1)} s</span>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="Scenarios">
        {PRESETS.map((pr) => (
          <button key={pr.name} type="button" onClick={() => set(pr.p)}
            className="rounded-full border border-lab-line bg-lab-raised px-3 py-1 text-[11.5px] text-slate-200 hover:border-sky-400/60">{pr.name}</button>
        ))}
        <Toggle label="Gateway crashes" on={!!p.down} onChange={(v) => set({ down: v })} />
        <Toggle label="Bad deploy in shared code (30% of all APIs throw)" on={!!p.crashRate} onChange={(v) => set({ crashRate: v ? 0.3 : 0 })} />
      </div>

      <canvas ref={canvas} className="block h-[210px] w-full rounded-xl border border-lab-line bg-lab-bg"
        aria-label={`Live view: ${fmt(p.rps)} requests per second arriving, ${s.queued} queued, ${s.busy} of ${s.capacity} workers busy, ${(s.errorRate * 100).toFixed(1)}% failing`} role="img" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Metric label={<>Offered load <span className="normal-case">λ</span></>} value={fmt(p.rps)} unit="req/s" />
        <Metric label={<>Capacity <span className="normal-case">μ</span></>} value={fmt(s.capacityRps)} unit="req/s" hint="instances × workers ÷ service time" />
        <Metric label={<>Utilisation <span className="normal-case">ρ</span></>} value={isFinite(rho) ? rho.toFixed(2) : "∞"} tone={rho >= 1 ? "bad" : rho >= 0.7 ? "warn" : "ok"} hint="ρ = λ / μ" />
        <Metric label="Throughput" value={fmt(s.throughput)} unit="req/s" />
        <Metric label="Queue depth" value={fmt(s.queued)} unit="req" tone={s.queued > 0.5 * p.queueCap * p.instances ? "bad" : s.queued > 20 ? "warn" : "ok"} />
        <Metric label="p50 latency" value={fmt(s.p50)} unit="ms" />
        <Metric label="p95 latency" value={fmt(s.p95)} unit="ms" tone={s.p95 > 500 ? "bad" : s.p95 > 150 ? "warn" : "ok"} />
        <Metric label="p99 latency" value={fmt(s.p99)} unit="ms" tone={s.p99 > 800 ? "bad" : s.p99 > 200 ? "warn" : "ok"} />
        <Metric label="Error rate" value={(s.errorRate * 100).toFixed(1)} unit="%" tone={s.errorRate > 0.01 ? "bad" : s.errorRate > 0 ? "warn" : "ok"} />
        <Metric label="In flight L" value={fmt(s.inFlight)} unit={`≈ λW ${fmt(s.littleL)}`} hint="Little's Law: L = λ × W" />
      </div>

      <LineChart label="p99 latency, error rate and queue depth over time" series={[
        { name: "p99 latency", color: "#fb923c", values: hist.p99, unit: " ms" },
        { name: "errors", color: "#f43f5e", values: hist.err, unit: " %", max: 100 },
        { name: "queue depth", color: "#38bdf8", values: hist.q, unit: "" },
      ]} />

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <Slider label="Offered load (requests/s)" value={p.rps} min={50} max={20000} log onChange={(v) => set({ rps: v })} format={fmt} />
        <Slider label="Gateway instances" value={p.instances} min={1} max={10} onChange={(v) => set({ instances: v })} />
        <Slider label="Concurrent workers per instance" value={p.workers} min={8} max={256} step={8} onChange={(v) => set({ workers: v })} />
        <Slider label="Mean service time (ms)" value={p.serviceMs} min={5} max={200} onChange={(v) => set({ serviceMs: v })} />
        <Slider label="Queue limit per instance" value={p.queueCap} min={50} max={5000} step={50} onChange={(v) => set({ queueCap: v })} />
        <Slider label="Client timeout (ms)" value={p.timeoutMs} min={200} max={10000} step={100} onChange={(v) => set({ timeoutMs: v })} />
      </div>

      {explain && (
        <div className="space-y-2 rounded-xl border-l-2 border-sky-400/60 bg-lab-raised p-3 text-sm text-slate-300" aria-live="polite">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">What you're seeing · {regime}</p>
          <p>
            Capacity is <b className="font-mono text-white">μ = {p.instances} × {p.workers} ÷ {p.serviceMs} ms = {fmt(s.capacityRps)} req/s</b>.
            You're offering <b className="font-mono text-white">λ = {fmt(p.rps)} req/s</b>, so utilisation is{" "}
            <b className="font-mono text-white">ρ = λ/μ = {isFinite(rho) ? rho.toFixed(2) : "∞"}</b>.
          </p>
          {regime === "healthy" && <p>Below ~70% utilisation a request almost never waits: latency ≈ service time ({p.serviceMs} ms). Push the load slider right and watch p99 before p50. The tail moves first.</p>}
          {regime === "knee" && <p>This is the knee of the curve. For a single queue, waiting time grows like ρ / (1 − ρ): at ρ = 0.9 it is 9× the service time, at 0.99 it is 99×. The gateway is still keeping up on average, but bursts now queue, so p99 rises steeply while throughput still looks fine.</p>}
          {regime === "overload" && <p>λ &gt; μ: requests arrive faster than they can ever be served, so the queue grows every second until it hits the limit. Throughput flattens at μ ({fmt(s.capacityRps)} req/s); everything above it is shed (queue full → 503) or times out after {p.timeoutMs} ms. Because <i>every</i> API shares this tier, every product is degraded at once. Try "Spike + scale out ×3".</p>}
          {regime === "down" && <p>A single, all-encompassing gateway is a single point of failure: every API of every app fails at once, even though all 2,200 microservices behind it are healthy. Replicas across machines and data centres (plus health-checked load balancing) are how a gateway tier avoids this.</p>}
          {!!p.crashRate && <p><b className="text-rose-300">Bad deploy:</b> adding instances doesn't help here. The bug ships to every replica, and because many teams' APIs share one codebase and release train, one team's mistake becomes everyone's outage. That organisational coupling, not raw throughput, is what pushed Uber to Gen 3.</p>}
          <p className="text-xs text-lab-muted">Little's Law check: in-flight requests L should equal throughput × mean latency. Measured {fmt(s.inFlight)} vs λW = {fmt(s.littleL)}. The simulator is an M/M/c queue with a bounded buffer and client timeouts; numbers are illustrative, not Uber measurements.</p>
        </div>
      )}
    </LabFrame>
  );
}

function draw(cv: HTMLCanvasElement | null, sim: QueueSim, parts: Particle[], dt: number) {
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);

  const p = sim.p;
  const s = sim.snapshot();
  const qx = W * 0.24, qw = W * 0.24, qy = H * 0.3, qh = H * 0.4;
  const gx = W * 0.54, gw = W * 0.24;
  const exitX = W * 0.8;

  // Labels
  g.font = "11px Segoe UI, system-ui, sans-serif";
  g.fillStyle = "#94a3b8";
  g.fillText("clients", 10, 18);
  g.fillText(`queue  ${s.queued} / ${p.queueCap * p.instances}`, qx, qy - 8);
  g.fillText(`gateway workers  ${s.busy} / ${s.capacity} busy`, gx, qy - 8);
  g.fillText("served", exitX + 10, 18);
  g.fillStyle = "#f43f5e";
  g.fillText("failed (shed / timeout / down)", qx, H - 8);

  // Queue
  const fill = Math.min(1, s.queued / Math.max(1, p.queueCap * p.instances));
  g.strokeStyle = "#24324f"; g.lineWidth = 1.5;
  g.strokeRect(qx, qy, qw, qh);
  const qg = g.createLinearGradient(qx, 0, qx + qw, 0);
  qg.addColorStop(0, "#38bdf8"); qg.addColorStop(1, fill > 0.8 ? "#f43f5e" : "#fb923c");
  g.fillStyle = qg; g.globalAlpha = 0.75;
  g.fillRect(qx + qw * (1 - fill), qy + 2, qw * fill - 2, qh - 4);
  g.globalAlpha = 1;

  // Worker grid: each cell is one (or more) worker slots, lit when busy.
  const cells = Math.min(s.capacity || 1, 256);
  const cols = Math.ceil(Math.sqrt(cells * (gw / qh)));
  const rows = Math.ceil(cells / cols);
  const cw = gw / cols, ch = qh / rows;
  const lit = p.down ? 0 : Math.round((s.busy / Math.max(1, s.capacity)) * cells);
  for (let i = 0; i < cells; i++) {
    const cx = gx + (i % cols) * cw, cy = qy + Math.floor(i / cols) * ch;
    g.fillStyle = p.down ? "#3b0d18" : i < lit ? (lit / cells > 0.95 ? "#fb923c" : "#4ade80") : "#17223a";
    g.fillRect(cx + 1, cy + 1, Math.max(1, cw - 2), Math.max(1, ch - 2));
  }
  if (p.down) { g.fillStyle = "#f43f5e"; g.font = "bold 13px Segoe UI, sans-serif"; g.fillText("GATEWAY DOWN", gx + gw / 2 - 48, qy + qh / 2 + 4); }

  // Particles: sample of real flow. One dot ≈ k requests.
  if (dt > 0) {
    const k = Math.max(1, p.rps / 70);
    const spawn = (rate: number, mk: () => Particle) => {
      let n = (rate / k) * (dt / 1000);
      while (n > 0) { if (Math.random() < n) parts.push(mk()); n -= 1; }
    };
    const okFrac = Math.max(0, 1 - s.errorRate);
    spawn(p.rps, () => ({ x: 10, y: qy + Math.random() * qh, vx: 0.22, vy: 0, c: "#38bdf8", life: okFrac > Math.random() ? 1 : -1 }));
    spawn(s.throughput, () => ({ x: gx + gw, y: qy + Math.random() * qh, vx: 0.2, vy: 0, c: "#4ade80", life: 2 }));
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const a = parts[i];
    a.x += a.vx * dt; a.y += a.vy * dt;
    if (a.life === -1 && a.x >= qx - 4) { a.c = "#f43f5e"; a.vx = 0.03; a.vy = 0.12; a.life = -2; }
    if (a.life === 1 && a.x >= qx) { parts.splice(i, 1); continue; }
    if (a.x > W || a.y > H) { parts.splice(i, 1); continue; }
    g.fillStyle = a.c;
    g.beginPath(); g.arc(a.x, a.y, 2.6, 0, Math.PI * 2); g.fill();
  }
  if (parts.length > 600) parts.splice(0, parts.length - 600);
}
