---
layout: default
title: Blogs
permalink: /blog/
---

<section class="content-section articles-section" aria-labelledby="blog-heading">
  <h1 id="blog-heading" class="section-title">Blogs</h1>
  <p class="research-intro">
    Technical writeups on AI systems, backend engineering, and applied machine learning.
  </p>

  {%- comment -%}
    The listing merges `site.posts` with the exploratory-research entries
    (SIMA), which used to live under the now-hidden Physical AI section. They
    are rendered with the identical card markup so the whole page reads as one
    stream. Collection docs have no implicit date, so each exploratory-research
    entry carries an explicit `date:` in its frontmatter for this sort.
  {%- endcomment -%}
  {%- assign blog_entries = site.posts | concat: site.exploratory_research | sort: "date" | reverse -%}

  <div id="blog-posts-list" class="articles-grid">
    {% for post in blog_entries %}
      <article class="article-card blog-post-item">
        <h2 class="article-title">
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </h2>
        <p class="article-date">
          Published: {{ post.date | date: "%B %Y" }}
          {%- if post.collection == 'exploratory_research' %} &middot; Exploratory Research{% endif -%}
        </p>
        {% if post.tags and post.tags.size > 0 %}
          <p class="article-tags">{{ post.tags | join: " &middot; " }}</p>
        {% endif %}
        <p class="article-preview">
          {%- if post.excerpt and post.excerpt != '' -%}
            {{ post.excerpt | strip_html | normalize_whitespace | truncate: 190 }}
          {%- else -%}
            {{ post.description | strip_html | normalize_whitespace | truncate: 190 }}
          {%- endif -%}
        </p>
        <a class="article-read-more" href="{{ post.url | relative_url }}"
          >Read More &rarr;</a
        >
      </article>
    {% endfor %}
  </div>

  {% if blog_entries.size == 0 %}
    <p>No posts published yet.</p>
  {% endif %}

  <nav id="blog-pagination" class="article-pagination" aria-label="Blog pagination"></nav>
</section>

{% include list-pagination.html list_id="blog-posts-list" nav_id="blog-pagination" item_class="blog-post-item" per_page=5 %}
