import { useEffect, useState } from "react";
import { Diagram } from "../engine/Diagram";
import { LabFrame } from "../engine/LabFrame";
import type { DEdge, DNode, NodeStatus, Packet } from "../engine/types";

const c = (id: string, label: string, x: number): DNode => ({ id, label, kind: "client", shape: "phone", x, y: 34, w: 80, h: 30 });
const s = (id: string, label: string, x: number, y = 250): DNode => ({ id, label, kind: "service", shape: "circle", x, y, w: 54 });

const G2N: DNode[] = [
  c("rider", "Rider", 110), c("driver", "Driver", 230), c("eats", "Eats", 350),
  { id: "gw", label: "RTAPI gateway", sub: "all teams' endpoint code", kind: "gateway", x: 230, y: 140, w: 330, h: 60 },
  s("s1", "Trips", 80), s("s2", "Pricing", 180), s("s3", "Pay", 280), s("s4", "Menu", 380),
];
const G2E: DEdge[] = [
  ...["rider", "driver", "eats"].map((a) => ({ id: `${a}-gw`, from: a, to: "gw" })),
  ...["s1", "s2", "s3", "s4"].map((b) => ({ id: `gw-${b}`, from: "gw", to: b })),
];

const G3N: DNode[] = [
  c("rider", "Rider", 110), c("driver", "Driver", 230), c("eats", "Eats", 350),
  { id: "edge", label: "Edge Gateway (config)", kind: "edge", shape: "bar", x: 230, y: 96, w: 400, h: 26 },
  { id: "ph", label: "Rider view", kind: "presentation", x: 100, y: 160, w: 104, h: 36 },
  { id: "pd", label: "Driver view", kind: "presentation", x: 230, y: 160, w: 104, h: 36 },
  { id: "pe", label: "Eats view", kind: "presentation", x: 360, y: 160, w: 104, h: 36 },
  s("s1", "Trips", 80), s("s2", "Pricing", 180), s("s3", "Pay", 280), s("s4", "Menu", 380),
];
const G3E: DEdge[] = [
  ...["rider", "driver", "eats"].map((a) => ({ id: `${a}-edge`, from: a, to: "edge" })),
  { id: "edge-ph", from: "edge", to: "ph" }, { id: "edge-pd", from: "edge", to: "pd" }, { id: "edge-pe", from: "edge", to: "pe" },
  { id: "ph-s1", from: "ph", to: "s1" }, { id: "ph-s2", from: "ph", to: "s2" }, { id: "ph-s3", from: "ph", to: "s3" },
  { id: "pd-s1", from: "pd", to: "s1" }, { id: "pe-s4", from: "pe", to: "s4" }, { id: "pe-s2", from: "pe", to: "s2" },
];

interface Side { status: Record<string, NodeStatus>; active?: string[]; packets: Packet[]; outcome: string; radius: string; teams: string }
interface Scenario { name: string; g2: Side; g3: Side; lesson: string }

const err = (edge: string, at: [number, number] = [0, 0.5]): Packet => ({ edge, tone: "err", at });
const ok = (edge: string, at: [number, number] = [0, 0.5]): Packet => ({ edge, tone: "req", at });

const SCENARIOS: Scenario[] = [
  {
    name: "One team ships a crashing bug",
    g2: {
      status: { gw: "down", rider: "degraded", driver: "degraded", eats: "degraded" },
      packets: [err("rider-gw"), err("driver-gw", [0.1, 0.6]), err("eats-gw", [0.2, 0.7])],
      outcome: "The bug lives in a process that serves many teams' endpoints. When it crashes, those endpoints all fail together. (Uber split RTAPI into 40+ deployments to contain this, but the code and release train stayed shared.)",
      radius: "Every endpoint in the shared deployment", teams: "Gateway team + every team with endpoints there",
    },
    g3: {
      status: { pe: "down", eats: "degraded" },
      packets: [ok("rider-edge"), ok("edge-ph", [0.5, 1]), err("eats-edge", [0.1, 0.6]), err("edge-pe", [0.6, 1])],
      outcome: "The bug is in the Eats team's own presentation service. Eats' feed fails; rider and driver flows never touch that process.",
      radius: "One screen of one app", teams: "Eats team only",
    },
    lesson: "Separate deployables = separate failure domains. Microservices shrink the blast radius of a bad deploy.",
  },
  {
    name: "Eats traffic spikes ×5",
    g2: {
      status: { gw: "hot" },
      packets: [ok("eats-gw"), ok("eats-gw", [0.2, 0.7]), ok("eats-gw", [0.4, 0.9]), ok("rider-gw", [0.3, 0.8])],
      outcome: "If Eats endpoints share gateway instances with rides, the spike consumes shared CPU, queues and connection pools, and rider latency rises too (see Lab 3). Isolating endpoint groups into their own deployments is how Gen 2 limited this.",
      radius: "Everything sharing those instances", teams: "On-call for the gateway",
    },
    g3: {
      status: { pe: "hot", s4: "hot" },
      packets: [ok("eats-edge"), ok("edge-pe", [0.4, 0.9]), ok("eats-edge", [0.2, 0.7]), ok("rider-edge", [0.3, 0.8])],
      outcome: "The thin edge passes requests through cheaply; the load lands on the Eats view and Menu services, which autoscale on their own. Rides stay fast.",
      radius: "Eats services (scaled independently)", teams: "Eats team",
    },
    lesson: "Independent scaling: each service gets capacity for its own traffic pattern instead of the sum of everyone's.",
  },
  {
    name: "Add a new API",
    g2: {
      status: {}, active: ["rider", "gw"],
      packets: [ok("rider-gw")],
      outcome: "Write Node.js code in the shared gateway repo, get reviews, pass ~50,000 integration tests, then wait for the shared deploy (roughly daily). 40% of engineering competed for this one pipeline.",
      radius: "—", teams: "You + gateway owners",
    },
    g3: {
      status: {}, active: ["rider", "edge", "ph"],
      packets: [ok("rider-edge"), ok("edge-ph", [0.5, 1])],
      outcome: "Configure the route, auth and rate limit in the Edge Gateway UI (self-service), then ship your own presentation or product service on your own schedule.",
      radius: "—", teams: "You",
    },
    lesson: "Self-service + ownership: the platform team builds the edge once; product teams don't queue behind it.",
  },
  {
    name: "Debug one slow request",
    g2: {
      status: {}, active: ["rider", "gw", "s2"],
      packets: [ok("rider-gw"), ok("gw-s2", [0.5, 1])],
      outcome: "One codebase, one log stream, one stack trace. Finding the slow part is relatively easy.",
      radius: "—", teams: "One team can see the whole path",
    },
    g3: {
      status: {}, active: ["rider", "edge", "ph", "s2", "s1"],
      packets: [ok("rider-edge", [0, 0.3]), ok("edge-ph", [0.3, 0.6]), ok("ph-s2", [0.6, 0.9]), ok("ph-s1", [0.6, 0.9])],
      outcome: "The request crosses 4+ services owned by different teams. You need distributed tracing (trace IDs propagated through every hop), per-service dashboards and clear on-call ownership.",
      radius: "—", teams: "Several teams to correlate",
    },
    lesson: "Microservices trade code complexity for operational complexity. Observability becomes mandatory, not optional.",
  },
];

function useLoop(ms: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const f = (now: number) => { setT(((now - t0) % ms) / ms); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [ms]);
  return t;
}

export default function GenCompare() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const loop = useLoop(2600);
  const t = playing ? loop : 0.45;
  const sc = SCENARIOS[i];
  return (
    <LabFrame eyebrow="Uber · Lab 5" title="Gen 2 vs Gen 3, side by side: same event, different outcome" simulated={false}>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Scenario">
        {SCENARIOS.map((x, j) => (
          <button key={x.name} type="button" onClick={() => setI(j)} aria-pressed={i === j}
            className={`rounded-full border px-3 py-1 text-[11.5px] ${i === j ? "border-sky-400 bg-sky-400/15 text-sky-100" : "border-lab-line bg-lab-raised text-slate-300"}`}>{x.name}</button>
        ))}
        <button type="button" onClick={() => setPlaying((p) => !p)} className="ml-auto rounded-md border border-lab-line bg-lab-raised px-2.5 py-1 text-xs text-slate-200">
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {([["Gen 2 · all-encompassing gateway", G2N, G2E, sc.g2], ["Gen 3 · edge + layered services", G3N, G3E, sc.g3]] as const).map(([title, n, e, side]) => (
          <div key={title} className="space-y-2">
            <p className="text-sm font-semibold text-white">{title}</p>
            <Diagram width={460} height={290} nodes={n} edges={e} status={side.status} active={side.active} packets={side.packets} t={t} ariaLabel={`${title}: ${sc.name}`} />
            <p className="text-sm text-slate-300">{side.outcome}</p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-lab-raised p-2"><dt className="text-lab-muted">Blast radius</dt><dd className="text-slate-100">{side.radius}</dd></div>
              <div className="rounded-md bg-lab-raised p-2"><dt className="text-lab-muted">Who is involved</dt><dd className="text-slate-100">{side.teams}</dd></div>
            </dl>
          </div>
        ))}
      </div>
      <p className="rounded-lg border-l-2 border-emerald-400 bg-lab-raised px-3 py-2 text-sm text-slate-200"><b className="text-emerald-300">Lesson: </b>{sc.lesson}</p>

      <div className="lab-scroll overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-[12.5px]">
          <thead><tr className="border-b border-lab-line text-lab-muted"><th className="py-2 pr-3 font-medium"></th><th className="py-2 pr-3 font-medium">Gen 2: all-encompassing gateway</th><th className="py-2 font-medium">Gen 3: edge + layered</th></tr></thead>
          <tbody className="text-slate-300">
            {[
              ["Where business logic lives", "Gateway (BFF + aggregation inside it)", "Presentation and product services"],
              ["Adding an API", "Code in the shared repo, shared deploy", "Self-service config + own service"],
              ["Failure domain", "Shared by many teams' endpoints", "One service per team"],
              ["Scaling", "Scale the gateway for everyone's peak", "Each service scales for its own load"],
              ["Mobile round trips", "Low: gateway aggregates", "Low: presentation services aggregate"],
              ["Debugging", "One codebase, easier to trace", "Needs distributed tracing"],
              ["Operational cost", "Few services to run", "Many services, contracts, on-call rotations"],
              ["Best fit", "Small org, few products", "Many teams and business lines"],
            ].map(([k, a, b]) => (
              <tr key={k} className="border-b border-lab-line/60"><th className="py-2 pr-3 font-medium text-slate-100">{k}</th><td className="py-2 pr-3">{a}</td><td className="py-2">{b}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-lab-muted">Gen 2 facts (40% of engineering committing, 50,000 tests per diff, 40+ deployments, roughly a daily deploy) are from Uber Engineering, "Designing Edge Gateway" (2020). The scenario outcomes are an illustrative teaching model.</p>
    </LabFrame>
  );
}
