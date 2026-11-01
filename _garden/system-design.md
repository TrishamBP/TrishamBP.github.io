---
layout: garden
guide: system-design
guide_root: true
card_order: 2
order: 0
nav_title: "Introduction"
title: System Design
seo_title: "System Design Notes: Real-World Production Use Cases Explained"
description: "System design notes built on real-world production use cases: how caching, queues, sharding and replication solve real scaling problems, and their trade-offs."
keywords: "system design, system design notes, system design use cases, real-world system design, production system design, distributed systems, scalability, system design trade-offs, system design learning guide, Trisham Patil"
tag: System Design
logo: /assets/images/garden/system-design.svg
logo_alt: "System design architecture diagram logo: client, load balancer, services and database"
card_text: "My system design notes, built around real-world production use cases: what broke, which building block fixed it, and the trade-offs it brought, from caching and queues to sharding and replication."
lede: "A system design learning guide built in public. Instead of memorising diagrams, each note starts from a real production scenario and works out which design choice solves it, why it works and what it costs."
status: Just started
sections:
  - id: sd-why
    title: "Why learn system design from production use cases"
  - id: sd-how
    title: "How to use this system design guide"
  - id: sd-format
    title: "How every system design note is structured"
  - id: sd-notes
    title: "The notes in this system design guide"
---

## Why learn system design from production use cases
{: #sd-why}

Most system design material teaches the building blocks in isolation: here is a cache, here is a queue, here is a load balancer. That tells you *what* each part is, but not *when* you actually need it.

In production, nobody adds a message queue because a diagram has one. They add it because checkout requests started timing out while the email service was slow. **The use case comes first and the component comes second.**

These system design notes follow that order. Each one begins with a real-world scenario, such as a traffic spike, a slow query or a failing dependency, and then builds the design that fixes it.

## How to use this system design guide
{: #sd-how}

- **Start from the problem.** Read the scenario and try to sketch a fix yourself before you read the design. That's the skill system design interviews and real design reviews test.
- **Use the sidebar.** Click a note to open it, or a subsection to jump straight to that part. **Next →** at the bottom of every page continues the path.
- **Watch the numbers.** Most decisions come from rough estimates: requests per second, data size, latency budgets. Each note shows the arithmetic, so you can check it.
- **Focus on the trade-offs.** Every design choice costs something: consistency, latency, money or complexity. A note isn't finished until it says what was given up.

## How every system design note is structured
{: #sd-format}

Every note follows the same shape, so you can compare designs across use cases:

| Section | What it answers |
|---|---|
| The production scenario | What is happening, and what is breaking? |
| Requirements | What must the system do (functional), and how well (scale, latency, availability)? |
| Back-of-the-envelope numbers | How big is the load, and where is the limit? |
| The design | Which building blocks are used, and how does a request flow through them? |
| Bottlenecks and failure modes | What breaks next, and what happens when a part goes down? |
| Trade-offs | What did this design give up, and when would a different choice be better? |
| Real-world examples | Where companies run this pattern in production |

## The notes in this system design guide
{: #sd-notes}

This guide has just started. Notes appear here as I write them, each one a single production use case:
