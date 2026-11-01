import type { Quiz } from "../engine/KnowledgeCheck";

export const QUIZZES: Record<string, Quiz> = {
  "m1-gen1": {
    id: "m1-gen1",
    title: "Gen 1: dispatch and messageType",
    questions: [
      {
        q: "In Uber's 2014 design, how did the backend know whether a request was a trip request or something else?",
        options: ["A different URL path per operation", "A messageType field in the request body", "Different TCP ports", "A DNS name per service"],
        answer: 1,
        why: "Both apps posted to a single endpoint, \"/\". A messageType field in the body selected the RPC handler. That's RPC-style routing in application code, not resource-based REST routing.",
      },
      {
        q: "A request with messageType = ApiCommand needs only the api service. Which components must be healthy for it to succeed?",
        options: ["Only the api service", "nginx and the api service", "nginx, dispatch and the api service", "Only dispatch"],
        answer: 2,
        why: "Every request entered through dispatch, which proxied ApiCommand onward. A request's availability is roughly the product of the availability of every component on its path, so the extra dispatch hop lowers it.",
      },
      {
        q: "Why is SSL/TLS terminated at nginx instead of inside dispatch?",
        options: [
          "TLS only works on proxies",
          "To centralise certificates and handshake CPU and inspect requests before routing, so services receive plain HTTP",
          "Because dispatch is written in Python",
          "To make requests faster than unencrypted HTTP",
        ],
        answer: 1,
        why: "Terminating TLS at the edge means one hardened place holds the keys and pays the handshake cost. The proxy can then read paths and headers to route. The trade-off: internal traffic is unencrypted unless you re-encrypt (mTLS).",
      },
      {
        q: "What is the main architectural smell in Gen 1?",
        options: [
          "Too many microservices",
          "The latency-critical real-time core also acts as the router and proxy for unrelated traffic",
          "It used HTTPS",
          "It had no database",
        ],
        answer: 1,
        why: "Dispatch, the most critical service, was also the de facto gateway. That couples non-trip features to dispatch's capacity, deploys and failures, which is the motivation for a dedicated API gateway.",
      },
    ],
  },
  "m1-gen2": {
    id: "m1-gen2",
    title: "Gen 2: the all-encompassing gateway",
    questions: [
      {
        q: "A gateway tier has 2 instances × 64 concurrent workers and a mean service time of 40 ms. What is its capacity μ?",
        options: ["128 req/s", "1,600 req/s", "3,200 req/s", "5,120 req/s"],
        answer: 2,
        why: "Each worker serves 1000/40 = 25 req/s. 2 × 64 × 25 = 3,200 req/s. Set Lab 3 to these values and the capacity metric shows the same number.",
      },
      {
        q: "Offered load is 3,000 req/s against that 3,200 req/s capacity (ρ ≈ 0.94). What do you expect?",
        options: [
          "Latency stays near 40 ms because there is spare capacity",
          "Average throughput keeps up, but queueing makes tail latency (p99) climb steeply",
          "All requests fail",
          "Throughput doubles",
        ],
        answer: 1,
        why: "Below ρ = 1 the system keeps up on average, but waiting time grows like ρ/(1−ρ). At 0.94 bursts queue, so p95/p99 rise well above the service time. Never plan to run a tier close to 100% utilisation.",
      },
      {
        q: "Offered load rises to 5,000 req/s (λ > μ). Which statement is true?",
        options: [
          "Throughput rises to 5,000 req/s, just with higher latency",
          "Throughput caps at about μ; the queue fills, then the excess is shed or times out",
          "The queue drains on its own",
          "Only p50 changes",
        ],
        answer: 1,
        why: "When arrivals exceed service capacity the queue grows every second. A bounded queue then sheds load (503s) and waiting clients time out. Throughput can't exceed μ, and with timeouts some capacity is wasted on requests nobody is waiting for any more.",
      },
      {
        q: "Little's Law says L = λW. A gateway completes 2,000 req/s with 50 ms mean latency. How many requests are in flight on average?",
        options: ["40", "100", "2,050", "40,000"],
        answer: 1,
        why: "L = 2,000 req/s × 0.050 s = 100 requests. This is how you size connection pools and worker counts.",
      },
      {
        q: "Adding replicas fixed RTAPI's raw throughput. What could replicas NOT fix?",
        options: [
          "CPU saturation",
          "A bug shipped to the shared codebase, and the review/test/deploy queue shared by many teams",
          "Requests per second",
          "Instance crashes",
        ],
        answer: 1,
        why: "A bad deploy reaches every replica. Uber's article highlights organisational coupling: ~1M lines of code, 40% of engineering committing, 50,000 tests per diff, 2,500 npm libraries to upgrade together, and business logic leaking into the gateway.",
      },
      {
        q: "What does a reverse proxy do?",
        options: [
          "Hides the client's identity from websites",
          "Accepts client requests on behalf of backend servers, forwards them, and returns the responses, so clients never talk to backends directly",
          "Caches DNS",
          "Encrypts data at rest",
        ],
        answer: 1,
        why: "A forward proxy acts for clients; a reverse proxy acts for servers. That's what lets the backend split, move and scale without clients noticing, and it's the basis of every API gateway.",
      },
    ],
  },
  "m1-gen3": {
    id: "m1-gen3",
    title: "Gen 3: edge, presentation, product, domain",
    questions: [
      {
        q: "Which responsibilities did Uber deliberately remove from the edge layer in Gen 3?",
        options: ["Authentication and rate limiting", "Backend-for-frontend and reducing round trips", "Routing", "Monitoring"],
        answer: 1,
        why: "Uber's edge layer keeps the cross-cutting gateway features except 'backend for the frontend' and 'reduced round trips'. Those moved to presentation services owned by product teams.",
      },
      {
        q: "What's the difference between a presentation service and a product service?",
        options: [
          "They are the same thing",
          "A presentation service shapes data for one screen/feature (BFF); a product service exposes reusable functional APIs",
          "A product service renders HTML",
          "A presentation service owns the primary database",
        ],
        answer: 1,
        why: "Presentation = view generation and aggregation for a specific frontend, free to change with the UI. Product = reusable, backward-compatible APIs that many presentation services call.",
      },
      {
        q: "In Lab 4 (domain phase), the Menu store fails. Which user flow breaks?",
        options: ["All flows", "Only 'Eats: browse feed'", "Rider home screen", "Driver accept"],
        answer: 1,
        why: "Only the Eats feed depends on Menu store. Clear service boundaries and per-service ownership keep the blast radius small. Fail it in the lab to confirm.",
      },
      {
        q: "What makes independent deployment possible?",
        options: [
          "Sharing one database between services",
          "Stable API contracts at service boundaries, with each service owning its own data",
          "Deploying every service at the same time",
          "Using the same programming language everywhere",
        ],
        answer: 1,
        why: "If other teams only depend on your API, not your tables or internal code, you can deploy whenever you like as long as the contract stays backward compatible.",
      },
      {
        q: "Without a presentation layer (Lab 4, phase 3 'Edge + product'), what happens to the rider home screen?",
        options: ["Nothing changes", "The phone must call several product APIs itself, adding mobile round trips", "It gets faster", "It can't authenticate"],
        answer: 1,
        why: "Each extra call over a mobile network costs a round trip (often 50–300 ms). Presentation services restore one call per screen while keeping business logic out of the gateway.",
      },
      {
        q: "Which is a genuine new cost of Gen 3's microservices?",
        options: [
          "Bigger mobile apps",
          "Debugging and operating requests that span many services: tracing, versioned contracts, partial failures",
          "Lower security",
          "No way to scale",
        ],
        answer: 1,
        why: "Network calls replace function calls. You need distributed tracing, timeouts and retries, contract versioning and on-call ownership for every service. Gen 2 was easier to debug.",
      },
    ],
  },
};
