# Curriculum

Every lesson follows the teaching sequence:

**problem → bottleneck → concept → animation → trade-offs → knowledge check → engineering challenge**

Every syllabus topic must include:

1. a simple explanation;
2. the technical mechanism;
3. an Uber use case;
4. an animation or interactive visualization (where it helps);
5. the trade-offs;
6. an exercise;
7. a knowledge-check question.

Slugs live under `/digital-garden/system-design/<slug>/`. Mirrors `src/content/curriculum.ts`.

## Module 1: Uber's API architecture evolution

Source: Uber Engineering, *Designing Edge Gateway* (2020), Figs. 1–3; *DOMA* (2020).

> Correction to the original brief: in the reference image, the dispatch/`messageType` diagram is
> **Gen 1 (2014)** in Uber's article. The "Second gen: the all-encompassing gateway" caption
> belongs to the RTAPI diagram (1,600 APIs / 40 gateways / 2,200 microservices) below it. Module 1
> therefore covers three generations, and every question from the brief is answered.

| # | Lesson | Labs | Brief questions covered |
|---|---|---|---|
| 01 | Gen 1: one endpoint, routed by messageType | `gen1-dispatch` | SSL termination, auth, reverse proxy, routing, coupling, availability math |
| 02 | Gen 2: RTAPI, the all-encompassing gateway | `gen2-request`, `gen2-traffic` | Part A Q1–10: API gateway, NGINX, SSL termination, auth, reverse proxy, routing, bottleneck, gateway failure, tight coupling, maintainability; plus queueing math |
| 03 | Gen 3: Edge Gateway and layered microservices | `gen3-evolution`, `gen-compare` | Part B Q1–10: gateway groups, service boundary, microservice, product service, presentation service, communication, decentralization, ownership, independent deployment, microservice problems; side-by-side comparison |

## Module 2: What happens when someone requests a ride

| # | Lesson | Planned labs |
|---|---|---|
| 04 | Ride request lifecycle (8 stages: open app → payment) | 15-component reference architecture; per-stage animated request/response with wire inspector; DNS/TLS/HTTP, idempotency keys, queues, distributed locks, WebSockets, payment auth/capture |
| 05 | Uber H3 hexagonal hierarchical spatial index | Interactive hex map using **real `h3-js`** (`latLngToCell`, `gridDisk`, `cellToParent`, `cellToChildren`); controls for resolution, k-ring radius, drivers, riders and area; click a cell to inspect its index |
| 06 | Scaling lab: 1 rider → 10M | Staged infrastructure (single server → vertical → horizontal + LB → replicas/sharding → Redis → Kafka → multi-region); controls and metrics from the brief (§2C) |

## Module 3: APIs, query languages and communication

| # | Lesson | Planned labs |
|---|---|---|
| 07 | REST, GraphQL, gRPC, and the UberQL question | Working mock ride REST API; GraphQL resolver/N+1/DataLoader visualizer; gRPC unary vs streaming; communication-choice matrix. **UberQL: investigate and report honestly; don't invent a product.** |

## Syllabus (A–I)

| # | Lesson | Topics (none to be skipped) |
|---|---|---|
| 08 | Scalability fundamentals and CAP | performance vs scalability, latency vs throughput, availability vs consistency, CAP, CP, AP, weak/eventual/strong consistency |
| 09 | Availability patterns | failover, replication, availability in numbers, DNS, CDN (push/pull), load balancing, active-passive, active-active, L4 vs L7, horizontal scaling, reverse proxy, LB vs reverse proxy |
| 10 | Application architecture | application layer, microservices, service discovery, service registry, service-to-service communication, service boundaries, API gateway, distributed systems |
| 11 | Databases | RDBMS, primary-replica, primary-primary, federation, sharding, denormalization, SQL tuning, NoSQL (key-value, document, wide-column, graph), SQL vs NoSQL |
| 12 | Caching | client, CDN, web server, database, application, query-level, object-level; invalidation; cache-aside, write-through, write-behind, refresh-ahead; TTL; stampede; hot keys |
| 13 | Asynchronous architecture | asynchronism, message queues, task queues, event-driven architecture, back pressure, producers/consumers, retries, DLQs, at-least/at-most-once, exactly-once and its limits |
| 14 | Communication protocols | TCP, UDP, RPC, REST, HTTP, HTTP/2, WebSockets, gRPC, Protocol Buffers |
| 15 | Security | authentication, authorization, OAuth 2.0, JWT, TLS, encryption at rest/in transit, API security, rate limiting, DDoS protection, secrets management, service-to-service auth |
| 16 | Math and capacity estimation | powers of two, latency numbers, bandwidth, throughput, RPS, Little's Law, queueing theory, availability, error budgets, capacity estimation; **calculators** for RPS, concurrent connections, storage, bandwidth, DB write throughput, replication volume, cache memory, queue capacity |

## Failure laboratory

| # | Lesson | Failures to simulate |
|---|---|---|
| 17 | Break it and watch it recover | app server, DB primary, Redis, Kafka broker, network partition, regional outage, DNS failure, high latency, traffic spike, consumer slowdown, cache stampede. Show what breaks, who is affected, retries, failover, data loss, recovery; CAP through a partitioned database |
