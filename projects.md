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

    <!-- Flipped.ai -->
    <article class="production-project-card" data-order="0" data-category="AI Systems">
      <div class="production-project-image-wrap">
        <img
          class="production-project-image"
          src="{{ '/assets/images/fullstack/flipped-ai.jpg' | relative_url }}"
          alt="Flipped.ai production AI systems case study preview"
        />
      </div>

      <div class="production-project-content">
        <h3 class="production-project-title">Flipped.ai — Production AI Systems</h3>

        <div class="production-project-tags">
          <span>RAG</span>
          <span>vLLM</span>
          <span>Document Intelligence</span>
          <span>Arabic OCR</span>
          <span>FastAPI</span>
          <span>GPU Inference</span>
        </div>

        <p class="production-project-overview">
          An engineering case study of the production AI behind an AI-native recruitment platform:
          document intelligence, multilingual/Arabic OCR, hybrid RAG retrieval, semantic candidate
          matching, and open-weight LLM serving with vLLM behind async, distributed microservices.
        </p>

        <div class="production-project-highlights">
          <h4>Engineering Highlights</h4>
          <ul>
            <li>Document-intelligence pipeline for messy, multilingual CVs; custom Arabic OCR/extraction (~80% &rarr; 95%+ parsing accuracy)</li>
            <li>Hybrid retrieval (BM25 + dense) with reranking and MMR for semantic candidate matching</li>
            <li>Open-weight LLM serving with vLLM — continuous batching, PagedAttention, KV-cache management</li>
            <li>Async FastAPI + Celery/RabbitMQ/Lambda microservices with ATS integrations (Zoho Recruit, Greenhouse)</li>
          </ul>
        </div>

        <div class="production-project-actions">
          <a
            class="project-cta"
            href="{{ '/projects/flipped-ai-production-ai-systems/' | relative_url }}"
          >Read Case Study</a>
        </div>
      </div>
    </article>

    <!-- People Case Management (Centrica UK) -->
    <article class="production-project-card" data-order="1" data-category="AI Systems">
      <div class="production-project-image-wrap">
        <img
          class="production-project-image"
          src="{{ '/assets/images/fullstack/centrica-people-case-management.svg' | relative_url }}"
          alt="People Case Management — agentic legal document intelligence platform for Centrica UK case study preview"
        />
      </div>

      <div class="production-project-content">
        <h3 class="production-project-title">People Case Management Automation Platform</h3>

        <div class="production-project-tags">
          <span>FastAPI</span>
          <span>React/Next.js</span>
          <span>AWS</span>
          <span>RAG</span>
          <span>Agentic AI</span>
          <span>Memory</span>
          <span>LLM Evaluation</span>
          <span>Event-Driven Architecture</span>
        </div>

        <p class="production-project-overview">
          An AI-powered Legal Document Intelligence platform built for Centrica UK, combining agentic AI,
          advanced RAG, long-term memory, evaluation, and cloud-native event-driven infrastructure to
          automate complex HR and legal case-management workflows.
        </p>

        <div class="production-project-highlights">
          <h4>Engineering Highlights</h4>
          <ul>
            <li>Led end-to-end delivery as a Forward-Deployed &amp; Senior Innovation Engineer</li>
            <li>Architected a cloud-native, event-driven AI platform (FastAPI, Next.js/React, ECS Fargate, Lambda, SQS, S3, EventBridge, Docker, Terraform)</li>
            <li>Engineered advanced/agentic RAG and semantic long-term memory for large, growing case histories</li>
            <li>Built LLM evaluation and observability with DeepEval, RAGAS, regression testing, and Langfuse tracing</li>
            <li>Conducted AI security hardening and pre-penetration testing with the Strix security agent</li>
          </ul>
        </div>

        <div class="production-project-actions">
          <a
            class="project-cta"
            href="{{ '/projects/people-case-management-legal-document-intelligence/' | relative_url }}"
          >Read Case Study</a>
        </div>
      </div>
    </article>

    <!-- Centrica Spark -->
    <article class="production-project-card" data-order="2" data-category="AI Systems">
      <div class="production-project-image-wrap">
        <img
          class="production-project-image"
          src="{{ '/assets/images/fullstack/centrica-spark.svg' | relative_url }}"
          alt="Centrica Spark — multi-agent AI innovation platform case study preview"
        />
      </div>

      <div class="production-project-content">
        <h3 class="production-project-title">Centrica Spark — AI Innovation Platform</h3>

        <div class="production-project-tags">
          <span>LLMs</span>
          <span>DSPy</span>
          <span>Context Engineering</span>
          <span>ReAct</span>
          <span>Autonomous Planning</span>
          <span>Multi-Agent Systems</span>
          <span>AWS AgentCore</span>
          <span>Evaluation</span>
        </div>

        <p class="production-project-overview">
          An internal Centrica innovation platform where LLMs and agentic workflows help employees develop
          ideas through structured research, contextual analysis, feasibility assessment, risk analysis,
          and actionable recommendations.
        </p>

        <div class="production-project-highlights">
          <h4>Engineering Highlights</h4>
          <ul>
            <li>Architected agentic AI workflows using LLMs, DSPy, context engineering, ReAct-style reasoning, autonomous planning, and multi-agent orchestration</li>
            <li>Designed context-aware LLM pipelines combining employee ideas with enterprise knowledge, policies, and organizational constraints</li>
            <li>Engineered specialized agents for research, analysis, feasibility, risk, and recommendation behind an orchestration layer</li>
            <li>Designed long-running autonomous agent workflows using AWS AgentCore for stateful, multi-step execution</li>
            <li>Built end-to-end evaluation and observability with DeepEval, RAGAS, regression testing, and Langfuse tracing</li>
          </ul>
        </div>

        <div class="production-project-actions">
          <a
            class="project-cta"
            href="{{ '/projects/centrica-spark-ai-innovation-platform/' | relative_url }}"
          >Read Case Study</a>
        </div>
      </div>
    </article>

    <!-- Project Blueprint -->
    <article class="production-project-card" data-order="3" data-category="AI Systems">
      <div class="production-project-image-wrap">
        <img
          class="production-project-image"
          src="{{ '/assets/images/fullstack/project-blueprint-digital-twin.svg' | relative_url }}"
          alt="Project Blueprint — AI-enabled residential digital twin from LiDAR and HVAC data case study preview"
        />
      </div>

      <div class="production-project-content">
        <h3 class="production-project-title">Project Blueprint — AI-Enabled Residential Digital Twin</h3>

        <div class="production-project-tags">
          <span>LiDAR</span>
          <span>AutoCAD/CAD</span>
          <span>Point Clouds</span>
          <span>Three.js</span>
          <span>Digital Twin</span>
          <span>HVAC</span>
          <span>Agentic AI</span>
          <span>Context Engineering</span>
        </div>

        <p class="production-project-overview">
          An AI-enabled residential digital-twin system combining mechanical engineering, LiDAR scanning,
          CAD/AutoCAD data, 3D visualization, and agentic AI to digitally represent UK homes and their
          heating, cooling, and ventilation infrastructure for energy-aware optimization.
        </p>

        <div class="production-project-highlights">
          <h4>Engineering Highlights</h4>
          <ul>
            <li>Architected a residential digital-twin workflow combining mechanical engineering, 3D reconstruction, and AI engineering</li>
            <li>Designed a LiDAR-to-digital-twin pipeline combining spatial scans with AutoCAD/CAD floor plans</li>
            <li>Designed interactive Three.js representations of residential spaces, HVAC systems, heat pumps, and ventilation</li>
            <li>Designed an agentic AI layer capable of reasoning over spatial, HVAC, and energy data</li>
            <li>Applied multimodal/context engineering to combine 3D geometry, CAD metadata, and HVAC configuration for grounded recommendations</li>
          </ul>
        </div>

        <div class="production-project-actions">
          <a
            class="project-cta"
            href="{{ '/projects/project-blueprint-residential-digital-twin/' | relative_url }}"
          >Read Case Study</a>
        </div>
      </div>
    </article>

    <!-- Dhokla House -->
    <article class="production-project-card" data-order="4" data-category="Full Stack">
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
    <article class="production-project-card" data-order="5" data-category="Full Stack">
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
