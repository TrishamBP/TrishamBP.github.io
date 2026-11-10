---
layout: post
title: "From 1.1 million tokens to 78 thousand: taming a ReAct planner"
seo_title: "Taming a ReAct Planner: From 1.1M Tokens to 78K per Run"
description: "Taming a ReAct planner: how an LLM agent's token usage fell from 1.1 million to 78 thousand per run, and what drove the 14x cut in context size and cost."
keywords: "ReAct planner, ReAct agent token usage, LLM agent token optimization, reduce LLM token cost, agent context window, prompt caching for agents, tool-using LLM agents, agent loop latency, LLM inference cost, context engineering"
highlight: "ReAct planner"
category: "Agent Engineering"
meta: "Agent Engineering"
date: 2026-11-10
author: Trisham Patil
tags: ["ReAct", "LLM Agents", "Token Optimization", "Prompt Caching"]
og_type: article
robots: "index, follow"
structured_data: BlogPosting
image: "/assets/blogs/taming-react-planner/taming-react-planner-token-reduction-hero.png"
published: true
---

<!--
  SEO
    Primary keyword:   ReAct planner
    Secondary:         ReAct agent token usage, LLM agent token optimization, reduce LLM token cost,
                       agent context window, prompt caching for agents, tool-using LLM agents,
                       agent loop latency, LLM inference cost, context engineering
    Slug:              /signals/taming-react-planner-token-usage/
    Meta description:  (153 chars) see `description` above

  Body is written one section at a time, on request only.
  Hero: scripts/taming_react_planner_hero.py (original artwork; bar heights illustrative).
  Subtitle: author-supplied text.
  Section 01 (TL;DR): author-supplied table + text, "we/our" -> "I/my".
-->

![ReAct planner token usage hero: the thought, action, observation loop, with per-step prompts growing to 1.1 million tokens per run before taming and staying flat at 78 thousand tokens after](/assets/blogs/taming-react-planner/taming-react-planner-token-reduction-hero.png)

*How I made a tool-using LLM planner 14× cheaper and 5× faster without losing recall — and what prompt caching really does (and doesn't do) for an agent loop.*

## TL;DR: ReAct Planner Token Usage, Tool Calls and Recall
{: data-eyebrow="01 / TL;DR"}

| Metric | One-shot planner | First ReAct planner | Leaner tools | + Trajectory caching | + Repeat prevention |
|---|---|---|---|---|---|
| Recall (test document) | 39.3% | 90.3% | 90.3% | 92.2% | not re-measured live |
| Tool calls | 0 | 38 | 5 | 5 | — |
| Input tokens | small | 1,115,394 | 78,093 | 98,497 (51% read from cache) | up to ~35k wasted tokens removed per run (measured on a replay) |
| Wall-clock | seconds | 281 s | 49 s | 50 s | — |
| Outcome | finished | stopped by the 1M-token budget | finished | finished | — |

**Tokens: −93%. Tool calls: −87%. Time: −83%.** Recall stayed above the 90% target.

The biggest win was not caching. It was giving the model better tools, so that it needed fewer steps.

Caching then made each remaining step cheaper. But my first caching setup cached nothing useful, because one line at the end of the prompt moved at every step.

Finally, I moved "don't do the same thing twice" out of the prompt and into code.
