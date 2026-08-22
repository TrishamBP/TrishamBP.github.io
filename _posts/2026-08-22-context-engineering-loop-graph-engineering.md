---
layout: post
title: "Prompt, Context, Loop, Graph: Why Context Engineering Is the Layer That Doesn't Go Away"
date: 2026-08-22
author: Trisham Patil
excerpt: "Prompt, context, loop, and graph engineering aren't successive replacements. Here's why context engineering — and increasingly memory — stays the substrate that loops and multi-agent graphs are built on."
meta: "AI Engineering • Agentic Systems"
category: "AI Engineering"
tags:
  - Context Engineering
  - Prompt Engineering
  - Loop Engineering
  - Graph Engineering
  - Agentic Loop
  - Multi-Agent Orchestration
  - LangGraph
  - ReAct
  - Memory Engineering
  - AI Agents
---

<!--
  TITLE OPTIONS CONSIDERED (chosen: #1 — colon-led, keyword-rich, opinionated,
  matches the style of the GenRec, A2A, and DSPy posts):
    1. Prompt, Context, Loop, Graph: Why Context Engineering Is the Layer That Doesn't Go Away  ← selected
    2. Context Is Still the Substrate: Loops and Graphs Don't Replace Context Engineering
    3. The AI Engineering Stack: From Prompts to Context, Loops, and Graphs
    4. Loop Engineering and Graph Engineering Still Depend on Context
    5. Why I Don't Think Context Engineering Is Going Anywhere

  SEO
    Primary keyword:   context engineering
    Secondary:         prompt engineering, loop engineering, graph engineering,
                       agentic loop, multi-agent orchestration, LangGraph, ReAct,
                       memory engineering, AI agents, context window

  GROUNDING / FACT-CHECK NOTES (what's documented vs. framing vs. my opinion):
    - "context engineering": well-sourced 2025 term — Tobi Lütke (endorsed), Andrej
      Karpathy (amplified), Harrison Chase / LangChain ("The Rise of Context
      Engineering", Jun 23 2025), Anthropic ("Effective Context Engineering for AI
      Agents", Sep 29 2025). Presented as documented.
    - "agentic loop": documented — Anthropic "Building Effective Agents" (Dec 19
      2024): agents are "LLMs using tools based on environmental feedback in a loop."
    - ReAct: Yao et al., arXiv Oct 2022 (2210.03629), published ICLR 2023.
    - LangGraph: real (LangChain Inc.) — nodes/edges/state/orchestration confirmed.
    - "loop engineering" / "graph engineering": NOT canonical terms. Framed as
      descriptive labels for real underlying ideas, not established vocabulary.
    - Boris Cherny "no longer writes prompts/code, just writes loops": UNVERIFIED
      quote. Cherny is a genuine co-creator of Claude Code, but no primary source
      found. NOT attributed as a quote; reframed as circulating framing + honest note.
    - Raw notes' "ARC / agentic reasoning and coding" = false expansion (ARC-AGI is
      Chollet's benchmark). Dropped; ReAct used instead.
    - The layered "stack" diagram is labeled as MY mental model, not a taxonomy.
-->

# Prompt, Context, Loop, Graph: Why Context Engineering Is the Layer That Doesn't Go Away

![The evolution of AI system engineering — a four-stage progression from Prompt Engineering (instructions and personas) to Context Engineering (retrieving and filtering the right information), to Loop Engineering (reason, act, observe, iterate), to Graph Engineering (orchestrating multiple agents in complex workflows)](/assets/blogs/prompt_loop_context_graph.png)

A few years ago, almost every conversation about building with language models was about **prompt engineering**. Then it was **context engineering**. This year the vocabulary shifted again — toward *loops* and *graphs*. Each wave arrives with the same quiet implication: the last thing is finished, this is what matters now.

I don't think that's quite what's happening. The more agentic systems I build and study, the more I keep returning to one stubborn question — *what information does this model actually need right now?* — and that is a **context engineering** question. This post is my attempt to work out how these four ideas actually relate: whether each replaces the one before it, or whether we keep rediscovering new faces of the same problem.

<nav class="post-toc" aria-label="Table of contents">
  <p class="post-toc-title">On this page</p>
  <ol>
    <li><a href="#introduction">AI Engineering's Endless Cycle of Buzzwords</a></li>
    <li><a href="#prompt-engineering">Prompt Engineering: The First Layer I Understood</a></li>
    <li><a href="#beyond-the-prompt">Then the Prompt Wasn't Enough</a></li>
    <li><a href="#context-engineering">Context Engineering: What Does the Model Know Right Now?</a></li>
    <li><a href="#memory-engineering">Memory Engineering: Harder to Ignore Every Month</a></li>
    <li><a href="#loop-engineering">Loop Engineering: The Agentic Loop</a></li>
    <li><a href="#loop-is-context">A Loop Is Also a Context Management Problem</a></li>
    <li><a href="#loops-to-graphs">From Loops to Graphs</a></li>
    <li><a href="#graph-is-context">A Graph Is a Context Distribution Problem</a></li>
    <li><a href="#thesis">My Current Thesis: Context Is the Substrate</a></li>
    <li><a href="#more-agents">Why More Agents Are Not Always the Answer</a></li>
    <li><a href="#where-this-goes">Where I Think This Is Going</a></li>
    <li><a href="#final-thoughts">Final Thoughts</a></li>
  </ol>
</nav>

---

## AI Engineering's Endless Cycle of Buzzwords {#introduction}

AI engineering moves fast enough that the vocabulary struggles to keep up. Watch the discourse for long enough and you see a rhythm:

```text
Prompt Engineering
        ↓
Context Engineering
        ↓
Loop Engineering
        ↓
Graph Engineering
```

Read top to bottom, it looks like a relay race — each term handing off to the next, the previous one retired. That framing is tidy, and I think it's wrong.

The interesting question isn't whether these ideas are useful. They clearly are. It's this:

> **Are we replacing one paradigm with another, or continuously discovering new layers of the same engineering problem?**

I want to be careful here, because it's easy to be cynical and say "it's all buzzwords." That's not my claim. Each of these terms names a genuinely useful abstraction. The claim is narrower and, I think, more interesting: **they don't sit in a line. They stack.** And underneath the sophisticated loops and multi-agent graphs, the question of *what information reaches the model* never actually goes away — it just reappears at a new altitude.

A quick honesty note before we start: two of these four terms are well-established, and two are not. "Prompt engineering" and "context engineering" are documented, datable, and have named proponents. "Loop engineering" and "graph engineering" are more like descriptive labels the community is reaching for — the *underlying ideas* (the agentic loop, graph-based orchestration) are real and citable, but the tidy `-engineering` names are still convention, not canon. I'll flag which is which as we go.

---

## Prompt Engineering: The First Layer I Understood {#prompt-engineering}

Prompt engineering was the first layer that actually clicked for me, and its mental model was refreshingly simple:

```text
Model
  +
Carefully Constructed Prompt
  ↓
Better Output
```

The term itself dates to the GPT-3 era. Anthropic later described it plainly as *"methods for writing and organizing LLM instructions for optimal outcomes."* In practice that meant a toolbox most of us learned by trial and error:

- Personas and system prompts
- Clear, unambiguous instructions
- Few-shot examples
- Output constraints and formatting rules
- Step-by-step task decomposition

You were, in effect, learning to communicate with a *particular* model — discovering its quirks and phrasing your intent so it landed.

And that's exactly where the first crack appeared. **Prompts were not portable.** A prompt painstakingly tuned for one model generation would often behave differently on the next. Some carefully engineered scaffolding became unnecessary as models got stronger; some of it became actively counterproductive, over-constraining a model that no longer needed hand-holding.

I want to be precise, because this claim gets overstated. It is *not* a proven law that "bigger models always need less prompting." It's a widely observed practitioner heuristic. The reliable takeaway is subtler: **a prompt encodes assumptions about a specific model's behavior, and when the model changes, those assumptions expire.** That's a coupling problem — and it's the same coupling problem that pushes teams toward frameworks like [DSPy](/ai%20engineering/2026/08/18/dspy-program-dont-prompt-programmatic-prompt-optimization/), which treat the prompt as an optimizable artifact rather than something you hand-tune forever.

---

## Then the Prompt Wasn't Enough {#beyond-the-prompt}

Here's the thing a perfectly phrased instruction can't fix: a model still cannot reason about information it doesn't have.

You can write the most elegant system prompt in the world, but if the relevant document, the prior decision, the current state of the world isn't in front of the model, no amount of phrasing rescues the answer. As context windows grew — from a few thousand tokens to hundreds of thousands and beyond — the engineering question quietly changed shape.

We moved from:

> *"How should I phrase the instruction?"*

toward:

> *"What information should the model see — and, just as importantly, what should it **not** see?"*

That second question is the doorway into context engineering.

---

## Context Engineering: What Does the Model Know Right Now? {#context-engineering}

**Context engineering** is not "write a bigger prompt." It's the discipline of deciding what goes into the context window at a given moment — and it earned a name in 2025 precisely because it turned out to be a distinct skill.

The provenance is worth stating, because this is the one term in the list with a clear paper trail:

- **Tobi Lütke** (Shopify's CEO) endorsed it: *"I really like the term 'context engineering' over prompt engineering. It describes the core skill better."*
- **Andrej Karpathy** amplified it, describing it as *"the delicate art and science of filling the context window with just the right information."*
- **Harrison Chase / LangChain**, in *"The Rise of Context Engineering"* (June 2025), framed it as *"building dynamic systems to provide the right information and tools in the right format such that the LLM can plausibly accomplish the task"* — and pointedly noted it *isn't a new idea*.
- **Anthropic**, in *"Effective Context Engineering for AI Agents"* (September 2025), defined it as *"curating and maintaining the optimal set of tokens during LLM inference."*

Notice the shared word across all four: *curating*. In an agentic system, the context window at any instant might be assembled from:

- System instructions
- Conversation history
- The current user request
- Tool outputs
- Retrieved documents
- Working state and intermediate reasoning
- Short-term and long-term memory
- Previous agent actions and error messages

The engineering problem is deciding **what enters the window right now**, under a finite token budget — because even a one-million-token window is practically constrained, and stuffing it is not the same as using it well. The failure modes are specific:

- **Noise and dilution** — relevant signal buried under irrelevant tokens
- **Stale information** — a fact that was true twenty steps ago, no longer
- **Repetition** — the same content re-injected every turn
- **Retrieval failures** — the right document never makes it in
- **Budget pressure** — important context crowded out by low-value filler

And the mechanisms are equally concrete: compaction, summarization, selective retrieval, recency-based retention, hierarchical memory, compression, and deliberate *forgetting*.

One precise correction to something I used to say loosely: irrelevant context does not literally "cause cross-entropy loss" in a deployed system — cross-entropy is a *training* objective. What poor context actually does is distract attention, increase ambiguity, consume budget, and raise the odds of a wrong or hallucinated output. Same practical danger; the mechanism just deserves the accurate name.

---

## Memory Engineering: Harder to Ignore Every Month {#memory-engineering}

Context engineering answers *"what should the model see now?"* But there's a sibling question that I think is quietly becoming the harder one:

> **What should the system remember over time?**

I'll call this memory engineering. I'm hesitant to present any single architecture as the standard — this is an active design space, not settled practice — but a useful way to picture it is as tiers of decreasing detail and increasing persistence:

```text
Working Memory        →  the scratchpad for the current step
        ↓
Recent Context        →  the last few turns, in full
        ↓
Medium-Term Memory    →  compressed summaries of the session
        ↓
Long-Term Memory      →  durable, highly abstracted facts
```

Each tier forces a decision:

- What gets **retained** versus dropped?
- What gets **compressed**, and to what level of abstraction?
- What should be **forgotten** so it stops influencing future decisions?
- What should be **retrievable** later, and by what key?
- How do we avoid re-injecting the same thing on every turn?

I don't treat memory as a separate discipline from context engineering. It's the *time dimension* of the same problem. Context engineering asks what's in the window now; memory engineering asks how the system decides what's *available to be* in the window later. Get memory wrong and every downstream context decision inherits stale or missing inputs.

---

## Loop Engineering: The Agentic Loop {#loop-engineering}

Now the newer vocabulary. A caveat first: **"loop engineering" is not an established term** — you won't find a canonical definition. But the idea it points at *is* well documented, and it's called the **agentic loop**.

The shift is this: instead of expecting the model to solve a problem in a single forward pass, you build an iterative system around it. Anthropic's *"Building Effective Agents"* (December 2024) puts it about as plainly as possible — an agent is *"an LLM using tools based on environmental feedback in a loop."* A simplified version:

```text
Understand Task
      ↓
Take Action  →  Call Tool  →  Observe Result
      ↓
Evaluate  →  Continue or Stop
```

This lineage runs straight back to the **ReAct** paper (Yao et al., first posted October 2022, published at ICLR 2023), which interleaved *reasoning traces* with *actions* and *observations*. The core insight is liberating: the model doesn't have to be right on the first try. It can attempt something, observe the result, detect failure, adjust, and try again. Coding agents live and die by this.

But every loop hides a pile of engineering decisions that don't solve themselves:

- When do we stop?
- When do we retry, and how many times?
- Which tools are available at each step?
- How are errors *represented* back to the model?
- **What state carries into the next iteration?**

That last one is where I stop and pay attention — because it isn't a loop question at all.

---

## A Loop Is Also a Context Management Problem {#loop-is-context}

Every iteration of a loop *produces* information. Watch what accumulates:

```text
Iteration 1
    ├── Plan
    ├── Tool Call
    └── Tool Output

Iteration 2
    ├── (all of iteration 1?)
    ├── New Plan
    ├── Tool Call
    └── Tool Output

Iteration 3
    └── ...
```

If you naively append the entire history every turn, the context grows without bound. Noise accumulates. Old, now-irrelevant failures linger. Token usage climbs. The genuinely important signal gets harder to pick out of its own transcript.

So a loop, run long enough, inevitably arrives at a familiar question:

> **What from the previous iteration should survive into the next one?**

That is a context engineering question, wearing a loop's clothing. Which leads to the first load-bearing claim of this post:

> **Loop engineering doesn't eliminate context engineering. It manufactures a fresh context engineering problem on every single iteration.**

This is also the honest place to address a story that circulates in AI circles: that some engineers building coding agents — Claude Code among them — have stopped writing prompts and now mostly *design loops*. It's a compelling framing, and there's a real observation underneath it: as the agent harness matures, more of the work becomes shaping the loop, the tools, and the state it carries rather than crafting one perfect instruction. But I want to flag it honestly — the punchy versions of this claim are often attributed to specific people (Boris Cherny, a genuine co-creator of Claude Code, gets named a lot) without a primary source I could verify. So take the *idea* seriously, and the exact quote with a grain of salt. And notice: even in its strongest form, "just design the loop" doesn't escape context — it relocates the work into deciding what each turn of the loop gets to see.

---

## From Loops to Graphs {#loops-to-graphs}

A single loop is one agent iterating. The next step up is coordinating *many* — which is where **graph engineering** enters, another descriptive label rather than an established term.

The concrete, real system here is **LangGraph** (from LangChain), which models an agentic workflow as a graph: **nodes** (steps or agents), **edges** (control flow between them), and shared **state** that persists as execution moves through the graph. It supports orchestrators, sub-agents, conditional routing, and fan-out/fan-in patterns. A simplified picture:

```text
                    User Request
                         │
                         ▼
                    Orchestrator
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Research    Coding    Analysis
            Agent       Agent      Agent
              │          │          │
              └──────────┼──────────┘
                         ▼
                     Synthesizer
                         │
                         ▼
                      Response
```

A graph buys you things a single loop can't: planning agents, parallel sub-agents, state machines, conditional routing, retries at the node level, and human-in-the-loop checkpoints. It's genuinely more expressive.

And it raises a question that should feel familiar by now:

> **What information does each node actually receive?**

---

## A Graph Is a Context Distribution Problem {#graph-is-context}

In a multi-agent graph, not every node needs everything:

- The research agent doesn't need the coding agent's full transcript.
- The coding agent probably doesn't need every retrieved document.
- The orchestrator likely wants *summaries*, not raw tool dumps.
- A focused sub-agent needs deep context about its one task and nothing about the rest of the workflow.

So graphs introduce their own version of the same problem — now spatial rather than temporal:

> **How should context move through the graph?**

```text
                    SHARED / GLOBAL MEMORY
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         Research        Coding         Analysis
          Context        Context         Context
         (isolated)     (isolated)      (isolated)
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                      Shared Summary
                             │
                             ▼
                        Orchestrator
```

This is where concepts like shared versus local state, context isolation, per-agent memory, and summarization-between-nodes stop being nice-to-haves and become the actual work. Which gives me the second load-bearing claim:

> **A more sophisticated graph does not automatically produce a more intelligent system. If context is poorly distributed across nodes, you've just built a more elaborate way to coordinate around incomplete or stale information.**

Loops create context *over time*. Graphs distribute context *across space*. Neither makes the underlying question disappear.

---

## My Current Thesis: Context Is the Substrate {#thesis}

Here's my actual opinion, stated plainly. I don't see these four ideas as a timeline. I see them as a stack — and I want to be explicit that **this is my mental model, not an industry taxonomy**:

```text
┌─────────────────────────────────────────┐
│            GRAPH ENGINEERING             │
│   Multi-agent orchestration & routing    │
├─────────────────────────────────────────┤
│            LOOP ENGINEERING              │
│    Iteration, tools & verification       │
├─────────────────────────────────────────┤
│           CONTEXT ENGINEERING            │
│      What does the model see now?        │
├─────────────────────────────────────────┤
│           MEMORY ENGINEERING             │
│    What does the system remember?        │
├─────────────────────────────────────────┤
│             FOUNDATION MODEL             │
│      Reasoning & generation engine       │
└─────────────────────────────────────────┘
```

The argument is *not* that loops and graphs are unimportant — they're how real systems get built. The argument is that these layers are **multiplicative, not additive**:

- A brilliant loop fed poor context still makes poor decisions, faster.
- A sophisticated multi-agent graph running on stale memory just coordinates, elaborately, around the wrong information.
- More agents do not automatically mean more intelligence.
- More iterations do not automatically mean better reasoning.

Everything above the context layer amplifies whatever the context layer delivers. If the substrate is noisy, the orchestration amplifies the noise.

---

## Why More Agents Are Not Always the Answer {#more-agents}

A concrete example, because the abstract version is too easy to nod along to.

Imagine a research system that looks impressive on an architecture diagram:

- 1 planning agent
- 5 research agents
- 1 synthesis agent
- 1 verification agent

Now suppose that, under the hood:

- Every agent receives the entire conversation history.
- Every tool output is passed to every downstream node.
- Nothing is compressed or summarized.
- Nothing distinguishes important state from irrelevant state.

You haven't built intelligence. You've built an expensive, noisy fan-out where each agent wades through eight agents' worth of undifferentiated transcript. It will be slow, costly, and — counterintuitively — *less* reliable than a smaller design.

Compare a leaner shape:

```text
User Query
    ↓
Context Planner        →  decide what this task actually needs
    ↓
Relevant Memory + Retrieval
    ↓
Focused Agent Loop
    ↓
Verification
    ↓
Response
```

I'm not claiming the second architecture is universally better — the right shape depends entirely on the task. The point is narrower and, I think, hard to argue with:

> **Better orchestration cannot indefinitely compensate for poor information management.**

At some point, adding agents stops adding capability and starts adding surface area for the context problem to go wrong.

---

## Where I Think This Is Going {#where-this-goes}

If the substrate is context and memory, then the interesting frontier is the machinery that manages them intelligently. The systems I expect to matter will get good at:

- **Dynamic context selection** — assembling the window per request, not from a fixed template
- **Memory consolidation** — merging and compressing what's worth keeping
- **Hierarchical, adaptive memory** — retrieving full detail for the recent, dense summaries for the distant
- **Context-aware routing** — routing not just on the task, but on who *has* the relevant context
- **Shared versus private state** — deliberate boundaries on what each agent knows

Here's the shift I find most compelling. Today's orchestrators mostly decide:

> *"Which agent should run next?"*

I suspect the more capable ones will increasingly also have to decide:

> *"What should that agent know before it starts?"*

The moment routing includes *provisioning context*, orchestration and context engineering stop being separate layers. They become the same discipline, viewed from two angles.

---

## Key Takeaways {#key-takeaways}

- **Prompt, context, loop, and graph engineering are layers, not a timeline.** Each newer idea builds on the ones beneath it rather than retiring them.
- **Two of the four terms are documented; two are convention.** "Context engineering" (2025, with named proponents) and "prompt engineering" are established. "Loop engineering" and "graph engineering" are descriptive labels for real ideas — the agentic loop and graph-based orchestration — not canonical vocabulary.
- **A loop is a context problem over time.** Every iteration creates state, and something has to decide what survives into the next one.
- **A graph is a context problem across space.** Every node needs the right slice of context — no more, no less.
- **The layers are multiplicative.** A great loop or graph fed poor context amplifies the poor context. More agents ≠ more intelligence.
- **The next frontier is orchestration that provisions context**, not just orchestration that picks the next agent.

---

## Related Topics {#related-topics}

A few adjacent pieces I've written:

- [Context Engineering for AI Agents](/2026/05/24/context-engineering-ai-agents-legal-drafting/) — the same "curate the input" discipline, worked through a concrete legal-drafting agent
- [Agent-to-Agent Communication: Google's A2A Protocol](/ai%20engineering/2026/07/21/agent-to-agent-communication-google-a2a-protocol/) — how state and context move *between* agents in a multi-agent system
- [DSPy: Program, Don't Prompt](/ai%20engineering/2026/08/18/dspy-program-dont-prompt-programmatic-prompt-optimization/) — decoupling intent from a specific model, the prompt-portability problem made practical
- [LLM Inference Optimization](/2026/04/19/llm-inference-optimization/) — the serving-side costs (prefill, KV caching) that make context budget a real constraint

---

## Final Thoughts {#final-thoughts}

It's worth saying what each layer genuinely taught us, because none of it was wasted:

> Prompt engineering taught us that *how* we communicate with a model matters.
>
> Context engineering taught us that *what* the model sees matters more.
>
> Loop engineering taught us that intelligence doesn't have to emerge in a single attempt.
>
> Graph engineering taught us how those attempts and capabilities can be coordinated.

But none of those layers make the information problem disappear. A loop creates more information. A graph distributes more information. More agents create more state. And as systems get more capable, deciding what to remember, what to retrieve, what to compress, and what to forget gets *more* important, not less.

So I'll resist the urge to declare context engineering "the king," as though that were an established fact. It's not — it's my current engineering perspective, and I hold it loosely. But it's the one I keep arriving at:

> **The more complex the agentic systems I build and study become, the more I find myself back at the same question — what information does this model actually need right now?**

Maybe context engineering isn't the phase we moved past. Maybe it's the layer that becomes *more* central as the loops and graphs on top of it get more sophisticated.

---

*Grounding note: the provenance of "context engineering" (Tobi Lütke, Andrej Karpathy, Harrison Chase / LangChain, Anthropic), the agentic-loop framing (Anthropic's "Building Effective Agents"), ReAct (Yao et al., ICLR 2023), and LangGraph's structure are drawn from public writing and papers. The terms "loop engineering" and "graph engineering" are described as emerging, non-canonical labels rather than established vocabulary. The layered stack diagram and the thesis that context is the substrate are my own interpretation and should be read as an engineering perspective, not settled consensus. Where a popular claim could not be verified to a primary source, it is flagged as such rather than asserted.*
