---
layout: default
title: Signals
seo_title: "Signals — Short Takes on AI, Interpretable ML & Emerging Research"
description: "Signals by Trisham Patil: short, focused posts on AI research worth tracking, from interpretable ML and symbolic regression to new tools and emerging ideas."
keywords: "AI signals, AI research notes, interpretable machine learning, symbolic regression, PySR, emerging AI research, Trisham Patil"
permalink: /signals/
---

<section class="content-section articles-section" aria-labelledby="signals-heading">
  <h1 id="signals-heading" class="section-title">Signals</h1>
  <p class="research-intro">
    Signal posts: short, focused takes on AI research, tools and ideas worth tracking.
  </p>

  {%- comment -%}
    Same card markup and pagination as /blog/. Signal posts live in the
    `signals` collection; each sets an explicit `date:` for this sort.
  {%- endcomment -%}
  {%- assign signal_entries = site.signals | sort: "date" | reverse -%}

  <div id="signals-list" class="articles-grid">
    {% for post in signal_entries %}
      <article class="article-card blog-post-item">
        <h2 class="article-title">
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </h2>
        <p class="article-date">
          Published: {{ post.date | date: "%B %Y" }}
          {%- if post.category %} &middot; {{ post.category }}{% endif -%}
        </p>
        {% if post.tags and post.tags.size > 0 %}
          <p class="article-tags">{{ post.tags | join: " &middot; " }}</p>
        {% endif %}
        <p class="article-preview">
          {{ post.description | strip_html | normalize_whitespace | truncate: 190 }}
        </p>
        <a class="article-read-more" href="{{ post.url | relative_url }}"
          >Read More &rarr;</a
        >
      </article>
    {% endfor %}
  </div>

  {% if signal_entries.size == 0 %}
    <p>No signal posts published yet.</p>
  {% endif %}

  <nav id="signals-pagination" class="article-pagination" aria-label="Signals pagination"></nav>
</section>

{% include list-pagination.html list_id="signals-list" nav_id="signals-pagination" item_class="blog-post-item" per_page=5 %}
