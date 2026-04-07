(function () {
  var shells = Array.prototype.slice.call(document.querySelectorAll("[data-project-group]"));
  if (!shells.length) return;

  var firstShell = shells[0];
  var githubUser = firstShell.getAttribute("data-github-user") || "TrishamBP";
  var cacheKey = "projects_portfolio_v3";
  var cacheTtlMs = 1000 * 60 * 60 * 6;

  var fallbackImages = {
    nlp: "/assets/images/research/transformer-system.svg",
    cv: "/assets/objectdiscovery.jpeg",
    backend: "/assets/images/posts/cv-processing-architecture/end-to-end-system-architecture.png",
    applied: "/assets/images/research/gpu-runtime-profile.svg"
  };

  var categoryConfig = {
    advanced_ai_nlp: [
      { name: "custom_ner_classification_training", highlights: ["Multitask learning", "NER + classification"] },
      { name: "custom_ner_training", highlights: ["Domain-specific NER pipeline"] },
      { name: "LLM-Fine-Tuning-Supervised-FT-to-RLHF-LoRA-and-Multimodal", highlights: ["Supervised + RLHF + LoRA"] },
      { name: "Complete-LLM-Finetuning", highlights: ["End-to-end pipeline"] },
      { name: "llm-engineer-toolkit", highlights: ["LLM ecosystem tools"] },
      { name: "autoresearch", highlights: ["Agentic AI research system"] },
      { name: "text-summarization-transformer", highlights: ["Transformer summarization"] },
      { name: "neural-machine-translation-lstm-attention", highlights: ["Seq2seq with attention"] },
      { name: "comparative-analysis-rnn-ner", highlights: ["RNN NER comparative study"] },
      { name: "autocomplete-n-gram-language-model", highlights: ["N-gram language modeling"] },
      { name: "pos-tagging-hmm-viterbi-algorithm-nlp", highlights: ["HMM + Viterbi decoding"] },
      { name: "autocorrect-nlp-python", highlights: ["Probabilistic autocorrect"] },
      { name: "bigram-lm-pytorch", highlights: ["PyTorch language modeling"] }
    ],
    cv_deeplearning: [
      { name: "football_analysis_yolo", highlights: ["YOLO + OpenCV", "Event detection and tracking"] },
      { name: "face_detection_deep_learning", highlights: ["Face detection pipeline"] },
      { name: "food-vision-mini", highlights: ["Image classification"] },
      { name: "multiclass-image-classification", highlights: ["Multi-class CV modeling"] }
    ],
    applied_ai_systems: [
      { name: "drug-information-rag-system", highlights: ["FDA data (~50K docs)", "Multi-query retrieval"] },
      { name: "meeting-minutes-llm-transcriber", highlights: ["Meeting intelligence automation"] },
      { name: "llm_marketing_insight_scraper", highlights: ["Marketing signal extraction"] }
    ],
    backend_systems: [
      { name: "data-engineering", highlights: ["Data pipelines and processing"] },
      { name: "web-sockets", highlights: ["Real-time communication services"] },
      { name: "react-app-django-backend", highlights: ["Fullstack API integration"] },
      { name: "nestjs-blog", highlights: ["NestJS service architecture"] }
    ],
    masters: [
      {
        name: "1D-2D-Heat-Equation-Solver",
        displayName: "Heat Equation Solver",
        built: "Implemented numerical solvers for 1D and 2D heat equation simulation with boundary-condition handling and stability-aware discretization.",
        purpose: "Useful for understanding PDE-driven thermal systems and building rigorous numerical intuition for scientific computing workflows."
      },
      {
        name: "Wave-Equation-Solver",
        displayName: "Wave Equation Solver",
        built: "Built discrete solvers to model wave propagation, including time-stepping dynamics and visualized solution behavior over space-time grids.",
        purpose: "Useful for mastering transient system behavior and numerical stability in physically grounded simulation tasks."
      },
      {
        name: "Neural-Network-Logistic-Regression",
        displayName: "Neural Network Logistic Regression",
        built: "Implemented logistic regression and neural-network-based classification with gradient-based optimization and evaluation metrics.",
        purpose: "Useful for bridging statistical learning foundations with practical model training and performance analysis."
      },
      {
        name: "Shallow-Neural-Network",
        displayName: "Shallow Neural Network",
        built: "Developed shallow-network architectures from scratch, including forward pass, backpropagation, and parameter updates.",
        purpose: "Useful for internalizing core deep learning mechanics before scaling to larger multi-layer systems."
      },
      {
        name: "Genetic-Algorithm-TSP",
        displayName: "Genetic Algorithm TSP",
        built: "Created a genetic algorithm solution for the Traveling Salesman Problem with selection, crossover, mutation, and fitness optimization.",
        purpose: "Useful for exploring search-based optimization under combinatorial complexity and non-convex objective spaces."
      },
      {
        name: "Math-Engineering-Tools",
        displayName: "Math Engineering Tools",
        built: "Built practical mathematical engineering utilities for computation, analysis, and algorithmic problem solving.",
        purpose: "Useful for strengthening quantitative engineering workflows used across ML, optimization, and systems development."
      }
    ]
  };

  function status(shell, message) {
    if (!shell) return;
    shell.innerHTML = '<p class="projects-status">' + message + "</p>";
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
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (error) {
      return;
    }
  }

  function fetchJson(url, headers) {
    return fetch(url, { headers: headers || { Accept: "application/vnd.github+json" } }).then(function (res) {
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    });
  }

  function fetchReadme(owner, repo) {
    return fetch("https://api.github.com/repos/" + owner + "/" + repo + "/readme", {
      headers: { Accept: "application/vnd.github.raw+json" }
    }).then(function (res) {
      if (!res.ok) return "";
      return res.text();
    });
  }

  function titleizeRepoName(name) {
    return name
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function (ch) { return ch.toUpperCase(); })
      .replace(/\bLlm\b/g, "LLM")
      .replace(/\bNer\b/g, "NER")
      .replace(/\bRlhf\b/g, "RLHF")
      .replace(/\bApi\b/g, "API")
      .replace(/\bCv\b/g, "CV")
      .replace(/\bYolo\b/g, "YOLO");
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
    var blocks = [];
    var current = [];
    var inCode = false;

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i].trim();
      if (line.indexOf("```") === 0) {
        inCode = !inCode;
        continue;
      }
      if (inCode) continue;

      if (!line) {
        if (current.length) {
          blocks.push(current.join(" "));
          current = [];
        }
        continue;
      }
      if (/^#/.test(line) || /^!\[.*\]\(.*\)/.test(line) || /^\|.*\|$/.test(line)) continue;
      if (/^[-*+]\s+/.test(line)) continue;
      if (/^https?:\/\//i.test(line)) continue;

      current.push(stripMarkdown(line));
    }

    if (current.length) blocks.push(current.join(" "));
    var chosen = blocks.find(function (b) { return b.length > 90; }) || blocks[0] || "";
    return truncate(chosen, 240);
  }

  function detectCategory(sourceText) {
    var s = (sourceText || "").toLowerCase();
    if (/yolo|opencv|vision|image|face|detection|segmentation|cnn/.test(s)) return "cv";
    if (/backend|api|django|nestjs|socket|websocket|server|pipeline|data-engineering/.test(s)) return "backend";
    if (/rag|transcriber|agent|automation|system/.test(s)) return "applied";
    return "nlp";
  }

  function extractTechStack(repo, readme, highlights) {
    var source = [repo.name, repo.language || "", repo.description || "", readme || "", (highlights || []).join(" ")].join(" ").toLowerCase();
    var map = [
      { re: /python/, tag: "Python" },
      { re: /javascript/, tag: "JavaScript" },
      { re: /typescript/, tag: "TypeScript" },
      { re: /pytorch/, tag: "PyTorch" },
      { re: /tensorflow/, tag: "TensorFlow" },
      { re: /\bllm\b|transformer|gpt|lora|rlhf/, tag: "LLM" },
      { re: /ner|named entity/, tag: "NER" },
      { re: /\brag\b|retrieval/, tag: "RAG" },
      { re: /nlp|language model|viterbi|hmm/, tag: "NLP" },
      { re: /opencv/, tag: "OpenCV" },
      { re: /yolo/, tag: "YOLO" },
      { re: /vision|image|cnn/, tag: "Computer Vision" },
      { re: /fastapi|django|nestjs|express/, tag: "Backend" },
      { re: /websocket|socket/, tag: "WebSockets" },
      { re: /docker/, tag: "Docker" }
    ];
    var tags = [];
    map.forEach(function (item) {
      if (item.re.test(source) && tags.indexOf(item.tag) === -1) tags.push(item.tag);
    });
    if (repo.language && tags.indexOf(repo.language) === -1) tags.unshift(repo.language);
    return tags.slice(0, 6);
  }

  function resolveReadmeImage(repo, readme, fallbackType) {
    var fallback = fallbackImages[fallbackType] || fallbackImages.nlp;
    if (!readme) return fallback;
    var lines = readme.split(/\r?\n/);

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i].trim();
      var match = line.match(/!\[[^\]]*\]\(([^)]+)\)/);
      if (!match) continue;
      var raw = (match[1] || "").trim();
      if (!raw) continue;
      if (/badge|shields\.io/i.test(raw)) continue;
      if (!/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(raw) && !/^https?:\/\//i.test(raw)) continue;

      if (/^https?:\/\//i.test(raw)) return raw;
      if (/^data:/i.test(raw)) continue;

      var cleaned = raw.replace(/^\.\/+/, "").replace(/^\/+/, "");
      return "https://raw.githubusercontent.com/" + githubUser + "/" + repo.name + "/" + (repo.default_branch || "main") + "/" + cleaned;
    }
    return fallback;
  }

  function createCard(project, mode) {
    var card = document.createElement("article");
    card.className = "project-card";

    var image = document.createElement("img");
    image.className = "project-cover";
    image.src = project.image;
    image.alt = project.title + " visual";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", function () {
      image.src = fallbackImages[project.fallbackType] || fallbackImages.nlp;
    });
    card.appendChild(image);

    var title = document.createElement("h3");
    title.textContent = project.title;
    card.appendChild(title);

    if (mode === "masters") {
      var year = document.createElement("p");
      year.className = "project-year";
      year.textContent = "Year: " + project.year;
      card.appendChild(year);

      var built = document.createElement("p");
      built.className = "project-detail";
      built.innerHTML = "<strong>Built:</strong> " + project.built;
      card.appendChild(built);

      var purpose = document.createElement("p");
      purpose.className = "project-detail";
      purpose.innerHTML = "<strong>Purpose:</strong> " + project.purpose;
      card.appendChild(purpose);
    } else {
      var desc = document.createElement("p");
      desc.textContent = project.summary || "Repository with implementation details available on GitHub.";
      card.appendChild(desc);
    }

    if (project.highlights && project.highlights.length && mode !== "masters") {
      var highlights = document.createElement("ul");
      highlights.className = "project-highlights";
      project.highlights.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        highlights.appendChild(li);
      });
      card.appendChild(highlights);
    }

    if (project.tech && project.tech.length) {
      var tags = document.createElement("div");
      tags.className = "project-tags";
      project.tech.forEach(function (t) {
        var span = document.createElement("span");
        span.className = "project-tag";
        span.textContent = t;
        tags.appendChild(span);
      });
      card.appendChild(tags);
    }

    var link = document.createElement("a");
    link.className = "project-cta";
    link.href = project.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View on GitHub";
    card.appendChild(link);

    return card;
  }

  function renderGrid(shell, projects, mode, emptyMessage) {
    if (!shell) return;
    shell.innerHTML = "";
    if (!projects || !projects.length) {
      status(shell, emptyMessage);
      return;
    }
    var grid = document.createElement("div");
    grid.className = "projects-grid";
    projects.forEach(function (project) {
      grid.appendChild(createCard(project, mode));
    });
    shell.appendChild(grid);
  }

  function flattenConfiguredNames() {
    var names = [];
    Object.keys(categoryConfig).forEach(function (key) {
      categoryConfig[key].forEach(function (item) {
        names.push(item.name.toLowerCase());
      });
    });
    return names;
  }

  function buildAdditionalProjects(repos, configuredNames) {
    var patterns = /(nlp|ner|transformer|language-model|classification|regression|optimization|solver|experiment|machine-learning|deep-learning|ml|ai)/i;
    return repos
      .filter(function (repo) {
        var n = repo.name.toLowerCase();
        if (configuredNames.indexOf(n) !== -1) return false;
        var hay = (repo.name + " " + (repo.description || "")).toLowerCase();
        return patterns.test(hay);
      })
      .sort(function (a, b) {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(0, 12);
  }

  async function resolveProject(repo, configItem, forcedCategory) {
    var readme = await fetchReadme(githubUser, repo.name);
    var source = [repo.name, repo.description || "", readme].join(" ");
    var fallbackType = forcedCategory || detectCategory(source);

    return {
      name: repo.name,
      title: configItem && configItem.displayName ? configItem.displayName : titleizeRepoName(repo.name),
      summary: extractReadmeSummary(readme) || truncate(repo.description || "", 240),
      highlights: (configItem && configItem.highlights) || [],
      tech: extractTechStack(repo, readme, (configItem && configItem.highlights) || []),
      url: repo.html_url,
      year: new Date(repo.created_at).getFullYear(),
      built: configItem && configItem.built ? configItem.built : "",
      purpose: configItem && configItem.purpose ? configItem.purpose : "",
      image: resolveReadmeImage(repo, readme, fallbackType),
      fallbackType: fallbackType
    };
  }

  async function loadData() {
    shells.forEach(function (shell) {
      status(shell, "Loading curated GitHub projects...");
    });

    var cached = parseCached();
    if (cached) return cached;

    var repos = await fetchJson("https://api.github.com/users/" + githubUser + "/repos?per_page=100&sort=updated");
    repos = repos.filter(function (repo) { return !repo.fork; });

    var repoMap = {};
    repos.forEach(function (repo) { repoMap[repo.name.toLowerCase()] = repo; });

    var output = {};

    var configuredNames = flattenConfiguredNames();

    var categoryKeys = ["advanced_ai_nlp", "cv_deeplearning", "applied_ai_systems", "backend_systems", "masters"];
    for (var c = 0; c < categoryKeys.length; c += 1) {
      var category = categoryKeys[c];
      var items = categoryConfig[category] || [];
      var resolved = await Promise.all(
        items.map(async function (item) {
          var repo = repoMap[item.name.toLowerCase()];
          if (!repo) return null;
          var forcedCategory = category === "cv_deeplearning"
            ? "cv"
            : category === "backend_systems"
              ? "backend"
              : category === "applied_ai_systems"
                ? "applied"
                : "nlp";
          return resolveProject(repo, item, forcedCategory);
        })
      );
      output[category] = resolved.filter(Boolean);
    }

    var additionalRepos = buildAdditionalProjects(repos, configuredNames);
    output.additional_ai_systems = await Promise.all(
      additionalRepos.map(async function (repo) {
        return resolveProject(repo, null, detectCategory(repo.name + " " + (repo.description || "")));
      })
    );

    setCached(output);
    return output;
  }

  function render(data) {
    function shellFor(group) {
      return document.querySelector('[data-project-group="' + group + '"]');
    }
    var legacyCoreShell = shellFor("core");
    var hasStructuredSections =
      !!shellFor("advanced_ai_nlp") ||
      !!shellFor("cv_deeplearning") ||
      !!shellFor("applied_ai_systems") ||
      !!shellFor("backend_systems") ||
      !!shellFor("additional_ai_systems") ||
      !!shellFor("masters");

    if (hasStructuredSections) {
      renderGrid(
        shellFor("advanced_ai_nlp"),
        data.advanced_ai_nlp || [],
        "standard",
        "No Advanced AI / LLM / NLP projects found."
      );
      renderGrid(
        shellFor("cv_deeplearning"),
        data.cv_deeplearning || [],
        "standard",
        "No Computer Vision projects found."
      );
      renderGrid(
        shellFor("applied_ai_systems"),
        data.applied_ai_systems || [],
        "standard",
        "No Applied AI Systems projects found."
      );
      renderGrid(
        shellFor("backend_systems"),
        data.backend_systems || [],
        "standard",
        "No Backend / Systems projects found."
      );
      renderGrid(
        shellFor("additional_ai_systems"),
        data.additional_ai_systems || [],
        "standard",
        "No additional AI and systems projects found."
      );
      renderGrid(
        shellFor("masters"),
        data.masters || [],
        "masters",
        "No masters projects found."
      );
      return;
    }

    if (legacyCoreShell) {
      var featured = []
        .concat(data.advanced_ai_nlp || [])
        .concat(data.applied_ai_systems || [])
        .concat(data.cv_deeplearning || [])
        .slice(0, 8);
      renderGrid(legacyCoreShell, featured, "standard", "No featured projects found.");
    }
  }

  loadData()
    .then(render)
    .catch(function () {
      shells.forEach(function (shell) {
        status(shell, "Project feed is temporarily unavailable. Please refresh in a moment.");
      });
    });
})();
