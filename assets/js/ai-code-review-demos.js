/* AI code review figures for the LinkedIn engineering-at-scale post.
   Mounts into <figure class="acr-demo" data-acr="...">:

     two-steps    write -> review -> merge, the two-step loop
     pr-path      the five steps from opening a PR to merging it
     agent-loop   a coding agent implementing, testing, iterating, opening a PR
     bottleneck   queue simulation: PR arrivals vs fixed human review capacity
     automation   full vs partial automation (mode tabs)
     properties   grounded / high-signal / codebase-aware / timely, bad vs good

   All scenarios and numbers are illustrative, not LinkedIn data. Respects
   prefers-reduced-motion (no autoplay, no transitions). */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function onVisible(root, fn) {
    if (reduce || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { fn(); io.disconnect(); } });
    }, { threshold: 0.45 });
    io.observe(root);
  }

  function controls(root, h) {
    var bar = el("div", "acr-controls");
    function btn(label, aria, fn) {
      var b = el("button", null, label);
      b.type = "button";
      b.setAttribute("aria-label", aria);
      b.addEventListener("click", fn);
      bar.appendChild(b);
      return b;
    }
    var play = btn("▶ Play", "Play", h.toggle);
    btn("Next step ▶", "Next step", h.next);
    btn("↺ Reset", "Reset", h.reset);
    root.appendChild(bar);
    return function (playing) {
      play.textContent = playing ? "❚❚ Pause" : "▶ Play";
      play.setAttribute("aria-label", playing ? "Pause" : "Play");
    };
  }

  /* ---------------------------------------------------------------------------
     Generic stepper: a row of nodes, a console panel and a narrated phase.
     Each step: { node, tag, text, clear?, add: [[cls, text], ...] }
     ------------------------------------------------------------------------ */
  function stepper(root, modes) {
    var mode = 0, idx = -1, timer = null, playing = false;
    var tabs, nodesEl, panel, tagEl, textEl, setPlay, counter;

    root.innerHTML = "";

    if (modes.length > 1) {
      tabs = el("div", "acr-tabs");
      tabs.setAttribute("role", "tablist");
      modes.forEach(function (m, i) {
        var t = el("button", "acr-tab", m.name);
        t.type = "button";
        t.setAttribute("role", "tab");
        t.addEventListener("click", function () { stop(); mode = i; build(); });
        tabs.appendChild(t);
      });
      root.appendChild(tabs);
    }

    nodesEl = el("div", "acr-nodes");
    root.appendChild(nodesEl);

    panel = el("div", "acr-panel");
    panel.setAttribute("aria-hidden", "true");
    root.appendChild(panel);

    var phase = el("div", "acr-phase");
    phase.setAttribute("aria-live", "polite");
    tagEl = el("span", "acr-phase-tag");
    textEl = el("span");
    counter = el("span", "acr-count");
    phase.appendChild(tagEl);
    phase.appendChild(textEl);
    root.appendChild(phase);
    root.appendChild(counter);

    setPlay = controls(root, { toggle: function () { playing ? stop() : play(); }, next: function () { stop(); advance(); }, reset: function () { stop(); build(); } });

    function cur() { return modes[mode]; }

    function build() {
      idx = -1;
      if (tabs) {
        Array.prototype.forEach.call(tabs.children, function (t, i) {
          t.classList.toggle("is-on", i === mode);
          t.setAttribute("aria-selected", i === mode ? "true" : "false");
        });
      }
      nodesEl.innerHTML = "";
      cur().nodes.forEach(function (n, i) {
        if (i) nodesEl.appendChild(el("span", "acr-arrow", "→"));
        var d = el("div", "acr-node" + (n.kind ? " is-" + n.kind : ""));
        d.appendChild(el("b", null, n.label));
        if (n.sub) d.appendChild(el("small", null, n.sub));
        nodesEl.appendChild(d);
      });
      panel.innerHTML = "";
      panel.appendChild(el("div", "acr-line is-dim", cur().idle || "waiting…"));
      tagEl.textContent = "ready";
      textEl.textContent = cur().intro || "Press Play, or step through it.";
      counter.textContent = "step 0 / " + cur().steps.length;
    }

    function advance() {
      var steps = cur().steps;
      if (idx >= steps.length - 1) { build(); return; }
      idx += 1;
      var s = steps[idx];
      var nodes = nodesEl.querySelectorAll(".acr-node");
      Array.prototype.forEach.call(nodes, function (n, i) {
        n.classList.toggle("is-active", i === s.node);
        n.classList.toggle("is-done", i < s.node);
      });
      if (s.clear || idx === 0) panel.innerHTML = "";
      (s.add || []).forEach(function (l, k) {
        var line = el("div", "acr-line " + (l[0] || ""), l[1]);
        if (!reduce) {
          line.classList.add("is-new");
          line.style.transitionDelay = (k * 120) + "ms";
        }
        panel.appendChild(line);
        if (!reduce) { line.getBoundingClientRect(); line.classList.remove("is-new"); }
      });
      while (panel.children.length > 9) panel.removeChild(panel.firstChild);
      tagEl.textContent = s.tag;
      textEl.textContent = s.text;
      counter.textContent = "step " + (idx + 1) + " / " + steps.length;
    }

    function play() {
      playing = true;
      setPlay(true);
      var tick = function () {
        var last = idx >= cur().steps.length - 1;
        advance();
        timer = setTimeout(tick, last ? 1400 : (idx >= cur().steps.length - 1 ? 3800 : 2400));
      };
      tick();
    }

    function stop() {
      playing = false;
      setPlay(false);
      clearTimeout(timer);
    }

    build();
    onVisible(root, play);
  }

  var SCENARIOS = {
    "two-steps": [{
      intro: "A change goes through two steps: someone writes it, someone else reviews it.",
      idle: "main is clean, no open changes",
      nodes: [
        { label: "Write", sub: "author", kind: "human" },
        { label: "Review", sub: "other engineers", kind: "human" },
        { label: "Merge", sub: "main branch" }
      ],
      steps: [
        { node: 0, tag: "write", text: "The author makes the change on a branch.", add: [
          ["is-cmd", "$ git switch -c fix/profile-timeout"],
          ["is-add", "+  resp = client.get(url, timeout=2)"]
        ] },
        { node: 1, tag: "review", text: "Another engineer reads the diff and asks a question.", add: [
          ["is-human", "reviewer · line 14: what does the caller see when this times out?"]
        ] },
        { node: 0, tag: "revise", text: "The author answers with code, not just a reply.", add: [
          ["is-add", "+  except Timeout: return cached_profile(member_id)"]
        ] },
        { node: 1, tag: "approve", text: "The reviewer is satisfied and approves.", add: [
          ["is-ok", "✓ approved by reviewer"]
        ] },
        { node: 2, tag: "merge", text: "The change lands in the main codebase.", add: [
          ["is-ok", "⇢ merged into main"]
        ] }
      ]
    }],

    "pr-path": [{
      intro: "The life of one pull request, from opening to merge.",
      idle: "no pull request yet",
      nodes: [
        { label: "1 · Open", sub: "author" },
        { label: "2 · Notify + CI", sub: "code host" },
        { label: "3 · Comment", sub: "reviewer", kind: "human" },
        { label: "4 · Fix", sub: "author" },
        { label: "5 · Approve", sub: "reviewer → merge", kind: "human" }
      ],
      steps: [
        { node: 0, tag: "open", text: "The author opens a PR from the branch with the change.", add: [
          ["is-cmd", "PR #4812  fix/profile-cache → main"],
          ["is-dim", "3 files changed   +48  −6"]
        ] },
        { node: 1, tag: "notify", text: "The code host requests reviewers and starts CI.", add: [
          ["is-dim", "review requested: reviewer-a, reviewer-b"],
          ["is-run", "CI ▸ lint          ✓ passed"],
          ["is-run", "CI ▸ unit tests    ✓ 412 passed"],
          ["is-run", "CI ▸ build         ✓ passed"]
        ] },
        { node: 2, tag: "comment", text: "CI is green, but a reviewer finds a bug that no test covers.", add: [
          ["is-human", "reviewer-a · profile_client.py:15  an error body gets cached here, check the status first"]
        ] },
        { node: 3, tag: "fix", text: "The author pushes a fix, CI re-runs, the reviewer looks again.", add: [
          ["is-add", "+  if resp.ok: cache.set(member_id, resp.json(), ttl=PROFILE_TTL)"],
          ["is-run", "CI ▸ re-run        ✓ all checks passed"]
        ] },
        { node: 4, tag: "merge", text: "The reviewer approves and the PR merges.", add: [
          ["is-ok", "✓ approved by reviewer-a"],
          ["is-ok", "⇢ squashed and merged into main"]
        ] }
      ]
    }],

    "agent-loop": [{
      intro: "A coding agent gets a task and works until its own tests pass.",
      idle: "task queue: 1 item",
      nodes: [
        { label: "Implement", sub: "agent", kind: "ai" },
        { label: "Write tests", sub: "agent", kind: "ai" },
        { label: "Run tests", sub: "agent", kind: "ai" },
        { label: "Open PR", sub: "agent", kind: "ai" },
        { label: "Review", sub: "humans", kind: "human" }
      ],
      steps: [
        { node: 0, tag: "implement", text: "The agent reads the task and the code around it, then writes the change.", add: [
          ["is-cmd", "task: retry profile fetches on 503, max 3 attempts"],
          ["is-add", "+  @retry(on=ServiceUnavailable, attempts=3, backoff=0.2)"]
        ] },
        { node: 1, tag: "tests", text: "It writes tests for the new behaviour.", add: [
          ["is-add", "+  def test_retries_three_times_on_503(): ..."],
          ["is-add", "+  def test_no_retry_on_404(): ..."]
        ] },
        { node: 2, tag: "run", text: "The first run fails. The agent reads the error output.", add: [
          ["is-bad", "✗ test_no_retry_on_404  expected 1 call, got 3"]
        ] },
        { node: 0, tag: "iterate", text: "It narrows the retry condition and tries again.", add: [
          ["is-add", "+  @retry(on=ServiceUnavailable, attempts=3, backoff=0.2, retry_if=is_5xx)"]
        ] },
        { node: 2, tag: "run", text: "All tests pass.", add: [
          ["is-ok", "✓ 2 new tests passed · 412 existing passed"]
        ] },
        { node: 3, tag: "open PR", text: "The agent opens a PR. Writing took minutes, not days.", add: [
          ["is-cmd", "PR #4813 opened by coding-agent"]
        ] },
        { node: 4, tag: "waiting", text: "And then the PR waits. Every reviewer's queue is already full.", add: [
          ["is-wait", "⏳ waiting for review · 7 PRs ahead in reviewer-a's queue"]
        ] }
      ]
    }],

    "automation": [
      {
        name: "Partial automation",
        intro: "The AI reviews first. A human still approves.",
        idle: "PR #4813 ready",
        nodes: [
          { label: "PR opened", sub: "coding agent", kind: "ai" },
          { label: "AI first pass", sub: "AI reviewer", kind: "ai" },
          { label: "Fixes", sub: "coding agent", kind: "ai" },
          { label: "Approve", sub: "human", kind: "human" },
          { label: "Merge" }
        ],
        steps: [
          { node: 0, tag: "open", text: "The coding agent opens a PR.", add: [["is-cmd", "PR #4813 opened by coding-agent"]] },
          { node: 1, tag: "AI review", text: "The AI reviewer comments within minutes of the PR opening.", add: [
            ["is-ai", "ai-reviewer · retry.py:22  backoff has no jitter, so 3 retries sync up across pods"],
            ["is-ai", "ai-reviewer · retry.py:31  attempts counts the first call, so this is 2 retries, not 3"]
          ] },
          { node: 2, tag: "fix", text: "The agent addresses both comments before a human looks.", add: [
            ["is-add", "+  backoff=jittered(0.2), attempts=4"]
          ] },
          { node: 3, tag: "human", text: "The human reviewer reads a cleaner diff and judges intent and risk, not typos.", add: [
            ["is-human", "reviewer-a · ✓ approved, the retry budget matches the SLO"]
          ] },
          { node: 4, tag: "merge", text: "Faster, and a human still owns the decision.", add: [["is-ok", "⇢ merged into main · a human approved"]] }
        ]
      },
      {
        name: "Full automation",
        intro: "The AI reviews and approves on its own. No human in the loop.",
        idle: "PR #4813 ready",
        nodes: [
          { label: "PR opened", sub: "coding agent", kind: "ai" },
          { label: "AI review", sub: "AI reviewer", kind: "ai" },
          { label: "AI approves", sub: "AI reviewer", kind: "ai" },
          { label: "Merge" }
        ],
        steps: [
          { node: 0, tag: "open", text: "The coding agent opens a PR.", add: [["is-cmd", "PR #4813 opened by coding-agent"]] },
          { node: 1, tag: "AI review", text: "The AI reviewer catches the obvious issues.", add: [
            ["is-ai", "ai-reviewer · retry.py:22  add jitter to the backoff"]
          ] },
          { node: 2, tag: "approve", text: "It approves its own judgement of the fix.", add: [
            ["is-ai", "ai-reviewer · ✓ approved"]
          ] },
          { node: 3, tag: "merge", text: "Fastest path, but nobody checked what the AI missed.", add: [
            ["is-ok", "⇢ merged into main"],
            ["is-bad", "! not caught: retries are not idempotent for POST /connections"]
          ] }
        ]
      }
    ]
  };

  /* ---------------------------------------------------------------------------
     Bottleneck: a review queue with arrivals λ and human capacity μ (PRs/hour).
     ------------------------------------------------------------------------ */
  function bottleneck(root) {
    var MODES = [
      { name: "Before coding agents", lam: 3, mu: 4, ai: 0, note: "Engineers write about as fast as colleagues can review. The queue stays short." },
      { name: "Agents, human-only review", lam: 9, mu: 4, ai: 0.7, note: "Agents triple the PR rate. Review capacity doesn't change, so the queue grows every hour." },
      { name: "Agents + AI first pass", lam: 9, mu: 10, ai: 0.7, note: "The AI catches routine issues first, so each human review takes less time and capacity catches up." }
    ];
    var HOURS = 16;
    var mode = 0, hour = 0, queue = [], waitSum = 0, done = 0, timer = null, playing = false, seed = 7;

    root.innerHTML = "";
    var tabs = el("div", "acr-tabs");
    MODES.forEach(function (m, i) {
      var t = el("button", "acr-tab", m.name);
      t.type = "button";
      t.addEventListener("click", function () { stop(); mode = i; reset(); });
      tabs.appendChild(t);
    });
    root.appendChild(tabs);

    var stats = el("div", "acr-stats");
    root.appendChild(stats);

    var lane = el("div", "acr-lane");
    lane.appendChild(el("span", "acr-lane-label", "review queue"));
    var q = el("div", "acr-queue");
    lane.appendChild(q);
    root.appendChild(lane);

    var legend = el("div", "acr-legend");
    [["acr-pr", "PR written by a human"], ["acr-pr is-ai", "PR written by a coding agent"]].forEach(function (l) {
      var s = el("span");
      s.appendChild(el("span", l[0]));
      s.appendChild(document.createTextNode(l[1]));
      legend.appendChild(s);
    });
    root.appendChild(legend);

    var phase = el("div", "acr-phase");
    phase.setAttribute("aria-live", "polite");
    root.appendChild(phase);

    var setPlay = controls(root, { toggle: function () { playing ? stop() : play(); }, next: function () { stop(); step(); }, reset: function () { stop(); reset(); } });

    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

    function stat(label, value, cls) {
      var d = el("div", "acr-stat" + (cls ? " " + cls : ""));
      d.appendChild(el("small", null, label));
      d.appendChild(el("b", null, value));
      return d;
    }

    function render() {
      var m = MODES[mode];
      var rho = m.lam / m.mu;
      Array.prototype.forEach.call(tabs.children, function (t, i) { t.classList.toggle("is-on", i === mode); });
      stats.innerHTML = "";
      stats.appendChild(stat("hour", hour + " / " + HOURS));
      stats.appendChild(stat("arrivals λ", m.lam + " PRs/h"));
      stats.appendChild(stat("capacity μ", m.mu + " PRs/h"));
      stats.appendChild(stat("utilization ρ = λ/μ", Math.round(rho * 100) + "%", rho >= 1 ? "is-bad" : rho > 0.85 ? "is-warn" : "is-ok"));
      stats.appendChild(stat("in queue", String(queue.length), queue.length > 20 ? "is-bad" : ""));
      stats.appendChild(stat("avg wait", done ? (waitSum / done).toFixed(1) + " h" : "–", queue.length > 20 ? "is-bad" : ""));

      var more = q.querySelector(".acr-more");
      if (more) more.parentNode.removeChild(more);
      var shown = Math.min(queue.length, 60);
      while (q.children.length > shown) q.removeChild(q.lastChild);
      for (var i = q.children.length; i < shown; i++) {
        var b = el("span", "acr-pr" + (queue[i].ai ? " is-ai" : ""));
        if (!reduce) { b.classList.add("is-new"); }
        q.appendChild(b);
        if (!reduce) { b.getBoundingClientRect(); b.classList.remove("is-new"); }
      }
      Array.prototype.forEach.call(q.children, function (b, i) { b.className = "acr-pr" + (queue[i].ai ? " is-ai" : ""); });
      if (queue.length > 60) q.appendChild(el("span", "acr-more", "+" + (queue.length - 60)));

      phase.innerHTML = "";
      var tag = el("span", "acr-phase-tag", rho >= 1 ? "unstable" : "stable");
      tag.classList.add(rho >= 1 ? "is-bad" : "is-ok");
      phase.appendChild(tag);
      phase.appendChild(document.createTextNode(m.note));
    }

    function step() {
      var m = MODES[mode];
      if (hour >= HOURS) { reset(); return; }
      hour += 1;
      var arrivals = Math.max(0, Math.round(m.lam + (rnd() - 0.5) * 3));
      for (var i = 0; i < arrivals; i++) queue.push({ t: hour, ai: rnd() < m.ai });
      var served = Math.min(queue.length, Math.max(0, Math.round(m.mu + (rnd() - 0.5) * 2)));
      for (var j = 0; j < served; j++) { waitSum += hour - queue.shift().t + 0.5; done += 1; }
      render();
    }

    function reset() { hour = 0; queue = []; waitSum = 0; done = 0; seed = 7; q.innerHTML = ""; render(); }

    function play() {
      playing = true;
      setPlay(true);
      var tick = function () {
        var end = hour >= HOURS;
        step();
        timer = setTimeout(tick, end ? 1200 : hour >= HOURS ? 3200 : 700);
      };
      tick();
    }

    function stop() { playing = false; setPlay(false); clearTimeout(timer); }

    reset();
    onVisible(root, play);
  }

  /* ---------------------------------------------------------------------------
     Properties: one diff, four properties, a bad and a good comment for each.
     ------------------------------------------------------------------------ */
  function properties(root) {
    var DIFF = [
      { n: 12, k: " ", t: "def fetch_profile(member_id, client):" },
      { n: 13, k: "-", t: "    resp = client.get(f\"/profiles/{member_id}\")" },
      { n: 14, k: "+", t: "    resp = client.get(f\"/profiles/{member_id}\", timeout=2)" },
      { n: 15, k: "+", t: "    cache.set(member_id, resp.json())" },
      { n: 16, k: " ", t: "    return resp.json()" }
    ];
    var PROPS = [
      {
        name: "Grounded",
        rule: "It flags real problems in the changed lines.",
        bad: { line: 14, who: "ai-reviewer · 0:03 after open", text: "`client.get` does not accept a `timeout` argument.", why: "Made up. The client does take a timeout. One false claim and authors start ignoring the bot." },
        good: { line: 15, who: "ai-reviewer · 0:03 after open", text: "This caches the body before checking `resp.status_code`. A 5xx error payload gets cached and served as a profile.", why: "A real bug, on a line this PR changed, with the failure spelled out." }
      },
      {
        name: "High-signal",
        rule: "Real bugs and risky lines, not nits a linter would catch.",
        bad: { line: 14, who: "ai-reviewer · 0:03 after open", text: "Nit: prefer single quotes for consistency.", why: "The formatter already owns this. Ten nits bury the one comment that matters." },
        good: { line: 15, who: "ai-reviewer · 0:03 after open", text: "`fetch_profile` now writes to a shared cache with no TTL, so profile edits never show up for cached members.", why: "Stale data in production. Worth a human's attention." }
      },
      {
        name: "Codebase-aware",
        rule: "It follows the codebase's own conventions.",
        bad: { line: 15, who: "ai-reviewer · 0:03 after open", text: "Consider adding the `requests-cache` library for HTTP caching.", why: "Generic advice. This repo already has a cache layer and a rule for using it." },
        good: { line: 15, who: "ai-reviewer · 0:03 after open", text: "review_guidelines.md requires an explicit `ttl=` on `cache.set`. Use `PROFILE_TTL`, as `fetch_company` does.", why: "Cites the repo's own rule and an existing example to copy." }
      },
      {
        name: "Timely",
        rule: "It comments while the author can still act on it.",
        bad: { line: 15, who: "ai-reviewer · 2:10 after merge", text: "This caches the body before checking `resp.status_code`.", why: "Right comment, wrong time. The code is merged, the author has moved on, and the fix is now a new PR." },
        good: { line: 15, who: "ai-reviewer · 0:03 after open", text: "This caches the body before checking `resp.status_code`.", why: "Lands before the human review, while the author (or agent) still has the context loaded." }
      }
    ];
    var cur = 0, timer = null, auto = true;

    root.innerHTML = "";
    var tabs = el("div", "acr-tabs");
    PROPS.forEach(function (p, i) {
      var t = el("button", "acr-tab", p.name);
      t.type = "button";
      t.addEventListener("click", function () { auto = false; clearTimeout(timer); show(i); });
      tabs.appendChild(t);
    });
    root.appendChild(tabs);

    var rule = el("p", "acr-rule");
    root.appendChild(rule);

    var diff = el("div", "acr-diff");
    diff.setAttribute("aria-hidden", "true");
    DIFF.forEach(function (d) {
      var r = el("div", "acr-diff-row is-" + (d.k === "+" ? "add" : d.k === "-" ? "del" : "ctx"));
      r.dataset.line = d.n;
      r.appendChild(el("span", "acr-ln", String(d.n)));
      r.appendChild(el("span", "acr-sign", d.k));
      r.appendChild(el("code", null, d.t));
      diff.appendChild(r);
    });
    root.appendChild(diff);

    var cards = el("div", "acr-cards");
    root.appendChild(cards);

    function card(c, good) {
      var d = el("div", "acr-card " + (good ? "is-good" : "is-bad"));
      d.appendChild(el("span", "acr-card-tag", good ? "✓ good comment" : "✗ bad comment"));
      d.appendChild(el("small", null, "line " + c.line + " · " + c.who));
      var p = el("p", "acr-card-text");
      // `backticks` become inline <code>.
      c.text.split("`").forEach(function (part, k) {
        p.appendChild(k % 2 ? el("code", null, part) : document.createTextNode(part));
      });
      d.appendChild(p);
      d.appendChild(el("p", "acr-card-why", c.why));
      d.addEventListener("mouseenter", function () { mark(c.line, good); });
      d.addEventListener("mouseleave", function () { mark(PROPS[cur].good.line, true); });
      return d;
    }

    function mark(line, good) {
      Array.prototype.forEach.call(diff.children, function (r) {
        r.classList.toggle("is-hit", Number(r.dataset.line) === line);
        r.classList.toggle("is-hit-bad", Number(r.dataset.line) === line && !good);
      });
    }

    function show(i) {
      cur = i;
      var p = PROPS[i];
      Array.prototype.forEach.call(tabs.children, function (t, k) { t.classList.toggle("is-on", k === i); });
      rule.textContent = p.rule;
      cards.innerHTML = "";
      var b = card(p.bad, false), g = card(p.good, true);
      cards.appendChild(b);
      cards.appendChild(g);
      if (!reduce) {
        [b, g].forEach(function (c, k) {
          c.classList.add("is-new");
          c.style.transitionDelay = (k * 180) + "ms";
          c.getBoundingClientRect();
          c.classList.remove("is-new");
        });
      }
      mark(p.good.line, true);
    }

    function cycle() {
      if (!auto) return;
      timer = setTimeout(function () { show((cur + 1) % PROPS.length); cycle(); }, 5200);
    }

    show(0);
    onVisible(root, cycle);
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll("figure.acr-demo"), function (root) {
      var kind = root.getAttribute("data-acr");
      if (SCENARIOS[kind]) stepper(root, SCENARIOS[kind]);
      else if (kind === "bottleneck") bottleneck(root);
      else if (kind === "properties") properties(root);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
