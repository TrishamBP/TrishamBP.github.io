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
image: "/assets/blogs/deepinfer/deepinfer-deepseek-sm100-hero.png"
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

![DeepInfer by DeepSeek hero: a stylized NVIDIA SM100 Blackwell GPU board with two compute dies, a die-to-die link and eight HBM3e stacks, beside the DeepSeek whale logo](/assets/blogs/deepinfer/deepinfer-deepseek-sm100-hero.png)
*An illustrative SM100-class board, one of the two hardware targets of the DeepInfer release. Drawn for this post; not an NVIDIA floor plan.*

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

## DeepInfer vs Mooncake: Two Approaches to PD Disaggregation
{: data-eyebrow="02 / Comparison"}

Moonshot AI's **Mooncake** and DeepSeek's production architecture, which DeepInfer comes from, both use **Prefill-Decode (PD) disaggregation**. They were built to remove different bottlenecks, though.

Mooncake was designed from the start as a **KV-cache-centric** storage and serving platform for the ultra-long-context Kimi models. DeepSeek's inference design is tuned for **compute efficiency in massive Mixture-of-Experts (MoE) models** and for **Multi-head Latent Attention (MLA)**.

### Summary Comparison: Mooncake vs DeepSeek

| Metric / feature | Moonshot AI's Mooncake | DeepSeek's architecture |
|---|---|---|
| Primary design goal | Ultra-long-context management and global KV cache reuse | MoE throughput and low-latency execution |
| Cache hierarchy | Multi-tier pool: GPU VRAM → CPU DRAM → SSD / NVMe | Compact MLA cache moved over GPU-to-GPU and RDMA fabric; the 3FS SSD tier holds the on-disk context cache |
| Attention mechanism | Attention-agnostic: it stores whatever KV cache the engine produces (Kimi K2 itself uses MLA) | MLA, which compresses the KV cache inside the model |
| Ecosystem status | Open-source modular middleware that plugs into vLLM and SGLang | Open kernels (FlashMLA, DeepGEMM, DeepEP), 3FS and now the DeepInfer engine; PD and DP-balancing orchestration stays internal |

<div class="fn-cards">
  <div class="fn-card">
    <p class="fn-card-tag">Difference 01 / Design focus</p>
    <h4 class="fn-card-title">Context vs compute</h4>
    <p class="fn-card-text">Mooncake manages very long contexts and a global key-value (KV) cache store. DeepSeek focuses on compute efficiency for massive MoE models and on fast network transfers.</p>
  </div>
  <div class="fn-card">
    <p class="fn-card-tag">Difference 02 / KV cache</p>
    <h4 class="fn-card-title">Store more vs store less</h4>
    <p class="fn-card-text">Mooncake spreads the KV cache across GPU memory, CPU memory and SSDs. DeepSeek shrinks the cache inside the model with MLA, then moves the compressed cache between nodes over high-speed interconnects.</p>
  </div>
  <div class="fn-card">
    <p class="fn-card-tag">Difference 03 / Open source</p>
    <h4 class="fn-card-title">Middleware vs building blocks</h4>
    <p class="fn-card-text">Moonshot AI ships Mooncake as open middleware for standard engines like vLLM. DeepSeek releases kernels and now the DeepInfer engine, but keeps production orchestration and data-parallel load balancing private.</p>
  </div>
</div>

### Where Mooncake and DeepSeek Agree

Both systems are answers to the same problem: serving large language models cheaply at scale. They share four engineering principles.

<div class="fn-cards fn-cards--two">
  <div class="fn-card">
    <p class="fn-card-tag">Shared 01 / Phase split</p>
    <h4 class="fn-card-title">Prefill and decode separation</h4>
    <p class="fn-card-text">Both split prefill and decode onto different hardware nodes, so the two phases stop competing for the same processors.</p>
  </div>
  <div class="fn-card">
    <p class="fn-card-tag">Shared 02 / Latency</p>
    <h4 class="fn-card-title">Lower time to first token</h4>
    <p class="fn-card-text">Both cut time to first token and keep token generation fast and steady under heavy user traffic.</p>
  </div>
  <div class="fn-card">
    <p class="fn-card-tag">Shared 03 / Data movement</p>
    <h4 class="fn-card-title">KV transfer and routing</h4>
    <p class="fn-card-text">Both move large volumes of KV state between nodes over high-speed cluster networks, and route requests to where that state lives.</p>
  </div>
  <div class="fn-card">
    <p class="fn-card-tag">Shared 04 / Utilization</p>
    <h4 class="fn-card-title">No idle hardware</h4>
    <p class="fn-card-text">Both balance load across compute units to keep processor utilization high and avoid idle GPUs in the cluster.</p>
  </div>
</div>

> **The short version.** Mooncake makes room for a huge KV cache. DeepSeek makes the KV cache small enough that it rarely needs that much room. For how MLA shrinks the cache, see the [DeepSeek-V2 MLA breakdown](/engineering/deepseek-v2-mixture-of-experts-mla-language-model/) and the [DeepSeek-V4.1-Flash KV cache compression article](/engineering/deepseek-v41-flash-kv-cache-compression-agentic-llm-inference/).

## Inside the DeepInfer Codebase: The Engine Core Files
{: data-eyebrow="03 / Engine core"}

### The Offline LLM API: `llm.py` and `SamplingParams`

Users talk to DeepInfer through the **`LLM` class** in `llm.py`, which the package's `__init__.py` exports. `LLM` wraps the engine, exposes the tokenizer and offers a batched **`generate()`** call.

Each request is configured by **`SamplingParams`** in `sampling_params.py`. It covers temperature, top-p / top-k, logprobs, stop conditions and seeds, and it validates its arguments before anything reaches the engine.

This walkthrough starts at `llm.py` and follows its imports outward, so every file covered later can be reached from this API.

### The `LLMEngine` Class: DeepInfer's Inference Loop

The **`LLMEngine`** class manages text generation for large language models. It uses three techniques to get maximum throughput:

- **Iteration-level scheduling:** the batch is chosen again at every step, so new requests join and finished requests leave without waiting for the whole batch.
- **Parallel GPU workers:** one worker process per GPU runs the model.
- **KV cache memory management:** the engine divides GPU memory into blocks and gives blocks to sequences as they grow.

The explanations below follow the **Simplified Technical English (ASD-STE100)** style: short sentences, active voice and standard technical terms.

#### How DeepInfer Runs Inference: The Step Loop

Text generation runs in a continuous loop. Each cycle is one **inference step**, the `step()` function.

1. **Add requests.** Clients add prompts with `add_request()`. The engine checks the token IDs and validates multi-modal inputs. Then it puts each request in the scheduler's waiting queue.
2. **Schedule the iteration.** In `step()`, the engine asks the **scheduler** to select a batch of sequences. The scheduler decides between a **prefill** phase (process new prompts) and a **decode** phase (generate the next tokens).
3. **Execute the model.** The engine sends the metadata and the scheduled blocks to the backend workers (`_execute_model_async_step`). The workers run the GPU forward pass and sample the tokens.
4. **Process the outputs.** The engine reads the sampler outputs (`_process_model_outputs`). It updates the sequence states, handles **multi-token prediction (MTP)** and packages the new tokens into request outputs.
5. **Release resources one step later.** Memory cleanup must not block the GPU. So the engine collects old resources in `DeferredRelease` and releases them in the next step, while the GPU computes.

```mermaid
flowchart TD
    C["Client"] -->|"add_request()"| V["Validate token IDs<br/>and multi-modal inputs"]
    V --> Q["Scheduler waiting queue"]
    Q --> S["step()"]
    S --> R["pre_sampler_sync()<br/>release the previous step's resources"]
    R --> SCH{"Scheduler<br/>selects a batch"}
    SCH -->|"new prompts"| PF["Prefill phase"]
    SCH -->|"running sequences"| DC["Decode phase"]
    PF --> EX["_execute_model_async_step()"]
    DC --> EX
    EX --> W["GPU workers<br/>forward pass + sampling"]
    W --> PO["_process_model_outputs()<br/>update states, handle MTP"]
    PO --> OUT["Request outputs"]
    OUT --> C
    PO --> PP["post_process()<br/>metrics + collect into DeferredRelease"]
    PP -->|"next iteration"| S
```

*The DeepInfer `LLMEngine` request flow. Resources collected in one step are released at the start of the next one, so cleanup overlaps with GPU work.*

#### `LLMEngine` Function Reference

**Resource and worker management**

| Function | What it does |
| --- | --- |
| `DeferredRelease.__init__` | Initializes the container that delays memory cleanup. |
| `DeferredRelease.collect_sequence_metadata` | Adds the metadata of finished sequences to the release queue. |
| `DeferredRelease.collect_request_outputs` | Stores old request output IDs for removal later. |
| `DeferredRelease.collect_clone_unpins` | Records the GPU states and blocks to unpin after synchronization. |
| `DeferredRelease.release` | Frees sequence metadata, request outputs and memory blocks safely. |
| `_spawn_worker` | Makes the available GPUs visible to the CUDA driver and starts a parallel `Worker` process. |

**Initialization and lifecycle**

| Function | What it does |
| --- | --- |
| `LLMEngine.__init__` | Initializes the core engine: configuration, tokenizer, multi-modal processors, parallel workers, memory block managers and the scheduler. |
| `LLMEngine._create_scheduler` | Creates and configures the **C++ scheduler** from the cache blocks, the parallel groups and the FLOPs estimators. |
| `LLMEngine.so_matcher_builder` (property) | Builds the structured output matcher for constrained generation, the first time it is needed. |
| `LLMEngine.so_builder_has_pending` | Checks for structured output compilation tasks that are not finished. |
| `LLMEngine.__del__`, `LLMEngine.close` | Shut down the background threads, profile servers and parallel workers, so that no memory leaks. |
| `LLMEngine._init_workers` | Starts the non-driver context-parallel worker processes and initializes the main driver worker. |
| `LLMEngine._init_cache` | Profiles the free GPU memory, calculates a safe number of blocks, initializes the KV cache engines and warms up the model. |
| `LLMEngine.from_engine_args` (class method) | Factory method. Creates an `LLMEngine` from parsed command-line or configuration arguments. |

**Request management**

| Function | What it does |
| --- | --- |
| `LLMEngine.add_request` | Receives a new generation request. Validates the token IDs, processes images or videos if present, creates a `Sequence` object and adds it to the scheduler queue. |
| `LLMEngine.abort_request` | Cancels one or more running or waiting requests by request ID and frees their memory blocks. |
| `LLMEngine.get_num_unfinished_requests` | Returns the number of running and waiting requests. |
| `LLMEngine.has_unfinished_requests` | Checks all data-parallel ranks for unfinished requests. |
| `LLMEngine.get_nextn_pad_token_ids` | Returns the padding token IDs for multi-token prediction (MTP) and speculative decoding. |

**Model execution and output processing**

| Function | What it does |
| --- | --- |
| `LLMEngine.step` | Runs one full inference iteration. Schedules the requests, clones or zeros states if necessary, starts model execution on the workers and returns the new token outputs. |
| `LLMEngine._execute_model_async_step` | Tells the workers to run the forward pass and sampling asynchronously. |
| `LLMEngine._process_model_outputs` | Receives the raw sampler outputs from the workers. Processes MTP information, updates the sequence status in the scheduler, logs performance statistics and builds the request outputs. |
| `LLMEngine.do_copy_state` | Copies GPU state buffers asynchronously for specified sequences, during KV cache saves or prefix caching. |
| `LLMEngine.flush_inflight_reqs` | Flushes and processes all in-flight requests in **zero-overhead scheduling** mode. |
| `LLMEngine.post_process` | Cleans up after the workers finish a step. Processes the model outputs, updates runtime metrics and collects metadata for deferred release. |
| `LLMEngine.pre_sampler_sync` | Runs before the sampler synchronizes. Frees the deferred resources and saves KV cache states. |

**Hooks (extension points)**

These are virtual hook functions. Subclasses override them to implement custom serving architectures, prefix caching strategies or special logging:

`init_pd_split`, `finalize_seq`, `post_schedule`, `should_copy_state`, `do_save_kvcache`, `pe_prepare_save_kvcache`, `pe_do_save_kvcache`, `process_output`, `send_processed_prompts`, `post_process_model_outputs`, `build_extra_metrics_log`

> **Why the hooks matter.** `init_pd_split` is a hook on the open-source engine. The README says Prefill/Decode disaggregation is not in this release. These extension points are where a full serving stack can add it.

### Engine Configuration: `arg_utils.py` and `config.py`

Before the engine starts, **`arg_utils.py`** turns the constructor and CLI arguments into four validated config objects, all defined in **`config.py`**:

| Config object | What it decides |
| --- | --- |
| `ModelConfig` | The model: checkpoint, architecture and shape |
| `CacheConfig` | The KV cache: block size and memory budget |
| `ParallelConfig` | The parallel layout across GPUs (data, context and expert parallelism) |
| `SchedulerConfig` | How the scheduler batches requests at each step |

On the Hugging Face side, **`hugging_face/config.py`** translates a checkpoint's `config.json` into the internal model config. That includes the **attention**, **MoE**, **DFlash**, **Engram**, **RoPE/YaRN** and **vision** sub-configs.

Together, these objects decide the **model shape** and the **parallel layout** that the rest of this tour assumes.

**Referenced components:** `arg_utils.py` · `config.py` · `hugging_face/config.py`

### LLMEngine Orchestration: The Conductor of DeepInfer

`LLMEngine` has one of the highest fan-outs in the import graph. It's the conductor of the whole system:

- It **spawns the workers** and **sets up the KV cache**.
- It **schedules requests** through the C++ scheduler.
- It **runs model steps asynchronously**, handles **MTP state** and builds the **request outputs**.

The **stats logger** reports **throughput**, **MFU** (model FLOPs utilization), **MTP acceptance** and **MoE load balance**. That makes it a good place to see which metrics matter in production.

**Referenced components:** `llm_engine.py` · `stats_logger.py` · `engine_type.py`

### Native C++ Scheduler: Continuous Batching Off the Python Critical Path

To keep scheduling off the Python critical path, DeepInfer writes its **continuous-batching scheduler in C++**. It manages:

- the **waiting and running queues**,
- **chunked prefill** and **preemption**,
- allocation of **paged KV blocks** from an **LRU-ordered `BlockManager`**.

`sequence.hpp` defines the request state that the scheduler tracks. `pybind_scheduler.cpp` exposes all of it to `LLMEngine` as the **`deepinfer._C.engine`** module, and `engine.pyi` describes that module's typed interface.

> **Language lesson: pybind11 and `.pyi` stubs.** pybind11 binds C++ classes and functions as Python objects. Hot loops like scheduling run natively, while the orchestration code stays in Python. A `.pyi` stub file gives IDEs and type checkers the signatures of a compiled extension, which they can't inspect directly.

**Referenced components:** `scheduler.hpp` · `block_manager.hpp` · `sequence.hpp` · `pybind_scheduler.cpp` · `engine.pyi`

### Workers and Process Groups

Each GPU or NPU rank runs a **`Worker`**. The worker carries out one full model step for the engine: **prepare, forward, sample and post-process**.

Workers coordinate through the **process groups** that `parallel_state.py` creates for **data, context, expert and Engram parallelism**. Engine-to-worker messages go through **`shm_broadcast`**, a shared-memory ring buffer derived from vLLM. It's a low-latency channel with **one writer and many readers**.

**Referenced components:** `worker.py` · `parallel_state.py` · `shm_broadcast.py`

### Model Runner and KV Cache

Inside each worker, **`ModelRunner`** loads the model, prepares the input tensors and `InputMetadata`, runs the forward pass and sampling, and profiles memory.

**`CacheEngine`** sizes and allocates the **paged KV and state caches** behind the blocks that the C++ `BlockManager` hands out. It uses separate layouts for **sliding-window**, **compressed** and **sparse-index** attention layers.

**CUDA graphs** are captured and replayed across padded decode batch sizes, which cuts kernel launch overhead.

**Referenced components:** `model_runner.py` · `cache_engine.py` · `cuda_graph_runner.py` · `input_metadata.py`

### Loading DeepSeek Weights

`model_loader.py` picks the model architecture from the **registry** and builds the model on the **meta device**. Then it loads the Hugging Face **safetensors** weights through `weights.py`, with a **watchdog** guarding the load.

Building on the meta device avoids allocating memory for parameters that will be overwritten anyway. The loader also sets up **per-expert and Engram-table coverage**, which is how the routed MoE experts end up spread across the expert-parallel ranks.

**Referenced components:** `model_loader.py` · `weights.py`

### DeepSeek Model Architecture: `deepseek.py`

`deepseek.py` has the **largest fan-out in the codebase**. It stacks the decoder layers together with the embeddings, **YOCO** and the **Engram runtime**. Its causal-LM wrapper handles **EPLB**, sampling and **DFlash MTP**.

Each decoder layer combines two blocks:

- **MLA attention**, with sliding-window plus compressed and sparse KV.
- A **MoE block** that handles gating, EPLB-aware routing, and dispatch/combine with **FP8/FP4 expert weights**.

This is where the README's **attention parallelism** and **MoE expert parallelism** features are implemented.

**Referenced components:** `deepseek.py` · `decoder_layer.py` · `attn.py` · `mlp.py`

### Expert Load Balancing (EPLB)

MoE routing is uneven: some experts get far more tokens than others. So the **EPLB** subsystem tracks how many tokens each expert receives. It periodically recomputes where the **physical expert replicas** should live and moves their weights between ranks.

`policy.py` implements the **greedy replication and placement algorithm**, based on historical token statistics. Its output feeds the routing in the MoE layer described above.

**Referenced components:** `policy.py`

### Sampling and Speculative Decoding (DFlash)

The **`Sampler`** turns hidden states into tokens. It handles **prompt logprobs**, **structured-output masks** and the **verification of MTP/DFlash draft tokens**.

**DFlash** is the speculative-decoding module. It proposes draft tokens with lightweight draft decoder layers and a **confidence head**. The scheduler uses those confidence scores to decide **how many draft tokens to verify**. The results go back to the engine in the sampler output containers from `sequence.py`.

**Referenced components:** `sequence.py`

### Structured Output Constraints

Structured outputs (**regex, JSON schema, EBNF**) are built on **xgrammar**:

- The **compiler** caches compiled grammars.
- The **matchers** track which tokens are allowed at each step and fill a **vocabulary bitmask**.

Matchers are built **asynchronously on a thread pool**, so grammar compilation doesn't stall decoding. A **TileLang kernel** inside the `Sampler` then applies the bitmask to the logits.

### TileLang Kernel Dispatch: `ops.py`

Many of the hot paths above call custom **TileLang** kernels through **`ops.py`**, one of the most-imported files in the codebase.

`ops.py` imports the backend for the current platform (**`cuda`** for SM100 or **`asc`** for Ascend) and re-exports its `*_tl` kernel factories. If that backend doesn't provide a kernel, it raises **`KernelUnavailableError`**. Comparing the CUDA and Ascend versions of the same fused sampling kernel shows how one algorithm is written for two different accelerators.

> **Language lesson: module-level `__getattr__` (PEP 562).** A module-level `__getattr__` lets a Python module resolve attributes lazily, when they're accessed. `ops.py` uses it to raise a clear `KernelUnavailableError` for kernels missing on the current backend, instead of failing at import time.

**Referenced components:** `ops.py` · `fused_sample.py` (CUDA) · `fused_sample.py` (Ascend) · `store_kv_cache.py`

### Hardware Abstraction: `deep_cluster`

The **`deep_cluster`** hardware package exposes a hardware-neutral **device discovery API**: accelerator kind, visible devices, NUMA node and GPU counts. It's how the code above decides between the **NVIDIA and Ascend** code paths.

At the native level, `pybind.cpp` registers the `cuda_utils`, `engine` and `graph_timer` submodules into a **single torch extension**.

**Referenced components:** `__init__.py` · `device.py` · `pybind.cpp`

### Building the Project

- **`build.sh`** is the one-shot build script. It validates `DEEPINFER_ACCELERATOR`, installs the matching requirements and builds everything.
- **`setup.py`** compiles the `deepinfer._C` extension as either a **`CUDAExtension`** or an **Ascend `NpuExtension`**.
- The **`Makefile`** provides per-accelerator build, stub-generation and formatting targets.
- **`pyproject.toml`** configures packaging, pytest markers and Ruff linting.

> **Language lesson: Makefile targets.** Makefile targets declare build steps with dependency tracking. **Phony targets** such as `clean` or `format` name actions, not files. Variables like the accelerator type let one target serve several build configurations.

**Referenced components:** `build.sh` · `setup.py` · `Makefile` · `pyproject.toml`

## DeepInfer End-to-End Request Flow: Architecture Diagrams
{: data-eyebrow="04 / Request flow"}

Section 03 toured the files. This section follows the **data**: five diagrams that trace a request from the entry point, through speculative decoding, expert parallelism and kernel dispatch, and back out as text.

### 1. How a Request Moves from the Entry Point to the Model

```mermaid
sequenceDiagram
    autonumber
    participant U as User code
    participant LLM as LLM<br/>entrypoints/llm.py
    participant E as LLMEngine<br/>engine/llm_engine.py
    participant SO as SOMatcherBuilder / MultimodalProcessor
    participant S as C++ Scheduler<br/>csrc/engine (pybind)
    participant W as Worker driver, CP rank 0<br/>worker/worker.py
    participant F as Follower workers, CP ranks 1..N
    participant MR as ModelRunner<br/>worker/model_runner.py
    participant M as DeepseekForCausalLM

    U->>LLM: generate(prompts, SamplingParams)
    LLM->>LLM: tokenizer.encode(prompt)
    LLM->>E: add_request(request_id, params, prompt_token_ids)
    E->>SO: rewrite image tokens / build grammar matcher (async)
    SO-->>E: _enqueue(seq)
    E->>S: scheduler.add_sequence(Sequence)
    loop LLM._run_engine: while has_unfinished_requests
        LLM->>E: step()
        E->>S: schedule(sequence_metadata_pool)
        S-->>E: seq_metadata_list, SchedulerOutputs<br/>(prefill or decode, blocks, clones)
        E->>W: run_workers("execute_model_step")
        W->>F: cp_broadcast_object(method, kwargs)
        W->>MR: execute_main_model()
        MR->>MR: _prepare_input → InputMetadataV4<br/>(C++ prepare_tensor_input_v4 / ZOS)
        alt decode with captured batch size
            MR->>M: cuda_graph_runner.replay()
        else prefill / eager
            MR->>M: model(kv_caches, input_metadata)
        end
        W->>W: post-process PREVIOUS step (ZOS overlap)
        W->>MR: execute_sample() → model.sample() → Sampler
        W->>E: callback post_process → _process_model_outputs
        E->>S: C++ updates sequences, builds RequestOutput
        E-->>LLM: RequestOutput[]
    end
    LLM->>LLM: tokenizer.decode(token_ids)
    LLM-->>U: outputs
```

*A DeepInfer request from `LLM.generate()` to the model and back. The step loop repeats until no request is unfinished.*

**What matters here:**

- **The scheduler runs in C++.** Block management, sequences and output building are exposed through `csrc/engine/pybind_scheduler.cpp`, `pybind_sequence.cpp` and `pybind_output.cpp`. Python mostly coordinates.
- **Zero-overhead scheduling (ZOS).** `Worker.execute_model_step` runs four phases:
  1. forward the current step,
  2. post-process the previous step,
  3. sample the current step,
  4. post-process the current step.

  On ZOS decode steps, phase 4 moves into the next step. So the CPU bookkeeping overlaps with the GPU forward pass.
- **One driver plus followers.** The driver worker (CP rank 0) lives in the engine process. `_init_workers` starts the follower processes for context parallelism. They run `start_slave_worker_loop` and receive each method call through `cp_broadcast_object`.

### 2. How Speculative Decoding Works: DFlash MTP

The draft model is **DFlash** (`model_executor/models/mtp/dflash.py`). It reads hidden states from selected layers of the main model (`dspark_target_layer_ids`) and proposes a **block of draft tokens**. The next step verifies those drafts. Draft proposals carry over between steps in a GPU-resident **`MTPInfoPool`**.

```mermaid
flowchart TD
    subgraph STEP_N["Decode step N"]
        direction TB
        A["Main model forward<br/>input = last token + drafts from step N-1"] --> B["DeepseekDecoderLayer<br/>captures hidden states of target layers<br/>into dflash_input"]
        B --> C["DFlash.update_main_cache<br/>projection → main_kv_proj<br/>writes main-token keys into DFlash KV cache"]
        C --> D["hidden_states → Sampler"]

        subgraph VERIFY["Sampler._verification"]
            direction TB
            V1["prepare_verification_metadata<br/>map rows to request and step, mark draft rows"] --> V2["apply_token_bitmask<br/>structured output mask"]
            V2 --> V3["process_sampling → fused_sample kernel<br/>temperature, top-p/k, rejection test<br/>against draft logprobs from MTPInfoPool"]
            V3 --> V4["get_accept_result<br/>accepted prefix per request,<br/>resample at first rejection"]
            V4 --> V5["finalize_verification<br/>pack verified tokens and acceptance stats"]
        end
        D --> V1

        subgraph DRAFT["mtp_module.decode_forward"]
            direction TB
            P1{"DFlash CUDA graph<br/>captured?"} -->|yes| P2["DFlashCudaGraphRunner.replay"]
            P1 -->|no| P3["run_drafts"]
            P2 --> P3b["build_dflash_input<br/>fixed-stride draft metadata"]
            P3 --> P3b
            P3b --> P4["forward_drafts<br/>DFlashDecoderLayer × N on golden token"]
            P4 --> P5["sample_drafts<br/>+ ConfidenceHead (confidence_head_fused)"]
            P5 --> P6["MTPInfoPool.store<br/>draft ids, logprobs, confidence"]
        end
        V5 --> P1
    end

    P6 -. "read by verification in step N+1" .-> V3
    V5 --> OUT["SamplerOutput: accepted tokens + new token<br/>→ C++ scheduler appends to sequence"]
    OUT --> SCH["Scheduler.update_mtp_runtime<br/>forward/sample timings → schedule_mtp_varlen<br/>picks per-request draft length (MTP varlen)"]
    SCH -. "next step's query lengths" .-> A
```

*One DFlash decode step: verify the previous step's drafts, then propose new drafts for the next step.*

**Notes:**

- **Prefill does no extra draft work.** `update_main_cache` fills the DFlash KV cache during the main forward pass.
- **Rejected draft positions need no masking.** Keys are written for every position. The next `forward_drafts` overwrites the rejected slots before anything reads them (from the docstring of `update_main_cache`).
- **The speculative decoding kernels** live in `tilelang_ops/sampler.py`, `fused_sample.py`, `dflash.py`, `store_mtp_info.py` and `schedule_mtp_varlen.py`, each with `cuda/` and `asc/` backends.
- **Variable draft length** is controlled by `DEEPINFER_ENABLE_MTP_VARLEN`. Measured step timings feed back into the scheduler.

For the idea behind draft-and-verify decoding, see the [EAGLE-3 speculative decoding breakdown](/engineering/eagle-3-speculative-decoding-llm-inference-acceleration/).

### 3. How Expert Parallelism and DeepEP Fit In

Experts are split across the **expert-parallel (EP) group** (`parallel_state.py` → `expert_parallel_group`). Each MoE layer (`v4_modules/mlp.py: DeepseekMoE`) sends tokens to the ranks that own their experts with **DeepEP's `EPBuffer`**, then gathers the results back. **EPLB** rebalances which rank holds which expert.

```mermaid
flowchart TD
    H["hidden_states from attention<br/>(FP8 or BF16)"] --> MEGA{"use_mega_moe?"}

    MEGA -->|yes| MM["mega_moe_forward<br/>deep_gemm.fp8_fp4_mega_moe / bf16_mega_moe<br/>fused dispatch + GEMM + combine<br/>over deep_gemm SymmBuffer"]

    MEGA -->|no| G["gate_forward<br/>GPU: deep_gemm.bf16_mega_gate<br/>else: tile_kernels moe_topk_gate"]
    EPLBMAP[("EPLB layer state<br/>logical_to_physical_map<br/>logical_count")] --> G
    G --> TK["topk_idx (physical experts), topk_weights"]

    TK --> DISP["dispatch: DeepEP EPBuffer.dispatch<br/>optional FP8 dispatch<br/>limited to DEEPINFER_USERBUFFER_COMM_SMS"]
    DISP -->|all-to-all across EP ranks| RX["tokens received for local experts<br/>+ psum_num_recv_tokens_per_expert"]
    RX --> GEMM["routed_experts_forward<br/>deep_gemm m_grouped_fp8_fp4 / bf16<br/>contiguous grouped GEMM"]
    GEMM --> CAP["ep_buffer.capture event"]
    H --> SH["shared_forward<br/>shared expert, overlapped with comm"]
    CAP --> COMB["combine: DeepEP EPBuffer.combine<br/>+ shared expert output"]
    SH --> COMB
    COMB -->|all-to-all back| OUT["moe_combined_hidden → next layer"]
    MM --> OUT

    subgraph BUF["userbuffer singleton (parallel_utils/userbuffer.py)"]
        UB1["allocate_ep → DeepEP EPBuffer"]
        UB2["allocate_sym_buffer → deep_gemm SymmBuffer"]
        UB3["CP: DeepEP-V2 BucketBuffer → CPManager"]
    end
    UB1 -.-> DISP
    UB2 -.-> MM

    subgraph LB["EPLB (model_executor/eplb)"]
        L1["expert_lb.step after each sample<br/>accumulate per-expert token load"] --> L2["policy.py: recompute replication<br/>+ greedy rank placement"]
        L2 --> L3["shuffle.py: move expert weights in place<br/>NCCL batched P2P or symmetric memory"]
    end
    L3 -.-> EPLBMAP
```

*The DeepInfer MoE layer: gate, DeepEP dispatch, grouped GEMM and combine, or the fused mega-MoE path. EPLB updates the expert map in the background.*

- **Redundant experts.** `resolve_num_extra_experts` adds replicas so that the physical experts divide evenly across the EP ranks. The gate then routes to physical experts through the EPLB map.
- **DeepEP also handles context parallelism.** `CPManager` (`parallel_utils/cp.py`) wraps a DeepEP V2 `BucketBuffer` for context-parallel communication, separate from MoE.
- **The DeepEP version is pinned** as of commit `9bd9cf2` ("Bump DeepEP to f6aa38fe").

For where auxiliary-loss-free MoE balancing started, see the [DeepSeek-V3 MoE breakdown](/engineering/deepseek-v3-auxiliary-loss-free-moe-mtp-fp8-training/).

### 4. Where the TileLang and NPU Kernels Live and How They're Dispatched

```mermaid
flowchart TD
    subgraph CALLERS["Model code"]
        C1["layers/layernorm.py RMSNorm"]
        C2["layers/sampler.py"]
        C3["v4_modules/attn.py, compress.py ..."]
    end

    subgraph IFACE["Interface layer: tilelang_ops/*.py<br/>norm.py, fused_sample.py, store_kv_cache.py, sampler.py, dflash.py ...<br/>argument checks, buffer allocation, *_ref PyTorch references, tests"]
        I1["norm(...) → kernel = ops.norm_tl(...)"]
    end
    C1 --> I1
    C2 --> IFACE
    C3 --> IFACE

    I1 --> OPS["tilelang_ops/ops.py<br/>imports tilelang_ops.#lt;backend#gt;<br/>re-exports every *_tl factory<br/>missing kernel → KernelUnavailableError"]

    DET["deep_cluster/hardware/device.py<br/>accelerator_kind(): nvidia / ascend"] --> PLAT["platform.py get_platform()"]
    PLAT -->|nvidia| GPU["PlatformGPU<br/>tilelang_ops_backend = 'cuda'<br/>distributed = nccl"]
    PLAT -->|ascend| NPU["PlatformNPU<br/>tilelang_ops_backend = 'asc'<br/>distributed = hccl<br/>imports deepinfer.npu_ops"]
    GPU --> OPS
    NPU --> OPS

    OPS -->|cuda| CU["tilelang_ops/cuda/*.py<br/>@tilelang.jit SM100 kernels<br/>TMA, UE8M0 scales, FP8/FP4"]
    OPS -->|asc| AS["tilelang_ops/asc/*.py<br/>@tilelang.jit Ascend SIMD kernels<br/>kv_quant, rstd_1ulp macros"]

    NPU --> PATCH["npu_ops/patch_imports.py<br/>import hook swaps:<br/>deep_select.interface.topk → npu_ops/deep_select.py<br/>flash_attn.cute _flash_attn_fwd → npu_ops/vit_attn.py"]

    subgraph EXT["Other kernel sources (not TileLang)"]
        X1["deep_gemm: FP8/FP4 GEMMs, mega-MoE"]
        X2["deep_ep: MoE dispatch/combine"]
        X3["FlashMLA: layers/attention_backend.py"]
        X4["csrc/*.cpp → deepinfer._C<br/>cuda_utils.cpp or asc_utils.cpp<br/>chosen in setup.py"]
    end
```

*Kernel dispatch in DeepInfer: model code calls the interface layer, `ops.py` picks the CUDA or Ascend backend, and DeepGEMM, DeepEP and FlashMLA sit alongside TileLang.*

**Kernel families** (each has a `cuda/` and an `asc/` version):

- `norm`
- `fused_transform` (RMSNorm + RoPE + Hadamard + quantize + KV store)
- store and load for the paged KV cache
- `compress`
- `candidate_blocks` and `get_kv_index` (sparse attention)
- `fused_sample` and `random_sampling`
- the sampler verification suite
- `dflash` and `dflash_copy`
- the ZOS gather kernels
- `structure_output`
- `image_embed_ops`
- `prepare_cp_mirror`

**Backend selection lives only in `ops.py`.** Interface modules always call `ops.xxx_tl` and never import a backend directly.

### 5. End to End: From Request to Output

```mermaid
flowchart TD
    %% ---------- Intake ----------
    U["User: LLM.generate(prompts, SamplingParams)"] --> TOK["HF tokenizer.encode<br/>hugging_face/tokenizer.py"]
    TOK --> ADD["LLMEngine.add_request"]
    ADD --> MMP{"has images?"}
    MMP -->|yes| VE["ve/multimodal_processor.py<br/>background preprocess, image tokens<br/>shared-memory pool"]
    MMP -->|no| SOQ
    VE --> SOQ{"structured output?"}
    SOQ -->|yes| SOB["SOMatcherBuilder<br/>xgrammar compile on thread pool"]
    SOQ -->|no| ENQ
    SOB --> ENQ["Sequence → C++ Scheduler waiting queue"]

    %% ---------- Step loop ----------
    ENQ --> STEP["LLMEngine.step()"]
    STEP --> SCHED["C++ Scheduler.schedule<br/>prefill vs decode, chunked prefill<br/>paged KV blocks, preemption<br/>MTP varlen query lengths"]
    SCHED --> RUNW["driver Worker.run_workers<br/>cp_broadcast → follower CP ranks"]

    %% ---------- Input prep ----------
    RUNW --> PREP["ModelRunner._prepare_input<br/>C++ prepare_tensor_input_v4 / ZOS<br/>→ InputMetadataV4 (block tables, SWA, compressed idx)"]
    PREP --> GQ{"decode and<br/>graph captured?"}
    GQ -->|yes| CG["CudaGraphRunner.replay"]
    GQ -->|no| EAGER["model.forward eager"]

    %% ---------- Model ----------
    CG --> EMB
    EAGER --> EMB["VocabParallelEmbedding (TileLang gather)<br/>+ ViT / VL aligner for images<br/>+ Engram n-gram embeddings"]
    EMB --> LAYER

    subgraph LAYER["DeepseekDecoderLayer × L"]
        direction TB
        HC1["mHC pre-mix + RMSNorm"] --> ATT["V4 MLA attention<br/>fused_transform → store KV (FP8/FP4)<br/>indexer top-k → sparse FlashMLA<br/>SWA + compressed KV, cross-layer KV sharing"]
        ATT --> HC2["mHC post / pre-mix + RMSNorm"]
        HC2 --> MOE["DeepseekMoE<br/>gate (EPLB map) → DeepEP dispatch<br/>→ deep_gemm grouped GEMM → DeepEP combine<br/>+ shared expert, or mega-MoE"]
        MOE --> CAPT["capture DFlash target-layer hidden<br/>YOCO prefill truncation"]
    end

    LAYER --> DFU["DFlash.update_main_cache<br/>write draft-model KV"]
    DFU --> HEAD["final norm + mHC head → hidden_states"]

    %% ---------- Overlap ----------
    HEAD --> PPREV["Worker: post-process PREVIOUS step<br/>(ZOS overlap with GPU)"]

    %% ---------- Sampling ----------
    PPREV --> SAMP["Sampler<br/>logits = hidden @ lm_head (BF16 GEMM)"]
    SAMP --> MASK["structured-output bitmask"]
    MASK --> VER["verify step N-1 drafts from MTPInfoPool<br/>fused_sample → get_accept_result → finalize_verification"]
    VER --> DR["DFlash decode_forward (CUDA graph)<br/>draft layers → sample_drafts + ConfidenceHead<br/>→ MTPInfoPool.store"]
    DR --> EPLBS["EPLB step: record expert load<br/>periodically rebalance + shuffle weights"]

    %% ---------- Output ----------
    EPLBS --> POST["engine.post_process → _process_model_outputs<br/>C++ appends accepted + new tokens<br/>stop/EOS checks, frees KV blocks"]
    POST --> STATS["StatsLogger: throughput, MFU,<br/>MTP acceptance, MoE balance"]
    POST --> RO["RequestOutput[]"]
    RO --> MORE{"unfinished requests?"}
    MORE -->|yes| STEP
    MORE -->|no| FLUSH["flush_inflight_reqs"]
    FLUSH --> DETOK["tokenizer.decode"]
    DETOK --> RESULT["return outputs to user"]

    %% ---------- Cross-cutting ----------
    PLATFORM["platform.py: GPU (cuda/NCCL) or NPU (asc/HCCL)<br/>→ tilelang_ops/ops.py picks kernel backend"] -.-> LAYER
    PLATFORM -.-> SAMP
```

*The full DeepInfer path, from `LLM.generate()` through the decoder layers, sampling, DFlash drafting and EPLB, back to the user.*

### Main Files to Read in the DeepInfer Codebase

| Area | Start here |
| --- | --- |
| **Intake and loop** | `deepinfer/entrypoints/llm.py`, then `deepinfer/engine/llm_engine.py` (`step` is around line 860) |
| **Worker** | `deepinfer/worker/worker.py:89` (`execute_model_step`), then `deepinfer/worker/model_runner.py:308` |
| **Model** | `deepinfer/model_executor/models/deepseek.py`, `decoder_layer.py` and `v4_modules/mlp.py:565` (MoE forward) |
| **Speculative decoding** | `deepinfer/model_executor/layers/sampler.py:411` (`_verification`) and `models/mtp/dflash.py:347` (`run_drafts`) |
| **Kernels** | `deepinfer/model_executor/layers/tilelang_ops/ops.py` and `deepinfer/platform.py` |
