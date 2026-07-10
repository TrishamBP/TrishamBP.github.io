---
layout: default
title: Research Articles
permalink: /research-articles/
includelink: true
---

<!-- ===================== RESEARCH PAPERS SECTION ===================== -->
<section class="content-section papers-section" aria-labelledby="papers-heading">
  <h1 id="papers-heading" class="section-title">Research Papers</h1>
  <p class="research-intro">
    Peer-reviewed publications, technical whitepapers, and production engineering research focused 
    on AI systems, agentic workflows, large language models, distributed inference, memory architectures, 
    and autonomous systems.
  </p>

  {% assign research_papers = site.papers | sort: "date" | reverse %}
  <div class="articles-grid">
    {% for paper in research_papers %}
      <article class="article-card">
        <h2 class="article-title">{{ paper.title }}</h2>
        
        <p class="article-date">
          {% if paper.authors %}
            {{ paper.authors }}
            {% if paper.author_email %}
              &lt;<a href="mailto:{{ paper.author_email }}">{{ paper.author_email }}</a>&gt;
            {% endif %}
          {% endif %}
        </p>
        
        <p class="article-date">
          Published: {{ paper.date | date: "%B %-d, %Y" }}
          {% if paper.venue %} | {{ paper.venue }}{% endif %}
        </p>
        
        {% if paper.keywords and paper.keywords.size > 0 %}
          <p class="article-tags">{{ paper.keywords | join: " | " }}</p>
        {% endif %}
        
        <p class="article-preview">
          {% if paper.abstract_short %}
            {{ paper.abstract_short }}
          {% else %}
            {{ paper.abstract | strip_html | normalize_whitespace | truncate: 300 }}
          {% endif %}
        </p>
        
        <a 
          class="article-read-more" 
          href="{{ paper.pdf | relative_url }}" 
          target="_blank" 
          rel="noopener noreferrer"
        >Read Paper &rarr;</a>
      </article>
    {% endfor %}
  </div>

  {% if research_papers.size == 0 %}
    <p class="research-intro">Research papers will be published here.</p>
  {% endif %}
</section>

<!-- ===================== RESEARCH ARTICLES SECTION ===================== -->
<section class="content-section articles-section" aria-labelledby="research-articles-heading" style="margin-top: 56px;">
  <h2 id="research-articles-heading" class="section-title">Research Articles</h2>
  <p class="research-intro">
    Research-first writeups on AI systems, domain-specific NLP, model architecture, and production lessons from real deployments.
  </p>

  {% assign research_posts = site.research | sort: "date" | reverse %}
  <div class="articles-grid" id="research-articles-grid">
    {% for post in research_posts %}
      <article class="article-card research-article-item" data-index="{{ forloop.index0 }}">
        <h2 class="article-title">
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </h2>
        <p class="article-date">
          Published: {{ post.date | date: "%B %-d, %Y" }}
        </p>
        {% if post.tags and post.tags.size > 0 %}
          <p class="article-tags">Tags: {{ post.tags | join: " | " }}</p>
        {% endif %}
        <p class="article-preview">
          {% if post.description %}
            {{ post.description }}
          {% else %}
            {{ post.excerpt | strip_html | normalize_whitespace | truncate: 220 }}
          {% endif %}
        </p>
        <a class="article-read-more" href="{{ post.url | relative_url }}">Read Research &rarr;</a>
      </article>
    {% endfor %}
  </div>

  {% if research_posts.size == 0 %}
    <p>Research articles are being prepared for publication.</p>
  {% endif %}

  <div class="load-more-container" id="research-load-more-container" style="display: none;">
    <button 
      class="load-more-btn" 
      id="research-load-more-btn"
      aria-label="Load more research articles"
    >
      Load More Research Articles
    </button>
    <p class="load-more-status" id="research-load-more-status" aria-live="polite"></p>
  </div>
</section>

<script>
(function() {
  var ITEMS_PER_PAGE = 5;
  var container = document.getElementById('research-articles-grid');
  var loadMoreBtn = document.getElementById('research-load-more-btn');
  var loadMoreContainer = document.getElementById('research-load-more-container');
  var statusEl = document.getElementById('research-load-more-status');
  
  if (!container || !loadMoreBtn) return;
  
  var items = Array.from(container.querySelectorAll('.research-article-item'));
  var totalItems = items.length;
  var visibleCount = ITEMS_PER_PAGE;
  
  function updateDisplay() {
    items.forEach(function(item, index) {
      item.style.display = index < visibleCount ? '' : 'none';
    });
    
    var remaining = totalItems - visibleCount;
    if (remaining > 0) {
      loadMoreContainer.style.display = 'block';
      statusEl.textContent = 'Showing ' + visibleCount + ' of ' + totalItems + ' articles';
    } else {
      loadMoreContainer.style.display = 'none';
    }
  }
  
  loadMoreBtn.addEventListener('click', function() {
    visibleCount += ITEMS_PER_PAGE;
    updateDisplay();
  });
  
  if (totalItems > ITEMS_PER_PAGE) {
    updateDisplay();
  }
})();
</script>
