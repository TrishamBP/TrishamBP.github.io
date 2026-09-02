---
layout: learning-paper
title: "Llama-Nemotron: Efficient Reasoning Models — Puzzle NAS, FFN Fusion, and a Dynamic Reasoning Toggle"
authors: "NVIDIA"
year: 2025
venue: "arXiv 2505.00949"
description: "An engineering dissection of NVIDIA's Llama-Nemotron reasoning models: Puzzle neural architecture search, FFN Fusion, distillation, and a dynamic reasoning toggle."
highlights:
  - "Llama-Nemotron is an open family of heterogeneous reasoning models in three sizes — LN-Nano (8B), LN-Super (49B), and LN-Ultra (253B) — derived from Llama 3 and released under a permissive license, with LN-Ultra positioned as a leading open reasoning model that fits on a single 8xH100 node"
  - "The efficiency comes from Puzzle, a neural architecture search that builds a library of alternative transformer blocks via block-wise local distillation, then uses mixed-integer programming to assemble a heterogeneous architecture on the accuracy-throughput Pareto frontier — plus FFN Fusion, which collapses consecutive FFN blocks into fewer, wider parallel layers"
  - "A five-stage build — NAS, recovery training (distillation + continued pretraining), supervised fine-tuning on reasoning traces, large-scale RL for reasoning, and a short preference-alignment stage — is what turns an inference-optimized base into a frontier reasoning model"
  - "The models are the first open-source models to support a dynamic reasoning toggle: a lightweight 'detailed thinking on/off' system prompt lets users switch between standard chat and multi-step reasoning at inference time, without separate models or architectures"
tags: ["Llama-Nemotron", "Efficient Reasoning", "Neural Architecture Search", "Puzzle", "FFN Fusion", "Knowledge Distillation", "Reasoning Toggle", "Supervised Fine-Tuning", "Reinforcement Learning", "GRPO", "Inference Efficiency", "NVIDIA"]
paper_link: "https://arxiv.org/abs/2505.00949"
category: models-architectures
subcategory: llm-architectures
date: 2025-05-01
order: 4
image: "/assets/blogs/llama-nemotron/fig3_puzzle_framework.png"
mathjax: true
---

![NVIDIA](/assets/blogs/llama-nemotron/nvidia-hero.png)

This is a technical dissection of **Llama-Nemotron** — NVIDIA's open family of **efficient reasoning models**. The family comes in three sizes — **LN-Nano (8B)**, **LN-Super (49B)**, and **LN-Ultra (253B)** — all derived from Llama 3, competitive with frontier reasoning models like DeepSeek-R1 while targeting **superior inference throughput and memory efficiency**.

The central claim is about *how you get an efficient reasoning model cheaply*: rather than training a new architecture from scratch, you take a strong Llama 3 model and **search for an inference-optimized architecture** (Puzzle NAS + FFN Fusion), recover any lost quality with distillation and continued pretraining, and only then layer on the reasoning-focused post-training (SFT + RL).

**Attribution convention.** Because this article mixes what the paper reports with my own reasoning, every non-obvious technical claim is tagged:

- **[Paper]** — stated explicitly in Llama-Nemotron (arXiv:2505.00949).
- **[Derived]** — a mathematical or logical consequence of the paper's method, worked out here.
- **[Interpretation]** — my explanation or engineering reasoning, written for the reader; not a claim the paper makes.

---

## Reasoning / Why I Studied This Paper

Most reasoning-model papers I'd read answered *"how do we make a model reason better?"* Llama-Nemotron asks a question I found more interesting: **"how do we make a model reason better *and* run cheaply on the hardware we actually have?"** That reframing is the reason I picked it apart.

The question I kept in my head throughout was simple: **where does the efficiency come from, and what does it cost?** A frontier reasoning model that fits on a single 8×H100 node and still beats DeepSeek-R1 sounds like a free lunch — so I wanted to find the bill. The answer turns out to be a *sequence* of moves, each recovering what the previous one gave up:

1. **Puzzle/NAS + FFN Fusion** buy inference efficiency — but cost some quality.
2. **Distillation + continued pretraining** recover that quality.
3. **SFT** installs reasoning and the on/off toggle — but dents instruction-following.
4. **RL** (reasoning, then preference) surpasses the teacher and repairs alignment.

So the mental model I read the paper through is a **build pipeline, not a single trick**: efficiency and capability are negotiated stage by stage rather than won in one shot. The other thread I traced is the **dynamic reasoning toggle** — a genuinely deployable idea (one model, two behaviours) that I wanted to understand precisely enough to separate what it *is* (a learned prompt-level switch) from what it is often mistaken for (an architecture change or a second model).

The rest of this dissection follows the paper's five stages in order, with the benchmark tables at the end and my own commentary marked as **[Interpretation]** throughout.

## I. Overview: A Family of Efficient Reasoning Models

Llama-Nemotron is introduced as an open family of **heterogeneous reasoning models** in three sizes, competitive with state-of-the-art reasoning models such as **DeepSeek-R1** while offering **superior inference throughput and memory efficiency**. **[Paper]** This section unpacks that one-sentence claim at the abstract level: what "reasoning model" actually means here, how the reasoning behaviour is toggled, and which models were released and where to get them.

### What a "Reasoning Model" Means Here

A **reasoning model** is one trained to *think before it answers*. Instead of mapping a prompt straight to a final answer in a single shot, it first spends inference-time compute producing an explicit, **multi-step chain of thought** — working through the intermediate steps of a math problem, a coding task, or a scientific question — and only then commits to a final answer. **[Interpretation]** The paper positions Llama-Nemotron squarely in this class, alongside DeepSeek-R1. **[Paper]**

The **"efficient"** half of the title is the other half of the claim: the family is designed to deliver that step-by-step reasoning while keeping inference **throughput high and memory usage low**. **[Paper]** The word **"heterogeneous"** points at *how* that efficiency is achieved — the architecture is allowed to vary from layer to layer (some layers drop attention, others shrink their FFN) rather than repeating one identical block, and that structure is *searched for* rather than hand-designed. I unpack the search itself in Section III. **[Interpretation]**

![Artificial Analysis Intelligence Index. As of April 2025, LN-Ultra (Llama 3.1 Nemotron Ultra 253B Reasoning) is positioned as the most "intelligent" open model on this composite of seven evaluations (MMLU-Pro, GPQA Diamond, Humanity's Last Exam, LiveCodeBench, SciCode, AIME, MATH-500).](/assets/blogs/llama-nemotron/fig1_intelligence_index.png)

*Figure 1 (from the paper). The claim I read off this chart: among fully open models, LN-Ultra sits at the top of the composite index, level with several closed frontier models.* **[Paper]**

### The Dynamic Reasoning Toggle: `detailed thinking on` / `off`

Llama-Nemotron models are the **first open-source models to support a dynamic reasoning toggle**: the *same* model can behave either as a step-by-step reasoner or as a standard chat assistant, and you choose which **at inference time**. **[Paper]**

The switch is a **lightweight system prompt**: **[Paper]**

- `detailed thinking on` → the model produces its reasoning (a chain of thought) before answering.
- `detailed thinking off` → the model answers directly, in normal chat style.

Crucially, this is a **learned behaviour, not a runtime architecture change**. During training the model is shown **paired examples** — the same prompt with a reasoning response (conditioned on `detailed thinking on`) and with a plain response (conditioned on `detailed thinking off`) — so it learns to associate each instruction with the corresponding output style. **[Paper]**

Two things the toggle is explicitly **not**: **[Interpretation]**

- It does **not** swap the architecture or load a second model. There is **one** set of weights; only the conditioning prompt changes — the paper stresses this gives both general-purpose chat and detailed reasoning *without requiring separate models or architectures*. **[Paper]**
- It is a switch **between** requests, not something you flip *mid-generation*. You set the system prompt for a conversation; you don't change the mode partway through a single running answer. **[Interpretation]**

The data curation that makes this simple instruction meaningful — the paired reasoning / non-reasoning dataset — is covered in Section V.

### The Model Family, Sizes, and Availability

Three model sizes, all derived from Llama 3 and released under the commercially permissive **NVIDIA Open Model License Agreement**, plus a fourth continued-pretraining checkpoint. All are on Hugging Face under the `nvidia` organization. **[Paper]**

| Model (Hugging Face) | Params | Base / Notes |
| --- | --- | --- |
| [Llama-3.1-Nemotron-Nano-8B-v1](https://huggingface.co/nvidia/Llama-3.1-Nemotron-Nano-8B-v1) (**LN-Nano**) | 8B | from Llama 3.1 |
| [Llama-3.3-Nemotron-Super-49B-v1](https://huggingface.co/nvidia/Llama-3_3-Nemotron-Super-49B-v1) (**LN-Super**) | 49B | from Llama 3.3 |
| [Llama-3.1-Nemotron-Ultra-253B-v1](https://huggingface.co/nvidia/Llama-3_1-Nemotron-Ultra-253B-v1) (**LN-Ultra**) | 253B | from Llama 3.1 |
| [Llama-3.1-Nemotron-Ultra-253B-CPT-v1](https://huggingface.co/nvidia/Llama-3_1-Nemotron-Ultra-253B-CPT-v1) | 253B | continued-pretraining checkpoint of Ultra, *before* the reasoning SFT + RL |

The complete post-training data is also released as the [Llama-Nemotron-Post-Training-Dataset](https://huggingface.co/datasets/nvidia/Llama-Nemotron-Post-Training-Dataset), and the training codebases (NeMo, NeMo-Aligner, Megatron-LM) are open-sourced. **[Paper]**

![Benchmark comparison: LN-Ultra (Llama-3.1-Nemotron-Ultra-253B-v1) versus Llama 3.1 405B, Llama 4 Maverick, Llama 4 Behemoth, and DeepSeek-R1 671B across reasoning and non-reasoning tasks — GPQA Diamond, AIME 2024/2025, BFCLv2 tool calling, LiveCodeBench, IFEval, and MATH-500.](/assets/blogs/llama-nemotron/fig2_ln_ultra_benchmarks.png)

*Figure 2 (from the paper). The abstract-level read: LN-Ultra (green) is at or near the top across this spread of reasoning and non-reasoning benchmarks, holding its own against DeepSeek-R1 (a much larger 671B model).* **[Paper]**

### How the Models Are Built: Five Stages

The paper frames the whole construction as a **five-stage pipeline**, and the rest of this dissection follows it stage by stage: **[Paper]**

1. **Architecture optimization (NAS + FFN Fusion).** Start from a Llama 3 model, *search* for an inference-efficient architecture, then fuse consecutive FFN blocks to cut sequential depth. *(Section III)*
2. **Recovery training.** Knowledge distillation plus continued pretraining, to restore the quality lost during the architectural surgery. *(Section IV)*
3. **Supervised fine-tuning.** SFT on a mix of standard instruction data and reasoning traces from strong teachers such as DeepSeek-R1 — this is what teaches the model to reason in multiple steps. *(Section VI)*
4. **Large-scale reinforcement learning.** RL on complex mathematics and STEM data — the step that lets the student *surpass* its teacher. For LN-Ultra it drives a substantial GPQA-Diamond gain, and it is made feasible by a custom training framework whose headline optimization is **generation in FP8**. *(Section VII)*
5. **Alignment.** A short final stage focused on instruction following and human preference. *(Section VIII)*

Stages 3–4 run on the open-sourced **Llama-Nemotron-Post-Training-Dataset** — synthetic responses from a range of open-source models, targeting mathematical reasoning, coding, science, and instruction following, then filtered for quality, correctness, and complexity to give strong training signals. **[Paper]** *(Section V)*

## II. The Problem: Efficient Reasoning at Inference Time

A defining characteristic of modern reasoning models is that their answers are **long**. A single response often carries an extended chain of thought — the model working the problem out, **self-verifying**, **reflecting**, and even **backtracking** when a line of reasoning fails. **[Paper]** That verbosity is not a defect; it is *how* these models reach state-of-the-art results on the hardest tasks, from PhD-level STEM questions to competition-level mathematics. **[Paper]**

But long responses have a cost: they push more and more compute to **inference time**. Here is the shift the paper leans on — as capability increasingly comes from *scaling test-time compute*, **inference efficiency stops being a mere deployment concern and becomes a core limiting factor on model intelligence itself**, and on the viability of agentic pipelines that chain many model calls together. **[Paper]** So for Llama-Nemotron, **maximizing inference efficiency is a primary optimization objective**, not an afterthought. **[Interpretation]**

This is also *why the reasoning toggle exists*. Not every query benefits from detailed multi-step reasoning — for a simple lookup a long chain of thought is wasteful and can even be counterproductive. Letting the user turn reasoning on or off ensures inference compute is spent **only where it earns its keep**, and that the response style stays appropriate to the task. **[Paper]**

The efficiency target is concrete: **LN-Ultra outperforms DeepSeek-R1 while fitting on a single 8×H100 node**, with higher inference throughput, and the models support a **128K-token context length**. **[Paper]** The next section is *how* that efficient architecture is obtained.

## III. Creating Inference-Optimized Models: Puzzle NAS + FFN Fusion

The first stage answers the efficiency problem with **two complementary optimizations**: NAS chooses a *better architecture*, and FFN Fusion *reduces the sequential depth* of that architecture. **[Interpretation]**

### NAS from Llama 3: The Puzzle Framework

Rather than train a new architecture from scratch — or naively shrink every layer of a Llama 3 model by the same amount — Puzzle **searches** for a good architecture. The parent is a **Llama 3 Instruct** model: **Llama-3.3-70B-Instruct** for LN-Super and **Llama-3.1-405B-Instruct** for LN-Ultra. **[Paper]** It works in two moves. **[Paper]**

**Move 1 — build a block library (the "puzzle pieces").** For *each* transformer block in the parent, Puzzle creates several **alternative** blocks and trains each one **independently and in parallel** with **block-wise local distillation** — the alternative is optimized to approximate the function of its parent block while improving a computational property (latency, memory, throughput). **[Paper]** Every candidate therefore carries an explicit **accuracy–efficiency trade-off profile**: cheaper blocks may cost some quality. **[Paper]** The variants include: **[Paper]**

- **Attention removal** — the block omits the attention mechanism entirely, cutting both compute and KV-cache memory.
- **Variable FFN dimensions** — the FFN's intermediate size is compressed at different granularities (e.g. 87%, 75%, 50%, down to 10% of the original).
- Plus additional operations Puzzle supports — **grouped-query attention (GQA)** with different numbers of KV heads, **linear** attention alternatives, and **no-op** substitutions — though empirically, **attention removal and FFN compression** proved the most effective for LN-Super and LN-Ultra's throughput and memory savings. **[Paper]**

**Move 2 — assemble with MIP.** A **mixed-integer programming** solver then selects exactly *one* block per layer, choosing the most efficient configuration under a set of constraints — hardware compatibility, maximum latency, memory budget, desired throughput. **[Paper]** Because each layer offers variants at different trade-off profiles, Puzzle can target **any point on the accuracy–efficiency Pareto frontier** — including constraints set by agentic systems or deployment pipelines, such as bounded memory use or a tight end-to-end response time. **[Paper]**

The result is a **heterogeneous** model: different layers keep different blocks — some drop attention, others retain it but with a smaller FFN — because not every layer needs to do the same amount or type of computation. **[Interpretation]** These two moves are exactly what the figure below labels *crafting the puzzle pieces* (Step 1) and *assembling the puzzle architecture* (Step 2).

![Overview of the Puzzle framework: block-wise local distillation builds a library of alternative transformer blocks (Step 1), then mixed-integer programming assembles a heterogeneous, inference-optimized architecture (Step 2).](/assets/blogs/llama-nemotron/fig3_puzzle_framework.png)

*Figure 3 (from the paper). Step 1 builds and scores alternative blocks in parallel; Step 2 uses MIP to select one block per layer under the target hardware constraints.* **[Paper]**

### FFN Fusion: Collapsing Sequential Depth

Once Puzzle removes attention from some blocks, the model is left with **runs of consecutive FFN blocks**. **[Paper]** Executed normally, those FFNs still run one after another — each is a separate sequential step for the GPU, even if it is individually fast. **[Interpretation]**

**FFN Fusion** rewrites such a run into **fewer, wider FFN layers that execute in parallel**, cutting the number of *sequential* steps without sacrificing expressivity. **[Paper]** This matters most in multi-GPU serving, where shortening the sequential path also reduces the inter-layer communication overhead. **[Paper]**

So the two optimizations answer different questions: **[Interpretation]**

- **Puzzle / NAS:** *which block should each layer use for the best quality/efficiency trade-off?*
- **FFN Fusion:** *now that attention has been thinned out, which consecutive FFNs can be merged to shorten the critical path?*

### Deployment Constraints and Efficiency Targets

Puzzle searches against **concrete hardware budgets**, and the two large models target different deployments: **[Paper]**

- **LN-Super** targets a **single H100 GPU at tensor-parallelism 1 (TP1)**. Puzzle yields a **5× throughput speedup** over Llama-3.3-70B-Instruct at batch size 256 (TP1); and even against Llama-3.3-70B-Instruct running at its best config (TP4), LN-Super at TP1 still delivers a **≥2.17×** throughput advantage. It is optimized under a budget of roughly **300K cached tokens** (batch × sequence) at FP8 on one H100 — e.g. batch size 16 × sequence length 18,750. **[Paper]**
- **LN-Ultra** targets a **full 8×H100 node**. During Puzzle's search it is constrained to at least a **1.5× latency reduction** over Llama-3.1-405B-Instruct; after applying **FFN Fusion**, the final model reaches a **1.71× latency improvement**. It supports up to **3M cached tokens at FP8** (600K at BF16) on an H100 node. **[Paper]**

![GPQA-Diamond accuracy vs. processing throughput for LN-Ultra, DeepSeek-R1, and Llama-3.1-405B, under two input/output-length settings (S2: 5000/500 and S1: 500/2000). LN-Ultra sits up and to the right of both baselines — higher accuracy at higher throughput.](/assets/blogs/llama-nemotron/fig4_accuracy_throughput.png)

*Figure 4 (from the paper). The payoff plot: LN-Ultra (green) matches or beats DeepSeek-R1 on GPQA-Diamond accuracy while running 1.9×–4× faster, so it dominates on the accuracy–throughput Pareto curve rather than trading one for the other.* **[Paper]**

## IV. Post-NAS Training: Knowledge Distillation & Continued Pretraining

Swapping blocks in and out leaves the layers slightly mismatched and costs some quality, so after the search both large models get **recovery training** to restore inter-block compatibility and claw back the lost quality. **[Paper]**

- **LN-Super** — knowledge distillation for **40B tokens** over the *Distillation Mix* dataset. **[Paper]**
- **LN-Ultra** — knowledge distillation for **65B tokens** on the same dataset, then **88B tokens** of continued pretraining on the Nemotron-H phase-4 pretraining dataset. **[Paper]**

That short distillation-plus-pretraining is enough for LN-Ultra to **match and even surpass** its reference model, Llama-3.1-405B-Instruct — evidence that aggressive architecture surgery can be reconciled with frontier quality. **[Paper]** The comparison below is measured *before* any reasoning SFT or RL — i.e. the released `Llama-3.1-Nemotron-Ultra-253B-CPT` checkpoint:

| Task | LN-Ultra CPT | Llama-3.3-70B-Instruct | Llama-3.1-405B-Instruct |
| --- | --- | --- | --- |
| MMLU | 88.1 | 81.4 | **88.6** |
| MATH500 | **80.4** | 73.6 | 69.6 |
| HumanEval | **88.4** | 84.1 | 86.0 |
| RULER 128K | **83.2** | 52.2 | 73.7 |

*Table 1 (from the paper). LN-Ultra after continued pretraining, before SFT/RL. It already leads on MATH500, HumanEval, and long-context RULER-128K, and is level with the 405B on MMLU — at a fraction of the inference cost.* **[Paper]**

## V. Synthetic Data & the Reasoning Toggle

Both reasoning and non-reasoning data are curated for supervised fine-tuning. Reasoning samples carry the system instruction `detailed thinking on`; non-reasoning samples carry `detailed thinking off`. Training on both, each conditioned on its instruction, is exactly what teaches the model to **toggle** reasoning behaviour at inference time (Section I). **[Paper]** The reasoning-on data is curated per domain; the shape of each pipeline is *collect problems → generate solutions with a strong teacher → filter hard for correctness.* **[Interpretation]**

### Reasoning-On Data: Math

The math pipeline follows Moshkov et al. (2025). Problems are collected from **Art of Problem Solving (AoPS)** community forums (all discussions except "Middle School Math," which was too easy to help). **Qwen2.5-32B-Instruct** runs most steps: **[Paper]**

- **Problem extraction** — an LLM pulls the problem(s) out of each forum post.
- **Problem classification** — each problem is tagged (proof? multiple-choice? binary yes/no? valid?); proof, multiple-choice, binary, and invalid problems are dropped.
- **Answer extraction** — only the *final answer* is extracted (not full solutions), so correctness can be checked automatically.
- **Benchmark decontamination** — an LLM-based comparison removes problems that closely resemble popular math benchmarks.
- **Solution generation** — **DeepSeek-R1** produces *reasoning* solutions (16 generations/problem) and **Qwen2.5-Math-7B-Instruct** produces *non-reasoning* solutions (64 generations/problem).
- **Solution filtering** — solutions that don't reach the expected answer are discarded, with Qwen2.5-32B-Instruct judging answer equivalence; where no answer can be extracted, the most common answer across candidates is taken as ground truth.

Prompts and scripts are released in **NeMo-Skills**. **[Paper]**

### Reasoning-On Data: Code

The code pipeline (Ahmad et al., 2025) is collect → generate → post-process: **[Paper]**

- **Question collection & verification** — **28,904** unique competitive-programming questions aggregated from TACO, APPS, CodeContests, and CodeForces, after exact-match dedup; contamination against benchmarks is checked with cosine-similarity plus LLM judges (Llama-3.3-70B, Qwen2.5-32B), with manual verification confirming **< 0.3%** overlap.
- **Solution generation** — **DeepSeek-R1** generates multiple solutions per question, mostly Python (C++ for some benchmarks), via **nucleus sampling** (temperature 0.6, top-p 0.95) in SGLang, explicitly prompting for reasoning inside `<think>` tags.
- **Post-processing** — verify the reasoning trace is present, extract the code segment, drop samples with code *inside* the reasoning tags, and validate syntax with Tree-sitter → about **488K Python samples**.

**Data-scaling insight:** unlike math, where small datasets can suffice to induce reasoning, coding needs **large-scale** data — an ablation from 25k → 736k samples improves *continuously* (no plateau), and front-loading generation on harder CodeContests problems before expanding gives the biggest gains. **[Paper]**

### Reasoning-On Data: Science

Open-ended questions and MCQs are curated from in-house and external sources — StackOverflow Q&A pairs plus synthetic MCQs: **[Paper]**

- **Synthetic question generation** — academic topics/subtopics (physics, biology, chemistry, …) are defined with **Nemotron-4-340B-Instruct**; **Qwen2.5** then generates MCQs conditioned on topic, subtopic, and difficulty level, each format-checked, and augmented with question variations (OpenMathInstruct-2 pipeline).
- **Benchmark decontamination** — the whole set (real + synthetic) is decontaminated against GPQA, MMLU, and MMLU-Pro.
- **Solution generation** — **DeepSeek-R1** produces multiple reasoning traces; for questions without ground truth, **majority voting** infers the most likely correct answer.

### Reasoning-Off Data: Teaching the "Off" Switch

The toggle only means something if the model has seen the *same kind of prompt* answered both ways. So the reasoning-off data is built as a **pairing exercise**: prompts are randomly sampled from the reasoning dataset above, and a **non-reasoning** response is generated for each — using **Llama-3.1-Nemotron-70B-Instruct** for general-domain prompts and **Llama-3.3-70B-Instruct** for the rest. Each response is then tagged with the matching system instruction — `detailed thinking on` for the reasoning version, `detailed thinking off` for the plain one. Seeing both, prompt-for-prompt, is what teaches the model to **modulate** its reasoning on the system prompt rather than always reasoning or never reasoning. **[Paper]**

These responses are filtered against ground-truth answers or reward models, and the mix is broadened with permissively licensed **function-calling** and **safety** data (augmented in-house) to shore up those capabilities. **[Paper]**

### General-Domain Responses: A Feedback-Edit Loop

For open-ended general prompts there is no ground-truth answer to filter against, so quality is *manufactured* instead. The paper uses a **Feedback-Edit inference-time-scaling system** (Wang et al., 2025b): starting from **20K first-turn prompts** drawn from ShareGPT and WildChat-1M, **Llama-3.1-Nemotron-70B-Instruct** generates several candidate responses per prompt, which are then refined through three specialized models — a **Feedback** model flags what to improve, an **Edit** model applies those targeted fixes, and a **Select** model picks the best edited response. The output is a 20K-prompt set of high-quality general-domain responses. **[Paper]**

The reason this is inference-*time* scaling: extra compute is spent at *generation* time (multiple drafts, then feedback → edit → select) to raise the quality of the training data — a distinct axis from spending compute at training time. **[Interpretation]**

### My Take: An Instructional SFT Curriculum

> **My own extension — this is not what the paper does.** I keep it clearly separate from NVIDIA's method here.

Reading the math pipeline, one thing stands out: SFT here is a *correctness filter*, not an *instructional* one. The teacher (DeepSeek-R1) generates a solution and it is kept only if its final answer matches the expected one — the training signal is "this trajectory happened to be right," not "here is the procedure you should follow." **[Interpretation]**

If it were my pipeline, I'd make the SFT data more explicitly instructional in two ways: **[Interpretation]**

1. **Procedure-first examples** — pair each problem with a *known* answer and a clean step-by-step derivation (`problem → reasoning procedure → correct answer`), so the model learns the method, not just answer-matching.
2. **Error-correction examples** — show a *wrong* attempt, then teach the model to locate the faulty step and repair it (`wrong reasoning → identify error → correct reasoning → correct answer`), making error recognition a directly supervised behaviour.

The important distinction is against the paper's **RL** stage (Section VII): RL is where the model *generates its own attempts* and is rewarded for correct answers — the paper even discards problems LN-Super already solves with pass rate ≥ 0.75, pushing RL toward what the model can't yet do. **[Paper]** That is how the student explores *beyond* the teacher, whereas SFT/distillation can only approach it. **[Paper]** So my instructional curriculum is an idea for the *SFT* side; it does **not** describe NVIDIA's method, which for math explicitly *filters out* solutions that miss the expected answer rather than feeding wrong answers on purpose. **[Interpretation]**

## VI. Supervised Fine-Tuning

If NAS and continued pretraining gave the models an efficient body and broad knowledge, **SFT is where the reasoning behaviour is actually installed**. It does two jobs at once: it **distills reasoning** from strong teachers such as DeepSeek-R1 by training on their reasoning traces (Section V), and it establishes **fine-grained style control** through the `detailed thinking on` / `off` instruction. **[Paper]** The paper's own finding echoes recent work: training on **large-scale, high-quality reasoning traces** is what elicits robust reasoning downstream. **[Paper]**

### General Methodology

All models are trained with a **token-level cross-entropy loss** over the instruction-tuning data, and training batches **mix reasoning and non-reasoning data** — each prompt paired with a response conditioned on the matching `detailed thinking on/off` instruction. **[Paper]** A few empirical lessons the paper calls out: **[Paper]**

- **Higher learning rates** are needed to learn effectively from long reasoning traces — partly a consequence of sequence-length-dependent token-loss averaging.
- **Extended training over multiple epochs** helps, especially for smaller models.
- The **Adam** optimizer with a **cosine learning-rate decay** and a linear warmup (~10% of total steps) was important for stability — crucial for LN-Ultra in particular.

### Model-Specific Training

Each size was trained differently, and the differences are instructive: **[Paper]**

- **LN-Nano** — a **three-stage** SFT pipeline (global batch 256, sequence packing at 32K effective length). *Stage 1:* reasoning data only (code, math, science) at LR 1e−4 for four epochs — training on reasoning alone first prevents failure modes like repetitive completions. *Stage 2:* mix in non-reasoning data so the model learns reasoning *control* (the toggle). *Stage 3:* a smaller blend focused on chat, instruction-following, and tool-calling.
- **LN-Super** — the full SFT dataset for a **single epoch** (fixed LR 5e−6, sequence length 16K, batch 256). Smaller runs hinted that 3–4 epochs at a larger LR (5e−5) would do better, but compute and time capped it. Rejection fine-tuning was tried and dropped — it gave no gains here.
- **LN-Ultra** — the full dataset with sequence packing at **24K effective length** (batch 256) to maximize token throughput. Higher LRs (5e−5) helped in ablations but caused **gradient explosions**; the fix was a linear warmup to 1e−5 then cosine decay to 1e−6 (10% warmup ratio). Even so, training hit gradient explosions and numerical instability after the first epoch, and only converged after **resuming with reinitialized optimizer states**. **[Paper]**

The recurring theme: the larger the model and the longer the reasoning traces, the more fragile the optimization — long-context reasoning SFT is as much a **stability** problem as a data problem. **[Interpretation]**

## VII. Reinforcement Learning for Reasoning

Here is the ceiling problem stated plainly: **distillation can only take the student up to the teacher, never past it.** SFT lets LN-Ultra *approach* DeepSeek-R1 but not exceed it — and when the student's base is stronger than the teacher's, that ceiling is a real limitation. To let the model **surpass its teacher**, it has to explore and self-improve, and that is what large-scale RL provides. **[Paper]** Consistent with DeepSeek-R1's findings, RL underperformed distillation for the *smaller* models, so — given that plus resource constraints — the paper applies **reasoning RL only to LN-Ultra**, which is what pushes it to a state-of-the-art GPQA result among open models. **[Paper]**

### The RL Pipeline: GRPO on Scientific Reasoning

The algorithm is **Group Relative Policy Optimization (GRPO)**. The loop, for LN-Ultra: **[Paper]**

1. Take a rollout batch (prompt size 72) and **sample 16 responses per prompt** (temperature 1, top-p 1).
2. Score each response with two rewards (below).
3. Update the policy (global batch 576, 2 gradient updates per rollout), repeating until convergence on reasoning tasks.

The two reward signals are: **[Paper]**

- **Accuracy reward** — every training example has a ground-truth answer (a number, a sentence, or a paragraph); a served **Llama-3.3-70B-Instruct** judges whether the policy's prediction matches it.
- **Format reward** — following DeepSeek-R1, this enforces that the model wraps its thinking in `<think>`…`</think>` under `detailed thinking on`, and that those tags are *absent* under `detailed thinking off`. So RL reinforces the toggle as well as correctness.

![Accuracy on GPQA-Diamond throughout the reasoning RL training for LN-Ultra: GPQA-D Avg@4 climbs from roughly 0.61 to about 0.75 over ~500 training steps.](/assets/blogs/llama-nemotron/fig5_rl_gpqa_progress.png)

*Figure 5 (from the paper). Reasoning RL moves LN-Ultra's GPQA-Diamond accuracy from ~0.61 to ~0.75 across training — the concrete evidence of the student surpassing its distillation ceiling.* **[Paper]**

### Difficulty Filtering and Curriculum

RL only teaches something when the problems are actually hard for the current model, so the paper shapes the data twice: **[Paper]**

- **Difficulty filtering.** For each question, LN-Super generates 8 responses; the pass rate is computed; prompts with **pass rate ≥ 0.75** (already easy) are **intentionally discarded**, concentrating training on what the model can't yet reliably solve.
- **Curriculum training.** A **progressive-batching** strategy uses the pre-computed pass rate as a difficulty metric. A Gaussian target distribution over pass rates is centred on a difficulty that **shifts from easy to hard** across successive batches; samples are allocated to batches to match that target (remaining capacity filled from the largest available pass-rate pools), while samples *within* a batch are shuffled. The net effect is a controlled, gradual increase in difficulty over training.

![Ablation on curriculum vs non-curriculum RL for LN-Ultra: the curriculum (green) run reaches higher GPQA-D Avg@4 and trains more stably than random ordering (brown).](/assets/blogs/llama-nemotron/fig6_curriculum_ablation.png)

*Figure 6 (from the paper). Curriculum ordering (green) both stabilizes training and lands higher than random ordering (brown) — difficulty scheduling is doing real work, not just cosmetics.* **[Paper]**

### Infrastructure: FP8 Generation, BF16 Training

The reason RL of a 253B model is even tractable is an infrastructure choice, and it's worth stating precisely so the two things aren't conflated: **GRPO is the RL *algorithm*; the FP8 optimization lives in the *generation* stage.** **[Interpretation]** The setup: **[Paper]**

- **NeMo-Aligner** (a dev branch adding GRPO + heterogeneous-model support) drives RL; **generation** runs on **vLLM**, **training** on **Megatron-LM**, and the two stages are **co-located on the same GPUs** — weights are synced each step (all-gathered, converted to vLLM format via shared memory), with each stage sleeping/offloading to free memory for the other.
- **Precision:** generation is done in **FP8**, training in **BF16 with FP32 optimizer states**. Because generation (rollouts) dominates the RL step, making *generation* cheap is what buys the throughput. **[Paper]**
- **Scale:** 72 nodes × 8×H100; the full run is ≈**140K H100-hours**. **[Paper]**

So the clean mental model of this stage is: *SFT/distillation → **Scientific-Reasoning RL** (GRPO; generation in FP8, training in BF16) → preference optimization.* The FP8 half is generation-side infrastructure, not part of GRPO's objective. **[Interpretation]**

## VIII. RL for Preference Optimization

This is a **separate, later stage** from the scientific-reasoning RL — easy to blur together, but the objective is different. Section VII made the model *reason better*; this stage makes it *follow instructions and behave as a helpful chat assistant* while carefully preserving everything gained earlier. **[Paper]**

### Instruction Following

After reasoning RL, LN-Super and LN-Ultra get a **short RL run for instruction following**. Using a verification setup like Zhou et al. (2023), synthetic prompts carrying **one to ten** detailed instructions are generated, and RL is run with the **RLOO** algorithm for **fewer than 120 steps** (batch 128), rewarded by an instruction-following verifier. Notably, this lifts scores on *both* instruction-following and reasoning benchmarks. **[Paper]**

### RLHF for Helpfulness and Chat

The final alignment step targets general **helpfulness and chat** without eroding the model's other skills — and the per-model recipe differs: **[Paper]**

- **LN-Super** — **iterative online RPO**, maximizing the reward of **Llama-3.1-Nemotron-70B-Reward** over HelpSteer2 prompts (LR 4e−7, KL β 1e−5, reward scale 3.0, batch 64, 500 steps). Two iterations push its **Arena Hard** score from **69.1 → 88.1**, and — strikingly — improve *every* other benchmark except IFEval, even though neither the data nor the reward model targets math/code/science. The paper's read: RLHF helps the model **better use knowledge it already has**. At 49B, LN-Super's 88.3 Arena Hard beats far larger and proprietary models. **[Paper]**
- **LN-Ultra** — the same process but with **GRPO**: 8 responses per prompt, 30 steps, LR 3e−7, batch 288, KL β 1e−3. **[Paper]**
- **LN-Nano** — **two rounds of offline RPO** on on-policy data: round one mixes reasoning and non-reasoning data (with the right system prompts) to sharpen reasoning *control*; round two uses on-policy generations to improve instruction following (each round ≤400 steps, LR 7e−7, KL β 3e−2, batch 512). **[Paper]**

The takeaway across both RL stages: **reasoning RL and preference RL are complementary, not the same knob** — one raises the reasoning ceiling, the other aligns behaviour, and each uses whichever algorithm (GRPO / RPO / RLOO) suited that model and objective. **[Interpretation]**

## IX. Evaluations & Results

Models are evaluated in **both modes** — `detailed thinking on` and `off` — across **reasoning** benchmarks (AIME 2024/2025, GPQA-Diamond, LiveCodeBench, MATH500) and **non-reasoning** ones (IFEval, BFCL V2 Live tool-calling, Arena-Hard), all at 32K context, reporting average pass@1. **[Paper]** The `on | off` split below is the point of the whole design: one model, two behaviours.

### LN-Ultra: Surpassing the Teacher

LN-Ultra is state-of-the-art on **GPQA among open models**, and the SFT→RL story is visible in the numbers — SFT alone (LN-Ultra-SFT) *approaches* DeepSeek-R1, but RL is what pushes GPQA *past* it. It does this while running on a single **8×H100** node (DeepSeek-R1 needs 8×H200). **[Paper]**

| Task | LN-Ultra (on \| off) | DeepSeek-R1 | Llama-3.1-405B-Instruct |
| --- | --- | --- | --- |
| GPQA-Diamond | **76.0** \| 56.6 | 71.5 | 43.4 |
| AIME24 | **80.8** \| 20.0 | 79.8 | 20.0 |
| AIME25 | **72.5** \| 16.7 | 70.0 | 0.0 |
| MATH500 | 97.0 \| 80.4 | **97.3** | 66.2 |
| LiveCodeBench (2408–2502) | **66.3** \| 29.0 | 65.9 | – |
| IFEval | 88.9 \| 89.5 | 88.8 | **89.2** |
| Arena Hard | 87.0 | **92.0** | 66.2 |

*Table 5 (from the paper, condensed). LN-Ultra reasoning-on leads on GPQA-D and AIME; MATH500 and Arena-Hard stay close to DeepSeek-R1 at a fraction of the serving cost.* **[Paper]**

### LN-Super: Both Modes in One 49B Model

LN-Super is competitive in its weight class: reasoning-**off** it roughly matches its Llama-3.3-70B base; reasoning-**on** it beats DeepSeek-R1-Distilled-Llama-70B — one model covering both use cases. Its 49B **Arena-Hard 88.3** beats much larger and proprietary models; the dedicated IFEval RL run (Section VIII) exists specifically to repair the instruction-following drop that reasoning SFT introduced. **[Paper]**

| Task | LN-Super (on \| off) | R1-Distill-Llama-70B | QwQ-32B | Llama-3.3-70B |
| --- | --- | --- | --- | --- |
| GPQA-Diamond | **66.7** \| 50.0 | 65.2 | 58.8 | 50.5 |
| AIME24 | 67.5 \| 16.7 | 70.0 | **79.5** | 25.8 |
| AIME25 | 60.0 \| 16.7 | 55.0 | **65.8** | 6.7 |
| MATH500 | **96.6** \| 74.0 | 94.5 | 96.2 | 73.8 |
| LiveCodeBench (2408–2502) | 45.5 \| 29.7 | 57.5 | **63.4** | – |
| IFEval | 89.2 \| 89.0 | 85.1 | 86.3 | **92.1** |
| Arena Hard | 88.3 | 65.4 | **90.5** | 72.9 |

*Table 4 (from the paper, condensed). The LiveCodeBench gap is a known artifact — LN-Super's SFT used an earlier code dataset than Nano/Ultra.* **[Paper]**

### Out-of-Distribution: LLM-as-a-Judge

On **JudgeBench** (a task they weren't trained for), LN-Ultra is the **best open model**, beating DeepSeek-R1 and trailing only o3-mini(high); LN-Super beats o1-mini — evidence the reasoning generalizes beyond the training tasks. **[Paper]**

| Model | Overall (JudgeBench) |
| --- | --- |
| o3-mini(high) | **80.86** |
| **LN-Ultra** | 79.14 |
| DeepSeek-R1 | 73.14 |
| **LN-Super** | 69.71 |
| o1-mini | 65.71 |

*Table 6 (from the paper, condensed).* **[Paper]**

The single most important read across all three tables: **SFT builds the reasoning floor, RL raises the ceiling, and a multi-stage post-training pipeline is what makes one model good everywhere at once.** **[Paper]**

## X. Key Takeaways

- **Efficiency is treated as a first-class objective, not a deployment afterthought.** Because capability increasingly comes from test-time compute, inference efficiency becomes a limit on intelligence itself — so the architecture is *searched* for, not just trained. **[Paper]**
- **One model, two behaviours.** The `detailed thinking on/off` toggle is a *learned, prompt-level* switch trained from paired data — no second model, no architecture change, no mid-generation flipping. **[Paper]**
- **SFT sets the floor; RL raises the ceiling.** Distillation can only approach the teacher; large-scale, curriculum-driven, verifiable-reward RL (GRPO, generation in FP8) is what lets LN-Ultra *surpass* DeepSeek-R1 on GPQA. **[Paper]**
- **A great all-rounder needs the whole pipeline.** No single stage produces a model strong across reasoning *and* chat *and* tool use — the multi-stage post-training is the point. **[Paper]**

### The Whole Story in One Line

As a mental model, the paper is:

```text
Llama 3
   ↓
Puzzle / NAS  →  inference-optimized heterogeneous architecture
   ↓
Knowledge Distillation + Continued Pretraining   (recover quality)
   ↓
SFT   (install reasoning + the on/off toggle)
   ↓
Reasoning RL   (GRPO for LN-Ultra — surpass the teacher)
   ↓
Preference Optimization / RLHF   (align: helpfulness, chat, IF)
   ↓
Llama-Nemotron
```

The shorthand **"Llama 3 → Puzzle → SFT → RLHF → Nemotron"** is fine for recall, but it hides two things worth keeping straight: the **recovery training** (distillation + continued pretraining) after the search, and the fact that there are **two distinct RL stages** — reasoning RL, then preference optimization. And a small but important correction: **Puzzle isn't the model — it's the NAS framework** that turns the Llama architecture into an inference-optimized one. **[Interpretation]**

### The Core Idea Behind Puzzle/NAS

The conceptual shift is what makes this whole family possible. Traditional NAS asks:

> *"Find the most accurate architecture."*

Puzzle-style NAS instead asks:

> *"Find the architecture that gives the best quality **while satisfying my hardware and inference constraints**."*

```text
                 Llama 3
                    ↓
              NAS / Puzzle
                    ↓
       ┌────────────────────────┐
       │ Hardware constraints   │
       │   • H100 GPU           │
       │   • memory budget      │
       │   • latency target     │
       │   • throughput target  │
       └────────────────────────┘
                    ↓
       Choose different blocks
       for different layers
                    ↓
       Heterogeneous architecture
```

The paper is explicit that Puzzle transforms LLMs into **hardware-efficient variants under real-world deployment constraints**, with the MIP stage optimizing for hardware compatibility, latency, memory, or throughput. **[Paper]** That's why the *target hardware* matters: **LN-Super** was optimized for a **single H100**, **LN-Ultra** for an **8×H100 node**. So the takeaway to leave with is simple — Puzzle tells NAS to *optimize the model for how you actually intend to run it on the hardware*, trading pure accuracy-maximization for a point on the **accuracy/efficiency Pareto frontier**. **[Interpretation]**
