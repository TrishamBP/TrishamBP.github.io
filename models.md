---
layout: default
title: Models
seo_title: "Models — Fine-Tuned & Trained AI Models on Hugging Face"
description: "Open AI models by Trisham Patil on Hugging Face: fine-tuned DistilBERT NER and news classifiers plus an LLM complexity router, with live download counts."
keywords: "Hugging Face models, fine-tuned models, LLM router, prompt complexity classifier, named entity recognition, DistilBERT, multitask NER, energy news classifier, Trisham Patil"
permalink: /models/
---

{%- comment -%}
  Models listing. Uses the blog paper skin (css/blog-paper.css), so it shares
  the /blog/ gate in _includes/head.html and _layouts/default.html. Cards come
  from _data/hf_models.yml (also used by the home page Stats section), and
  assets/js/hf-downloads.js swaps the stored counts for live ones.
{%- endcomment -%}

{%- assign models = site.data.hf_models -%}
{%- assign total_downloads = 0 -%}
{%- for m in models -%}
  {%- assign total_downloads = total_downloads | plus: m.downloads | plus: m.extra_downloads -%}
{%- endfor -%}

<section class="content-section articles-section models-section" aria-labelledby="models-heading">
  <h1 id="models-heading" class="section-title">Models</h1>
  <p class="research-intro">
    Models I have trained from scratch, fine-tuned and published on Hugging Face, open for anyone to download and run.
  </p>

  <dl class="models-stats" aria-label="Hugging Face model totals">
    <div class="models-stat">
      <dt>Total downloads</dt>
      <dd data-hf-total>{{ total_downloads }}</dd>
    </div>
    <div class="models-stat">
      <dt>Models published</dt>
      <dd>{{ models.size }}</dd>
    </div>
    <div class="models-stat">
      <dt>Hosted on</dt>
      <dd>Hugging Face</dd>
    </div>
  </dl>

  <div class="articles-grid models-grid">
    {% for m in models %}
      <article class="article-card model-card">
        <h2 class="article-title">
          <a href="https://huggingface.co/{{ m.id }}" target="_blank" rel="noopener noreferrer">{{ m.name }}</a>
        </h2>
        <p class="article-date model-id">{{ m.id }}</p>
        <p class="article-tags">
          {{ m.task }} &middot; {{ m.training }}{% if m.params %} &middot; {{ m.params }}{% endif %}
        </p>
        <p class="article-preview">{{ m.summary }}</p>
        <p class="article-preview model-detail">{{ m.detail }}</p>
        <ul class="model-meta">
          <li><span>Downloads</span><b data-hf-downloads="{{ m.id }}" data-extra="{{ m.extra_downloads | default: 0 }}" data-count="{{ m.downloads | plus: m.extra_downloads }}">{{ m.downloads | plus: m.extra_downloads }}</b></li>
          <li><span>Base</span>{{ m.base }}</li>
          <li><span>License</span>{{ m.license }}</li>
          <li><span>Released</span>{{ m.released }}</li>
        </ul>
        <a class="article-read-more" href="https://huggingface.co/{{ m.id }}" target="_blank" rel="noopener noreferrer">View model card on Hugging Face &rarr;</a>
      </article>
    {% endfor %}
  </div>
</section>

<script src="{{ '/assets/js/hf-downloads.js' | relative_url }}" defer></script>
