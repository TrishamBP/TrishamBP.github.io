---
layout: learning-paper
title: "DAPO: Open-Source LLM Reinforcement Learning at Scale"
authors: "ByteDance Seed & Tsinghua AIR (SIA-Lab)"
year: 2025
venue: "arXiv:2503.14476"
description: "An engineering deep-dive on DAPO, the open-source large-scale LLM reinforcement learning system for long-CoT reasoning: its four techniques — Clip-Higher, Dynamic Sampling, Token-Level Policy Gradient Loss, and Overlong Reward Shaping — and how they change the GRPO training loop to reach 50% avg@32 on AIME 2024 from Qwen2.5-32B."
paper_link: "https://arxiv.org/abs/2503.14476"
category: training-alignment
subcategory: rl-for-llms
date: 2025-03-17
order: 0
mathjax: true
tags: ["DAPO", "Reinforcement Learning", "LLM RL", "GRPO", "PPO", "Long-CoT RL", "Policy Optimization", "Clip-Higher", "Dynamic Sampling", "Token-Level Loss", "Overlong Reward Shaping", "Reasoning Models", "Qwen2.5-32B", "verl", "AIME 2024"]
highlights:
  - "DAPO is a system, not just an algorithm: an open-source RL recipe (algorithm + verl training code + DAPO-Math-17K) that takes Qwen2.5-32B from a 30% naïve-GRPO baseline to 50% avg@32 on AIME 2024"
  - "Four separable techniques, each fixing one long-CoT failure mode — Clip-Higher (entropy collapse), Dynamic Sampling (zero-gradient groups), Token-Level Loss (length dilution), Overlong Reward Shaping (truncation noise)"
  - "The objective (Equation 8) is GRPO with decoupled clip bounds, a token-count normalizer, and a group-admission constraint — and no KL penalty term at all"
  - "Three of the four techniques were found by instrumenting the mechanism — entropy, effective prompt count, truncation rate — not by watching the accuracy curve"
---

# DAPO: An Open-Source LLM Reinforcement Learning System at Scale

**Paper:** *DAPO: An Open-Source LLM Reinforcement Learning System at Scale* — arXiv:[2503.14476](https://arxiv.org/abs/2503.14476), March 17, 2025
**Authors & affiliations:** ByteDance Seed; Institute for AI Industry Research (AIR), Tsinghua University; The University of Hong Kong; SIA-Lab of Tsinghua AIR and ByteDance Seed (full author list in the paper's Contributions)
**Method:** Decoupled Clip and Dynamic sAmpling Policy Optimization (**DAPO**)
**Implementation:** built on **[verl](https://github.com/volcengine/verl)** — project page <https://dapo-sia.github.io/>
**Evaluation:** AIME 2024, `avg@32` (temperature 1.0, top-p 0.7)

> **Attribution.** This is an engineering deep-dive, not a reproduction of the paper. Where it states what DAPO does — the failure modes, Equation 8, the four techniques, the dataset transformation, the training configuration, the results and cumulative ablation, and the training-dynamics metrics — it follows the paper. Section 1 is general background on compute scaling, labelled as such. Sections 15–17, the second half of 19, and 20 are our own engineering reading and are labelled where they go beyond the source.

> **A note on the running example.** Section 15 uses a **drug-discovery workflow** as an illustrative walkthrough. That example is **ours, for illustration only** — it is not one of the paper's evaluated tasks, no experiment in it was run, and nothing in it should be attributed to the authors. The paper's own evidence is Sections 12–14.

> **Independence.** This is a standalone post about DAPO. It shares the repository's formatting conventions with the other research-paper posts here and nothing else — no structure, framing, or claim is carried over from them.

*Reading map:*

- **Section 1** is background: training-time versus test/inference-time compute scaling, and which side RL is on.
- **Section 2** is the failure modes of running large-scale RL naïvely.
- **Section 3** is a brief RL preliminary — policy optimization, PPO, KL, rule-based rewards — which defers to a separate article rather than re-deriving the fundamentals.
- **Section 4** is DAPO's objective (Equation 8), unpacked term by term.
- **Section 5** names the four techniques and their stated purposes.
- **Section 6** is Clip-Higher: why symmetric clipping suppresses exploration, and what decoupling the bounds fixes.
- **Section 7** is Dynamic Sampling: why all-correct and all-incorrect groups produce no gradient at all.
- **Section 8** is the token-level loss: why sample-level averaging makes long degenerate responses cheap.
- **Section 9** is Overlong Reward Shaping: why truncation penalties are noise, and how a graded penalty fixes it.
- **Sections 10–11** cover the dataset transformation that makes rewards verifiable, and the assembled training system.
- **Sections 12–14** are the paper's evidence: experiments, training dynamics, and reasoning behavior.
- **Section 15** is the drug-discovery walkthrough (ours, not the paper's).
- **Sections 16–20** cover the systems perspective, why it matters, limitations, future directions, and takeaways.

---

## Introduction

DeepSeek-R1 showed that large-scale reinforcement learning could unlock powerful reasoning behavior. Reproducing that result was another matter, because the critical details of the RL training recipe were not fully available.

That gap is the paper's starting point, and it is worth drawing precisely, because it is a gap in *disclosure* rather than in ideas:

```text
Closed / partially disclosed reasoning systems
        │
        ├── OpenAI o1
        ├── DeepSeek-R1
        └── other reasoning models
                 │
                 ↓
        RL is known to be critical
                 │
                 ↓
      But the complete RL recipe
      is not sufficiently disclosed
                 │
                 ↓
       Difficult to reproduce
       industry-scale results
```

Note what is *not* being claimed here. Nobody is in doubt that RL matters for reasoning — the reasoning models made that case convincingly. The problem is downstream of that agreement. If you know RL is the mechanism, know roughly which algorithm family is involved, and still cannot reproduce the result, then what is missing is not the concept. It is the recipe: the specific techniques, the specific settings, and the specific data that turn a plausible training loop into one that actually works at scale.

DAPO's response is to release the recipe. And this is the framing worth holding onto, because it is easy to file this paper under the wrong heading:

> DAPO is not simply "an open-source RL technique." It is an **open-source large-scale LLM reinforcement-learning system centered around the DAPO optimization algorithm.**

The distinction is not rhetorical. Three separate things are being released:

```text
                 DAPO
                  │
       ┌──────────┼──────────┐
       ↓          ↓          ↓
   Algorithm     Code      Dataset
       │          │          │
       ↓          ↓          ↓
   DAPO RL     Training    DAPO-Math
   techniques  system      data
```

The implementation is built on **verl**, and the authors state the intent behind releasing all three: by fully releasing their state-of-the-art RL system including training code and data, they aim to reveal insights into large-scale LLM RL that benefit the wider community.

Which lets the authors make a claim that a purely algorithmic paper cannot:

> Here is the RL algorithm, here is the implementation, and here is the training data — so you can actually reproduce and study large-scale reasoning RL.

That is a different kind of contribution from proposing another mathematical modification to PPO or GRPO. A better objective published on its own leaves the reader with the harder half of the work still to do: build the training system, source and clean the data, discover the settings that keep a long-horizon run from falling over. Releasing all three removes the part of the pipeline where reproduction actually fails.

The paper's own demonstration follows this shape. Starting from **Qwen2.5-32B**, their initial naïve GRPO setup reached **30%** on AIME 2024 — against **47%** reported for DeepSeek-R1-Zero-Qwen-32B. That shortfall is the paper's real experimental subject. Rather than treating it as a tuning problem, they diagnose what goes wrong during long-CoT RL — **entropy collapse**, **reward noise**, **training instability** — and build DAPO around **four techniques** that address those failure modes. The result is **50%** from the same base model.

> **On "points."** The paper reports these as points, but they are not traditional AIME contest scores out of 15. They are **percentage accuracies under the paper's `avg@32` metric** — 32 independent generations per problem, averaged. Section 12 unpacks the metric; read "30 points" as "30% `avg@32`" throughout.

*The paper's Figure 1 plots AIME 2024 `avg@32` against gradient update steps: DAPO surpasses DeepSeek-R1-Zero-Qwen-32B using roughly half the steps.*

Figure 1 is the paper's headline chart, and two things in it are worth separating. The first is the endpoint: DAPO surpasses the previous state of the art on this base model. The second is the x-axis, which is measured in **gradient update steps** — and on that axis DAPO passes DeepSeek-R1-Zero-Qwen-32B using **half the training steps**. So the claim is not only about where the curve ends but about how quickly it gets there, which matters a great deal when a single run at this scale is the expensive object.

So the arc of this post is the arc of that diagnosis:

```text
Why is large-scale LLM RL difficult?
            ↓
Why does naïve GRPO struggle?
            ↓
What did DAPO change?
            ↓
    Clip-Higher
    Dynamic Sampling
    Token-Level Policy Gradient Loss
    Overlong Reward Shaping
            ↓
50% avg@32 on AIME 2024
from Qwen2.5-32B
```

The metric behind all three figures is `avg@32`, evaluated at temperature 1.0 and top-p 0.7 — see Section 12. Figure 1 is the source for the training-step comparison.

---

## 1. Why Large-Scale Reinforcement Learning for LLMs?

> **What this section is.** General background on compute scaling, not a summary of the paper's own argument. It is here because "reinforcement learning for reasoning" is easy to mis-file if you have not first separated *the compute spent building a model* from *the compute spent using one*. The paper's own machinery starts in Section 3.

### Two places to spend compute

There are two fundamentally different things you can do with more compute, and the reasoning-model literature moves between them quickly enough that it is worth pinning down.

```text
                 COMPUTE SCALING
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
       Training-time        Inference-time
          scaling               scaling
             │                   │
       improve model        solve harder
       parameters            problems
                                 │
                                 ↓
                         Test-time scaling
```

**Training-time scaling** spends compute changing the model:

```text
More data
   +
More GPUs
   +
More training steps
   ↓
Better model
```

**Inference-time scaling** leaves the model alone:

```text
Same trained model
       ↓
More computation per problem
       ↓
Better answer
```

The one-line mental model, which is worth carrying through the rest of this post:

> **Training-time scaling makes the model better; test/inference-time scaling gives the model more time to think.**

### What one forward generation buys you

The default arrangement is one generation, one answer:

```text
"What is the best molecule for target X?"
          ↓
        LLM
          ↓
      Answer
```

Whatever compute that pass consumes is the entire compute budget for the problem. If the answer is wrong, nothing in the arrangement noticed.

### Inference-time scaling

The broader of the two terms: increase the computation performed during inference. There are two obvious shapes it can take.

Sample several answers and pick among them:

```text
                 Prompt
                    ↓
          ┌─────────┼─────────┐
          ↓         ↓         ↓
       Answer 1   Answer 2   Answer 3
          │         │         │
          └─────────┼─────────┘
                    ↓
                 Judge
                    ↓
              Best answer
```

Or make a single chain much longer:

```text
Prompt
 ↓
Reason → Reason → Reason → Reason → Answer
```

Either way you have spent more inference computation than the single pass above.

### Test-time scaling

Test-time compute traditionally means something more specific:

> When the model is being evaluated on a new problem, give it additional computation to improve its prediction.

Concretely, for a math problem. Normal inference:

```text
Problem
   ↓
Model
   ↓
42
```

Test-time scaling — generate 64 solutions and aggregate:

```text
                 Problem
                    ↓
        ┌───────────┼───────────┐
        ↓           ↓           ↓
      Solve 1     Solve 2     ... Solve 64
        │           │
        └───────────┼───────────┘
                    ↓
             Voting / verifier
                    ↓
                  Answer
```

The crucial property: **the model parameters have not changed.** Better performance is bought entirely by allocating more computation to each test problem.

### How the two terms relate

Test-time scaling is usually a *form* of inference-time scaling, and in modern LLM writing the two are sometimes used interchangeably. There is no universally strict boundary, and different papers draw it differently — so it is worth stating the convention rather than assuming it.

| Term | How this post uses it |
|---|---|
| **Inference-time scaling** | The broader term: any increase in computation during model inference. |
| **Test-time scaling** | The narrower case: compute allocated to solving each individual problem at evaluation or deployment time — longer reasoning, multiple sampled trajectories, search, verification, self-consistency. |

### Where reasoning models come in

This is the setting in which test-time compute scaling gets discussed most, because a reasoning model gives you a dial. The same model, with a larger reasoning budget:

```text
                 Same model
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
    1K tokens     8K tokens    32K tokens
       │            │             │
       ↓            ↓             ↓
    answer       better?        better?
```

Or the same model sampled repeatedly:

```text
Prompt
  ↓
Trajectory 1
Trajectory 2
Trajectory 3
...
Trajectory N
  ↓
Verifier / judge / voting
  ↓
Final answer
```

Both are test-time / inference-time compute scaling. Neither touches a weight.

### And where RL sits

Reinforcement learning is on the **other** side of the diagram. RL changes the parameters, so it is training-time scaling — which is the distinction that keeps DAPO in focus. DAPO is not a method for giving a model more time to think at evaluation. It is a method for training the model, and 32B parameters' worth of weights come out the other end.

*(Engineering interpretation, not a claim from the paper:* the two sides are complements rather than alternatives, and they meet at the reasoning chain. Test-time scaling assumes a model that uses a long chain productively; RL is how that assumption gets satisfied. Extending a budget from 1K to 32K tokens only helps if the tokens in between are doing work, and what "doing work" looks like is exactly what a training procedure has to instil.*)*

This is also why long-CoT RL is expensive in a way ordinary post-training is not. The behavior being trained is long, so every rollout in the training loop is long — the training procedure inherits the cost profile of the inference-time behavior it is trying to produce. A single rollout can run to thousands of tokens, and the loop needs a great many of them. Section 2 is what happens when you run that loop naïvely; Sections 11 and 16 are what it takes to run it at all.

---

## 2. The Problem with Naive RL at Scale

The paper does not begin from a proposed improvement. It begins from a run that underperformed.

Take GRPO as published, apply it to Qwen2.5-32B, and train at scale on mathematical reasoning:

```text
Qwen2.5-32B  +  naïve GRPO
            ↓
   30% avg@32 on AIME 2024

DeepSeek-R1-Zero-Qwen-32B
            ↓
   47% avg@32 on AIME 2024
```

A shortfall of 17 percentage points from what is, at the level of the objective, broadly the same approach. That gap is the evidence that something other than the choice of algorithm family is doing the work — and it is why the paper's contribution is a recipe rather than an equation.

What they identify are practical failure modes of long-CoT RL, and each of the four techniques is introduced against a stated purpose:

| Failure mode | Technique | The paper's stated purpose |
|---|---|---|
| **Entropy collapse** | Clip-Higher (§6) | Promotes the diversity of the system and avoids entropy collapse |
| **Training inefficiency and instability** | Dynamic Sampling (§7) | Improves training efficiency and stability |
| **Long-CoT–specific loss aggregation** | Token-Level Policy Gradient Loss (§8) | Critical in long-CoT RL scenarios |
| **Reward noise** | Overlong Reward Shaping (§9) | Reduces reward noise and stabilizes training |

Note that the correspondence is not one failure mode per technique. Stability is named as a target by two of them, and Token-Level Policy Gradient Loss is justified by the *setting* rather than by a named pathology — the paper's own phrasing is that it is critical in the long-CoT scenario. Sections 6–9 take each in turn.

The structural point, which the rest of the post depends on: none of these is a flaw in GRPO's derivation. They are things that happen to a training run when rollouts are thousands of tokens long, rewards are sparse and rule-derived, and the loop runs long enough for small biases to compound. A naïve implementation is not wrong so much as *unprepared* — and the four techniques are each a response to one of the ways it comes apart.

---

## 3. Preliminaries: Reinforcement Learning for LLMs

Before discussing DAPO, a brief review of the RL concepts used in large language model post-training. The goal here is **not** a complete treatment — for the optimization algorithms, objectives, and derivations, see the dedicated article on LLM reinforcement learning, PPO, and GRPO: [our RL for LLMs deep-dive](/ai%20engineering/2026/09/10/reinforcement-learning-for-llms-rlhf-rlaif-rlvf-rlef-swirl-post-training/).

This section establishes just enough context to make DAPO's changes legible. If you have read that article, skip to Section 4.

### RL Optimization for Language Models

At a high level, an LLM is treated as a **policy**:

$$
\pi_\theta(a \mid s)
$$

The model generates an action $a$ — typically a sequence of tokens — given a state $s$, such as the problem prompt plus the previously generated context.

The objective is to adjust the parameters $\theta$ so that trajectories receiving higher rewards become more likely:

$$
\max_\theta \; \mathbb{E}[R]
$$

For reasoning tasks the cycle is: the model generates a solution, receives a reward based on its outcome or behavior, and the RL algorithm updates the policy accordingly.

*For the detailed treatment of policy-gradient optimization and how RL is applied to LLMs, see the dedicated article:* [our RL for LLMs deep-dive](/ai%20engineering/2026/09/10/reinforcement-learning-for-llms-rlhf-rlaif-rlvf-rlef-swirl-post-training/).

### Proximal Policy Optimization (PPO)

PPO is one of the foundational policy-optimization methods used for LLM RL. Rather than letting the updated policy move arbitrarily far from the policy that generated the data, PPO constrains the update using a **clipped probability ratio**.

Conceptually:

```text
Old Policy
    │
    │ generate responses
    ▼
Responses + Rewards
    │
    ▼
Policy Optimization
    │
    ├── improve high-reward behavior
    └── constrain excessively large updates
    ▼
New Policy
```

This gives a stable mechanism for improving the model while preventing excessively aggressive updates.

The clipping mechanism is the part to hold onto, because **Clip-Higher (§6) is a modification to exactly this** — which is where the "Decoupled Clip" in DAPO's name comes from.

*Mathematical derivation of PPO and policy-gradient optimization:* [our RL for LLMs deep-dive](/ai%20engineering/2026/09/10/reinforcement-learning-for-llms-rlhf-rlaif-rlvf-rlef-swirl-post-training/).

### Group Relative Policy Optimization (GRPO)

GRPO is the algorithm DAPO starts from, so the two properties DAPO modifies are worth stating here rather than in the RL article.

**Advantages are computed within a group, not by a value network.** For a prompt $q$, GRPO samples a group of $G$ responses, scores each, and normalizes each response's reward against the group's own statistics:

$$
\hat A_i
=
\frac{r_i-\operatorname{mean}(r)}{\operatorname{std}(r)}
$$

No critic is trained. The group is the baseline. DAPO's configuration uses **group reward normalization** in exactly this sense (§12), and the whole of §7 follows from a property of this expression: if every response in a group receives the same reward, every advantage in it is zero.

**The loss is reduced at the sample level.** Token losses are averaged inside each response, and those per-response values are then averaged across the group:

$$
\frac{1}{G}\sum_{i=1}^{G}
\left(
\frac{1}{|o_i|}\sum_{t=1}^{|o_i|} L_{i,t}
\right)
$$

so each response contributes equally regardless of its length. This is what §8 changes.

Everything else — the clipped ratio, the constraint against moving too far from $\pi_{\theta_{\text{old}}}$ — is inherited from PPO above. *For the derivation of GRPO and how the group baseline replaces a learned value function:* [our RL for LLMs deep-dive](/ai%20engineering/2026/09/10/reinforcement-learning-for-llms-rlhf-rlaif-rlvf-rlef-swirl-post-training/).

> The 30% baseline in §2 and §12 is a run of exactly this algorithm on Qwen2.5-32B Base. Nothing was wrong with it as an implementation of GRPO.

> **Related engineering implementations.** DAPO starts from GRPO and is measured against DeepSeek-R1's result on the same base model. For the code-level builds of both, see [GRPO (DeepSeekMath): Group Relative Policy Optimization](/engineering/grpo-deepseekmath-group-relative-policy-optimization/) and [DeepSeek-R1: Incentivizing Reasoning via Reinforcement Learning](/engineering/deepseek-r1-incentivizing-reasoning-via-reinforcement-learning/).

### KL Divergence

LLM RL commonly uses **KL divergence** to control how far the optimized policy moves from a reference policy:

$$
D_{\mathrm{KL}}\!\left(\pi_\theta \,\|\, \pi_{\text{ref}}\right)
$$

It acts as a constraint against the model drifting too far from its starting or reference behavior. The trade-off it mediates:

```text
                         RL Objective
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
       Maximize reward              Stay close to
                                   reference policy
                │                           │
                └─────────────┬─────────────┘
                              ▼
                       Stable optimization
```

The exact treatment of KL depends on the algorithm and the training setup. *For KL regularization in depth:* [our RL for LLMs deep-dive](/ai%20engineering/2026/09/10/reinforcement-learning-for-llms-rlhf-rlaif-rlvf-rlef-swirl-post-training/).

**DAPO's objective contains no KL term.** Equation 8 (§4) has no $D_{\mathrm{KL}}(\pi_\theta \| \pi_{\text{ref}})$ penalty anywhere in it; the constraint on policy movement is carried entirely by the clipped ratio. That is an absence readable directly off the equation.

**Why the authors remove it.** The paper gives this a short dedicated section (§2.3, "Removing KL Divergence"). The reasoning: the KL penalty exists to keep the online policy close to a frozen reference, which is the right constraint in the RLHF alignment setting — you do not want the aligned model to drift far from where it started. But when training a long-CoT *reasoning* model, the policy is *supposed* to move a long way from its initial distribution, so the paper states that "during training the long-CoT reasoning model, the model distribution can diverge significantly from the initial model, thus this restriction is not necessary." They therefore drop the term entirely.

### Rule-Based Reward Modeling

For mathematical reasoning tasks such as AIME, rewards can often be obtained **without training a separate learned reward model**:

```text
Problem
   ↓
LLM reasoning
   ↓
Final answer
   ↓
Rule-based verifier
   ↓
Correct / Incorrect
   ↓
Reward
```

If the expected answer is $123$ and the model produces $123$, the verifier assigns a positive reward; otherwise a negative or zero reward, according to the training setup.

This is what makes mathematical reasoning a convenient RL domain: the final answer is an objective signal that can be verified automatically. It also connects forward to Section 10 — the dataset transformation exists so that every training problem yields a reward this cheaply.

### What this gives us

The ingredients needed to read the rest of the post:

```text
policy optimization
        +
   reward signals
        +
KL / policy constraints
        +
 verifiable rewards
```

DAPO's subject is what happens when that process is scaled up: naïve GRPO training can suffer from entropy collapse, reward noise, and training instability — which is where Section 2 left off, and what Sections 6–9 address one at a time.

---

## 4. DAPO

With the preliminaries in place, the method itself. DAPO is stated as a single objective, and it is worth putting the whole thing on the page before taking it apart — every one of the four techniques from Section 5 is visible in it, or visible by its absence.

### Decoupled Clip and Dynamic Sampling Policy Optimization

The name is a compression of two of the four techniques:

| Fragment | Technique | Section |
|---|---|---|
| **Decoupled Clip** | Clip-Higher — the clipping range is split into a separate lower and upper bound | §6 |
| **Dynamic sAmpling** | Dynamic Sampling — a constraint on which groups are allowed into the batch | §7 |

The other two techniques — Token-Level Policy Gradient Loss and Overlong Reward Shaping — are present in the objective too, but as a choice of normalizer and a choice of how $R_i$ is computed, neither of which makes for a pronounceable acronym.

### DAPO Objective

DAPO samples a group of outputs $\{o_i\}_{i=1}^{G}$ for each question $q$ paired with its answer $a$, and optimizes the policy via the following objective:

$$
\mathcal{J}_{\text{DAPO}}(\theta)
=
\mathbb{E}_{(q,a)\sim\mathcal{D},\;\{o_i\}_{i=1}^{G}\sim\pi_{\theta_{\text{old}}}(\cdot\mid q)}
\left[
\frac{1}{\sum_{i=1}^{G}|o_i|}
\sum_{i=1}^{G}\sum_{t=1}^{|o_i|}
\min\Big(
r_{i,t}(\theta)\,\hat{A}_{i,t},\;
\operatorname{clip}\big(r_{i,t}(\theta),\,1-\varepsilon_{\text{low}},\,1+\varepsilon_{\text{high}}\big)\,\hat{A}_{i,t}
\Big)
\right]
$$

subject to

$$
0 \;<\; \big|\{\,o_i \mid \texttt{is\_equivalent}(a, o_i)\,\}\big| \;<\; G,
$$

where

$$
r_{i,t}(\theta)
=
\frac{\pi_\theta(o_{i,t}\mid q, o_{i,<t})}{\pi_{\theta_{\text{old}}}(o_{i,t}\mid q, o_{i,<t})},
\qquad
\hat{A}_{i,t}
=
\frac{R_i - \operatorname{mean}\!\left(\{R_i\}_{i=1}^{G}\right)}{\operatorname{std}\!\left(\{R_i\}_{i=1}^{G}\right)}
$$

*(Equation 8 in the paper.)*

Now term by term, because each piece is load-bearing.

**$(q,a)\sim\mathcal{D}$** — a question drawn with its answer. The answer is present because the reward is rule-based (§3): you need $a$ to check $o_i$ against it.

**$\{o_i\}_{i=1}^{G}\sim\pi_{\theta_{\text{old}}}(\cdot\mid q)$** — $G$ outputs sampled from the *old* policy for the same question. This group is the unit of the algorithm. Note what is absent: there is no value network anywhere in the objective. The group is what replaces it.

**$r_{i,t}(\theta)$** — the importance ratio between the new and old policy, *per token*. Indexed by both $i$ (which output) and $t$ (which token within it).

**$\hat{A}_{i,t}$** — the advantage, computed by standardizing each output's reward against the mean and standard deviation of the rewards within its own group. This is what "group relative" means: an output is not judged against an absolute scale but against its siblings on the same question. Note the indexing carefully — $\hat{A}_{i,t}$ carries a $t$ subscript, but the expression on the right depends only on $R_i$. The advantage is therefore **constant across all tokens of a given output**; every token in $o_i$ receives the same advantage.

**$\min\big(r\hat{A},\,\operatorname{clip}(r,\,1-\varepsilon_{\text{low}},\,1+\varepsilon_{\text{high}})\hat{A}\big)$** — the PPO-style clipped objective from §3, with one change: the lower and upper clipping bounds are **separate parameters**, $\varepsilon_{\text{low}}$ and $\varepsilon_{\text{high}}$, rather than a single symmetric $\varepsilon$. That decoupling is the entire mechanical content of Clip-Higher, and Section 6 is about why it matters.

**$\frac{1}{\sum_{i=1}^{G}|o_i|}$** — the normalizer, and the subtlest term in the objective. The sum runs over *every token in every output in the group*, so the denominator is the group's **total token count**. Every token therefore contributes equally to the loss, regardless of which output it came from or how long that output was. This is Token-Level Policy Gradient Loss (§8), and it is a single choice of denominator.

**The constraint $0 < |\{o_i \mid \texttt{is\_equivalent}(a,o_i)\}| < G$** — read it as: *the number of correct outputs in the group must be strictly between zero and all of them.* Groups where every output is wrong, or every output is right, are excluded. The reason is visible in $\hat{A}_{i,t}$ itself: if all $G$ rewards are identical, then $R_i - \operatorname{mean}(\{R_i\})$ is zero for every $i$, the advantage vanishes, and the group contributes no gradient. This is Dynamic Sampling (§7).

That denominator is worth confirming as you read, because it is the one place where a single symbol changes the meaning of the whole objective. Written as $\sum_{i=1}^{G}|o_i|$ it is the group's total token count and the loss is token-level; written as $G$ it would be the group size and the loss would revert to sample-level. §8 sets the two forms side by side.

### How DAPO Differs from GRPO

Four differences are readable off the objective, three of them as *presences* and one as an *absence*.

| Change | Where it appears in Equation 8 | Section |
|---|---|---|
| Decoupled clipping bounds | $\varepsilon_{\text{low}}$, $\varepsilon_{\text{high}}$ instead of a single $\varepsilon$ | §6 |
| Group-level admission constraint | the `s.t.` line | §7 |
| Token-level normalization | the $\frac{1}{\sum_i \lvert o_i\rvert}$ prefactor | §8 |
| Reward shaping for overlong outputs | inside $R_i$, which enters via $\hat{A}_{i,t}$ | §9 |
| **No KL penalty term** | absent from the objective entirely | §3 |

That last row is the one to notice. The objective contains no $D_{\mathrm{KL}}(\pi_\theta \| \pi_{\text{ref}})$ term at all — the constraint on how far the policy moves is carried entirely by the clipping, not by a divergence penalty.

Set the two objectives side by side. GRPO's reduction (§3):

$$
\frac{1}{G}\sum_{i=1}^{G}
\left(
\frac{1}{|o_i|}\sum_{t=1}^{|o_i|} L_{i,t}
\right)
$$

DAPO's:

$$
\frac{1}{\sum_{i=1}^{G}|o_i|}
\sum_{i=1}^{G}\sum_{t=1}^{|o_i|} L_{i,t}
$$

Same token losses. The per-response mean is gone and the outer denominator counts tokens rather than responses — the whole of §8 in two edits.

What is worth noting about the list above is how little of it is a change to the *form* of the objective. There is no new term, no new network, and no new estimator. Two constants become two different constants ($\varepsilon$ splits in two), one denominator changes, one predicate is attached to which groups are admissible, and one input to $R_i$ is reshaped. DAPO is a set of changes to how an existing objective is parameterized, normalized, and fed — which is consistent with the paper describing itself as a system rather than a new algorithm.

The reasoning behind each change is not in the equation, and Sections 6–9 take them one at a time.

---

## 5. The Four Key Techniques

The paper's own summary of what it introduces:

> We propose the Decoupled Clip and Dynamic sAmpling Policy Optimization (DAPO) algorithm, and introduce 4 key techniques to make RL shine in the long-CoT RL scenario.

Four techniques, each with a stated job:

| # | Technique | The paper's stated purpose |
|---|---|---|
| 1 | **Clip-Higher** | Promotes the diversity of the system and avoids entropy collapse |
| 2 | **Dynamic Sampling** | Improves training efficiency and stability |
| 3 | **Token-Level Policy Gradient Loss** | Critical in long-CoT RL scenarios |
| 4 | **Overlong Reward Shaping** | Reduces reward noise and stabilizes training |

*Each of the four techniques targets a distinct long-CoT failure mode — the pairing is tabulated above and unpacked one per section in §§6–9.*

Two observations about this list before taking the techniques individually.

**The phrasing is "to make RL shine in the long-CoT RL scenario," not "to improve RL."** These are not four general-purpose enhancements that happen to have been tested on reasoning. Each is scoped to what goes wrong when the thing being optimized is a very long chain of thought, which is why a naïve implementation can be perfectly correct as an implementation of GRPO and still underperform.

**Stability appears twice.** Dynamic Sampling and Overlong Reward Shaping both name it, from different directions — one through the composition of the batch, the other through the reward signal. That is worth noticing because it says something about the failure being addressed: instability in long-CoT RL is not a single pathology with a single fix.

This section names the techniques and their purposes only. The mechanisms are Sections 6–9, one per technique.

### Clip-Higher

Stated purpose: **promotes the diversity of the system and avoids entropy collapse.** Full treatment in **Section 6**.

The name is also half of the algorithm's name — the "Decoupled Clip" in *Decoupled Clip and Dynamic sAmpling Policy Optimization*.

### Dynamic Sampling

Stated purpose: **improves training efficiency and stability.** Full treatment in **Section 7**.

This is the other half of the algorithm's name. That two of the four techniques are named in the method's own title is a reasonable signal of which two the authors consider structural rather than corrective.

### Token-Level Policy Gradient Loss

Stated purpose: **critical in long-CoT RL scenarios.** Full treatment in **Section 8**.

Note that this one is justified by the setting rather than by a named failure mode — the claim is about what long-CoT RL requires, not about a pathology being repaired.

### Overlong Reward Shaping

Stated purpose: **reduces reward noise and stabilizes training.** Full treatment in **Section 9**.

This one is an umbrella over two mechanisms rather than a single change, which is why the ablation in §12 lists *Overlong Filtering* and *Soft Overlong Punishment* as separate rows. §9 takes them in the order the paper introduces them.

---

## 6. Clip-Higher: Preventing Entropy Collapse

This is the technique the algorithm is half-named after, and it is the one whose mechanism is smallest relative to its effect. The entire change is that a single clipping parameter becomes two. What follows is why that matters.

### The exploration–exploitation problem in group sampling

Both PPO and GRPO work from a **group of responses to the same question**:

```text
Question: Solve this math problem

                 Q
                 │
       ┌─────────┼─────────┐
       ↓         ↓         ↓
      o₁        o₂        o₃ ... o₆₄
       │         │         │
       ↓         ↓         ↓
    reward     reward    reward
```

The algorithm reads those rewards and asks:

> Which tokens contributed to the better responses? Increase their probability.

That is **exploitation** — reinforcing what already worked. But an RL system also needs **exploration**:

> Maybe there is another token, or another reasoning path, that currently has low probability but could lead to a better solution.

Exploration is not a nicety here. The group is sampled *from the current policy*, so the policy's own distribution determines what the algorithm ever gets to see and reward. Anything the policy stops sampling is not merely under-explored — it becomes invisible to training.

### Entropy collapse

What DAPO observed running naïve GRPO is that the policy became progressively more deterministic:

```text
Training starts:

Response 1 → different reasoning
Response 2 → different reasoning
Response 3 → different reasoning
Response 4 → different reasoning
...

          ↓ training

Response 1 → almost identical
Response 2 → almost identical
Response 3 → almost identical
Response 4 → almost identical
...
```

That is **entropy collapse**. Low entropy means:

> The model's probability distribution is becoming concentrated around a small number of choices.

Sixty-four samples that are near-copies of one another cost the same compute as sixty-four diverse samples and carry a fraction of the information. The group stops being a set of alternatives to compare and becomes one answer repeated. Section 13 tracks entropy as a training-dynamics curve; this section is about why the curve falls.

### The importance-sampling ratio

The mechanism runs through PPO's ratio (§3):

$$
r_t(\theta)
=
\frac{\pi_\theta(o_t \mid q)}{\pi_{\theta_{\text{old}}}(o_t \mid q)}
$$

Read plainly, it asks: **how much did the probability of this action change?**

If the old policy gave a token probability $0.1$ and the new policy gives it $0.12$, then $r = 0.12/0.1 = 1.2$ — a 20% increase.

Note what the ratio is measuring: a **relative** change. It is dimensionless and scale-free. That property is the entire source of the problem below.

### Standard PPO clipping

With a single symmetric $\epsilon = 0.2$, the ratio is permitted to move only within:

$$
[1-\epsilon,\; 1+\epsilon] = [0.8,\; 1.2]
$$

```text
             PPO allowed region

       0.8                    1.2
        │──────────────────────│
        ↓                      ↓
    decrease               increase
```

This is doing its job: it prevents the policy from lurching away from the distribution its data was drawn from. It is a **stability** mechanism, and a well-motivated one.

DAPO's observation is that this same mechanism has a side effect:

> The upper clipping boundary can disproportionately hurt exploration.

### The asymmetry: same ratio, very different absolute room

Consider two tokens that both receive a **positive advantage** — the algorithm wants to increase both.

| | Old probability | Ratio bound | Permitted new probability |
|---|---|---|---|
| **Token A** — already very likely | $P(A) = 0.9$ | $\times 1.2$ | $0.9 \times 1.2 = 1.08$ |
| **Token B** — very unlikely | $P(B) = 0.01$ | $\times 1.2$ | $0.01 \times 1.2 = 0.012$ |

The multiplicative constraint is identical. The consequences are not.

For **Token A**, the bound is *non-binding in practice*. A ceiling of $1.08$ is above the maximum a probability can take, so the constraint never actually stops this token — it has room to run all the way toward $0.999$.

For **Token B**, the bound bites hard. The algorithm has just said *this token was useful, increase it*, and clipping replies: **you may go from 1% to 1.2%.** In absolute terms that is almost nothing. The token remains, for sampling purposes, as rare as it was.

> **On the number 1.08.** *(Our annotation.)* $0.9 \times 1.2 = 1.08$ is not a claim that the probability becomes $1.08$ — probabilities cannot exceed $1$. It is the *ratio bound evaluated at that starting point*, and the fact that it lands above $1$ is precisely the point: the constraint is inactive for already-dominant tokens while remaining tight for rare ones. The $P = 0.9$ side of this is the paper's own worked example; the $P = 0.01$ comparison is ours, added to put the two cases next to each other.

### Why this suppresses exploration

Put the asymmetry in the context of a reasoning decision:

```text
                 Reasoning choice
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
       Familiar path        New path
          90%                   1%
             │                   │
             │                   │
       well explored        barely explored
```

Suppose the new path happens to produce a very good solution. The algorithm wants to reinforce it. But:

```text
New path:

1% → maximum ~1.2%
```

while the already-dominant path faces no effective ceiling:

```text
Familiar path:

90% → potentially ~99.9%
```

The result is a rich-get-richer loop:

```text
High probability
      ↓
gets rewarded
      ↓
gets even higher probability
      ↓
sampled more frequently
      ↓
gets rewarded again
      ↓
even higher probability
      ↓
...
```

against a loop that cannot close:

```text
Low probability
      ↓
gets rewarded
      ↓
can only increase slightly
      ↓
still rarely sampled
      ↓
doesn't get much opportunity
      ↓
remains low probability
```

The second loop is the one to look at carefully. The rare token *was* rewarded — the algorithm did the right thing. It just cannot act on that finding fast enough to change how often the token is sampled, so the evidence has to be rediscovered from scratch next round, from an equally rare sample. Reinforcement that never reaches the sampling distribution is reinforcement that does not compound.

### The fix: decouple the bounds

Instead of one $\epsilon$ on both sides:

$$
[1-\epsilon,\; 1+\epsilon]
$$

DAPO splits them:

$$
[1-\varepsilon_{\text{low}},\; 1+\varepsilon_{\text{high}}]
$$

and **raises $\varepsilon_{\text{high}}$**, so that $\varepsilon_{\text{high}} > \varepsilon_{\text{low}}$:

```text
Standard PPO

       0.8              1.2
        │────────────────│
        ↓                ↓


Clip-Higher

       0.8                         1.5
        │───────────────────────────│
        ↓                           ↓
   lower bound                 higher upper bound
                                ↑
                         more room for
                         probability increases
```

The clipping is now **asymmetric**. Low-probability tokens receiving a positive advantage get more room to grow per update, which is exactly where the previous ceiling was doing the most damage.

This is the whole of "Decoupled Clip" in *Decoupled Clip and Dynamic sAmpling Policy Optimization*, and it is why Equation 8 in §4 carries two clipping parameters where GRPO carries one.

> **On the diagram's numbers.** The $1.5$ above is illustrative, chosen to make the widened upper bound visible. The values actually used are $\varepsilon_{\text{low}} = 0.2$ and $\varepsilon_{\text{high}} = 0.28$ (§12) — so the real upper bound is $1.28$, not $1.5$. The asymmetry is smaller than the figure suggests, and §13 explains why a small one is the right size.

### Why not raise ε_low as well?

If widening the upper bound helps, the symmetric question is why not widen the lower one too. The answer is that the two sides are not symmetric in what they do.

A token with a **negative** advantage, $\hat{A} < 0$, should have its probability *decreased*. Loosen the lower bound and that decrease can run away:

```text
Token probability

0.10
 │
 │
 ↓
0.03
 │
 ↓
0.005
 │
 ↓
0.0001
 │
 ↓
0
```

Once enough tokens have been pushed toward zero, the model's **sampling space itself has collapsed**. The policy has effectively decided:

> I will never consider these alternatives again.

Which is the same failure the technique was introduced to prevent, arrived at from the other direction. Raising $\varepsilon_{\text{high}}$ *adds* candidates to the sampled distribution; raising $\varepsilon_{\text{low}}$ would *remove* them. So $\varepsilon_{\text{low}}$ stays where it was.

The asymmetry in the fix mirrors the asymmetry in the problem: rare-and-promising needs room to rise, and rare needs protection from being eliminated before it can be tried.

> **Confirmed by the paper.** This is the authors' own stated reason. In §3.1 they write that they keep $\varepsilon_{\text{low}}$ as it is "because increasing it will suppress the probability of these tokens to 0, resulting in the collapse of the sampling space" — exactly the mechanism reconstructed above.

### The whole idea in one picture

The failure:

```text
                    PPO / GRPO
                        │
                        ▼
               Policy probability
                        │
              ┌─────────┴─────────┐
              │                   │
         High-probability     Low-probability
            tokens               tokens
              │                   │
              │                   │
        can increase easily   increase tightly bounded
              │                   │
              ▼                   ▼
        exploitation ↑       exploration ↓
                                  │
                                  ▼
                           Entropy collapse
                                  │
                                  ▼
                         Less diverse samples
```

The change:

```text
                    DAPO
                      │
                      ▼
             Asymmetric clipping
                      │
          ┌───────────┴───────────┐
          │                       │
    ε_low unchanged         ε_high increased
          │                       │
          ▼                       ▼
  Don't let bad tokens       Give promising
  collapse too aggressively  low-probability tokens
                             more room to grow
          │                       │
          └───────────┬───────────┘
                      ▼
               More exploration
                      │
                      ▼
               Higher entropy
                      │
                      ▼
              More diverse samples
```

### The deeper intuition

The interesting part of this result is that nothing was wrong with clipping. DAPO is not arguing that PPO's constraint is a mistake — it is arguing something narrower and more useful:

> The same symmetric clipping mechanism that stabilizes optimization can unintentionally suppress exploration when applied to language-model token probabilities.

The qualifier at the end carries the weight. Language models have an enormous action space — a vocabulary-sized distribution at every position — and in a distribution that large, most of the probability mass sits on a few tokens while the interesting alternatives sit far out in the tail. A constraint expressed as a *ratio* treats $P = 0.01$ and $P = 0.9$ identically. A constraint that mattered for *sampling* would not, because the absolute probability those two tokens can gain per update differs by two orders of magnitude.

Clipping was designed in settings where that gap is less consequential. Long-CoT language-model RL is a setting where it is, which is why this belongs to the paper's list of things needed "to make RL shine in the long-CoT RL scenario" (§5) rather than to a list of general improvements to PPO.

> **Engineering interpretation.** *(Ours, not the paper's.)* A stability constraint expressed in relative terms will always be weakest where the quantity is largest and strongest where it is smallest. If the thing you need to protect lives in the tail of the distribution, a relative constraint protects it least. Worth checking whenever a clipped or normalized update rule is applied to a very skewed distribution.

### Section 6, compressed

> **Clip-Higher relaxes PPO's upper clipping bound so that low-probability but potentially valuable tokens have more room to increase, improving exploration and preventing entropy collapse, while keeping the lower clipping bound unchanged to avoid collapsing the sampling space.**

The paper's own name for this move is **"Raise the Ceiling."** In the cumulative ablation (§12) it is the third component added, taking AIME 2024 from 36% to 38% `avg@32`.

---

## 7. Dynamic Sampling: Maintaining Effective Training Signals

Dynamic Sampling solves a problem entirely unrelated to the one in §6. It is worth stating the contrast in one line before starting, because the two techniques are easy to blur together:

| Technique | What it is asking for |
|---|---|
| **Clip-Higher** (§6) | Give the model enough freedom to explore. |
| **Dynamic Sampling** (§7) | Make sure every training batch contains enough prompts that actually produce a learning signal. |

The issue lives in **GRPO's group-relative advantage** — the same expression that appeared in Equation 8 (§4).

### How GRPO gets its learning signal

For one prompt $q$, GRPO generates a group of $G$ responses and scores each:

```text
Question q
   │
   ├── Response 1 → reward = 1
   ├── Response 2 → reward = 1
   ├── Response 3 → reward = 1
   ├── Response 4 → reward = 1
   └── Response 5 → reward = 1
```

Suppose all five are correct. The advantage is computed *relative to the group*:

$$
\hat A_i =
\frac{r_i-\operatorname{mean}(r)}
{\operatorname{std}(r)}
$$

With $r_1=r_2=r_3=r_4=r_5=1$ we get $\operatorname{mean}(r)=1$, so

$$
r_i-\operatorname{mean}(r)=0
$$

for **every** response, and therefore $\hat A_i = 0$ throughout the group.

### Zero advantage means zero learning signal

The policy-gradient contribution for a response is roughly

$$
\hat A_i\,\nabla_\theta\log\pi_\theta(o_i \mid q)
$$

so with $\hat A_i = 0$:

$$
0\cdot\nabla_\theta\log\pi_\theta(o_i \mid q)=0
$$

The prompt contributes essentially **nothing to the policy gradient**. The rollouts were generated, the rewards were computed, the tokens were scored — and the update sees none of it.

This is what the paper calls the **gradient-decreasing problem**.

### There are two useless cases, not one

DAPO filters both, and it is worth seeing that they are the *same* failure arrived at from opposite ends.

**Case A — accuracy = 1.** Every response is correct:

```text
Prompt A

Response 1 → ✓
Response 2 → ✓
Response 3 → ✓
Response 4 → ✓
Response 5 → ✓
...
Response G → ✓

Accuracy = 1
```

All rewards identical, so $\hat A_i = 0$. No useful relative signal.

**Case B — accuracy = 0.** Every response is wrong:

```text
Prompt B

Response 1 → ✗
Response 2 → ✗
Response 3 → ✗
Response 4 → ✗
Response 5 → ✗
...
Response G → ✗

Accuracy = 0
```

Again every response receives the same reward, so there is no relative distinction between them, and again the group provides no useful advantage signal.

Note that Case B is not "the model failed, so there is nothing to learn." There may well be a great deal to learn — some of those five wrong answers were probably closer than others. But *group-relative* advantage cannot see it, because it only ever measures responses against their own group's mean. A signal the estimator cannot express is a signal the update does not receive.

### The sweet spot is 0 < accuracy < 1

Suppose eight responses:

```text
Prompt C

Response 1 → ✓
Response 2 → ✓
Response 3 → ✓
Response 4 → ✗
Response 5 → ✗
Response 6 → ✗
Response 7 → ✗
Response 8 → ✗
```

Now $\text{accuracy} = 3/8 = 0.375$. The rewards vary, so GRPO can say:

> These responses were successful; increase their probability relative to these unsuccessful ones.

That is a useful gradient. In summary:

```text
Accuracy = 0
     ↓
No differentiation
     ↓
Weak/zero learning signal


0 < Accuracy < 1
     ↓
Correct vs incorrect responses
     ↓
Useful relative signal


Accuracy = 1
     ↓
No differentiation
     ↓
Weak/zero learning signal
```

This is the core of Dynamic Sampling.

### The observation that makes it a moving target

Early in RL training, many prompts are hard for the model, and the accuracy distribution is spread out:

```text
Prompt 1 → 0% correct
Prompt 2 → 25% correct
Prompt 3 → 50% correct
Prompt 4 → 12.5% correct
Prompt 5 → 37.5% correct
```

Plenty of useful learning signal. But the model improves — which is the point — and as it does:

```text
Prompt 1 → 100%
Prompt 2 → 100%
Prompt 3 → 75%
Prompt 4 → 100%
Prompt 5 → 87.5%
```

More and more prompts reach $\text{accuracy}=1$ and stop contributing.

This is the uncomfortable shape of the problem: **training success is what causes it.** The dataset is not degrading and nothing has gone wrong with the optimizer. The prompts are being solved, and a solved prompt is a dead prompt under group-relative advantage. Left alone, the failure mode gets worse monotonically for exactly as long as training works.

### What that does to a batch

Take a batch of 64 prompts. Initially:

```text
64 prompts

████████████████████████████████████████████████████████████
Mostly useful prompts
```

Later:

```text
64 prompts

40 prompts → accuracy = 1  ❌
10 prompts → accuracy = 0  ❌
14 prompts → 0 < accuracy < 1  ✓
```

The batch still contains 64 prompts. Only 14 of them produce useful learning signal. This is what the paper means by:

> the effective number of prompts in each batch keeps decreasing

Your nominal batch size has not changed. Your **effective gradient-producing batch size** has — and nothing in the training logs is obliged to tell you, because batch size is a constant you configured.

### Why that increases gradient noise

If 64 prompts are useful, the gradient is roughly an average over 64 learning signals. If 14 are useful, you are estimating the same gradient from 14. Smaller effective sample size, larger variance:

```text
64 useful prompts
       ↓
many independent signals
       ↓
stable gradient


14 useful prompts
       ↓
fewer signals
       ↓
noisier gradient
       ↓
training instability
```

So the goal is to keep the **effective number of prompts approximately constant** — which is a different and more precise goal than keeping the batch size constant.

### The technique

The obvious response is:

> Just throw away prompts with accuracy 0 or 1.

But discarding them from a fixed batch leaves a smaller batch, which is the problem you were trying to fix. DAPO instead says:

> **If a sampled prompt gives no useful gradient, don't count it toward the batch. Keep sampling additional prompts until the batch has enough useful prompts.**

The batch is defined by how many *useful* prompts it contains, not by how many prompts were drawn to find them.

### Worked through

Target: a batch containing 64 useful prompts. Sample and score:

```text
Sampled prompts:

Prompt 1 → accuracy 0.5    ✓
Prompt 2 → accuracy 0.25   ✓
Prompt 3 → accuracy 1      ✗
Prompt 4 → accuracy 0      ✗
Prompt 5 → accuracy 0.75   ✓
Prompt 6 → accuracy 1      ✗
Prompt 7 → accuracy 0.5    ✓
...
```

Keep $0 < \text{accuracy} < 1$; reject $\text{accuracy} = 0$ and $\text{accuracy} = 1$. Then keep going until the batch is full:

```text
       Sample prompts
             │
             ▼
      Generate G outputs
             │
             ▼
     Calculate accuracy
             │
       ┌─────┴─────┐
       │           │
   0 or 1      0 < acc < 1
       │           │
       ▼           ▼
     Reject       Keep
                   │
                   ▼
          Enough useful prompts?
              │          │
             No         Yes
              │          │
              └──→      ▼
                   Build batch
```

Note where the accept/reject decision sits: **after** generating $G$ outputs. You cannot know a prompt's group accuracy without paying for its rollouts, so a rejected prompt is not a prompt you skipped — it is a prompt you generated in full and then threw away. The sampling cost is therefore **dynamic**, and that cost is real.

### Why "dynamic"

Because how many prompts you must draw depends on how many useful ones you happen to hit.

Early in training:

```text
Most prompts useful

64 needed
↓
maybe sample ~70
```

Later in training:

```text
Many prompts have accuracy = 1

64 useful prompts needed
↓
might need to sample 100
↓
or 150
↓
or even more
```

The amount of sampling adapts to the model's current capability. That is a genuine trade: constant *gradient quality* is bought with variable, and rising, *rollout cost*. §5 lists this technique's purpose as improving training efficiency **and** stability; the efficiency being improved is efficiency per gradient step, not per generated token.

> **On that cost.** The authors report that although Dynamic Sampling requires more sampling instances, overall training time is not significantly affected, and convergence can be *faster* because fewer training steps are needed (§12). The extra rollouts buy back their own cost in steps — though what is reported is aggregate time, not the per-step variance, which §16 picks up.

### Reframed as a filter

The normal approach:

```text
Dataset
   ↓
Sample fixed batch
   ↓
Train
```

DAPO:

```text
Dataset
   ↓
Sample prompt
   ↓
Generate G responses
   ↓
Calculate group accuracy
   ↓
┌──────────────────────┐
│ Is 0 < accuracy < 1? │
└──────────┬───────────┘
           │
      ┌────┴────┐
      │         │
     YES        NO
      │         │
      ▼         ▼
    Keep      Discard
      │         │
      │         └──────→ Sample another prompt
      │
      ▼
Batch full?
      │
   ┌──┴──┐
  No    Yes
   │      │
   ↓      ↓
Sample   Train
again
```

### This is the `s.t.` line in Equation 8

§4 recorded a constraint attached to the objective without fully explaining it. It is this technique:

$$
\boxed{0 < |\{o_i\mid \mathrm{is\_equivalent}(a,o_i)\}| < G}
$$

Read it as: **among the $G$ generated responses, at least one must be correct and at least one must be incorrect.** Equivalently:

$$
0 < \text{number of correct responses} < G
$$

$$
0 < \text{group accuracy} < 1
$$

Which is a nice property of the formulation — Dynamic Sampling is not a separate preprocessing script bolted onto the training loop. It is a constraint on which groups are admissible to the objective at all, stated in the objective itself.

### Two techniques, two failure modes

```text
Entropy collapse
      ↓
Clip-Higher
      ↓
More exploration
      ↓
More diverse responses
```

```text
Gradient decreasing
      ↓
Dynamic Sampling
      ↓
More useful prompts
      ↓
More consistent gradient signal
```

And the full map of the four, which is now half-populated:

| DAPO technique | Problem |
|---|---|
| **Clip-Higher** | Entropy collapse / insufficient exploration |
| **Dynamic Sampling** | Too many zero-gradient prompts |
| **Token-Level Policy Gradient Loss** | Inefficient sequence-level weighting |
| **Overlong Reward Shaping** | Long responses / reward discontinuity |

### Section 7, compressed

> **GRPO learns from differences between responses within a group. If every response is correct — or every response is wrong — there is no difference to learn from. Dynamic Sampling keeps drawing prompts until the batch contains prompts where some responses succeed and others fail, maintaining a strong and consistent learning signal.**

---

## 8. Token-Level Policy Gradient Loss

This one is often mistaken for something deeper than it is. It is not a new trust region, not a replacement for PPO-style optimization, and not TRPO — a point worth settling explicitly, and one this section returns to at the end. What changes is **how the policy-gradient loss is averaged across tokens and samples**.

The clearest way in is to set the clipping aside entirely for a moment and look only at the aggregation.

### What standard GRPO does

Two generated responses:

```text
Response A: 100 tokens
Response B: 10 tokens
```

GRPO's original sample-level loss proceeds in two steps.

**Step 1 — average the token losses inside each response:**

```text
Response A:
token losses
↓
average over 100 tokens
↓
Loss_A

Response B:
token losses
↓
average over 10 tokens
↓
Loss_B
```

**Step 2 — average across samples:**

$$
L = \frac{L_A+L_B}{2}
$$

So **each response gets equal weight, regardless of length**. This is what the paper means by:

> each sample is assigned an equal weight in the final loss computation.

### Why that is a problem for long-CoT

Take a starker version:

```text
Response A = 1,000 tokens
Response B = 100 tokens
```

Both receive one sample's worth of weight:

```text
A → 1/2 of loss
B → 1/2 of loss
```

even though A contains **10× as many tokens**. Each individual token in A therefore has roughly a tenth of the influence on the gradient that each token in B has. Roughly:

```text
Sample-level averaging

1000-token response
┌──────────────────────────────────────────────┐
│ t t t t t t t t t t t t ...                 │
└──────────────────────────────────────────────┘
              ↓
       entire sample = 1 weight


100-token response
┌──────────────────────┐
│ t t t t t ...        │
└──────────────────────┘
              ↓
       entire sample = 1 weight
```

The **whole response** gets one vote — and the per-token dilution is inversely proportional to length, which in long-CoT RL is precisely the regime where responses vary in length by an order of magnitude or more (§1).

### What DAPO changes

> **Don't give every response exactly one vote. Give every token a vote.**

Instead of

$$
\frac{1}{G}\sum_i
\left(
\frac{1}{|o_i|}
\sum_t L_{i,t}
\right)
$$

the aggregation becomes token-level:

$$
\frac{
\sum_i\sum_t L_{i,t}
}{
\sum_i |o_i|
}
$$

Conceptually:

```text
Old GRPO:

Response A → average its tokens → 1 sample weight
Response B → average its tokens → 1 sample weight


DAPO:

Token 1  → weight
Token 2  → weight
Token 3  → weight
...
Token N  → weight
```

A longer response contributes more total gradient because it contains more tokens.

This is the $\frac{1}{\sum_{i=1}^{G}|o_i|}$ prefactor in Equation 8 (§4). The denominator is the total token count across the group rather than the group size, and the inner per-response $\frac{1}{|o_i|}$ is gone. Those two edits *are* the technique — which is why §4 could note that this technique appears in the objective as a normalizer choice rather than as a new term.

### Why that helps: the good long trajectory

Consider a genuinely good long reasoning trace:

```text
Question
  ↓
Understand problem
  ↓
Generate hypothesis
  ↓
Try approach A
  ↓
Reject A
  ↓
Try approach B
  ↓
Derive equation
  ↓
Verify
  ↓
Answer
```

Perhaps 1,000 tokens. Under sample-level averaging that entire trajectory carries about the same total weight as a 100-token one. DAPO's position:

> If this long trajectory contains 1,000 useful token-level decisions, those decisions shouldn't collectively be diluted simply because we normalized the trajectory down to one sample.

So the long trajectory can have proportionally more influence on the gradient.

### The other side, which is the more interesting one

Suppose a long response is bad:

```text
Reasoning
 ↓
gibberish
 ↓
repetition
 ↓
gibberish
 ↓
repetition
 ↓
...
 ↓
10,000 tokens
```

Under sample-level averaging, this 10,000-token response is still **one sample**. Its bad tokens are averaged down among themselves and the whole thing lands with a single sample's weight. The pathology is *cheap*: producing 10,000 tokens of repetition costs the model almost nothing in gradient terms, no matter how much it costs in compute.

Token-level aggregation removes that discount. Undesirable token-level behavior is not diluted by belonging to a long response, so if the advantage says the behavior should be suppressed, those tokens contribute to the gradient in proportion to how many of them there are.

Worth pausing on the direction of that. It would be easy to read this technique as "reward long reasoning more," and half of it does read that way. But the sharper consequence is the opposite: **length stops being a shield.** Degenerate repetition is the specific long-CoT failure mode that sample-level averaging is structurally unable to punish at scale, because the longer the degeneration runs, the less each token of it matters.

### The paper's sentence

> if a particular generation pattern can lead to an increase or decrease in reward, it will be equally prompted or suppressed, regardless of the length of the response in which it appears.

So if a token-level behavior like

```text
"Let's reconsider..."
```

is consistently associated with useful reasoning, it should be reinforced whether it appeared in a 100-token response or a 2,000-token one. And if

```text
"blah blah blah..."
```

is associated with low-quality repetitive reasoning, it should be suppressed either way. The unit of credit assignment is the pattern, not the response that happened to contain it.

### Why this is not TRPO

The name invites the confusion, so: **TRPO — Trust Region Policy Optimization — is a different algorithm.** Its core idea is

> don't let the new policy move too far from the old policy,

enforced through an explicit constraint, typically a KL-divergence trust region. PPO was introduced largely as a more practical approximation of that idea.

DAPO is not replacing PPO with TRPO. Look again at what sits inside Equation 8:

$$
\min\left(
r_{i,t}(\theta)\hat A_{i,t},\;
\operatorname{clip}\big(r_{i,t}(\theta),1-\varepsilon_{\text{low}},1+\varepsilon_{\text{high}}\big)
\hat A_{i,t}
\right)
$$

That is still fundamentally PPO/GRPO-style clipped policy optimization. The trust-region-ish machinery is the clipping, it is inherited, and §6 modifies its bounds without changing its nature. This technique changes something else entirely: the **loss reduction and aggregation strategy**.

> **Engineering interpretation.** *(Ours, not the paper's.)* Normalization choices are easy to read as bookkeeping and hard to read as design. This one is a policy decision about credit assignment wearing the costume of a denominator. When reviewing a loss function, it is worth asking of every mean: *mean over what, and what does that make cheap?*

### Three techniques, three distinct problems

**Clip-Higher** changes *how far token probabilities can move*:

```text
PPO clipping
     ↓
Relax upper clip
     ↓
More exploration
     ↓
Prevent entropy collapse
```

**Dynamic Sampling** changes *which prompts enter the effective batch*:

```text
Sample prompts
     ↓
accuracy = 0 or 1?
     ↓
discard
     ↓
keep sampling
     ↓
0 < accuracy < 1
     ↓
consistent gradient signal
```

**Token-Level Policy Gradient Loss** changes *how the gradient is aggregated*:

```text
Old GRPO:

tokens → average per sample → samples averaged


DAPO:

tokens → directly aggregated
             ↓
longer responses have more influence
             ↓
individual generation patterns
are reinforced/suppressed directly
```

Three different layers of the same loop: the update rule, the batch, and the loss reduction. None of them substitutes for another, which is the structural reason DAPO is a list of four techniques rather than one idea with three corollaries.

### Section 8, compressed

Ordinary GRPO:

> **Every response gets one vote.**

DAPO's token-level loss:

> **Every token gets a vote.**

> **TRPO is about constraining the policy update / trust region; DAPO's token-level loss is about changing the granularity of the policy-gradient loss from sample-level averaging to token-level aggregation.**

In the cumulative ablation (§12) this is the fourth component added, taking AIME 2024 from 41% to 42% `avg@32` — the smallest increment in the table, and a reminder that the size of a mechanism's conceptual footprint and the size of its measured contribution are separate things.

---

## 9. Overlong Reward Shaping

This technique addresses a problem that only exists because the setting is long chain-of-thought RL. The question it answers:

> **What happens when the model's reasoning is good, but it simply runs out of the allowed token budget?**

DAPO's observation is that the naïve answer creates **reward noise**.

### The truncation problem

Suppose the maximum generation length is

$$
L_{\max}=16{,}384
$$

The model works through a hard problem:

```text
Problem
  ↓
Reasoning
  ↓
Derivation
  ↓
Check
  ↓
Try another approach
  ↓
More reasoning
  ↓
...
```

and then hits the wall:

```text
                 16,384 tokens
                      │
                      ▼
                  TRUNCATED
                      │
                      ▼
                 No final answer
```

There is no answer to check, so the response gets a **punitive reward**. But the reasoning may have been perfectly sound. It was just too long. The paper is explicit that penalizing such a sample can confuse the model about whether its reasoning itself was valid.

### Why this counts as noise rather than harshness

Two responses:

**Response A**

```text
Good reasoning
Good reasoning
Good reasoning
Correct answer
```

→ reward **+1**

**Response B**

```text
Good reasoning
Good reasoning
Good reasoning
Good reasoning
...
[still reasoning]
[maximum length reached]
```

→ potentially **−1 because truncated**

What the RL system sees:

```text
Good reasoning → +1
Good reasoning → -1
```

Two nearly identical reasoning processes receiving opposite rewards, where the only difference may be:

> one response finished within the token budget and the other didn't.

That is **reward noise** in the precise sense — not a reward that is too strict, but a reward whose value is partly determined by something other than the quality being scored. And it is worse than random noise, because it is *correlated with length*, which is exactly the dimension the model is being pushed to expand.

### First attempt: Overlong Filtering

The direct fix is to remove truncated samples from the loss entirely:

```text
Generate response
      │
      ▼
Did it exceed max length?
      │
   ┌──┴──┐
   │     │
  No    Yes
   │     │
   ▼     ▼
 Train   Mask its loss
         / don't train on it
```

The paper reports that this significantly stabilizes training and improves performance — and the ablation in §12 bears that out, as the single largest step in the table before the final one.

But it has a cost. Ignoring every overlong response throws away the information that **the model is becoming excessively long**. The signal is not merely noisy; it is also carrying something true that you now cannot see. Masking makes length invisible rather than manageable.

### Second attempt: Soft Overlong Punishment

Instead of a cliff:

```text
Short enough → reward 0
Too long     → reward -1
```

a gradient:

```text
                     Response length
                          →
       Normal             Warning          Too long
          │                  │                 │
          │                  │                 │
Penalty   0 ─────────────────┐                 │
                             │                 │
                             └───────→         │
                                  gradual      │
                                  penalty      -1
```

The paper defines a **soft punishment interval** between

$$
L_{\max}-L_{\text{cache}}
$$

and

$$
L_{\max}
$$

Inside that interval the penalty grows with length; past $L_{\max}$ it reaches $-1$.

### The actual numbers

The training setup uses

$$
L_{\max}=16{,}384
\qquad
L_{\text{cache}}=4{,}096
$$

so generation may run to $20{,}480$ tokens:

```text
0 ───────────────── 12,288 ───────────── 16,384 ───── 20,480
                     │                    │              │
                     │                    │              │
                  No penalty        Soft penalty      -1
                                      increases
                                      gradually
```

Which gives three regimes:

```text
Length ≤ 12,288
       ↓
No length penalty


12,288 < Length ≤ 16,384
       ↓
Increasing penalty


Length > 16,384
       ↓
Maximum penalty = -1
```

The formula in the paper implements exactly this behavior.

Note that $L_{\text{cache}}$ is doing double duty. It sets the width of the soft interval *and* it buys $4{,}096$ tokens of headroom past $L_{\max}$ — the model is permitted to keep generating into a region where it is being penalized. That is deliberate: the penalty is only informative if responses actually enter the interval and finish there.

### Why the gradual version is better

The model now receives a smooth signal:

```text
12,000 tokens → no penalty
13,000 tokens → small penalty
14,000 tokens → larger penalty
15,000 tokens → larger penalty
16,000 tokens → strong penalty
>16,384       → -1
```

instead of:

```text
16,383 tokens → fine
16,384 tokens → suddenly terrible
```

That is the whole idea. A discontinuity at $L_{\max}$ is not a property of the task — nothing about the mathematics changes at token 16,384 — it is an artifact of the serving configuration. Reward shaping converts an infrastructure boundary into a graded preference for brevity, which is a thing the model can actually learn.

> **Overlong Reward Shaping turns an abrupt truncation penalty into a length-aware, gradual signal that discourages unnecessarily long responses while reducing the reward noise caused by simply penalizing every truncated trajectory.**

### The two names, resolved

§5 lists one technique called Overlong Reward Shaping while the §12 ablation lists *Overlong Filtering* and *Soft Overlong Punishment* as separate rows. The relationship is now clear: they are two mechanisms addressing the same failure, introduced in sequence, and the ablation adds them at different points:

```text
Naive GRPO              30
+ Overlong Filtering    36
+ Clip-Higher           38
+ Soft Overlong         41
+ Token-Level Loss      42
+ Dynamic Sampling      50
```

AIME `avg@32` throughout. Overlong Filtering contributes the +6 and Soft Overlong Punishment the +3 — the two largest steps other than the last. Between them, handling long responses well accounts for more of DAPO's gain than either of the two techniques in the algorithm's name.

---

## 10. Dataset Transformation

Considerably simpler than §§6–9, and different in kind. The problem:

> **Rule-based reward requires reliably determining whether the model's answer matches the ground-truth answer.**

DAPO's reward is rule-based (§3):

```text
Model answer
     │
     ▼
is_equivalent(predicted, ground_truth)
     │
   ┌─┴─┐
   │   │
 correct wrong
   │   │
  +1  -1
```

The paper uses the final accuracy of a verifiable task as the reward. The difficulty is that mathematical answers come in messy formats. The same value might appear as

```text
42
```

or

```text
6 × 7
```

or as an expression, or a formula involving radicals or fractions. Writing a parser that recognizes every valid representation of every answer is hard — and, importantly, hard in an open-ended way, since the space of representations is not bounded by anything you control.

### Making Rewards Verifiable

DAPO's move is to change the dataset rather than the parser:

> **Transform the questions so that the expected answer is an integer.**

Instead of

```text
Solve this problem.

Expected answer:
complicated expression
```

the question is modified so the expected output is something like

```text
123
```

and the reward check collapses to

```text
prediction == 123 ?
```

No equivalence reasoning required.

### Why this matters more than it looks

Recall the loop:

```text
Question
   ↓
LLM generates answer
   ↓
Reward
   ↓
Policy update
```

A parser failure is not a small inaccuracy. It is:

```text
Correct answer
   ↓
Parser fails
   ↓
Reward = -1
   ↓
Model gets punished
```

The model is being trained to avoid a behavior that was correct. Every RL technique in §§6–9 assumes the reward tells the truth; this section is what makes that assumption hold. A verifier bug is not noise around a correct signal — it is an incorrect signal delivered with full confidence, and the optimizer has no way to distinguish the two.

### DAPO-Math-17K

The resulting dataset:

$$
\boxed{\text{DAPO-Math-17K}}
$$

roughly **17K prompts**, each paired with an integer answer. It is one of the three artifacts released with the paper (Introduction), alongside the algorithm and the training code.

### How §9 and §10 differ

| Section | Problem | Solution |
|---|---|---|
| **§9 Overlong Reward Shaping** | Long-CoT responses can hit the token limit and create noisy/abrupt rewards | Gradually penalize excessive length |
| **§10 Dataset Transformation** | Mathematical answers can be difficult to parse reliably | Transform questions so answers are integers and easy to verify |

And the whole picture:

```text
                     DAPO
                      │
       ┌──────────────┼───────────────┐
       │              │               │
       ▼              ▼               ▼
 Clip-Higher     Dynamic Sampling   Token-Level Loss
       │              │               │
 entropy          useful prompts    better long-CoT
 collapse         / gradients        weighting
       │              │               │
       └──────────────┼───────────────┘
                      │
                      ▼
              Overlong Reward Shaping
                      │
                 reward noise
                      │
                      ▼
                Stable RL training
                      │
                      ▼
              Dataset Transformation
                      │
                reliable rewards
                      │
                      ▼
                DAPO-Math-17K
```

One thing to be clear about: **Dataset Transformation is not another optimization trick.** It is a data and reward-engineering decision that makes the rule-based reward reliable. It sits outside the four techniques of §5 for that reason, and it belongs to the paper's self-description as a *system* — algorithmic techniques plus training code plus dataset — rather than as an algorithm.

---

## 11. The DAPO Training System

Sections 6–10 each described one change. This section puts them in order, because the changes do not all act at the same point in the loop and the distinction matters for anyone implementing them. Three of the four techniques touch three different stages, and one of them changes the loop's control flow rather than its arithmetic.

The implementation is built on **verl**.

*The end-to-end loop — rollout → reward → dynamic sampling → advantage → policy update — is drawn in full below.*

### Rollout

Sample a batch of prompts from DAPO-Math-17K and generate $G$ responses per prompt from $\pi_{\theta_{\text{old}}}$. Generation runs up to the length cap discussed in §9 — $L_{\max}$ plus the $L_{\text{cache}}$ headroom, so responses may finish inside the soft-penalty interval rather than being cut off at $L_{\max}$.

Nothing DAPO-specific happens to the sampling itself. What is DAPO-specific is that this stage may run **more than once per training step**, which is the subject of the Dynamic Sampling stage below.

### Reward Computation

Each response is scored by the rule-based verifier of §10: extract the answer, compare it against the ground-truth integer, assign correct/incorrect. The length-based term from §9 is applied here too — a response that ran into the soft interval carries its length penalty in $R_i$.

This is the stage where §10's dataset design pays off. The verifier is an integer comparison, so it is fast, deterministic, and has no failure mode that produces a confidently wrong reward.

### Dynamic Sampling

The group's accuracy is now known, so the admission test of §7 can be applied:

- if $0 < \text{accuracy} < 1$, the prompt joins the batch;
- if accuracy is $0$ or $1$, the prompt is discarded and another is sampled.

Repeat until the batch holds the target number of *useful* prompts.

Two implementation consequences. First, this stage sits **after** rollout and reward, so a rejected prompt has already cost a full set of generations — the loop is a resampling loop, not a filter applied to cheap metadata. Second, this is the only one of the four techniques that changes control flow rather than a formula, which is why it is the one that shows up in the objective as a constraint (`s.t.`) rather than as a term.

### Advantage Computation

For each admitted group, compute the group-relative advantage:

$$
\hat A_{i,t}
=
\frac{R_i-\operatorname{mean}(\{R_i\}_{i=1}^{G})}{\operatorname{std}(\{R_i\}_{i=1}^{G})}
$$

No value network is trained; the group's own reward statistics play that role. Note again that $\hat A_{i,t}$ is constant across $t$ — every token of a response carries its response's advantage.

The admission test above is what keeps this expression well-behaved. A group with identical rewards would have a zero numerator throughout, and a zero standard deviation in the denominator.

### Policy Optimization

Apply Equation 8 (§4): per-token ratios against $\pi_{\theta_{\text{old}}}$, the asymmetric clip $[1-\varepsilon_{\text{low}},\,1+\varepsilon_{\text{high}}]$ from §6, and the token-level normalizer $\frac{1}{\sum_i |o_i|}$ from §8. No KL penalty term.

### End-to-End Training Loop

```text
                 ┌──────────────────────────────┐
                 │   DAPO-Math-17K (§10)        │
                 └──────────────┬───────────────┘
                                │ sample prompts
                                ▼
                 ┌──────────────────────────────┐
                 │   ROLLOUT                    │
                 │   G responses per prompt     │
                 │   up to L_max + L_cache      │
                 └──────────────┬───────────────┘
                                ▼
                 ┌──────────────────────────────┐
                 │   REWARD  (§9, §10)          │
                 │   integer-match verifier     │
                 │   + soft length penalty      │
                 └──────────────┬───────────────┘
                                ▼
                 ┌──────────────────────────────┐
                 │   DYNAMIC SAMPLING (§7)      │
                 │   keep 0 < accuracy < 1      │
                 └──────┬───────────────┬───────┘
                        │               │
              batch not full        batch full
                        │               │
        resample ◀──────┘               ▼
        (new prompts)    ┌──────────────────────────────┐
                         │   ADVANTAGE                  │
                         │   group-relative, no critic  │
                         └──────────────┬───────────────┘
                                        ▼
                         ┌──────────────────────────────┐
                         │   POLICY UPDATE (§4, §6, §8) │
                         │   asymmetric clip            │
                         │   token-level normalization  │
                         │   no KL term                 │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                                  π_θ becomes π_θ_old
                                  next step
```

Where each technique acts:

| Stage | Technique | What it changes |
|---|---|---|
| Reward | Overlong Reward Shaping (§9) | the value of $R_i$ for long responses |
| Batch construction | Dynamic Sampling (§7) | which groups are admitted, and the loop's control flow |
| Policy update | Clip-Higher (§6) | the clipping bounds |
| Policy update | Token-Level Policy Gradient Loss (§8) | the loss normalizer |
| Dataset | Dataset Transformation (§10) | the verifier's reliability |

> **Engineering interpretation.** *(Ours, not the paper's.)* The techniques are separable in implementation, and the ablation (§12) confirms they were in fact added one at a time. That is worth knowing before adopting any of them: none of the four requires the others to be present, so they can be introduced incrementally into an existing GRPO loop and evaluated independently. The one with real infrastructure implications is Dynamic Sampling, because variable rollout volume per step affects capacity planning in a way the other three do not.

---

## 12. Experiments

### Experimental Setup

DAPO trains **Qwen2.5-32B Base** with RL on mathematical reasoning, implemented in the **verl** framework. The baseline it is measured against is **naïve GRPO with group reward normalization** — the same base model, the same task, the same framework, without the four techniques.

That last point is what makes the ablation in this section interpretable. The comparison is not DAPO against a different lab's pipeline; it is DAPO against its own starting configuration, with the components added one at a time.

### Model and Training Configuration

| Setting | Value |
|---|---|
| Base model | Qwen2.5-32B Base |
| Framework | verl |
| Prompt batch size | 512 |
| Responses per prompt | 16 |
| Mini-batch size | 512 |
| Learning rate | $1\times10^{-6}$ |
| Optimizer | AdamW |
| Warm-up | 20 rollout steps, linear |
| Maximum generation length | 20,480 tokens |
| $\varepsilon_{\text{low}}$ | 0.2 |
| $\varepsilon_{\text{high}}$ | 0.28 |
| Evaluation | AIME 2024, `avg@32` |

Three of these are worth reading against the earlier sections.

**$\varepsilon_{\text{low}} = 0.2$, $\varepsilon_{\text{high}} = 0.28$.** This is Clip-Higher (§6) in numbers, and the size of it is instructive. The lower bound is standard PPO's value, untouched, exactly as §6 argued it should be. The upper bound is raised by $0.08$ — enough to widen the allowed ratio from $1.2$ to $1.28$, and no more. The technique that §6 described as structurally important is, numerically, a small asymmetry.

**Maximum generation 20,480 tokens.** This is $L_{\max} = 16{,}384$ plus $L_{\text{cache}} = 4{,}096$ from §9. The generation cap and the penalty threshold are deliberately different numbers.

**16 responses per prompt** is the $G$ in every group-relative expression in this post — and the population over which Dynamic Sampling's accuracy test is evaluated. A group of 16 all-correct or all-incorrect responses is what gets discarded.

### AIME 2024

The benchmark needs unpacking, because "50 points on AIME 2024" does not mean what it appears to mean.

**What AIME is.** A mathematics competition whose answers are integers from **000 to 999**. The real contest has **15 problems**, and the traditional score is essentially the number answered correctly — a score from **0 to 15**.

**What the paper reports instead.** Not that. DAPO evaluates on AIME 2024 using **32 independent generations per problem**:

```text
                AIME Problem
                     │
          ┌──────────┼──────────┐
          ↓          ↓          ↓
       Sample 1   Sample 2   ... Sample 32
          │          │             │
        Wrong      Correct       Wrong
          │          │             │
          └──────────┴─────────────┘
                     │
              calculate accuracy
```

For a problem where the model gets 16 of 32 attempts right:

```text
32 attempts
│
├── 16 correct
└── 16 incorrect

      ↓

16 / 32 = 50% accuracy
```

Averaged over the evaluation set, this is the paper's **`avg@32`** metric. Sampling uses **temperature 1.0 and top-p 0.7**.

So the translation is:

> **"50 points on AIME 2024" means 50% `avg@32` accuracy** — across 32 sampled solutions per problem, the model's solutions are correct on average 50% of the time.

**Why 32 samples.** Because reasoning models are stochastic, and a single attempt does not distinguish "cannot solve this" from "did not solve it this time." Ask once and get a wrong answer:

```text
Problem
   ↓
Model
   ↓
Wrong
```

Sample again and the trajectory differs:

```text
Problem
   ↓
Model
   ↓
Different reasoning trajectory
   ↓
Correct
```

So the metric measures how *reliably* the model reaches the answer, not whether it ever can:

```text
Problem #1

Sample 1  → Wrong
Sample 2  → Correct
Sample 3  → Wrong
...
Sample 32 → Correct

             ↓

18 / 32 correct

             ↓

56.25% accuracy
```

**The distinction that matters.** Traditional contest scoring:

```text
15 problems
↓
7 correct
↓
AIME score = 7/15
```

versus the metric in use here:

```text
AIME problems
      ↓
32 sampled solutions/problem
      ↓
correct / incorrect
      ↓
average accuracy
      ↓
avg@32 = 50%
```

> **`avg@32` is not `pass@32`, and not majority-vote / `cons@32`.** It is the *average* correctness across the 32 attempts. `pass@32` would ask whether *any* of the 32 succeeded — a far more permissive question — and a consensus metric would aggregate the 32 into one voted answer before scoring. A model that solves a problem once in 32 tries scores 1/32 under `avg@32` and 100% under `pass@32`. The paper tracks other sampling-based metrics separately.

That is why `avg@32` is the appropriate metric for this paper's claim. DAPO is not arguing that the model can occasionally stumble onto a solution; it is arguing that RL made the model's reasoning more reliably correct. An average over attempts measures reliability. `pass@32` would not.

### Baselines

Two comparison points, and they do different jobs.

**Naïve GRPO** is the *floor* — the same base model and framework without the four techniques, reaching 30%. This is the number that motivates the paper: applying vanilla GRPO to Qwen2.5-32B did not reproduce the published results, and the gap was not small.

**DeepSeek-R1-Zero-Qwen-32B** is the *bar* — the prior reported result on this base model, at 47%. It is the target DAPO is trying to reach and exceed, and the reason the comparison is meaningful is that it uses the same base model.

### Main Results

All on Qwen2.5-32B Base, all `avg@32` on AIME 2024, reported as progressive additions to the baseline:

| Training configuration | AIME 2024 `avg@32` |
|---|---:|
| DeepSeek-R1-Zero-Qwen-32B | **47** |
| Naïve GRPO | **30** |
| + Overlong Filtering | **36** |
| + Clip-Higher | **38** |
| + Soft Overlong Punishment | **41** |
| + Token-Level Loss | **42** |
| + Dynamic Sampling (**DAPO**) | **50** |

**50 beats the reported 47**, using roughly **half the training steps** that the DeepSeek result required (Figure 1).

As a build:

```text
Qwen2.5-32B Base
       │
       ▼
   Naive GRPO
       │
       │ 30
       ▼
+ Overlong Filtering
       │
       │ 36
       ▼
+ Clip-Higher
       │
       │ 38
       ▼
+ Soft Overlong Punishment
       │
       │ 41
       ▼
+ Token-Level Loss
       │
       │ 42
       ▼
+ Dynamic Sampling
       │
       │ 50
       ▼
      DAPO
```

### Ablation of DAPO Components

The right way to read this table is not as a leaderboard. It is the paper asking, of each modification: **does it actually fix the failure mode it was designed to fix?**

Do not read it as *DAPO has one trick worth 20 points*. Read it as:

> **Large-scale RL performance depends on getting several interacting pieces right.**

Each row attacks a different failure mode.

**Naïve GRPO → 30.** The baseline, and the paper's motivation. Taking Qwen2.5-32B and applying vanilla GRPO reached about 30% AIME `avg@32` — not close to the published 47%. Everything else in the paper follows from that gap being real.

**+ Overlong Filtering → 36.** Remove the noisy signal from truncated responses (§9). $30 \rightarrow 36$, the largest step other than the last, supporting the observation that truncated responses were actively hurting training stability.

**+ Clip-Higher → 38.** Address entropy collapse. The failure:

```text
Naive GRPO

Entropy ↓↓↓
    ↓
Less exploration
    ↓
Responses become similar
```

The fix:

```text
εhigh ↑
   ↓
Low-probability useful tokens
can increase more
   ↓
More exploration
   ↓
Higher entropy
   ↓
More diverse reasoning
```

$36 \rightarrow 38$.

*The paper's Figure 2 plots AIME accuracy and actor-model entropy, with and without Clip-Higher.*

Figure 2 is worth more than its two points. It compares AIME accuracy *and* actor-model entropy with and without Clip-Higher, which means the claim being checked is about the **mechanism** — that the technique does to the entropy curve what §6 says it does — and not only about the score at the end.

**+ Soft Overlong Punishment → 41.** Stop merely ignoring excessive length and grade it instead:

```text
reasonable length
       ↓
no penalty

approaching limit
       ↓
increasing penalty

beyond limit
       ↓
strong penalty
```

$38 \rightarrow 41$, attributed to reducing the reward noise associated with truncation.

**+ Token-Level Loss → 42.** Change the loss reduction from sample-level to token-level (§8). $41 \rightarrow 42$ — the smallest step in the table, and worth not overselling. The authors' claim for it is specifically that token-level loss **improves training stability and makes the increase in response length healthier**, which is a claim about the shape of training rather than about the score. A technique can be conceptually central and numerically modest at the same time.

**+ Dynamic Sampling → 50.** The largest jump: $42 \rightarrow 50$. The reason follows §7 exactly — as the model improves, more prompts reach $\text{accuracy}=1$ and stop producing relative gradient signal; Dynamic Sampling keeps sampling until enough prompts have $0 < \text{accuracy} < 1$, so the effective batch stays useful.

And on the cost concern raised in §7: the authors report that although Dynamic Sampling requires **more sampling instances**, overall training time is not significantly affected, and convergence can be *faster* because fewer training steps are needed. The extra rollouts buy back their own cost in steps.

Two things to hold onto when reading the increments.

**The gains are cumulative, not independent.** Each row adds a technique to the one above it, so the numbers are not a ranking of the techniques in isolation. A technique's increment is its contribution *given* everything already in place — the +1 for Token-Level Loss is not a measurement of it alone.

**The order is not neutral.** Dynamic Sampling is added last and shows +8; Token-Level Loss is added fourth and shows +1. Nothing in the table establishes that those increments would be the same in a different order, and the largest increment landing in the final position is exactly where an ordering effect would be hardest to distinguish from a technique effect.

The contribution profile:

```text
                 Qwen2.5-32B Base
                        │
                        ▼
                  Naive GRPO
                     30
                        │
          ┌─────────────┴─────────────┐
          │                           │
    Overlong Filtering          Clip-Higher
          │                           │
         +6                          +2
          │                           │
          └─────────────┬─────────────┘
                        ▼
               Soft Overlong
                    +3
                        │
                        ▼
               Token-Level Loss
                    +1
                        │
                        ▼
              Dynamic Sampling
                    +8
                        │
                        ▼
                   DAPO = 50
```

> **Getting large-scale reasoning RL to work isn't just about choosing GRPO or PPO. The training system has to manage exploration, effective gradient signals, long-response behavior, token-level optimization, and reward quality together.**

Which is the paper's actual result: **a 30-point naïve GRPO baseline becomes a 50-point system by systematically identifying and fixing the practical failure modes of large-scale long-CoT RL.**

---

## 13. Training Dynamics

This section is the most directly useful one for anyone running RL in production, because the authors are not only reporting that accuracy went up. They are arguing:

> **You need to monitor the internal behavior of the RL system while it trains.**

Several metrics, each with a specific reason to watch it.

### Response Length

Increasing response length gives the model more room to explore complex reasoning patterns, so growth is generally a healthy sign early on. But length increasing forever is not itself good, and length can **stagnate or decline** during training.

The recommendation is therefore to read length *together with* validation accuracy rather than on its own:

```text
Response length
       +
Validation accuracy
       ↓
Is RL training healthy?
```

Neither curve interprets itself. Length rising with accuracy flat means something different from length rising with accuracy rising.

### Reward

Reward should generally increase during training if the model is fitting the training distribution. The warning attached to it is the important part:

> **High training reward does not necessarily mean high validation accuracy.**

The authors observe that final training reward can have little correlation with validation accuracy, indicating possible **overfitting to the training set**.

```text
Training reward ↑↑↑
       │
       │
       └── does NOT guarantee ──→ Validation accuracy ↑
```

This is a familiar lesson in supervised learning and an easy one to forget in RL, where the reward curve is the thing the optimizer is visibly maximizing and therefore the thing most likely to be treated as progress.

### Entropy

How spread out the model's probability distribution is. Both directions are failures.

Too low:

```text
Entropy ↓
   ↓
Distribution becomes sharp
   ↓
Model becomes deterministic
   ↓
Exploration ↓
```

Too high:

```text
Entropy ↑↑↑
   ↓
Over-exploration
   ↓
Gibberish / repetition
```

So the target is a **healthy range**, not a maximum. This is the qualification §6 needs:

> **Clip-Higher prevents entropy from collapsing, but the goal isn't maximum entropy. The goal is controlled exploration.**

Read that back against the configuration in §12: $\varepsilon_{\text{high}} = 0.28$ against $\varepsilon_{\text{low}} = 0.2$. A technique aimed at maximizing entropy would have widened the upper bound much further. A technique aimed at keeping entropy in a range widens it slightly — which is what the numbers show.

### Monitoring Large-Scale RL

> **Engineering interpretation.** *(Ours, not the paper's.)* What makes this section unusual for a results section is that it is largely about *instrumentation*. Three of the paper's four techniques were found by watching a metric that a purely score-driven evaluation would never have surfaced: entropy collapse is invisible in accuracy until it has already cost you accuracy, and effective batch size does not appear in any log unless you compute it deliberately. The transferable practice is to instrument the *mechanism* — entropy, effective prompt count, length distribution, truncation rate — and not only the objective.

---

## 14. Emergence of Reasoning Behavior

A case study, and one of the more striking observations in the paper. During RL, the model did not merely get better at reasoning patterns it already had. New reasoning behaviors appeared.

### Reflection and Backtracking

The authors observed **reflection and backtracking** emerging during training, behaviors that were essentially absent early on:

```text
Early training:

Problem
  ↓
Reason
  ↓
Answer


Later training:

Problem
  ↓
Reason
  ↓
Check previous reasoning
  ↓
Detect problem
  ↓
Backtrack
  ↓
Try another approach
  ↓
Answer
```

The later trace is not the earlier one done better. It has a different control structure — a verification step and a branch that the early behavior does not contain at all.

### Evolution of Reasoning During RL

Why this matters beyond being interesting:

> **RL isn't necessarily just teaching the model to imitate existing reasoning examples. The optimization process can discover and reinforce new reasoning behaviors.**

Note what the reward could and could not have specified. The reward here is an integer match on a final answer (§10). It says nothing about reflection, nothing about backtracking, and nothing about the structure of the reasoning that produced the answer. Those behaviors were not demonstrated in a target and then imitated; they were found because they raised the probability of getting the answer right.

This also connects back to §6 in a way worth making explicit. Behaviors that do not exist in the policy cannot be reinforced, and behaviors that exist at very low probability need room to grow before they can be sampled often enough to be reinforced reliably. Emergence of this kind is exactly what entropy collapse would foreclose.

> **On the specifics.** The paper reports these emergent behaviors — reflection and backtracking appearing during training, absent early on — as a qualitative observation illustrated with a sample trace. The structure above reflects the reported behavior; the concrete example trace is best read from the paper's own figure rather than reproduced here.

---

## 15. Drug Discovery Walkthrough *(our illustration)*

> **Scope boundary.** Everything in this section is **our illustrative application** of DAPO's method. Drug discovery is **not** among the paper's evaluated tasks, no experiment described here was run by the authors, and nothing here should be attributed to them. The paper's actual evidence is Sections 12–14. Nothing below is a result.

The purpose of this section is to test the four techniques against a setting they were not designed for, and see which parts of the recipe transfer. DAPO's evaluated task — competition mathematics with integer answers — has properties that make RL unusually tractable. A scientific-reasoning task has different ones, and the differences land precisely on the mechanisms of §§7, 9 and 10.

### The Problem

Suppose the task is: given a target protein and a set of constraints, propose a modification to a candidate molecule and justify it.

```text
Target protein + candidate molecule + constraints
                      ↓
              Reasoning trajectory
                      ↓
        Proposed modification + justification
```

Structurally this looks like the math setting. There is a prompt, a long reasoning trace, and a final answer. The differences appear as soon as you ask what the reward is.

### Generating Candidate Hypotheses

The rollout stage transfers directly. Sample $G$ responses per prompt and you get a group of independent proposals:

```text
        Prompt: modify this molecule
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
   Proposal 1  Proposal 2  ... Proposal G
```

This is worth more here than in mathematics. In math, a group of 16 responses to a problem with one correct answer is 16 attempts at the same target. In hypothesis generation, a group of 16 proposals may be 16 genuinely different ideas — which makes §6's argument about entropy collapse sharper, not weaker. A policy that has collapsed onto one modification strategy is useless in a way that a policy that has collapsed onto one correct arithmetic path is not.

### Evaluating Candidates

Here is where §10 stops transferring. DAPO's dataset transformation works because a mathematics problem can be rewritten so that the answer is an integer, and integer comparison is a perfect verifier. There is no equivalent rewriting for "is this a good molecular modification."

The available options are all worse than integer matching:

```text
Verifier options            Reliable?   Cheap?
─────────────────────────────────────────────
Exact match to known answer    yes        yes    ← but only for solved cases
Computational assay / docking  partly     no
Property predictor model       no         yes
Human expert                   partly     no
```

This matters more than it might appear, because §10's whole point was that a wrong reward is not noise — it is a confident false signal, and every technique in §§6–9 assumes the reward is telling the truth. A property predictor standing in as the reward function makes the reward a *learned* quantity, at which point the model can improve its reward without improving anything real.

The honest conclusion for this illustration: **DAPO's recipe is contingent on having a verifiable reward, and this task does not have one by default.** Constructing one — a held-out set of known modifications, a fixed computational assay, anything with a deterministic answer — is prerequisite work, not a detail.

### Iterative Reasoning

If a verifiable reward is available, the reasoning shape suits the setting:

```text
Understand the binding site
        ↓
Propose a substitution
        ↓
Consider steric clash
        ↓
Reject — too bulky
        ↓
Propose alternative substitution
        ↓
Check predicted solubility
        ↓
Justify
```

Which is the reflection-and-backtracking structure of §14, and it is the reason a long-CoT setting is the right frame for this task at all. A single-pass answer has nowhere to put the rejection step.

### Reward Design

Applying §9 and §10 to this setting:

| DAPO component | Transfers? | What it becomes here |
|---|---|---|
| Integer-answer transformation (§10) | **No** | Requires constructing a deterministic verifier; the hardest part of the setup |
| Correct/incorrect rule-based reward (§10) | Partly | Only where ground truth exists — held-out known results |
| Soft overlong punishment (§9) | **Yes** | Directly applicable; long scientific traces hit token limits for the same reason math traces do |
| Length cap + cache headroom (§9) | **Yes** | Same mechanism, same rationale |

§9 transfers essentially unchanged, which is worth noting. Truncation noise is a property of long generation under a token budget, not a property of mathematics.

### RL Training Loop

The loop from §11 with the substitutions made:

```text
        Prompt set (target + candidate + constraints)
                      ↓
              ROLLOUT — G proposals
                      ↓
              REWARD — deterministic verifier
                       + soft length penalty (§9)
                      ↓
        DYNAMIC SAMPLING — keep 0 < accuracy < 1  (§7)
                      ↓
              ADVANTAGE — group-relative, no critic
                      ↓
        POLICY UPDATE — asymmetric clip (§6)
                        token-level loss (§8)
```

§7 deserves a note here. Its admission test needs a group to contain both successes and failures, which presumes a reward with enough resolution to distinguish them. On a hard scientific task early in training, *every* group may be all-failure — accuracy 0 across the board — and Dynamic Sampling would then reject nearly everything it samples. The failure mode §7 describes as arriving late in training, once prompts become easy, can arrive immediately in a domain where nothing is easy yet.

### Emergent Reasoning Behavior

If §14's observation holds in this setting, the behavior to look for is not better proposals but a changed control structure: the model beginning to check a proposal against a constraint before committing to it, and abandoning proposals that fail. As in §14, nothing in the reward would have asked for that — it would appear because it raises the probability of a verified-correct answer.

Whether it does appear is an empirical question and not one this section answers.

### What this illustration establishes

> **Two of DAPO's four techniques (§6 Clip-Higher, §9 Overlong Reward Shaping) transfer to this setting on their own terms. One (§8 Token-Level Loss) is a loss-aggregation choice that is domain-independent. One (§7 Dynamic Sampling) transfers but changes character. And the enabling condition that is not one of the four — §10's verifiable reward — is the part that does not transfer, and the part everything else depends on.**

That is a reasonable summary of what the paper is and is not portable. The optimization techniques generalize; the reward engineering does not come for free.

---

## 16. Production and Systems Perspective

> **Engineering interpretation.** *(Ours, not the paper's.)* This section reads DAPO for what it implies about running RL as infrastructure. The paper's own claims are Sections 12–14; the framing here is ours.

### Why RL Training Is a Systems Problem

The paper's own framing supports this reading. DAPO is described as three artifacts — algorithm, code, dataset — and only one of them is an algorithm. Two of the four techniques are not changes to the update rule at all: §7 changes batch construction and its control flow, §9 changes the reward function. A description of DAPO as "a GRPO variant" would omit most of what produced the 20-point improvement.

The general shape: in supervised training, the data is a fixed input. In RL, the data is *produced by the thing being trained*, which means the training distribution moves as a function of your own progress. §7 is the cleanest example — the failure mode is caused by the model getting better.

### Rollout and Training Infrastructure

The configuration in §12 makes the rollout volume concrete: 512 prompts × 16 responses = **8,192 generations per step**, each up to 20,480 tokens. Generation dominates, and generation is an inference workload with different hardware characteristics than the gradient update it feeds.

Two implications:

- **The inference stack is part of the training stack.** Rollout throughput sets the step time, so serving-side optimizations affect training speed directly.
- **The length cap is a capacity decision, not just a hyperparameter.** §9's $L_{\max}$ and $L_{\text{cache}}$ appear in the reward function, but they are also what determines worst-case memory and time per rollout.

### Sampling Efficiency

Dynamic Sampling makes rollout volume **variable per step**, and rising over training. The authors report that total training time is not significantly affected because fewer steps are needed — but that is a statement about aggregate time, not about the shape of resource demand.

For anyone provisioning this: a step whose cost depends on how many prompts happened to be rejected does not have a fixed duration. If your rollout capacity is sized for the average, late-training steps will queue.

The metric worth logging is not batch size — that is a constant you set. It is **prompts sampled per useful prompt admitted**, which is the thing that actually moves.

### Training Stability

§13 is the transferable part of this paper for practitioners. Three of the four techniques were found by watching something other than the score:

| What was watched | What it revealed | Technique |
|---|---|---|
| Actor entropy | Collapse toward determinism | Clip-Higher (§6) |
| Effective prompt count | Batch emptying of signal | Dynamic Sampling (§7) |
| Truncation rate / length | Reward noise from cut-off responses | Overlong Reward Shaping (§9) |

None of those three is visible in an accuracy curve until after it has cost accuracy. And §13's reward warning cuts the other way: training reward rising is not evidence that anything is working, since it can rise while validation accuracy does not.

### Scaling RL Systems

The result that generalizes best is the negative one. Naïve GRPO on a strong base model reached 30% where 47% had been reported. The algorithm was implemented correctly; the gap was in everything around it. That is the claim with the widest applicability: **at this scale, the difference between a working and non-working RL system was not the choice of optimizer.**

---

## 17. Why DAPO Matters

Three reasons, in descending order of how confident one can be about them.

**It closes a reproducibility gap with artifacts rather than description.** The paper's starting observation is that existing state-of-the-art reasoning-RL results could not be reproduced from what had been published — naïve GRPO on the same base model reached 30% against a reported 47%. The response was to release the algorithm, the training code, and the dataset. That is a claim that can be checked, which is not true of most reported RL results.

**It identifies the failure modes specific to long-CoT RL and names them.** Entropy collapse, the gradient-decreasing problem, sample-level dilution, truncation reward noise. Each has a stated mechanism, a stated fix, and an ablation row. Even for someone who never runs DAPO, that list is the reusable content — it is a set of things to instrument.

**It demonstrates that reward engineering is not preliminary work.** §10 is the least algorithmically interesting part of the paper and arguably the most load-bearing: transforming the dataset so answers are integers is what makes the rule-based reward trustworthy, and every technique in §§6–9 assumes a trustworthy reward.

And one thing it establishes that is easy to miss: **50% beat 47% at roughly half the training steps.** The improvement is not only in the final number but in the efficiency of getting there, which is the kind of result that compounds.

---

## 18. Limitations

> **Note.** The paper does not frame a dedicated limitations section; what follows is scope visible in the reported material, stated as scope rather than as criticism.

What is visible in the reported material, stated as scope rather than as criticism:

**A single base model and a single task family.** All results are Qwen2.5-32B Base on mathematical reasoning, evaluated on AIME 2024. Whether the four techniques carry to other base models, other scales, or non-mathematical reasoning is not established by this evidence.

**The verifiable-reward requirement.** §10's dataset transformation is what makes the rule-based reward reliable, and it works because mathematics problems can be rewritten to have integer answers. Domains without that property do not inherit the recipe intact — §15 works through what that costs.

**Cumulative ablation only.** The ablation adds techniques in one fixed order, so no increment in the table is a measurement of a technique in isolation, and no alternative ordering is reported. The largest increment (+8) is also the last one added.

> **Engineering caveats.** *(Ours, not the paper's — these are reading notes, not author-stated limitations.)*
>
> - **Dynamic Sampling's cost is reported in aggregate.** Training time is stated as not significantly affected; the per-step variance in rollout volume is a provisioning concern that an aggregate figure does not address.
> - **Entropy is described as needing a healthy range, without the range.** §13 establishes that both too-low and too-high entropy are failures. Where the boundary sits is left to observation.
> - **`avg@32` on a 15-problem benchmark is a narrow measurement.** The protocol is a reasonable choice for the claim being made (§12), but AIME 2024 is 15 problems, and a small benchmark limits how finely two nearby scores can be distinguished.

---

## 19. Future Directions

### Discussed by the authors

The paper's stated aim is to enable further large-scale RL research by releasing the full system — the algorithm, the verl-based training code, and DAPO-Math-17K. It does not enumerate a separate list of proposed future directions; the ones below are ours.

### Engineering implications and extensions *(our reading)*

Not predictions about the authors' plans — things this paper makes it possible to ask.

**Are the four techniques order-independent?** The ablation establishes a cumulative path from 30 to 50 but not that the path is unique. Since the techniques act at four different stages (§11), most orderings are implementable, and re-running the ablation in a different order would separate technique effects from ordering effects.

**Does the entropy target admit a schedule?** §13 says the goal is controlled exploration in a healthy range, and $\varepsilon_{\text{high}}$ is a fixed constant. Exploration needs are usually not constant over training.

**How far does §7 generalize when nothing is easy?** Dynamic Sampling was motivated by prompts becoming trivially solved. The symmetric case — prompts that are never solved, so every group is all-failure — is admitted by the same constraint but arises for the opposite reason (§15).

**What replaces §10 where answers are not integers?** The most consequential open question, because it is the condition the rest of the method rests on rather than a component of it.

---

## 20. Key Takeaways

1. **DAPO is a system, not just an algorithm.** Three released artifacts — the algorithm, the training code (built on verl), and DAPO-Math-17K. Two of its four techniques are not changes to the update rule at all.

2. **The motivating gap was real and large.** Naïve GRPO on Qwen2.5-32B Base reached 30% AIME 2024 `avg@32` against a reported 47% for DeepSeek-R1-Zero-Qwen-32B. The paper exists because the published state of the art did not reproduce.

3. **The result is 50% at roughly half the training steps.** Both halves of that matter — the score and the efficiency.

4. **"50 points" means 50% accuracy under `avg@32`, not a contest score.** 32 generations per problem at temperature 1.0, top-p 0.7, averaged. And `avg@32` is not `pass@32` and not `cons@32`.

5. **Clip-Higher (§6): a ratio constraint is weakest where the probability is largest.** Symmetric clipping is non-binding for already-dominant tokens and severe for rare ones, so exploration is throttled exactly where it is needed. Decoupling the bounds and raising $\varepsilon_{\text{high}}$ to 0.28 against $\varepsilon_{\text{low}} = 0.2$ fixes it — a small asymmetry with a structural effect.

6. **$\varepsilon_{\text{low}}$ is deliberately left alone.** Loosening the lower bound would let bad tokens collapse to zero probability, destroying the sampling space from the other direction.

7. **Dynamic Sampling (§7): group-relative advantage is zero when every response agrees.** All-correct and all-incorrect groups both produce no gradient. The fix is to keep sampling until the batch holds enough prompts with $0 < \text{accuracy} < 1$.

8. **That failure mode is caused by training working.** As the model improves, more prompts become trivially solved and drop out. Left alone, it worsens monotonically for as long as training succeeds.

9. **Effective batch size is not batch size.** A 64-prompt batch with 14 useful prompts estimates the gradient from 14. Nominal batch size is a constant you configured; the effective count is the one that moves, and nothing logs it unless you ask.

10. **Token-Level Loss (§8): every token gets a vote, not every response.** Sample-level averaging dilutes each token of a long response, which makes 10,000 tokens of degenerate repetition nearly free in gradient terms. Length stops being a shield.

11. **This is not TRPO.** The clipping is still PPO-style. What changed is the granularity of the loss reduction.

12. **Overlong Reward Shaping (§9): truncation penalties are noise correlated with length.** Two identical reasoning processes can receive +1 and −1 depending only on which finished inside the budget. Filtering truncated samples helps (+6); a graded penalty between $L_{\max} - L_{\text{cache}}$ and $L_{\max}$ helps further (+3).

13. **Handling long responses well accounts for more of the gain than either technique in DAPO's name.** +6 and +3 from the two overlong mechanisms, against +2 for Clip-Higher and +1 for Token-Level Loss.

14. **Dataset Transformation (§10) is the enabling condition, not a trick.** Rewriting problems to have integer answers makes the verifier exact. A parser failure is not noise — it is a confident wrong reward, and every other technique assumes the reward is honest.

15. **The techniques act at four different stages** — reward, batch construction, and two places in the policy update — which is why they are separable in implementation and can be adopted incrementally.

16. **Three of the four were found by instrumentation, not by scores.** Entropy collapse, effective prompt count, and truncation rate are all invisible in an accuracy curve until after they have cost accuracy.

17. **Rising training reward is not evidence of progress.** The authors report final training reward correlating poorly with validation accuracy — possible overfitting to the training set.

18. **The entropy goal is a range, not a maximum.** Too low is determinism; too high is gibberish and repetition. Clip-Higher prevents collapse; it is not trying to maximize entropy.

19. **New reasoning behaviors emerged that the reward never specified.** Reflection and backtracking appeared during training, absent early on, from a reward that only checks a final integer.

20. **The widest-applicability finding is the negative one.** At this scale, the difference between a working and a non-working RL system was not the choice of optimizer.

---

## References

- **Primary:** *DAPO: An Open-Source LLM Reinforcement Learning System at Scale.* arXiv:[2503.14476](https://arxiv.org/abs/2503.14476), March 17, 2025. ByteDance Seed; Institute for AI Industry Research (AIR), Tsinghua University; The University of Hong Kong; SIA-Lab of Tsinghua AIR and ByteDance Seed. Correspondence: Hao Zhou (Tsinghua AIR), Mingxuan Wang (ByteDance). Full author list in the paper's Contributions.
- **Project page / official release:** <https://dapo-sia.github.io/> — DAPO code, dataset, and result tables.
- **Implementation:** verl — the RL framework the DAPO system is built on, cited as [20] in the paper. <https://github.com/volcengine/verl>
- **Dataset:** DAPO-Math-17K — approximately 17K prompts, each paired with an integer answer, released with the paper.
- **Base model:** Qwen2.5-32B Base — the pretrained model all reported results start from.
- **Comparison point:** DeepSeek-R1-Zero-Qwen-32B — the prior reported result on this base model, 47% AIME 2024 `avg@32`.
- **Referenced in the Introduction:** OpenAI o1 and DeepSeek-R1, as the reasoning systems whose RL recipes were not fully disclosed.
- **Prior work:** PPO (Proximal Policy Optimization, Schulman et al.); GRPO (Group Relative Policy Optimization, DeepSeekMath); TRPO (Trust Region Policy Optimization, discussed in §8 only to distinguish it from DAPO's loss-aggregation change).
- **Companion — RL fundamentals:** policy-gradient optimization, PPO, GRPO, DPO, and KL-constrained policy updates are covered in [our RL for LLMs deep-dive](/ai%20engineering/2026/09/10/reinforcement-learning-for-llms-rlhf-rlaif-rlvf-rlef-swirl-post-training/) rather than re-derived here.
