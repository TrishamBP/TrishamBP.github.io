(function () {
  var coreShell = document.querySelector('[data-project-group="core"]') || document.querySelector(".projects-shell");
  var additionalShell = document.querySelector('[data-project-group="additional"]');
  var mastersShell = document.querySelector('[data-project-group="masters"]');
  if (!coreShell) return;

  var githubUser = coreShell.getAttribute("data-github-user") || "TrishamBP";
  var cacheKey = "curated_projects_v1";
  var cacheTtlMs = 1000 * 60 * 60 * 6;

  var projectGroups = {
    core: [
      {
        name: "custom_ner_classification_training",
        highlights: ["Multitask learning", "NER + classification"]
      },
      {
        name: "custom_ner_training",
        highlights: ["Domain-specific NER pipeline"]
      },
      {
        name: "LLM-Fine-Tuning-Supervised-FT-to-RLHF-LoRA-and-Multimodal",
        highlights: ["Supervised fine-tuning", "RLHF + LoRA"]
      },
      {
        name: "Complete-LLM-Finetuning",
        highlights: ["End-to-end fine-tuning pipeline"]
      },
      {
        name: "llm-engineer-toolkit",
        highlights: ["LLM ecosystem tools"]
      },
      {
        name: "drug-information-rag-system",
        highlights: ["FDA data (~50K docs)", "Multi-query retrieval"]
      },
      {
        name: "football_analysis_yolo",
        highlights: ["YOLO + OpenCV", "Event detection + tracking"]
      },
      {
        name: "autoresearch",
        highlights: ["Agentic AI research system"]
      }
    ],
    additional: [
      { name: "data-engineering", highlights: [] },
      { name: "web-sockets", highlights: [] },
      { name: "meeting-minutes-llm-transcriber", highlights: [] },
      { name: "llm_marketing_insight_scraper", highlights: [] }
    ],
    masters: [
      { name: "1D-2D-Heat-Equation-Solver", highlights: [] },
      { name: "Wave-Equation-Solver", highlights: [] },
      { name: "Neural-Network-Logistic-Regression", highlights: [] },
      { name: "Shallow-Neural-Network", highlights: [] },
      { name: "Genetic-Algorithm-TSP", highlights: [] },
      { name: "Math-Engineering-Tools", highlights: [] }
    ]
  };

  function fetchJson(url, headers) {
    return fetch(url, {
      headers: headers || { Accept: "application/vnd.github+json" }
    }).then(function (res) {
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    });
  }

  function fetchReadmeRaw(owner, repo) {
    return fetch("https://api.github.com/repos/" + owner + "/" + repo + "/readme", {
      headers: { Accept: "application/vnd.github.raw+json" }
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
      if (!parsed || !parsed.ts || !parsed.data) return null;
      if (Date.now() - parsed.ts > cacheTtlMs) return null;
      return parsed.data;
    } catch (error) {
      return null;
    }
  }

  function setCached(data) {
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          ts: Date.now(),
          data: data
        })
      );
    } catch (error) {
      return;
    }
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
      .replace(/\bRlhf\b/g, "RLHF")
      .replace(/\bYolo\b/g, "YOLO")
      .replace(/\bApi\b/g, "API")
      .replace(/\bRag\b/g, "RAG");
  }

  function truncate(text, maxLen) {
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1).trimEnd() + "...";
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
    var paragraphLines = [];
    var inCode = false;

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i].trim();
      if (!line) {
        if (paragraphLines.length > 0) break;
        continue;
      }
      if (line.indexOf("```") === 0) {
        inCode = !inCode;
        continue;
      }
      if (inCode) continue;
      if (/^#/.test(line)) continue;
      if (/^!\[.*\]\(.*\)/.test(line)) continue;
      if (/^\[!\[.*\]\(.*\)\]\(.*\)/.test(line)) continue;
      if (/^https?:\/\//i.test(line)) continue;
      if (/^\|.*\|$/.test(line)) continue;
      if (/^[-*+]\s+/.test(line)) continue;
      paragraphLines.push(stripMarkdown(line));
    }

    return truncate(paragraphLines.join(" "), 260);
  }

  function extractTechStack(repo, readme, highlights) {
    var source = [repo.name, repo.language || "", repo.description || "", readme || "", (highlights || []).join(" ")].join(" ").toLowerCase();
    var map = [
      { re: /python/, tag: "Python" },
      { re: /javascript/, tag: "JavaScript" },
      { re: /typescript/, tag: "TypeScript" },
      { re: /pytorch/, tag: "PyTorch" },
      { re: /tensorflow/, tag: "TensorFlow" },
      { re: /\bllm\b|gpt|transformer/, tag: "LLM" },
      { re: /ner|named entity/, tag: "NER" },
      { re: /classification/, tag: "Classification" },
      { re: /\brag\b|retrieval/, tag: "RAG" },
      { re: /lora/, tag: "LoRA" },
      { re: /rlhf/, tag: "RLHF" },
      { re: /opencv/, tag: "OpenCV" },
      { re: /yolo/, tag: "YOLO" },
      { re: /fastapi/, tag: "FastAPI" },
      { re: /docker/, tag: "Docker" },
      { re: /websocket|web-sockets/, tag: "WebSockets" }
    ];
    var tags = [];

    map.forEach(function (item) {
      if (item.re.test(source) && tags.indexOf(item.tag) === -1) tags.push(item.tag);
    });
    if (repo.language && tags.indexOf(repo.language) === -1) tags.unshift(repo.language);

    return tags.slice(0, 6);
  }

  function buildProjectCard(project, groupName) {
    var article = document.createElement("article");
    article.className = "project-card";

    var imagePlaceholder = document.createElement("div");
    imagePlaceholder.className = "project-image-placeholder";
    imagePlaceholder.textContent = "Image placeholder (add project screenshot later)";
    article.appendChild(imagePlaceholder);

    var title = document.createElement("h3");
    title.textContent = titleizeRepoName(project.repo.name);
    article.appendChild(title);

    var description = document.createElement("p");
    description.textContent =
      project.summary ||
      project.repo.description ||
      "Repository with implementation details available on GitHub.";
    article.appendChild(description);

    if (groupName === "masters" && project.repo.created_at) {
      var year = document.createElement("p");
      year.className = "project-year";
      year.textContent = "Year: " + new Date(project.repo.created_at).getFullYear();
      article.appendChild(year);
    }

    if (project.highlights && project.highlights.length) {
      var highlights = document.createElement("ul");
      highlights.className = "project-highlights";
      project.highlights.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        highlights.appendChild(li);
      });
      article.appendChild(highlights);
    }

    if (project.tech && project.tech.length) {
      var tagsWrap = document.createElement("div");
      tagsWrap.className = "project-tags";
      project.tech.forEach(function (tag) {
        var chip = document.createElement("span");
        chip.className = "project-tag";
        chip.textContent = tag;
        tagsWrap.appendChild(chip);
      });
      article.appendChild(tagsWrap);
    }

    var link = document.createElement("a");
    link.className = "project-cta";
    link.href = project.repo.html_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View on GitHub";
    article.appendChild(link);

    return article;
  }

  function renderStatus(shell, message) {
    shell.innerHTML = '<p class="projects-status">' + message + "</p>";
  }

  function renderCoreCarousel(projects) {
    coreShell.innerHTML = "";
    if (!projects.length) {
      renderStatus(coreShell, "No curated core projects were found.");
      return;
    }

    var prev = document.createElement("button");
    prev.className = "carousel-arrow";
    prev.type = "button";
    prev.setAttribute("aria-label", "Previous projects");
    prev.textContent = "<";

    var next = document.createElement("button");
    next.className = "carousel-arrow";
    next.type = "button";
    next.setAttribute("aria-label", "Next projects");
    next.textContent = ">";

    var carousel = document.createElement("div");
    carousel.className = "projects-carousel";
    carousel.setAttribute("aria-label", "Core AI and backend projects");

    projects.forEach(function (project) {
      carousel.appendChild(buildProjectCard(project, "core"));
    });

    var scrollByAmount = function () {
      return Math.max(320, Math.floor(carousel.clientWidth * 0.85));
    };
    prev.addEventListener("click", function () {
      carousel.scrollBy({ left: -scrollByAmount(), behavior: "smooth" });
    });
    next.addEventListener("click", function () {
      carousel.scrollBy({ left: scrollByAmount(), behavior: "smooth" });
    });

    coreShell.appendChild(prev);
    coreShell.appendChild(carousel);
    coreShell.appendChild(next);
  }

  function renderGrid(shell, projects, groupName, emptyMessage) {
    shell.innerHTML = "";
    if (!projects.length) {
      renderStatus(shell, emptyMessage);
      return;
    }

    var grid = document.createElement("div");
    grid.className = "projects-grid";

    projects.forEach(function (project) {
      grid.appendChild(buildProjectCard(project, groupName));
    });

    shell.appendChild(grid);
  }

  async function loadCuratedProjects() {
    renderStatus(coreShell, "Loading curated GitHub projects...");
    if (additionalShell) renderStatus(additionalShell, "Loading curated GitHub projects...");
    if (mastersShell) renderStatus(mastersShell, "Loading curated GitHub projects...");

    var cached = parseCached();
    if (cached) {
      renderCoreCarousel(cached.core || []);
      if (additionalShell) {
        renderGrid(additionalShell, cached.additional || [], "additional", "No additional systems projects were found.");
      }
      if (mastersShell) {
        renderGrid(mastersShell, cached.masters || [], "masters", "No masters projects were found.");
      }
      return;
    }

    var repos = await fetchJson(
      "https://api.github.com/users/" + githubUser + "/repos?per_page=100&sort=updated"
    );

    var repoMap = {};
    repos.forEach(function (repo) {
      repoMap[repo.name.toLowerCase()] = repo;
    });

    var allTargets = []
      .concat(projectGroups.core)
      .concat(projectGroups.additional)
      .concat(projectGroups.masters);

    var resolvedProjects = await Promise.all(
      allTargets.map(async function (target) {
        var repo = repoMap[target.name.toLowerCase()];
        if (!repo) return null;

        var readme = await fetchReadmeRaw(githubUser, repo.name);
        var summary = extractReadmeSummary(readme);

        return {
          name: target.name,
          repo: repo,
          readme: readme,
          summary: summary || truncate(repo.description || "", 220),
          highlights: target.highlights || [],
          tech: extractTechStack(repo, readme, target.highlights)
        };
      })
    );

    var byName = {};
    resolvedProjects.filter(Boolean).forEach(function (item) {
      byName[item.name.toLowerCase()] = item;
    });

    var grouped = {
      core: projectGroups.core
        .map(function (item) {
          return byName[item.name.toLowerCase()] || null;
        })
        .filter(Boolean),
      additional: projectGroups.additional
        .map(function (item) {
          return byName[item.name.toLowerCase()] || null;
        })
        .filter(Boolean),
      masters: projectGroups.masters
        .map(function (item) {
          return byName[item.name.toLowerCase()] || null;
        })
        .filter(Boolean)
    };

    setCached(grouped);

    renderCoreCarousel(grouped.core);
    if (additionalShell) {
      renderGrid(additionalShell, grouped.additional, "additional", "No additional systems projects were found.");
    }
    if (mastersShell) {
      renderGrid(mastersShell, grouped.masters, "masters", "No masters projects were found.");
    }
  }

  loadCuratedProjects().catch(function () {
    renderStatus(coreShell, "Project feed is temporarily unavailable. Please refresh in a moment.");
    if (additionalShell) {
      renderStatus(additionalShell, "Project feed is temporarily unavailable. Please refresh in a moment.");
    }
    if (mastersShell) {
      renderStatus(mastersShell, "Project feed is temporarily unavailable. Please refresh in a moment.");
    }
  });
})();
