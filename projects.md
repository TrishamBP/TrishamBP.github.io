---
layout: default
title: Projects
seo_title: "Projects — AI Engineering, RAG and Full-Stack Projects"
description: "AI engineering and full-stack projects by Trisham Patil: an LLM router, RAG systems, LoRA fine-tuning, computer vision and production React and Node.js sites."
keywords: "AI engineering projects, machine learning projects, RAG system, LLM router, LoRA fine-tuning, QLoRA, computer vision projects, full-stack projects, FastAPI backend, Trisham Patil"
permalink: /projects/
---

{%- comment -%}
  Projects listing. Uses its own light "clean" skin (css/projects-clean.css),
  gated on `/projects/` in both _includes/head.html and _layouts/default.html.
  Rows come from _data/projects.yml, grouped by `group` in file order.
{%- endcomment -%}

{%- assign projects = site.data.projects -%}
{%- assign groups = projects | group_by: "group" -%}
{%- assign live_count = 0 -%}
{%- for p in projects -%}
  {%- if p.links and p.links.size > 0 -%}{%- assign live_count = live_count | plus: 1 -%}{%- endif -%}
{%- endfor -%}

<div class="hs-layout">
  <div class="hs-main">
    <header class="hs-hero">
      <h1>AI engineering and full-stack projects</h1>
      <p class="hs-sub">
        Production sites, LLM systems, fine-tuning pipelines and deep learning experiments I have designed, built and shipped.
      </p>
      <nav class="hs-panel" aria-label="Project groups">
        {%- for g in groups %}
        <a class="hs-panel-row" href="#{{ g.name | slugify }}">
          <span class="hs-dot" aria-hidden="true"></span>
          <span class="hs-panel-text">
            <b>{{ g.name }}</b>
            <small>{{ g.items.size }} project{% if g.items.size != 1 %}s{% endif %}</small>
          </span>
          <svg class="hs-chev hs-chev--right" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
        </a>
        {%- endfor %}
      </nav>
    </header>

    {%- for g in groups %}
    <section class="hs-group" id="{{ g.name | slugify }}" aria-labelledby="{{ g.name | slugify }}-heading">
      <h2 id="{{ g.name | slugify }}-heading">{{ g.name }}</h2>
      {%- for p in g.items %}
      <details class="hs-row">
        <summary>
          <span class="hs-row-head">
            <b>{{ p.name }}</b>
            <small>{{ p.summary }}</small>
            {%- if p.video %}
            <span class="hs-badge"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" /></svg>Demo video{% if p.video_length %} &middot; {{ p.video_length }}{% endif %}</span>
            {%- endif %}
          </span>
          <svg class="hs-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" /></svg>
        </summary>
        <div class="hs-row-body">
          {%- if p.video %}
          <figure class="hs-video">
            <video controls playsinline preload="none"{% if p.video_poster %} poster="{{ p.video_poster | relative_url }}"{% endif %} aria-label="{{ p.name }} demo video">
              <source src="{{ p.video | relative_url }}" type="video/mp4" />
              <a href="{{ p.video | relative_url }}">Download the {{ p.name }} demo video</a>
            </video>
            {%- if p.video_caption %}
            <figcaption>{{ p.video_caption }}</figcaption>
            {%- endif %}
          </figure>
          {%- endif %}
          {%- if p.image %}
          <img class="hs-shot" src="{{ p.image | relative_url }}" alt="{{ p.image_alt | default: p.name }}" loading="lazy" />
          {%- endif %}
          {%- if p.stack %}
          <ul class="hs-chips" aria-label="Tech stack">
            {%- if p.year %}<li class="hs-chip--year">{{ p.year }}</li>{% endif %}
            {%- for s in p.stack %}<li>{{ s }}</li>{% endfor %}
          </ul>
          {%- endif %}
          {%- for d in p.details %}
          <p><b>{{ d.label }}.</b> {{ d.text }}</p>
          {%- endfor %}
          {%- if p.highlights %}
          <ul class="hs-points">
            {%- for h in p.highlights %}<li>{{ h }}</li>{% endfor %}
          </ul>
          {%- endif %}
          {%- if p.links %}
          <p class="hs-actions">
            {%- for l in p.links %}
            {%- assign external = l.url | slice: 0, 4 -%}
            {%- if external == 'http' %}
            <a class="hs-btn{% if forloop.first %} hs-btn--primary{% endif %}" href="{{ l.url }}" target="_blank" rel="noopener noreferrer">{{ l.label }}</a>
            {%- else %}
            <a class="hs-btn{% if forloop.first %} hs-btn--primary{% endif %}" href="{{ l.url | relative_url }}">{{ l.label }}</a>
            {%- endif %}
            {%- endfor %}
          </p>
          {%- endif %}
        </div>
      </details>
      {%- endfor %}
    </section>
    {%- endfor %}
  </div>

  <aside class="hs-side" aria-label="Project stats">
    <dl class="hs-stats">
      <div><dt>Projects</dt><dd>{{ projects.size }}</dd></div>
      <div><dt>With live links</dt><dd>{{ live_count }}</dd></div>
      <div><dt>Areas</dt><dd>{{ groups.size }}</dd></div>
      <div><dt>Models on HF</dt><dd>{{ site.data.hf_models.size }}</dd></div>
    </dl>
    <hr />
    <div class="hs-promo">
      <span class="hs-promo-mark" aria-hidden="true"></span>
      <div>
        <b>Read how they were built</b>
        <p>Engineering write-ups and paper implementations behind the projects. <a href="{{ '/engineering/' | relative_url }}">Browse</a></p>
      </div>
    </div>
    <a class="hs-btn hs-btn--block" href="https://github.com/TrishamBP" target="_blank" rel="noopener noreferrer">View GitHub</a>
    <a class="hs-btn hs-btn--block" href="{{ '/models/' | relative_url }}">See published models</a>
  </aside>
</div>

<script>
  /* Pause a project's demo video when its row is collapsed. */
  document.querySelectorAll(".hs-row").forEach(function (row) {
    row.addEventListener("toggle", function () {
      if (row.open) return;
      row.querySelectorAll("video").forEach(function (v) { v.pause(); });
    });
  });
</script>
