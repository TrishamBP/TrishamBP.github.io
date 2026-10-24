---
layout: post
title: "DeepInfer: By DeepSeek"
seo_title: "DeepInfer by DeepSeek: Open-Source Inference Engine for V4.1-Flash"
description: "DeepInfer by DeepSeek: the open-source inference engine behind DeepSeek-V4.1-Flash, its SM100 and Ascend 950 paths, and what the Apache-2.0 release leaves out."
lede: "DeepInfer is the high-performance inference framework behind DeepSeek's large-scale production services, now open-sourced for offline inference of DeepSeek-V4.1-Flash on NVIDIA SM100 GPUs and Huawei Ascend 950 NPUs."
keywords: "DeepInfer, DeepSeek DeepInfer, DeepSeek inference framework, DeepSeek-V4.1-Flash inference, LLM inference engine, open-source LLM inference, expert parallelism EPLB, speculative decoding, FlashMLA, DeepGEMM, DeepEP, NVIDIA SM100, Huawei Ascend 950"
highlight: "DeepInfer"
category: "LLM Inference"
meta: "LLM Inference"
date: 2026-10-24
author: Trisham Patil
tags: ["DeepInfer", "DeepSeek", "LLM Inference", "Expert Parallelism", "Speculative Decoding"]
logo: "/assets/blogs/deepinfer/deepseek-logo.png"
logo_alt: "DeepSeek whale logo for the DeepInfer inference framework"
source_url: "https://github.com/deepseek-ai/DeepInfer"
source_label: "GitHub repo"
specs:
  - { label: "Published", value: "24 Oct 2026", note: "signal post" }
  - { label: "Code license", value: "Apache-2.0", note: "open source" }
  - { label: "Model", value: "V4.1-Flash", note: "only" }
  - { label: "Hardware", value: "SM100 / Ascend 950", note: "NVIDIA + Huawei" }
  - { label: "Scope", value: "Offline engine", note: "not a hosted API" }
og_type: article
robots: "index, follow"
structured_data: BlogPosting
---

<!--
  SEO
    Title:             DeepInfer: By DeepSeek
    SEO title:         DeepInfer by DeepSeek: Open-Source Inference Engine for V4.1-Flash
    Meta description:  (159 chars) see `description` above
    Slug:              /signals/deepinfer-deepseek-inference-framework/
    Primary keyword:   DeepInfer
    Secondary:         DeepSeek inference framework, DeepSeek-V4.1-Flash inference, LLM inference engine,
                       open-source LLM inference, expert parallelism (EP + EPLB), speculative decoding (DSpark),
                       FlashMLA / DeepGEMM / DeepEP, NVIDIA SM100, Huawei Ascend 950
    Internal links:    /engineering/deepseek-v41-flash-kv-cache-compression-agentic-llm-inference/
                       /engineering/eagle-3-speculative-decoding-llm-inference-acceleration/
                       /engineering/deepseek-v3-auxiliary-loss-free-moe-mtp-fp8-training/
    Source:            https://github.com/deepseek-ai/DeepInfer

  Body is written one section at a time, on request only.
-->

## DeepInfer Project Overview: DeepSeek's Production Inference Framework
{: data-eyebrow="01 / Project overview"}

**DeepInfer** is the inference framework behind DeepSeek's large-scale production services. This open-source release provides **offline inference for DeepSeek-V4.1-Flash** on **NVIDIA SM100 GPUs** and **Huawei Ascend 950 NPUs**.

The README lists its main features:

- **Optimized kernels** for the model and sampler runtime
- **Attention data parallelism (DP)** and **context parallelism (CP)**
- **MoE expert parallelism (EP) with EPLB**, the expert-parallel load balancer
- **DSpark speculative decoding**
- **SWA bounded replay**
- **Batch-invariant inference**
- **Structured outputs**

DeepSeek's deployment Q&A for DeepInfer also discusses two systems ideas: **PD disaggregation** and **DP load balancing**. Both are critical for running massive Mixture-of-Experts models like DeepSeek-V3 and V4 efficiently at scale.

> **Not in this release.** DeepInfer ships the engine. The README lists Prefill/Decode disaggregation and load balancing across data-parallel replicas as required for a complete inference service, but not included here.

### 1. What Is PD Disaggregation (Prefill-Decode Disaggregation)?

PD disaggregation splits the two phases of LLM inference, **prefill** and **decode**, onto separate, specialized clusters or worker nodes.

<div class="fn-cards fn-cards--two">
  <div class="fn-card">
    <p class="fn-card-tag">Phase 1 / Compute-bound</p>
    <h4 class="fn-card-title">Prefill</h4>
    <p class="fn-card-text">The prefill worker processes the whole prompt at once in one large parallel matrix operation and builds the initial key-value (KV) cache. This stage needs high compute throughput.</p>
  </div>
  <div class="fn-card">
    <p class="fn-card-tag">Phase 2 / Memory-bandwidth-bound</p>
    <h4 class="fn-card-title">Decode</h4>
    <p class="fn-card-text">The model then generates output tokens one at a time, autoregressively. Every token re-reads the model weights and KV cache from memory, so memory bandwidth, not raw compute, is the bottleneck.</p>
  </div>
</div>

#### Why Disaggregate Prefill and Decode?

In a standard **collocated** setup, one set of GPUs handles both stages. A long prompt then causes a **prefill spike** that blocks ongoing decode for other users and adds latency jitter.

With disaggregation, dedicated **prefill nodes** process prompts and stream the resulting KV cache over fast interconnects (NVLink, InfiniBand / RDMA) to **decode nodes**. In DeepSeek's deployment the KV cache is fetched from their **3FS** file system into host memory and swapped into GPU memory over RDMA.

This removes resource contention between the two phases. It lowers **Time-to-First-Token (TTFT)** and keeps inter-token latency smooth. DeepSeek's Q&A notes that TTFT and time-between-tokens can then be tuned independently, with a prefill-to-decode GPU ratio of roughly 1:1.

### 2. What Is DP (Data Parallelism) and DP Load Balancing?

Here, **DP means data parallelism**: specifically attention data parallelism, or data-parallel replicas.

#### What DP Means in a MoE Inference System

DeepSeek models are massive **Mixture-of-Experts (MoE)** architectures, so they are sharded with schemes like **expert parallelism (EP)** and **tensor parallelism (TP)**. To scale to thousands of GPUs, DeepSeek also replicates parts of the model across groups using data parallelism. As in the DeepSeek-V3 / R1 inference system, attention runs data-parallel with #DP = #EP.

#### The Load Imbalance Problem

Real-world requests are chaotic. One prompt is 50 tokens with a 2,000-token response; another is a 10,000-token document with a one-word answer.

If requests are distributed blindly, some DP replicas end up overloaded with heavy computation while others sit idle.

#### How DP Load Balancing Fixes It

**DP load balancing** is the routing and scheduling layer that spreads incoming requests across data-parallel replicas based on load. Per the Q&A, engines pull work according to their remaining compute quota, and each request goes to the DP rank with the lowest current load.

The goal is high hardware utilization across the cluster. DeepSeek reports its balancing reaches **roughly 80% of a perfectly balanced offline benchmark**.
