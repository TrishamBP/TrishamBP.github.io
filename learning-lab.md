---
layout: default
title: Learning Lab
permalink: /learning-lab/
---

<!-- ===================== HEADER ===================== -->
<section class="content-section lab-section" aria-labelledby="lab-heading">
  <h1 id="lab-heading" class="section-title">Learning Lab</h1>
  <p class="research-intro">
    Research-first explorations focused on deeply understanding research papers and technical reference books across
    artificial intelligence, machine learning, statistics, natural language processing, LLM engineering,
    distributed systems, and MLOps.
  </p>
</section>

<!-- ===================== SECTION 1: RESEARCH PAPERS ===================== -->
<section class="content-section lab-papers-section" aria-labelledby="papers-heading">
  <h2 id="papers-heading" class="section-title lab-section-heading">Research Papers</h2>
  <p class="research-intro">
    Foundational and frontier papers read closely — covering architecture decisions, experimental methodology,
    and what the results actually mean for building real AI systems.
  </p>

  {% assign all_papers = site.learning_papers | sort: "date" | reverse %}
  <div class="lab-feed" aria-label="Research papers feed">
    {% for paper in all_papers %}
      <article class="lab-card lab-paper-card" aria-label="{{ paper.title }}">

        <div class="lab-card-image-wrap lab-paper-placeholder" aria-hidden="true">
          <span class="lab-paper-icon">&#128196;</span>
          {% if paper.year %}
            <span class="lab-paper-year">{{ paper.year }}</span>
          {% endif %}
        </div>

        <div class="lab-card-content">

          <h3 class="lab-card-title">{{ paper.title }}</h3>

          {% if paper.authors %}
            <p class="lab-card-meta lab-card-authors">{{ paper.authors }}</p>
          {% endif %}

          {% if paper.venue %}
            <p class="lab-card-venue">{{ paper.venue }}</p>
          {% endif %}

          <p class="lab-card-description">{{ paper.description }}</p>

          {% if paper.highlights and paper.highlights.size > 0 %}
            <ul class="lab-card-highlights">
              {% for highlight in paper.highlights %}
                <li>{{ highlight }}</li>
              {% endfor %}
            </ul>
          {% endif %}

          {% if paper.tags and paper.tags.size > 0 %}
            <div class="lab-tag-pills">
              {% for tag in paper.tags %}
                <span class="lab-tag-pill">{{ tag }}</span>
              {% endfor %}
            </div>
          {% endif %}

          <a class="article-read-more lab-card-cta" href="{{ paper.url | relative_url }}">Read Research &rarr;</a>

        </div>
      </article>
    {% endfor %}
  </div>

  {% if all_papers.size == 0 %}
    <p class="research-intro">Research paper breakdowns are being prepared.</p>
  {% endif %}
</section>

<!-- ===================== SECTION 2: TECHNICAL BOOKS ===================== -->
<section class="content-section lab-books-section" aria-labelledby="books-heading">
  <h2 id="books-heading" class="section-title lab-section-heading">Technical Books</h2>
  <p class="research-intro">
    Cover-to-cover reads that shaped how I think about data, models, and systems — not just
    what the algorithms do, but when they break and why that matters at scale.
  </p>

  <div class="lab-feed" aria-label="Technical books feed">

    <!-- ——— BOOK 1: Time Series Forecasting in Python ——— -->
    <article class="lab-card lab-book-card" aria-label="Time Series Forecasting in Python">

      <div class="lab-card-image-wrap lab-book-image-wrap">
        <img
          class="lab-book-image"
          src="{{ '/assets/technical_books/Time Series Forecasting in Python.jpg' | relative_url }}"
          alt="Time Series Forecasting in Python book cover"
        />
      </div>

      <div class="lab-card-content">

        <h3 class="lab-card-title">Time Series Forecasting in Python</h3>
        <p class="lab-card-meta">Marco Peixeiro</p>

        <p class="lab-card-description">
          This book fundamentally reshaped how I think about temporal data — not just as sequences,
          but as evolving systems governed by structure, randomness, and hidden patterns.
        </p>

        <p class="lab-card-description">
          I started with the basics: understanding what a <em>random walk</em> really means in practice —
          how noise alone can mimic meaningful behaviour — and why <em>stationarity</em> is the cornerstone
          of any reliable forecasting pipeline. The book builds intuition step-by-step, teaching how to
          decompose time series into <em>trend</em>, <em>seasonality</em>, and residual components, which
          is something I now naturally apply when analysing any real-world signal.
        </p>

        <p class="lab-card-description">
          What stood out most was how seamlessly it transitions from intuition to mathematical rigour.
          Models like <em>AR</em>, <em>MA</em>, <em>ARIMA</em>, and <em>SARIMAX</em> are not just introduced
          as formulas, but as tools that encode assumptions about time — memory, dependency, and structure.
          I learned not just how to use them, but when they fail.
        </p>

        <p class="lab-card-description">
          The real turning point was connecting classical statistical models to modern deep learning.
          Seeing how <em>RNNs</em>, <em>LSTMs</em>, and <em>GRUs</em> extend the idea of temporal
          dependency made everything click — from linear assumptions in ARIMA to nonlinear sequence
          modelling in neural networks. This book didn't just teach forecasting — it trained me to
          think in time-aware systems, which is critical for everything from financial modelling to
          real-time AI pipelines.
        </p>

        <div class="lab-tag-pills">
          <span class="lab-tag-pill">Random Walk</span>
          <span class="lab-tag-pill">Stationarity</span>
          <span class="lab-tag-pill">AR / MA</span>
          <span class="lab-tag-pill">ARIMA</span>
          <span class="lab-tag-pill">SARIMAX</span>
          <span class="lab-tag-pill">RNN</span>
          <span class="lab-tag-pill">LSTM</span>
          <span class="lab-tag-pill">GRU</span>
          <span class="lab-tag-pill">Time Series</span>
          <span class="lab-tag-pill">Python</span>
        </div>

      </div>
    </article>

    <!-- ——— BOOK 2: Hands-On ML with Scikit-Learn, Keras & TensorFlow ——— -->
    <article class="lab-card lab-book-card" aria-label="Hands-On Machine Learning with Scikit-Learn, Keras and TensorFlow">

      <div class="lab-card-image-wrap lab-book-image-wrap">
        <img
          class="lab-book-image"
          src="{{ '/assets/technical_books/Hands-On_Machine_Learning_with_Scikit-Learn-Keras-and-TensorFlow-2nd-Edition-Aurelien-Geron.jpg' | relative_url }}"
          alt="Hands-On Machine Learning with Scikit-Learn, Keras and TensorFlow book cover"
        />
      </div>

      <div class="lab-card-content">

        <h3 class="lab-card-title">Hands-On Machine Learning with Scikit-Learn, Keras &amp; TensorFlow</h3>
        <p class="lab-card-meta">Aurélien Géron</p>

        <p class="lab-card-description">
          This book has been one of the most practical and system-level impactful resources in my
          machine learning journey. What makes it powerful is how it bridges the gap between theory
          and production — instead of just explaining algorithms, it shows how to build complete
          pipelines, from data preprocessing and feature engineering to model training, evaluation,
          and deployment.
        </p>

        <p class="lab-card-description">
          I developed a strong intuition for <em>supervised</em> and <em>unsupervised learning</em>,
          understanding not just how models work, but how to choose them under real-world constraints.
          Concepts like bias-variance tradeoff, regularisation, and model selection became second nature
          through hands-on implementation.
        </p>

        <p class="lab-card-description">
          Where this book goes deeper — and where it aligns with my current interests — is in
          <em>deep learning and TensorFlow</em>. It doesn't just stop at neural networks; it dives into
          how modern systems are built. The exposure to TensorFlow's ecosystem helped me understand
          scalable training, modular architectures, and how different components of a model can be
          trained and optimised independently.
        </p>

        <p class="lab-card-description">
          One of the most valuable insights for me was thinking in terms of <em>distributed systems</em> —
          how training can be parallelised, how different parts of a model (like <em>multi-head structures</em>)
          can be learned simultaneously, and how this translates into real-world performance gains.
          This book didn't just teach machine learning — it taught me how to <em>engineer ML systems</em>.
        </p>

        <div class="lab-tag-pills">
          <span class="lab-tag-pill">Supervised Learning</span>
          <span class="lab-tag-pill">Unsupervised Learning</span>
          <span class="lab-tag-pill">Neural Networks</span>
          <span class="lab-tag-pill">TensorFlow</span>
          <span class="lab-tag-pill">Keras</span>
          <span class="lab-tag-pill">Scikit-Learn</span>
          <span class="lab-tag-pill">Distributed Training</span>
          <span class="lab-tag-pill">Multi-Head Models</span>
          <span class="lab-tag-pill">Regularisation</span>
          <span class="lab-tag-pill">MLOps</span>
        </div>

      </div>
    </article>

  </div>
</section>
