---
layout: post
title: "Why We Need Distributed Training and Inference"
date: 2026-09-08
author: Trisham Patil
excerpt: "Why a single GPU is no longer enough for modern AI, and how training and inference each turn into distributed systems problems. An engineering-first look at what needs to be distributed, the core patterns, and the trade-offs involved."
meta: "AI Engineering • Distributed Systems • GPU Systems"
category: "AI Engineering"
mathjax: true
tags:
  - Distributed Training
  - Distributed Inference
  - GPU Systems
  - Model Parallelism
  - Data Parallelism
  - Scaling
  - Communication Overhead
  - KV Cache
  - LLM Inference
  - Distributed Systems
---

<!--
  SEO
    Primary keyword:   distributed training and inference
    Secondary:         distributed training, distributed inference, model parallelism,
                       data parallelism, GPU memory, communication bottleneck, KV cache,
                       scaling AI models, single GPU limits, distributed systems for AI

  STATUS
    - Skeleton only. Section content to be filled in section-by-section.
    - No technical claims, papers, citations, code, or diagrams added yet.
-->

![Why we need distributed training and inference: scaling AI from a single GPU to a full NVIDIA DGX H100 node (8× H100 80GB, NVSwitch, ConnectX-7) to serve bigger models, larger datasets, and millions of real-world users](/assets/distributed_training.png)

## Introduction

<!-- Placeholder: this section will explain the motivation for distributed training and inference. -->

---

## 1. Why a Single GPU Is Not Enough

### Why Distributed — The Math Doesn't Fit Anymore

Distributed training is not a stylistic choice or a premature optimization. At modern AI scale, it becomes a hard requirement because the workload simply stops fitting into a single GPU — and it fails to fit along three independent axes: **model size**, **dataset size**, and **wall-clock time**. Any one of these is enough to force the issue; together they make single-GPU training impractical.

#### 1. Model size — the weights may not even fit

The first wall is memory, and you hit it before you ever get to speed.

Consider a **70B parameter model in FP16**. Storing just the weights requires roughly **140 GB** (2 bytes per parameter × 70B). An **H100-80GB** offers **80 GB** of GPU memory — so the model weights *alone* already exceed a single GPU's capacity, with nothing left over.

And weights are only the beginning. Training is not just holding the model in memory; it also has to hold the **optimizer states** (for example, the moment estimates Adam maintains per parameter) and the **activations** produced during the forward pass and kept for the backward pass. These add substantially to the footprint, widening an already-impossible gap.

The key realization is subtle but important: the problem here is **not** that the model is computationally expensive. It is that **the model and its training state do not physically fit inside a single GPU's memory**. No amount of patience makes 140+ GB fit into 80 GB.

#### 2. Dataset size — the data takes too long

Even if the model *did* fit, the second wall is the sheer volume of data modern models are trained on.

A contemporary LLM pretraining budget can be on the order of **15 trillion tokens**. Meanwhile, a single GPU training a **7B model** might process only about **3–5 billion tokens per day**. At that rate, pushing a ~15T-token budget through one GPU would take **years** — a training timeline that is completely unviable for any real project.

So distributed training is necessary not only because of *how large the model is*, but also because of *how much data it must see*. The dataset by itself makes single-GPU training impractical.

#### 3. Wall-clock pressure — iteration has to be fast

The third wall is time-to-result, and it is about people and process as much as hardware.

Research progresses through iteration, and iteration needs to happen in **days, not weeks**. An experiment that might take around **two weeks on a single GPU** can be compressed into **hours across a cluster** by scaling the work over many GPUs. That difference is the gap between a fast feedback loop and a stalled one.

Distributed training, then, is also about **reducing wall-clock time** — making faster experimentation and iteration possible at all.

#### Putting it together

These three pressures compound into a single conclusion:

> The **model doesn't fit** → the **dataset takes too long** → the **training timeline becomes unacceptable** → therefore we need **distributed training**.

Single-GPU training does not fail because GPUs are slow. It fails because at modern AI scale the math no longer fits — not in memory, not in time. Everything that follows in this post is about how we spread the work across many GPUs to make it fit again.

---

## 2. The Scale of Modern AI Models

### Four Axes to Parallelise Along

Once a model no longer fits comfortably on a single GPU, the natural next question is: *what, exactly, do we split up?* The important insight is that "distribute the work" is not a single operation. There are multiple **independent dimensions of parallelism**, and each one partitions a different part of the workload, requires a different kind of communication, and answers a different bottleneck.

The four fundamental axes are **data**, **tensors**, **layers**, and **training state**. Each keeps some things replicated and splits others across GPUs.

#### 1. Data Parallelism

In data parallelism, every GPU holds a **full replica of the model**, and the **batch** is split across GPUs so each device processes a different slice of the data. Because each replica computes gradients on its own shard, the replicas must be kept in sync: this is done with an **all-reduce of the gradients once per training step**, after which every GPU applies the same update.

This is the default choice when **the model already fits on each GPU** and the goal is simply to **increase throughput** by processing more data in parallel.

#### 2. Tensor Parallelism

Tensor parallelism attacks the opposite problem: a single layer that is too large for one GPU. Here the **batch is replicated**, but the **weight tensors themselves are split** — for example, partitioning a matrix by columns or by rows across devices. Because each GPU now computes only part of a layer's output, the partial results must be combined with an **all-reduce of activations inside each layer**.

Use this **when an individual layer does not fit on one GPU**. The **Megatron-LM** style of sharding is the canonical example of this approach.

#### 3. Pipeline Parallelism

Pipeline parallelism splits the model **by layers**, assigning different contiguous groups of layers to different GPUs, so the model is spread depth-wise across the cluster. Data then flows through this pipeline: GPUs **communicate activations during the forward pass** and **gradients during the backward pass** as work moves from one stage to the next.

This is the approach to reach for **when the model is too deep to fit on a single GPU**. **GPipe** and the **1F1B** schedule are the associated examples.

#### 4. Sharded (Fully Sharded Data Parallel (FSDP) / ZeRO Redundancy Optimizer)

The sharded approach targets memory directly. Instead of replicating the full model on every GPU, it **splits the weights, gradients, and optimizer states** across devices. The trade-off is communication: GPUs **all-gather the weights** when they are needed for computation and **reduce-scatter the gradients** afterward.

Use this when training is primarily **memory-bound** — when you cannot afford a full replica per GPU — while still wanting **DDP-like training speed**.

#### Comparing the four axes

The four approaches are best understood side by side — what each one splits, what it keeps replicated, the communication it introduces, and when it applies:

| Approach             | What is split?                       | What is replicated? | Main communication          | When to use                  |
| -------------------- | ------------------------------------ | ------------------- | --------------------------- | ---------------------------- |
| Data Parallelism     | Batch                                | Model               | Gradient all-reduce         | Model fits; need throughput  |
| Tensor Parallelism   | Weight tensors                       | Batch               | Activation all-reduce       | Individual layer doesn't fit |
| Pipeline Parallelism | Layers                               | —                   | Activations / gradients     | Model is too deep            |
| FSDP / ZeRO          | Weights, gradients, optimizer states | —                   | All-gather / reduce-scatter | Memory-bound training        |

The takeaway is that when one GPU is no longer enough, we are not limited to a single fix. We can distribute the workload along different axes — **data, tensors, layers, or model/training state** — and each axis is the right answer to a different reason the workload stopped fitting.

---

## 3D Parallelism — Combine All Three Axes

The four axes above are not mutually exclusive. Each one solves a *different* scaling problem — data parallelism buys throughput, tensor parallelism fits an oversized layer, pipeline parallelism fits an over-deep model — so at frontier scale you rarely pick just one. Instead, **data parallelism, tensor parallelism, and pipeline parallelism are combined simultaneously** into a single training topology. This composition is what is meant by **3D parallelism**.

### Combining the three dimensions

When all three are active at once, every GPU can be addressed by a **(p, t, d) coordinate**:

| Dimension | Symbol | What it represents         |
| --------- | ------ | -------------------------- |
| Pipeline  | p      | Pipeline stages            |
| Tensor    | t      | Tensor-parallel partitions |
| Data      | d      | Data-parallel replicas     |

The three sizes **multiply** to give the total number of GPUs. A concrete example:

$$
4 \times 8 \times 4 = 128 \text{ GPUs}
$$

That configuration means the training run uses **4 pipeline stages**, **8-way tensor parallelism**, and **4-way data parallelism**, for a total of **128 GPUs**.

It helps to picture the topology as a cube:

* The **data dimension** spans across the **columns**.
* The **tensor dimension** spans across the **rows**.
* The **pipeline dimension** spans across the **planes**.

Every GPU sits at exactly one $(p, t, d)$ position in that cube, and its coordinate tells you which slice of the model, batch, and pipeline it is responsible for.

### How to decide what parallelism to use

3D parallelism is powerful, but it is not the starting point — it is where you end up only when multiple constraints stack up. The decision sequence is:

1. **Start with DDP** (plain data parallelism).
2. If you hit a **memory problem**, move to **FSDP or ZeRO-3**.
3. If **one layer is too large** to fit, add **tensor parallelism**.
4. If the **model is too deep** to fit, add **pipeline parallelism**.
5. When **several of these constraints hold at once**, combine the approaches into **3D parallelism**.

A useful rule of thumb: **pure FSDP alone can handle many cases for models under roughly 100B parameters.** You reach for the full 3D combination when a single axis is no longer enough to make the workload fit and run efficiently.

### Topology matters

Composing three dimensions is only half the story — *where* each dimension is placed on the hardware matters just as much, because the axes communicate at very different frequencies:

* **Tensor-parallel ranks** communicate at **high frequency** (an all-reduce inside every layer), so they should live on GPUs joined by **high-bandwidth links such as NVLink**.
* **Pipeline stages** exchange activations and gradients less often, so they can **span nodes** without paying a prohibitive cost.
* **Data-parallel replicas** synchronize only once per step, so they can **span racks**, where communication is comparatively low-frequency.

The key distinction is between **communication frequency** and **hardware topology**: you map the chattiest dimension onto the fastest interconnect, and let the less chatty dimensions stretch across the slower, longer links. Getting this mapping right is what makes a 3D-parallel system efficient rather than merely correct.

The broader point is that large-scale training does not force a choice of a single parallelism strategy. Multiple axes can be **composed into one distributed topology**, each addressing a different constraint, and arranged on the hardware according to how often they talk.

---

## The Vocabulary of a Distributed Launcher

Before we can talk about *how* a distributed job starts up, we need the vocabulary a launcher uses to identify and coordinate every process. Whether you run 8 GPUs or 8,000, the launcher spins up a fleet of processes — **typically one process per GPU** — and each process needs to know two things: *who am I in this job?* and *who do I talk to?* A handful of terms answer both.

The hierarchy is worth holding in your head from the start:

> **Cluster → Nodes → GPUs → Processes → Ranks → Process Groups**

A cluster contains nodes (machines); each node has several GPUs; each GPU is driven by a process; each process is assigned ranks that place it in the job; and process groups define which processes actually communicate together.

### World Size

**World size** is the **total number of distributed processes** in the job. Since we typically launch **one process per GPU**, it is effectively the total GPU count.

For example, **2 nodes × 4 GPUs = world size 8**. Throughout this section we'll use that same 8-process job as the running example.

### Global Rank

A **rank** is the unique identifier of a process across the *entire* distributed job. The **global rank** ranges from **0 to `world_size - 1`**, and every process has a distinct one.

In our 8-process job, global ranks run `0..7`, and a process might be, say, global rank `5` — its single address across the whole cluster.

### Local Rank

The **local rank** is the process's **GPU index on its own node**. It ranges from **0 to `gpus_per_node - 1`** and determines **which GPU on the current node the process binds to**.

With 4 GPUs per node, local ranks on each node run `0..3`. A process with global rank `5` on the second node would have local rank `1` — meaning it binds to GPU 1 of that machine.

### Node Rank and Process Group

**Node rank** identifies **which machine the process is running on**. It ranges from **0 to `nnodes - 1`**. In our example there are 2 nodes, so node ranks are `0` and `1`.

A **process group** defines the **communicator** — the set of processes that participate together in a collective communication operation. The **default process group contains all ranks**, i.e. every process in the job.

Together these draw a clean separation:

* **Global rank** — where this process sits in the *entire* job.
* **Local rank** — which GPU/process it corresponds to on *its node*.
* **World size** — how many processes participate in the job overall.
* **Node rank** — which machine the process belongs to.
* **Process group** — which processes communicate together.

### Example Environment Variables

A launcher such as `torchrun` communicates all of this to each process through environment variables. For the process that is global rank `5` in our 8-process job:

```text
RANK=5                    # global rank in [0, world_size)
LOCAL_RANK=1              # local rank in [0, gpus_per_node)
WORLD_SIZE=8              # total processes
MASTER_ADDR=node0.example.com
MASTER_PORT=29500
```

Reading these line by line:

* `RANK=5` — this process's **global rank** within the range `[0, world_size)`.
* `LOCAL_RANK=1` — its **local rank**, i.e. the GPU index it binds to on its own node, within `[0, gpus_per_node)`.
* `WORLD_SIZE=8` — the **total number of processes** in the job.
* `MASTER_ADDR=node0.example.com` — the address of the coordinating process the others use as a common reference point.
* `MASTER_PORT=29500` — the port on that address they connect to.

Every process in the job receives the *same* `WORLD_SIZE`, `MASTER_ADDR`, and `MASTER_PORT`, but its *own* `RANK` and `LOCAL_RANK`. That is precisely enough for each process to know its place in the job and where to reach the others — the foundation for how a distributed training job is actually launched and how these processes discover and communicate with one another.

---

## Communication Backends

Knowing *who* each process is only gets you so far. Once the ranks are assigned, the processes still have to actually **exchange data** — moving gradients, activations, and parameters between GPUs and across nodes. That job is handled by a **communication backend**: the library that implements the collective communication underneath a distributed training job. Three backends come up in practice.

### 1. NCCL

**NCCL** — the **NVIDIA Collective Communications Library** — is the primary GPU-to-GPU communication backend for NVIDIA GPU training.

It is built to use the right hardware path automatically: **within a node** it can move data over **NVLink**, and **across nodes** it can use **RDMA over InfiniBand (IB) or RoCE**. Because it is **topology-aware**, it understands how the GPUs and links are physically arranged and routes traffic accordingly.

NCCL is the **default choice for GPU training** and is what almost all typical NVIDIA GPU distributed-training setups use.

### 2. Gloo

**Gloo** is a cross-platform communication backend originally developed at Facebook. It is **CPU-friendly and portable**, and it does **not require special dependencies** to run.

The trade-off is that it does **not provide GPU acceleration** the way NCCL does. That makes it most useful when **debugging or running distributed workloads on CPU only**, rather than as the production backend for GPU training.

### 3. MPI

**MPI** — the **Message Passing Interface** — is a standard widely used in **HPC (high-performance computing) environments**.

PyTorch supports MPI, but using it requires a **rebuild/configuration with MPI support** rather than working out of the box. **Horovod** can also use MPI underneath. MPI is particularly relevant when working with **HPC clusters where MPI is already the established communication standard**.

### Choosing a backend in PyTorch

In PyTorch you select the backend when you initialize the process group:

```python
dist.init_process_group(backend="nccl")
# 99.8% of the time, pick this.
```

For typical NVIDIA GPU distributed training, `nccl` is the backend to choose — the other two are for the specific situations described above (CPU/portable workloads for Gloo, HPC environments for MPI).

### Comparison

| Backend | Primary use                          | GPU communication             | Typical use                        |
| ------- | ------------------------------------ | ----------------------------- | ---------------------------------- |
| NCCL    | NVIDIA GPU training                  | Yes                           | Production GPU training            |
| Gloo    | CPU / portable distributed workloads | No GPU acceleration           | CPU debugging / CPU-only workloads |
| MPI     | HPC / message passing                | Depends on MPI implementation | HPC environments                   |

With the ranks assigned and a backend selected, we now have everything needed to look more closely at **how distributed processes actually communicate**.

---

## Collective Primitives

A communication backend does not expose "send this gradient there" one message at a time. Instead it provides a small set of **collective primitives** — coordinated operations that involve *all* the ranks in a process group at once. Almost everything a distributed trainer does, from synchronizing initial weights to averaging gradients, is built out of these few operations. The easiest way to keep them straight is to track the **direction** of data flow: from one rank to many (1 → N), from many to one (N → 1), or from many to many (N → N).

### 1. Broadcast — (1 → N)

**Broadcast** sends data from **one rank to all ranks**. Everyone ends up with an identical copy of what the source rank held.

The canonical use is **synchronizing initial weights from rank 0 to all ranks** at the start of training, so every replica begins from exactly the same parameters.

### 2. Reduce — (N → 1)

**Reduce** combines data from all ranks — for example by summing — and delivers the result to **one worker/rank**.

The classic example is **summing gradients to one worker**. This is an older style of gradient aggregation, though, and is **rarely used directly now** in modern distributed training.

### 3. All-reduce — (N → N)

**All-reduce** combines data from all ranks and makes the resulting value available to **all ranks** — conceptually a reduce whose result is handed back to everyone.

In **DDP**, all-reduce is used for **gradient synchronization**: every replica contributes its local gradients and every replica walks away with the same averaged gradient. It is one of the fundamental communication primitives and a major **workhorse of distributed training**.

### 4. All-gather — (N → N)

**All-gather** collects data from all ranks so that **every rank receives the complete gathered result** — no reduction, just concatenation of everyone's pieces onto everyone.

In **FSDP**, all-gather is used to **regather sharded parameters before a forward or backward pass**, temporarily reconstructing the full layer from the shards each rank holds.

### 5. Reduce-scatter — (N → N)

**Reduce-scatter** combines/reduces data across ranks and then distributes the resulting chunks so that **each rank owns one reduced chunk** — a reduction and a scatter fused into one step.

It can be viewed as the **first half of a ring all-reduce**, where each rank ends up owning one fully reduced chunk of the result.

### 6. Barrier

A **barrier** is not a data operation at all — it is a **synchronization point**. All workers **wait until every rank has arrived** at the barrier before any of them is allowed to proceed.

### The key identity

There is one relationship worth committing to memory, because it ties several of these primitives together:

> **All-reduce = reduce-scatter followed by all-gather**

That is: reduce-scatter first leaves each rank owning one fully reduced chunk, and all-gather then shares those chunks so every rank has the complete result. This decomposition is the conceptual foundation of **ring all-reduce**, which we will explore in more detail later.

### Summary

| Primitive      | Direction | Purpose / Example                 |
| -------------- | --------- | --------------------------------- |
| Broadcast      | 1 → N     | Synchronize initial weights       |
| Reduce         | N → 1     | Aggregate gradients to one worker |
| All-reduce     | N → N     | DDP gradient synchronization      |
| All-gather     | N → N     | FSDP parameter gathering          |
| Reduce-scatter | N → N     | Reduce and distribute chunks      |
| Barrier        | —         | Synchronize all workers           |

These six primitives are the basic vocabulary for how distributed training moves and synchronizes data across ranks — every parallelism strategy discussed earlier ultimately expresses its communication in terms of them.

---

## Choosing the Right Parallelism Strategy

With the axes, the 3D combination, and the communication vocabulary all in hand, the practical question becomes: *for a given workload, which strategies do I actually turn on?* The answer scales with the job. The table below maps a few representative scenarios to the parallelism strategies they call for:

| Model / Scenario                  | Data Parallel      | Tensor Parallel   | Pipeline Parallel | Sharded                  |
| --------------------------------- | ------------------ | ----------------- | ----------------- | ------------------------ |
| **7B fine-tune, 8 GPUs**          | Yes (DDP)          | No                | No                | Optional (FSDP if tight) |
| **70B pretrain, 1 node (8×B200)** | No                 | Yes (TP=8)        | No                | Yes (FSDP for opt state) |
| **70B pretrain, multi-node**      | Yes (across nodes) | Yes (within node) | Optional          | Yes                      |
| **GPT-4-class frontier model**    | Yes                | Yes               | Yes               | Yes (all 4 combined)     |

Read top to bottom, these rows describe a natural progression as the workload grows:

* A **7B fine-tuning workload on 8 GPUs** can generally get by with plain **data parallelism (DDP)** — the model fits, so you just replicate it and split the batch. **Sharding is optional**, reached for only if memory turns out to be tight.
* A **70B pretraining workload on a single 8-GPU node** no longer fits per GPU, so it turns to **tensor parallelism across the GPUs** (TP=8), with **sharding used where necessary** to hold the optimizer state.
* A **70B model across multiple nodes** combines **data parallelism across nodes** with **tensor parallelism within a node**, and can **introduce pipeline parallelism** when appropriate — mapping each axis onto the level of the hardware that suits its communication frequency.
* At **GPT-4-class frontier scale**, all of the dimensions come together at once: **data + tensor + pipeline + sharding**, i.e. full 3D parallelism plus sharded state.

The central point is that **there is no single parallelism strategy that is always correct**. The right combination depends on model size, memory requirements, the number of GPUs, and whether the workload spans one node or many. The strategies introduced in this post are not competing options but a **toolkit** — you compose the subset that matches the constraints your workload actually hits.

---

## 3. Why Training Becomes a Distributed Systems Problem

<!-- Placeholder only. -->

---

## 4. Why Inference Becomes a Distributed Systems Problem

<!-- Placeholder only. -->

---

## 5. Distributed Training vs. Distributed Inference

<!-- Placeholder only. -->

---

## 6. What Exactly Needs to Be Distributed?

<!-- Placeholder only. -->
<!-- This section will later discuss concepts such as computation, model parameters, data, activations, KV cache, requests, and other relevant resources. Content not written yet. -->

---

## 7. The Core Distributed Training Patterns

<!-- Placeholder only. -->

---

## 8. The Core Distributed Inference Patterns

<!-- Placeholder only. -->

---

## 9. Communication Becomes the Bottleneck

<!-- Placeholder only. -->

---

## 10. Memory, Compute, and Communication Trade-offs

<!-- Placeholder only. -->

---

## 11. From One GPU to Many GPUs

<!-- Placeholder only. -->

---

## 12. From One Machine to a Cluster

<!-- Placeholder only. -->

---

## 13. Why Distributed Systems Are Hard

<!-- Placeholder only. -->

---

## 14. The Systems Stack Behind Distributed AI

<!-- Placeholder only. -->

---

## 15. Where Distributed Training and Inference Are Going

<!-- Placeholder only. -->

---

## Conclusion

<!-- Placeholder only. -->
