import { useMemo, useState } from "react";
import { Controls, StepChips, StepPanel } from "../engine/Controls";
import { Diagram, Legend } from "../engine/Diagram";
import { InfoPanel, LabFrame } from "../engine/LabFrame";
import type { DEdge, DNode, Step } from "../engine/types";
import { useTimeline } from "../engine/useTimeline";

// Reconstruction of Fig. 1 in Uber's "Designing Edge Gateway" (2020):
// rider + driver apps -> one endpoint "/" -> nginx (auth/ssl) -> dispatch;
// "ApiCommand" messages are proxied on to the api service.
const NODES: DNode[] = [
  {
    id: "rider", label: "Rider app", sub: "mobile client", kind: "client", shape: "phone", x: 80, y: 120, w: 112, h: 50,
    info: {
      does: "Sends every request, real-time or not, to the same endpoint \"/\". The JSON body's messageType says what it wants.",
      why: "One endpoint kept the 2014 client simple: one connection, one URL, one message format.",
      onFail: "Only this user is affected. Clients retry, so a backend outage turns into a wave of retries.",
      onTraffic: "More riders mean more messages into the single endpoint; the client can't spread load itself.",
    },
  },
  {
    id: "driver", label: "Driver app", sub: "mobile client", kind: "client", shape: "phone", x: 80, y: 250, w: 112, h: 50,
    info: {
      does: "Sends driver operations (go online, accept or reject a trip) as messageTypes to the same \"/\" endpoint.",
      why: "Drivers and riders shared the same dispatch-centred backend.",
      onFail: "That driver can't accept trips, so nearby riders see fewer available cars.",
      onTraffic: "Drivers send frequent updates, so their traffic competes with riders' requests at dispatch.",
    },
  },
  {
    id: "nginx", label: "nginx", sub: "auth / ssl", kind: "edge", shape: "bar", x: 270, y: 185, w: 92, h: 230,
    info: {
      does: "Terminates TLS (decrypts HTTPS), checks the request is authenticated, then reverse-proxies it to dispatch.",
      why: "TLS and authentication are cross-cutting: every request needs them, so they run once at the edge instead of in every service.",
      stores: "TLS certificates and private keys; no business data.",
      onFail: "Nothing gets in: riders and drivers are cut off even though dispatch and api are healthy.",
      onTraffic: "TLS handshakes cost CPU. NGINX is event-driven and scales well, but it's still a single entry point that must be replicated.",
      api: ["path: /", "TLS 443 → HTTP"],
    },
  },
  {
    id: "dispatch", label: "dispatch service", sub: "switch(messageType)", kind: "service", x: 520, y: 150, w: 170, h: 210,
    info: {
      does: "Reads messageType and invokes the matching RPC handler. About 15 commands were reserved for critical real-time operations such as requesting, accepting and rejecting trips.",
      why: "Matching riders to drivers is Uber's core real-time job, so the earliest backend was built around it.",
      onFail: "Total outage: trip requests fail, and so does every ApiCommand, because those are also routed through dispatch.",
      onTraffic: "Every message lands here first. Non-trip traffic (ApiCommand) competes for the same capacity as the latency-critical trip commands.",
      api: ["requestTrip", "…~15 real-time commands", "ApiCommand → proxy"],
    },
  },
  {
    id: "api", label: "api service", sub: "everything else", kind: "service", x: 790, y: 300, w: 140, h: 120,
    info: {
      does: "Handles the non-real-time product logic that dispatch forwards as ApiCommand: the original 'everything else' service.",
      why: "Keeps non-dispatch logic out of the dispatch codebase.",
      onFail: "ApiCommand requests fail; real-time trip commands handled inside dispatch keep working.",
      onTraffic: "Gets load only through dispatch, so it can't be scaled or protected independently of dispatch's behaviour.",
      api: ["ApiCommand (proxied, + context)"],
    },
  },
];

const EDGES: DEdge[] = [
  { id: "r-n", from: "rider", to: "nginx", label: "path: /" },
  { id: "d-n", from: "driver", to: "nginx", label: "path: /" },
  { id: "n-d1", from: "nginx", to: "dispatch", curve: -0.12, label: "requestTrip" },
  { id: "n-d2", from: "nginx", to: "dispatch", curve: 0.12, label: "ApiCommand" },
  { id: "d-a", from: "dispatch", to: "api", dashed: true, label: "proxy" },
];

const REQ = `POST / HTTP/1.1            ← one endpoint for everything
Host: <uber backend>
Authorization: Bearer <token>
Content-Type: application/json

{
  "messageType": "requestTrip",
  "pickup":  { "lat": 37.7749, "lng": -122.4194 },
  "vehicle": "uberX"
}
// illustrative payload: field names are not Uber's`;

const API_REQ = `POST / HTTP/1.1
Authorization: Bearer <token>

{
  "messageType": "ApiCommand",
  "command": "getPaymentProfiles"   // illustrative
}`;

const STEPS: Step[] = [
  {
    title: "One endpoint",
    caption: "The rider app sends every request to the same URL path, \"/\". The body's messageType decides what happens.",
    active: ["rider", "nginx"],
    packets: [{ edge: "r-n", label: "requestTrip", at: [0, 0.9] }],
    wire: [{ label: "HTTP request", body: REQ }],
    detail: [
      "In 2014 Uber's backend was essentially two services, dispatch and api. Both mobile apps talked to dispatch through a single endpoint hosted at \"/\".",
      "This is RPC over HTTP: the URL doesn't identify the resource. A field inside the message names the procedure to call.",
    ],
  },
  {
    title: "TLS + auth at nginx",
    caption: "nginx terminates TLS, checks authentication, and reverse-proxies the now-plain HTTP request inward.",
    active: ["nginx"],
    duration: 2000,
    detail: [
      "SSL/TLS termination means the encrypted connection ends here. nginx holds the certificate, does the handshake and decrypts, so services behind it receive ordinary HTTP over the private network.",
      "Authentication answers \"who is calling?\". Doing it once at the edge means dispatch can trust an identity attached to the request instead of re-verifying credentials.",
      "Uber's Fig. 1 labels this box \"nginx (auth/ssl)\"; the article text itself doesn't describe it further.",
    ],
  },
  {
    title: "Route by messageType",
    caption: "Dispatch reads messageType = requestTrip, one of ~15 reserved real-time commands, and runs that handler itself.",
    active: ["nginx", "dispatch"],
    packets: [{ edge: "n-d1", label: "requestTrip", at: [0, 0.8] }],
    detail: [
      "This is request routing done in application code: a switch statement on messageType. A real gateway does the same job with a declarative routing table (method + path → upstream).",
      "Because routing lives inside dispatch, adding a new command means changing and redeploying dispatch, the most critical service in the company.",
    ],
  },
  {
    title: "Trip handled, respond",
    caption: "Dispatch matches the trip and the response flows back through nginx to the rider.",
    active: ["rider", "nginx", "dispatch"],
    packets: [
      { edge: "n-d1", reverse: true, label: "200 OK", at: [0, 0.5] },
      { edge: "r-n", reverse: true, label: "200 OK", at: [0.5, 1] },
    ],
  },
  {
    title: "Everything else: ApiCommand",
    caption: "A non-trip request (say, loading payment methods) is sent as messageType = ApiCommand. It still goes to dispatch first.",
    active: ["rider", "nginx", "dispatch"],
    packets: [
      { edge: "r-n", label: "ApiCommand", at: [0, 0.45] },
      { edge: "n-d2", label: "ApiCommand", at: [0.5, 1] },
    ],
    wire: [{ label: "HTTP request", body: API_REQ }],
  },
  {
    title: "Dispatch proxies to api",
    caption: "Dispatch adds context and forwards ApiCommand to the api service. In effect, ApiCommand was Uber's first gateway.",
    active: ["dispatch", "api"],
    packets: [{ edge: "d-a", label: "ApiCommand + ctx", at: [0, 0.6] }, { edge: "d-a", reverse: true, label: "result", at: [0.65, 1] }],
    detail: [
      "Uber's article puts it this way: in gateway terms, it looked like ApiCommand was the gateway into Uber.",
      "A reverse proxy forwards a request it received to another server and relays the answer back; the client never talks to that server directly. Here the real-time core is doing that job for a completely unrelated workload.",
    ],
  },
  {
    title: "Response returns",
    caption: "The result goes back through dispatch and nginx: two hops for a request that never needed dispatch.",
    active: ["rider", "nginx", "dispatch", "api"],
    packets: [
      { edge: "n-d2", reverse: true, label: "200 OK", at: [0, 0.5] },
      { edge: "r-n", reverse: true, label: "200 OK", at: [0.5, 1] },
    ],
  },
  {
    title: "Where this creaks",
    caption: "Every request, real-time or not, depends on dispatch. Click dispatch to see what its failure means.",
    active: ["dispatch"],
    duration: 2600,
    detail: [
      "Coupling: the api service's availability is capped by dispatch's availability, because every path goes through dispatch.",
      "Contention: low-priority product traffic shares capacity with latency-critical trip commands, so a spike in one slows the other.",
      "Velocity: new client features need a dispatch change. The fix was a real API gateway, the second generation (next lab).",
    ],
  },
];

export default function Gen1Dispatch() {
  const tl = useTimeline(STEPS);
  const [explain, setExplain] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const node = useMemo(() => NODES.find((n) => n.id === sel) ?? null, [sel]);
  return (
    <LabFrame eyebrow="Uber · Lab 1" title="Gen 1 (2014): one endpoint, routed by messageType" simulated={false}>
      <Controls tl={tl} explain={explain} onExplain={() => setExplain((e) => !e)} />
      <StepChips tl={tl} titles={STEPS.map((s) => s.title)} />
      <Diagram width={900} height={380} nodes={NODES} edges={EDGES} packets={tl.step.packets} t={tl.t}
        active={tl.step.active} selected={sel} onSelect={setSel} zoomable
        ariaLabel="Uber first-generation architecture: rider and driver apps send all requests to path slash through nginx to the dispatch service, which proxies ApiCommand messages to the api service" />
      <Legend kinds={["client", "edge", "service"]} />
      <StepPanel tl={tl} explain={explain} />
      <InfoPanel node={node} nodes={NODES} edges={EDGES} onClose={() => setSel(null)} />
      <p className="text-[11px] text-lab-muted">Reconstructed from Fig. 1 of Uber Engineering, "Designing Edge Gateway, Uber's API Lifecycle Management Platform" (2020). Payload fields are illustrative.</p>
    </LabFrame>
  );
}
