---
layout: default
title: Sessions & Technical Talks
seo_title: "Sessions & Technical Talks — AI Systems, ML & System Design"
description: "Technical sessions and talks on AI systems, machine learning, reinforcement learning, system design, and large-scale AI infrastructure by Trisham Patil."
keywords: "technical talks, AI systems, system design, machine learning, reinforcement learning, LLM inference, AI infrastructure, distributed systems, Trisham Patil"
permalink: /sessions/
image: https://img.youtube.com/vi/LLrJUyGerSc/hqdefault.jpg
---

<section class="content-section sessions-section" aria-labelledby="sessions-heading">
  <h1 id="sessions-heading" class="section-title">Sessions &amp; Technical Talks</h1>
  <p class="research-intro">
    Technical sessions and deep-dive talks on AI systems, machine learning,
    reinforcement learning, system design, and large-scale AI infrastructure.
    Each session breaks down complex concepts and connects research ideas with
    practical engineering.
  </p>

  {% assign sessions = site.data.sessions | where_exp: "s", "s.youtube_id != ''" %}
  <div class="session-grid" aria-label="Technical sessions">
    {% for s in sessions %}
      <article class="session-card">
        <a class="session-thumb-link"
           href="https://www.youtube.com/watch?v={{ s.youtube_id }}"
           target="_blank" rel="noopener"
           aria-label="Watch: {{ s.title | escape }}">
          <img class="session-thumb"
               src="https://img.youtube.com/vi/{{ s.youtube_id }}/hqdefault.jpg"
               alt="{{ s.title | escape }} — technical session thumbnail"
               loading="lazy" width="480" height="360" />
          <span class="session-play" aria-hidden="true">&#9658;</span>
        </a>
        <div class="session-body">
          <h2 class="session-title">{{ s.title }}</h2>
          {% if s.date %}<p class="session-date">{{ s.date }}</p>{% endif %}
          <p class="session-desc">{{ s.description | strip_newlines }}</p>
          {% if s.tags and s.tags.size > 0 %}
            <p class="session-tags">
              {% for tag in s.tags %}{{ tag }}{% unless forloop.last %} &middot; {% endunless %}{% endfor %}
            </p>
          {% endif %}
          <a class="session-watch"
             href="https://www.youtube.com/watch?v={{ s.youtube_id }}"
             target="_blank" rel="noopener">
            Watch Session <span class="session-arrow" aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </article>
    {% endfor %}
  </div>
</section>
