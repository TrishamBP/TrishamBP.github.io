---
layout: learning-paper
title: "Attention Is All You Need"
authors: "Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., Polosukhin, I."
year: 2017
venue: "NeurIPS 2017"
description: "Proposes the Transformer — a sequence model built entirely on self-attention, eliminating recurrence and convolution. The architecture achieves state-of-the-art machine translation quality while being dramatically faster to train in parallel. It became the architectural foundation for every modern large language model."
highlights:
  - "Multi-head self-attention allows the model to jointly attend to information from different representation subspaces"
  - "Positional encoding injects sequence-order information without recurrence, enabling full parallelism"
  - "Encoder-decoder architecture with cross-attention generalises to any seq2seq task"
  - "Achieves 28.4 BLEU on WMT 2014 English-to-German, surpassing all prior ensembles"
tags: ["Transformer", "Self-Attention", "NLP", "Sequence Modeling", "Architecture", "Deep Learning"]
image: "/assets/research/attention.png"
paper_link: "https://proceedings.neurips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf"
read_link: "/learning-lab/attention-is-all-you-need/"
date: 2017-06-12
---

![Transformer architecture diagram](/assets/research/attention/transformer.png)

---

## Why This Paper Matters

The paper evaluates machine translation primarily using the **BLEU (Bilingual Evaluation Understudy) score**, a standard benchmark that measures overlap between a candidate translation and one or more human reference translations via n-gram matching (with a brevity penalty).

On the WMT 2014 English→German dataset, the "big" Transformer reported **28.4 BLEU**, exceeding previously reported best results — including ensembles — by more than 2 BLEU. To calibrate that number: changing a major design choice like collapsing to a single attention head only reduces BLEU by roughly 1 point. So a +2 point improvement is unusually large. In competitive MT benchmarks, even ~1 BLEU can be meaningful. A +2 shift is typically interpreted as a qualitative architectural leap, not a minor tweak.

---

## The Pre-Transformer Landscape: Why Recurrence and Convolution Were Limiting

Before Transformers, the dominant approaches to sequence transduction were:

- **Recurrent models** (RNNs, LSTMs, GRUs)
- **Convolutional sequence models** (ByteNet, ConvS2S)

### The Fundamental Constraint of Recurrent Computation

Recurrent models factor computation over time steps. At step _t_, the hidden state depends on the previous step. This enforces **sequential computation** within each example, which limits parallelization. As sequence length grows, it becomes harder to batch effectively (memory constraints), and training time increases. Long-range dependencies become harder because the computational path between distant tokens grows with distance.

#### Simple RNN: Minimal Recurrence

```
h_t = σ(W_h · h_{t-1} + W_x · x_t + b)
```

The simplest formulation: the hidden state is a function of the previous hidden state and the current input. Expressive in principle, but the sequential dependency is a hard constraint.

#### LSTM: Gated Memory via Cell State

LSTMs add a persistent memory cell (_C_t_) and three gates — forget, input, and output — to control information flow:

```
f_t  = σ(W_f [h_{t-1}, x_t] + b_f)        # forget gate
i_t  = σ(W_i [h_{t-1}, x_t] + b_i)        # input gate
C̃_t = tanh(W_C [h_{t-1}, x_t] + b_C)     # candidate cell
C_t  = f_t ⊙ C_{t-1} + i_t ⊙ C̃_t         # cell state update

o_t  = σ(W_o [h_{t-1}, x_t] + b_o)        # output gate
h_t  = o_t ⊙ tanh(C_t)                    # hidden state
```

The cell state provides a highway for gradients, which helps with longer dependencies — but the sequential bottleneck remains.

#### GRU: Simplified Gating

GRUs streamline the gating mechanism into two gates (reset and update), while preserving the same sequential dependency:

```
z_t  = σ(W_z [h_{t-1}, x_t] + b_z)        # update gate
r_t  = σ(W_r [h_{t-1}, x_t] + b_r)        # reset gate
h̃_t = tanh(W [r_t ⊙ h_{t-1}, x_t] + b)   # candidate hidden state
h_t  = (1 - z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t   # hidden state
```

The input and previous hidden state feed into the reset gate and update gate. The reset gate modulates how much of the past hidden state enters the candidate, and the update gate interpolates between old and new.

![RNN, LSTM, and GRU comparison](/assets/research/attention/rnn-lstm-gru.jpg)

### Convolutional Models and the Long-Distance Problem

Convolutional approaches improved parallelism over RNNs, but still faced an increasing computational distance between far-apart tokens. Local receptive fields require deeper stacks to propagate information across long sequences, so the effective path between distant tokens still grows with distance — even if more slowly than in strict recurrence.

Parallelism alone is not enough. Models must also allow **direct interaction** between arbitrary positions without requiring many layers of intermediate computation.

**Mental model:**

- RNNs are a word-by-word reader: expressive but inherently sequential.
- CNNs are a parallel scanner: fast but need depth to connect far-apart positions.

---

## The Transformer's Central Idea

The Transformer proposes a model that removes recurrence and convolution entirely, using **attention as the only sequence interaction mechanism**, with pointwise MLPs for per-token processing. This enables high parallelization during training.

Two linked motivations:

1. **Optimization / Engineering:** Break the sequential computation bottleneck to maximize parallelism on modern hardware.
2. **Representation:** Allow every token to directly condition on every other token, making long-range dependencies easier to learn.

The conceptual shift is not merely that "attention helps," but that sequence modeling can be built entirely from global, content-based routing (attention) plus local non-linear transformation (position-wise FFN).

---

## Attention as a Computation Primitive

An attention function maps a **query** and a set of **key–value pairs** to an output vector.

### Query / Key / Value Roles

The same input representation is projected into three distinct roles:

- **Query (Q):** What this position is looking for.
- **Key (K):** What this position offers — how it should be matched against.
- **Value (V):** The information to be aggregated if matched.

Self-attention is a **learned weighted averaging mechanism** over token representations. The weights come from comparing queries to keys; the content that flows comes from the values.

Given input matrix _X_ (shape: sequence length _n_ × model dimension _d_model_):

```
Q = X · W_Q
K = X · W_K
V = X · W_V
```

### Scaled Dot-Product Attention

```
Attention(Q, K, V) = softmax(Q K^T / √d_k) · V
```

Where _d_k_ is the query/key dimensionality per head and _QK^T_ produces an _n × n_ matrix of pairwise similarity scores.

![Scaled dot-product attention diagram](/assets/research/attention/attention.png)

#### Why the √d_k Scaling Exists

With large _d_k_, dot products can grow large in magnitude. This pushes softmax into saturated regions where gradients become vanishingly small. Scaling by _1/√d_k_ keeps logits in a trainable regime.

#### Dot-Product vs. Additive Attention

Two common attention families exist:

- **Additive attention:** compatibility computed by a small feed-forward network.
- **Dot-product attention:** compatibility computed by inner product.

Dot-product attention is typically faster and more space-efficient in practice thanks to optimized matrix multiplication. For large dimensions, additive attention can outperform _unscaled_ dot-product attention; the scaling factor is a targeted fix for this.

### Multi-Head Attention

Multi-head attention runs attention in parallel across multiple learned projection subspaces:

```
head_i = Attention(Q · W_i^Q,  K · W_i^K,  V · W_i^V)

MultiHead(Q, K, V) = Concat(head_1, ..., head_h) · W^O
```

![Multi-head attention diagram](/assets/research/attention/multihead-attention.jpg)

#### What Multi-Head Attention Buys You

A single attention head produces one weighted average, which can behave like an averaging blur. Multiple heads mitigate this by letting the model attend to different representation subspaces simultaneously.

Consider the sentence: _"The Law will never be perfect, but its application should be just."_ Different heads can specialise in different phenomena:

- One head resolves "its" → "The Law" (anaphora / coreference).
- Another aligns "its" with "application" for local syntactic structure.

**Mental model:** Multi-head attention is a committee of specialist readers. Each reads for a different phenomenon, then the model combines their evidence.

---

## Self-Attention: What It Replaces and Why

Self-attention relates positions within a single sequence. In self-attention, Q, K, and V all come from the same sequence.

### Core Motivations

- **Constant path length:** Any token can directly attend to any other token in a single attention step, easing long-range dependency learning.
- **Parallelism:** Removes the sequential bottleneck of recurrence.
- **Interpretability:** Attention maps can sometimes be inspected to reveal learned linguistic structures (coreference, syntactic dependencies).

Each token representation becomes a context-dependent mixture of other token value vectors. Ambiguity resolution emerges naturally because different contexts induce different attention patterns.

### The Trade-Off: Quadratic Cost

Self-attention forms an _n × n_ attention matrix per head. This was often acceptable in the original paper's translation settings but becomes a bottleneck for very long contexts, motivating later efficiency variants.

**Key distinction:**

- Self-attention primarily addresses the _sequence-length interaction_ problem.
- Residual connections + normalization primarily address the _depth / optimization_ problem.

---

## Position-Wise Feed-Forward Networks

Each encoder/decoder layer contains a position-wise FFN applied independently at each position:

```
FFN(x) = max(0, x · W_1 + b_1) · W_2 + b_2
```

"Position-wise" means the same FFN parameters are applied to every token position. There is no cross-token mixing in the FFN; cross-token mixing happens exclusively in attention. While input and output stay at _d_model_, the inner FFN dimension is often much larger (e.g., _d_ff = 2048_ when _d_model = 512_), providing additional capacity.

**Mental model:** Attention is communication between positions; FFN is per-token computation.

---

## Positional Encoding: Injecting Order

Attention is permutation-invariant unless we inject order. The Transformer does this by adding positional signals to embeddings.

**Operational order:** Token IDs → embedding lookup → add positional encoding.

### Sinusoidal Positional Encoding (Original Paper)

```
PE(pos, 2i)   = sin(pos / 10000^(2i / d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i / d_model))
```

Sin/cos at multiple frequencies creates a unique "signature" per position. Relative offsets can be expressed as linear functions of the encodings, and sinusoidal encodings may extrapolate to longer sequences better than learned positional embeddings.

**Key insight:** Positional encoding provides coordinates; attention provides relational meaning.

---

## The Transformer Architecture

### High-Level Roles

- **Encoder:** Produces contextualised representations of the input (often called "memory").
- **Decoder:** Generates output autoregressively while attending to both past output tokens (masked self-attention) and encoder memory (cross-attention).

### Residual Connections and Layer Normalization

![Add & Norm sublayer diagram](/assets/research/attention/normalization.png)

The original paper uses the pattern:

```
LayerNorm(x + Sublayer(x))
```

**Why residual connections help:** They create short paths for gradients to propagate through depth and preserve information across layers — layers learn refinements rather than full transformations.

**Why layer normalization helps:** It stabilises activation scales and improves training robustness in deep stacks.

Two common placements exist:

- **Post-LN (original Transformer):** Normalise after residual addition; often paired with learning-rate warmup.
- **Pre-LN (common modern variant):** Normalise before the sublayer; generally more stable for deep models.

### The Encoder

The encoder consists of a stack of 6 identical layers, each containing:

1. Multi-head self-attention
2. Position-wise FFN

Residual connections and layer normalisation wrap each sublayer.

![Encoder information flow](/assets/research/attention/encoder-flow.jpg)

### The Decoder

The decoder layer contains three sublayers:

1. **Masked multi-head self-attention** — prevents "peeking" at future tokens.
2. **Encoder–decoder attention (cross-attention)** — queries from decoder states, keys/values from encoder memory.
3. **Position-wise FFN.**

#### Why Masking Is Required

To preserve autoregressive generation, token at position _i_ must not depend on tokens at positions _j > i_. Implementation: set illegal attention logits to −∞ before softmax so they receive zero weight.

#### Decoder Step-by-Step

- Input tokens (generated-so-far in inference; shifted targets in training) are embedded and combined with positional signals.
- Masked self-attention uses only left context.
- Cross-attention uses queries from decoder states, keys/values from encoder memory.
- Output projection + softmax produces the next-token distribution.

---

## Training vs. Inference

### Training (Teacher Forcing + Masking)

Transformers preserve autoregressive constraints while enabling parallel training:

- The encoder processes the source sentence once.
- Decoder input is the target sequence shifted right (starts with `<Start>`).
- Masking ensures token _i_ cannot attend to positions > _i_.
- The model predicts distributions for all target positions **in parallel**.
- Loss is computed against ground-truth tokens; gradients backpropagate through all layers.

### Inference (Autoregressive Loop)

- Encoder processes the input once and caches its output.
- Decoder starts from `<Start>` and generates one token at a time.
- Each predicted token is appended to the decoder input.
- Generation stops at `<EOS>` or max length.

**Key insight:** Training uses ground-truth tokens (teacher forcing) to stabilise learning. Inference uses model outputs as future inputs, so early errors can propagate.

---

## Training Regime and Engineering Details

**Datasets:** WMT 2014 English–German (~4.5M sentence pairs, BPE, shared vocab ~37k) and English–French (36M sentences, word-piece vocab ~32k).

**Batching:** Batches grouped by approximate sequence length, each containing ~25k source and ~25k target tokens.

**Hardware:** Single machine with 8 NVIDIA P100 GPUs. Base model trained for 100k steps (~12 hours); big model for 300k steps (~3.5 days).

**Optimization:** Adam with β₁=0.9, β₂=0.98, ε=10⁻⁹. Learning rate uses warmup for 4000 steps (linear increase), then decays proportional to the inverse square root of the step number.

**Regularization:** Residual dropout (_p_=0.1) applied to sublayer outputs and embedding+positional sums. Label smoothing (ε=0.1) — can hurt perplexity but improves BLEU. Checkpoint averaging over last 5 (base) or 20 (big) checkpoints.

---

## What Made the Transformer Work: Ablations and Insights

### Why It Yields Better BLEU

- Self-attention enables global dependency modelling with constant interaction distance.
- Multi-head attention captures multiple relation types simultaneously.
- Parallelization reduces time-to-quality and makes scaling practical.
- Regularization choices (label smoothing, dropout) materially affect BLEU.

### Sensitivity Observations

- Using a single attention head caused ~0.9 BLEU drop.
- Too many heads (e.g., 16 or 32) can degrade performance.
- Reducing key size _d_k_ hurts quality.
- Removing dropout degrades performance.

Performance gains are not purely architectural; optimization and regularization are integral to the design.

---

## Architectural Variants: Encoder-Only, Decoder-Only, Encoder–Decoder

![Transformer architectural variants overview](/assets/research/attention/overview.png)

### Encoder-Only (BERT-Style): Bidirectional Representations

Encoder-only models compute representations where each token depends on both left and right context. Best suited for per-token labelling or classification tasks (e.g., NER). The training objective is typically masked-token prediction, but the architectural point is **bidirectionality**.

![BERT encoder-only architecture](/assets/research/attention/bert.jpg)

### Decoder-Only (GPT-Style): Causal Generation

Decoder-only models implement causal masking so each token depends only on its left context. Optimised for next-token prediction and generation. The same masked self-attention mechanism used in the Transformer decoder becomes the entire backbone.

![GPT decoder-only architecture](/assets/research/attention/gpt.jpg)

### Encoder–Decoder: Sequence-to-Sequence

Encoder–decoder architectures model conditional generation: translation (output conditioned on input sentence), summarization (output conditioned on input document). The encoder computes memory for the input; the decoder uses cross-attention to consult that memory while generating tokens.

---

## How Embeddings Become Contextual Representations

The central throughline is the transition from static, context-independent token embeddings to contextual representations through repeated self-attention + FFN blocks. Each token becomes a mixture of other tokens' value vectors, with mixture weights determined by query–key similarity.

### A Concrete Example: "flies"

- In _"time flies like an arrow,"_ "flies" should become more verb-like.
- In _"fruit flies like a banana,"_ "flies" should become more insect-like.

Mechanistically: "flies" forms a query vector. It matches keys differently depending on context — high weight on "time" versus "fruit." Values from the attended tokens flow into the updated "flies" representation, resolving the ambiguity.

**End-to-end mental model:**

- Positional signals give tokens an order-aware coordinate system.
- Attention performs content-based routing between tokens.
- FFNs provide local non-linear processing.
- Residual connections + normalisation keep deep composition trainable.
