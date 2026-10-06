---
layout: post
title: "LambdaNER-Bench: A Serverless NER Inference Benchmark on AWS Lambda"
seo_title: "LambdaNER-Bench: Serverless NER Inference Benchmark on AWS Lambda"
date: 2026-10-06
author: Trisham Bharat Patil
meta: "Cold Starts, Quantization, Runtimes, and Cost for a 67M DistilBERT NER Model"
description: "LambdaNER-Bench: a serverless NER inference benchmark on AWS Lambda. 3,400 cold starts compare Rust vs Python, ONNX vs candle, INT8/INT4, arm64 vs x86 and more."
keywords: "serverless NER inference benchmark, NER model AWS Lambda, Lambda cold start, DistilBERT inference, ONNX Runtime INT8 quantization, candle Rust inference, arm64 Graviton vs x86, Lambda SnapStart, container image vs zip, serverless ML cost"
image: /assets/research/lambdaner-bench/cold-start-dumbbell.png
tags:
  - NER
  - Serverless Inference
  - AWS Lambda
  - Benchmark
  - Quantization
  - Cold Start
  - ONNX Runtime
  - Rust
  - DistilBERT
# Research page background (/research-articles/). Scenes: ascent | orbit | stars | network | grid
bg_scene: stars
---

<!--
  SEO
  Slug: /research-articles/2026-10-06-lambdaner-bench-serverless-ner-inference-benchmark-aws-lambda/
  Primary keyword: serverless NER inference benchmark
  Secondary: NER model on AWS Lambda, Lambda cold start, DistilBERT inference, ONNX Runtime INT8,
             candle Rust inference, arm64 Graviton vs x86, Lambda SnapStart, container image vs zip,
             serverless ML inference cost
  GROUNDING: every number below is computed from the raw benchmark export
  (raw_data/energy-ner-lambda-bench.html, run 2026-09-28, eu-west-2). The same export ships as
  /assets/research/lambdaner-bench/interactive-dashboard.html.
-->

## Abstract

How fast, how cheap, and how accurate can a transformer **NER model on AWS Lambda** actually be? **LambdaNER-Bench** is a serverless NER inference benchmark built to answer that question for one real production model: `QuantBridge/energy-news-classifier-ner-multitask`, a 67M-parameter DistilBERT that performs named entity recognition and multi-label topic classification in a single forward pass.

The benchmark spans **68 Lambda functions** — 34 deployment variants on both arm64 (Graviton) and x86_64 — across five memory sizes, for **3,400 forced cold starts** and **12,260 invocations** in one region on one day. The variants cross five axes that engineers usually decide in isolation: runtime language (Rust vs Python), inference engine (ONNX Runtime, candle, PyTorch), numeric precision (FP32 down to INT4 and FP4), packaging (zip, container image, distroless, SnapStart), and CPU architecture.

Every variant is also scored for **numerical fidelity** against the PyTorch FP32 reference: topic-decision flips and entity-span agreement on a fixed headline set. The goal is not only "which is fastest" but "which is fastest *without silently changing what the model says*".

The headline results: a Rust + ONNX Runtime INT8 container on arm64 cold-starts in **425 ms** (p50), serves warm requests in **6.8 ms**, and costs **$0.36 per million warm invocations**. A stock Python + PyTorch container takes **19.7 s** to cold-start — a 46× gap for the same weights. arm64 is faster on cold start in **158 of 160** paired cells. Container images cold-start a median **2.5× faster than zip** for the same payload. And the most important accuracy finding is that **the NER head is far more fragile under quantization than the classification head** — some INT8 builds flip zero topic decisions while disagreeing with the reference on a quarter of entity spans.

---

## 1. Contributions

**1. A reproducible, multi-axis serverless NER inference benchmark.** LambdaNER-Bench measures one fixed model across 34 deployment variants × 2 architectures × 5 memory sizes, with forced cold starts, warm latency, peak memory, first-deploy latency, and per-million-request cost for every cell.

**2. Accuracy measured next to latency.** Each build is compared to the PyTorch FP32 reference for topic flips (out of 120 decisions) and entity-span agreement. Speed numbers without fidelity numbers are how broken INT8 builds reach production; this benchmark refuses to report one without the other.

**3. A decomposition of cold start into init, engine load, first invoke, and platform time.** This turns "cold starts are slow" into a specific diagnosis: interpreter imports, graph optimization, image fetch, or snapshot restore.

**4. Documented failure modes with root causes.** Including an x86 INT8 ONNX build that returned *zero* correct entities, PyTorch failing to load on Lambda arm64, and the 10-second init limit silently doubling cold starts.

**5. A decision table** mapping traffic shape and accuracy tolerance to a concrete Lambda configuration.

---

## 2. Introduction: Why Benchmark NER Inference on Serverless?

The QuantBridge NER model (described in the [companion research article](/research-articles/2026-04-07-quantbridge-energy-intelligence-multitask-nlp/)) turns financial and geopolitical headlines into structured signals: entities like `COMMODITY`, `CENTRAL_BANK`, or `SANCTION`, plus topic labels like `energy` or `macro`.

That workload is **bursty**. News arrives in clusters — an OPEC meeting, a sanctions announcement, a Fed statement — and then goes quiet. An always-on GPU or CPU server idles most of the day. Serverless functions scale to zero between bursts, which makes them economically attractive for exactly this traffic shape.

The catch is the **cold start**. When a burst hits, Lambda must create fresh execution environments: fetch the code, boot the runtime, load ~70–300 MB of weights, and build an inference session. For a transformer, this can dominate the user-visible latency of the first request in every new environment.

Most published guidance on Lambda ML inference compares two or three configurations. In practice, the decision space is a cross-product:

- **Language:** Rust (`lambda_runtime`) or Python 3.13
- **Engine:** ONNX Runtime 1.28, candle 0.11, or PyTorch (transformers 5)
- **Precision:** FP32, FP16, stored-FP16/BF16/FP4, INT8, INT4
- **Packaging:** zip, container image, distroless image, SnapStart
- **Architecture:** arm64 (Graviton) or x86_64
- **Memory:** 1024, 1769, 3008, 5307, or 10240 MB

These axes interact. A choice that wins on one axis can lose on another — SnapStart is the clearest example, rescuing PyTorch while *hurting* Rust. LambdaNER-Bench measures the cross-product instead of guessing at it.

---

## 3. Benchmark Design

### 3.1 System Under Test

| Property | Value |
| --- | --- |
| Model | `QuantBridge/energy-news-classifier-ner-multitask` |
| Architecture | DistilBERT encoder (67M params) + token-level NER head + multi-label topic head |
| Region / date | AWS Lambda `eu-west-2`, 2026-09-28 |
| Functions | 68 (34 variants × arm64 / x86_64) |
| Memory sizes | 1024, 1769, 3008, 5307, 10240 MB |
| Cells | 330 (variant × arch × memory) |
| Forced cold starts | 3,400 (n = 10 per cell after discarding the first sample) |
| Total invocations | 12,260 |

### 3.2 The Variant Matrix

**Rust variants** run `lambda_runtime` on a current-thread Tokio runtime with mimalloc, compiled for `target-cpu=neoverse-n1` (arm64) or `x86-64-v3` (x86). Two engines:

- **candle 0.11** with a custom DistilBERT implementation (fused QKV projection, exact GELU), loading safetensors or GGUF-style quantized weights.
- **ONNX Runtime 1.28** loaded dynamically, with the graph fused offline and intra-op threads set to `nproc`, spinning disabled.

**Python variants** run the managed Python 3.13 runtime or base image, using either `onnxruntime` + `tokenizers` on the same ONNX files, or `transformers` + `torch` (CPU) via `AutoModel` with `trust_remote_code`.

**Precision keys** used throughout:

| Key | Meaning |
| --- | --- |
| FP32 | Full precision reference |
| FP16 | Weights *and* arithmetic in FP16 |
| F16s / BF16s / FP4s | Stored in that format, **upcast to FP32 at load** (no native FP4 arithmetic on Lambda CPUs; no BF16 matmul in candle's CPU backend) |
| INT8 | candle `Q8_0` (block-wise) or ORT dynamic quantization with `reduce_range` (7-bit weights) |
| INT4 | candle `Q4_K` or ORT `MatMulNBits` (block size 32, int8 compute) |

### 3.3 Measurement Protocol

**Cold start.** An environment-variable change retires every live environment; the harness waits for the update to finish, then invokes once. Latency is measured client-side (request → response) and corrected by subtracting the median warm round-trip overhead, so network distance does not pollute the number. No SDK retries.

**Init / restore / first invoke.** Taken from the Lambda `REPORT` line (p50). **Platform time** is defined as `client cold − init − restore − first invoke` — the sandbox and code/image setup that the `REPORT` line does not show.

**Warm latency.** Billed-duration p50 of 3 warm invokes after each cold start.

**Cost.** eu-west-2 on-demand pricing: $0.0000133334 per GB-s (arm64), $0.0000166667 per GB-s (x86_64), plus $0.20 per million requests. SnapStart adds the restore charge ($0.0001397998 per GB restored); snapshot cache charges are excluded.

### 3.4 Accuracy Protocol

Every build runs the same **12 headlines** and is compared to PyTorch FP32:

- **Topic flips (out of 120):** 12 headlines × 10 topic labels; a flip is any decision that crosses the 0.20 threshold differently from the reference.
- **Entities (matching / union):** spans that exactly match the reference, over the union of both span sets. `32/32` is exact agreement; `28/37` means 9 spans were added, dropped, or re-bounded.
- **Max Δ prob:** the largest absolute change in any topic probability.

---

## 4. Headline Results

| Metric (1769 MB unless noted) | Result |
| --- | --- |
| Best cold start p50 | **366 ms** — arm64 · Rust · candle INT4 · image |
| Best warm p50 | **6.83 ms** — arm64 · Rust · ORT INT8 · image |
| arm64 vs x86_64 cold start | **−26%** median; arm64 faster in **158 / 160** paired cells |
| Zip vs container image cold start | zip **2.5×** slower (median of 60 same-payload pairs) |
| Python overhead vs Rust (same ORT, same model) | **+436 ms** median cold start (40 pairs) |
| PyTorch FP32 cold start | **19.7 s** plain → **1.17 s** with SnapStart (arm64) |

![LambdaNER-Bench serverless NER inference benchmark: cold start p50 on AWS Lambda at 1769 MB for Rust and Python variants of a DistilBERT NER model, comparing arm64 Graviton and x86_64](/assets/research/lambdaner-bench/cold-start-dumbbell.png)

*Figure 1. Cold start p50 at 1769 MB, arm64 (blue) vs x86_64 (orange). Every Rust container build except FP32 lands under a second; plain PyTorch is off the chart at ~20 s.*

The spread is the story. The same weights, doing the same work, cold-start anywhere from **0.37 s to 23 s** depending on deployment choices that never touch the model itself.

---

## 5. arm64 Graviton vs x86_64 for NER Inference

arm64 won cold start almost everywhere: **158 of 160** paired cells, median **−26%**. At 1769 MB, Rust ORT INT8 goes from 600 ms on x86 to 425 ms on arm64; Python onnxruntime FP32 goes from 2.06 s to 1.33 s.

Warm latency is more nuanced and depends on precision:

| Variant (1769 MB) | Warm arm64 | Warm x86 | Δ | $/1M warm arm64 | $/1M warm x86 |
| --- | --- | --- | --- | --- | --- |
| Rust · ORT · INT8 | 6.83 ms | 13.94 ms | −51% | $0.36 | $0.60 |
| Rust · ORT · INT4 | 7.93 ms | 27.77 ms | −71% | $0.38 | $1.01 |
| Rust · ORT · FP32 | 31.35 ms | 30.54 ms | +3% | $0.94 | $1.09 |
| Rust · ORT · FP16 | 134.75 ms | 103.75 ms | +30% | $3.31 | $3.19 |
| Rust · candle · INT8 | 58.96 ms | 88.85 ms | −34% | $1.56 | $2.76 |
| Python · PyTorch · FP32 | 78.75 ms | 68.79 ms | +14% | $2.02 | $2.19 |

**Why integer kernels favor Graviton.** Graviton3/4 expose `dotprod` and `i8mm` instructions that accelerate int8 matrix multiplies. The x86 fleet Lambda handed us is AVX2-only (no AVX-512, no VNNI — see §12), so its int8 path is comparatively weak. At FP32, the two are roughly at parity per vCPU, and arm64 still wins on cost because its GB-second price is 20% lower.

---

## 6. Rust vs Python: The Cold-Start Tax

Holding the engine (ONNX Runtime) and the model files constant, Python adds a median **+436 ms** to cold start. Almost all of it shows up in `init` — interpreter boot plus importing `onnxruntime`, `tokenizers`, and `numpy`.

The warm path tells a different story:

| arm64 · image · INT8 · 1769 MB | Cold p50 | Init | Warm p50 | $/1M warm |
| --- | --- | --- | --- | --- |
| Rust · ORT | 425 ms | 286 ms | 6.83 ms | $0.36 |
| Python · onnxruntime | 813 ms | 625 ms | 7.70 ms | $0.38 |

Once warm, Python is within ~1 ms of Rust because both spend their time in the same C++ kernels. **Python's cost is a cold-start tax, not a throughput tax.** If your traffic keeps environments warm, Python ORT is a perfectly reasonable choice. If every burst triggers fresh environments, Rust halves the first-request latency.

PyTorch is a different category. A ~900 MB image (~1 GB on x86) plus `import torch` pushes init past Lambda's **10-second init limit**, at which point Lambda kills the init and re-runs it inside the first invoke. That is why every PyTorch cell below 10 GB shows `init ≈ 9,999 ms` and a ~9.5 s first invoke: you pay for initialization twice. At 10240 MB, init finishes in 8.0 s, under the limit, and the arm64 cold start drops from 19.5 s to 8.3 s.

---

## 7. ONNX Runtime vs candle: Cold-Optimized vs Warm-Optimized Engines

The two Rust engines sit at opposite corners of the latency plane.

![Cold start versus warm latency for NER model inference on AWS Lambda arm64: Rust candle, Rust ONNX Runtime and Python onnxruntime at each precision, showing ONNX Runtime INT8 in the lower-left corner](/assets/research/lambdaner-bench/cold-vs-warm-latency.png)

*Figure 2. Each point is one arm64 container build at 1769 MB. candle (blue) clusters at fast cold / slow warm; ONNX Runtime (orange, green) reaches 7–8 ms warm at INT8/INT4.*

- **candle** has the fastest cold starts in the benchmark (366 ms at INT4, 432 ms at INT8). It memory-maps weights and builds no optimized graph, so there is little to do at init.
- **ONNX Runtime** pays more at init for session creation and graph setup, but its MLAS kernels make warm inference dramatically faster: **6.83 ms vs 58.96 ms** at INT8 (8.6×), and **31 ms vs 83 ms** at FP32 (2.6×).

**The engine choice matters more than the precision choice.** Moving from candle INT8 to ORT INT8 cuts warm latency 8.6×; moving candle from FP32 to INT8 cuts it only 1.4×.

Two FP16 results are worth flagging:

- **ORT FP16 is the slowest ORT build** — 134.75 ms warm on arm64, 4.3× slower than FP32, with a 291 ms first invoke. The CPU execution provider lacks FP16 kernels for much of the graph, so the model spends its time casting back and forth.
- **candle FP16 on arm64 is faster than candle FP32** (44.5 ms vs 83.0 ms), because Graviton has native FP16 vector arithmetic and halving the weight bytes halves memory traffic.

"Stored" formats (F16s, BF16s, FP4s) shrink the payload but are upcast to FP32 at load, so their warm latency is FP32 latency (~83 ms). They help only where payload size is the bottleneck.

---

## 8. Quantization Accuracy: Where the NER Head Breaks

This is the section that justifies benchmarking fidelity alongside speed.

**Precision sweep — arm64, container image, 1769 MB:**

| Engine · precision | Payload | Cold p50 | Warm p50 | Max RSS | Topic flips /120 | Entities | Max Δ prob |
| --- | --- | --- | --- | --- | --- | --- | --- |
| candle · FP32 | 273 MB | 776 ms | 83.0 ms | 824 MB | 0 | 32/32 | 4e-7 |
| candle · F16s | 139 MB | 631 ms | 87.0 ms | 501 MB | 0 | 32/32 | 0.0001 |
| candle · FP16 | 139 MB | 486 ms | 44.5 ms | 430 MB | 0 | 32/33 | 0.002 |
| candle · BF16s | 139 MB | 534 ms | 82.8 ms | 510 MB | 0 | 32/33 | 0.001 |
| candle · INT8 `Q8_0` | 78 MB | 432 ms | 59.0 ms | 270 MB | 2 | **32/32** | 0.007 |
| candle · INT4 `Q4_K` | 57 MB | **366 ms** | 47.4 ms | 253 MB | 3 | 32/36 | 0.038 |
| candle · FP4s | 76 MB | 580 ms | 82.7 ms | 410 MB | 2 | 28/37 | 0.060 |
| ORT · FP32 | 292 MB | 898 ms | 31.4 ms | 673 MB | 0 | 32/32 | 4e-7 |
| ORT · FP16 | 158 MB | 798 ms | 134.8 ms | 607 MB | 0 | 32/32 | 0.0002 |
| ORT · INT8 dynamic | 92 MB | 425 ms | **6.8 ms** | 220 MB | **0** | **28/37** | 0.045 |
| ORT · INT4 `MatMulNBits` | 69 MB | 428 ms | 7.9 ms | 179 MB | 4 | 30/33 | 0.057 |

**Observation 1: Topic flips and entity agreement disagree.** ORT INT8 flips **zero** topic decisions yet matches only 28 of 37 entity spans. A team that validated quantization by checking classification outputs would ship it and never notice the NER drift.

**Why the NER head is more fragile.** The topic head reads a pooled sentence representation — small per-token errors average out. The NER head makes an independent BIO decision at *every token*, and a single flipped `B-`/`I-` tag changes a span boundary. Token-level heads amplify quantization noise; pooled heads absorb it.

**Observation 2: Scale granularity beats bit width.** candle's 4-bit `Q4_K` (32/36) preserves entities better than ORT's 8-bit dynamic quantization (28/37), and candle's 8-bit `Q8_0` is exact (32/32). The `Q*_K` and `Q8_0` formats store a scale per small block of weights; ORT's dynamic quantization defaults to per-tensor weight scales, and `reduce_range` drops it to 7 effective bits. Fine-grained scales track outlier weights; coarse scales clip them.

**Observation 3: FP4 storage is not free.** Even though FP4s is upcast to FP32 for compute, the 4-bit *storage* already destroyed information — entity agreement falls to 28/37.

---

## 9. Container Image vs Zip Packaging

Conventional wisdom says zip deployments start faster than containers. For this model, the opposite is true at steady state:

| arm64 · 1769 MB · same payload | Size | Zip cold | Image cold | Ratio | Zip platform | Image platform |
| --- | --- | --- | --- | --- | --- | --- |
| Rust · ORT · INT8 | 92 MB | 1,197 ms | 425 ms | 2.8× | 379 ms | 130 ms |
| Rust · ORT · INT4 | 69 MB | 995 ms | 428 ms | 2.3× | 341 ms | 149 ms |
| Rust · candle · INT8 | 78 MB | 1,175 ms | 432 ms | 2.7× | 412 ms | 136 ms |
| Rust · candle · INT4 | 57 MB | 927 ms | 366 ms | 2.5× | 340 ms | 110 ms |
| Rust · candle · F16s | 139 MB | 2,017 ms | 631 ms | 3.2× | 700 ms | 166 ms |
| Python · onnxruntime · INT8 | 204 MB | 1,600 ms | 813 ms | 2.0× | 513 ms | 178 ms |

Zip loses in two places: higher platform time (the package must be downloaded and unpacked) *and* higher init, because the engine reads weights from a freshly extracted filesystem. Lambda's container path, by contrast, lazily loads images in content-addressed chunks with a shared cache, so a warm cache serves the weights quickly.

**The catch is the first deploy.** Immediately after publishing new code, the image chunk cache is empty:

| arm64, first invoke after deploy | Payload | First start | Steady cold p50 (1024 MB) |
| --- | --- | --- | --- |
| Rust · ORT · FP32 · image | 292 MB | 31.8 s *(init timeout)* | 975 ms |
| Rust · candle · FP32 · image | 273 MB | 25.0 s *(init timeout)* | 861 ms |
| Rust · ORT · INT8 · image | 92 MB | 8.6 s | 425 ms |
| Rust · candle · INT4 · image | 57 MB | 4.5 s | 501 ms |
| Rust · ORT · INT4 · zip | 69 MB | 1.3 s | 1,028 ms |
| Rust · candle · INT8 · zip | 78 MB | 1.6 s | 1,296 ms |

Images pay a 4–32 s first start for the Rust builds (up to 58 s for PyTorch), and anything over ~130 MB tends to trip the 10 s init limit. Zip barely notices a fresh deploy. The practical fix is to send a warm-up invoke after every deploy before shifting traffic. Note also that zip is capped at 250 MB unzipped, so FP32 builds are image-only.

Distroless base images (`gcr.io/distroless/cc-debian12`) were within noise of `provided:al2023` (412 ms vs 425 ms for ORT INT8).

---

## 10. Lambda SnapStart: A Fix for Python, a Regression for Rust

SnapStart snapshots an initialized environment and restores it instead of re-running init. The results split cleanly by how expensive init was to begin with:

| arm64 · 1769 MB | Plain cold | SnapStart cold | Restore | $/1M cold plain | $/1M cold snap |
| --- | --- | --- | --- | --- | --- |
| Python · PyTorch · FP32 | 19.7 s | **1.17 s** | 739 ms | $221 | $248 |
| Python · onnxruntime · INT8 (zip) | 1.60 s | 997 ms | 536 ms | $25 | $250 |
| Rust · ORT · INT8 | 425 ms | 718 ms | 440 ms | $7.00 | $242 |
| Rust · ORT · FP32 | 898 ms | 960 ms | 699 ms | $17.48 | $244 |
| Rust · candle · INT8 | 432 ms | 805 ms | 519 ms | $7.25 | $244 |
| Rust · candle · FP32 | 776 ms | 1,136 ms | 698 ms | $15.45 | $246 |

Restore alone costs 440–740 ms here. If your init is already under that, **SnapStart makes cold starts slower** — and the restore charge raises cold-start cost from ~$7 to ~$242 per million. For PyTorch, where init is 10–20 s, SnapStart is a 17× improvement and the only way to make it viable on Lambda.

Post-restore warm invokes were also slower for some builds (candle FP32: 215 ms vs 83 ms), consistent with snapshot memory pages still being faulted in lazily during the first few requests.

---

## 11. Memory Sizing and Serverless Inference Cost

Lambda allocates CPU in proportion to memory (we observed 2 vCPUs up to 3008 MB, 3 at 5307 MB, 6 at 10240 MB). Memory is therefore a CPU dial — but not every build can use the CPU.

| arm64 · image | Memory | Cold p50 | Warm p50 | $/1M cold | $/1M warm |
| --- | --- | --- | --- | --- | --- |
| Rust · ORT · INT8 | 1024 MB | 425 ms | 11.1 ms | $4.35 | $0.36 |
| | 1769 MB | 425 ms | 6.8 ms | $7.00 | $0.36 |
| | 3008 MB | 405 ms | 6.9 ms | $11.36 | $0.47 |
| | 10240 MB | 387 ms | 4.7 ms | $36.60 | $0.87 |
| Rust · candle · INT8 | 1024 MB | 500 ms | 123.4 ms | $4.96 | $1.85 |
| | 1769 MB | 432 ms | 59.0 ms | $7.25 | $1.56 |
| | 10240 MB | 371 ms | 22.8 ms | $34.07 | $3.27 |

**Cold start barely responds to memory.** ORT INT8 improves only 425 → 387 ms from 1 GB to 10 GB. Cold start is dominated by single-threaded work (fetching, loading, session creation), so more cores do not help.

**Warm cost has a floor.** The $0.20-per-million request fee is a hard floor; ORT INT8 at 1024–1769 MB spends only ~$0.16 per million on compute above it. Upsizing memory to cut 2 ms off a 7 ms request doubles the bill.

**Rule of thumb:** for a fast engine, pick the smallest memory that holds the model (1024–1769 MB). For a compute-bound engine like candle, the warm-latency gains from more vCPUs are real but cost more per request.

---

## 12. Hardware Heterogeneity in the Lambda Fleet

Each cold start logged its CPU. Lambda does not give you one chip:

| Architecture | CPU | Share of cold starts | SIMD available |
| --- | --- | --- | --- |
| arm64 (n = 1,730) | Graviton3 · Neoverse V1 | 74.0% | NEON, dotprod, fp16, SVE, i8mm, bf16 |
| | Graviton4 · Neoverse V2 | 20.4% | NEON, dotprod, fp16, SVE2, i8mm, bf16 |
| | Graviton2 · Neoverse N1 | 5.5% | NEON, dotprod, fp16 |
| x86_64 (n = 1,840) | Intel Xeon (several SKUs) | 99.6% | AVX2, FMA (no AVX-512) |
| | AMD EPYC | 0.4% | AVX2, FMA |

The implication is concrete: **a binary compiled for Graviton3 features (SVE, i8mm, bf16) will crash with `SIGILL` on roughly 1 in 18 arm64 cold starts.** That is why the Rust builds target `neoverse-n1` — the lowest common denominator — and rely on runtime dispatch inside the engines for newer instructions.

---

## 13. Failure Modes and Fixes

| Issue | Affected | Cause → fix |
| --- | --- | --- |
| INT8 ONNX returns garbage | x86 ORT INT8 (Rust + Python) | Signed 8-bit weights saturate the int16 accumulation path on AVX2 without VNNI: **0/32 entities, 20 topic flips**. Re-quantizing with `reduce_range` (7-bit) → 28/37 entities, 0 flips. |
| PyTorch INT8 degraded | x86 PyTorch INT8 | `quantize_dynamic` also quantizes the task heads: 24/46 entities, 18 flips. Not fixed. |
| PyTorch fails at load | arm64 PyTorch FP16, INT8 | `cpuinfo` cannot read `/sys/devices/system/cpu/{possible,present}` inside the Lambda microVM. |
| Init suppressed and re-run | All PyTorch; any large image on first start | Init exceeds the 10 s limit, so Lambda re-runs it inside the first invoke (~2× cold start). |
| `Permission denied` on weights | safetensors artifacts | `save_file` writes mode `0600`; Lambda runs as non-root. `chmod 0644` at staging. |
| `SIGILL` risk | arm64 builds above `neoverse-n1` | 5.5% of arm64 cold starts land on Graviton2. |

The first row is the most dangerous kind of bug: it crashes nothing, returns well-formed JSON, and is wrong on every entity. Only a fidelity check catches it.

---

## 14. Recommended Configurations for NER on AWS Lambda

| If you need… | Configuration | Cold p50 | Warm p50 | $/1M warm | Fidelity |
| --- | --- | --- | --- | --- | --- |
| **Best overall latency and cost** | arm64 · Rust · ORT INT8 · image · 1024–1769 MB | 425 ms | 6.8 ms | $0.36 | 0 flips, entity drift (28/37) — validate on your labeled set |
| **Exact outputs, still fast** | arm64 · Rust · ORT FP32 · image · 1769 MB | 898 ms | 31 ms | $0.94 | Exact |
| **Fastest first request, exact entities** | arm64 · Rust · candle INT8 `Q8_0` · image | 432 ms | 59 ms | $1.56 | 2 flips, 32/32 entities |
| **A Python codebase** | arm64 · Python · onnxruntime INT8 · image | 813 ms | 7.7 ms | $0.38 | 0 flips, 29/35 entities |
| **Must keep PyTorch** | arm64 · PyTorch FP32 · SnapStart | 1.17 s | 83 ms | $2.13 | Exact |

**Avoid:** plain PyTorch images (~20 s cold starts), zip packaging for ONNX builds, ORT FP16 on CPU, SnapStart on Rust builds, and any x86 ORT INT8 build that was not quantized with `reduce_range`.

---

## 15. My Understanding: What This Benchmark Changed in My Thinking

**What clicked.** Cold start is not one number — it is a stack. Once I split it into platform, init, engine load, and first invoke, every configuration's behavior became explainable. Zip loses on platform time. Python loses on init. PyTorch loses on the 10 s limit. SnapStart trades init for a fixed restore floor.

**What surprised me.** Containers beating zip by 2.5× contradicted what I expected going in. So did SnapStart making Rust *slower*. Both make sense in hindsight: Lambda has invested heavily in the image-loading path, and a restore is not free when there was little to restore.

**What I think is underrated.** Fidelity testing per *head*. In a multi-task model, a single aggregate "accuracy is fine" check hides the fact that the token-level head and the pooled head degrade at completely different rates under quantization. The INT8 build that flipped zero topics while drifting on a quarter of entities is the result I would most want another engineer to see.

**Critique of my own setup.** Twelve headlines is a fidelity smoke test, not an accuracy evaluation. It detects *drift from the reference*, not whether the drift helps or hurts real F1. The next step is to rerun the quantized builds against the labeled NER test set.

---

## 16. Limitations and Threats to Validity

- **One region, one day.** All runs are in `eu-west-2` on 2026-09-28. Fleet mix and cache behavior vary by region and over time.
- **n = 10 per cell.** p50 is reasonably stable; p90 values are indicative only.
- **Small accuracy set.** 12 headlines measure agreement with FP32, not task accuracy.
- **Client network.** The client ran on a corporate network; latency is overhead-corrected but not eliminated.
- **One model.** Results are specific to a 67M DistilBERT with short inputs. Larger encoders shift the balance toward warm-path efficiency, and longer inputs toward compute-bound engines.
- **Pricing.** SnapStart restore uses US East list pricing; snapshot cache charges are excluded.

---

## 17. Key Takeaways

- **Deployment choices dominate model choices on serverless.** The same weights cold-start anywhere from 0.37 s to 23 s.
- **arm64 Graviton is the default.** Faster cold start in 158/160 cells and 20% cheaper per GB-s; up to 71% faster warm at INT8/INT4.
- **Use container images, then warm them after deploy.** 2.5× faster cold starts than zip, but a 4–58 s first start on an empty cache.
- **Python's tax is cold-start only.** +436 ms cold, ~1 ms warm, with the same engine.
- **Quantize with fine-grained scales, and test the NER head separately.** Token-level heads expose quantization error that pooled heads hide.
- **SnapStart helps only when init is expensive.** Rescue for PyTorch, regression for Rust.

---

## 18. Related Research and Reading

- [Domain-Adaptive Multi-Task NLP for Financial and Geopolitical Intelligence Extraction](/research-articles/2026-04-07-quantbridge-energy-intelligence-multitask-nlp/) — the model benchmarked here: architecture, 59-type entity taxonomy, and training.
- [Model Formats vs Inference Engines: Safetensors, GGUF, ONNX, vLLM, and llama.cpp](/ai%20engineering/2026/09/01/model-formats-inference-engines-safetensors-gguf-onnx-vllm/) — background on the formats and engines compared in §7–8.
- [TurboQuant: Near-Optimal Low-Bit Vector Quantization](/engineering/turboquant-near-optimal-vector-quantization-kv-cache-simplemem/) — why scale granularity and rotation matter in low-bit quantization.
- [SLO-Aware KV-Cache Management for Large-Scale LLM Serving](/research-articles/2026-08-30-slo-aware-kv-cache-management-large-scale-llm-serving/) — the GPU-serving counterpart to this CPU serverless study.
- **[Interactive LambdaNER-Bench dashboard](/assets/research/lambdaner-bench/interactive-dashboard.html)** — every cell, filterable, with CSV export.

---

## 19. Conclusion

LambdaNER-Bench shows that serverless NER inference is practical: a 67M-parameter transformer can cold-start in under half a second and serve warm requests in under 7 ms for $0.36 per million calls on AWS Lambda.

Getting there is not about the model. It is about five deployment decisions — architecture, language, engine, precision, and packaging — that interact in ways no single-axis comparison reveals. And at least one of those decisions, quantization, can quietly change what the model says while every latency number looks better.

The question I would leave with any team deploying NER models is this: **when you last made your model faster, did you check that every head still gives the same answers?**
