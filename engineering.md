---
layout: default
title: Engineering Implementations
permalink: /engineering/
---

<section class="content-section engineering-section" aria-labelledby="engineering-heading">
  <h1 id="engineering-heading" class="section-title">Engineering Implementations</h1>
  <p class="research-intro">
    Deep technical implementations of AI/ML systems, research papers, and low-level optimizations.
  </p>

  {% assign implementations = site.implementations | sort: "order" %}
  <div class="lab-feed" id="implementations-feed" aria-label="Engineering implementations feed">
    {% for impl in implementations %}
      <article class="lab-card lab-paper-card implementation-item" data-index="{{ forloop.index0 }}" aria-label="{{ impl.title }}">

        <div class="lab-card-image-wrap">
          {% if impl.image %}
            <img
              class="lab-paper-image"
              src="{{ impl.image | relative_url }}"
              alt="{{ impl.title }}"
            />
          {% else %}
            <div class="lab-paper-placeholder" aria-hidden="true">
              <span class="lab-paper-icon">&#128196;</span>
              {% if impl.year %}<span class="lab-paper-year">{{ impl.year }}</span>{% endif %}
            </div>
          {% endif %}
        </div>

        <div class="lab-card-content">

          <h3 class="lab-card-title">{{ impl.title }}</h3>

          {% if impl.authors %}
            <p class="lab-card-meta">{{ impl.authors }}</p>
          {% endif %}

          {% if impl.venue %}
            <p class="lab-card-venue">{{ impl.venue }}</p>
          {% endif %}

          <p class="lab-card-description">{{ impl.description }}</p>

          {% if impl.highlights and impl.highlights.size > 0 %}
            <ul class="lab-card-highlights">
              {% for h in impl.highlights %}
                <li>{{ h }}</li>
              {% endfor %}
            </ul>
          {% endif %}

          {% if impl.tags and impl.tags.size > 0 %}
            <div class="lab-tag-pills">
              {% for tag in impl.tags %}
                <span class="lab-tag-pill">{{ tag }}</span>
              {% endfor %}
            </div>
          {% endif %}

          <div class="lab-card-actions">
            <a class="article-read-more lab-card-cta" href="{{ impl.url | relative_url }}">Read Implementation &rarr;</a>
            {% if impl.paper_link %}
              <a
                class="lab-paper-link"
                href="{{ impl.paper_link }}"
                target="_blank"
                rel="noopener noreferrer"
              >View Original Paper &#8599;</a>
            {% endif %}
          </div>

        </div>
      </article>
    {% endfor %}
  </div>

  {% if implementations.size == 0 %}
    <p class="research-intro">Engineering implementations are being prepared.</p>
  {% endif %}

  <div class="load-more-container" id="implementations-load-more-container" style="display: none;">
    <button 
      class="load-more-btn" 
      id="implementations-load-more-btn"
      aria-label="Load more engineering implementations"
    >
      Load More Engineering Implementations
    </button>
    <p class="load-more-status" id="implementations-load-more-status" aria-live="polite"></p>
  </div>
</section>

<script>
(function() {
  var ITEMS_PER_PAGE = 5;
  var container = document.getElementById('implementations-feed');
  var loadMoreBtn = document.getElementById('implementations-load-more-btn');
  var loadMoreContainer = document.getElementById('implementations-load-more-container');
  var statusEl = document.getElementById('implementations-load-more-status');
  
  if (!container || !loadMoreBtn) return;
  
  var items = Array.from(container.querySelectorAll('.implementation-item'));
  var totalItems = items.length;
  var visibleCount = ITEMS_PER_PAGE;
  
  function updateDisplay() {
    items.forEach(function(item, index) {
      item.style.display = index < visibleCount ? '' : 'none';
    });
    
    var remaining = totalItems - visibleCount;
    if (remaining > 0) {
      loadMoreContainer.style.display = 'block';
      statusEl.textContent = 'Showing ' + visibleCount + ' of ' + totalItems + ' implementations';
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
