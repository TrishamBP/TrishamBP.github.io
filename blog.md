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

  <div id="blog-posts-list" class="articles-grid">
    {% for post in site.posts %}
      <article class="article-card blog-post-item">
        <h2 class="article-title">
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </h2>
        <p class="article-date">
          Published: {{ post.date | date: "%B %-d, %Y" }}
        </p>
        {% if post.tags and post.tags.size > 0 %}
          <p class="article-tags">{{ post.tags | join: " &middot; " }}</p>
        {% endif %}
        <p class="article-preview">
          {{ post.excerpt | strip_html | normalize_whitespace | truncate: 190 }}
        </p>
        <a class="article-read-more" href="{{ post.url | relative_url }}"
          >Read More &rarr;</a
        >
      </article>
    {% endfor %}
  </div>

  {% if site.posts.size == 0 %}
    <p>No posts published yet.</p>
  {% endif %}

  <nav id="blog-pagination" class="article-pagination" aria-label="Blog pagination"></nav>
</section>

<script>
  (function () {
    var POSTS_PER_PAGE = 10;
    var container = document.getElementById("blog-posts-list");
    var paginationEl = document.getElementById("blog-pagination");

    if (!container || !paginationEl) return;

    var posts = Array.from(container.querySelectorAll(".blog-post-item"));
    var totalPosts = posts.length;
    var totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

    if (totalPages <= 1) return;

    var currentPage = 1;

    function showPage(page) {
      currentPage = page;
      var start = (page - 1) * POSTS_PER_PAGE;
      var end = start + POSTS_PER_PAGE;

      posts.forEach(function (post, i) {
        post.style.display = i >= start && i < end ? "" : "none";
      });

      renderPagination();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderPagination() {
      var html = "";

      if (currentPage > 1) {
        html += '<a href="#" data-page="' + (currentPage - 1) + '">Previous</a>';
      } else {
        html += '<span class="disabled">Previous</span>';
      }

      for (var p = 1; p <= totalPages; p++) {
        if (p === currentPage) {
          html += '<span class="active">' + p + "</span>";
        } else {
          html += '<a href="#" data-page="' + p + '">' + p + "</a>";
        }
      }

      if (currentPage < totalPages) {
        html += '<a href="#" data-page="' + (currentPage + 1) + '">Next</a>';
      } else {
        html += '<span class="disabled">Next</span>';
      }

      paginationEl.innerHTML = html;

      paginationEl.querySelectorAll("a[data-page]").forEach(function (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          showPage(parseInt(this.getAttribute("data-page"), 10));
        });
      });
    }

    showPage(1);
  })();
</script>
