---
layout: default
title: Digital Garden
seo_title: "Digital Garden: Programming Notes & Learning Guides by Trisham Patil"
description: "Trisham Patil's digital garden: open programming notes and learning guides, from The Rust Sandbox Rust study guide to system design production use cases."
keywords: "digital garden, programming notes, learning guides, study notes, Rust programming notes, learn Rust, Rust study guide, system design notes, system design use cases, software engineering notes, Trisham Patil"
permalink: /digital-garden/
---

{%- comment -%}
  Digital Garden: learning guides from the `garden` collection, two cards per
  row (Signals-style cards in the black / white / Aptos skin). Only guide
  root pages (`guide_root: true`) get a card; their notes are reached from
  the guide's docs sidebar.
{%- endcomment -%}
{%- assign guides = site.garden | where: "guide_root", true | sort: "card_order" -%}

<section class="dg-index" aria-labelledby="dg-heading">
  <header class="dg-hero">
    <p class="dg-eyebrow">Digital Garden / {{ guides.size }} {% if guides.size == 1 %}guide{% else %}guides{% endif %}</p>
    <h1 id="dg-heading" class="dg-title">Digital Garden</h1>
    <p class="dg-lede">
      Programming notes and learning guides I write while studying new
      languages and systems. They are working notes rather than polished
      tutorials, kept open so other engineers can learn from them too.
    </p>
  </header>

  <div class="dg-cards">
    {% for g in guides %}
      <article class="dg-card">
        {%- if g.logo %}
        <img class="dg-card-logo" src="{{ g.logo | relative_url }}" alt="{{ g.logo_alt | default: g.title | escape }}" width="96" height="67" loading="lazy">
        {%- endif %}
        <p class="dg-card-tag">{% if forloop.index < 10 %}0{% endif %}{{ forloop.index }} / {{ g.tag | default: "Guide" }}</p>
        <h2 class="dg-card-title"><a href="{{ g.url | relative_url }}">{{ g.title }}</a></h2>
        <p class="dg-card-text">{{ g.card_text | default: g.description }}</p>
        <p class="dg-card-foot">
          <span>{{ g.status | default: "Learning guide" }}</span>
          <span>{% assign gnotes = site.garden | where: "guide", g.guide | where_exp: "p", "p.guide_root != true" %}{{ gnotes.size }} notes &middot; Open guide &rarr;</span>
        </p>
      </article>
    {% endfor %}
  </div>
</section>
