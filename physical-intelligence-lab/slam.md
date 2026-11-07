---
layout: default
title: SLAM — Physical Intelligence Lab
seo_title: "SLAM Explained — Simultaneous Localization and Mapping Notes | PIL"
description: "SLAM research notes from the Physical Intelligence Lab: how simultaneous localization and mapping works, from visual odometry and pose graphs to loop closure."
keywords: "SLAM, simultaneous localization and mapping, visual SLAM, visual odometry, pose graph optimization, loop closure, bundle adjustment, robot mapping, Physical Intelligence Lab"
permalink: /physical-intelligence-lab/slam/
pil_area: slam
---

{%- comment -%}
  Research-area listing: the Signals card index (fn-signal-card) on the PIL
  skin. Lists `pil` collection posts whose `area` matches `page.pil_area`,
  newest first, 6 per page. Card number = chronological position in the area.
{%- endcomment -%}
{%- assign area_posts = site.pil | where: "area", page.pil_area | sort: "date" | reverse -%}
{%- assign area_total = area_posts.size -%}

<section class="fn-index pil-index" aria-labelledby="slam-heading">
  <p class="pil-crumb"><a href="{{ '/physical-intelligence-lab/' | relative_url }}">Physical Intelligence Lab</a> / SLAM</p>

  <header class="fn-dossier">
    <p class="fn-eyebrow"><span class="fn-fig">PIL</span> &mdash; Research area</p>
    <h1 id="slam-heading" class="fn-title">SLAM: <mark>localization &amp; mapping</mark></h1>
    <p class="fn-lede">
      Simultaneous localization and mapping (SLAM) is how a robot, drone or
      headset builds a map of a space it has never seen while working out
      where it is inside that map. These notes take modern SLAM apart piece
      by piece: odometry, mapping, loop closure and optimization.
    </p>
  </header>

  <section class="fn-section" aria-labelledby="slam-index-heading">
    <div class="fn-section-head">
      <div>
        <p class="fn-kicker">The index</p>
        <h2 id="slam-index-heading" class="fn-h2">SLAM posts, newest first.</h2>
      </div>
      <p class="fn-section-meta">{{ area_total }} {% if area_total == 1 %}post{% else %}posts{% endif %}</p>
    </div>

    <div id="slam-list" class="fn-cards">
      {% for post in area_posts %}
        {%- assign post_no = area_total | minus: forloop.index0 -%}
        {%- assign post_words = post.content | strip_html | number_of_words -%}
        <article class="fn-card fn-signal-card">
          <p class="fn-card-tag">{% if post_no < 10 %}0{% endif %}{{ post_no }} / {{ post.category | default: "SLAM" }}</p>
          <h3 class="fn-card-title">
            <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
          </h3>
          <p class="fn-card-text">
            {{ post.description | strip_html | normalize_whitespace | truncate: 170 }}
          </p>
          <p class="fn-card-foot">
            <span>{{ post.date | date: "%-d %b %Y" }}</span>
            <span>{{ post_words | divided_by: 220 | plus: 1 }} min read &rarr;</span>
          </p>
        </article>
      {% endfor %}
    </div>

    {% if area_total == 0 %}
      <p>No SLAM posts published yet.</p>
    {% endif %}

    <nav id="slam-pagination" class="fn-pagination" aria-label="SLAM posts pagination"></nav>
  </section>
</section>

{% include list-pagination.html list_id="slam-list" nav_id="slam-pagination" item_class="fn-signal-card" per_page=6 %}
