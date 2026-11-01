/** Single source of truth for the curriculum shown in the progress board.
 *  Keep in sync with CURRICULUM.md and PROGRESS.md. */
export interface Lesson {
  no: string;
  title: string;
  slug: string;
  status: "live" | "planned";
  quiz?: string;
  labs?: string[];
}
export interface Module { id: string; title: string; lessons: Lesson[] }

const L = (no: string, title: string, slug: string, status: Lesson["status"] = "planned", quiz?: string, labs?: string[]): Lesson =>
  ({ no, title, slug, status, quiz, labs });

export const CURRICULUM: Module[] = [
  {
    id: "m1", title: "Module 1: Uber's API architecture evolution",
    lessons: [
      L("01", "Gen 1: one endpoint, routed by messageType", "uber-api-gateway-first-generation", "live", "m1-gen1", ["gen1-dispatch"]),
      L("02", "Gen 2: RTAPI, the all-encompassing API gateway", "uber-rtapi-api-gateway-bottleneck", "live", "m1-gen2", ["gen2-request", "gen2-traffic"]),
      L("03", "Gen 3: Edge Gateway and layered microservices", "uber-edge-gateway-microservices", "live", "m1-gen3", ["gen3-evolution", "gen-compare"]),
    ],
  },
  {
    id: "m2", title: "Module 2: What happens when someone requests a ride",
    lessons: [
      L("04", "The ride request lifecycle, end to end", "uber-ride-request-lifecycle"),
      L("05", "Uber H3: hexagonal hierarchical spatial index", "uber-h3-hexagonal-spatial-index"),
      L("06", "Scaling lab: from one rider to millions", "scaling-uber-one-user-to-millions"),
    ],
  },
  {
    id: "m3", title: "Module 3: APIs, query languages and communication",
    lessons: [L("07", "REST, GraphQL, gRPC, and the UberQL question", "rest-graphql-grpc-uber-communication")],
  },
  {
    id: "syl", title: "System design syllabus",
    lessons: [
      L("08", "Scalability fundamentals and the CAP theorem", "scalability-fundamentals-cap-theorem"),
      L("09", "Availability patterns: failover, DNS, CDN, load balancing", "availability-patterns-load-balancing-cdn"),
      L("10", "Application architecture and service discovery", "application-architecture-service-discovery"),
      L("11", "Databases: replication, sharding, NoSQL", "database-scaling-sharding-replication-nosql"),
      L("12", "Caching strategies", "caching-strategies-redis"),
      L("13", "Asynchronous architecture: queues and Kafka", "asynchronous-architecture-kafka-queues"),
      L("14", "Communication protocols: TCP, UDP, HTTP/2, WebSockets", "communication-protocols-tcp-udp-http2-websockets"),
      L("15", "Security: auth, OAuth 2.0, JWT, TLS, rate limiting", "system-design-security-auth-tls-rate-limiting"),
      L("16", "Math for system design + capacity calculators", "system-design-math-capacity-estimation"),
    ],
  },
  {
    id: "lab", title: "Failure laboratory",
    lessons: [L("17", "Failure lab: break it and watch it recover", "failure-lab-chaos-cap")],
  },
];
