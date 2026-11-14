/* Animated figures for the Document-to-Knowledge-to-Agents signal post.
   Mounts into <figure class="dk-demo" data-dk="...">:

     ingest     S3 -> SQS -> Lambda workers -> patches, with retries, a poison
                message landing in the DLQ and a concurrency selector
     merge      knowledge patches going through validate -> resolve ->
                conflict check -> conditional write, incl. an idempotent replay,
                a rejected patch and a recorded conflict
     fanout     planner fans out to specialists in parallel, synthesis checks
                the findings, finds a gap and re-delegates one targeted task
     topology   Option A (one Runtime) / Hybrid / Option B (many Runtimes),
                with the planner's dispatch call staying identical

   Every document, ID, date and count is illustrative. Respects
   prefers-reduced-motion (no autoplay; transitions disabled in CSS). */
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
    }, { threshold: 0.4 });
    io.observe(root);
  }

  function controls(root, h, extra) {
    var bar = el("div", "dk-controls");
    function btn(label, aria, fn) {
      var b = el("button", null, label);
      b.type = "button";
      b.setAttribute("aria-label", aria);
      b.addEventListener("click", fn);
      bar.appendChild(b);
      return b;
    }
    var play = btn("▶ Play", "Play", h.toggle);
    btn("Step ▶", "Next step", h.next);
    btn("↺ Reset", "Reset", h.reset);
    if (extra) bar.appendChild(extra);
    root.appendChild(bar);
    return function (playing) {
      play.textContent = playing ? "❚❚ Pause" : "▶ Play";
      play.setAttribute("aria-label", playing ? "Pause" : "Play");
    };
  }

  /* Shared play/step/reset loop around a tick() that returns false when done. */
  function runner(root, interval, api, extra) {
    var timer = null, playing = false, setPlay;
    function stop() { playing = false; clearInterval(timer); timer = null; setPlay(false); }
    function step() { if (api.tick() === false) { stop(); return false; } return true; }
    function start() {
      if (api.done()) api.reset();
      playing = true; setPlay(true);
      timer = setInterval(step, interval);
    }
    setPlay = controls(root, {
      toggle: function () { if (playing) stop(); else start(); },
      next: function () { stop(); if (api.done()) api.reset(); step(); },
      reset: function () { stop(); api.reset(); }
    }, extra);
    api.reset();
    onVisible(root, start);
    return { stop: stop, start: start, isPlaying: function () { return playing; } };
  }

  function stat(parent, label) {
    var s = el("div", "dk-stat");
    var v = el("strong", null, "0");
    s.appendChild(v);
    s.appendChild(el("span", null, label));
    parent.appendChild(s);
    return v;
  }

  /* ---------------------------------------------------------------------------
     1. ingest: documents -> S3 -> SQS -> Lambda workers -> patches / DLQ
     ------------------------------------------------------------------------ */
  function ingest(root) {
    var DOCS = 10, POISON = 6, MAX_RECEIVE = 3, WORK_TICKS = 3;
    var concurrency = 2;
    var st;

    var stage = el("div", "dk-ingest");
    function col(title, cls) {
      var c = el("div", "dk-col " + (cls || ""));
      c.appendChild(el("p", "dk-col-title", title));
      var body = el("div", "dk-col-body");
      c.appendChild(body);
      stage.appendChild(c);
      return body;
    }
    var upEl = col("Upload", "dk-col--up");
    var s3El = col("S3 raw", "dk-col--s3");
    var qEl = col("SQS queue", "dk-col--q");
    var wEl = col("Lambda workers", "dk-col--w");
    var pEl = col("Knowledge patches", "dk-col--p");
    root.appendChild(stage);

    var dlqWrap = el("div", "dk-dlq");
    dlqWrap.appendChild(el("p", "dk-col-title", "Dead-letter queue"));
    var dlqEl = el("div", "dk-col-body");
    dlqWrap.appendChild(dlqEl);
    root.appendChild(dlqWrap);

    var stats = el("div", "dk-stats");
    var sDepth = stat(stats, "queue depth");
    var sFlight = stat(stats, "in flight");
    var sPatch = stat(stats, "patches");
    var sDlq = stat(stats, "in DLQ");
    var sTick = stat(stats, "tick");
    root.appendChild(stats);
    var log = el("p", "dk-log", "");
    root.appendChild(log);

    function chip(doc, extra) {
      var c = el("span", "dk-chip" + (doc.poison ? " dk-chip--poison" : "") + (extra ? " " + extra : ""),
        "doc-" + (doc.id < 10 ? "0" : "") + doc.id);
      if (doc.tries && extra !== "dk-chip--stored") c.appendChild(el("em", null, " try " + doc.tries));
      return c;
    }

    function render() {
      [upEl, s3El, qEl, wEl, pEl, dlqEl].forEach(function (n) { n.innerHTML = ""; });
      st.up.forEach(function (d) { upEl.appendChild(chip(d)); });
      st.s3.forEach(function (d) { s3El.appendChild(chip(d, "dk-chip--stored")); });
      st.q.forEach(function (d) { qEl.appendChild(chip(d)); });
      for (var i = 0; i < concurrency; i++) {
        var slot = el("div", "dk-slot");
        var job = st.workers[i];
        if (job) {
          slot.appendChild(chip(job.doc, "dk-chip--busy"));
          var bar = el("span", "dk-bar");
          var fill = el("i");
          fill.style.width = Math.round((job.t / WORK_TICKS) * 100) + "%";
          bar.appendChild(fill);
          slot.appendChild(bar);
        } else {
          slot.appendChild(el("span", "dk-idle", "idle"));
        }
        wEl.appendChild(slot);
      }
      st.patches.forEach(function (d) {
        pEl.appendChild(el("span", "dk-chip dk-chip--patch", "patch ← doc-" + (d.id < 10 ? "0" : "") + d.id));
      });
      st.dlq.forEach(function (d) { dlqEl.appendChild(chip(d, "dk-chip--dead")); });
      dlqWrap.classList.toggle("is-hot", st.dlq.length > 0);
      sDepth.textContent = st.q.length;
      sFlight.textContent = st.workers.filter(Boolean).length;
      sPatch.textContent = st.patches.length;
      sDlq.textContent = st.dlq.length;
      sTick.textContent = st.tick;
    }

    var api = {
      reset: function () {
        st = { tick: 0, up: [], s3: [], q: [], workers: [], patches: [], dlq: [], msg: "" };
        for (var i = 1; i <= DOCS; i++) st.up.push({ id: i, poison: i === POISON, tries: 0 });
        log.textContent = "Ten documents waiting to upload. doc-06 is a corrupt file that every worker will fail on.";
        render();
      },
      done: function () {
        return st.up.length === 0 && st.q.length === 0 && !st.workers.some(Boolean);
      },
      tick: function () {
        if (api.done()) return false;
        st.tick++;
        var msgs = [];
        // Uploads arrive faster than workers drain them: two per tick.
        for (var u = 0; u < 2 && st.up.length; u++) {
          var d = st.up.shift();
          st.s3.push(d);
          st.q.push(d);
        }
        // Workers finish or fail.
        for (var w = 0; w < concurrency; w++) {
          var job = st.workers[w];
          if (!job) continue;
          job.t++;
          if (job.t >= WORK_TICKS) {
            st.workers[w] = null;
            if (job.doc.poison) {
              if (job.doc.tries >= MAX_RECEIVE) {
                st.dlq.push(job.doc);
                msgs.push("doc-06 failed " + MAX_RECEIVE + " times: SQS moves it to the DLQ for inspection and replay.");
              } else {
                st.q.push(job.doc);
                msgs.push("doc-06 failed (try " + job.doc.tries + "): the message becomes visible again and is retried.");
              }
            } else {
              st.patches.push(job.doc);
              msgs.push("doc-" + (job.doc.id < 10 ? "0" : "") + job.doc.id + " parsed, extracted and emitted as a knowledge patch.");
            }
          }
        }
        // Idle workers pull from the queue.
        for (var k = 0; k < concurrency; k++) {
          if (!st.workers[k] && st.q.length) {
            var next = st.q.shift();
            next.tries++;
            st.workers[k] = { doc: next, t: 0 };
          }
        }
        if (!msgs.length) {
          msgs.push(st.q.length > concurrency
            ? "Queue depth " + st.q.length + ": SQS absorbs the burst while " + concurrency + " workers drain it at their own pace."
            : "Workers pull the next messages from the queue.");
        }
        if (api.done()) msgs.push("Done. Every good document became a patch; the poison message is isolated, not blocking anyone.");
        log.textContent = msgs.join(" ");
        render();
        return !api.done();
      }
    };

    var sel = el("label", "dk-select");
    sel.appendChild(document.createTextNode("Lambda concurrency "));
    var pick = el("select");
    [1, 2, 4].forEach(function (n) {
      var o = el("option", null, String(n));
      o.value = n;
      if (n === concurrency) o.selected = true;
      pick.appendChild(o);
    });
    sel.appendChild(pick);
    var r = runner(root, 750, api, sel);
    pick.addEventListener("change", function () {
      var was = r.isPlaying();
      r.stop();
      concurrency = parseInt(pick.value, 10);
      api.reset();
      if (was) r.start();
    });
  }

  /* ---------------------------------------------------------------------------
     2. merge: patches through the Knowledge Integration Engine into the Wiki
     ------------------------------------------------------------------------ */
  function merge(root) {
    var STAGES = ["Validate", "Resolve entity", "Conflict check", "Conditional write", "Wiki page + event"];
    var PATCHES = [
      { id: "p-101", src: "doc-02 p3", what: "DATE-007 submission deadline = 14 Mar", path: [0, 1, 2, 3, 4],
        effect: { row: "DATE-007", kind: "Submission deadline", val: "14 Mar", ev: "doc-02 p3" },
        notes: ["Schema valid, evidence span exists in doc-02.", "No existing entity: create DATE-007.",
          "Nothing to conflict with.", "PutItem with attribute_not_exists: version 1.", "Wiki page re-rendered, change event emitted."] },
      { id: "p-102", src: "doc-05 p42", what: "REQ-0231 mandatory: ISO 27001 certificate", path: [0, 1, 2, 3, 4],
        effect: { row: "REQ-0231", kind: "Requirement (mandatory)", val: "ISO 27001", ev: "doc-05 p42" },
        notes: ["Schema valid, evidence span exists.", "New requirement entity.", "No conflict.",
          "Conditional write: version 1.", "Requirements page updated."] },
      { id: "p-103", src: "doc-07 p12", what: "\"Info-sec certification required\"", path: [0, 1, 2, 3, 4],
        effect: { row: "REQ-0231", ev: "doc-07 p12", addEv: true },
        notes: ["Schema valid.", "Entity resolution: same requirement as REQ-0231, not a new one.",
          "Same value, so no conflict: add a second evidence link.", "Conditional write on version 1 -> version 2.",
          "REQ-0231 now cites two documents."] },
      { id: "p-102", src: "doc-05 p42", what: "replay of p-102 (Lambda retried)", path: [0],
        effect: { dup: true },
        notes: ["patch_id p-102 already applied: idempotent no-op. Retries never double-write."] },
      { id: "p-104", src: "doc-09 p88", what: "STK-012 evaluator, span p88:l4-l9", path: [0],
        effect: { reject: true },
        notes: ["Evidence check failed: doc-09 has 61 pages. Rejected to the DLQ with a reason."] },
      { id: "p-105", src: "doc-09 p9", what: "DATE-007 submission deadline = 12 Mar", path: [0, 1, 2, 3, 4],
        effect: { row: "DATE-007", conflict: "12 Mar", ev: "doc-09 p9" },
        notes: ["Schema valid.", "Resolves to DATE-007.", "Different value from version 1: CONFLICT.",
          "Write the conflict record with both sources; never overwrite silently.",
          "Wiki shows both dates; agents and humans see the conflict."] }
    ];
    var cur, sub, wiki;

    var wrap = el("div", "dk-merge");
    var inbox = el("div", "dk-inbox");
    inbox.appendChild(el("p", "dk-col-title", "Incoming patches"));
    var inList = el("div", "dk-inlist");
    inbox.appendChild(inList);
    var engine = el("div", "dk-engine");
    engine.appendChild(el("p", "dk-col-title", "Knowledge Integration Engine"));
    var stageEls = STAGES.map(function (s) {
      var n = el("div", "dk-stage", s);
      engine.appendChild(n);
      return n;
    });
    var wikiBox = el("div", "dk-wiki");
    wikiBox.appendChild(el("p", "dk-col-title", "Wiki (DynamoDB + S3)"));
    var table = el("div", "dk-wiki-rows");
    wikiBox.appendChild(table);
    wrap.appendChild(inbox);
    wrap.appendChild(engine);
    wrap.appendChild(wikiBox);
    root.appendChild(wrap);
    var log = el("p", "dk-log", "");
    root.appendChild(log);

    function render() {
      inList.innerHTML = "";
      PATCHES.forEach(function (p, i) {
        var c = el("div", "dk-patch");
        if (i < cur || (i === cur && sub >= p.path.length - 1 && done)) c.classList.add("is-done");
        if (i === cur) c.classList.add("is-active");
        if (i <= cur && p.effect.reject && (i < cur || sub >= 0)) c.classList.add("is-rejected");
        if (i <= cur && p.effect.dup && (i < cur || sub >= 0)) c.classList.add("is-dup");
        c.appendChild(el("strong", null, p.id));
        c.appendChild(el("span", null, p.what));
        c.appendChild(el("em", null, p.src));
        inList.appendChild(c);
      });
      var active = PATCHES[cur];
      stageEls.forEach(function (n, i) {
        n.className = "dk-stage";
        if (!active || sub < 0) return;
        var pos = active.path.indexOf(i);
        if (pos === -1) { n.classList.add("is-skipped"); return; }
        if (pos < sub) n.classList.add("is-passed");
        if (pos === sub) {
          n.classList.add("is-current");
          if (active.effect.reject) n.classList.add("is-fail");
          if (active.effect.dup) n.classList.add("is-dup");
          if (active.effect.conflict && i >= 2) n.classList.add("is-warn");
        }
      });
      table.innerHTML = "";
      var keys = Object.keys(wiki);
      if (!keys.length) table.appendChild(el("p", "dk-empty", "empty"));
      keys.forEach(function (k) {
        var r = wiki[k];
        var row = el("div", "dk-row" + (r.conflict ? " is-conflict" : "") + (r.flash ? " is-flash" : ""));
        row.appendChild(el("strong", null, k));
        row.appendChild(el("span", "dk-row-kind", r.kind));
        var val = el("span", "dk-row-val", r.val);
        if (r.conflict) val.textContent = r.val + " vs " + r.conflict;
        row.appendChild(val);
        row.appendChild(el("em", null, "v" + r.v + " · " + r.ev.join(" | ")));
        if (r.conflict) row.appendChild(el("span", "dk-badge", "conflict recorded"));
        table.appendChild(row);
        r.flash = false;
      });
    }

    var done = false;
    function apply(p) {
      var e = p.effect;
      if (e.dup || e.reject) return;
      if (e.conflict) {
        var r0 = wiki[e.row];
        r0.conflict = e.conflict;
        r0.ev.push(e.ev);
        r0.flash = true;
        return;
      }
      if (e.addEv) {
        var r1 = wiki[e.row];
        r1.ev.push(e.ev);
        r1.v++;
        r1.flash = true;
        return;
      }
      wiki[e.row] = { kind: e.kind, val: e.val, ev: [e.ev], v: 1, flash: true };
    }

    var api = {
      reset: function () {
        cur = 0; sub = -1; wiki = {}; done = false;
        log.textContent = "Six patches from five documents arrive. Press Play or Step.";
        render();
      },
      done: function () { return done; },
      tick: function () {
        if (done) return false;
        var p = PATCHES[cur];
        if (sub < p.path.length - 1) {
          sub++;
          log.textContent = p.id + " → " + STAGES[p.path[sub]] + ": " + p.notes[sub];
          if (sub === p.path.length - 1) apply(p);
        } else if (cur < PATCHES.length - 1) {
          cur++; sub = 0;
          var q = PATCHES[cur];
          log.textContent = q.id + " → " + STAGES[q.path[0]] + ": " + q.notes[0];
          if (q.path.length === 1) apply(q);
        } else {
          done = true;
          log.textContent = "Result: two Wiki entities, one requirement with two sources, one replay ignored, one bad patch rejected, one conflict kept visible.";
        }
        render();
        return !done;
      }
    };
    runner(root, 1300, api);
  }

  /* ---------------------------------------------------------------------------
     3. fanout: planner -> parallel specialists -> synthesis -> re-delegation
     ------------------------------------------------------------------------ */
  function fanout(root) {
    var AGENTS = [
      { key: "req", name: "Requirements", speed: 0.34, cites: 14 },
      { key: "dates", name: "Key Dates", speed: 0.5, cites: 6 },
      { key: "stk", name: "Stakeholders", speed: 0.42, cites: 5 },
      { key: "risk", name: "Risks", speed: 0.26, cites: 3 },
      { key: "comp", name: "Compliance", speed: 0.3, cites: 9 }
    ];
    var CHECKS = ["Evidence", "Consistency", "Coverage", "Conflicts", "Confidence"];
    var STEPS = [
      { phase: "plan", text: "Planner inspects Wiki coverage and gaps, then builds a plan and picks five specialists." },
      { phase: "dispatch", text: "Parallel delegation: every specialist gets a typed task and reads the Wiki through the Wiki API." },
      { phase: "run", text: "Specialists run concurrently. Wall-clock time is the slowest one, not the sum." },
      { phase: "run", text: "Findings come back as structured output with entity and evidence IDs." },
      { phase: "run", text: "Waiting for the slowest specialist." },
      { phase: "check", check: 0, ok: true, text: "Evidence check: every claim cites at least one valid evidence ID." },
      { phase: "check", check: 1, ok: true, text: "Consistency check: dates, names and numbers agree across agents and with the Wiki." },
      { phase: "check", check: 2, ok: false, text: "Coverage check FAILED: the Risks section has no commercial risks. That is a gap, not an answer." },
      { phase: "redelegate", text: "Synthesis re-delegates one targeted task: Risks agent, commercial terms only. The others are not re-run." },
      { phase: "rerun", text: "Risks agent returns 4 commercial risks with citations." },
      { phase: "check", check: 2, ok: true, text: "Coverage check passes on the re-run." },
      { phase: "check", check: 3, ok: "warn", text: "Conflict surfacing: the recorded DATE-007 conflict is reported in the output, not hidden." },
      { phase: "check", check: 4, ok: "warn", text: "Confidence rollup: 2 low-confidence items flagged for human review." },
      { phase: "writeback", text: "Validated new knowledge goes back to the Wiki as knowledge patches. Final intelligence is delivered." }
    ];
    var idx, prog, checkState, redo;

    var wrap = el("div", "dk-fan");
    var planner = el("div", "dk-node dk-node--planner", "Planner / Orchestrator");
    wrap.appendChild(planner);
    var row = el("div", "dk-agents");
    var agentEls = AGENTS.map(function (a) {
      var n = el("div", "dk-agent");
      n.appendChild(el("strong", null, a.name));
      var bar = el("span", "dk-bar");
      var fill = el("i");
      bar.appendChild(fill);
      n.appendChild(bar);
      var out = el("em", null, "idle");
      n.appendChild(out);
      row.appendChild(n);
      return { n: n, fill: fill, out: out };
    });
    wrap.appendChild(row);
    var syn = el("div", "dk-node dk-node--syn");
    syn.appendChild(el("strong", null, "Cross-agent synthesis and validation"));
    var checks = el("div", "dk-checks");
    var checkEls = CHECKS.map(function (c) {
      var n = el("span", "dk-check", c);
      checks.appendChild(n);
      return n;
    });
    syn.appendChild(checks);
    wrap.appendChild(syn);
    var outNode = el("div", "dk-node dk-node--out", "Final intelligence + patches to the Wiki");
    wrap.appendChild(outNode);
    root.appendChild(wrap);
    var log = el("p", "dk-log", "");
    root.appendChild(log);

    function render() {
      var s = STEPS[idx] || { phase: "idle" };
      planner.classList.toggle("is-on", s.phase === "plan" || s.phase === "dispatch" || s.phase === "redelegate");
      AGENTS.forEach(function (a, i) {
        var e = agentEls[i];
        var p = prog[i];
        e.fill.style.width = Math.round(Math.min(1, p) * 100) + "%";
        e.n.className = "dk-agent";
        if (p > 0 && p < 1) { e.n.classList.add("is-running"); e.out.textContent = "running"; }
        else if (p >= 1) { e.n.classList.add("is-done"); e.out.textContent = a.cites + (a.key === "risk" && redo === 2 ? 4 : 0) + " cited findings"; }
        else e.out.textContent = idx >= 1 ? "queued" : "idle";
        if (a.key === "risk" && (s.phase === "redelegate" || s.phase === "rerun")) e.n.classList.add("is-redo");
        if (a.key === "risk" && redo === 1 && p < 1) e.out.textContent = "re-run: commercial risks";
      });
      checkEls.forEach(function (n, i) {
        n.className = "dk-check";
        var v = checkState[i];
        if (v === true) n.classList.add("is-ok");
        else if (v === false) n.classList.add("is-fail");
        else if (v === "warn") n.classList.add("is-warn");
      });
      syn.classList.toggle("is-on", s.phase === "check" || s.phase === "redelegate");
      outNode.classList.toggle("is-on", s.phase === "writeback");
      wrap.classList.toggle("is-redelegate", s.phase === "redelegate");
    }

    /* Bars animate via the CSS width transition (.dk-fan .dk-bar i). */
    function animateRun(targets) {
      targets.forEach(function (tg, i) { if (tg != null) prog[i] = tg; });
      render();
    }

    var runTick = 0;
    var api = {
      reset: function () {
        idx = -1; runTick = 0; redo = 0;
        prog = AGENTS.map(function () { return 0; });
        checkState = CHECKS.map(function () { return null; });
        log.textContent = "Request: produce intelligence for one document set. Press Play or Step.";
        render();
      },
      done: function () { return idx >= STEPS.length - 1; },
      tick: function () {
        if (api.done()) return false;
        idx++;
        var s = STEPS[idx];
        log.textContent = s.text;
        if (s.phase === "dispatch") {
          animateRun(AGENTS.map(function () { return 0.04; }), 300);
        } else if (s.phase === "run") {
          runTick++;
          animateRun(AGENTS.map(function (a) { return Math.min(1, 0.04 + a.speed * runTick * 1.0); }), 900);
          if (runTick === 3) animateRun(AGENTS.map(function () { return 1; }), 900);
        } else if (s.phase === "check") {
          checkState[s.check] = s.ok;
        } else if (s.phase === "redelegate") {
          redo = 1;
          prog[3] = 0.02;
        } else if (s.phase === "rerun") {
          redo = 2;
          animateRun([null, null, null, 1, null], 900);
        }
        render();
        return !api.done();
      }
    };
    runner(root, 1500, api);
  }

  /* ---------------------------------------------------------------------------
     4. topology: Option A / Hybrid / Option B, dispatch call unchanged
     ------------------------------------------------------------------------ */
  function topology(root) {
    var AGENTS = ["Requirements", "Key Dates", "Stakeholders", "Risks", "Compliance"];
    var MODES = [
      { key: "a", label: "Option A: one Runtime", own: [],
        transport: "in-process tool call",
        notes: ["One deployment, shared execution context", "Specialists scale and version together",
          "One permissions boundary for all agents", "Lowest operational overhead: the recommended start"] },
      { key: "h", label: "Hybrid: promote Compliance", own: [4],
        transport: "tool call | Runtime invoke for Compliance",
        notes: ["Heavy Compliance checks scale on their own", "The rest stay as logical subagents",
          "Promotion trigger: scaling, release cadence, data boundary or team ownership",
          "Planner code is unchanged: the dispatch layer routes it"] },
      { key: "b", label: "Option B: many Runtimes", own: [0, 1, 2, 3, 4],
        transport: "A2A / MCP / Runtime invoke",
        notes: ["Independent scaling, versioning and permissions", "Each team can own its agent",
          "Every call is a network hop: distributed tracing is essential",
          "More deployments and contract versions to operate"] }
    ];
    var mode = 0, pulseTimer = null;

    var tabs = el("div", "dk-tabs");
    var tabBtns = MODES.map(function (m, i) {
      var b = el("button", null, m.label);
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { set(i); });
      tabs.appendChild(b);
      return b;
    });
    root.appendChild(tabs);

    var board = el("div", "dk-topo");
    var main = el("div", "dk-runtime dk-runtime--main");
    var mainTag = el("span", "dk-runtime-tag", "AgentCore Runtime");
    main.appendChild(mainTag);
    var pl = el("div", "dk-node dk-node--planner", "Planner");
    main.appendChild(pl);
    var lane = el("div", "dk-lane");
    var cells = AGENTS.map(function (a) {
      var cell = el("div", "dk-cell");
      var wire = el("span", "dk-wire");
      wire.appendChild(el("i", "dk-pulse"));
      cell.appendChild(wire);
      var rt = el("div", "dk-subrt");
      rt.appendChild(el("span", "dk-runtime-tag", "Runtime"));
      rt.appendChild(el("div", "dk-agent-box", a));
      cell.appendChild(rt);
      lane.appendChild(cell);
      return cell;
    });
    main.appendChild(lane);
    board.appendChild(main);
    var wiki = el("div", "dk-node dk-node--wiki", "Wiki API (S3 + DynamoDB)");
    board.appendChild(wiki);
    root.appendChild(board);

    var side = el("div", "dk-topo-side");
    var code = el("pre", "dk-code");
    side.appendChild(code);
    var list = el("ul", "dk-notes");
    side.appendChild(list);
    root.appendChild(side);

    function set(i) {
      mode = i;
      var m = MODES[i];
      tabBtns.forEach(function (b, k) {
        b.classList.toggle("is-active", k === i);
        b.setAttribute("aria-pressed", k === i ? "true" : "false");
      });
      root.setAttribute("data-mode", m.key);
      cells.forEach(function (c, k) { c.classList.toggle("is-remote", m.own.indexOf(k) !== -1); });
      mainTag.textContent = m.key === "b" ? "Runtime 1: planner only" : "AgentCore Runtime: planner + logical subagents";
      code.textContent =
        "# planner logic: identical in every mode\n" +
        "for task in plan.tasks:\n" +
        "    futures.append(dispatch(task.contract, task))\n" +
        "#   contract = \"compliance-agent/v1\"\n\n" +
        "# dispatch layer (config, not planner code):\n" +
        "#   transport = " + m.transport;
      list.innerHTML = "";
      m.notes.forEach(function (n) { list.appendChild(el("li", null, n)); });
    }

    function pulse() {
      cells.forEach(function (c, k) {
        setTimeout(function () {
          c.classList.remove("is-pulse");
          void c.offsetWidth;
          c.classList.add("is-pulse");
        }, k * 120);
      });
    }

    set(0);
    if (!reduce) {
      onVisible(root, function () {
        pulse();
        pulseTimer = setInterval(pulse, 2600);
        var auto = 0;
        var cycle = setInterval(function () {
          auto++;
          if (auto > 3) { clearInterval(cycle); return; }
          set(auto % MODES.length);
        }, 5200);
        tabBtns.forEach(function (b) { b.addEventListener("click", function () { clearInterval(cycle); }); });
      });
    }
  }

  var MOUNTS = { ingest: ingest, merge: merge, fanout: fanout, topology: topology };

  function init() {
    var figs = document.querySelectorAll("figure.dk-demo[data-dk]");
    Array.prototype.forEach.call(figs, function (f) {
      var fn = MOUNTS[f.getAttribute("data-dk")];
      if (!fn || f.getAttribute("data-dk-ready")) return;
      f.setAttribute("data-dk-ready", "1");
      var cap = f.querySelector("figcaption");
      var host = el("div", "dk-host");
      f.insertBefore(host, cap || null);
      try { fn(host); } catch (err) { if (window.console) console.error("d2k2a demo", err); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
