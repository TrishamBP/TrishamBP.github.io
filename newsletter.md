---
layout: default
title: Newsletter
seo_title: "The Weekly Tech Brew by Trisham Patil — Weekly AI Engineering Newsletter"
description: "The Weekly Tech Brew by Trisham Patil: a weekly AI engineering newsletter on LLMs, AI agents, GPU systems and production AI. Browse every past edition."
keywords: "The Weekly Tech Brew, AI engineering newsletter, weekly AI newsletter, LLM newsletter, AI agents newsletter, production AI, Trisham Patil"
permalink: /newsletter/
---

<section class="content-section articles-section newsletter-section" aria-labelledby="newsletter-heading">
  <h1 id="newsletter-heading" class="section-title">Newsletter</h1>
  <p class="research-intro">
    The Weekly Tech Brew &middot; a weekly read on AI systems engineering, LLMs, and production AI.
  </p>

  {% include newsletter-subscribe.html id="top" %}

  {%- assign editions = site.newsletters | sort: "date" | reverse -%}

  <div id="newsletter-list" class="articles-grid newsletter-grid">
    {% for edition in editions %}
      <article class="article-card newsletter-item">
        <h2 class="article-title">
          <a href="{{ edition.url | relative_url }}">{{ edition.title }}
            {%- if edition.subtitle %}<span class="article-subtitle">{{ edition.subtitle }}</span>{% endif -%}
          </a>
        </h2>
        <p class="article-date">
          <time datetime="{{ edition.date | date: '%Y-%m-%d' }}">{% include newsletter-date.html date=edition.date %}</time>
        </p>
      </article>
    {% endfor %}
  </div>

  {% if editions.size == 0 %}
    <p>No editions published yet.</p>
  {% endif %}

  <nav id="newsletter-pagination" class="article-pagination" aria-label="Newsletter pagination"></nav>
</section>

{% include list-pagination.html list_id="newsletter-list" nav_id="newsletter-pagination" item_class="newsletter-item" per_page=5 %}
