---
layout: default
title: Projects
permalink: /projects/
---

<section class="content-section fullstack-section" aria-labelledby="fullstack-heading">
  <h1 id="fullstack-heading" class="section-title">Full Stack Projects</h1>
  <p class="research-intro">
    Production-grade platforms built with frontend product focus, backend systems rigor, and reliable data architecture.
  </p>

  <div class="fullstack-grid">
    <article class="fullstack-card">
      <img
        class="fullstack-image"
        src="{{ '/assets/images/fullstack/dhoklahouse.jpg' | relative_url }}"
        alt="Dhokla House website preview"
      />
      <div class="fullstack-content">
        <h3>Dhokla House</h3>
        <div class="fullstack-tags">
          <span>React.js</span>
          <span>Node.js</span>
          <span>Express.js</span>
          <span>PostgreSQL</span>
          <span>MongoDB</span>
        </div>
        <h4>Overview</h4>
        <p>
          Dhokla House is a production food-ordering and brand platform focused on menu discovery,
          order intent capture, and conversion-optimized customer journeys.
        </p>
        <h4>Frontend</h4>
        <p>
          Built with React.js using modular UI components and responsive layouts to keep browsing,
          add-to-cart, and checkout interactions fast and predictable across mobile and desktop.
        </p>
        <h4>Backend</h4>
        <p>
          Node.js + Express.js APIs handle product/menu retrieval, customer interaction flows,
          and transactional order endpoints with clean route separation and service-layer logic.
        </p>
        <h4>Data Layer</h4>
        <p>
          PostgreSQL supports structured order lifecycle and reporting use cases, while MongoDB
          is used for flexible content and interaction metadata where schema evolution is frequent.
        </p>
        <h4>Engineering Decisions</h4>
        <p>
          The stack balances rapid UI iteration with backend reliability: React for composability,
          Express for operational simplicity, and hybrid persistence to separate transactional and
          flexible document workloads.
        </p>
        <a
          class="article-read-more"
          href="https://dhoklahouse.com/"
          target="_blank"
          rel="noopener noreferrer"
          >Visit Site &rarr;</a
        >
      </div>
    </article>

    <article class="fullstack-card">
      <img
        class="fullstack-image"
        src="{{ '/assets/images/fullstack/apnidukaan.jpg' | relative_url }}"
        alt="Apni Dukaan website preview"
      />
      <div class="fullstack-content">
        <h3>Apni Dukaan</h3>
        <div class="fullstack-tags">
          <span>React.js</span>
          <span>Node.js</span>
          <span>Express.js</span>
          <span>PostgreSQL</span>
          <span>MongoDB</span>
        </div>
        <h4>Overview</h4>
        <p>
          Apni Dukaan is an e-commerce platform focused on catalog exploration, customer checkout,
          and operational order management in a production environment.
        </p>
        <h4>Frontend</h4>
        <p>
          React.js drives the storefront experience with reusable catalog, product-detail,
          and checkout components designed to reduce friction in purchase flows.
        </p>
        <h4>Backend</h4>
        <p>
          Express APIs provide product, cart, and order endpoints with clear separation between
          read-heavy catalog routes and transactional checkout/order update routes.
        </p>
        <h4>Data &amp; Scalability</h4>
        <p>
          PostgreSQL is aligned with consistency-sensitive order transactions and reporting, while
          MongoDB supports flexible product metadata and content extensions. This split supports
          incremental scaling as catalog and interaction volume grow.
        </p>
        <h4>Engineering Decisions</h4>
        <p>
          Architecture prioritizes maintainability and latency control: compact service boundaries,
          predictable API contracts, and stack choices optimized for full-stack iteration speed.
        </p>
        <a
          class="article-read-more"
          href="https://apnidukaan.com/"
          target="_blank"
          rel="noopener noreferrer"
          >Visit Site &rarr;</a
        >
      </div>
    </article>
  </div>
</section>

<section class="content-section projects-section" aria-labelledby="projects-heading">
  <h2 id="projects-heading" class="section-title">Backend &amp; AI Engineering</h2>
  <p class="research-intro">
    Curated GitHub projects focused on production AI systems, backend architecture, applied machine learning, and research-to-deployment workflows.
  </p>

  <h3 class="projects-subtitle">Core AI / Backend Projects</h3>
  <div class="projects-shell" data-github-user="TrishamBP" data-project-group="core">
    <p class="projects-status">Loading curated GitHub projects...</p>
  </div>

  <h3 class="projects-subtitle">Additional Systems / Backend</h3>
  <div class="projects-grid-shell" data-github-user="TrishamBP" data-project-group="additional">
    <p class="projects-status">Loading curated GitHub projects...</p>
  </div>

  <h3 class="projects-subtitle">Masters Projects (2021-2022)</h3>
  <div class="projects-grid-shell" data-github-user="TrishamBP" data-project-group="masters">
    <p class="projects-status">Loading curated GitHub projects...</p>
  </div>

  <p class="research-intro projects-note">
    I have also worked on multiple smaller projects in numerical methods, optimization, classical machine learning, and deep learning foundations.
  </p>
</section>

<script src="{{ '/assets/js/projects-carousel.js' | relative_url }}"></script>
