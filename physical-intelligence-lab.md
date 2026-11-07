---
layout: default
title: Physical Intelligence Lab (PIL)
seo_title: "Physical Intelligence Lab (PIL) — Physical AI, World Models & Robot Learning"
description: "Physical Intelligence Lab (PIL) by Trisham Patil: research notes on physical AI, world models, 4D perception, vision-language-action models and robot learning."
keywords: "Physical Intelligence Lab, physical AI, embodied AI, world models, 4D perception, vision-language-action models, robot learning, sim-to-real transfer, humanoid locomotion, Trisham Patil"
permalink: /physical-intelligence-lab/
---

{%- comment -%}
  Physical Intelligence Lab. Uses the Signals field-notes skin (fn-notes),
  re-inked dark by css/pil-lab.css (body class `pil-lab`). Intro card, then
  the Research Areas grid from _data/pil_research_areas.yml, 5 per page.
{%- endcomment -%}
{%- assign areas = site.data.pil_research_areas -%}

<section class="fn-index pil-index" aria-labelledby="pil-heading">
  <header class="fn-dossier">
    <p class="fn-eyebrow"><span class="fn-fig">PIL</span> &mdash; Physical Intelligence Lab</p>
    <h1 id="pil-heading" class="fn-title">Physical AI Lab <mark>(PIL)</mark></h1>
    <p class="fn-lede">
      The Physical Intelligence Lab is where I study physical AI: models that
      perceive, predict and act in the real world rather than only in text.
      It covers world models and simulation, 4D perception,
      vision-language-action models and robot learning, read from first
      principles and written up so another engineer can follow how these
      systems actually work.
    </p>
  </header>

  <section class="fn-section" aria-labelledby="pil-areas-heading">
    <h2 id="pil-areas-heading" class="fn-h2 pil-areas-title">Research Areas</h2>

    <div id="pil-areas" class="pil-areas">
      {%- for area in areas %}
      {%- assign area_no = forloop.index %}
      <article class="fn-card pil-area-card">
        <div class="pil-area-media">
          <img src="{{ area.image | relative_url }}" alt="{{ area.alt | escape }}" width="640" height="360" loading="lazy">
        </div>
        <div class="pil-area-body">
          <p class="fn-card-tag">{% if area_no < 10 %}0{% endif %}{{ area_no }} / {{ area.tag }}</p>
          <h3 class="fn-card-title">{{ area.title }}</h3>
          <p class="fn-card-text">{{ area.description }}</p>
        </div>
      </article>
      {%- endfor %}
    </div>

    <nav id="pil-pagination" class="fn-pagination pil-pagination" aria-label="Research areas pagination"></nav>
  </section>
</section>

{% include list-pagination.html list_id="pil-areas" nav_id="pil-pagination" item_class="pil-area-card" per_page=5 %}
