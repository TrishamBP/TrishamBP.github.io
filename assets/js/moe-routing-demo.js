/* Mixture-of-experts routing, Nemotron 3 Nano-style: 128 routed experts,
   the router picks the top 6 for each token, 2 shared experts always run,
   and the outputs are combined using the routing weights.
   Mounts into every <figure class="moe-demo">. Which experts fire and their
   weights are illustrative (seeded pseudo-random per token), not real routing. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var TOKENS = ["Adam", "puts", "the", "ice", "cream", "in", "the", "freezer", "because", "it", "was", "melting"];
  var N = 128, TOP_K = 6, COLS = 16, ROWS = 8;

  var W = 900, H = 284;
  var TOK = { x: 20, y: 146, w: 92, h: 36 };
  var ROUTER = { x: 150, y: 128, w: 120, h: 72 };
  var CELL = 16, GAP = 4, GRID_X = 320, GRID_Y = 60;
  var SHARED_Y = GRID_Y + ROWS * (CELL + GAP) + 26;
  var COMB = { x: 742, y: 164, r: 26 };
  var OUT = { x: 798, y: 146, w: 92, h: 36 };

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function cellXY(e) {
    return { x: GRID_X + (e % COLS) * (CELL + GAP), y: GRID_Y + Math.floor(e / COLS) * (CELL + GAP) };
  }
  // Seeded top-6 choice + softmax-like weights for token i.
  function route(i) {
    var s = (i + 7) * 2246822519 % 4294967296, picks = [], ws = [];
    function rnd() { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }
    while (picks.length < TOP_K) {
      var e = Math.floor(rnd() * N);
      if (picks.indexOf(e) < 0) picks.push(e);
    }
    var sum = 0;
    for (var k = 0; k < TOP_K; k++) { var v = Math.exp(rnd() * 1.6); ws.push(v); sum += v; }
    var out = picks.map(function (e, k) { return { e: e, w: ws[k] / sum }; });
    out.sort(function (a, b) { return b.w - a.w; });
    return out;
  }

  function mount(root) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var t = 0, timers = [], playing = false;

    root.innerHTML = "";
    var scroller = document.createElement("div");
    scroller.className = "nd-scroll";
    root.appendChild(scroller);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "A mixture-of-experts layer: for each token a router picks 6 of 128 routed experts, 2 shared experts always run, and the outputs are combined using the routing weights" }, scroller);

    var wires = el("g", { "class": "md-wires" }, svg);

    // Token
    var tokG = el("g", { "class": "md-tok" }, svg);
    el("rect", { x: TOK.x, y: TOK.y, width: TOK.w, height: TOK.h, rx: 3, "class": "nd-chip" }, tokG);
    var tokTx = el("text", { x: TOK.x + TOK.w / 2, y: TOK.y + 23, "text-anchor": "middle", "class": "nd-word" }, tokG);
    var tokLbl = el("text", { x: TOK.x, y: TOK.y - 10, "class": "nd-small" }, svg);
    tokLbl.textContent = "token";
    el("path", { d: "M" + (TOK.x + TOK.w) + " " + (TOK.y + TOK.h / 2) + " H" + ROUTER.x, "class": "md-link" }, svg);

    // Router
    var routerG = el("g", { "class": "md-router" }, svg);
    el("rect", { x: ROUTER.x, y: ROUTER.y, width: ROUTER.w, height: ROUTER.h, rx: 4, "class": "md-router-box" }, routerG);
    var r1 = el("text", { x: ROUTER.x + ROUTER.w / 2, y: ROUTER.y + 30, "text-anchor": "middle", "class": "nd-label md-on-ink" }, routerG);
    r1.textContent = "router";
    var r2 = el("text", { x: ROUTER.x + ROUTER.w / 2, y: ROUTER.y + 50, "text-anchor": "middle", "class": "nd-small md-on-ink" }, routerG);
    r2.textContent = "top-6 of 128";

    // Expert grid
    var gl = el("text", { x: GRID_X, y: GRID_Y - 14, "class": "nd-label" }, svg);
    gl.textContent = "128 routed experts";
    var cells = [];
    for (var e = 0; e < N; e++) {
      var p = cellXY(e);
      cells.push(el("rect", { x: p.x, y: p.y, width: CELL, height: CELL, rx: 2, "class": "md-cell" }, svg));
    }
    // Shared experts
    var sl = el("text", { x: GRID_X, y: SHARED_Y - 8, "class": "nd-label" }, svg);
    sl.textContent = "2 shared experts · always on";
    var shared = [0, 1].map(function (k) {
      return el("rect", { x: GRID_X + k * 44, y: SHARED_Y, width: 36, height: CELL, rx: 2, "class": "md-cell md-shared" }, svg);
    });

    // Combine + output
    var combG = el("g", { "class": "md-comb" }, svg);
    el("circle", { cx: COMB.x, cy: COMB.y, r: COMB.r, "class": "md-comb-c" }, combG);
    var ct = el("text", { x: COMB.x, y: COMB.y + 5, "text-anchor": "middle", "class": "nd-word" }, combG);
    ct.textContent = "Σ";
    var cl = el("text", { x: COMB.x, y: COMB.y + COMB.r + 18, "text-anchor": "middle", "class": "nd-small" }, svg);
    cl.textContent = "combine";
    el("path", { d: "M" + (COMB.x + COMB.r) + " " + COMB.y + " H" + OUT.x, "class": "md-link" }, svg);
    var outG = el("g", { "class": "md-outg" }, svg);
    el("rect", { x: OUT.x, y: OUT.y, width: OUT.w, height: OUT.h, rx: 3, "class": "nd-chip md-out-chip" }, outG);
    var outTx = el("text", { x: OUT.x + OUT.w / 2, y: OUT.y + 23, "text-anchor": "middle", "class": "nd-word" }, outG);
    var ol = el("text", { x: OUT.x, y: OUT.y - 10, "class": "nd-small" }, svg);
    ol.textContent = "to next layer";

    var readout = document.createElement("div");
    readout.className = "nd-readout md-readout";
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    var ctrls = document.createElement("div");
    ctrls.className = "nd-controls";
    function btn(label, aria, fn) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.setAttribute("aria-label", aria);
      b.addEventListener("click", fn);
      ctrls.appendChild(b);
      return b;
    }
    var playBtn = btn("▶ Play", "Play", function () { playing ? stop() : play(); });
    btn("Next token ▶", "Route the next token", function () { stop(); show(t, true); });
    root.appendChild(ctrls);

    function later(fn, ms) { timers.push(setTimeout(fn, reduce ? 0 : ms)); }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function wire(x1, y1, x2, y2, cls, sw) {
      var mx = (x1 + x2) / 2;
      var path = el("path", { d: "M" + x1 + " " + y1 + " C" + mx + " " + y1 + " " + mx + " " + y2 + " " + x2 + " " + y2, "class": "md-wire " + cls }, wires);
      path.style.strokeWidth = sw;
      return path;
    }

    // Render token i. `instant` jumps straight to the final picture.
    function show(i, instant) {
      clearTimers();
      while (wires.firstChild) wires.removeChild(wires.firstChild);
      cells.forEach(function (c) { c.setAttribute("class", "md-cell"); c.style.opacity = ""; });
      shared.forEach(function (c) { c.setAttribute("class", "md-cell md-shared"); });
      combG.classList.remove("is-on");
      outG.classList.remove("is-on");
      outTx.textContent = "";

      var r = route(i), word = TOKENS[i];
      tokTx.textContent = word;
      tokG.classList.remove("is-pulse");
      tokG.getBoundingClientRect();
      tokG.classList.add("is-pulse");
      routerG.classList.add("is-on");
      readout.textContent = "Routing “" + word + "”…";
      t = (i + 1) % TOKENS.length;

      var maxW = r[0].w;
      function pick() {
        r.forEach(function (o) {
          var p = cellXY(o.e);
          cells[o.e].setAttribute("class", "md-cell is-on");
          cells[o.e].style.opacity = 0.45 + 0.55 * (o.w / maxW);
          wire(ROUTER.x + ROUTER.w, ROUTER.y + ROUTER.h / 2, p.x, p.y + CELL / 2, "is-in", 1 + o.w * 9);
        });
        shared.forEach(function (c) { c.setAttribute("class", "md-cell md-shared is-on"); });
      }
      function combine() {
        r.forEach(function (o) {
          var p = cellXY(o.e);
          wire(p.x + CELL, p.y + CELL / 2, COMB.x - COMB.r, COMB.y, "is-outw", 1 + o.w * 9);
        });
        shared.forEach(function (c, k) {
          wire(GRID_X + k * 44 + 36, SHARED_Y + CELL / 2, COMB.x - COMB.r, COMB.y, "is-shared", 2.5);
        });
        combG.classList.add("is-on");
        routerG.classList.remove("is-on");
      }
      function finish() {
        outG.classList.add("is-on");
        outTx.textContent = word + "′";
        readout.innerHTML = "";
        var head = document.createElement("div");
        head.appendChild(document.createTextNode("“" + word + "” → "));
        r.forEach(function (o, k) {
          var b = document.createElement("b");
          b.textContent = "E" + o.e + " " + Math.round(o.w * 100) + "%";
          head.appendChild(b);
          if (k < r.length - 1) head.appendChild(document.createTextNode(" · "));
        });
        head.appendChild(document.createTextNode(" + 2 shared"));
        var foot = document.createElement("div");
        foot.className = "md-foot";
        foot.textContent = "Active: 6 routed + 2 shared experts. Idle this token: 122 routed experts, still loaded in memory.";
        readout.appendChild(head);
        readout.appendChild(foot);
      }

      if (instant || reduce) { pick(); combine(); finish(); return; }
      later(pick, 650);
      later(combine, 1350);
      later(finish, 1900);
    }

    function play() {
      playing = true;
      playBtn.textContent = "❚❚ Pause";
      playBtn.setAttribute("aria-label", "Pause");
      loop();
    }
    function loop() {
      if (!playing) return;
      show(t, false);
      timers.push(setTimeout(loop, 3600));
    }
    function stop() {
      if (!playing) return;
      playing = false;
      clearTimers();
      playBtn.textContent = "▶ Play";
      playBtn.setAttribute("aria-label", "Play");
      // Finish the token that was mid-flight.
      show((t + TOKENS.length - 1) % TOKENS.length, true);
    }

    show(0, true);

    if (!reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { play(); io.disconnect(); } });
      }, { threshold: 0.5 });
      io.observe(root);
    }
  }

  function init() {
    var roots = document.querySelectorAll("figure.moe-demo");
    for (var i = 0; i < roots.length; i++) mount(roots[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
