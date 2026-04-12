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
    Statistics, Linear Algebra, Machine Learning, Artificial Intelligence, Natural Language Processing,
    Computer Vision, LLM Engineering, Agentic AI, Distributed Systems, and MLOps.
  </p>
</section>

<!-- ===================== SECTION 1: RESEARCH PAPERS ===================== -->
<section class="content-section lab-papers-section" aria-labelledby="papers-heading">
  <h2 id="papers-heading" class="section-title lab-section-heading">Research Papers</h2>
  <p class="research-intro">
    I read research papers by going beyond the abstract — dissecting the architecture decisions, the experimental
    methodology, and the reasoning behind each design choice. For every paper I work through, I write structured
    notes that answer three questions: what the paper does, why it works, and what my understanding of it reveals
    about the broader problem space. The goal is twofold: to deepen my own thinking by forcing myself to reconstruct
    the logic from first principles, and to make complex ideas accessible by connecting a novel mechanism to
    something concrete — a systems tradeoff, a failure mode, a downstream consequence. This practice spans domains,
    from attention mechanisms and language models to probabilistic inference, distributed training, and statistical
    learning theory.
  </p>

  <div class="lab-feed" id="papers-feed" aria-label="Research papers feed">
    {% for paper in site.data.learning_papers %}
      <article class="lab-card lab-paper-card" aria-label="{{ paper.title }}">

        <div class="lab-card-image-wrap">
          {% if paper.image %}
            <img
              class="lab-paper-image"
              src="{{ paper.image | relative_url }}"
              alt="{{ paper.title }}"
            />
          {% else %}
            <div class="lab-paper-placeholder" aria-hidden="true">
              <span class="lab-paper-icon">&#128196;</span>
              {% if paper.year %}<span class="lab-paper-year">{{ paper.year }}</span>{% endif %}
            </div>
          {% endif %}
        </div>

        <div class="lab-card-content">

          <h3 class="lab-card-title">{{ paper.title }}</h3>

          {% if paper.authors %}
            <p class="lab-card-meta">{{ paper.authors }}</p>
          {% endif %}

          {% if paper.venue %}
            <p class="lab-card-venue">{{ paper.venue }}</p>
          {% endif %}

          <p class="lab-card-description">{{ paper.description }}</p>

          {% if paper.highlights and paper.highlights.size > 0 %}
            <ul class="lab-card-highlights">
              {% for h in paper.highlights %}
                <li>{{ h }}</li>
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

          <div class="lab-card-actions">
            <a class="article-read-more lab-card-cta" href="{{ paper.read_link | relative_url }}">Read Research &rarr;</a>
            {% if paper.paper_link %}
              <a
                class="lab-paper-link"
                href="{{ paper.paper_link }}"
                target="_blank"
                rel="noopener noreferrer"
              >View Original Paper &#8599;</a>
            {% endif %}
          </div>

        </div>
      </article>
    {% endfor %}
  </div>

  {% if site.data.learning_papers.size == 0 %}
    <p class="research-intro">Research paper breakdowns are being prepared.</p>
  {% endif %}

  <nav class="lab-pagination" id="papers-pagination" aria-label="Research papers pagination"></nav>
</section>

<!-- ===================== SECTION 2: TECHNICAL BOOKS ===================== -->
<section class="content-section lab-books-section" aria-labelledby="books-heading">
  <h2 id="books-heading" class="section-title lab-section-heading">Technical Books</h2>
  <p class="research-intro">
    These are books I've read end-to-end — not just to understand what algorithms do, but to understand
    when they break, why they fail, and how those failures propagate in real-world systems at scale.
  </p>

  <div class="lab-feed" id="books-feed" aria-label="Technical books feed">
    {% for book in site.data.technical_books %}
      <article class="lab-card lab-book-card" aria-label="{{ book.title }}">

        <div class="lab-book-image-wrap">
          <img
            class="lab-book-image"
            src="{{ book.image | relative_url }}"
            alt="{{ book.title }} book cover"
          />
        </div>

        <div class="lab-card-content">

          <h3 class="lab-card-title">{{ book.title }}</h3>
          <p class="lab-card-meta">{{ book.author }}</p>

          {% if book.id == "time-series" %}

            <p class="lab-card-description">
              This book fundamentally reshaped how I think about temporal data — not just as sequences,
              but as evolving systems governed by structure, randomness, and hidden patterns.
            </p>
            <p class="lab-card-description">
              I started with the basics: understanding what a <em>random walk</em> really means in practice —
              how noise alone can mimic meaningful behaviour — and why <em>stationarity</em> is the cornerstone
              of any reliable forecasting pipeline. The book builds intuition step-by-step, teaching how to
              decompose time series into <em>trend</em>, <em>seasonality</em>, and residual components, which
              is something I now apply naturally when analysing any real-world signal.
            </p>
            <p class="lab-card-description">
              What stood out most was how seamlessly it transitions from intuition to mathematical rigour.
              Models like <em>AR</em>, <em>MA</em>, <em>ARIMA</em>, and <em>SARIMAX</em> are not just introduced
              as formulas, but as tools that encode assumptions about time — memory, dependency, and structure.
              I learned not just how to use them, but when they fail and why those failure modes matter.
            </p>
            <p class="lab-card-description">
              The real turning point was connecting classical statistical models to modern deep learning.
              Seeing how <em>RNNs</em>, <em>LSTMs</em>, and <em>GRUs</em> extend the idea of temporal
              dependency made everything click — from the linear assumptions baked into ARIMA to nonlinear
              sequence modelling in neural networks. This book didn't just teach forecasting — it trained me
              to think in time-aware systems, which is critical for everything from financial modelling to
              real-time AI pipelines.
            </p>

          {% elsif book.id == "hands-on-ml" %}

            <p class="lab-card-description">
              This book has been one of the most practically and system-level impactful resources in my
              machine learning journey. What makes it powerful is how it bridges the gap between theory
              and production — instead of just explaining algorithms, it shows how to build complete
              pipelines, from data preprocessing and feature engineering to model training, evaluation,
              and deployment.
            </p>
            <p class="lab-card-description">
              I developed a strong intuition for <em>supervised</em> and <em>unsupervised learning</em>,
              understanding not just how models work but how to choose them under real-world constraints.
              Concepts like the bias-variance tradeoff, regularisation, and model selection became second
              nature through hands-on implementation rather than abstract study.
            </p>
            <p class="lab-card-description">
              Where this book goes deeper — and where it aligns closely with my current engineering interests
              — is in <em>deep learning and TensorFlow</em>. It doesn't stop at neural networks; it dives into
              how modern training systems are actually built. The coverage of TensorFlow's ecosystem gave me a
              working mental model for scalable training, modular architectures, and how different components
              of a model can be optimised independently without coupling their learning dynamics.
            </p>
            <p class="lab-card-description">
              One of the most durable insights I took from this book was thinking in terms of
              <em>distributed systems</em> — how training can be parallelised across devices and workers,
              how <em>multi-head and modular model structures</em> allow different representations to be
              learned simultaneously, and how these architectural decisions translate directly into
              real-world performance and reliability. This book didn't just teach machine learning —
              it taught me how to <em>engineer ML systems</em> that hold up under scale.
            </p>

          {% endif %}

          {% if book.tags and book.tags.size > 0 %}
            <div class="lab-tag-pills">
              {% for tag in book.tags %}
                <span class="lab-tag-pill">{{ tag }}</span>
              {% endfor %}
            </div>
          {% endif %}

        </div>
      </article>
    {% endfor %}
  </div>

  <nav class="lab-pagination" id="books-pagination" aria-label="Technical books pagination"></nav>
</section>

<!-- ===================== PAGINATION SCRIPT ===================== -->
<script>
(function () {
  /**
   * initPagination — client-side pagination for a vertical card feed.
   *
   * @param {string} feedId       — id of the element containing .lab-card children
   * @param {string} paginationId — id of the <nav> element to render page buttons into
   * @param {number} perPage      — maximum cards to show per page
   */
  function initPagination(feedId, paginationId, perPage) {
    var feed       = document.getElementById(feedId);
    var pagNav     = document.getElementById(paginationId);
    if (!feed || !pagNav) return;

    var cards      = Array.from(feed.querySelectorAll('.lab-card'));
    var total      = cards.length;
    var totalPages = Math.ceil(total / perPage);
    var current    = 1;

    /* No pagination needed for a single page */
    if (totalPages <= 1) return;

    function showPage(page) {
      current = page;
      cards.forEach(function (card, i) {
        var start = (page - 1) * perPage;
        var end   = page * perPage;
        card.style.display = (i >= start && i < end) ? '' : 'none';
      });
      renderButtons();
      /* Scroll feed into view when changing pages */
      feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderButtons() {
      pagNav.innerHTML = '';
      for (var p = 1; p <= totalPages; p++) {
        var btn = document.createElement('button');
        btn.className   = 'lab-page-btn' + (p === current ? ' active' : '');
        btn.textContent = p;
        btn.setAttribute('aria-label', 'Page ' + p);
        btn.setAttribute('aria-current', p === current ? 'page' : 'false');
        /* IIFE to capture loop variable */
        (function (page) {
          btn.addEventListener('click', function () { showPage(page); });
        }(p));
        pagNav.appendChild(btn);
      }
    }

    showPage(1);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initPagination('papers-feed', 'papers-pagination', 5);
    initPagination('books-feed',  'books-pagination',  5);
  });
}());
</script>
