---
layout: post
title: "PySR: Discover Mathematical Laws from Data with Symbolic Regression"
seo_title: "PySR Symbolic Regression: Discover Mathematical Laws from Data"
description: "PySR symbolic regression discovers mathematical laws from data, evolving readable equations instead of black-box weights. A Signals post on interpretable ML."
keywords: "PySR, symbolic regression, interpretable machine learning, equation discovery, SymbolicRegression.jl, evolutionary algorithm, genetic programming, AI for science, Julia"
category: "Interpretable ML"
meta: "Interpretable ML"
date: 2026-10-20
author: Trisham Patil
tags: ["PySR", "Symbolic Regression", "Interpretable ML", "Equation Discovery"]
image: "/assets/blogs/pysr/pysr-symbolic-regression-logo.png"
og_type: article
robots: "index, follow"
structured_data: BlogPosting
mathjax: true
---

<!--
  SEO
    Primary keyword:   PySR symbolic regression
    Secondary:         symbolic regression, interpretable machine learning, equation discovery,
                       SymbolicRegression.jl, evolutionary algorithm, genetic programming,
                       AI for science, discover mathematical laws from data
    Slug:              /signals/pysr-symbolic-regression-discover-mathematical-laws-from-data/
-->

![PySR symbolic regression logo: a DNA double helix built from math operators like sin, cos, exp, log, plus and divide](/assets/blogs/pysr/pysr-symbolic-regression-logo.png)

## What Is PySR?

[PySR](https://github.com/MilesCranmer/PySR) is an open-source library for **symbolic regression**. Most machine learning fits weights inside a fixed model. Symbolic regression instead searches for a mathematical expression, such as $y = 2.5\cos(x) + x^2$, that best satisfies an objective. What you get back is an equation a person can read, check and reuse, not a black box.

PySR has been built for three things: speed, flexibility and ease of use. You can choose the operators, the loss and the constraints on the search. You still drive it from a few lines of Python.

Under the hood, PySR is a front end to the Julia library [SymbolicRegression.jl](https://github.com/MilesCranmer/SymbolicRegression.jl). The two are developed together, and the Julia side runs the actual equation search. The algorithms behind it are described in the PySR paper, [*Interpretable Machine Learning for Science with PySR and SymbolicRegression.jl*](https://arxiv.org/abs/2305.01582) (Cranmer, 2023).

### Symbolic Regression Beyond Low-Dimensional Data

Symbolic regression works best when the data has only a handful of input variables. With many inputs, the space of possible equations grows too fast to search directly.

One way around this is **symbolic distillation**. First, train a neural network on the high-dimensional problem. Then run symbolic regression on the network's internal pieces, so each learned function is replaced by an explicit equation. The paper [*Discovering Symbolic Models from Deep Learning with Inductive Biases*](https://arxiv.org/abs/2006.11287) (Cranmer et al., 2020) uses this on N-body physics problems.

That makes PySR both an equation-discovery tool and a way to **interpret deep neural networks**: it turns what a network has learned into a formula you can inspect.

<div class="ts-note ts-note--key" markdown="0">
  <span class="ts-note-title">💡 Preparing Data for PySR: Text Values and Normalization</span>
  <div class="ts-note-body">
    <p><strong>1. Can PySR handle text values?</strong></p>
    <p>No. PySR cannot work with raw text. Symbolic regression builds explicit equations from operators like $+$, $\times$, $\sin$ and $\exp$, so every input feature and the target must be numeric (float or int).</p>
    <p><strong>How to handle it:</strong> encode or vectorize text and categorical columns before passing them to PySR. Standard tools such as <code>OneHotEncoder</code>, <code>OrdinalEncoder</code> or numeric text embeddings like TF-IDF turn them into numeric columns.</p>
    <p><strong>2. Do you need to normalize the data?</strong></p>
    <p>PySR will run on unscaled data, but scaling your features and target is strongly recommended, for two reasons:</p>
    <ul>
      <li><strong>It prevents numerical overflow.</strong> The evolutionary search tries many combinations of operations, including powers and exponents. If one column lies between $0$ and $1$ and another is in the millions, candidate equations quickly hit <code>NaN</code> or <code>Inf</code>. The run can then fail or ignore those features.</li>
      <li><strong>It improves constant optimization.</strong> PySR tunes the constant coefficients inside each candidate formula. On scaled data, that inner optimizer converges faster and more reliably.</li>
    </ul>
    <p><strong>The quick fix:</strong> pass your features ($X$) and target ($y$) through a scikit-learn scaler such as <code>StandardScaler</code> or <code>MinMaxScaler</code> before calling <code>.fit(X, y)</code>. The search stays stable and the equations come out cleaner.</p>
  </div>
</div>
