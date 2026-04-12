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

          {% elsif book.id == "ai-modern-approach" %}

            <p class="lab-card-description">
              This book built my foundation in how intelligent systems reason, plan, and act — long before
              the era of neural networks and large language models. It covers the full landscape of classical
              AI: uninformed and heuristic search (BFS, DFS, A*), adversarial game-tree search, constraint
              satisfaction problems, propositional and first-order logic, and automated planning systems.
              What stood out most was the formal treatment of <em>agents</em> — how they perceive their
              environment through sensors, select actions through a decision function, and optimise towards
              goals under uncertainty. This framework is not just historical; it directly informs modern
              Agentic AI design, where the same loop of observation, reasoning, and action is implemented
              by LLM-driven systems.
            </p>
            <p class="lab-card-description">
              The probabilistic sections of the book were equally formative. Bayesian networks, hidden
              Markov models, and decision-theoretic reasoning gave me a rigorous vocabulary for thinking
              about uncertainty — one that translates directly into how modern ML systems handle ambiguous
              or incomplete information. The coverage of planning under uncertainty, including Markov
              Decision Processes, connected naturally to reinforcement learning and helped me see the
              conceptual continuity between symbolic AI planning and neural policy learning.
            </p>
            <p class="lab-card-description">
              Reading this book changed how I think about intelligence as an engineering problem. Before
              LLMs, intelligence was modelled through structured reasoning, logical inference, and
              goal-directed behaviour — and those design principles have not become obsolete. They have
              been absorbed into the architecture of modern agent frameworks, tool-calling systems, and
              planning pipelines. This book gave me the vocabulary to understand not just what modern AI
              systems do, but why they are designed the way they are.
            </p>

          {% elsif book.id == "math-ml" %}

            <p class="lab-card-description">
              This book made the mathematical foundations behind machine learning and deep learning
              intuitive, structured, and genuinely useful. Rather than treating mathematics as background
              formalism, it positions it as the core language in which models are written. The coverage
              spans linear algebra — vector spaces, linear maps, matrix decompositions, eigenvalues,
              singular value decomposition — through to multivariate calculus and its applications to
              gradient-based optimisation, and closes with a rigorous treatment of probability and
              statistics from first principles.
            </p>
            <p class="lab-card-description">
              What changed for me was realising that neural networks are, at their core, compositions of
              parametrised matrix transformations with pointwise nonlinearities, and that concepts like
              embeddings, attention, and principal component analysis are not separate techniques but
              different facets of the same underlying linear algebra. Once the geometry of high-dimensional
              spaces clicked — how projections work, what eigendecomposition means, why the SVD is
              everywhere — the entire architecture of modern deep learning became easier to reason about
              from first principles rather than by memorising formulas.
            </p>
            <p class="lab-card-description">
              The sections on optimisation were particularly durable. Understanding gradient descent as
              steepest descent in parameter space, the role of the Hessian in curvature, and why
              convexity matters for convergence guarantees made training dynamics legible in a way that
              no implementation tutorial could. This book sits at the intersection of theory and practice —
              it does not just explain what the math is, but why it is the right way to think about
              learning systems.
            </p>

          {% elsif book.id == "probability-statistics" %}

            <p class="lab-card-description">
              This book built my understanding of probability and statistical reasoning from first
              principles — not as a set of formulas to apply, but as a coherent framework for reasoning
              under uncertainty. It works through sample spaces, probability axioms, conditional
              probability, and Bayes' theorem with the kind of rigour that forces you to understand what
              you are actually computing, rather than following a recipe. The treatment of random
              variables, expectation, variance, and common distributions is thorough and carefully
              motivated, always connecting the abstract definition to what it means in practice.
            </p>
            <p class="lab-card-description">
              The statistical inference sections were where the book paid off most directly. Estimation
              theory — method of moments, maximum likelihood estimation, Bayesian estimation — gave me
              a principled way to think about how models extract parameters from data and what
              assumptions underlie those estimates. Understanding hypothesis testing, confidence
              intervals, and significance not as black-box procedures but as direct applications of
              probability theory removed a persistent conceptual fog that had previously made
              statistical results feel arbitrary.
            </p>
            <p class="lab-card-description">
              The broader shift this book produced was a change in how I interpret model behaviour.
              Distributions, uncertainty, and calibration stopped being abstract concerns and became
              concrete things I could reason about: why a model might be overconfident, what it means
              for a prediction interval to be valid, how prior beliefs interact with observed evidence
              in a Bayesian update. These ideas surface everywhere in machine learning — loss function
              design, regularisation, probabilistic classifiers, generative models — and this book gave
              me the mathematical foundation to engage with them honestly.
            </p>

          {% elsif book.id == "rl-introduction" %}

            <p class="lab-card-description">
              This book provides the definitive treatment of reinforcement learning — how agents learn
              to make decisions through direct interaction with an environment, without labelled
              supervision, by optimising for long-term cumulative reward. It builds from first principles:
              the Markov Decision Process formalism, value functions, the Bellman equations, and the
              distinction between policy evaluation and policy improvement. Every concept is introduced
              with both mathematical precision and clear intuition, making it possible to follow the
              derivations while never losing sight of what the agent is actually doing.
            </p>
            <p class="lab-card-description">
              The core algorithmic contributions — dynamic programming, Monte Carlo methods, and
              temporal-difference learning — are developed in sequence, each overcoming a limitation
              of the last. Understanding Q-learning and SARSA as model-free TD methods, and seeing
              how they connect to the broader framework of value-function approximation, gave me a
              solid conceptual basis for the deep RL systems that followed. What stood out was how
              learning is framed as sequential decision-making under uncertainty: the agent must
              balance exploration (gathering information) against exploitation (using what it knows)
              at every step.
            </p>
            <p class="lab-card-description">
              This book directly bridges classical AI planning and modern intelligent systems. The
              planning methods, actor-critic architectures, and function approximation ideas it
              develops are the conceptual ancestors of PPO, RLHF, and the alignment techniques used
              to train frontier language models. Reading this book changed how I think about the
              relationship between optimisation objectives and agent behaviour — a perspective that
              is increasingly essential as AI systems are deployed in real-world environments where
              the reward signal is complex, delayed, or imperfectly specified.
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
