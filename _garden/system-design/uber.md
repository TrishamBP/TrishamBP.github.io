---
layout: garden
guide: system-design
group: uber
group_root: true
group_overview_title: "Overview"
order: 1
nav_title: "Uber"
title: "Uber System Design: How Uber's API Architecture Evolved"
seo_title: "Uber System Design Case Study: API Gateway to Layered Microservices"
description: "Uber system design case study: how Uber's API architecture evolved from one dispatch endpoint to RTAPI to a layered Edge Gateway, with interactive labs."
keywords: "Uber system design, Uber architecture, Uber API gateway, Uber Edge Gateway, RTAPI, Uber microservices, system design case study, API gateway evolution, distributed systems"
lede: "How a company that matches riders to drivers in real time rebuilt the front door of its backend three times. Each page takes one generation, animates a request through it, and shows what broke and why the next design followed."
status: "3 pages"
sections:
  - id: uber-why
    title: "Why Uber is a good system design case study"
  - id: uber-evolution
    title: "Uber's API architecture evolution at a glance"
  - id: uber-labs
    title: "How to use the Uber labs"
  - id: uber-sources
    title: "Sources and accuracy"
  - id: uber-pages
    title: "The pages in the Uber case study"
---

## Why Uber is a good system design case study
{: #uber-why}

The **Uber system design** problem is unusually demanding. A ride request is real-time (a driver must be matched in seconds), geographic (who is *near* the rider?), high-volume, and moves money. Every part of that pushes on the architecture.

Uber has also written in public about how its backend changed as the company grew, which lets us study a real system rather than an imagined one.

This case study follows the part of the system every request touches first: **the API layer between the apps and the backend**.

## Uber's API architecture evolution at a glance
{: #uber-evolution}

```mermaid
flowchart LR
  G1["<b>Gen 1 · 2014</b><br/>one endpoint '/'<br/>dispatch routes by messageType"]
  G2["<b>Gen 2 · 2015–2017</b><br/>RTAPI: one all-encompassing<br/>Node.js API gateway"]
  G3["<b>Gen 3 · 2018+</b><br/>thin Edge Gateway +<br/>presentation, product, domain layers"]
  G1 -- "everything depends on dispatch" --> G2
  G2 -- "every team queues behind the gateway" --> G3

  classDef g1 fill:#0c2233,stroke:#38bdf8,color:#e0f2fe
  classDef g2 fill:#2b1a04,stroke:#f59e0b,color:#fde68a
  classDef g3 fill:#3a1220,stroke:#fb7185,color:#ffe4e6
  class G1 g1
  class G2 g2
  class G3 g3
```

| Generation | What changed | The bottleneck that forced the next step |
|---|---|---|
| **Gen 1 (2014)** | Two services, dispatch and api. Every request goes to `/`, and a `messageType` field picks the handler | Non-trip traffic coupled to the real-time dispatch service |
| **Gen 2 (2015–2017)** | RTAPI, a dedicated API gateway: ~1M lines of Node.js, 800,000 req/s at peak | Business logic leaked in; 40% of engineering shared one codebase and release train |
| **Gen 3 (2018+)** | A thin Go Edge Gateway configured through a UI, plus layers of team-owned services | Operational complexity: tracing, contracts, partial failures |

## How to use the Uber labs
{: #uber-labs}

Each page embeds interactive labs that run in your browser:

- **Animation controls:** Play, Pause, Reset, Step forward, Step backward, speed (0.5x, 1x, 2x) and **Explain this step**.
- **Click any component** to see what it does, why it exists, what it talks to, what data it holds, and what happens when it fails or traffic grows.
- **Inspect network messages:** step panels show the request and response on the wire.
- **Simulations are real models.** The gateway overload lab is a queueing simulation; its numbers are estimates from that model, **never Uber telemetry**.

## Sources and accuracy
{: #uber-sources}

Every Uber-specific claim links to a public source, mainly Uber Engineering's [*Designing Edge Gateway, Uber's API Lifecycle Management Platform*](https://www.uber.com/blog/gatewayuberapi/) (2020) and [*Introducing Domain-Oriented Microservice Architecture*](https://www.uber.com/blog/microservice-architecture/) (2020).

Each page's References section separates **documented Uber facts** from **illustrative designs** (service names, payloads, simulation numbers) that teach the idea without claiming anything about Uber's internals.

## The pages in the Uber case study
{: #uber-pages}

Read them in order; each generation exists because of the previous one's bottleneck:
