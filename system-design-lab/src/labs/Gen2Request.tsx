import { useMemo, useState } from "react";
import { Controls, StepChips, StepPanel } from "../engine/Controls";
import { Diagram, Legend } from "../engine/Diagram";
import { InfoPanel, LabFrame } from "../engine/LabFrame";
import type { DEdge, DNode, NodeInfo, Step } from "../engine/types";
import { useTimeline } from "../engine/useTimeline";

// Reconstruction of Fig. 2 in Uber's "Designing Edge Gateway" (2020):
// RTAPI, "the all-encompassing gateway": apps -> nginx (auth/ssl) ->
// gateway groups (each with an API platform) -> ~2,200 microservices.
const svc = (id: string, x: number, y: number, info?: NodeInfo): DNode =>
  ({ id, label: "service", kind: "service", shape: "circle", x, y, w: 58, info });

const MS_INFO: NodeInfo = {
  does: "A domain microservice owning one capability (e.g. pricing, trip state, payments). It is called by the gateway or by other services.",
  why: "Uber adopted microservices early; the article cites 2,200+ of them by 2019. Each one can be built, deployed and scaled by its own team.",
  onFail: "Callers get errors or timeouts. If the gateway endpoint calling it has no fallback, that whole API fails even though other services are fine.",
  onTraffic: "Scales horizontally behind its own load balancer, but every gateway endpoint that fans out to it multiplies its load.",
  db: "Its own datastore",
};

const GROUP_INFO = (n: string): NodeInfo => ({
  does: `Gateway group ${n}: a bundle of public API endpoints running on the shared API platform. The platform enforces validation, rate limiting, logging, localization and SLA metrics, then calls downstream microservices and shapes one response.`,
  why: "RTAPI grew into one huge Node.js codebase (~1M lines, 110 logical endpoint groups). It was deployed as 40+ independent services so that one group's load or crash couldn't take down the rest.",
  onFail: `APIs in group ${n} fail. Other groups keep serving, but they share code, libraries and the release process.`,
  onTraffic: "Scales by adding instances. The harder limit is human: about 40% of engineering committed code here, so reviews, tests (50,000 per diff) and deploys become a queue.",
  api: [`group ${n} endpoints`, "/…"],
});

const NODES: DNode[] = [
  { id: "rider", label: "Rider", kind: "client", shape: "phone", x: 340, y: 46, w: 90, h: 40, info: { does: "Uber rider app.", why: "One of 20+ mobile and web clients served by RTAPI.", onFail: "Only this client is affected.", onTraffic: "Client traffic lands on the shared gateway." } },
  { id: "driver", label: "Driver", kind: "client", shape: "phone", x: 470, y: 46, w: 90, h: 40, info: { does: "Uber driver app.", why: "Driver flows were served by the same gateway.", onFail: "Only this client is affected.", onTraffic: "Frequent driver calls share the gateway's capacity." } },
  { id: "eats", label: "Eats", kind: "client", shape: "phone", x: 600, y: 46, w: 90, h: 40, info: { does: "Uber Eats app.", why: "A new business line served by the same gateway.", onFail: "Only this client is affected.", onTraffic: "Eats peaks (lunch, dinner) land on shared infrastructure." } },
  {
    id: "nginx", label: "nginx (auth/ssl)", kind: "edge", shape: "bar", x: 470, y: 128, w: 620, h: 34,
    info: {
      does: "Edge reverse proxy: terminates TLS, authenticates the caller and forwards each request to the gateway group that owns the path.",
      why: "Keeps encryption and identity in one hardened place in front of every API.",
      stores: "TLS certificates; no business data.",
      onFail: "Every API for every app is unreachable. This is a single point of failure unless it's replicated across machines and data centres.",
      onTraffic: "Spends CPU on TLS handshakes. It's replicated behind DNS / L4 load balancers.",
      api: ["443 HTTPS → HTTP", "route by path prefix"],
    },
  },
  { id: "g1", label: "Gateway Group 1", sub: "API platform", kind: "gateway", x: 220, y: 222, w: 150, h: 58, info: GROUP_INFO("1") },
  { id: "g2", label: "Gateway Group 2", sub: "API platform", kind: "gateway", x: 470, y: 222, w: 150, h: 58, info: GROUP_INFO("2") },
  { id: "gN", label: "Gateway Group N", sub: "API platform", kind: "gateway", x: 720, y: 222, w: 150, h: 58, info: GROUP_INFO("N") },
  svc("s1", 110, 325), svc("s2", 260, 325, MS_INFO), svc("s3", 410, 325), svc("s4", 540, 325, MS_INFO),
  svc("s5", 670, 325, MS_INFO), svc("s6", 820, 325),
  svc("s7", 210, 420, MS_INFO), svc("s8", 350, 420, MS_INFO), svc("s9", 480, 420, MS_INFO), svc("s10", 610, 420), svc("s11", 760, 420, MS_INFO),
];

const EDGES: DEdge[] = [
  { id: "r-n", from: "rider", to: "nginx" }, { id: "d-n", from: "driver", to: "nginx" }, { id: "e-n", from: "eats", to: "nginx" },
  { id: "n-g1", from: "nginx", to: "g1" }, { id: "n-g2", from: "nginx", to: "g2" }, { id: "n-gN", from: "nginx", to: "gN" },
  { id: "g1-s2", from: "g1", to: "s2" },
  { id: "g2-s2", from: "g2", to: "s2", curve: 0.1 }, { id: "g2-s9", from: "g2", to: "s9" }, { id: "g2-s5", from: "g2", to: "s5", curve: -0.1 },
  { id: "gN-s5", from: "gN", to: "s5" }, { id: "gN-s11", from: "gN", to: "s11" },
  { id: "s2-s7", from: "s2", to: "s7" }, { id: "s2-s8", from: "s2", to: "s8" }, { id: "s5-s4", from: "s5", to: "s4" },
];

const STEPS: Step[] = [
  {
    title: "TLS handshake",
    caption: "The rider app opens an encrypted HTTPS connection. TLS ends at the edge (nginx), not at the services.",
    active: ["rider", "nginx"],
    packets: [{ edge: "r-n", label: "ClientHello", at: [0, 0.45] }, { edge: "r-n", reverse: true, label: "ServerHello+cert", at: [0.5, 0.95] }],
    wire: [{ label: "TLS 1.3", body: `C → S  ClientHello  (key share, SNI)\nS → C  ServerHello, Certificate,\n       CertificateVerify, Finished\nC → S  Finished\n— 1 round trip; then encrypted HTTP —` }],
    detail: [
      "TLS gives three things: encryption (no one on the network can read the request), integrity (no one can modify it) and server authentication (the certificate proves this really is the backend).",
      "TLS 1.3 needs one round trip before the first encrypted request; resumed connections can do 0-RTT. On a 150 ms mobile link that round trip is user-visible, which is why apps reuse connections.",
    ],
  },
  {
    title: "SSL termination",
    caption: "nginx decrypts the request. Behind it, traffic travels inside the data centre network as plain HTTP (or is re-encrypted with mTLS).",
    active: ["nginx"],
    packets: [{ edge: "r-n", label: "POST /trips (encrypted)", at: [0, 0.8] }],
    wire: [{ label: "decrypted request", body: `POST /trips/estimate HTTP/1.1   // illustrative path\nHost: <gateway>\nAuthorization: Bearer eyJhbGciOi...\nContent-Type: application/json\n\n{ "pickup": {"lat":37.7749,"lng":-122.4194},\n  "dropoff":{"lat":37.7952,"lng":-122.4028} }` }],
    detail: [
      "Terminating TLS at the edge centralises certificates and the CPU-heavy handshake work, and lets the edge inspect the request (path, headers) to route it.",
      "The trade-off is that traffic behind the edge is only as safe as the internal network. Zero-trust designs re-encrypt hop by hop with mutual TLS.",
    ],
  },
  {
    title: "Authenticate",
    caption: "The token is checked. If it's invalid the request stops here with 401; if valid, the caller's identity is attached for downstream services.",
    active: ["nginx"],
    duration: 2000,
    wire: [
      { label: "valid", body: `→ token signature/expiry OK\n→ forward with identity context:\n  x-user-id: 8c1f…   // illustrative header` },
      { label: "invalid", body: `HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer error="invalid_token"` },
    ],
    detail: [
      "Authentication = who are you? Authorization = what may you do? The edge usually does authentication; the service that owns the data still decides authorization (can this rider see this trip?).",
      "Rejecting bad requests at the edge protects every downstream service from wasted work.",
    ],
  },
  {
    title: "Classify + route",
    caption: "The path /trips/... matches the routing table entry owned by Gateway Group 2, so the request is reverse-proxied there.",
    active: ["nginx", "g2"],
    packets: [{ edge: "n-g2", label: "/trips/*", at: [0.1, 0.9] }],
    wire: [{ label: "route table", body: `location /trips/  → gateway-group-2\nlocation /eats/   → gateway-group-N\nlocation /        → gateway-group-1\n// illustrative nginx-style rules` }],
    detail: [
      "Request classification uses method, path, headers or client type to decide which upstream owns the request. With RTAPI there were ~110 logical endpoint groupings, deployed as 40+ independent services.",
      "Reverse proxy: the client only ever talks to the edge. It doesn't know (or care) which machines actually served it, which lets the backend move, scale and split freely.",
    ],
  },
  {
    title: "Gateway logic",
    caption: "The API platform runs the shared gateway features: validation, rate limits, logging and metrics. Then the endpoint fans out to the services it needs, in parallel.",
    active: ["g2", "s2", "s9", "s5"],
    packets: [
      { edge: "g2-s2", label: "estimate", at: [0.15, 0.85] },
      { edge: "g2-s9", label: "eta", at: [0.2, 0.9] },
      { edge: "g2-s5", label: "promos", at: [0.25, 0.95] },
    ],
    detail: [
      "Uber lists the gateway's responsibilities: authentication, monitoring, data validation, security audit logging, debug logging, alerting, SLA measurement, data-centre stickiness, CORS, localization, caching, rate limiting, load shedding and field obfuscation.",
      "RTAPI also acted as a backend for the frontend: one client call fans out to many services, which reduces mobile round trips. That convenience is exactly how business logic leaked into the gateway.",
    ],
  },
  {
    title: "Services call services",
    caption: "Microservices call their own dependencies. One client request can become a tree of internal calls.",
    active: ["s2", "s7", "s8", "s5", "s4"],
    packets: [
      { edge: "s2-s7", at: [0, 0.6] }, { edge: "s2-s8", at: [0.1, 0.7] }, { edge: "s5-s4", at: [0.05, 0.65] },
      { edge: "s2-s7", reverse: true, at: [0.6, 1] }, { edge: "s2-s8", reverse: true, at: [0.7, 1] }, { edge: "s5-s4", reverse: true, at: [0.65, 1] },
    ],
    detail: [
      "Fan-out amplifies tail latency: if a request waits for 5 services in parallel, its latency is the slowest of the 5. If each has a 1% chance of a slow response, 1 − 0.99⁵ ≈ 4.9% of requests are slow.",
    ],
  },
  {
    title: "Aggregate + respond",
    caption: "Group 2 merges the results, localizes the text, shapes one JSON response, and nginx sends it back over the same TLS connection.",
    active: ["g2", "nginx", "rider", "s2", "s9", "s5"],
    packets: [
      { edge: "g2-s2", reverse: true, at: [0, 0.35] }, { edge: "g2-s9", reverse: true, at: [0, 0.35] }, { edge: "g2-s5", reverse: true, at: [0, 0.35] },
      { edge: "n-g2", reverse: true, label: "200 OK", at: [0.35, 0.68] },
      { edge: "r-n", reverse: true, label: "200 OK", at: [0.68, 1] },
    ],
    wire: [{ label: "response", body: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{ "fare":  "$14–18",\n  "eta_min": 4,\n  "promo":  "10% off" }   // illustrative` }],
  },
];

export default function Gen2Request() {
  const tl = useTimeline(STEPS);
  const [explain, setExplain] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const node = useMemo(() => NODES.find((n) => n.id === sel) ?? null, [sel]);
  return (
    <LabFrame eyebrow="Uber · Lab 2" title="Gen 2 (2015–2017): one request through RTAPI, the all-encompassing gateway" simulated={false}>
      <Controls tl={tl} explain={explain} onExplain={() => setExplain((e) => !e)} />
      <StepChips tl={tl} titles={STEPS.map((s) => s.title)} />
      <Diagram width={940} height={460} nodes={NODES} edges={EDGES} packets={tl.step.packets} t={tl.t}
        active={tl.step.active} selected={sel} onSelect={setSel} zoomable
        underlay={<>
          <text x={14} y={226} fontSize="11" fill="#94a3b8">~1,600 APIs</text><text x={14} y={240} fontSize="11" fill="#94a3b8">in ~40 gateways</text>
          <text x={14} y={368} fontSize="11" fill="#94a3b8">~2,200</text><text x={14} y={382} fontSize="11" fill="#94a3b8">microservices</text>
        </>}
        ariaLabel="Uber second-generation RTAPI architecture: rider, driver and Eats apps connect through nginx auth and SSL to gateway groups with an API platform, which call about 2,200 microservices" />
      <Legend kinds={["client", "edge", "gateway", "service"]} />
      <StepPanel tl={tl} explain={explain} />
      <InfoPanel node={node} nodes={NODES} edges={EDGES} onClose={() => setSel(null)} />
      <p className="text-[11px] text-lab-muted">Reconstructed from Fig. 2 of Uber Engineering, "Designing Edge Gateway" (2020). The ~1,600 APIs / ~40 gateways / ~2,200 microservices figures come from that illustration and are not current production numbers. Paths and payloads are illustrative.</p>
    </LabFrame>
  );
}
