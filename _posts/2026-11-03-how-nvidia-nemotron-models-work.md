---
layout: post
title: "How NVIDIA Nemotron Models Work: A Peek Under the Hood"
seo_title: "How NVIDIA Nemotron Models Work: Architecture, Training and Reasoning"
date: 2026-11-03
# last_modified_at: YYYY-MM-DD  # optional; JSON-LD dateModified falls back to `date`
author: Trisham Bharat Patil
category: "Artificial Intelligence"
excerpt: "A peek under the hood of NVIDIA Nemotron models: the hybrid Mamba-Transformer architecture, mixture-of-experts layers, and how the open model family is trained."
meta: "NVIDIA • Nemotron • LLM Architecture • Open Models"
description: "How do NVIDIA Nemotron models work? A peek under the hood at the hybrid Mamba-Transformer architecture, mixture-of-experts layers, training and reasoning."
keywords: "NVIDIA Nemotron, Nemotron models, how Nemotron works, Nemotron architecture, hybrid Mamba-Transformer, mixture of experts, open LLMs, reasoning models, Llama Nemotron, NVIDIA open models"
search_intent: informational
tags:
  - NVIDIA
  - Nemotron
  - LLM Architecture
  - Open Models
og_type: article
robots: "index, follow"
structured_data: BlogPosting
image: /assets/blogs/how-nvidia-nemotron-models-work/hero.png
published: true
---

<!--
  SEO
    Primary keyword:   NVIDIA Nemotron
    Secondary:         Nemotron models, how Nemotron works, Nemotron
                       architecture, hybrid Mamba-Transformer, mixture of
                       experts, open LLMs, reasoning models, Llama Nemotron,
                       NVIDIA open models
    Slug:              how-nvidia-nemotron-models-work
    Search intent:     informational

  CONTENT
    Body is author-supplied text only; add sections only when the author supplies them.
    Hero: author-supplied photo (NVIDIA logo on a phone, green NVIDIA eye
    mark blurred behind it).
    Before publishing the body: make sure it puts "NVIDIA Nemotron" in the
    first 100 words and in at least one H2. Trim keywords/description if the
    body doesn't back them up.

  INTERNAL LINKS (candidates)
    /engineering-implementations/ Llama-Nemotron and Nemotron 3 Nano entries,
    Mamba-2 cuTile signal post.
-->

![NVIDIA Nemotron models: the NVIDIA logo on a smartphone screen in front of a glowing green NVIDIA eye mark](/assets/blogs/how-nvidia-nemotron-models-work/hero.png)

**NVIDIA Nemotron** is NVIDIA's family of large language models (LLMs).

One design goal runs through the whole family: get a highly capable model while cutting the compute and memory it needs. NVIDIA's engineers get there with three moves. They mix different kinds of neural-network layers, they activate only a fraction of the parameters for each token, and they speed up how the model generates its output.

This article opens up Nemotron models to show how they work and which techniques NVIDIA used to build them. We'll cover:

- How Nemotron generates text
- Where a transformer model spends its compute and memory
- How NVIDIA Nemotron cuts those costs
- How Nemotron combines Mamba layers with mixture-of-experts (MoE)
- How NVIDIA trains the models
- How Nemotron uses multi-token prediction
- How NVIDIA shrinks the storage footprint of its models

![NVIDIA Nemotron 3 Nano on the Artificial Analysis Intelligence Index vs output speed chart, scoring about 52 at roughly 375 output tokens per second, ahead of gpt-oss-20B, Qwen3 30B A3B and Nemotron Nano 9B V2](/assets/blogs/how-nvidia-nemotron-models-work/nemotron-intelligence-vs-output-speed.png)

*Intelligence vs. output speed. NVIDIA Nemotron 3 Nano sits in the most attractive quadrant: it scores about 52 on the Artificial Analysis Intelligence Index while generating around 375 output tokens per second, faster than any other model on the chart. Source: NVIDIA Developer Blog (data from Artificial Analysis).*

## How NVIDIA Nemotron Generates Text

Nemotron is a transformer-based LLM, so at a high level it generates text the same way any other LLM does.

It starts with the user's input text. The model splits that text into **tokens**: whole words, pieces of words, punctuation marks, or other small fragments of text.

Each token is then turned into a list of numbers called an **embedding**. These embeddings flow through a stack of layers, and each layer refines the model's representation of the text.

![How LLM tokenization works in Nemotron: the text "Alice trusts Bob" is split into tokens, each token is mapped to a token ID, and each ID looks up a row of an embedding table to produce a vector of learned numbers](/assets/blogs/how-nvidia-nemotron-models-work/llm-tokenization-token-ids-embeddings.png)

*From text to embeddings. "Alice trusts Bob" becomes three tokens, each token maps to an ID, and each ID looks up one row of the embedding table. The numbers in each row are learned during training.*

At the output end, the model scores every token that could come next. This is the **decoding** step: it picks one token, adds it to the sequence, and runs again to produce the next one.

All of these calculations use the model's **parameters** (its weights), the values it learned during training.

### Why Nemotron Optimizes for AI Agents

Nemotron's main aim is to make this generation loop as cheap and fast as possible. That matters most for **AI agents**.

An agent doesn't answer once and stop. It reads instructions, calls a tool, reads the tool's response, decides what to do next, and repeats. A coding agent can make dozens of model calls to solve a single problem, so every bit of efficiency per call adds up.

The Nemotron Lightning model, with 30 billion total parameters, is built to make this kind of repeated work cheaper.

## How a Transformer Model Spends Compute and Memory

A transformer-based language model spends most of its compute and memory in two places: **attention** and the **feed-forward network**.

### Token Representations Change Layer by Layer

As we saw, the model splits text into tokens and turns each token into a list of numbers. Think of that list as the token's **representation**.

The representation isn't fixed. As the text moves through the layers, the model learns more about each token and the context around it, and it rewrites the numbers to match.

### Attention: Moving Information Between Tokens

**Attention** is how information moves from one token to another.

Take the sentence *"Adam puts the ice cream in the freezer because it was melting."* To understand "it", the model needs to know about "ice cream", which appeared earlier. Attention pulls that earlier information into the representation of "it".

### Query, Key and Value: How Attention Matches Tokens

Attention works with three vectors per token: a **query**, a **key**, and a **value**. A good analogy is a pile of notes:

- The **query** is the question the current token is asking ("which earlier thing am I referring to?").
- The **key** is the label on each note, describing what that note is about.
- The **value** is the content of the note, the information it can actually hand over.

The model compares the query with every available key. It then mixes the values together, giving more weight to the keys that matched best. Under the hood, all of it is just arithmetic on vectors.

Step through the animation below to watch "it" find "ice cream":

<figure class="qkv-demo" aria-label="Interactive animation of query, key and value attention">
  <noscript>This interactive attention animation needs JavaScript.</noscript>
</figure>
<script src="{{ '/assets/js/attention-qkv-demo.js' | relative_url }}" defer></script>

*How attention works, step by step. The query from "it" is scored against the key of every earlier token, softmax turns the scores into weights, and the weighted values blend into a new representation of "it". Switch heads to see a different matching pattern. Weights are illustrative, not from a real model.*

### Multi-Head Attention and the Feed-Forward Network

A transformer runs several of these attention calculations side by side. Each one is an **attention head**, and each head learns its own way of matching and combining information.

After attention, the **feed-forward network** processes each token position on its own. It applies matrix multiplications and nonlinear functions to produce a new representation.

In our example, once attention has carried "ice cream" into the representation of "it", the feed-forward network refines that representation using patterns it learned in training.

Put simply: **attention collects the useful notes from across the text, and the feed-forward network works on the notes you've collected.**

### The KV Cache: Reusing Work During Generation

Now for the cost.

A model writes its answer one token at a time. It produces a token, feeds it back in as part of the input, and produces the next one. This is called **autoregressive generation**.

Between steps, almost all of the text stays the same. Recomputing the keys and values for every earlier token at every step would repeat a huge amount of work.

The **KV cache** fixes this by storing those keys and values so the model can reuse them. But the cache lives in memory. With full attention, a longer history means more keys and values to store, and more of them to check at every step.

### Prefill vs. Decode: Quadratic vs. Linear Attention Cost

Reading the prompt (**prefill**) and continuing the answer (**decode**) cost different amounts.

During prefill, the model works out relationships across every position in the prompt. In a model that only looks backward, the first token compares against one position, the second against two, the third against three, and so on. Those comparisons pile up across the whole prompt.

So if you **double the prompt, the attention work roughly quadruples**: the cost grows quadratically with prompt length.

During decode, the KV cache already holds everything earlier. Each new token only compares itself against the cached history, so **doubling the history roughly doubles the attention work** for that token: linear growth.
