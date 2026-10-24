---
layout: default
title: Signals
seo_title: "Signals — Short Takes on AI, Interpretable ML & Emerging Research"
description: "Signals by Trisham Patil: short, focused posts on AI research worth tracking, from interpretable ML and symbolic regression to new tools and emerging ideas."
keywords: "AI signals, AI research notes, interpretable machine learning, symbolic regression, PySR, emerging AI research, Trisham Patil"
permalink: /signals/
---

{%- comment -%}
  Field-notes skin (css/signals-field-notes.css): a dossier hero card, then a
  numbered card index. Signal posts live in the `signals` collection; each
  sets an explicit `date:` for this sort. A card's number is its
  chronological position, matching the "Fig. NN" on the post itself.
{%- endcomment -%}
{%- assign signal_entries = site.signals | sort: "date" | reverse -%}
{%- assign signal_total = signal_entries.size -%}
{%- assign latest = signal_entries | first -%}
{%- assign signal_topics = site.signals | map: "category" | compact | uniq -%}

<section class="fn-index" aria-labelledby="signals-heading">
  <header class="fn-dossier">
    <p class="fn-eyebrow"><span class="fn-fig">Fig. 00</span> &mdash; Signals index / {{ site.time | date: "%Y.%m" }}</p>
    <h1 id="signals-heading" class="fn-title">Signals: <mark>field notes</mark> on AI research worth tracking</h1>
    <p class="fn-lede">
      Signal posts are short, source-based readings of one AI release, paper or
      tool at a time: what actually shipped, what it isn't, and why it matters
      to engineers building with it.
    </p>
    <div class="fn-actions">
      {%- if latest %}
      <a class="fn-button fn-button--solid" href="{{ latest.url | relative_url }}">Read the latest signal <span aria-hidden="true">&rarr;</span></a>
      {%- endif %}
      <a class="fn-button" href="{{ '/newsletter/' | relative_url }}">Weekly Tech Brew</a>
    </div>
    <dl class="fn-specs">
      <div class="fn-spec"><dt>Filed</dt><dd><strong>{{ signal_total }} signals</strong><span>newest first</span></dd></div>
      <div class="fn-spec"><dt>Latest</dt><dd><strong>{% if latest %}{{ latest.date | date: "%-d %b %Y" }}{% else %}&mdash;{% endif %}</strong><span>{{ latest.category | default: "signal" }}</span></dd></div>
      <div class="fn-spec"><dt>Topics</dt><dd><strong>{{ signal_topics.size }} areas</strong><span>{{ signal_topics | first }}</span></dd></div>
      <div class="fn-spec"><dt>Format</dt><dd><strong>Short takes</strong><span>one source each</span></dd></div>
      <div class="fn-spec"><dt>Author</dt><dd><strong>Trisham Patil</strong><span>independent reading</span></dd></div>
    </dl>
    <p class="fn-snapshot">
      <span>Updated {{ site.time | date: "%Y-%m-%d" }}</span>
      <span>Source-based reading</span>
      <span>AI research</span>
      <span>Independent</span>
    </p>
  </header>

  <section class="fn-section" aria-labelledby="signals-index-heading">
    <div class="fn-section-head">
      <div>
        <p class="fn-kicker">The index</p>
        <h2 id="signals-index-heading" class="fn-h2">Every signal, filed newest first.</h2>
      </div>
      <p class="fn-section-meta">{{ signal_total }} posts filed</p>
    </div>

    <div id="signals-list" class="fn-cards">
      {% for post in signal_entries %}
        {%- assign signal_no = signal_total | minus: forloop.index0 -%}
        {%- assign signal_words = post.content | strip_html | number_of_words -%}
        <article class="fn-card fn-signal-card">
          <p class="fn-card-tag">
            {%- if post.logo %}<img class="fn-card-logo" src="{{ post.logo | relative_url }}" alt="{{ post.logo_alt | default: post.title | escape }}" width="28" height="28">{% endif -%}
            {% if signal_no < 10 %}0{% endif %}{{ signal_no }} / {{ post.category | default: "Signal" }}
          </p>
          <h3 class="fn-card-title">
            <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
          </h3>
          <p class="fn-card-text">
            {{ post.description | strip_html | normalize_whitespace | truncate: 170 }}
          </p>
          <p class="fn-card-foot">
            <span>{{ post.date | date: "%-d %b %Y" }}</span>
            <span>{{ signal_words | divided_by: 220 | plus: 1 }} min read &rarr;</span>
          </p>
        </article>
      {% endfor %}
    </div>

    {% if signal_entries.size == 0 %}
      <p>No signal posts published yet.</p>
    {% endif %}

    <nav id="signals-pagination" class="fn-pagination" aria-label="Signals pagination"></nav>
  </section>

  <aside class="fn-callout">
    <strong>What a signal is, in one sentence.</strong> One source, read closely:
    the claim, the boundary of what was released, and the numbers that need
    asterisks, written so another engineer can decide in five minutes whether
    it matters to them.
  </aside>
</section>

{% include list-pagination.html list_id="signals-list" nav_id="signals-pagination" item_class="fn-signal-card" per_page=6 %}
