---
layout: default
title: GitHub Projects
seo_title: "GitHub Projects — Open-Source Rust, LLM Inference & AI Engineering Repos"
description: "Open-source GitHub projects by Trisham Patil: Rust RoPE and BPE tokenizer, EAGLE-3 speculative decoding, LLM routing, KV cache engineering and tiny GPT."
keywords: "GitHub projects, open source AI projects, Rust machine learning, BPE tokenizer Rust, RoPE implementation, EAGLE-3 speculative decoding, LLM router, KV cache, tiny GPT from scratch, Trisham Patil"
permalink: /github-projects/
---

<section class="content-section sessions-section" aria-labelledby="gh-projects-heading">
  <h1 id="gh-projects-heading" class="section-title">GitHub Projects</h1>
  <p class="research-intro">
    Open-source GitHub projects on LLM inference, tokenization, positional
    encodings and AI engineering &mdash; mostly built from scratch in Rust and
    PyTorch to understand how the pieces actually work.
  </p>

  <div class="gh-grid" aria-label="GitHub repositories">
    {% for p in site.data.github_projects %}
      {% assign url = "https://github.com/" | append: p.repo %}
      <article class="gh-card">
        <h2 class="gh-title">
          <svg class="gh-repo-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>
          <a href="{{ url }}" target="_blank" rel="noopener">{{ p.name }}</a>
          <span class="gh-badge">Public</span>
        </h2>
        <p class="gh-desc">{{ p.description | strip_newlines }}</p>
        {% if p.stack and p.stack.size > 0 %}
          <ul class="gh-stack" aria-label="Tech stack">
            {% for t in p.stack %}<li>{{ t }}</li>{% endfor %}
          </ul>
        {% endif %}
        <div class="gh-foot">
          {% if p.language %}
            <span class="gh-lang"><span class="gh-lang-dot" style="background: {{ p.lang_color | default: '#8b949e' }}" aria-hidden="true"></span>{{ p.language }}</span>
          {% endif %}
          <a class="gh-link" href="{{ url }}" target="_blank" rel="noopener" aria-label="View {{ p.name }} on GitHub">github.com/{{ p.repo }}&nbsp;<span aria-hidden="true">&rarr;</span></a>
        </div>
      </article>
    {% endfor %}
  </div>
</section>
