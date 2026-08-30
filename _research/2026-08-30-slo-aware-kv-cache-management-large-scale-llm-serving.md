---
layout: post
title: "SLO-Aware KV-Cache Management for Large-Scale LLM Serving"
date: 2026-08-30
author: Trisham Bharat Patil
meta: "Integrating Prefix Reuse, Hierarchical Caching, and Prefill–Decode Disaggregation"
description: "An analytical systems formulation of LLM serving as a KV-cache lifecycle problem. We unify prefix reuse (RadixAttention), hierarchical KV-cache placement (Strata), and prefill–decode disaggregation (Mooncake) into a single SLO-aware decision framework, and reason about how the preferred serving architecture shifts with workload and hardware characteristics."
tags:
  - LLM Serving
  - KV Cache
  - Prefix Reuse
  - RadixAttention
  - Hierarchical Caching
  - Prefill Decode Disaggregation
  - SLO
  - Systems
  - GPU Inference
mathjax: true
---

## Abstract

Large-scale large language model (LLM) serving is increasingly constrained not by raw model computation but by the **management, placement, reuse, and movement of key–value (KV) cache state**. A request either reuses previously computed KV state or creates it through prefill; that state then consumes scarce GPU memory, may be promoted, demoted, evicted, recomputed, or transferred across a cluster, and is finally consumed token-by-token during decode. Three influential systems each attack one facet of this lifecycle: **RadixAttention** (SGLang) reuses the KV cache of shared prefixes to avoid redundant prefill; **Strata** places KV cache across a GPU/CPU/storage hierarchy and hides the resulting load latency; and **Mooncake** disaggregates prefill and decode onto specialized resource pools connected by a KV-transfer fabric.

This article does not summarize those systems in sequence. Instead it develops a single, unified **analytical formulation**: given a model, a workload, a hardware configuration, and a set of service-level objectives (SLOs), how should an inference system decide *where KV state lives, when it is reused versus recomputed, and how it moves* so that SLOs are met at minimal resource cost? We treat prefix reuse, hierarchical placement, and disaggregation not as independent optimizations but as coupled control decisions over a shared quantity — the KV cache — and we make those couplings explicit through a set of cost relations. The treatment is deliberately **analysis-only**: the contribution is a way of reasoning about the design space, a hardware-parameterized abstraction, and a qualitative account of how the preferred architecture shifts as workload and hardware characteristics change. We claim no new algorithm and report no measured results; the value is the unified framing and the reasoning it enables.

---

## 1. Introduction

The dominant mental model of LLM inference — "a big matrix multiply on a GPU" — is no longer an adequate basis for reasoning about production serving. In autoregressive generation, every token attends to the key and value vectors of all preceding tokens. To avoid recomputing those vectors at each step, systems cache them: the **KV cache**. This cache is the quantity around which modern serving actually revolves. It grows with context length, it competes for the same GPU high-bandwidth memory (HBM) that holds the model weights, it can be shared between requests that share a prefix, and — once it no longer fits in HBM — it must be stored elsewhere and moved back on demand.

Three observations motivate a KV-centric view.

**First, memory, not compute, is frequently the binding constraint.** PagedAttention's central finding is that LLM serving is memory-bound: on a 13B model the KV cache occupies roughly 30% of an A100's memory, and inefficient management of it — not arithmetic throughput — caps the achievable batch size [vLLM]. The batch size, in turn, determines throughput. Whoever controls the KV cache controls the serving economics.

**Second, a large fraction of prefill computation is redundant.** Production traffic is full of shared structure: a common system prompt, a shared few-shot preamble, a document reused across many questions, a multi-turn conversation whose history repeats every turn. RadixAttention observes that if the KV cache of a shared prefix is retained, later requests can reuse it rather than recompute it, avoiding the dominant cost of prefill for the shared portion [SGLang].

**Third, prefill and decode are different workloads.** Prefill is compute-heavy and processes the whole prompt in parallel; decode is memory-bandwidth-heavy and emits one token at a time. Their latency objectives differ — time-to-first-token (TTFT) versus time-between-tokens (TBT) — and Mooncake shows that separating them onto specialized clusters, connected by a KV-transfer path, can substantially raise effective capacity under SLOs [Mooncake].

Each of these is usually studied on its own. But they are not independent: higher prefix reuse changes how much KV state is created and therefore how much memory pressure and transfer volume the rest of the system must handle; larger contexts enlarge the KV cache and simultaneously strengthen the case for both hierarchical placement and disaggregation; faster interconnects lower the cost of moving KV and shift the boundary at which moving beats recomputing. The purpose of this article is to make these couplings explicit and to reason about the serving architecture as a single **KV-cache lifecycle and resource-management problem**.

> **Central thesis.** Modern LLM serving is not only a model-computation problem; it is increasingly a KV-cache lifecycle and resource-management problem. A request creates or reuses KV state; that state consumes memory and may be retained, moved, promoted, demoted, evicted, or recomputed; at scale, prefill and decode contend for different resources. The design problem is to make these decisions jointly, under workload and SLO constraints.

**On the nature of this work.** The systems referenced here — SGLang/RadixAttention, Strata, Mooncake, vLLM/PagedAttention — are existing, published contributions. This article contributes *neither* those mechanisms *nor* an implementation of them. It contributes an analytical synthesis: a unified problem statement, a set of cost relations that expose how the mechanisms interact, and a qualitative design analysis. Throughout, language is chosen to reflect this: we *formulate*, *model*, and *reason about*; we do not claim to outperform or reproduce any system, and we present no measurements.

---

## 2. Background and Motivation

### 2.1 LLM Inference and the KV Cache

A decoder-only transformer serves a request in two phases. In **prefill**, the model consumes the input prompt of length $L_{\text{in}}$ and, in a single parallel forward pass, produces the key and value tensors for every layer and every prompt position. In **decode**, the model generates output tokens one at a time; each new token attends to the KV of all previous positions, appends its own K and V, and repeats.

The KV cache is what makes decode affordable: without it, generating token $t$ would require recomputing the attention keys and values for positions $1 \dots t-1$. With it, decode reads cached state and computes only the new token. The cache therefore trades **memory for computation** — the recurring theme of this article.

The size of the KV cache for a single sequence is, to first order,

$$
S_{\text{KV}} \;=\; 2 \cdot L_{\text{layers}} \cdot n_{\text{kv}} \cdot d_{\text{head}} \cdot b \cdot T
$$

where the factor $2$ accounts for keys **and** values, $L_{\text{layers}}$ is the number of transformer layers, $n_{\text{kv}}$ the number of key/value heads (fewer than query heads under grouped-query attention), $d_{\text{head}}$ the per-head dimension, $b$ the bytes per stored element (e.g. 2 for FP16), and $T$ the number of tokens held. The essential property is **linearity in $T$**: cache size scales with context length. Long-context serving is, mechanically, a KV-cache capacity problem.

### 2.2 Prefix Reuse and RadixAttention

Many requests share a prefix. RadixAttention organizes the KV cache of completed and in-flight requests in a **radix tree keyed on token sequences**, and retains it under an LRU policy rather than discarding it at request end [SGLang]. A new request performs a longest-prefix match against this tree; the KV of the matched prefix is reused, and only the unmatched suffix is prefilled. SGLang further schedules requests **longest-shared-prefix-first** so that cache-friendly orderings are realized in practice, and reports that this ordering reaches close to the optimal achievable hit rate [SGLang].

The consequence for our formulation is that prefill cost is not a function of the prompt length but of the *unmatched* length. If a request of input length $L_{\text{in}}$ matches a cached prefix of length $L_{\text{reused}}$, the new tokens requiring computation are

$$
L_{\text{new}} \;=\; L_{\text{in}} - L_{\text{reused}}.
$$

Reuse shrinks $L_{\text{new}}$, which reduces prefill FLOPs, TTFT, and the newly created KV volume simultaneously.

### 2.3 Hierarchical KV-Cache Management

Retaining KV cache to enable reuse, and holding the growing caches of many concurrent long-context requests, both exceed the capacity of GPU HBM. The response is a **memory hierarchy**: HBM (hot, fast, small), CPU DRAM (warm, larger), and SSD/NVMe storage (cold, largest). Strata places KV blocks across these tiers according to access patterns and cost, promoting frequently reused blocks upward and demoting cold blocks downward [Strata].

The difficulty Strata identifies is that once KV is offloaded, **loading it back becomes the bottleneck**. Paged KV cache produces many tiny, fragmented transfers that badly underutilize the PCIe link, and a scheduler that ignores loading delay leaves the GPU stalled — Strata reports that a large fraction of prefill time can be spent waiting on transfers rather than computing [Strata]. Strata's remedies are a GPU-assisted I/O path that saturates the link even for small pages, a decoupled memory layout (layer-first on the GPU for compute, page-first on host/disk for large contiguous transfers), and a cache-aware scheduler that hides load latency. For our purposes, the key abstraction is a **retrieve-versus-recompute decision** made every time a needed block is found in a lower tier.

### 2.4 Prefill–Decode Disaggregation

Prefill and decode stress different hardware. Prefill is compute-bound and benefits from raw FLOPs; decode is bandwidth-bound and benefits from fast HBM access. Serving both on the same worker forces a compromise and couples two objectives with different SLOs. Mooncake disaggregates them: a **prefill cluster** optimized for TTFT and a **decode cluster** optimized for TBT, with a disaggregated KV store pooling CPU/DRAM/SSD/RDMA across the cluster and a cache-aware scheduler that routes on prefix-hit length and predicted SLO attainment [Mooncake].

Disaggregation introduces a new obligation: the KV cache produced by prefill must be **transferred** to the decode worker before generation can proceed. This makes network bandwidth and transfer latency first-class terms in the serving model, and reintroduces a movement-versus-recomputation trade-off at cluster scale.

---

## 3. Problem Formulation

We now state the decision problem the rest of the article reasons about.

**Given:**

$$
\big(\, M,\; W,\; H,\; S \,\big)
$$

- $M$ — **model characteristics**: layer count $L_{\text{layers}}$, KV heads $n_{\text{kv}}$, head dimension $d_{\text{head}}$, parameter count $P$, and precision $b$. These fix per-token KV size and per-token prefill/decode cost.
- $W$ — **workload**: the arrival process (mean and peak request rate, burstiness), the distributions of input length $L_{\text{in}}$ and output length $L_{\text{out}}$, the context-length distribution, and — critically — the **prefix reuse structure** (how much prompt content is shared across requests, and over what time window).
- $H$ — **hardware configuration**: per-GPU compute throughput, HBM capacity and bandwidth, GPU–GPU and inter-node interconnect bandwidth and latency, CPU DRAM capacity and bandwidth, storage characteristics, and a cost model. $H$ is treated as an **abstraction** (Section 10) so the same problem can be posed against different GPUs.
- $S$ — **SLOs**: bounds on tail latency, principally $\text{TTFT}_{p99}$ and $\text{TBT}_{p99}$, plus any admission/rejection policy.

**Determine** a serving configuration

$$
A^{*} \;=\; \arg\min_{A} \; \text{Cost}(A) \quad \text{s.t.} \quad \text{SLO}(A) \preceq S,
$$

where a configuration $A$ specifies (i) the **prefix-reuse policy** — what to cache and retain; (ii) the **placement policy** — which tier each KV block lives in and the promotion/demotion/eviction rules; (iii) the **disaggregation policy** — whether prefill and decode are colocated or separated, and how many resources each receives; and (iv) the **scheduling policy** — how requests are ordered and admitted. $\text{Cost}(A)$ is a resource objective (GPU count, or equivalently infrastructure cost, or wasted computation), and $\text{SLO}(A) \preceq S$ requires every SLO percentile bound to hold.

This is a constrained decision problem, not a closed-form optimization we intend to solve exactly. Its value is as a **frame**: every mechanism discussed below is a lever on one of the four policy components, and the couplings between levers are what make the problem interesting.

**A note on scope.** We deliberately do not commit to a single scalar objective or a solvable program. Production serving objectives are multi-dimensional (throughput, tail latency, cost, fairness) and the underlying distributions are empirical. Treating $A^{*}$ as an *analysis target* — "which way does the optimum move when a parameter changes?" — is both more honest and more useful than pretending a numeric optimum can be computed from first principles.

---

## 4. System Architecture

We consider a unified architecture in which all four policy levers are present and can be reasoned about together. The following diagram (constructed for this article) shows the end-to-end structure on a representative GPU cluster, with the three mechanisms as labeled layers and an explicit hardware-abstraction and monitoring plane.

![Unified LLM inference architecture on an H100/H200-class cluster, showing the SGLang/RadixAttention prefix-reuse layer, the Strata hierarchical KV-cache layer with a retrieve-versus-recompute decision, and the Mooncake disaggregated prefill/decode layer connected by a KV-transfer service, over a hardware-abstraction and monitoring plane.](/assets/engg_article/unified_llm_inference.png)
*Figure 1. The unified serving architecture as a set of coupled layers over a hardware abstraction. Requests enter through admission control and prefix matching; matched KV is reused, unmatched tokens are prefilled; KV blocks are placed across a memory hierarchy under a placement policy; prefill and decode execute on specialized pools joined by a KV-transfer service. Monitoring feeds the scheduling and placement decisions. A layer-only, hardware-independent view of the same three mechanisms appears in Figure 5.*

The request path is:

1. **Arrival and admission.** Requests enter a queue; an admission controller may reject requests predicted to miss their SLO rather than degrade all requests.
2. **Prefix lookup.** A radix-style index is searched for the longest matching prefix; a hit yields reusable KV, a miss requires full prefill.
3. **Prefill.** The unmatched suffix is computed, producing new KV blocks.
4. **Placement.** New and reused KV blocks are assigned to a memory tier under the placement policy; blocks may be promoted or demoted over time.
5. **Transfer (if disaggregated).** KV produced on a prefill worker is moved to a decode worker.
6. **Decode.** Tokens are generated autoregressively, reading KV from wherever it resides.
7. **Monitoring and feedback.** Hit rate, tier occupancy, latency percentiles, and transfer volume are measured and fed back to scheduling and placement.

The architecture is intentionally **hardware-parameterized** (Section 10): the layers describe *decisions*, and the hardware abstraction supplies the *costs* that make one decision preferable to another. Nothing in the layer structure is specific to a given GPU; a layer-only conceptual view of the same three mechanisms, drawn independently of any cluster, appears in the Unified System Model (Figure 5, Section 9).

---

## 5. KV-Cache Lifecycle

The strongest way to understand the unified problem is to follow a single request's KV state from arrival to completion. This lifecycle is the backbone of the entire formulation.

![KV-cache lifecycle for a single request: arrival, prefix match against a radix tree, reuse-or-prefill decision, KV creation/update, placement across an HBM/DRAM/SSD hierarchy under a placement-and-eviction policy, decode, and output, with a monitoring-and-feedback loop.](/assets/engg_article/kv_cache_lifecylce.png)
*Figure 2. The lifecycle of KV state for one request. The reuse-or-prefill branch (top) determines computation; the placement-and-eviction block (middle) determines memory; decode (bottom) consumes the state. Monitoring closes the loop.*

Stage by stage:

1. **Request arrives** with a prompt and generation configuration.
2. **Prefix is searched** in the radix index; the longest matching prefix is identified.
3. **Existing KV may be reused** for the matched prefix — no computation for that portion.
4. **Missing tokens require prefill** — the unmatched suffix of length $L_{\text{new}}$ is computed.
5. **KV state is created or extended** for the new tokens.
6. **KV is placed** in an appropriate memory tier (hot HBM, warm DRAM, cold storage).
7. **KV may be promoted or demoted** as access patterns evolve.
8. **KV may be transferred** between a prefill worker and a decode worker under disaggregation.
9. **Decode consumes** the KV state to generate tokens.
10. **Cache state is retained, evicted, or moved** — either kept for future reuse (feeding stage 3 of a later request) or reclaimed under memory pressure.

Two properties of this lifecycle drive everything else. First, it is a **loop, not a line**: the retained KV at stage 10 becomes the reusable KV at stage 3 for a future request, so the reuse policy and the eviction policy are two ends of the same decision. Second, **every stage after prefill is a resource-management choice** — placement, promotion, transfer, eviction — rather than a computation. The system's quality is determined largely by how well it makes those choices.

---

## 6. Prefix-Aware KV Reuse

The first lever reduces *how much must be computed at all*.

![Prefix reuse with RadixAttention: two requests sharing a 12K-token prefix (system prompt plus a shared document) organized in a radix tree so the shared prefix is cached once and reused, with only the divergent suffixes recomputed; contrasted with a no-reuse baseline that recomputes the full prompt for every request.](/assets/engg_article/prefix_reuse_sglang.png)
*Figure 3. Prefix reuse. When two requests share a long prefix, only the first pays to prefill it; the second reuses the cached KV and computes only its divergent suffix. The benefit grows with the length and frequency of shared prefixes.*

Consider requests organized in a radix tree keyed on tokens. A shared system prompt sits near the root; documents and few-shot preambles form shared internal paths; per-request questions are divergent leaves. A request that matches a cached prefix of length $L_{\text{reused}}$ computes only

$$
L_{\text{new}} \;=\; L_{\text{in}} - L_{\text{reused}}
$$

new tokens. If prefill cost is approximately linear in the number of processed tokens — a reasonable first-order model away from the regime where the quadratic attention term dominates — then the prefill work for a request scales with $L_{\text{new}}$ rather than $L_{\text{in}}$. Aggregated over a workload with mean reuse fraction $\rho = \mathbb{E}[L_{\text{reused}}/L_{\text{in}}]$, the expected prefill computation is reduced by roughly a factor $(1-\rho)$ relative to a no-reuse baseline.

Three qualitative consequences follow, and they are the ones that matter for the unified problem:

- **Reuse lowers TTFT and prefill load**, because less new computation stands between arrival and first token.
- **Reuse changes the memory picture**, and in two opposing directions. Retaining prefixes for reuse *consumes* cache capacity; but a cache hit *avoids creating* new KV for the shared portion. Whether reuse net-increases or net-decreases occupancy depends on the sharing structure — many requests sharing one long prefix is strongly favorable; many unique long prompts is not.
- **Reuse interacts with scheduling.** Realizing a high hit rate requires ordering requests so that shared prefixes are resident when needed; a cache-aware, longest-shared-prefix-first ordering is what turns a theoretically available hit into an actual one [SGLang].

We stress the distinction between the mechanism and this analysis. RadixAttention is SGLang's contribution [SGLang]; here it is one term — the map from $L_{\text{in}}$ to $L_{\text{new}}$ — in a larger cost model. We do not reproduce its implementation, and the linear-prefill approximation is an analytical simplification, not a claim about any particular kernel.

---

## 7. Hierarchical KV-Cache Management

The second lever expands the *effective* cache beyond HBM and decides *where each KV block lives*.

![Hierarchical KV cache (Strata): a three-tier hierarchy of GPU HBM (hot), CPU DRAM (warm), and SSD/NVMe storage (cold) with promotion on reuse and demotion when cold, and a lookup-time decision comparing the cost of retrieving a block from a lower tier against recomputing it via prefill.](/assets/engg_article/hierarchical_kv_cache_strata.png)
*Figure 4. Hierarchical placement. KV blocks flow up (promotion) and down (demotion) a cost/latency hierarchy. At lookup time, the system faces a choice: retrieve a block from a lower tier, paying transfer cost, or recompute it, paying compute cost.*

Model the hierarchy as tiers with increasing capacity and access latency: HBM $\to$ DRAM $\to$ storage. A block's ideal tier depends on its **reuse probability** and the **cost of getting it back** if placed lower. Hot, frequently reused blocks belong in HBM; warm blocks in DRAM; cold, rarely reused blocks in storage or evicted entirely.

The central decision is not "which tier" in the abstract but a concrete comparison made whenever a needed block is found below HBM:

$$
T_{\text{retrieve}} \quad \text{versus} \quad T_{\text{recompute}}.
$$

Retrieval cost is dominated by moving the block up the hierarchy,

$$
T_{\text{retrieve}} \;\approx\; \frac{S_{\text{block}}}{BW_{\text{tier}}} \;+\; T_{\text{overhead}},
$$

where $S_{\text{block}}$ is the block's KV size, $BW_{\text{tier}}$ the effective bandwidth of the link from the block's tier to HBM, and $T_{\text{overhead}}$ captures fixed per-transfer costs. Recomputation cost is the prefill cost of regenerating that block's tokens,

$$
T_{\text{recompute}} \;\approx\; c_{\text{prefill}} \cdot T_{\text{block}},
$$

for $T_{\text{block}}$ tokens and a per-token prefill cost $c_{\text{prefill}}$ set by the model and the GPU. The system should retrieve when $T_{\text{retrieve}} < T_{\text{recompute}}$ and recompute otherwise. Two forces shape this inequality: **effective bandwidth** and **fragmentation**. Strata's observation is that paged KV produces many tiny transfers that collapse the *effective* $BW_{\text{tier}}$ far below the link's peak, which can perversely make recomputation win even when it should not — so a large part of the engineering is about raising effective bandwidth (GPU-assisted I/O, contiguous page-first layouts on host/disk) so that retrieval remains the cheaper option for offloaded blocks [Strata].

This is emphatically **not** merely "LRU across three layers." A pure recency policy ignores both the recompute alternative and the cost asymmetry between tiers. The correct policy is cost-aware: it weighs reuse probability against the *specific* retrieval and recomputation costs a block would incur, which themselves depend on hardware ($BW_{\text{tier}}$) and model ($c_{\text{prefill}}$). The hierarchy is where hardware characteristics first enter the KV decision directly.

---

## 8. Prefill–Decode Disaggregation

The third lever decides *where computation happens* and specializes resources to the two phases.

**Monolithic serving** runs prefill and decode on the same worker. This couples a compute-bound phase and a bandwidth-bound phase, forces one hardware compromise to serve both, and entangles the TTFT and TBT objectives — a prefill burst delays in-flight decodes and vice versa.

**Disaggregated serving** separates them:

$$
\text{prefill workers} \;\longrightarrow\; \text{KV transfer} \;\longrightarrow\; \text{decode workers}.
$$

Prefill workers are provisioned for FLOPs; decode workers for HBM bandwidth and capacity; each phase is scheduled against its own SLO [Mooncake]. The cost of this separation is that KV must move between pools:

$$
T_{\text{transfer}} \;=\; \frac{S_{\text{KV}}}{BW_{\text{effective}}} \;+\; T_{\text{overhead}},
$$

with $S_{\text{KV}}$ the transferred cache size (Section 2.1), $BW_{\text{effective}}$ the effective network/interconnect bandwidth, and $T_{\text{overhead}}$ the setup cost per transfer. Disaggregation is attractive when moving the KV is cheaper than the alternative — either recomputing it on the decode side,

$$
T_{\text{transfer}} \;<\; T_{\text{recompute}},
$$

or than the throughput lost to running both phases on shared, compromised hardware. The inequality tilts toward disaggregation as interconnect bandwidth rises ($BW_{\text{effective}}\uparrow \Rightarrow T_{\text{transfer}}\downarrow$) and as the workload becomes more prefill-heavy (long inputs relative to outputs), because that is precisely when specializing prefill resources and decoupling the two SLOs pays off most.

Again, the mechanism is Mooncake's [Mooncake]; the contribution here is placing $T_{\text{transfer}}$ alongside $T_{\text{retrieve}}$ and $T_{\text{recompute}}$ in one comparison, so that disaggregation and hierarchical placement are seen as two instances of the same underlying question: *is it cheaper to move KV state or to regenerate it?*

---

## 9. Unified System Model

The three levers act on one quantity, and their couplings are the crux of the design problem.

![Unified KV-cache lifecycle across SGLang, Strata, and Mooncake: a prefix-reuse layer feeding a hierarchical KV-cache layer feeding a disaggregated prefill/decode layer, from prefix reuse to hierarchical storage to disaggregated inference, with end-to-end benefits of higher throughput, lower TTFT/TBT, lower serving cost, and improved SLO compliance.](/assets/engg_article/unified_cache_lifecycle.png)

*Figure 5. The mechanisms as conceptual layers over the shared KV cache — the hardware-independent counterpart to Figure 1. Prefix reuse determines how much KV is created; hierarchical placement determines where it resides and whether it is retrieved or recomputed; disaggregation determines where it is produced and consumed and whether it must be transferred. A change to any one propagates to the others.*

The request flows through a single pipeline:

```text
Request
   ↓
Prefix Lookup
   ↓
Reusable KV?
   ├── Yes → Reuse
   └── No  → Prefill
                ↓
          KV Cache State
                ↓
       Hierarchical Placement
                ↓
        Prefill / Decode
          Architecture
                ↓
           KV Transfer
                ↓
              Decode
```

The couplings, stated as directional relationships, are the analytical heart of this article:

- **Higher prefix reuse $\Rightarrow$ less prefill computation $\Rightarrow$ lower KV-creation rate $\Rightarrow$ different cache occupancy.** Reuse reshapes both the compute load and the memory load; it cannot be tuned in isolation from placement.
- **Higher context length $\Rightarrow$ larger $S_{\text{KV}}$ $\Rightarrow$ greater HBM pressure $\Rightarrow$ greater benefit from hierarchical placement.** Long context is what forces the hierarchy to exist; the longer the contexts, the more the placement lever matters.
- **Higher input/output ratio $\Rightarrow$ greater prefill pressure $\Rightarrow$ stronger case for disaggregation.** Prefill-heavy workloads are exactly where specializing prefill resources and decoupling TTFT from TBT pays off.
- **Higher interconnect bandwidth $\Rightarrow$ lower $T_{\text{transfer}}$ and $T_{\text{retrieve}}$ $\Rightarrow$ stronger case for both disaggregation and hierarchical retrieval.** Bandwidth is the shared enabler: it moves the "move-versus-recompute" boundary in favor of moving.

The unifying idea is a single recurring comparison. Every non-trivial KV decision — reuse or recompute, retrieve from a lower tier or recompute, transfer to a decode worker or recompute locally — reduces to weighing the **cost of obtaining existing KV state** against the **cost of regenerating it**:

$$
\min\big(\, T_{\text{reuse}},\; T_{\text{retrieve}},\; T_{\text{transfer}} \,\big) \quad \text{versus} \quad T_{\text{recompute}}.
$$

Prefix reuse, hierarchical caching, and disaggregation are three settings of the same question, differing only in *where* the existing state currently lives (a sibling request's cache, a lower memory tier, or a prefill worker). Seeing them this way is the point of the unified model: it converts three separately-motivated systems into three regions of one decision surface, whose boundaries move predictably with $W$ and $H$.

---

## 10. Hardware Model

To keep the analysis general, hardware is treated as an **abstraction** rather than a fixed device. A hardware profile $H$ exposes:

- **compute throughput** (relevant to $c_{\text{prefill}}$ and decode step time),
- **HBM capacity** (how much KV and weights fit in the hot tier),
- **HBM bandwidth** (decode is bandwidth-bound, so this sets decode step time),
- **GPU–GPU interconnect bandwidth** (intra-node KV movement),
- **network bandwidth and latency** (inter-node KV transfer under disaggregation),
- **CPU DRAM capacity and bandwidth** (the warm tier),
- **storage characteristics** (the cold tier),
- **a cost model** (to compare configurations by infrastructure cost).

The three current-generation NVIDIA data-center GPUs named in Figure 1 — H100, H200, and B200 — differ primarily along the axes that matter for KV management: **HBM capacity** (which sets how much KV stays hot before offloading is forced) and **HBM/interconnect bandwidth** (which sets decode step time and the effective cost of moving KV). Qualitatively, moving from H100 to H200 to B200 increases both capacity and bandwidth; the exact device specifications are vendor-published and are not reproduced here because the analysis depends only on their *ordering and relative magnitude*, not on precise figures. Treating them abstractly is deliberate: the same serving problem posed against a higher-capacity, higher-bandwidth profile will, by the couplings of Section 9, shift the optimal configuration in predictable ways (Section 11), and that directional prediction is what the hardware model is for.

> We intentionally state no numeric hardware specifications or derived per-device results. Any such numbers would be either restatements of vendor marketing or fabricated benchmarks; neither belongs in an analysis whose claims are about *directions of change*, not measured quantities.

---

## 11. Analytical Design Study: How the Architecture Should Shift

Because we report no measurements, the "evaluation" here is a **qualitative analysis** of how the preferred configuration $A^{*}$ changes as $W$ and $H$ vary. We reason over four nested configurations, each adding one lever:

- **Configuration A — Monolithic, no reuse.** Every request recomputes its full prompt; prefill and decode share a worker. This is the baseline against which the levers are measured.
- **Configuration B — Prefix-aware.** Add RadixAttention-style reuse. Prefill work drops for shared prefixes; TTFT improves; a cache-aware scheduler is now required to realize hits.
- **Configuration C — Prefix-aware + hierarchical.** Add a KV-cache hierarchy. HBM pressure is relieved and larger effective caches (hence higher hit rates and longer contexts) become feasible, at the cost of a retrieve-versus-recompute decision and the effective-bandwidth problem it exposes.
- **Configuration D — Prefix-aware + hierarchical + disaggregated.** Separate prefill and decode. Resources specialize and the two SLOs decouple, at the cost of KV transfer over the network.

The analytical question is not "which configuration is best" — it is **"as a workload or hardware parameter moves, which lever starts to pay off, and which stops?"**

**Prefix reuse rate.** As the reuse fraction $\rho$ rises from near zero to high, the value of Configuration B over A grows monotonically: at low $\rho$ the radix machinery and its scheduling constraints add complexity for little gain, while at high $\rho$ reuse eliminates most prefill for the shared portion. The reuse lever is workload-gated: it is justified precisely when sharing structure exists.

**Context length.** As contexts lengthen, $S_{\text{KV}}$ grows linearly and HBM pressure mounts. Below some context regime, everything fits in HBM and the hierarchy (Configuration C) is dead weight; above it, offloading is forced and the hierarchy becomes necessary rather than optional. Long context is the trigger for the placement lever.

**Input/output ratio.** Input-heavy workloads concentrate cost in prefill and strengthen the case for disaggregation (Configuration D), since prefill resources can be specialized and scaled independently. Output-heavy (decode-dominated) workloads shift the binding constraint to HBM bandwidth on the decode side, weakening the disaggregation argument and emphasizing decode-worker provisioning instead.

**Interconnect / network bandwidth.** Higher bandwidth lowers both $T_{\text{transfer}}$ and $T_{\text{retrieve}}$, moving the move-versus-recompute boundary in favor of moving. Low-bandwidth environments push the optimum back toward recomputation and toward colocating prefill and decode to avoid transfer altogether; high-bandwidth fabrics make Configurations C and D increasingly attractive.

**HBM capacity.** Larger HBM raises the context and concurrency ceiling before offloading is forced, *delaying* the point at which the hierarchy is needed and allowing more KV to stay hot. It does not remove the hierarchy's value — reuse windows and long-tail contexts still overflow any fixed capacity — but it shifts where the hierarchy begins to matter.

**SLO tightness.** Tighter TTFT bounds argue for reuse and prefill specialization (B, D); tighter TBT bounds argue for decode-side bandwidth and capacity, and for admission control that rejects requests predicted to miss rather than degrading all in-flight decodes.

The recurring pattern is that **each lever has a workload/hardware regime in which it turns on.** The unified model's usefulness is that it predicts *which* regime activates *which* lever, from the couplings of Section 9, without requiring a single number.

---

## 12. Sensitivity Analysis (Qualitative)

Restating Section 11 as isolated one-parameter sweeps clarifies the direction of each effect. In every case the statement is directional, not quantitative.

- **Prefix reuse: $0\% \to 90\%$.** Prefill computation and TTFT fall; cache-retention pressure rises; scheduler cache-awareness becomes increasingly load-bearing.
- **Context length: short $\to$ very long.** $S_{\text{KV}}$ grows linearly; HBM overflows sooner; hierarchical placement transitions from unnecessary to mandatory; per-block retrieve-vs-recompute decisions multiply.
- **Network bandwidth: low $\to$ high.** $T_{\text{transfer}}$ and $T_{\text{retrieve}}$ fall; the optimum shifts from recompute/colocate toward retrieve/disaggregate.
- **HBM capacity: lower $\to$ higher.** More KV stays hot; offloading and disaggregation thresholds move outward; hit rates for a fixed reuse window improve.
- **Input/output ratio: input-heavy $\to$ output-heavy.** The binding phase moves from prefill to decode; the case for disaggregation weakens; decode bandwidth provisioning dominates.

These sweeps are consistent with, and derived from, the single move-versus-recompute comparison of Section 9. That consistency is the internal check on the framework: the levers do not have independent, hand-tuned behaviors; they are consequences of one relation evaluated under different parameters.

---

## 13. Mapping: Research Concepts to Engineering Dissections

This analysis is grounded in a set of **engineering dissections** — detailed, first-principles readings of the source systems — maintained separately as engineering implementations. The mapping from each research concept to its concrete realization is:

| Research concept (this article) | Grounding dissection |
| --- | --- |
| Prefix-aware KV reuse (§6) | [SGLang / RadixAttention](/engineering/sglang-radixattention-structured-lm-program-execution/) |
| KV cache as the memory bottleneck; paging (§2.1, §7) | [vLLM / PagedAttention](/engineering/vllm-pagedattention-efficient-memory-management-for-llm-serving/) |
| Hierarchical placement; retrieve-vs-recompute (§7) | [Strata](/engineering/strata-hierarchical-context-caching-long-context-llm-serving/) |
| Prefill–decode disaggregation; KV transfer (§8) | [Mooncake](/engineering/mooncake-kvcache-centric-architecture-for-serving-llm-chatbot/) |
| KV precision / footprint reduction (§14) | [LLM.int8()](/engineering/llm-int8-8-bit-matrix-multiplication-for-transformers-at-scale/) |

The engineering dissections are readings of existing systems, not a production inference engine, and this research article is an **analytical synthesis over them**, not an implementation. No serving system was built or benchmarked for this work; the artifacts are the formulation, the cost relations, and the design analysis above.

---

## 14. Related Work

We situate the work by category rather than by enumerating papers.

**LLM inference serving and memory management.** The recognition that serving is memory-bound, and that the KV cache — not compute — caps batch size, is due to PagedAttention/vLLM, which applies OS-style paging to the KV cache to eliminate fragmentation and enable copy-on-write sharing [vLLM]. This is the substrate on which the reuse, hierarchy, and disaggregation levers all operate.

**Prefix caching and structured reuse.** RadixAttention (SGLang) introduced automatic multi-level prefix sharing via a tree-structured, LRU-retained KV cache with cache-aware scheduling [SGLang]. Our reuse term (§6) is an abstraction of this mechanism.

**Hierarchical and offloaded KV cache.** Strata places KV across HBM/DRAM/storage and, crucially, identifies that *loading* offloaded KV is the true long-context bottleneck, addressing it with GPU-assisted I/O and decoupled layouts [Strata]. Our retrieve-vs-recompute relation (§7) and the effective-bandwidth caveat come from this line.

**Memory and prefill/decode disaggregation.** Mooncake disaggregates prefill and decode into SLO-specialized clusters over a pooled KV store with a cache-aware, SLO-predictive scheduler [Mooncake]. Our transfer term and disaggregation analysis (§8) abstract this design.

**KV-cache footprint reduction (orthogonal).** Reducing the bytes-per-element of stored state is complementary to managing where state lives. Quantization work such as LLM.int8() reduces the memory footprint of the model and, by extension, motivates reduced-precision KV [LLM.int8]; grouped-query attention reduces $n_{\text{kv}}$ directly. These shrink $S_{\text{KV}}$ and thereby relax every constraint in our formulation, but they operate on the *size* of KV rather than its *lifecycle*, and are therefore composable with the levers analyzed here.

**How this work differs.** We do not propose a new caching, placement, or disaggregation mechanism, and we do not claim any of the referenced mechanisms as our own. The distinction is one of *framing*: prior systems each optimize one facet of the KV lifecycle in isolation, whereas this article treats the three as coupled controls over a single quantity and reasons about their joint behavior under $(M, W, H, S)$. We make no claim that existing systems lack functionality they in fact possess.

---

## 15. Discussion

Several themes emerge from taking the KV-centric view seriously.

**Why KV management is now a first-class concern.** As context lengths grow and traffic exhibits heavy prefix sharing, the KV cache dominates both the memory budget and the redundant-computation budget. A serving system that reasons only about model FLOPs will misallocate resources, because the binding constraint has moved to memory capacity, memory bandwidth, and data movement.

**Why compute-only models are insufficient.** Two systems with identical model FLOPs can differ by large factors in achievable throughput and tail latency purely through KV-cache decisions — whether prefixes are reused, whether long contexts can be offloaded without stalling, whether prefill and decode contend for the same hardware. Compute is a lower bound on cost; KV management determines how close to that bound a system operates.

**Why workload characteristics are inputs, not afterthoughts.** The same architecture can be optimal or wasteful depending on reuse structure, context-length distribution, and input/output ratio. There is no workload-independent "best" configuration; $A^{*}$ is a function of $W$.

**Why hardware characteristics change the architecture, not just the numbers.** Because the move-versus-recompute boundary depends on bandwidth and capacity, a change of GPU generation can flip which lever is worth pulling — enabling a hierarchy that was previously not worth its complexity, or making transfer cheap enough that disaggregation becomes default. Hardware enters the *design*, not merely the throughput figure.

**Where the approach is useful.** As a reasoning tool for capacity planning and architecture selection: given a measured or estimated workload and a candidate hardware profile, the couplings predict which levers to enable and where the binding constraint will sit.

**Where it may fall short.** The framework is analytical and directional. It does not predict absolute latencies or exact GPU counts, it abstracts away scheduling dynamics and queueing under burstiness, and it assumes the cost relations (linear prefill, transfer time as size over effective bandwidth) hold well enough to preserve the *direction* of each comparison. Where those assumptions break — extreme fragmentation, adversarial arrival patterns, regimes where the quadratic attention term dominates prefill — the directional predictions should be re-examined.

---

## 16. Limitations

This is an analysis, and its limitations are those of analysis.

- **Analytical assumptions.** Prefill cost is modeled as approximately linear in processed tokens; transfer and retrieval as size over effective bandwidth plus overhead. These are first-order relations chosen to preserve the direction of comparisons, not to predict magnitudes.
- **No implementation or measurement.** No serving system was built or benchmarked. All claims are about the structure of the design space and the direction in which the optimum moves; none are empirical.
- **No large-scale validation.** The framework has not been validated against a physical GPU cluster; the qualitative predictions of Sections 11–12 are not confirmed by data here.
- **Hardware treated abstractly.** Only the ordering and relative magnitude of capacity and bandwidth across GPU profiles are used; precise device specifications are deliberately omitted.
- **Simplified network, queueing, and cache models.** Burstiness, admission-control dynamics, contention on shared links, and eviction-policy pathologies are abstracted away.
- **Runtime overheads not modeled.** Kernel launch, scheduling, index maintenance, and layout-transform costs are treated as lumped overhead terms.
- **Workload representativeness.** The reasoning presumes workloads with meaningful, characterizable structure (reuse fraction, length distributions); pathological or highly non-stationary traffic is outside scope.
- **Cost-model uncertainty.** Infrastructure cost is invoked as an objective but not instantiated with prices, which vary by deployment.

Stating these plainly is not a weakness of the article; it is what keeps its claims honest. The framework earns credibility by being explicit about the boundary between what it can and cannot say.

---

## 17. Threats to Validity

**Internal validity.** The conclusions follow from a small set of cost relations. If those relations misrepresent real system behavior — for example, if effective transfer bandwidth is so fragmentation-dominated that $T_{\text{transfer}}$ is not even monotone in link bandwidth — then the directional predictions could invert. The mitigation is that each relation is chosen to be robust in *sign* even when wrong in *magnitude*, and the source dissections (especially Strata's effective-bandwidth finding) are cited precisely where that robustness is most at risk.

**External validity.** The analysis assumes workloads with characterizable reuse and length structure. Production traffic that is highly non-stationary, adversarial, or dominated by unique long prompts may not exhibit the regimes in which the levers "turn on," limiting how far the conclusions generalize.

**Hardware validity.** Using only relative capacity/bandwidth ordering avoids dependence on specific specifications, but it also means the framework cannot speak to effects that depend on exact numbers (e.g., whether a particular model's KV fits in a particular HBM at a particular concurrency). Effective-utilization gaps between peak and achieved bandwidth are real and are only partially captured by the overhead terms.

**Workload validity.** The reuse fraction, context-length distribution, and input/output ratio are treated as known inputs. In practice they must be measured, and mis-estimating them would mislead the lever-selection reasoning.

**Modeling validity.** The linear-prefill and size-over-bandwidth approximations, the omission of queueing dynamics, and the lumping of runtime overheads all mean the model captures *tendencies*, not *runtimes*. Any use of this framework to make a concrete provisioning decision should be backed by measurement on the target system.

---

## 18. Conclusion

Efficient large-scale LLM serving requires reasoning jointly about computation, memory, cache reuse, and the movement of distributed KV state. Prefix reuse reduces redundant prefill by turning the cost of a request from a function of its prompt length into a function of its unmatched suffix. Hierarchical KV management extends the effective cache beyond GPU HBM, at the price of a per-block retrieve-versus-recompute decision whose outcome hinges on effective bandwidth. Prefill–decode disaggregation lets compute resources specialize and decouples the TTFT and TBT objectives, at the price of transferring KV across the cluster.

The contribution of this article is to show that these are not three separate optimizations but three settings of a single question — *is it cheaper to obtain existing KV state or to regenerate it?* — evaluated according to where that state currently lives. Framing serving as an SLO-aware KV-cache lifecycle problem, parameterized by model, workload, hardware, and SLOs, gives a compact way to reason about how the preferred architecture shifts as those parameters change: which lever activates in which regime, and where the binding constraint moves. The framework predicts directions, not magnitudes, and it makes no empirical claim; its worth is as a lens that turns a collection of point solutions into a coherent design space.

If there is a single takeaway, it is a reframing: the model is not the system. The system is the cache — and how it is reused, placed, and moved under constraint.

---

## References

- **[vLLM]** Kwon, W., Li, Z., Zhuang, S., Sheng, Y., Zheng, L., Yu, C. H., Gonzalez, J. E., Zhang, H., Stoica, I. *Efficient Memory Management for Large Language Model Serving with PagedAttention.* SOSP 2023. arXiv:2309.06180. Dissection: [vLLM & PagedAttention](/engineering/vllm-pagedattention-efficient-memory-management-for-llm-serving/).
- **[SGLang]** Zheng, L., Yin, L., Xie, Z., Sun, C., Huang, J., Yu, C. H., Cao, S., Kozyrakis, C., Stoica, I., Gonzalez, J. E., Barrett, C., Sheng, Y. *SGLang: Efficient Execution of Structured Language Model Programs.* NeurIPS 2024. arXiv:2312.07104. Dissection: [SGLang / RadixAttention](/engineering/sglang-radixattention-structured-lm-program-execution/).
- **[Strata]** Xie, Z., Xu, Z., Zhao, M., An, Y., Mailthody, V. S., Mahlke, S., Garland, M., Kozyrakis, C. *Strata: Hierarchical Context Caching for Long-Context LLM Serving.* arXiv:2508.18572, 2025. Dissection: [Strata](/engineering/strata-hierarchical-context-caching-long-context-llm-serving/).
- **[Mooncake]** Qin, R., Li, Z., He, W., Cui, J., Ren, F., Zhang, M., Wu, Y., Zheng, W., Xu, X. *Mooncake: A KVCache-centric Architecture for Serving LLM Chatbot.* USENIX FAST 2025. Dissection: [Mooncake](/engineering/mooncake-kvcache-centric-architecture-for-serving-llm-chatbot/).
- **[LLM.int8]** Dettmers, T., Lewis, M., Belkada, Y., Zettlemoyer, L. *LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale.* NeurIPS 2022. arXiv:2208.07339. Dissection: [LLM.int8()](/engineering/llm-int8-8-bit-matrix-multiplication-for-transformers-at-scale/).
