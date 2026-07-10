---
layout: default
title: Production Projects
permalink: /projects/
---

<section class="content-section production-projects-section" aria-labelledby="projects-heading">
  <h1 id="projects-heading" class="section-title">Production Projects</h1>
  <p class="research-intro">
    Production-grade AI, backend, data engineering, and full-stack systems built for real users 
    with a strong focus on scalability, reliability, maintainability, and engineering quality.
  </p>

  <div class="production-projects-grid">
    
    <!-- Dhokla House -->
    <article class="production-project-card" data-order="1" data-category="Full Stack">
      <div class="production-project-image-wrap">
        <img
          class="production-project-image"
          src="https://s.wordpress.com/mshots/v1/https%3A%2F%2Fdhoklahouse.com?w=800"
          onerror="this.onerror=null;this.src='{{ '/assets/images/fullstack/dhoklahouse.jpg' | relative_url }}';"
          alt="Dhokla House website preview"
        />
      </div>
      
      <div class="production-project-content">
        <h3 class="production-project-title">Dhokla House</h3>
        
        <div class="production-project-tags">
          <span>React.js</span>
          <span>Node.js</span>
          <span>Express.js</span>
          <span>PostgreSQL</span>
          <span>MongoDB</span>
        </div>
        
        <p class="production-project-overview">
          Production food-ordering and brand platform focused on menu discovery, order intent capture, 
          and conversion-optimized customer journeys.
        </p>
        
        <div class="production-project-highlights">
          <h4>Engineering Highlights</h4>
          <ul>
            <li>Modular React.js UI components with responsive layouts</li>
            <li>Node.js + Express.js APIs with clean route separation</li>
            <li>Hybrid persistence: PostgreSQL for transactions, MongoDB for flexible content</li>
            <li>Optimized for rapid UI iteration and backend reliability</li>
          </ul>
        </div>
        
        <div class="production-project-actions">
          <a
            class="project-cta"
            href="https://dhoklahouse.com/"
            target="_blank"
            rel="noopener noreferrer"
          >Visit Project</a>
        </div>
      </div>
    </article>

    <!-- Apni Dukaan -->
    <article class="production-project-card" data-order="2" data-category="Full Stack">
      <div class="production-project-image-wrap">
        <img
          class="production-project-image"
          src="https://s.wordpress.com/mshots/v1/https%3A%2F%2Fapnidukaan.com?w=800"
          onerror="this.onerror=null;this.src='{{ '/assets/images/fullstack/apnidukaan.jpg' | relative_url }}';"
          alt="Apni Dukaan website preview"
        />
      </div>
      
      <div class="production-project-content">
        <h3 class="production-project-title">Apni Dukaan</h3>
        
        <div class="production-project-tags">
          <span>React.js</span>
          <span>Node.js</span>
          <span>Express.js</span>
          <span>PostgreSQL</span>
          <span>MongoDB</span>
        </div>
        
        <p class="production-project-overview">
          E-commerce platform focused on catalog exploration, customer checkout, and operational 
          order management in a production environment.
        </p>
        
        <div class="production-project-highlights">
          <h4>Engineering Highlights</h4>
          <ul>
            <li>Reusable catalog and checkout components for friction-free purchase flows</li>
            <li>Clear separation between read-heavy catalog and transactional checkout routes</li>
            <li>PostgreSQL for order transactions, MongoDB for product metadata</li>
            <li>Maintainability and latency control through compact service boundaries</li>
          </ul>
        </div>
        
        <div class="production-project-actions">
          <a
            class="project-cta"
            href="https://apnidukaan.com/"
            target="_blank"
            rel="noopener noreferrer"
          >Visit Project</a>
        </div>
      </div>
    </article>

  </div>
</section>
