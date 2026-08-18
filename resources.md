---
layout: default
title: Resources
permalink: /resources/
---

<section class="content-section resources-section" aria-labelledby="resources-heading">
  <h1 id="resources-heading" class="section-title">Resources</h1>
  <p class="research-intro">
    Curated learning material, research papers, books, courses, and notes that have shaped my understanding
    of AI systems, machine learning, and software engineering.
  </p>

  <div class="resources-intro">
    <p>
      This is a living collection of resources I've found valuable in my journey through AI engineering,
      backend systems, and applied machine learning. Each resource is chosen for its depth, clarity, and
      practical relevance to building production AI systems.
    </p>
  </div>

  <h2 class="section-title">LinkedIn Posts</h2>

  <div class="linkedin-posts" id="linkedin-posts" aria-live="polite">
    <div class="linkedin-grid" id="linkedin-grid"></div>
    <nav class="article-pagination linkedin-pagination" id="linkedin-pagination" aria-label="LinkedIn posts pagination"></nav>
  </div>

  <script>
    (function () {
      // Centralized post data — to add a post, append one entry here.
      // `height` is the LinkedIn-recommended embed height for that post.
      var LINKEDIN_POSTS = [
        { urn: "urn:li:share:7494713074709487616", height: 230 },
        { urn: "urn:li:share:7494711628232478721", height: 264 },
        { urn: "urn:li:share:7494709009136959488", height: 230 },
        { urn: "urn:li:share:7494705306594283520", height: 230 },
        { urn: "urn:li:share:7485188797303992320", height: 264 },
        { urn: "urn:li:share:7466379695060779008", height: 536 },
        { urn: "urn:li:share:7452869663237255168", height: 547 },
        { urn: "urn:li:share:7452531306707521537", height: 636 },
        { urn: "urn:li:ugcPost:7451775597523144704", height: 533 },
        { urn: "urn:li:share:7450343930094841857", height: 230 },
        { urn: "urn:li:share:7450341215465816064", height: 230 },
        { urn: "urn:li:share:7449663381029957632", height: 670 }
      ];

      var PER_PAGE = 3;
      // Cap the embed height so a post whose iframe is blocked (e.g. a browser
      // that blocks third-party cookies) shows a bounded, tidy box + fallback
      // link rather than a tall blank void. Shorter posts keep their own height.
      var MAX_EMBED_HEIGHT = 440;
      var totalPages = Math.max(1, Math.ceil(LINKEDIN_POSTS.length / PER_PAGE));
      var currentPage = 1;

      var grid = document.getElementById("linkedin-grid");
      var pagination = document.getElementById("linkedin-pagination");

      function renderPosts(page) {
        var start = (page - 1) * PER_PAGE;
        var slice = LINKEDIN_POSTS.slice(start, start + PER_PAGE);
        grid.innerHTML = "";
        slice.forEach(function (post) {
          var postUrl = "https://www.linkedin.com/feed/update/" + post.urn + "/";
          var embedHeight = Math.min(post.height, MAX_EMBED_HEIGHT);

          var cell = document.createElement("div");
          cell.className = "linkedin-cell";

          // Embed wrapper reserves a bounded height and holds a loading state
          // behind the iframe, so the area is never a blank collapsed void.
          var embed = document.createElement("div");
          embed.className = "linkedin-embed is-loading";
          embed.style.height = embedHeight + "px";

          var loading = document.createElement("div");
          loading.className = "linkedin-loading";
          loading.textContent = "Loading LinkedIn post…";
          embed.appendChild(loading);

          var iframe = document.createElement("iframe");
          iframe.src = "https://www.linkedin.com/embed/feed/update/" + post.urn + "?collapsed=1";
          iframe.height = embedHeight;
          iframe.width = "100%";
          iframe.frameBorder = "0";
          iframe.setAttribute("allowfullscreen", "");
          iframe.setAttribute("loading", "lazy");
          iframe.title = "Embedded LinkedIn post";
          iframe.addEventListener("load", function () {
            embed.classList.remove("is-loading");
          });
          embed.appendChild(iframe);
          cell.appendChild(embed);

          // Always-present fallback: if a browser blocks the embed
          // (e.g. third-party cookies disabled), this exact-URL link still works.
          var fallback = document.createElement("a");
          fallback.className = "linkedin-fallback";
          fallback.href = postUrl;
          fallback.target = "_blank";
          fallback.rel = "noopener noreferrer";
          fallback.textContent = "View this post on LinkedIn →";
          cell.appendChild(fallback);

          grid.appendChild(cell);
        });
      }

      function renderPagination() {
        pagination.innerHTML = "";

        var prev = document.createElement(currentPage === 1 ? "span" : "a");
        prev.textContent = "← Previous";
        if (currentPage === 1) {
          prev.className = "disabled";
          prev.setAttribute("aria-disabled", "true");
        } else {
          prev.href = "#linkedin-posts";
          prev.addEventListener("click", function (e) { e.preventDefault(); goTo(currentPage - 1); });
        }
        pagination.appendChild(prev);

        for (var i = 1; i <= totalPages; i++) {
          (function (page) {
            var el;
            if (page === currentPage) {
              el = document.createElement("span");
              el.className = "active";
              el.setAttribute("aria-current", "page");
            } else {
              el = document.createElement("a");
              el.href = "#linkedin-posts";
              el.addEventListener("click", function (e) { e.preventDefault(); goTo(page); });
            }
            el.textContent = String(page);
            pagination.appendChild(el);
          })(i);
        }

        var next = document.createElement(currentPage === totalPages ? "span" : "a");
        next.textContent = "Next →";
        if (currentPage === totalPages) {
          next.className = "disabled";
          next.setAttribute("aria-disabled", "true");
        } else {
          next.href = "#linkedin-posts";
          next.addEventListener("click", function (e) { e.preventDefault(); goTo(currentPage + 1); });
        }
        pagination.appendChild(next);
      }

      function goTo(page) {
        if (page < 1 || page > totalPages || page === currentPage) return;
        currentPage = page;
        renderPosts(currentPage);
        renderPagination();
      }

      renderPosts(currentPage);
      renderPagination();
    })();
  </script>
</section>
