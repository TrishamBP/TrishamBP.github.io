---
layout: post
title: "What Training Actually Means for a Transformer: Batches, Steps, and Epochs Explained"
date: 2026-04-15
author: Trisham Patil
---

For about three years I couldn't precisely answer this question: *what does training a transformer actually mean?*

Not in the handwavy "it learns from data" sense. In the operational sense — what computations run, in what order, how many times, and what changes as a result. This post is the answer I wish I'd had earlier.

---

## The Textbook Analogy

Imagine you have a textbook with 10,000 sentences.

Training a transformer means:

1. Show it a sentence
2. Ask it to predict what comes next
3. Check how wrong it was
4. Nudge its internal weights to be a little less wrong next time

That's the entire loop. The complexity isn't in the idea — it's in the mechanics of doing this at scale across billions of parameters and terabytes of data.

---

## GPU Memory: Why You Can't Feed It Everything at Once

You can't show the model all 10,000 sentences in one go. Memory limits make that impossible.

When BERT was introduced in 2018, the most powerful widely-available GPU was the **NVIDIA Tesla V100** — either 16 GB or 32 GB of HBM2 VRAM. Training BERT-Large required multiple such GPUs running in parallel, with gradient synchronization across them. Even with 32 GB, you cannot hold the full dataset, the model weights, the optimizer states, and the intermediate activations in memory simultaneously.

So instead, you split the data into chunks. Each chunk gets processed, graded, and used to update the model. When you've gone through every chunk — every sentence in the book — that's one full read-through of the data. That's one epoch.

Before going further, it helps to have precise names for each piece.

---

## The Four Levels: Batch, Step, Epoch, Training Run

![Transformer training overview — dataset split into batches, processed in steps, looped through epochs](/assets/blogs/training.png)

### Batch

A **batch** is a subset of your dataset that fits in GPU memory and gets processed together.

If your dataset has 10,000 sentences and your batch size is 100, you have **100 batches**.

Batch size is not a hyperparameter you set once and forget. Larger batches mean more stable gradient estimates but require more VRAM. Smaller batches introduce more noise — which can sometimes help generalization — but are computationally less efficient per unit of data.

### Step (Iteration)

A **step**, also called an **iteration**, is one complete cycle:

> Take a batch → run it forward through the model → compute the loss → backpropagate gradients → update the weights

**One batch = one step = one weight update.**

Every time you hear "the model trained for 500 steps," that means the weights were updated 500 times.

### Epoch

An **epoch** is one complete pass through the entire dataset.

If you have 100 batches, then **100 steps = 1 epoch**. After one epoch, the model has seen every training example exactly once.

### Training Run

A **training run** is the entire process from start to finish — all epochs combined.

If you train for 5 epochs with 100 batches each: **5 × 100 = 500 total steps**.

---

## What Happens Inside a Single Training Step

A step is not "the model reads a sentence." A step is a full round trip through the entire model — forward, loss, backward, update.

![Diagram of a single training step: forward pass, loss computation, backward pass, optimizer step](/assets/blogs/step.png)

### Forward Pass

The batch of token IDs hits the **embedding layer** and becomes a matrix of vectors — one row per token.

These vectors pass through every transformer layer **sequentially**. Each layer applies:

1. **Multi-head self-attention** — tokens attend to each other to build context
2. **Position-wise feed-forward network (FFN)** — each token independently passes through two linear transformations with a nonlinearity in between

After all N layers, the final representations are projected to **vocabulary-sized logits** — one probability distribution per token position, over every possible next token in the vocabulary.

### Loss Computation

The model's predicted distribution is compared against the actual next tokens (for GPT-style models) or the masked tokens (for BERT-style models) using **cross-entropy loss**.

This produces a single scalar number: *how wrong was the model on this batch?*

That number is the loss.

### Backward Pass

PyTorch or JAX traces back through every operation — the output projection, every FFN, every attention computation, every embedding lookup — computing the **gradient of the loss with respect to each parameter**.

This is the chain rule applied across potentially hundreds of layers. The gradient tells you: *in which direction and by how much should each weight move to reduce the loss?*

### Optimizer Step

The optimizer — typically **Adam** or **AdamW** — takes those gradients and updates every weight in the model.

One step is done. The model is now slightly better.

---

## An Important Nuance: A Step Touches All Layers

This is easy to miss.

During one step, the input passes through **all layers** — not just one. If your transformer has 12 layers, that means:

- 12 attention computations + 12 FFN computations on the forward pass
- The reverse on the backward pass

A "step" is not one layer. It's a full round trip through the entire model. This is why training large models is expensive — each step involves an enormous amount of arithmetic, and you may need hundreds of thousands of steps.

---

## Epochs: Same Data, Multiple Passes

![Diagram showing the same dataset re-shuffled across multiple epochs](/assets/blogs/epoch.png)

Each epoch uses the same 10,000 samples — but **re-shuffled into different batches**.

The model sees every example again, but in a different order. Why does this help?

Because the model doesn't just memorize sequence patterns — it updates its weights based on the accumulated signal from every example across every batch. Seeing the same data in different orderings forces the model to build representations that generalize, rather than overfit to one particular traversal order.

Loss decreases because each weight update across all 500 steps **accumulates into better representations**. Early epochs reduce loss quickly. Later epochs squeeze out finer adjustments.

---

## Concrete Numerical Example

Dataset: 10,000 sentences  
Batch size: 100  
Number of batches: 100  
Epochs: 5  
Total steps: **500**

| Epoch | Steps in this epoch | Cumulative steps |
|---|---|---|
| 1 | 100 | 100 |
| 2 | 100 | 200 |
| 3 | 100 | 300 |
| 4 | 100 | 400 |
| 5 | 100 | 500 |

After 500 steps, the training run is complete. The model has seen every sentence 5 times, in 5 different orderings. The weights have been updated 500 times.

---

## Quick Reference

<div style="background-color:#1a1a2e; padding:1.5rem; border-radius:8px; display:inline-block; width:100%;">
  <img src="/assets/blogs/main.png" alt="Summary table: Batch, Step, Epoch, Training Run, Training Loss, and Validation Metric — definitions, when each occurs, and example values" style="display:block; width:100%;" />
</div>

---

## Key Takeaways

- **Batch** — subset of data that fits in GPU memory; processed together
- **Step** — one forward + backward pass over one batch; one weight update
- **Epoch** — one full pass over the entire dataset; N batches = N steps
- **Training run** — all epochs combined; total steps = batches × epochs
- A single step touches **all layers** of the model, not just one
- Shuffling between epochs promotes generalization over memorization
- GPU memory limits (32 GB on the V100 in 2018) are why batching exists — not an arbitrary choice

---

## Conclusion

Training a transformer is not magic. It's a structured loop: chunk the data, run each chunk through the model, measure the error, propagate gradients backward, update the weights, repeat.

The vocabulary of batches, steps, and epochs is the vocabulary of that loop. Once you have it, everything else — learning rate schedules, gradient accumulation, distributed training — is just a variation on the same underlying mechanics.

The weights get nudged. Over 500 steps, those nudges compound into a model that has learned something.
