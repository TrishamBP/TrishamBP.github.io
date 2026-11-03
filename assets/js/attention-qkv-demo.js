/* Query / Key / Value attention step-through.
   Mounts into every <figure class="qkv-demo">. Sentence and weights are
   illustrative (hand-picked so the softmax story reads clearly), not taken
   from a real model. Scores are ln(weight) + 5, so softmax(scores) gives the
   weights back exactly. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var TOKENS = ["Adam", "puts", "the", "ice", "cream", "in", "the", "freezer", "because", "it", "was", "melting"];
  var QI = 9; // "it"

  var HEADS = [
    {
      name: "Head 1: what does “it” refer to?",
      query: "“it” asks: which earlier thing am I talking about?",
      weights: [0.06, 0.02, 0.01, 0.22, 0.38, 0.02, 0.01, 0.16, 0.04, 0.08],
      result: "This head gives “ice” + “cream” 60% of the weight, so the new vector for “it” now mostly encodes the ice cream."
    },
    {
      name: "Head 2: what is next to me?",
      query: "“it” asks: which words sit right before me?",
      weights: [0.01, 0.02, 0.02, 0.03, 0.04, 0.05, 0.06, 0.14, 0.35, 0.28],
      result: "Same sentence, different head: this one mostly mixes in the words right before “it”. Each head learns its own way to match and combine."
    }
  ];

  var STEPS = [
    { tag: "Start", text: "Every token starts out as a vector of numbers: its current representation." },
    { tag: "Query", text: null }, // filled from the head
    { tag: "Keys", text: "Every token up to “it” offers a key that says what it is about. “was” and “melting” come later, so a model that only looks backward can’t see them yet." },
    { tag: "Scores", text: "The query is compared with each key (a dot product). A bigger number means a better match." },
    { tag: "Weights", text: "Softmax turns the scores into weights that add up to 100%." },
    { tag: "Values", text: "Each token sends its value toward “it”, scaled by its weight. A thicker line carries more information." },
    { tag: "Result", text: null } // filled from the head
  ];

  // Geometry (SVG user units)
  var W = 900, H = 330, X0 = 45, DX = 73.6, CHIP_W = 66, CHIP_H = 34, CHIP_Y = 150;
  var TAG_Y = 194, BAR_Y = 226, BAR_H = 66, NUM_Y = 312;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function cx(i) { return X0 + i * DX; }

  function mount(root) {
    var head = 0, step = 0, timer = null, playing = false;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    root.innerHTML = "";

    // Head switcher
    var heads = document.createElement("div");
    heads.className = "qkv-heads";
    heads.setAttribute("role", "group");
    heads.setAttribute("aria-label", "Attention head");
    var headBtns = HEADS.map(function (h, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = h.name;
      b.addEventListener("click", function () { head = i; render(); });
      heads.appendChild(b);
      return b;
    });
    root.appendChild(heads);

    // Stage
    var scroller = document.createElement("div");
    scroller.className = "qkv-scroll";
    root.appendChild(scroller);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Attention over the sentence: Adam puts the ice cream in the freezer because it was melting" }, scroller);

    var arcLayer = el("g", { "class": "qkv-arcs" }, svg);
    var arcs = [];
    for (var a = 0; a < QI; a++) {
      var x1 = cx(a), x2 = cx(QI), d = QI - a;
      var peak = Math.min(18 + d * 14, 138), c = peak / 0.75;
      var p = el("path", {
        d: "M" + x1 + " " + CHIP_Y + " C" + x1 + " " + (CHIP_Y - c) + " " + x2 + " " + (CHIP_Y - c) + " " + x2 + " " + CHIP_Y,
        "class": "qkv-arc"
      }, arcLayer);
      arcs.push(p);
    }

    var toks = [], tags = [], bars = [], nums = [];
    TOKENS.forEach(function (t, i) {
      var g = el("g", { "class": "qkv-tok" + (i > QI ? " is-future" : "") + (i === QI ? " is-query" : "") }, svg);
      el("rect", { x: cx(i) - CHIP_W / 2, y: CHIP_Y, width: CHIP_W, height: CHIP_H, rx: 3, "class": "qkv-chip" }, g);
      var tx = el("text", { x: cx(i), y: CHIP_Y + 22, "text-anchor": "middle", "class": "qkv-word" }, g);
      tx.textContent = t;
      toks.push(g);

      var tg = el("g", { "class": "qkv-tag" }, svg);
      el("rect", { x: cx(i) - 15, y: TAG_Y, width: 30, height: 20, rx: 2 }, tg);
      var tt = el("text", { x: cx(i), y: TAG_Y + 14.5, "text-anchor": "middle" }, tg);
      tags.push({ g: tg, t: tt });

      if (i <= QI) {
        bars.push(el("rect", { x: cx(i) - 12, y: BAR_Y, width: 24, height: BAR_H, "class": "qkv-bar" }, svg));
        var nt = el("text", { x: cx(i), y: NUM_Y, "text-anchor": "middle", "class": "qkv-num" }, svg);
        nums.push(nt);
      }
    });

    // Caption + controls
    var cap = document.createElement("div");
    cap.className = "qkv-caption";
    cap.setAttribute("aria-live", "polite");
    var capTag = document.createElement("span");
    capTag.className = "qkv-step-tag";
    var capText = document.createElement("span");
    cap.appendChild(capTag);
    cap.appendChild(capText);
    root.appendChild(cap);

    var readout = document.createElement("div");
    readout.className = "qkv-readout";
    root.appendChild(readout);

    var ctrls = document.createElement("div");
    ctrls.className = "qkv-controls";
    function btn(label, aria, fn) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.setAttribute("aria-label", aria);
      b.addEventListener("click", fn);
      ctrls.appendChild(b);
      return b;
    }
    btn("◀ Prev", "Previous step", function () { stop(); go(step - 1); });
    var playBtn = btn("▶ Play", "Play", function () { playing ? stop() : play(); });
    btn("Next ▶", "Next step", function () { stop(); go(step + 1); });
    var dots = document.createElement("span");
    dots.className = "qkv-dots";
    var dotEls = STEPS.map(function (s, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.setAttribute("aria-label", "Step " + (i + 1) + ": " + s.tag);
      d.addEventListener("click", function () { stop(); go(i); });
      dots.appendChild(d);
      return d;
    });
    ctrls.appendChild(dots);
    root.appendChild(ctrls);

    function go(s) {
      step = (s + STEPS.length) % STEPS.length;
      render();
    }
    function play() {
      playing = true;
      playBtn.textContent = "❚❚ Pause";
      playBtn.setAttribute("aria-label", "Pause");
      tick();
    }
    function tick() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (!playing) return;
        if (step === STEPS.length - 1) { head = (head + 1) % HEADS.length; go(0); }
        else go(step + 1);
        tick();
      }, step === STEPS.length - 1 ? 4500 : 2600);
    }
    function stop() {
      playing = false;
      clearTimeout(timer);
      playBtn.textContent = "▶ Play";
      playBtn.setAttribute("aria-label", "Play");
    }

    function render() {
      var h = HEADS[head], w = h.weights;
      var maxW = Math.max.apply(null, w);
      var scores = w.map(function (x) { return Math.log(x) + 5; });
      var maxS = Math.max.apply(null, scores);

      headBtns.forEach(function (b, i) { b.setAttribute("aria-pressed", i === head ? "true" : "false"); });
      dotEls.forEach(function (d, i) { d.classList.toggle("is-on", i === step); });

      root.classList.toggle("show-future", step >= 2);

      toks[QI].classList.toggle("is-mixed", step === 6);
      toks.forEach(function (g, i) {
        g.classList.toggle("is-lit", i < QI && step >= 4 && w[i] >= 0.14);
      });

      tags.forEach(function (o, i) {
        var label = "", cls = "qkv-tag";
        if (i === QI && step >= 1) { label = "Q"; cls += " is-q"; }
        else if (i < QI && step >= 2 && step <= 4) { label = "K"; cls += " is-k"; }
        else if (i < QI && step >= 5) { label = "V"; cls += " is-v"; }
        else cls += " is-off";
        o.t.textContent = label;
        o.g.setAttribute("class", cls);
      });

      arcs.forEach(function (p, i) {
        var cls = "qkv-arc", sw = 1.2, op = 0;
        if (step === 2 || step === 3) { cls += " is-cmp"; op = 0.55; }
        else if (step === 4) { cls += " is-cmp"; op = 0.15 + 0.85 * (w[i] / maxW); }
        else if (step >= 5) { cls += " is-flow"; sw = 1 + w[i] * 26; op = 0.25 + 0.75 * (w[i] / maxW); }
        if (step >= 5 && reduce) cls += " no-anim";
        p.setAttribute("class", cls);
        p.style.strokeWidth = sw;
        p.style.opacity = op;
      });

      bars.forEach(function (b, i) {
        var k = 0, txt = "";
        if (step === 3) { k = Math.max(scores[i], 0.05) / maxS; txt = scores[i].toFixed(1); }
        else if (step >= 4) { k = w[i] / maxW; txt = Math.round(w[i] * 100) + "%"; }
        b.style.transform = "scaleY(" + k + ")";
        b.setAttribute("class", "qkv-bar" + (step >= 5 ? " is-v" : step === 4 ? " is-w" : ""));
        nums[i].textContent = txt;
      });

      var s = STEPS[step];
      capTag.textContent = (step + 1) + " / " + STEPS.length + " · " + s.tag;
      capText.textContent = step === 1 ? "Query. " + h.query : step === 6 ? h.result : s.text;

      if (step === 6) {
        var top = w.slice(0, QI + 1).map(function (x, i) { return { t: TOKENS[i], x: x }; })
          .sort(function (a, b) { return b.x - a.x; }).slice(0, 4);
        readout.textContent = "new “it” = " + top.map(function (o) {
          return Math.round(o.x * 100) + "% × V(" + o.t + ")";
        }).join(" + ") + " + …";
        readout.classList.add("is-on");
      } else {
        readout.textContent = "";
        readout.classList.remove("is-on");
      }
    }

    render();

    // Autoplay once the demo scrolls into view (skipped for reduced motion).
    if (!reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { play(); io.disconnect(); }
        });
      }, { threshold: 0.5 });
      io.observe(root);
    }
  }

  function init() {
    var roots = document.querySelectorAll("figure.qkv-demo");
    for (var i = 0; i < roots.length; i++) mount(roots[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
