(function () {
  var shell = document.querySelector(".projects-shell");
  if (!shell) return;

  var githubUser = shell.getAttribute("data-github-user") || "TrishamBP";
  var cacheKey = "projects_carousel_cache_v2";
  var cacheTtlMs = 1000 * 60 * 30;

  var prioritySpecs = [
    {
      key: "custom-ner",
      priority: 1,
      requestedTitle: "Custom NER Training System",
      patterns: [/custom[_-]?ner/i, /ner.*classification.*training/i],
    },
    {
      key: "llm-finetune-pipeline",
      priority: 2,
      requestedTitle: "LLM Fine-Tuning Pipeline",
      patterns: [/llm.*fine[- ]?tuning/i, /fine[- ]?tuning/i, /lora/i, /rlhf/i],
    },
    {
      key: "complete-llm-finetune",
      priority: 3,
      requestedTitle: "Complete LLM Fine-Tuning System",
      patterns: [/complete.*llm/i, /supervised.*ft/i, /multimodal/i],
    },
    {
      key: "agentic-ai",
      priority: 4,
      requestedTitle: "Agentic AI Systems",
      patterns: [/autonomous/i, /agentic/i, /agent/i, /deal[-_ ]hunter/i],
    },
    {
      key: "drug-rag",
      priority: 5,
      requestedTitle: "Drug Information RAG System",
      patterns: [/drug.*rag/i, /rag.*drug/i, /drug[-_ ]information/i],
    },
    {
      key: "football-api",
      priority: 6,
      requestedTitle: "Football API",
      patterns: [/football.*api/i, /soccer.*api/i, /football/i, /soccer/i],
    },
  ];

  function fetchJson(url, headers) {
    return fetch(url, {
      headers: headers || { Accept: "application/vnd.github+json" },
    }).then(function (res) {
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    });
  }

  function fetchReadmeRaw(owner, repo) {
    return fetch("https://api.github.com/repos/" + owner + "/" + repo + "/readme", {
      headers: { Accept: "application/vnd.github.raw+json" },
    }).then(function (res) {
      if (!res.ok) return "";
      return res.text();
    });
  }

  function parseCached() {
    try {
      var raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.ts || !Array.isArray(parsed.repos)) return null;
      if (Date.now() - parsed.ts > cacheTtlMs) return null;
      return parsed.repos;
    } catch (err) {
      return null;
    }
  }

  function setCached(repos) {
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          ts: Date.now(),
          repos: repos,
        })
      );
    } catch (err) {
      return;
    }
  }

  function readmeTextForMatch(repo) {
    return [repo.name, repo.description || "", repo.readme || ""].join("\n").toLowerCase();
  }

  function scoreForSpec(repo, spec) {
    var hay = readmeTextForMatch(repo);
    var score = 0;
    spec.patterns.forEach(function (re) {
      if (re.test(hay)) score += 4;
    });
    if (repo.name.toLowerCase().indexOf(spec.key.replace(/-/g, "_")) >= 0) score += 3;
    score += Math.min(repo.stargazers_count || 0, 20) * 0.05;
    return score;
  }

  function pickPriorityRepos(repos) {
    var used = {};
    var selected = [];

    prioritySpecs.forEach(function (spec) {
      var candidates = repos
        .filter(function (repo) {
          if (used[repo.full_name]) return false;
          var score = scoreForSpec(repo, spec);
          return score > 0;
        })
        .map(function (repo) {
          return { repo: repo, score: scoreForSpec(repo, spec) };
        })
        .sort(function (a, b) {
          if (b.score !== a.score) return b.score - a.score;
          return (b.repo.stargazers_count || 0) - (a.repo.stargazers_count || 0);
        });

      if (candidates.length === 0) return;

      var top = candidates[0].repo;
      used[top.full_name] = true;
      selected.push({
        specKey: spec.key,
        requestedTitle: spec.requestedTitle,
        priorityIndex: spec.priority,
        repo: top,
      });
    });

    return selected;
  }

  function titleizeRepoName(name) {
    return name
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function (ch) {
        return ch.toUpperCase();
      })
      .replace(/\bLlm\b/g, "LLM")
      .replace(/\bNer\b/g, "NER")
      .replace(/\bApi\b/g, "API")
      .replace(/\bRag\b/g, "RAG")
      .replace(/\bYolo\b/g, "YOLO");
  }

  function truncate(text, maxLen) {
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1).trimEnd() + "\u2026";
  }

  function stripMarkdown(line) {
    return line
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/^[-*+]\s+/, "")
      .trim();
  }

  function extractReadmeSummary(readme) {
    if (!readme) return "";
    var lines = readme.split(/\r?\n/);
    var blocks = [];
    var current = [];
    var inCode = false;

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (line.startsWith("```")) {
        inCode = !inCode;
        return;
      }
      if (inCode) return;
      if (!line) {
        if (current.length > 0) {
          blocks.push(current.join(" "));
          current = [];
        }
        return;
      }
      if (/^#/.test(line)) return;
      if (/^!\[.*\]\(.*\)/.test(line)) return;
      if (/^\[!\[.*\]\(.*\)\]\(.*\)/.test(line)) return;
      if (/^\|.*\|$/.test(line)) return;
      if (/^[-*+]\s+/.test(line)) return;
      if (/^https?:\/\//i.test(line)) return;
      current.push(stripMarkdown(line));
    });

    if (current.length > 0) blocks.push(current.join(" "));

    var picked = blocks.find(function (b) {
      return b.length >= 90;
    });

    return picked ? truncate(picked, 250) : "";
  }

  function extractFeatureBullets(readme) {
    if (!readme) return [];
    var lines = readme.split(/\r?\n/);
    var inSection = false;
    var bullets = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^#{1,6}\s+/.test(line)) {
        inSection = /feature|capabilit|highlights?/i.test(line);
        if (inSection) continue;
        if (bullets.length) break;
      }
      if (!inSection) continue;
      if (/^[-*+]\s+/.test(line)) {
        bullets.push(truncate(stripMarkdown(line), 120));
      }
      if (bullets.length >= 2) break;
    }
    return bullets;
  }

  function extractTags(repo) {
    var source = [repo.name, repo.description || "", repo.readme || "", repo.language || ""]
      .join(" ")
      .toLowerCase();
    var tags = [];

    var map = [
      { re: /ner|named entity/, tag: "NER" },
      { re: /llm|gpt|openai|llama/, tag: "LLM" },
      { re: /\brag\b|retrieval/, tag: "RAG" },
      { re: /agent|agentic|autonomous/, tag: "Agents" },
      { re: /api|fastapi|express|flask|rest/, tag: "API" },
      { re: /backend|server|service|microservice/, tag: "Backend" },
      { re: /opencv|yolo|vision|image/, tag: "Computer Vision" },
      { re: /pytorch|tensorflow|transformer|fine-tuning|rlhf|lora/, tag: "Deep Learning" },
    ];

    map.forEach(function (m) {
      if (m.re.test(source) && tags.indexOf(m.tag) === -1) tags.push(m.tag);
    });

    if (repo.language && tags.indexOf(repo.language) === -1) {
      tags.push(repo.language);
    }

    return tags.slice(0, 5);
  }

  function resolveImageUrl(owner, repoName, branch, rawUrl) {
    if (!rawUrl) return "";
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
    if (/^data:/i.test(rawUrl)) return "";

    var clean = rawUrl.replace(/^\.\/+/, "").replace(/^\/+/, "");
    return (
      "https://raw.githubusercontent.com/" +
      owner +
      "/" +
      repoName +
      "/" +
      branch +
      "/" +
      clean
    );
  }

  function extractReadmeImage(repo) {
    var readme = repo.readme || "";
    if (!readme) return "";

    var lines = readme.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var match = line.match(/!\[[^\]]*\]\(([^)]+)\)/);
      if (!match) continue;
      var url = match[1].trim();
      if (/shields\.io|badge|github\.com\/.*\/actions/i.test(url)) continue;
      if (!/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url) && !/^https?:\/\//i.test(url)) continue;
      return resolveImageUrl(githubUser, repo.name, repo.default_branch || "main", url);
    }
    return "";
  }

  function relativeUpdated(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    var ms = Date.now() - d.getTime();
    var days = Math.floor(ms / 86400000);
    if (days <= 0) return "Updated today";
    if (days === 1) return "Updated 1 day ago";
    if (days < 30) return "Updated " + days + " days ago";
    var months = Math.floor(days / 30);
    if (months === 1) return "Updated 1 month ago";
    if (months < 12) return "Updated " + months + " months ago";
    var years = Math.floor(months / 12);
    return "Updated " + years + (years === 1 ? " year ago" : " years ago");
  }

  function renderStatus(message) {
    shell.innerHTML = '<p class="projects-status">' + message + "</p>";
  }

  function buildCard(project) {
    var repo = project.repo;
    var title = titleizeRepoName(repo.name);
    var stars = repo.stargazers_count || 0;
    var tags = extractTags(repo);

    var card = document.createElement("article");
    card.className = "project-card";

    var imageUrl = extractReadmeImage(repo);
    if (imageUrl) {
      var img = document.createElement("img");
      img.className = "project-cover";
      img.src = imageUrl;
      img.alt = title + " README preview";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", function () {
        img.remove();
      });
      card.appendChild(img);
    }

    var titleEl = document.createElement("h3");
    titleEl.textContent = title;
    card.appendChild(titleEl);

    var desc = extractReadmeSummary(repo.readme);
    if (!desc) return null;

    var descEl = document.createElement("p");
    var featureBullets = extractFeatureBullets(repo.readme);
    if (featureBullets.length) {
      descEl.textContent = desc + " Key focus: " + featureBullets.join(" | ");
    } else {
      descEl.textContent = desc;
    }
    card.appendChild(descEl);

    if (tags.length) {
      var tagsWrap = document.createElement("div");
      tagsWrap.className = "project-tags";
      tags.forEach(function (tag) {
        var chip = document.createElement("span");
        chip.className = "project-tag";
        chip.textContent = tag;
        tagsWrap.appendChild(chip);
      });
      card.appendChild(tagsWrap);
    }

    var meta = document.createElement("div");
    meta.className = "project-repo-meta";
    meta.innerHTML =
      '<span class="project-stars" aria-label="GitHub stars">\u2605 ' +
      stars +
      "</span>" +
      '<span class="project-updated">' +
      relativeUpdated(repo.updated_at) +
      "</span>";
    card.appendChild(meta);

    var link = document.createElement("a");
    link.className = "project-cta";
    link.href = repo.html_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View on GitHub";
    card.appendChild(link);

    return card;
  }

  function renderCarousel(projects) {
    if (!projects.length) {
      renderStatus("No qualifying AI/backend repositories found with readable README content.");
      return;
    }

    shell.innerHTML = "";

    var prev = document.createElement("button");
    prev.className = "carousel-arrow";
    prev.type = "button";
    prev.setAttribute("aria-label", "Previous projects");
    prev.textContent = "\u2190";

    var next = document.createElement("button");
    next.className = "carousel-arrow";
    next.type = "button";
    next.setAttribute("aria-label", "Next projects");
    next.textContent = "\u2192";

    var carousel = document.createElement("div");
    carousel.className = "projects-carousel";
    carousel.setAttribute("aria-label", "AI systems project cards");

    projects.forEach(function (project) {
      var card = buildCard(project);
      if (card) carousel.appendChild(card);
    });

    if (!carousel.children.length) {
      renderStatus("No qualifying project cards could be built from repository README content.");
      return;
    }

    var scrollByAmount = function () {
      return Math.max(320, Math.floor(carousel.clientWidth * 0.85));
    };

    prev.addEventListener("click", function () {
      carousel.scrollBy({ left: -scrollByAmount(), behavior: "smooth" });
    });
    next.addEventListener("click", function () {
      carousel.scrollBy({ left: scrollByAmount(), behavior: "smooth" });
    });

    shell.appendChild(prev);
    shell.appendChild(carousel);
    shell.appendChild(next);
  }

  function sortSelectedProjects(projects) {
    return projects.sort(function (a, b) {
      var starsA = a.repo.stargazers_count || 0;
      var starsB = b.repo.stargazers_count || 0;
      var similar = Math.abs(starsA - starsB) <= 1;
      if (similar) return a.priorityIndex - b.priorityIndex;
      return starsB - starsA;
    });
  }

  async function loadProjects() {
    renderStatus("Loading real GitHub projects...");

    var repos = parseCached();
    if (!repos) {
      repos = await fetchJson(
        "https://api.github.com/users/" + githubUser + "/repos?per_page=100&sort=updated"
      );
      repos = repos.filter(function (repo) {
        return !repo.fork;
      });
      setCached(repos);
    }

    var selected = pickPriorityRepos(repos);
    if (!selected.length) {
      renderStatus("No matching repositories found for the current priority list.");
      return;
    }

    await Promise.all(
      selected.map(async function (entry) {
        entry.repo.readme = await fetchReadmeRaw(githubUser, entry.repo.name);
      })
    );

    selected = selected.filter(function (entry) {
      return extractReadmeSummary(entry.repo.readme).length > 0;
    });

    renderCarousel(sortSelectedProjects(selected));
  }

  loadProjects().catch(function () {
    renderStatus("Project feed is temporarily unavailable. Please refresh in a moment.");
  });
})();
