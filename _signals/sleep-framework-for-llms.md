---
layout: post
title: "The Sleep Framework for LLMs"
seo_title: "The Sleep Framework for LLMs: Memory Consolidation for AI"
description: "The Sleep Framework for LLMs adds a sleep phase to continual learning, so models consolidate new facts into their weights without catastrophic forgetting."
lede: "A sleep phase for continual learning: LLMs alternate between active interaction and offline memory consolidation, turning short-term context into long-term parameters."
keywords: "Sleep Framework for LLMs, LLM sleep framework, continual learning for LLMs, catastrophic forgetting, LLM knowledge cutoff, in-context learning, LLM memory consolidation, offline memory consolidation, LLM long-term memory, 10M token context"
highlight: "Sleep Framework"
category: "LLM Memory"
meta: "LLM Memory"
date: 2026-10-28
author: Trisham Patil
tags: ["Sleep Framework", "LLMs", "Memory Consolidation", "Continual Learning"]
og_type: article
robots: "index, follow"
structured_data: BlogPosting
image: "/assets/blogs/sleep-framework-llms/sleep-framework-llms-hero.png"
published: true
---

<!--
  SEO
    Primary keyword:   Sleep Framework for LLMs
    Secondary:         LLM sleep framework, continual learning for LLMs, catastrophic forgetting,
                       LLM knowledge cutoff, in-context learning, LLM memory consolidation,
                       offline memory consolidation, LLM long-term memory, 10M token context
    Slug:              /signals/sleep-framework-for-llms/
    Meta description:  (154 chars) see `description` above

  Body is written one section at a time, on request only. Hero: author-supplied artwork.
  Intro: author-supplied text. The "we introduce..." passage is the paper authors'
  abstract, rewritten in third person (not the author's own work). 10M-token claim
  is from that text; not independently checked.
  TODO: add the source paper URL (source_url / source_label) and authors.
  Sections 02-06: author-supplied text, lightly edited.
  Section 02 also merges the source's "Rethinking machine learning" passage
  (its "our framework" caveat rewritten as the researchers').
  Section 03 rebuilt from the source's "Key components of the sleep process" text;
  04 theory, 05 results, 07 conclusion from the same source text ("our" -> the
  researchers'). Old "vs RAG" section moved to 06. All numbers (SQuAD 48.9/46.2,
  AIME 24/25 + HMMT 25 79.2/69.0/46.1, BABILong 10M) are the researchers' reported
  values; not independently checked against the paper.
  Figures: author-supplied (source diagram + results chart). The diagram had a
  screenshot "expand" button painted out; the results chart was sent twice (same file).
  Flip `published: true` when the body is ready.
-->

![The Sleep Framework for LLMs hero: a glowing stream of geometric shapes flowing into a luminous neural network sphere, illustrating LLM memory consolidation during sleep](/assets/blogs/sleep-framework-llms/sleep-framework-llms-hero.png)

## Why LLMs Need a Sleep Framework

{: data-eyebrow="01 / Introduction"}

The **Sleep Framework for LLMs** adds a sleep phase to continual learning. It lets large language models keep integrating new facts and get better at reasoning, without catastrophic forgetting and without being stuck at a static knowledge cutoff.

### The Problem: Static Models with a Knowledge Cutoff

Modern LLMs get their performance from pre-training and in-context learning (ICL). Once deployed, though, they stay largely static. They run with a fixed knowledge cutoff, so they can't build long-term capabilities or adapt to new information.

Say a model's last training run finished on 31 August. Anything that happened after that date, it simply hasn't seen, so it can't tell you about it.

In-context learning works around this for a while. Give the model tools like web search, and it can read the latest information and answer correctly. But once the session ends, the model forgets all of it.

### Why Retraining and In-Context Learning Both Fall Short

Updating the model with new data looks like the obvious fix. In practice, continual parameter updates often trigger **catastrophic forgetting**: learning a new task badly degrades performance on tasks the model already knew.

Relying only on ICL has the opposite problem. What the model learns lives only in the context window, so the short-term information disappears when the session does.

### The Idea: Consolidating Memory During Sleep

The researchers take their cue from how the human brain processes and stabilizes memories during rest. Their sleep framework gives an LLM a continuous, periodic lifecycle: it alternates between active interaction and offline memory consolidation, turning fragile short-term context into stable long-term parameters.

With this cycle, they report that LLMs can keep acquiring new facts, retain long-context knowledge of up to **10M tokens**, and improve on complex reasoning. That is the gap the sleep framework was built to close.

## Rethinking Machine Learning: Wake vs. Sleep Phases in the Sleep Framework

{: data-eyebrow="02 / Wake vs. sleep"}

This approach mirrors biological sleep cycles to handle continual learning, and it tackles one of the most stubborn bottlenecks in modern AI architecture.

It moves away from the rigid choice between static pre-training and fragile, session-bound in-context learning (ICL). Instead, the sleep paradigm adds an automated post-training lifecycle that bridges short-term interaction and long-term memory.

Traditional machine learning keeps training and inference strictly separate. In continual learning, that split becomes artificial: an intelligent agent has to keep learning, adapting and processing information all the time.

Under the sleep paradigm, an LLM moves between two primary states:

<div class="fn-cards fn-cards--two">
  <div class="fn-card">
    <p class="fn-card-tag">Phase 1 / Active</p>
    <h4 class="fn-card-title">Wake</h4>
    <p class="fn-card-text">The model receives, processes and interacts with live inputs in real time. It stores temporary information in fast, short-term memory components, or high-frequency layers.</p>
  </div>
  <div class="fn-card">
    <p class="fn-card-tag">Phase 2 / Offline</p>
    <h4 class="fn-card-title">Sleep</h4>
    <p class="fn-card-text">The model stops taking new inputs and redirects its computation toward memory consolidation and self-improvement, in two stages: consolidation, mirroring NREM sleep, and dreaming, mirroring REM sleep.</p>
  </div>
</div>

### What "Sleep" Means for an LLM

Words like "sleep," "dreaming" and "self-improvement" are borrowed from neuroscience, but the researchers are clear that the framework runs entirely inside a fixed model architecture, under human-defined training rules.

During the offline sleep phase, the model unlocks pre-allocated Mixture-of-Experts (MoE) memory blocks and updates its weights using practice examples it generates itself.

This automated post-training cycle lets a deployed model absorb new facts and sharpen its reasoning, while its core code and design stay unchanged.

## Key Components of the Sleep Process in the Sleep Framework

{: data-eyebrow="03 / Sleep process"}

The sleep paradigm tackles catastrophic forgetting and continuous adaptation in two stages: **memory consolidation** and **dreaming**.

### Stage 1: Memory Consolidation (NREM Sleep)

In the human brain, non-rapid eye movement (NREM) slow-wave sleep turns fragile memories into long-term structures through abstraction and distillation. The sleep framework mirrors this with three mechanisms.

**Parameter expansion and the continuum memory hierarchy.** To prevent catastrophic forgetting, the model scales its capacity during sleep instead of overwriting old weights. Using a Mixture-of-Experts (MoE) and the Hope architecture, newly unlocked low-rank experts join stable, lower-frequency memory blocks. They store incoming knowledge without disturbing older parameters.

**Knowledge seeding (upward distillation).** Fragile short-term memories in high-frequency layers, such as in-context memory, are transferred into the newly expanded long-term parameters. This combines Generalized Knowledge Distillation (GKD) with reinforcement learning (RL)-based imitation learning:

- **On-policy distillation:** the expanded student model learns token-level feedback from teacher distributions, computed on sequences it sampled itself.
- **Learning to imitate (LTI):** the student is rewarded for completing prefixes of teacher-generated text, scored on both semantic similarity and exact similarity (Levenshtein distance).

**Synaptic pruning.** Once consolidation into the lower-frequency modules is complete, the high-frequency temporary parameters are reset. That frees capacity for the next active session.

![Sleep Framework for LLMs diagram: the active phase streams inputs into fast short-term memory (KV cache), then the sleep phase runs consolidation through low-rank mixture-of-experts specialist modules and dreaming with random expert routing and reinforcement learning refinement, producing consolidated parametric memory](/assets/blogs/sleep-framework-llms/sleep-framework-llms-active-sleep-phase-consolidation-dreaming-diagram.png)

### Stage 2: Dreaming for Self-Improvement (REM Sleep)

During REM sleep, the brain simulates scenarios, strengthens emotional and semantic connections, and explores new neural pathways. The sleep framework's dreaming stage mirrors this with an autonomous self-improvement loop:

- **Random expert selection:** while generating synthetic data, the MoE router randomly activates non-standard experts. This forces the model to mix unrelated domains of knowledge and uncover latent patterns.
- **Curated rehearsal:** the model generates synthetic training samples ("dreams") and filters them with gradient-based data selection, keeping the samples most likely to improve overall capability.
- **RL refinement:** the model runs supervised fine-tuning on the top-rated dreams, then checks whether the result actually improves performance on downstream tasks.

## Theoretical Foundations: Why the Sleep Framework Avoids Catastrophic Forgetting

{: data-eyebrow="04 / Theory"}

Beyond the empirical results, the researchers ground the paradigm in theory. It explains why the two stages can support continual learning without simply trading new knowledge for old capabilities.

### Memory Consolidation as Low-Rank Compression

For consolidation, the analysis treats knowledge seeding as a **structured, low-rank compression problem**. The model is not asked to copy every detail of its short-term traces into its weights.

Instead, it finds a compact set of directions that best preserve two things: its own on-policy behavior, and the semantic qualities the learning objective rewards.

This explains why the two training signals complement each other:

- **On-policy distillation** aligns consolidation with the trajectories the model will actually produce at inference time. That reduces the mismatch you get from training only on teacher-generated distributions.
- **The semantic reward** changes what is worth keeping. It favors directions that preserve meaning and task-relevant behavior over directions that merely match token probabilities.

Parameter expansion then supplies the capacity to write these selected memories without overwriting knowledge consolidated earlier.

### Dreaming as Better Learning Geometry

For dreaming, the theory frames random expert activation and reward-based sample selection as ways to **improve the geometry of learning**.

Activating different experts broadens the set of gradient directions explored during synthetic generation. The model sees a richer set of updates than its ordinary wake-time data would produce.

Gradient-based filtering then emphasizes the synthetic experiences with the most useful learning signal. It strengthens informative directions while preserving the structure of the underlying gradient space.

Together, these steps give a more balanced optimization landscape. Learning is less dominated by a few directions, gradients are better conditioned, and the model makes steadier progress as it refines its capabilities.

In this view, dreaming is not just self-generated data augmentation. It is a deliberate process for diversifying, selecting and consolidating the updates through which the model improves itself.

## Sleep Framework Results: Continual Learning Benchmarks

{: data-eyebrow="05 / Results"}

![Sleep Framework for LLMs results: class-incremental learning accuracy on CLINC, Banking and DBpedia versus Hope, InCA and EWC, and continual translation ChrF for Manchu and Kalamang to English across Sleep-1, Sleep-2 and Sleep-3](/assets/blogs/sleep-framework-llms/sleep-framework-llms-class-incremental-learning-continual-translation-results.png)

**Continual translation.** On unseen languages such as Manchu and Kalamang, the sleep framework showed a near-zero performance drop across multi-stage evaluations. Standard baselines, including ICL, Cartridges and supervised fine-tuning (SFT), suffered severe catastrophic forgetting during sequential learning.

**Long-context understanding.** On the BABILong benchmark, the sleep method scaled almost perfectly up to **10M tokens**, beating strong baselines like GPT-4 and Titans. It does this by compressing long-context information directly into parametric memory during sleep.

**Factual knowledge incorporation.** On SQuAD and continued pre-training (CPT), the sleep method scored **48.9%** on single-task and **46.2%** on CPT evaluations. It beat the base model, SFT and Self-Adapting Language Models (SEAL), adding new facts without degrading existing representations.

**Mathematical reasoning.** On AIME 24, AIME 25 and HMMT 25, the sleep-enhanced base model reached **79.2%**, **69.0%** and **46.1%**. It outperformed SFT, group relative policy optimization (GRPO) and on-policy self-distillation (OPSD), suggesting that pairing memory consolidation with imitation learning drives stronger reasoning.

## Sleep Framework vs RAG and Fine-Tuning: Why It Matters

{: data-eyebrow="06 / Why it matters"}

Retrieval-Augmented Generation (RAG) and tool use let models read external data on the fly, but they still depend on the immediate context window. Once a session ends, that context vanishes and the model has learned nothing permanently.

Naive continual fine-tuning has the opposite problem: it causes catastrophic forgetting.

The sleep framework offers a middle ground. It turns the model into a self-updating system that writes factual updates directly into its weights while protecting its foundational knowledge.

## Conclusion: Toward Continually Learning AI

{: data-eyebrow="07 / Conclusion"}

The sleep paradigm offers a path toward autonomous, continually learning AI systems.

By moving beyond static pre-training and fragile context windows, and alternating between active learning and offline rest, LLMs can retain short-term memories, abstract new skills into long-term parameters, and keep improving themselves without catastrophic forgetting.
