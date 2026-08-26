---
layout: default
title: Engineering Implementations
permalink: /engineering/
---

<section class="content-section engineering-section" aria-labelledby="engineering-heading">
  <h1 id="engineering-heading" class="section-title">Engineering Implementations</h1>
  <p class="research-intro">
    Deep technical implementations of AI systems, research papers, model architectures,
    inference engines, and production AI infrastructure.
  </p>

  {% assign all_impls = site.implementations %}
  <div class="eng-stats" aria-label="Engineering implementation stats">
    <span class="eng-stat"><strong>{{ all_impls.size }}+</strong> Implementations</span>
    <span class="eng-stat"><strong>{{ site.data.engineering_categories.size }}</strong> Engineering Domains</span>
    <span class="eng-stat"><strong>Research &rarr; Code &rarr; Systems</strong></span>
  </div>
</section>

<!-- ===================== LATEST / FEATURED ===================== -->
<section class="content-section engineering-latest-section" aria-labelledby="latest-heading">
  <h2 id="latest-heading" class="section-title lab-section-heading">Latest Engineering Implementations</h2>

  {% assign latest = site.implementations | sort: "date" | reverse %}
  <div class="lab-feed" aria-label="Latest engineering implementations">
    {% for impl in latest limit: 3 %}
      {% include impl-card.html impl=impl index=forloop.index0 %}
    {% endfor %}
  </div>
</section>

<!-- ===================== ENGINEERING DOMAINS ===================== -->
<section class="content-section engineering-domains-section" aria-labelledby="domains-heading">
  <h2 id="domains-heading" class="section-title lab-section-heading">Explore Engineering Domains</h2>
  <p class="research-intro">
    Nine domains spanning the full stack — from attention mechanics and model architectures
    to inference systems, agents, and production reliability.
  </p>

  <div class="eng-domain-grid" aria-label="Engineering domains">
    {% for cat in site.data.engineering_categories %}
      {% assign count = site.implementations | where: "category", cat.id | size %}
      <a class="eng-domain-card" href="{{ '/engineering/' | append: cat.id | append: '/' | relative_url }}">
        <h3 class="eng-domain-title">{{ cat.title }}</h3>
        <p class="eng-domain-desc">{{ cat.description }}</p>
        {% if cat.keywords and cat.keywords.size > 0 %}
          <p class="eng-domain-keywords">
            {% for kw in cat.keywords %}{{ kw }}{% unless forloop.last %} &middot; {% endunless %}{% endfor %}
          </p>
        {% endif %}
        <span class="eng-domain-count">
          {{ count }} Implementation{% if count != 1 %}s{% endif %}
          <span class="eng-domain-arrow" aria-hidden="true">&rarr;</span>
        </span>
      </a>
    {% endfor %}
  </div>
</section>
