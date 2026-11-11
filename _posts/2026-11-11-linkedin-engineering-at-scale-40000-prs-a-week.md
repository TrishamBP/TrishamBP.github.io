---
layout: post
title: "Inside LinkedIn's Engineering at Scale: 40,000 PRs a Week"
seo_title: "LinkedIn AI Code Review at Scale: How It Reviews 40,000 PRs a Week"
date: 2026-11-11
# last_modified_at: YYYY-MM-DD  # optional; JSON-LD dateModified falls back to `date`
author: Trisham Patil
category: "Software Engineering"
excerpt: "Inside LinkedIn AI code review at scale: how a multi-agent AI code reviewer helps LinkedIn review 40,000 pull requests a week with humans still in the loop."
meta: "LinkedIn • AI Code Review • Multi-Agent Systems • Engineering at Scale"
description: "How LinkedIn AI code review handles 40,000 pull requests a week: a multi-agent AI code reviewer, tiered rules, LLM-judge evaluation and humans in the loop."
keywords: "LinkedIn AI code review, AI code reviewer, multi-agent code review, AI code review at scale, code review bottleneck, 40000 pull requests a week, LLM as a judge, evaluating AI code reviewers, coding agents, AI-native development, LinkedIn engineering"
highlight: "LinkedIn AI code review"
search_intent: informational
tags:
  - LinkedIn
  - AI Code Review
  - Multi-Agent Systems
  - Coding Agents
  - Engineering at Scale
og_type: article
robots: "index, follow"
structured_data: BlogPosting
image: /assets/blogs/linkedin-engineering-at-scale/hero.png
published: true
---

<!--
  SEO
    Primary keyword:   LinkedIn AI code review
    Secondary:         AI code reviewer, multi-agent code review, AI code review
                       at scale, code review bottleneck, 40000 pull requests a
                       week, LLM as a judge, evaluating AI code reviewers, coding
                       agents, AI-native development, LinkedIn engineering
    Slug:              linkedin-engineering-at-scale-40000-prs-a-week
                       (kept: changing it would break the already-published URL)
    Search intent:     informational

  CONTENT
    Body is author-supplied text only; add sections only when the author supplies them.
    Hero: author-supplied high-level technical diagram (HLTD) of the LinkedIn
    AI code review pipeline (assets/blogs/linkedin-engineering-at-scale/hero.png).
-->

![LinkedIn AI code review at scale: high-level technical diagram of LinkedIn's multi-agent AI code review pipeline for 40,000 pull requests a week, with an orchestrator, code quality, security and rules subagents, three tiers of rules, merge and verify steps, and evaluation and release gating](/assets/blogs/linkedin-engineering-at-scale/hero.png)
_High Level Technical Diagram (HLTD) for LinkedIn_

In this article, you'll learn:

- What an AI code reviewer is, and why review is the bottleneck these days
- Three main directions for teams and companies to handle the code review bottleneck
- How to build a multi-agent AI reviewing system that works in production
- What evaluation looks like for AI reviewers
- What's ahead and where the new bottlenecks move

## What Is an AI Code Reviewer?

Software development has two main steps. An engineer **writes** a change, and other engineers **review** it before it merges into the main codebase.

Writing turns intent into code. Review is where a second engineer checks that the code does what it claims, fits the system around it, and won't hurt production. These are different jobs, which is why most teams keep them with different people.

<figure class="acr-demo" data-acr="two-steps" aria-label="Animation of the two main steps of software development: write, review, then merge">
  <noscript>This animation of the write and review steps needs JavaScript.</noscript>
</figure>
<script src="{{ '/assets/js/ai-code-review-demos.js' | relative_url }}" defer></script>

*Software development's two main steps. A change goes back and forth between the author and the reviewer until it's approved, and only then does it merge.*

### The Pull Request: Where Code Review Happens

When an engineer writes code, the change becomes a **pull request (PR)**. Reviewers then read its **diff**: the lines it adds, removes or changes.

Here are the typical steps from opening a PR to merging it into the codebase:

1. The author opens a PR from a branch that has the change.
2. The code host, such as GitHub, notifies the reviewers and starts **continuous integration (CI)**. CI runs tests and linters, which flag style problems and simple errors.
3. A reviewer reads the PR and comments on specific lines.
4. The author pushes fixes. Then the reviewer looks again.
5. The reviewer approves, and the PR merges.

<figure class="acr-demo" data-acr="pr-path" aria-label="Animation of the five steps of a pull request, from opening to merging">
  <noscript>This animation of the pull request lifecycle needs JavaScript.</noscript>
</figure>

*The typical path of a PR, from opening to merging. CI passes, but the bug in step 3 is one only a reviewer who reads the change can catch.*

Steps 3 and 4 are a loop, and that loop is where the time goes. Every round trip costs more than the minutes spent reading: the reviewer has to notice the PR, switch into it, and rebuild the context in their head. The author does the same when the comments come back.

In most organizations, a PR spends far longer **waiting** for a reviewer than it does being read.

<div class="ts-note" markdown="0">
  <span class="ts-note-title">Why CI doesn't replace review</span>
  <div class="ts-note-body">
    <p>CI answers "does this build, and do the existing tests pass?" It can only check what someone has already written down as a test or a lint rule.</p>
    <p>Review answers a different question: "is this the right change?" That covers missing tests, wrong assumptions about callers, a cache with no TTL, or a retry that isn't idempotent. These are the bugs CI is structurally blind to, and they're what an AI code reviewer has to target.</p>
  </div>
</div>

### AI-Native Development: Coding Agents Take Over Writing

AI is changing this process, because it can now handle some of these steps. Engineers hand those steps to AI agents and spend more of their time on **intent and judgement**. That is **AI-native development**.

The writing step is where frontier coding agents have shown the most promise. Given a task, an agent implements the feature, writes the tests, runs them, and iterates until they pass. Finally, it opens a PR for review.

<figure class="acr-demo" data-acr="agent-loop" aria-label="Animation of a coding agent implementing a change, writing tests, iterating until they pass, and opening a pull request that then waits for review">
  <noscript>This animation of a coding agent loop needs JavaScript.</noscript>
</figure>

*Coding agents automate writing, but PRs still wait for review. The agent's inner loop (implement, test, fix) runs in minutes. The outer loop (human review) doesn't speed up at all.*

### Why Code Review Became the Bottleneck

With coding agents, writing can now be largely automated and done much faster. Instead of an engineer spending hours or days on a change, the agent spends minutes.

But if humans still have to review every change, the process stays slow. Engineers' hours are fixed and limited. Faster writing just moves the queue: it now builds up in front of review.

This is basic queueing theory. Call the rate at which PRs arrive **λ** and the rate at which reviewers can clear them **μ**. Their ratio, **ρ = λ/μ**, is the utilization of your review capacity:

- **ρ well below 1:** PRs get reviewed soon after they open.
- **ρ close to 1:** wait times rise sharply, even though reviewers are "only" a bit busier.
- **ρ above 1:** the queue grows without limit. Adding more coding agents makes it worse, not better.

<figure class="acr-demo" data-acr="bottleneck" aria-label="Interactive queue simulation showing how coding agents raise the pull request arrival rate above human review capacity, and how an AI first pass restores it">
  <noscript>This interactive review queue simulation needs JavaScript.</noscript>
</figure>

*Writing got faster, so review became the bottleneck. Switch the tabs to compare the three regimes. The rates are illustrative, but the shape isn't: once ρ goes above 1, the queue and the wait time keep growing every hour.*

There are only two levers: lower λ (ship fewer PRs, which defeats the point of coding agents) or raise μ (make each review cheaper). Hiring more reviewers raises μ linearly. Agents raise λ much faster than that.

### What an AI Reviewer Does

The fix is a system that can reliably review code, ideally **before** humans do. That system is called an **AI reviewer**, or AI code reviewer.

It reads a PR the way a human reviewer would and comments on the lines that need attention. Once the automated code review is done, the author (in this case, the coding agent) addresses the comments. Human reviewers then spend their limited time **judging the fixes**, not hunting for the issues.

In queueing terms, the AI reviewer raises μ. It doesn't remove the human from the loop. It makes each minute of human review count for more.

## Full vs Partial Automation: Where LinkedIn AI Code Review Sits

Models are also getting better at reading code, so more teams are automating reviews this way [2]. They mostly differ in **how much** of the review they try to automate.

- **Full automation** lets the AI approve changes on its own. This is difficult, and most labs aren't there yet.
- **Partial automation** keeps human approval on every change and gives the AI the first pass. The process gets faster, and a human stays in the loop to reduce the risk of merging buggy or insecure code.

<figure class="acr-demo" data-acr="automation" aria-label="Animation comparing full automation, where the AI reviewer approves and merges, with partial automation, where the AI reviews first and a human approves">
  <noscript>This animation comparing full and partial automation needs JavaScript.</noscript>
</figure>

*Full vs partial automation. Switch the tabs. In partial automation, the human still owns the merge decision. In full automation, whatever the AI misses goes straight to main.*

Partial automation is the practical choice today, and companies with an AI reviewer in place, like LinkedIn, usually use it. The rest of this article focuses on partial automation.

<div class="ts-note" markdown="0">
  <span class="ts-note-title">The real blocker for full automation is accountability</span>
  <div class="ts-note-body">
    <p>Accuracy matters, but the harder question is who's responsible when an AI-approved change causes an incident. Change-management policies, audits and on-call ownership all assume a named human approved the change.</p>
    <p>Partial automation fits into those processes without rewriting them. That's a big reason it's what large engineering organizations actually ship.</p>
  </div>
</div>

## What Makes a Reliable AI Code Reviewer

So why is building an AI reviewer hard? To be reliable, it needs four properties:

- **Grounded:** it flags real problems in the changed lines.
- **High-signal:** what it raises are real bugs and high-risk lines, not minor style nits a linter would catch.
- **Codebase-aware:** it follows the codebase's own conventions.
- **Timely:** it comments while the author can still act on it.

<figure class="acr-demo" data-acr="properties" aria-label="Interactive example of the four properties of an AI code review comment: grounded, high-signal, codebase-aware and timely, each with a bad and a good comment on the same diff">
  <noscript>This interactive example of AI review comment properties needs JavaScript.</noscript>
</figure>

*The four properties an AI review comment needs. The same five-line diff gets a bad and a good comment for each property. Hover over a comment to see the line it's anchored to.*

Each property fails in its own way:

- **Ungrounded** comments (hallucinated APIs, made-up bugs) cost the most. One confident false claim teaches authors to ignore the bot.
- **Low-signal** comments are the slow killer. When nine out of ten comments are nits, the one real bug gets skimmed past with the rest.
- **Codebase-unaware** comments give advice that's correct in general and wrong for this repo. Fixing that takes context the diff alone doesn't contain.
- **Late** comments are correct but useless. A comment that lands after merge isn't review, it's a bug report.

### Precision Over Recall

These four properties come down to one design rule: **optimize for precision, not recall.**

A human reviewer who misses a bug is normal. An AI reviewer that posts ten wrong comments is soon treated as noise, and from then on its correct comments are ignored too. Trust is the scarce resource, and every low-quality comment spends some of it.

That's why a reviewer that says less, but is right when it speaks, beats one that flags everything.

Getting all four properties at once is the hard part. LinkedIn built its own system over several iterations to get there. Let's see how they built it.
