---
layout: garden
guide: system-design
guide_root: true
card_order: 2
order: 0
nav_title: "Introduction"
title: System Design
seo_title: "Uber System Design: Interactive Distributed Systems Lab, One Ride to Millions"
description: "Learn system design from Uber's real architecture: animated labs on API gateways, microservices, H3, scaling and failures, from one ride to millions of riders."
keywords: "system design, Uber system design, distributed systems, system design case study, API gateway, microservices architecture, scalability, interactive system design lab, system design learning guide, Trisham Patil"
tag: System Design
logo: /assets/images/garden/system-design.svg
logo_alt: "System design architecture diagram logo: client, load balancer, services and database"
card_text: "An interactive system design lab built on Uber as the case study. Start with one rider and one server, find each bottleneck, and animate the fix: gateways, microservices, H3, caching, Kafka and multi-region failover."
lede: "An engineering laboratory, not a collection of articles. Using Uber as the case study, every note starts with the simplest design that works, finds the bottleneck, introduces the concept that fixes it, and lets you run it: play, step, overload and break the architecture yourself."
status: Growing
sd_lab: true
sections:
  - id: sd-why
    title: "Why learn system design from Uber's production architecture"
  - id: sd-method
    title: "How every system design note teaches"
  - id: sd-labs
    title: "How to use the interactive labs"
  - id: sd-curriculum
    title: "The system design curriculum"
  - id: sd-progress
    title: "Track your progress"
  - id: sd-sources
    title: "Sources and accuracy"
  - id: sd-notes
    title: "The notes in this system design guide"
---

## Why learn system design from Uber's production architecture
{: #sd-why}

Most **system design** material teaches building blocks in isolation: here's a cache, here's a queue, here's a load balancer. That tells you *what* each part is, but not *when* you need it or *what breaks* without it.

In production, nobody adds a message queue because a diagram has one. They add it because checkout requests started timing out while a downstream service was slow. **The use case comes first and the component second.**

Uber is an unusually good case study. A ride is real time, geographic, high-volume and money-moving all at once, and Uber has published a lot about how its architecture evolved. This guide follows one ride request from a single rider to millions.

## How every system design note teaches
{: #sd-method}

Every concept follows the same seven steps:

1. **The problem:** start with the simplest Uber implementation that works (e.g. one server handles every ride).
2. **The bottleneck:** show, with numbers, why it fails as users grow.
3. **The concept:** introduce the component that fixes it.
4. **The animation:** run the new architecture and watch requests flow.
5. **The trade-offs:** what it solves, and what new problems it creates.
6. **Knowledge check:** questions with explained answers.
7. **Engineering challenge:** change the architecture in the lab and observe the result.

```mermaid
flowchart LR
  P["1 · Problem<br/>simplest design"] --> B["2 · Bottleneck<br/>with numbers"]
  B --> C["3 · Concept<br/>that fixes it"]
  C --> A["4 · Animate<br/>the new flow"]
  A --> T["5 · Trade-offs<br/>new problems"]
  T --> Q["6 · Check<br/>understanding"]
  Q --> X["7 · Challenge<br/>change it yourself"]
  X -. "next bottleneck" .-> P

  classDef s fill:#111a2e,stroke:#38bdf8,color:#e6edf7
  class P,B,C,A,T,Q,X s
```

## How to use the interactive labs
{: #sd-labs}

The labs are embedded in the notes and run in your browser:

- **Animation controls:** Play, Pause, Reset, Step forward, Step backward, speed (0.5x, 1x, 2x) and **Explain this step**.
- **Click any component** to see what it does, why it exists, what it talks to, what data it holds, and what happens when it fails or traffic grows.
- **Inspect network messages:** step panels show the request and response on the wire.
- **Simulations are real models:** the gateway overload lab is an actual queueing simulation (Poisson arrivals, bounded queue, timeouts). Its numbers are estimates from that model, **never Uber telemetry**.

## The system design curriculum
{: #sd-curriculum}

| Module | Notes | Status |
|---|---|---|
| **1 · Uber's API architecture evolution** | 01 Gen 1 dispatch · 02 Gen 2 RTAPI · 03 Gen 3 Edge Gateway | Live |
| **2 · What happens when someone requests a ride** | 04 Ride lifecycle · 05 Uber H3 · 06 Scaling lab | Planned |
| **3 · APIs, query languages and communication** | 07 REST, GraphQL, gRPC, and the UberQL question | Planned |
| **Syllabus A–I** | 08 Scalability & CAP · 09 Availability · 10 App architecture · 11 Databases · 12 Caching · 13 Async & Kafka · 14 Protocols · 15 Security · 16 Math & calculators | Planned |
| **Failure laboratory** | 17 Break it and watch it recover | Planned |

## Track your progress
{: #sd-progress}

Your quiz scores and lab activity are saved in this browser only.

<div data-sd-lab="progress"></div>

## Sources and accuracy
{: #sd-sources}

Every Uber-specific claim links to a public source, mainly the [Uber Engineering blog](https://www.uber.com/blog/engineering/), [h3geo.org](https://h3geo.org/) and Uber's GitHub repositories.

Each note's References section separates **documented Uber facts** from **illustrative designs** (service names, payloads, simulation numbers) that teach the idea but aren't claims about Uber's internals.

## The notes in this system design guide
{: #sd-notes}

Each note builds on the one before it:
