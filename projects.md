---
layout: default
title: Projects
seo_title: "Projects — AI Engineering, LLM Agents, Model Training and Computer Vision"
description: "AI engineering projects by Trisham Patil: production sites, LLM agents, trained Hugging Face models, open-source agent tools and YOLO computer vision tracking."
keywords: "AI engineering projects, LLM projects, LLM router, AI voice agent, multi-agent systems, Hugging Face models, model training, KV cache engineering, agent harness, Claude Code plugin, YOLO player tracking, computer vision projects, football analytics, Trisham Patil"
permalink: /projects/
# One tab per entry, in this order. `group` pulls cards from _data/projects.yml;
# `models: true` builds the tab from _data/hf_models.yml instead.
tabs:
  - id: production
    label: Production
    group: Live products
    heading: Production projects,<br /><span>shipped to real customers.</span>
  - id: ai-llm
    label: AI & LLM
    group: AI and LLM engineering
    heading: AI and LLM engineering,<br /><span>from research to running systems.</span>
  - id: model-training
    label: Model training
    models: true
    heading: Models I trained,<br /><span>published on Hugging Face.</span>
  - id: open-source
    label: Open source
    group: Open source libraries and plugins
    heading: Open-source libraries and plugins,<br /><span>for agent memory, context and cache engineering.</span>
  - id: computer-vision
    label: Computer vision
    group: Computer vision and data analytics
    heading: Computer vision and data analytics,<br /><span>from broadcast video to match insights.</span>
---

{%- comment -%}
  Projects listing. Uses its own dark terminal skin (css/projects-terminal.css),
  gated on `/projects/` in both _includes/head.html and _layouts/default.html.
  Cards come from _data/projects.yml, grouped by `group`; the tabs and their
  order come from `tabs` in the front matter above. Model training cards come
  from _data/hf_models.yml (live download counts via assets/js/hf-downloads.js).

  Tabs: every panel is rendered, so search engines and no-JS visitors get all
  of them, stacked. projects-terminal.js turns the tab links into a tablist
  and shows one panel at a time (deep-linkable with #<tab id>).

  Typing: assets/js/projects-terminal.js types out every `[data-type]` element.
  All text is rendered server-side, so search engines and no-JS visitors get the
  full page; the script only hides and replays it, and skips the animation
  entirely under prefers-reduced-motion.
{%- endcomment -%}

{%- assign projects = site.data.projects -%}
{%- assign groups = projects | group_by: "group" -%}
{%- assign models = site.data.hf_models -%}
{%- assign total = projects.size | plus: models.size -%}
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
      <h1 class="tx-headline" data-tx-step>AI Engineering, Model Training and Computer Vision Projects</h1>

      <p class="tx-line" data-tx-step>{{ prompt }} <span class="tx-cmd" data-type>cat <span class="tx-file">about.txt</span></span></p>
      <div class="tx-comment" data-tx-step>
        <p>// Voice agents, multi-agent systems and LLM routers, models</p>
        <p>// trained and shipped on Hugging Face, open-source agent tools,</p>
        <p>// YOLO player tracking and full-stack sites in production.</p>
      </div>

      <p class="tx-line" data-tx-step>{{ prompt }} <span class="tx-cmd" data-type>./explore</span><span class="tx-caret" aria-hidden="true"></span></p>
      <nav class="tx-actions" aria-label="Project areas" data-tx-step>
        {%- for t in page.tabs %}
        <a class="tx-btn{% if forloop.first %} tx-btn--go{% endif %}" href="#{{ t.id }}"><span aria-hidden="true">&gt;</span> {{ t.id | replace: '-', '_' }}</a>
        {%- endfor %}
      </nav>
    </div>
  </div>
  <div class="tx-status">
    <span><i class="tx-led" aria-hidden="true"></i>online &middot; {{ total }} projects &middot; {{ page.tabs.size }} areas</span>
    <span>zsh &middot; 120x40</span>
  </div>
</header>

<nav class="tx-tabs" aria-label="Project categories" data-tx-tabs>
  {%- for t in page.tabs %}
  <a class="tx-tab" href="#{{ t.id }}" id="tab-{{ t.id }}" data-tx-tab="{{ t.id }}"><span class="tx-tab-num" aria-hidden="true">0{{ forloop.index }}</span> {{ t.label }}</a>
  {%- endfor %}
</nav>

{%- for t in page.tabs %}
{%- assign g = groups | where: "name", t.group | first -%}
<section class="tx-group tx-panel" id="{{ t.id }}" aria-labelledby="{{ t.id }}-heading" data-tx-panel>
  <p class="tx-kicker"># 0{{ forloop.index }} &mdash; {{ t.id | replace: '-', '_' }}</p>
  <h2 id="{{ t.id }}-heading" class="tx-heading">{{ t.heading }}</h2>

  {%- if t.models %}
  <div class="tx-grid">
    {%- for m in models %}
    {%- assign file = m.id | split: '/' | last | append: '/README.md' -%}
    <article class="tx-project" data-tx-card>
      <p class="tx-line tx-line--card">{{ prompt }} <span class="tx-cmd" data-type>cat <span class="tx-file">{{ file }}</span></span></p>
      <div class="tx-window" data-tx-body>
        <div class="tx-bar">
          <span class="tx-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="tx-title tx-title--left">{{ m.id }}</span>
        </div>
        <div class="tx-screen">
          <h3 class="tx-name">{{ m.name }}</h3>
          <p class="tx-summary">// {{ m.summary }}</p>
          <p class="tx-detail"><b>Training:</b> {{ m.training }}{% if m.base %} on {{ m.base }}{% endif %}{% if m.params %} &middot; {{ m.params }}{% endif %}</p>
          <p class="tx-detail">{{ m.detail }}</p>
          <p class="tx-detail"><b>Downloads:</b> <span data-hf-downloads="{{ m.id }}" data-count="{{ m.downloads }}">{{ m.downloads }}</span></p>
          <ul class="tx-chips" aria-label="Model facts">
            {%- if m.released %}<li class="tx-chip--year">{{ m.released }}</li>{% endif %}
            <li>{{ m.task }}</li>
            {%- if m.license %}<li>{{ m.license }}</li>{% endif %}
          </ul>
          <p class="tx-links">
            <a class="tx-btn tx-btn--go" href="https://huggingface.co/{{ m.id }}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">&gt;</span> view_on_hugging_face</a>
          </p>
        </div>
      </div>
    </article>
    {%- endfor %}
  </div>
  {%- else %}
  <div class="tx-grid">
    {%- for p in g.items %}
    {%- assign file = p.name | slugify | append: '.md' -%}
    <article class="tx-project{% if p.video or p.wide %} tx-project--wide{% endif %}" data-tx-card>
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
  {%- endif %}
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
<script src="{{ '/assets/js/hf-downloads.js' | relative_url }}" defer></script>
