---
layout: default
title: Licenses & Certifications
seo_title: "Licenses & Certifications — AI Engineering, LLMs, Agents & Deep Learning"
description: "Licenses and certifications in AI engineering, LLM deployment, AI agents, MCP, RAG, deep learning, and NLP, plus hackathon awards earned by Trisham Patil."
keywords: "AI engineering certifications, LLM certification, AI agents, Model Context Protocol, RAG, QLoRA, PyTorch, TensorFlow, NLP specialization, hackathon, Trisham Patil"
permalink: /certifications/
image: /assets/images/certifications/UC-8dd47b2a-48c3-408f-833e-01e87bc1bff6.jpg
---

<section class="content-section certs-section" aria-labelledby="certs-heading">
  <h1 id="certs-heading" class="section-title">Licenses &amp; Certifications</h1>
  <p class="research-intro">
    Certifications and hackathon credentials across AI engineering, LLM deployment,
    AI agents and MCP, RAG, deep learning, and natural language processing,
    listed newest first.
  </p>

  <div class="cert-grid" aria-label="Certifications">
    {% for c in site.data.certifications %}
      {% assign issuer_key = c.issuer | downcase | replace: ".", "" | replace: " ", "" %}
      {% if c.url != "" %}{% assign href = c.url %}{% elsif c.image != "" %}{% assign href = c.image | relative_url %}{% else %}{% assign href = "" %}{% endif %}
      <article class="cert-card cert-card--{{ issuer_key }}{% if c.image != '' %} has-image{% endif %}">
        <div class="cert-art">
          {% if c.image != "" %}
            <img class="cert-art-img"
                 src="{{ c.image | relative_url }}"
                 alt="{{ c.title | escape }} certificate issued by {{ c.issuer | escape }} to Trisham Patil"
                 loading="lazy" />
          {% endif %}
        </div>

        <div class="cert-content">
          <header class="cert-head">
            <span class="cert-brand">
              {% case issuer_key %}
                {% when "lablabai" %}
                  <svg class="cert-logo" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="lablab-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><path fill="url(#lablab-g)" d="M2 3h6l14 18h-6zM2 21l7-9 3 4-4 5z"/></svg>
                {% when "udemy" %}
                  <svg class="cert-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#a435f0" d="M12 1.5 19 5.5v2.6l-7-4-7 4V5.5z"/><path fill="#a435f0" d="M5 10h3.4v5.2c0 2.3 1.3 3.4 3.6 3.4s3.6-1.1 3.6-3.4V10H19v5.4c0 4.4-2.9 6.6-7 6.6s-7-2.2-7-6.6z"/></svg>
                {% when "freecodecamp" %}
                  <span class="cert-logo cert-logo--text" aria-hidden="true">(&#955;)</span>
                {% when "deeplearningai" %}
                  <svg class="cert-logo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#f43f5e"/><circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="9.5" r="3" fill="#fff"/></svg>
              {% endcase %}
              {{ c.issuer }}
            </span>
            <span class="cert-date">{{ c.date }}</span>
          </header>

          <h2 class="cert-title">{{ c.short_title | default: c.title }}</h2>
          <p class="cert-desc">{{ c.description | strip_newlines }}</p>

          {% if c.skills and c.skills.size > 0 %}
            <ul class="cert-tags" aria-label="Skills">
              {% for skill in c.skills %}<li class="cert-tag{% if forloop.first %} cert-tag--lead{% endif %}">{{ skill }}</li>{% endfor %}
            </ul>
          {% endif %}

          {% if c.credential_id != "" %}<p class="cert-id">Credential ID: <span>{{ c.credential_id }}</span></p>{% endif %}
        </div>

        {% if href != "" %}
          <a class="cert-hit" href="{{ href }}" target="_blank" rel="noopener"
             aria-label="View credential: {{ c.title | escape }}">
            <span class="cert-go" aria-hidden="true">&rarr;</span>
          </a>
        {% endif %}
      </article>
    {% endfor %}
  </div>
</section>
