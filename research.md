---
layout: default
title: Research Articles
seo_title: "AI Systems Research Papers & Articles — LLM Inference, NLP, Attention"
description: "AI systems research by Trisham Patil: technical reports and papers on LLM inference, attention mechanisms, KV cache management, and domain-specific NLP."
keywords: "AI research, LLM inference research, attention mechanisms, KV cache, multi-head latent attention, domain-specific NLP, technical report"
permalink: /research-articles/
includelink: true
---
{%- comment -%}
  Cinematic layout: every publication is one full-screen section with an
  animated background (see _includes/spx-section.html). Per-entry frontmatter
  can override the background with `bg_video:` (+ optional `bg_poster:`) or
  pick a canvas scene with `bg_scene:`. Otherwise scenes cycle through the
  list below.
{%- endcomment -%}
{%- assign scenes = "orbit,network,stars,grid" | split: "," -%}
{%- assign research_papers = site.papers | sort: "date" | reverse -%}
{%- assign crosslisted = site.implementations | where: "research_crosslist", true -%}
{%- assign research_posts = site.research | concat: crosslisted | sort: "date" | reverse -%}
{%- assign total = research_papers.size | plus: research_posts.size | plus: 2 -%}

{% capture hero_eyebrow %}{{ total }} Publications &middot; Papers &middot; Reports &middot; Articles{% endcapture %}
{% include spx-section.html
   hero=true
   heading="h1"
   id="research-hero"
   scene="ascent"
   eyebrow=hero_eyebrow
   title="AI Systems Research"
   desc="Peer-reviewed publications, technical whitepapers, and production engineering research on large language models, distributed inference, memory architectures, agentic workflows, and autonomous systems."
   cta="Research Papers"
   href="#research-papers"
   external_url=true
   cta2="Articles"
   href2="#research-articles" %}

<!-- ===================== RESEARCH PAPERS ===================== -->
<div id="research-papers" class="spx-group">
  <p class="spx-group-label"><span>01</span> Research Papers</p>

  {% include spx-section.html
     id="agentic-workflow-memory-lifecycle"
     scene="neural"
     eyebrow="July 2026 &middot; Research Paper &middot; Trisham Patil"
     title="A Scalable Memory Lifecycle Architecture for Agentic Workflows"
     desc="A SimpleMem-inspired memory lifecycle for an eleven-node LangGraph agentic workflow: taxonomy gating, tenant-isolated three-view indexing, memory aging, and HITL-aware updates."
     tags="Agent Memory · LangGraph · RAG · Multi-Tenant Retrieval · Vector Compression · Agentic Workflows"
     cta="Read Paper"
     href="/assets/papers/2026/Scalable%20Memory%20Lifecycle%20Architecture%20-%20Agentic%20Workflows.pdf"
     new_tab=true %}

  {% include spx-section.html
     id="mla-technical-report"
     scene="orbit"
     eyebrow="July 2026 &middot; Technical Report &middot; Trisham Patil"
     title="From Multi-Head to Multi-Head Latent Attention"
     desc="A systems-level engineering analysis of attention for LLM inference — MHA, MQA, GQA and MLA — covering KV cache optimization, GPU memory behavior, and the trade-offs that matter in modern serving systems."
     tags="Attention · KV Cache · MQA · GQA · MLA · GPU Memory Bandwidth"
     cta="View Technical Report"
     href="/assets/papers/2026/Attention%20-%20Technical%20Report.pdf"
     new_tab=true %}

  {% for paper in research_papers %}
    {%- assign scene_i = forloop.index | modulo: scenes.size -%}
    {%- assign scene_name = paper.bg_scene | default: scenes[scene_i] -%}
    {%- capture eyebrow -%}{{ paper.date | date: "%B %Y" }}{% if paper.venue %} &middot; {{ paper.venue }}{% endif %}{% if paper.authors %} &middot; {{ paper.authors }}{% endif %}{%- endcapture -%}
    {%- capture desc -%}{% if paper.abstract_short %}{{ paper.abstract_short }}{% else %}{{ paper.abstract | strip_html | normalize_whitespace | truncate: 240 }}{% endif %}{%- endcapture -%}
    {%- capture tags -%}{% if paper.keywords %}{{ paper.keywords | join: " · " }}{% endif %}{%- endcapture -%}
    {% include spx-section.html
       id=paper.slug
       scene=scene_name
       video=paper.bg_video
       poster=paper.bg_poster
       eyebrow=eyebrow
       title=paper.title
       desc=desc
       tags=tags
       cta="Read Paper"
       href=paper.pdf
       new_tab=true %}
  {% endfor %}
</div>

<!-- ===================== RESEARCH ARTICLES ===================== -->
<div id="research-articles" class="spx-group">
  <p class="spx-group-label"><span>02</span> Research Articles</p>

  {% for post in research_posts %}
    {%- assign scene_i = forloop.index0 | plus: 1 | modulo: scenes.size -%}
    {%- assign scene_name = post.bg_scene | default: scenes[scene_i] -%}
    {%- capture eyebrow -%}{{ post.date | date: "%B %Y" }} &middot; Research Article{%- endcapture -%}
    {%- capture desc -%}{% if post.description %}{{ post.description | strip_html | truncate: 240 }}{% else %}{{ post.excerpt | strip_html | normalize_whitespace | truncate: 240 }}{% endif %}{%- endcapture -%}
    {%- capture tags -%}{% if post.tags %}{{ post.tags | slice: 0, 6 | join: " · " }}{% endif %}{%- endcapture -%}
    {% include spx-section.html
       id=post.slug
       scene=scene_name
       video=post.bg_video
       poster=post.bg_poster
       eyebrow=eyebrow
       title=post.title
       desc=desc
       tags=tags
       cta="Read Research"
       href=post.url %}
  {% endfor %}

  {% if research_posts.size == 0 %}
    <p class="spx-empty">Research articles are being prepared for publication.</p>
  {% endif %}
</div>

<script src="{{ '/assets/js/research-cinema.js' | relative_url }}" defer></script>
