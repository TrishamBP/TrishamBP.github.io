---
layout: garden
guide: system-design
guide_root: true
card_order: 2
order: 0
nav_title: "Introduction"
title: System Design
seo_title: "System Design Case Studies: Real Production Architectures Explained"
description: "System design case studies of real production architectures: how companies like Uber evolved their systems, explained with animated labs and trade-offs."
keywords: "system design, system design case studies, production architecture, real-world system design, distributed systems, API gateway, microservices architecture, scalability, Uber system design, Trisham Patil"
tag: System Design
logo: /assets/images/garden/system-design.svg
logo_alt: "System design architecture diagram logo: client, load balancer, services and database"
card_text: "System design through real production architectures. Each case study takes one company, follows how its system evolved, and lets you run it: animated request flows, overload simulations and failure labs."
lede: "System design learned from real production architectures. Each case study takes one company's system, starts from the simplest version that worked, finds the bottleneck that broke it, and animates the design that replaced it."
status: Growing
sections:
  - id: sd-why
    title: "Why learn system design from production architectures"
  - id: sd-method
    title: "How every system design case study teaches"
  - id: sd-structure
    title: "How the case studies are organised"
  - id: sd-notes
    title: "The system design case studies"
---

## Why learn system design from production architectures
{: #sd-why}

Most **system design** material teaches building blocks in isolation: here's a cache, here's a queue, here's a load balancer. That tells you *what* each part is, but not *when* you need it or *what breaks* without it.

In production, nobody adds a message queue because a diagram has one. They add it because checkout requests started timing out while a downstream service was slow. **The use case comes first and the component second.**

So this guide studies real companies' architectures: what they built, what broke as they grew, and what they changed.

## How every system design case study teaches
{: #sd-method}

Every page follows the same sequence:

1. **The problem:** the simplest design that worked at the time.
2. **The bottleneck:** why it failed as traffic, teams or products grew, shown with numbers.
3. **The concept:** the component or pattern that fixed it.
4. **The animation:** run the new architecture and watch requests flow.
5. **The trade-offs:** what it solved, and what new problems it created.

```mermaid
flowchart LR
  P["1 · Problem<br/>simplest design"] --> B["2 · Bottleneck<br/>with numbers"]
  B --> C["3 · Concept<br/>that fixes it"]
  C --> A["4 · Animate<br/>the new flow"]
  A --> T["5 · Trade-offs<br/>new problems"]
  T -. "next bottleneck" .-> P

  classDef s fill:#111a2e,stroke:#38bdf8,color:#e6edf7
  class P,B,C,A,T s
```

## How the case studies are organised
{: #sd-structure}

- **One case study per company.** Each company has its own section in the sidebar, with an overview page and a set of pages.
- **Pages have subsections.** Open a page in the sidebar to jump straight to any part of it.
- **Facts are sourced.** Company-specific claims link to the company's own engineering publications, and each page marks which parts are documented and which are illustrative.

## The system design case studies
{: #sd-notes}
