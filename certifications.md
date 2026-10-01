---
layout: default
title: Licenses & Certifications
seo_title: "Licenses & Certifications — AI Engineering, LLMs, Agents & Deep Learning"
description: "Licenses and certifications in AI engineering, LLM deployment, AI agents, MCP, RAG, deep learning, and NLP, plus hackathon awards earned by Trisham Patil."
keywords: "AI engineering certifications, LLM certification, AI agents, Model Context Protocol, RAG, QLoRA, PyTorch, TensorFlow, NLP specialization, hackathon, Trisham Patil"
permalink: /certifications/
---

<section class="content-section certs-section" aria-labelledby="certs-heading">
  <h1 id="certs-heading" class="section-title">Licenses &amp; Certifications</h1>
  <p class="research-intro">
    Certifications and hackathon credentials across AI engineering, LLM deployment,
    AI agents and MCP, RAG, deep learning, and natural language processing,
    listed newest first.
  </p>

  {% assign certs = site.data.certifications | sort: "issued" | reverse %}
  <div class="cert-grid" aria-label="Certifications">
    {% for c in certs %}
      <article class="cert-card">
        {% if c.url != "" %}<a class="cert-thumb-link" href="{{ c.url }}" target="_blank" rel="noopener" aria-label="View credential: {{ c.title | escape }}">{% else %}<div class="cert-thumb-link">{% endif %}
          {% if c.image != "" %}
            <img class="cert-thumb"
                 src="{{ c.image | relative_url }}"
                 alt="{{ c.title | escape }} certificate issued by {{ c.issuer | escape }}"
                 loading="lazy" />
          {% else %}
            <div class="cert-placeholder" aria-hidden="true">
              <span class="cert-placeholder-issuer">{{ c.issuer }}</span>
              <span class="cert-placeholder-title">{{ c.title }}</span>
              <span class="cert-placeholder-date">{{ c.date }}</span>
            </div>
          {% endif %}
        {% if c.url != "" %}</a>{% else %}</div>{% endif %}
        <div class="cert-body">
          <p class="cert-issuer">{{ c.issuer }} &middot; Issued {{ c.date }}</p>
          <h2 class="cert-title">{{ c.title }}</h2>
          <p class="cert-desc">{{ c.description | strip_newlines }}</p>
          {% if c.skills and c.skills.size > 0 %}
            <p class="cert-skills">
              {% for skill in c.skills %}{{ skill }}{% unless forloop.last %} &middot; {% endunless %}{% endfor %}
            </p>
          {% endif %}
          {% if c.credential_id != "" %}<p class="cert-id">Credential ID: <code>{{ c.credential_id }}</code></p>{% endif %}
          {% if c.url != "" %}
            <a class="cert-link" href="{{ c.url }}" target="_blank" rel="noopener">
              Show Credential <span class="cert-arrow" aria-hidden="true">&rarr;</span>
            </a>
          {% endif %}
        </div>
      </article>
    {% endfor %}
  </div>
</section>
