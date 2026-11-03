/* Mamba layer: tokens stream through a fixed-size state.
   Mounts into every <figure class="mamba-demo">. Each token writes into a
   32-cell state (8 x 4) through an input-dependent gate (the "selective" part
   of Mamba), the old state fades by the same amount, and an output is read
   from the updated state. A KV-cache row underneath grows one slot per token
   for comparison. Colours, gates and write patterns are illustrative. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var TOKENS = ["Adam", "puts", "the", "ice", "cream", "in", "the", "freezer", "because", "it", "was", "melting"];
  // How strongly each token writes into the state (selectivity gate).
  var WRITE = [0.7, 0.4, 0.1, 0.8, 0.85, 0.15, 0.1, 0.7, 0.3, 0.5, 0.3, 0.6];
  var COLORS = [
    [3, 170, 92], [9, 174, 161], [133, 133, 133], [212, 91, 182], [184, 57, 154], [120, 120, 120],
    [150, 150, 150], [37, 99, 235], [217, 119, 6], [124, 58, 237], [14, 116, 144], [220, 38, 38]
  ];
  var COLS = 8, ROWS = 4, CELLS = COLS * ROWS;
  var BLANK = [236, 236, 236];

  var W = 900, H = 310, X0 = 45, DX = 73.6, CHIP_W = 66;
  var BOX = { x: 300, y: 92, w: 300, h: 144 };
  var CELL_W = 28, CELL_H = 18, GAP = 4, GRID_X = 324, GRID_Y = 130;
  var KV_X = 214, KV_Y = 268, KV_W = 42, KV_DX = 47;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function cx(i) { return X0 + i * DX; }
  function rgb(c) { return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; }
  // Deterministic per-token write pattern over the 32 cells, in [0, 1].
  function pattern(i) {
    var out = [], s = (i + 1) * 2654435761 % 4294967296;
    for (var c = 0; c < CELLS; c++) {
      s = (s * 1664525 + 1013904223) % 4294967296;
      var r = s / 4294967296;
      out.push(r > 0.55 ? 0.6 + 0.4 * r : r * 0.35);
    }
    return out;
  }

  function mount(root) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var state, t, timers = [], playing = false, inflight = null;

    root.innerHTML = "";
    var scroller = document.createElement("div");
    scroller.className = "nd-scroll";
    root.appendChild(scroller);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Tokens of the sentence Adam puts the ice cream in the freezer because it was melting flow one by one through a Mamba layer with a fixed-size state, while an attention KV cache grows by one entry per token" }, scroller);

    // Token row + output markers
    var toks = [], outs = [];
    TOKENS.forEach(function (w, i) {
      var g = el("g", { "class": "nd-tok is-future" }, svg);
      el("rect", { x: cx(i) - CHIP_W / 2, y: 12, width: CHIP_W, height: 30, rx: 3, "class": "nd-chip" }, g);
      var tx = el("text", { x: cx(i), y: 32, "text-anchor": "middle", "class": "nd-word" }, g);
      tx.textContent = w;
      toks.push(g);
      outs.push(el("rect", { x: cx(i) - 20, y: 48, width: 40, height: 7, rx: 1, "class": "nd-out" }, svg));
    });

    // Mamba box
    el("rect", { x: BOX.x, y: BOX.y, width: BOX.w, height: BOX.h, rx: 4, "class": "nd-box" }, svg);
    var title = el("text", { x: BOX.x + 12, y: BOX.y + 22, "class": "nd-label" }, svg);
    title.textContent = "Mamba layer · state = 32 numbers";
    var cells = [];
    for (var c = 0; c < CELLS; c++) {
      var col = c % COLS, row = Math.floor(c / COLS);
      cells.push(el("rect", { x: GRID_X + col * (CELL_W + GAP), y: GRID_Y + row * (CELL_H + GAP), width: CELL_W, height: CELL_H, rx: 2, "class": "nd-cell" }, svg));
    }
    var inLbl = el("text", { x: BOX.x - 8, y: 175, "text-anchor": "end", "class": "nd-small" }, svg);
    inLbl.textContent = "token in →";
    var outLbl2 = el("text", { x: BOX.x + BOX.w + 8, y: 175, "class": "nd-small" }, svg);
    outLbl2.textContent = "→ output";

    // Gate meter
    var GX = 660, GY = 118;
    var gTitle = el("text", { x: GX, y: GY - 8, "class": "nd-label" }, svg);
    gTitle.textContent = "selective gate";
    el("rect", { x: GX, y: GY, width: 200, height: 14, "class": "nd-track" }, svg);
    var writeBar = el("rect", { x: GX, y: GY, width: 200, height: 14, "class": "nd-bar-write" }, svg);
    var writeTxt = el("text", { x: GX, y: GY + 30, "class": "nd-small" }, svg);
    el("rect", { x: GX, y: GY + 42, width: 200, height: 14, "class": "nd-track" }, svg);
    var keepBar = el("rect", { x: GX, y: GY + 42, width: 200, height: 14, "class": "nd-bar-keep" }, svg);
    var keepTxt = el("text", { x: GX, y: GY + 72, "class": "nd-small" }, svg);

    // Moving dots
    var dotIn = el("circle", { r: 7, cx: 0, cy: 0, "class": "nd-dot" }, svg);
    var dotOut = el("circle", { r: 7, cx: 0, cy: 0, "class": "nd-dot is-out" }, svg);

    // KV cache comparison row
    var kvLbl = el("text", { x: 4, y: KV_Y + 19, "class": "nd-label" }, svg);
    kvLbl.textContent = "attention KV cache";
    var kv = [];
    for (var k = 0; k < TOKENS.length; k++) {
      kv.push(el("rect", { x: KV_X + k * KV_DX, y: KV_Y, width: KV_W, height: 26, rx: 2, "class": "nd-kv" }, svg));
    }

    var readout = document.createElement("div");
    readout.className = "nd-readout";
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
    btn("Next token ▶", "Feed the next token", function () { stop(); step(true); });
    btn("↺ Reset", "Reset", function () { stop(); reset(); });
    root.appendChild(ctrls);

    function place(dot, x, y, instant) {
      if (instant || reduce) {
        dot.classList.add("is-jump");
        dot.style.transform = "translate(" + x + "px," + y + "px)";
        dot.getBoundingClientRect();
        dot.classList.remove("is-jump");
      } else {
        dot.style.transform = "translate(" + x + "px," + y + "px)";
      }
    }
    function later(fn, ms) { timers.push(setTimeout(fn, reduce ? 0 : ms)); }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function paint() {
      for (var c = 0; c < CELLS; c++) cells[c].style.fill = rgb(state[c]);
    }
    function setGate(w) {
      writeBar.style.transform = "scaleX(" + w + ")";
      keepBar.style.transform = "scaleX(" + (1 - w) + ")";
      writeTxt.textContent = "write new: " + Math.round(w * 100) + "%";
      keepTxt.textContent = "keep old: " + Math.round((1 - w) * 100) + "%";
    }
    function status() {
      var n = t;
      readout.innerHTML = "";
      var parts = [
        ["tokens read", String(n)],
        ["Mamba state", CELLS + " numbers (fixed)"],
        ["KV cache", n + (n === 1 ? " entry" : " entries") + " (growing)"]
      ];
      parts.forEach(function (p) {
        var s = document.createElement("span");
        var b = document.createElement("b");
        b.textContent = p[1];
        s.appendChild(document.createTextNode(p[0] + ": "));
        s.appendChild(b);
        readout.appendChild(s);
      });
    }

    function reset() {
      clearTimers();
      t = 0;
      inflight = null;
      state = [];
      for (var c = 0; c < CELLS; c++) state.push(BLANK.slice());
      paint();
      setGate(0);
      writeTxt.textContent = "write new: –";
      keepTxt.textContent = "keep old: –";
      toks.forEach(function (g) { g.setAttribute("class", "nd-tok is-future"); });
      outs.forEach(function (o) { o.style.fill = ""; o.classList.remove("is-on"); });
      kv.forEach(function (r) { r.style.fill = ""; r.classList.remove("is-on"); });
      dotIn.classList.remove("is-on");
      dotOut.classList.remove("is-on");
      status();
    }

    // h_t = (1 - a) * h_{t-1} + a * x_t, with a = gate * per-cell pattern
    function apply(i) {
      if (t > i) return;
      var w = WRITE[i], col = COLORS[i], pat = pattern(i);
      dotIn.classList.remove("is-on");
      setGate(w);
      for (var c = 0; c < CELLS; c++) {
        var a = w * pat[c];
        for (var ch = 0; ch < 3; ch++) state[c][ch] = state[c][ch] * (1 - a) + col[ch] * a;
      }
      paint();
      kv[i].style.fill = rgb(col);
      kv[i].classList.add("is-on");
      t = i + 1;
      inflight = null;
      status();
    }

    // Feed token t through the layer. Returns false when the sentence is done.
    function step(manual) {
      if (t >= TOKENS.length) { reset(); return true; }
      clearTimers();
      var i = t, col = COLORS[i];
      toks.forEach(function (g, j) {
        g.setAttribute("class", "nd-tok " + (j < i ? "is-done" : j === i ? "is-now" : "is-future"));
      });

      dotIn.style.fill = rgb(col);
      place(dotIn, cx(i), 42, true);
      dotIn.classList.add("is-on");
      later(function () { place(dotIn, BOX.x + 6, 172); }, 30);

      inflight = i;
      later(function () { apply(i); }, 560);

      later(function () {
        var avg = [0, 0, 0];
        state.forEach(function (s) { avg[0] += s[0] / CELLS; avg[1] += s[1] / CELLS; avg[2] += s[2] / CELLS; });
        dotOut.style.fill = rgb(avg);
        place(dotOut, BOX.x + BOX.w - 6, 172, true);
        dotOut.classList.add("is-on");
        later(function () { place(dotOut, cx(i), 52); }, 30);
        later(function () {
          dotOut.classList.remove("is-on");
          outs[i].style.fill = rgb(avg);
          outs[i].classList.add("is-on");
          toks[i].setAttribute("class", "nd-tok is-done");
        }, 520);
      }, 1000);
      return true;
    }

    function play() {
      playing = true;
      playBtn.textContent = "❚❚ Pause";
      playBtn.setAttribute("aria-label", "Pause");
      loop();
    }
    function loop() {
      if (!playing) return;
      if (t >= TOKENS.length) {
        timers.push(setTimeout(function () { if (playing) { reset(); loop(); } }, 3200));
        return;
      }
      step(false);
      timers.push(setTimeout(loop, 1900));
    }
    function stop() {
      playing = false;
      clearTimers();
      playBtn.textContent = "▶ Play";
      playBtn.setAttribute("aria-label", "Play");
      // Settle any half-finished token so the picture stays consistent.
      if (inflight !== null) apply(inflight);
      dotIn.classList.remove("is-on");
      dotOut.classList.remove("is-on");
      for (var j = 0; j < t; j++) {
        toks[j].setAttribute("class", "nd-tok is-done");
        if (!outs[j].classList.contains("is-on")) {
          var avg = [0, 0, 0];
          state.forEach(function (s) { avg[0] += s[0] / CELLS; avg[1] += s[1] / CELLS; avg[2] += s[2] / CELLS; });
          outs[j].style.fill = rgb(avg);
          outs[j].classList.add("is-on");
        }
      }
    }

    reset();

    if (!reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { play(); io.disconnect(); } });
      }, { threshold: 0.5 });
      io.observe(root);
    }
  }

  function init() {
    var roots = document.querySelectorAll("figure.mamba-demo");
    for (var i = 0; i < roots.length; i++) mount(roots[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
