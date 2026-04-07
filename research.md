---
layout: default
title: Research Articles
permalink: /research/
includelink: true
---

<section class="content-section articles-section" aria-labelledby="research-heading">
  <h1 id="research-heading" class="section-title">Research Articles</h1>
  <p class="research-intro">
    Research-first writeups on AI systems, domain-specific NLP, model architecture, and production lessons from real deployments.
  </p>

  {% assign research_posts = site.research | sort: "date" | reverse %}
  <div class="articles-grid">
    {% for post in research_posts %}
      <article class="article-card">
        <h2 class="article-title">
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </h2>
        <p class="article-date">
          Published: {{ post.date | date: "%B %-d, %Y" }}
        </p>
        {% if post.tags and post.tags.size > 0 %}
          <p class="article-tags">Tags: {{ post.tags | join: " • " }}</p>
        {% endif %}
        <p class="article-preview">
          {% if post.description %}
            {{ post.description }}
          {% else %}
            {{ post.excerpt | strip_html | normalize_whitespace | truncate: 220 }}
          {% endif %}
        </p>
        <a class="article-read-more" href="{{ post.url | relative_url }}">Read Research &rarr;</a>
      </article>
    {% endfor %}
  </div>

  {% if research_posts.size == 0 %}
    <p>No research articles published yet.</p>
  {% endif %}
</section>
