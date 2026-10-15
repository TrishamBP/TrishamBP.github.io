---
layout: default
title: Projects
seo_title: "Projects — AI Engineering, LLM Agents and Full-Stack Projects"
description: "AI engineering projects by Trisham Patil: an LLM router, voice and multi-agent systems, RAG, EAGLE-3 speculative decoding and production full-stack sites."
keywords: "AI engineering projects, LLM projects, LLM router, AI voice agent, multi-agent systems, LangGraph, RAG system, speculative decoding, EAGLE-3, full-stack projects, Trisham Patil"
permalink: /projects/
---

{%- comment -%}
  Projects listing. Uses its own dark terminal skin (css/projects-terminal.css),
  gated on `/projects/` in both _includes/head.html and _layouts/default.html.
  Cards come from _data/projects.yml, grouped by `group` in file order.

  Typing: assets/js/projects-terminal.js types out every `[data-type]` element.
  All text is rendered server-side, so search engines and no-JS visitors get the
  full page; the script only hides and replays it, and skips the animation
  entirely under prefers-reduced-motion.
{%- endcomment -%}

{%- assign projects = site.data.projects -%}
{%- assign groups = projects | group_by: "group" -%}
{%- assign prompt = '<span class="tx-user">trisham@portfolio</span>:<span class="tx-path">~</span>$' -%}

<header class="tx-hero">
  <div class="tx-window tx-window--hero" data-tx-seq>
    <div class="tx-bar">
      <span class="tx-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="tx-title">~/projects &mdash; zsh</span>
      <span class="tx-bar-icon" aria-hidden="true">&gt;_</span>
    </div>
    <div class="tx-screen">
      <p class="tx-line tx-muted" data-tx-step>Last login: <span data-tx-now>{{ site.time | date: "%a %b %d %H:%M:%S %Y" }}</span></p>

      <p class="tx-line" data-tx-step>{{ prompt }} <span class="tx-cmd" data-type>whoami</span></p>
      <p class="tx-out" data-tx-step>&rarr; AI engineer building LLM systems, agents and production backends</p>

      <p class="tx-line" data-tx-step>{{ prompt }} <span class="tx-cmd" data-type>cat <span class="tx-file">headline.txt</span></span></p>
      <h1 class="tx-headline" data-tx-step>AI Engineering and Full-Stack Projects</h1>

      <p class="tx-line" data-tx-step>{{ prompt }} <span class="tx-cmd" data-type>cat <span class="tx-file">about.txt</span></span></p>
      <div class="tx-comment" data-tx-step>
        <p>// Voice agents, multi-agent systems and LLM routers, plus a</p>
        <p>// from-scratch EAGLE-3 reproduction for faster LLM inference</p>
        <p>// and full-stack sites running in production.</p>
      </div>

      <p class="tx-line" data-tx-step>{{ prompt }} <span class="tx-cmd" data-type>./explore</span><span class="tx-caret" aria-hidden="true"></span></p>
      <nav class="tx-actions" aria-label="Project groups" data-tx-step>
        {%- for g in groups %}
        <a class="tx-btn{% if forloop.first %} tx-btn--go{% endif %}" href="#{{ g.name | slugify }}"><span aria-hidden="true">&gt;</span> {{ g.name | slugify | replace: '-', '_' }}</a>
        {%- endfor %}
      </nav>
    </div>
  </div>
  <div class="tx-status">
    <span><i class="tx-led" aria-hidden="true"></i>online &middot; {{ projects.size }} projects &middot; {{ groups.size }} areas</span>
    <span>zsh &middot; 120x40</span>
  </div>
</header>

{%- for g in groups %}
{%- assign gslug = g.name | slugify -%}
<section class="tx-group" id="{{ gslug }}" aria-labelledby="{{ gslug }}-heading">
  <p class="tx-kicker"># {% if forloop.index < 10 %}0{% endif %}{{ forloop.index }} &mdash; {{ gslug | replace: '-', '_' }}</p>
  <h2 id="{{ gslug }}-heading" class="tx-heading">
    {%- case g.name -%}
      {%- when 'Live products' -%}Live products,<br /><span>shipped to real customers.</span>
      {%- when 'AI and LLM engineering' -%}AI and LLM engineering,<br /><span>from research to running systems.</span>
      {%- else -%}{{ g.name }}
    {%- endcase -%}
  </h2>

  <div class="tx-grid">
    {%- for p in g.items %}
    {%- assign file = p.name | slugify | append: '.md' -%}
    <article class="tx-project{% if p.video %} tx-project--wide{% endif %}" data-tx-card>
      <p class="tx-line tx-line--card">{{ prompt }} <span class="tx-cmd" data-type>cat <span class="tx-file">{{ file }}</span></span></p>
      <div class="tx-window" data-tx-body>
        <div class="tx-bar">
          <span class="tx-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="tx-title tx-title--left">{{ file }}</span>
          {%- if p.video %}
          <span class="tx-tag-video"><span aria-hidden="true">&#9654;</span> demo{% if p.video_length %} &middot; {{ p.video_length }}{% endif %}</span>
          {%- endif %}
        </div>
        <div class="tx-screen">
          <h3 class="tx-name">{{ p.name }}</h3>
          <p class="tx-summary">// {{ p.summary }}</p>

          {%- if p.video %}
          <figure class="tx-video">
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
          <img class="tx-shot" src="{{ p.image | relative_url }}" alt="{{ p.image_alt | default: p.name }}" loading="lazy" />
          {%- endif %}

          {%- for d in p.details %}
          <p class="tx-detail"><b>{{ d.label }}:</b> {{ d.text }}</p>
          {%- endfor %}
          {%- if p.highlights %}
          <ul class="tx-points">
            {%- for h in p.highlights %}<li>{{ h }}</li>{% endfor %}
          </ul>
          {%- endif %}

          {%- if p.stack %}
          <ul class="tx-chips" aria-label="Tech stack">
            {%- if p.year %}<li class="tx-chip--year">{{ p.year }}</li>{% endif %}
            {%- for s in p.stack %}<li>{{ s }}</li>{% endfor %}
          </ul>
          {%- endif %}

          {%- if p.links %}
          <p class="tx-links">
            {%- for l in p.links %}
            {%- assign external = l.url | slice: 0, 4 -%}
            {%- assign cmd = l.label | downcase | replace: ' ', '_' -%}
            {%- if external == 'http' %}
            <a class="tx-btn{% if forloop.first %} tx-btn--go{% endif %}" href="{{ l.url }}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">&gt;</span> {{ cmd }}</a>
            {%- else %}
            <a class="tx-btn{% if forloop.first %} tx-btn--go{% endif %}" href="{{ l.url | relative_url }}"><span aria-hidden="true">&gt;</span> {{ cmd }}</a>
            {%- endif %}
            {%- endfor %}
          </p>
          {%- endif %}
        </div>
      </div>
    </article>
    {%- endfor %}
  </div>
</section>
{%- endfor %}

<section class="tx-group tx-group--end" aria-label="More work">
  <p class="tx-line">{{ prompt }} <span class="tx-cmd">ls <span class="tx-file">~/more</span></span></p>
  <p class="tx-links">
    <a class="tx-btn tx-btn--go" href="https://github.com/TrishamBP" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">&gt;</span> github</a>
    <a class="tx-btn" href="{{ '/models/' | relative_url }}"><span aria-hidden="true">&gt;</span> hugging_face_models</a>
    <a class="tx-btn" href="{{ '/engineering/' | relative_url }}"><span aria-hidden="true">&gt;</span> engineering_writeups</a>
  </p>
</section>

<script src="{{ '/assets/js/projects-terminal.js' | relative_url }}" defer></script>
