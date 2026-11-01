import { useMemo, useState } from "react";
import { Btn, Controls, StepChips, StepPanel } from "../engine/Controls";
import { Diagram, Legend } from "../engine/Diagram";
import { InfoPanel, LabFrame } from "../engine/LabFrame";
import type { DEdge, DNode, NodeInfo, NodeStatus, Packet, Step } from "../engine/types";
import { useTimeline } from "../engine/useTimeline";
import { blastRadius } from "../engine/graph";

/* ------------------------------------------------------------------ */
/* Components. Service names are illustrative (Uber's Fig. 3 uses      */
/* "Product Service A/B", "Presentation Service B/C"); the layer roles */
/* are Uber's.                                                          */
/* ------------------------------------------------------------------ */
const I = (o: NodeInfo) => o;
const BASE: DNode[] = [
  { id: "rider", label: "Rider app", kind: "client", shape: "phone", x: 330, y: 40, w: 100, h: 38, info: I({ does: "Rider mobile client.", why: "Needs a home screen (fare + ETA), trip requests and payments.", onFail: "Only this user.", onTraffic: "Rush hour multiplies every flow it calls." }) },
  { id: "driver", label: "Driver app", kind: "client", shape: "phone", x: 480, y: 40, w: 100, h: 38, info: I({ does: "Driver mobile client.", why: "Accepts trips and streams its state.", onFail: "Only this driver.", onTraffic: "High-frequency calls from every online driver." }) },
  { id: "eats", label: "Eats app", kind: "client", shape: "phone", x: 630, y: 40, w: 100, h: 38, info: I({ does: "Uber Eats client.", why: "A separate business line sharing the platform.", onFail: "Only this user.", onTraffic: "Lunch and dinner peaks, at different times from ride peaks." }) },

  { id: "nginx", label: "nginx (auth/ssl)", kind: "edge", shape: "bar", x: 480, y: 118, w: 700, h: 30, info: I({
    does: "Terminates TLS, authenticates, and forwards to the gateway.", why: "Cross-cutting edge concerns in one place.", stores: "Certificates.",
    onFail: "Every app loses every API.", onTraffic: "Replicated horizontally behind DNS / L4 load balancing." }) },
  { id: "rtapi", label: "RTAPI: one all-encompassing gateway", sub: "Node.js · ~1M LOC · many teams' code", kind: "gateway", x: 480, y: 222, w: 560, h: 64, info: I({
    does: "Every public API for every app: auth, validation, rate limiting, localization, plus a growing amount of business logic and data aggregation.",
    why: "Started in 2015 as a single RESTful API and grew. It was convenient: one place to reduce mobile round trips.",
    onFail: "All products, all apps. It's a single shared failure domain.",
    onTraffic: "Add instances to handle request volume. The real bottleneck is people: 40% of engineering committed here, with 50,000 tests per diff and roughly a deploy a day.",
    api: ["/rides/*", "/drivers/*", "/eats/*", "… ~1,600 APIs"] }) },
  { id: "g1", label: "Gateway Group 1", sub: "rider APIs", kind: "gateway", x: 230, y: 222, w: 150, h: 56, info: I({
    does: "Rider-facing endpoints of the shared gateway, deployed separately.", why: "RTAPI was deployed as 40+ independent services to isolate load and crashes.",
    onFail: "Rider APIs fail; Driver and Eats groups keep serving.", onTraffic: "Scales independently of other groups.",
    api: ["/rides/estimate", "/rides/request", "/payments/*"] }) },
  { id: "g2", label: "Gateway Group 2", sub: "driver APIs", kind: "gateway", x: 480, y: 222, w: 150, h: 56, info: I({
    does: "Driver-facing endpoints.", why: "Separate deployment, but the same monorepo, libraries and platform.",
    onFail: "Driver APIs fail.", onTraffic: "Scales independently.", api: ["/drivers/trips/accept"] }) },
  { id: "gN", label: "Gateway Group N", sub: "Eats APIs", kind: "gateway", x: 730, y: 222, w: 150, h: 56, info: I({
    does: "Eats endpoints.", why: "New business line added to the same gateway codebase.",
    onFail: "Eats APIs fail.", onTraffic: "Scales independently.", api: ["/eats/feed"] }) },

  { id: "edge", label: "Edge Gateway", sub: "Go · config via UI · no business logic", kind: "edge", shape: "bar", x: 480, y: 118, w: 700, h: 34, info: I({
    does: "The true gateway: authentication, rate limiting, routing, monitoring and the other cross-cutting features. It explicitly does not do backend-for-frontend or round-trip reduction.",
    why: "Uber replaced the edge part of RTAPI with a standalone Golang service plus a UI, so any engineer can configure, create and modify product-facing APIs self-service.",
    stores: "API configuration (routes, auth policies, rate limits); no business data.",
    onFail: "Still a critical tier, but it's small, generic and config-driven, so failures come from infra rather than other teams' business logic. It's replicated across zones and regions.",
    onTraffic: "Stateless and thin, so it scales horizontally and cheaply.",
    api: ["route: path → presentation service", "auth, rate limit, headers"] }) },

  { id: "p_home", label: "Rider Home view", sub: "presentation", kind: "presentation", x: 230, y: 222, info: I({
    does: "Backend-for-frontend for the rider home screen: calls the product APIs, then shapes and localizes exactly the payload the screen needs.",
    why: "Keeps screen-specific aggregation out of the gateway and out of reusable product APIs. One round trip for the phone.",
    onFail: "The rider home screen degrades (the app can show a fallback); trip and payment product APIs are untouched.",
    onTraffic: "Scales with the number of riders opening the app; owned and deployed by the rider app team.",
    api: ["GET /rider/home"], deps: ["Pricing API", "Trips API", "Payments API"], db: "None (stateless)" }) },
  { id: "p_driver", label: "Driver Trip view", sub: "presentation", kind: "presentation", x: 480, y: 222, info: I({
    does: "Backend-for-frontend for the driver's trip screens.", why: "Driver UI needs differ from rider UI; one BFF per experience.",
    onFail: "Driver screens degrade; rider and Eats unaffected.", onTraffic: "Grows with online drivers.",
    api: ["POST /driver/trip/accept"], deps: ["Trips API"], db: "None (stateless)" }) },
  { id: "p_eats", label: "Eats Feed view", sub: "presentation", kind: "presentation", x: 730, y: 222, info: I({
    does: "Builds the Eats home feed: stores, menus, delivery fee and ETA in one response.", why: "Eats is a different product with its own team and release cadence.",
    onFail: "Eats feed fails; rides keep working.", onTraffic: "Lunch and dinner spikes are isolated to this service.",
    api: ["GET /eats/feed"], deps: ["Stores API", "Pricing API"], db: "None (stateless)" }) },

  { id: "pr_trips", label: "Trips API", sub: "product", kind: "product", x: 180, y: 322, info: I({
    does: "Reusable functional API for trips: request, accept, status. Used by any presentation service.",
    why: "Write trip logic once, then reuse it from rider, driver and other surfaces.",
    onFail: "Every flow that books or tracks a trip fails: rider request, driver accept, home-screen ETA.", onTraffic: "Shared by many callers, so it needs capacity planning across all of them.",
    api: ["POST /trips", "POST /trips/{id}/accept", "GET /trips/{id}"], deps: ["Dispatch", "ETA"], db: "Via domain services" }) },
  { id: "pr_pricing", label: "Pricing API", sub: "product", kind: "product", x: 380, y: 322, info: I({
    does: "Reusable fare and fee quotes.", why: "Both rides and Eats need prices.", onFail: "Fare estimates and delivery fees fail; booking without a quote may be blocked.",
    onTraffic: "Called on every home-screen load: a hot path, a good candidate for caching.", api: ["POST /quotes"], deps: ["Fare engine"], db: "Via domain services" }) },
  { id: "pr_pay", label: "Payments API", sub: "product", kind: "product", x: 580, y: 322, info: I({
    does: "Payment methods, authorization and capture.", why: "One audited, consistent payments surface.", onFail: "Payment flows fail. Trips can often complete and charge later (async retry).",
    onTraffic: "Lower QPS but strict correctness: idempotency matters more than raw speed.", api: ["GET /payment-methods", "POST /charges"], deps: ["Payments ledger"], db: "Via domain services" }) },
  { id: "pr_store", label: "Stores API", sub: "product", kind: "product", x: 780, y: 322, info: I({
    does: "Restaurants and menus as a reusable API.", why: "Used by the Eats feed, search and merchant tools.", onFail: "Eats browsing fails.",
    onTraffic: "Read-heavy, so it's cacheable.", api: ["GET /stores?near=", "GET /stores/{id}/menu"], deps: ["Menu store", "ETA"], db: "Via domain services" }) },

  { id: "d_dispatch", label: "Dispatch", kind: "service", shape: "circle", x: 150, y: 428, w: 76, info: I({
    does: "Leaf domain service: matches riders to drivers.", why: "One refined capability owned by one team.", onFail: "No new trips can be matched.",
    onTraffic: "Latency-critical; scales by city or geography.", api: ["Match(trip)"], db: "Trips store" }) },
  { id: "d_eta", label: "ETA", kind: "service", shape: "circle", x: 330, y: 428, w: 76, info: I({
    does: "Leaf domain service: arrival-time estimates.", why: "Used by rides and Eats alike.", onFail: "ETAs are missing; callers should fall back (e.g. hide the ETA) rather than fail the screen.",
    onTraffic: "Very high QPS, so it's cached by area.", api: ["Estimate(from,to)"], db: "Road graph / traffic data" }) },
  { id: "d_fare", label: "Fare engine", kind: "service", shape: "circle", x: 480, y: 428, w: 76, info: I({
    does: "Leaf domain service: computes prices.", why: "Pricing rules have one owner.", onFail: "No quotes.", onTraffic: "CPU-bound per quote.",
    api: ["Price(route, product)"], db: "Pricing rules" }) },
  { id: "d_pay", label: "Payments ledger", kind: "service", shape: "circle", x: 630, y: 428, w: 76, info: I({
    does: "Leaf domain service: records money movement.", why: "Strong consistency and auditing live in one place.", onFail: "Charges queue up for retry; must never double-charge.",
    onTraffic: "Writes must stay correct under retries: idempotency keys.", api: ["Authorize", "Capture"], db: "Payments DB" }) },
  { id: "d_menu", label: "Menu store", kind: "service", shape: "circle", x: 810, y: 428, w: 76, info: I({
    does: "Leaf domain service: menus and availability.", why: "Merchant data has a single owner.", onFail: "Menus are unavailable.",
    onTraffic: "Read-heavy, so it's cached.", api: ["GetMenu(store)"], db: "Menu DB" }) },

  { id: "db_trips", label: "Trips DB", kind: "db", shape: "cylinder", x: 150, y: 522, w: 96, h: 46, info: I({ does: "Trip records, owned by Dispatch only.", why: "Database-per-service: no other team reads it directly.", stores: "Trip state.", onFail: "Matching stops.", onTraffic: "Sharded by city or trip id." }) },
  { id: "db_pay", label: "Payments DB", kind: "db", shape: "cylinder", x: 630, y: 522, w: 96, h: 46, info: I({ does: "Ledger, owned by Payments only.", why: "Strong consistency needed.", stores: "Charges.", onFail: "Payments queue for retry.", onTraffic: "Write-heavy, with strict transactions." }) },
  { id: "db_menu", label: "Menu DB", kind: "db", shape: "cylinder", x: 810, y: 522, w: 96, h: 46, info: I({ does: "Menus, owned by Menu store only.", why: "Merchant data ownership.", stores: "Menus.", onFail: "Menus unavailable.", onTraffic: "Read replicas + cache." }) },
];

/* Edges per phase. "a>b" = a calls b. */
type Phase = 0 | 1 | 2 | 3 | 4;
const P: Record<Phase, string[]> = {
  0: ["rider>nginx", "driver>nginx", "eats>nginx", "nginx>rtapi", "rtapi>d_dispatch", "rtapi>d_eta", "rtapi>d_fare", "rtapi>d_pay", "rtapi>d_menu"],
  1: ["rider>nginx", "driver>nginx", "eats>nginx", "nginx>g1", "nginx>g2", "nginx>gN", "g1>d_fare", "g1>d_eta", "g1>d_dispatch", "g1>d_pay", "g2>d_dispatch", "gN>d_menu", "gN>d_eta"],
  2: ["rider>edge", "driver>edge", "eats>edge", "edge>pr_trips", "edge>pr_pricing", "edge>pr_pay", "edge>pr_store",
    "pr_trips>d_dispatch", "pr_trips>d_eta", "pr_pricing>d_fare", "pr_pay>d_pay", "pr_store>d_menu", "pr_store>d_eta"],
  3: ["rider>edge", "driver>edge", "eats>edge", "edge>p_home", "edge>p_driver", "edge>p_eats",
    "p_home>pr_pricing", "p_home>pr_trips", "p_home>pr_pay", "p_driver>pr_trips", "p_eats>pr_store", "p_eats>pr_pricing",
    "pr_trips>d_dispatch", "pr_trips>d_eta", "pr_pricing>d_fare", "pr_pay>d_pay", "pr_store>d_menu", "pr_store>d_eta"],
  4: [],
};
P[4] = [...P[3], "d_dispatch>db_trips", "d_pay>db_pay", "d_menu>db_menu"];

/* User-facing flows, as the edges each one uses, per phase. */
const FLOWS = ["Rider: home screen", "Rider: request trip", "Driver: accept trip", "Eats: browse feed", "Rider: pay"] as const;
type Flow = (typeof FLOWS)[number];
const F: Record<Phase, Record<Flow, string[]>> = {
  0: {
    "Rider: home screen": ["rider>nginx", "nginx>rtapi", "rtapi>d_fare", "rtapi>d_eta"],
    "Rider: request trip": ["rider>nginx", "nginx>rtapi", "rtapi>d_dispatch"],
    "Driver: accept trip": ["driver>nginx", "nginx>rtapi", "rtapi>d_dispatch"],
    "Eats: browse feed": ["eats>nginx", "nginx>rtapi", "rtapi>d_menu", "rtapi>d_eta"],
    "Rider: pay": ["rider>nginx", "nginx>rtapi", "rtapi>d_pay"],
  },
  1: {
    "Rider: home screen": ["rider>nginx", "nginx>g1", "g1>d_fare", "g1>d_eta"],
    "Rider: request trip": ["rider>nginx", "nginx>g1", "g1>d_dispatch"],
    "Driver: accept trip": ["driver>nginx", "nginx>g2", "g2>d_dispatch"],
    "Eats: browse feed": ["eats>nginx", "nginx>gN", "gN>d_menu", "gN>d_eta"],
    "Rider: pay": ["rider>nginx", "nginx>g1", "g1>d_pay"],
  },
  2: {
    "Rider: home screen": ["rider>edge", "edge>pr_pricing", "pr_pricing>d_fare", "edge>pr_trips", "pr_trips>d_eta"],
    "Rider: request trip": ["rider>edge", "edge>pr_trips", "pr_trips>d_dispatch"],
    "Driver: accept trip": ["driver>edge", "edge>pr_trips", "pr_trips>d_dispatch"],
    "Eats: browse feed": ["eats>edge", "edge>pr_store", "pr_store>d_menu", "pr_store>d_eta"],
    "Rider: pay": ["rider>edge", "edge>pr_pay", "pr_pay>d_pay"],
  },
  3: {
    "Rider: home screen": ["rider>edge", "edge>p_home", "p_home>pr_pricing", "pr_pricing>d_fare", "p_home>pr_trips", "pr_trips>d_eta"],
    "Rider: request trip": ["rider>edge", "edge>p_home", "p_home>pr_trips", "pr_trips>d_dispatch"],
    "Driver: accept trip": ["driver>edge", "edge>p_driver", "p_driver>pr_trips", "pr_trips>d_dispatch"],
    "Eats: browse feed": ["eats>edge", "edge>p_eats", "p_eats>pr_store", "pr_store>d_menu", "pr_store>d_eta"],
    "Rider: pay": ["rider>edge", "edge>p_home", "p_home>pr_pay", "pr_pay>d_pay"],
  },
  4: {} as Record<Flow, string[]>,
};
F[4] = {
  ...F[3],
  "Rider: request trip": [...F[3]["Rider: request trip"], "d_dispatch>db_trips"],
  "Driver: accept trip": [...F[3]["Driver: accept trip"], "d_dispatch>db_trips"],
  "Eats: browse feed": [...F[3]["Eats: browse feed"], "d_menu>db_menu"],
  "Rider: pay": [...F[3]["Rider: pay"], "d_pay>db_pay"],
};

const VISIBLE: Record<Phase, string[]> = {
  0: ["rider", "driver", "eats", "nginx", "rtapi", "d_dispatch", "d_eta", "d_fare", "d_pay", "d_menu"],
  1: ["rider", "driver", "eats", "nginx", "g1", "g2", "gN", "d_dispatch", "d_eta", "d_fare", "d_pay", "d_menu"],
  2: ["rider", "driver", "eats", "edge", "pr_trips", "pr_pricing", "pr_pay", "pr_store", "d_dispatch", "d_eta", "d_fare", "d_pay", "d_menu"],
  3: ["rider", "driver", "eats", "edge", "p_home", "p_driver", "p_eats", "pr_trips", "pr_pricing", "pr_pay", "pr_store", "d_dispatch", "d_eta", "d_fare", "d_pay", "d_menu"],
  4: BASE.map((n) => n.id).filter((id) => !["nginx", "rtapi", "g1", "g2", "gN"].includes(id)),
};

const ALL_EDGES: DEdge[] = [...new Set(Object.values(P).flat())].map((id) => {
  const [from, to] = id.split(">");
  return { id, from, to };
});

const nodesOf = (edges: string[]) => new Set(edges.flatMap((e) => e.split(">")));

/** Packets for one flow: forward hops by call depth, then the replies in reverse. */
function flowPackets(edges: string[], failed: Set<string>): Packet[] {
  const depth = new Map<string, number>();
  const root = edges[0].split(">")[0];
  depth.set(root, 0);
  const hop: { e: string; d: number }[] = [];
  const blocked = new Set<string>();
  for (const e of edges) {
    const [a, b] = e.split(">");
    if (blocked.has(a) || failed.has(a)) { blocked.add(b); continue; }
    const d = depth.get(a) ?? 0;
    depth.set(b, d + 1);
    hop.push({ e, d });
    if (failed.has(b)) blocked.add(b);
  }
  const D = Math.max(1, ...hop.map((h) => h.d + 1));
  const seg = 1 / (2 * D);
  const broken = hop.some((h) => failed.has(h.e.split(">")[1]));
  const out: Packet[] = [];
  for (const h of hop) {
    const intoFailed = failed.has(h.e.split(">")[1]);
    out.push({ edge: h.e, at: [h.d * seg, (h.d + 1) * seg], tone: intoFailed ? "err" : "req" });
    const back = 2 * D - h.d - 1;
    out.push({ edge: h.e, reverse: true, at: [back * seg, (back + 1) * seg], tone: broken ? "err" : "res", label: h.d === 0 ? (broken ? "503" : "200 OK") : undefined });
  }
  return out;
}

const PHASES: { title: string; caption: string; detail: string[] }[] = [
  {
    title: "One gateway",
    caption: "Gen 2 as a mental model: every API of every app lives in one gateway codebase that also holds business logic.",
    detail: [
      "Tight coupling means one component can't change, deploy or fail without affecting others. Here, ~1,600 APIs share one codebase, one dependency tree (2,500 npm libraries) and one test suite.",
      "Click RTAPI and fail it: every flow for every app goes red. That's the blast radius of an all-encompassing gateway.",
    ],
  },
  {
    title: "Gateway groups",
    caption: "Gen 2 as deployed: the same codebase split into ~40 independently deployed gateway groups, so load and crashes are isolated.",
    detail: [
      "Splitting deployments reduces the runtime blast radius: fail Group 2 and only driver flows break.",
      "It doesn't remove the organisational coupling: one monorepo, one language runtime to upgrade, shared libraries and a shared review process. The business logic still lives in the gateway.",
    ],
  },
  {
    title: "Edge + product",
    caption: "Gen 3 begins: a thin, config-driven Edge Gateway handles only cross-cutting concerns. Business logic moves into reusable product services.",
    detail: [
      "The edge layer keeps authentication, rate limiting, routing and monitoring, and gives up backend-for-frontend and round-trip reduction.",
      "Watch the rider home screen: without an aggregation layer the phone now makes two calls (pricing and trips). On mobile networks every extra round trip costs latency. That's the gap the next layer fills.",
    ],
  },
  {
    title: "Presentation layer",
    caption: "Presentation services (backends-for-frontend) aggregate product APIs into exactly what each screen needs, back to one round trip.",
    detail: [
      "A presentation service is owned by the team that owns the screen. It can change its response shape without asking the gateway team or the product teams.",
      "A product service is the opposite: generic and reusable. The Trips API serves rider, driver and other surfaces, so it changes carefully and stays backward compatible.",
    ],
  },
  {
    title: "Domain layer + ownership",
    caption: "Leaf domain services own one refined capability and their own database. Each box can be built, deployed and scaled by one team.",
    detail: [
      "A service boundary is a line nobody crosses except through the API: other teams never read Dispatch's database directly. That's what makes independent deployment possible.",
      "The price: network calls instead of function calls, partial failures, distributed tracing, versioned contracts and data consistency across services. Fail 'Menu store' and only the Eats flow breaks: a small blast radius, bought with operational complexity.",
    ],
  },
];

export default function Gen3Evolution() {
  const [flow, setFlow] = useState<Flow>("Rider: home screen");
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string | null>(null);
  const [explain, setExplain] = useState(false);

  const steps: Step[] = useMemo(() => PHASES.map((ph, i) => ({
    title: ph.title, caption: ph.caption, detail: ph.detail, duration: 3600,
    active: [...nodesOf(F[i as Phase][flow])],
    packets: flowPackets(F[i as Phase][flow], failed),
  })), [flow, failed]);
  const tl = useTimeline(steps);
  const phase = tl.index as Phase;

  const nodes = useMemo(() => {
    const vis = new Set(VISIBLE[phase]);
    return BASE.map((n) => ({ ...n, hidden: !vis.has(n.id) }));
  }, [phase]);
  const edges = useMemo(() => {
    const on = new Set(P[phase]);
    return ALL_EDGES.map((e) => ({ ...e, hidden: !on.has(e.id) }));
  }, [phase]);

  // Flow health and node status under the current failures.
  const health = FLOWS.map((f) => ({ f, ok: ![...nodesOf(F[phase][f])].some((n) => failed.has(n)) }));
  const status: Record<string, NodeStatus> = {};
  for (const id of failed) status[id] = "down";
  // Per broken flow: callers upstream of the failure are degraded (their
  // requests fail); services downstream of it are healthy but get no traffic.
  const upstream = new Map<Flow, Set<string>>();
  for (const f of FLOWS) {
    const es = F[phase][f].map((e) => { const [from, to] = e.split(">"); return { from, to }; });
    upstream.set(f, blastRadius(es, [...nodesOf(F[phase][f])].filter((n) => failed.has(n))));
  }
  for (const id of VISIBLE[phase]) {
    if (failed.has(id)) continue;
    const through = FLOWS.filter((f) => nodesOf(F[phase][f]).has(id));
    const broken = through.filter((f) => !health.find((h) => h.f === f)!.ok);
    if (!through.length || broken.length < through.length) continue;
    status[id] = broken.some((f) => upstream.get(f)!.has(id)) ? "degraded" : "dim";
  }
  const brokenCount = health.filter((h) => !h.ok).length;
  const node = nodes.find((n) => n.id === sel && !n.hidden) ?? null;

  const toggleFail = (id: string) => setFailed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <LabFrame eyebrow="Uber · Lab 4" title="From one gateway to a layered, self-service architecture" simulated={false}>
      <Controls tl={tl} explain={explain} onExplain={() => setExplain((e) => !e)} />
      <StepChips tl={tl} titles={PHASES.map((p) => p.title)} />
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Request flow to animate">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-lab-muted">Animate flow</span>
        {FLOWS.map((f) => (
          <button key={f} type="button" onClick={() => setFlow(f)} aria-pressed={flow === f}
            className={`rounded-full border px-2.5 py-1 text-[11.5px] ${flow === f ? "border-sky-400 bg-sky-400/15 text-sky-100" : "border-lab-line bg-lab-raised text-slate-300"}`}>{f}</button>
        ))}
      </div>
      <Diagram width={960} height={560} nodes={nodes} edges={edges} packets={tl.step.packets} t={tl.t}
        active={tl.step.active} status={status} selected={sel} onSelect={setSel} zoomable
        underlay={phase >= 2 ? (
          <g fontSize="11" fill="#64748b">
            {[["Edge layer", 118], ...(phase >= 3 ? [["Presentation", 222]] : []), ["Product layer", 322], ["Domain layer", 428]].map(([l, y]) => (
              <g key={l as string}>
                <rect x={6} y={(y as number) - 44} width={948} height={88} rx={10} fill="#ffffff" opacity={0.018} />
                <text x={14} y={(y as number) - 30}>{l as string}</text>
              </g>
            ))}
          </g>
        ) : undefined}
        ariaLabel={`Architecture phase ${phase + 1} of 5: ${PHASES[phase].title}. Animating the ${flow} flow.`} />
      <Legend kinds={["client", "edge", "gateway", "presentation", "product", "service", "db"]} />
      <StepPanel tl={tl} explain={explain} />

      <div className="rounded-xl border border-lab-line bg-lab-raised p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300">Failure blast radius</p>
          <p className="text-xs text-lab-muted">{failed.size ? `${[...failed].map((id) => BASE.find((n) => n.id === id)?.label).join(", ")} down → ${brokenCount}/${FLOWS.length} user flows broken.` : "Click a component, then \"Fail this service\"."}
            {failed.size > 0 && " Amber = callers whose requests now fail; faded = healthy services that no longer receive traffic."}</p>
          {failed.size > 0 && <Btn onClick={() => setFailed(new Set())} label="Recover all">Recover all</Btn>}
        </div>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {health.map((h) => (
            <li key={h.f} className={`rounded-md border px-2 py-1 text-[11.5px] ${h.ok ? "border-emerald-500/40 text-emerald-200" : "border-rose-500/60 bg-rose-500/10 text-rose-200"}`}>
              {h.ok ? "✓" : "✗"} {h.f}
            </li>
          ))}
        </ul>
      </div>

      <InfoPanel node={node} nodes={nodes} edges={edges} status={node ? status[node.id] : undefined} onClose={() => setSel(null)}
        actions={node && node.kind !== "client" ? (
          <Btn onClick={() => toggleFail(node.id)} label={failed.has(node.id) ? "Recover this service" : "Fail this service"} pressed={failed.has(node.id)}>
            {failed.has(node.id) ? "↺ Recover" : "⚡ Fail this service"}
          </Btn>
        ) : undefined} />
      <p className="text-[11px] text-lab-muted">Layer roles from Uber Engineering, "Designing Edge Gateway" (2020), Fig. 3 (edge, presentation, product and domain layers). Service names, APIs and dependencies are an illustrative teaching model, not Uber's actual services.</p>
    </LabFrame>
  );
}
