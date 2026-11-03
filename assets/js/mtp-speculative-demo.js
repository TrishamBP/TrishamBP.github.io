/* Multi-token prediction + speculative decoding, step by step.
   Mounts into every <figure class="mtp-demo">. A lightweight MTP draft head
   proposes 3 tokens, the main model checks them all in one verification
   pass, the longest matching prefix is accepted, and the main model's own
   prediction fills the first mismatch (or adds one bonus token when all
   drafts match). The rounds are scripted for illustration. */
(function () {
  "use strict";

  var CONTEXT = ["Adam", "puts", "the", "ice", "cream", "in", "the", "freezer", "because", "it", "was"];
  // draft: what the MTP head proposes. main: what the main model predicts at
  // each position during verification (one extra for the bonus slot).
  var ROUNDS = [
    { draft: ["melting", "so", "he"], main: ["melting", "so", "Adam"] },
    { draft: ["moved", "it", "quickly"], main: ["moved", "it", "quickly", "."] },
    { draft: ["Now", "it", "is"], main: ["It"] },
    { draft: ["stayed", "frozen", "solid"], main: ["stayed", "frozen", "."] }
  ];

  function mount(root) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var round, phase, passes, produced, timers = [], playing = false, drafts = [];

    root.innerHTML = "";

    var legend = document.createElement("div");
    legend.className = "mtp-legend";
    [["mtp-chip is-ctx", "prompt"], ["mtp-chip is-acc", "accepted"], ["mtp-chip is-draft", "draft (MTP head)"], ["mtp-chip is-main", "from main model"]].forEach(function (l) {
      var s = document.createElement("span");
      var c = document.createElement("span");
      c.className = l[0];
      c.textContent = " ";
      s.appendChild(c);
      s.appendChild(document.createTextNode(l[1]));
      legend.appendChild(s);
    });
    root.appendChild(legend);

    var line = document.createElement("div");
    line.className = "mtp-line";
    root.appendChild(line);

    var phaseEl = document.createElement("div");
    phaseEl.className = "mtp-phase";
    phaseEl.setAttribute("aria-live", "polite");
    var phaseTag = document.createElement("span");
    phaseTag.className = "mtp-phase-tag";
    var phaseText = document.createElement("span");
    phaseEl.appendChild(phaseTag);
    phaseEl.appendChild(phaseText);
    root.appendChild(phaseEl);

    var meter = document.createElement("div");
    meter.className = "mtp-meter";
    root.appendChild(meter);

    var ctrls = document.createElement("div");
    ctrls.className = "mtp-controls";
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
    btn("Next step ▶", "Next step", function () { stop(); advance(); });
    btn("↺ Reset", "Reset", function () { stop(); reset(); });
    root.appendChild(ctrls);

    function chip(text, cls) {
      var c = document.createElement("span");
      c.className = "mtp-chip " + cls;
      c.textContent = text;
      line.appendChild(c);
      if (!reduce) {
        c.classList.add("is-new");
        c.getBoundingClientRect();
        c.classList.remove("is-new");
      }
      return c;
    }
    function later(fn, ms) { timers.push(setTimeout(fn, reduce ? 0 : ms)); }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function setPhase(tag, text) { phaseTag.textContent = tag; phaseText.textContent = text; }

    function bar(label, n, max, cls) {
      var row = document.createElement("div");
      row.className = "mtp-row";
      var l = document.createElement("span");
      l.className = "mtp-row-label";
      l.textContent = label;
      var track = document.createElement("span");
      track.className = "mtp-track";
      for (var i = 0; i < max; i++) {
        var cell = document.createElement("span");
        cell.className = "mtp-cell" + (i < n ? " " + cls : "");
        track.appendChild(cell);
      }
      var v = document.createElement("b");
      v.textContent = n + (n === 1 ? " pass" : " passes");
      row.appendChild(l);
      row.appendChild(track);
      row.appendChild(v);
      return row;
    }
    function updateMeter() {
      meter.innerHTML = "";
      meter.appendChild(bar("plain decoding", produced, 11, "is-plain"));
      meter.appendChild(bar("with MTP drafts", passes, 11, "is-mtp"));
      var note = document.createElement("div");
      note.className = "mtp-note";
      note.textContent = produced + " new tokens so far" + (passes ? " · " + (produced / passes).toFixed(2) + " tokens per main-model pass" : "");
      meter.appendChild(note);
    }

    function reset() {
      clearTimers();
      round = 0; phase = 0; passes = 0; produced = 0; drafts = [];
      line.innerHTML = "";
      CONTEXT.forEach(function (w) {
        var c = document.createElement("span");
        c.className = "mtp-chip is-ctx";
        c.textContent = w;
        line.appendChild(c);
      });
      setPhase("Ready", "The prompt is in. Plain decoding would now run the main model once per new token.");
      updateMeter();
    }

    // Phases per round: 0 draft, 1 verify, 2 judge + commit.
    function advance() {
      clearTimers();
      if (round >= ROUNDS.length) { reset(); return; }
      var R = ROUNDS[round];
      if (phase === 0) {
        drafts = [];
        setPhase("1 · Draft", "The MTP head cheaply guesses the next 3 tokens in one go.");
        R.draft.forEach(function (w, k) {
          later(function () { drafts.push(chip(w, "is-draft")); }, k * 260);
        });
        phase = 1;
      } else if (phase === 1) {
        finishDraft(R);
        setPhase("2 · Verify", "The main model runs once over all 3 drafts at the same time and checks each one.");
        drafts.forEach(function (c) { c.classList.add("is-scan"); });
        passes += 1;
        updateMeter();
        phase = 2;
      } else {
        finishDraft(R);
        var ok = 0;
        while (ok < R.draft.length && R.draft[ok] === R.main[ok]) ok++;
        drafts.forEach(function (c, k) {
          later(function () {
            c.classList.remove("is-scan");
            c.classList.add(k < ok ? "is-ok" : "is-bad");
          }, k * 240);
        });
        later(function () {
          drafts.forEach(function (c, k) {
            if (k < ok) { c.className = "mtp-chip is-acc"; }
            else c.parentNode && c.parentNode.removeChild(c);
          });
          var fix = R.main[ok];
          if (fix) chip(fix, "is-main");
          var gained = ok + (fix ? 1 : 0);
          produced += gained;
          updateMeter();
          var msg;
          if (ok === R.draft.length) msg = "All 3 drafts match, and the same pass yields one bonus token: 4 tokens for 1 main-model pass.";
          else if (ok === 0) msg = "The first draft is wrong, so all 3 are thrown away. The main model's own token is kept: 1 token for 1 pass, no worse than plain decoding.";
          else msg = ok + " drafts match. The first mismatch is replaced by the main model's token: " + gained + " tokens for 1 pass.";
          setPhase("3 · Accept", msg);
          round += 1;
          phase = 0;
          if (round >= ROUNDS.length) {
            later(function () {
              setPhase("Done", produced + " tokens in " + passes + " main-model passes, versus " + produced + " passes one token at a time. Same text, fewer sequential steps.");
            }, 900);
          }
        }, R.draft.length * 240 + 250);
      }
    }
    // Make sure every draft chip exists (if the user clicks fast).
    function finishDraft(R) {
      while (drafts.length < R.draft.length) drafts.push(chip(R.draft[drafts.length], "is-draft"));
    }

    function play() {
      playing = true;
      playBtn.textContent = "❚❚ Pause";
      playBtn.setAttribute("aria-label", "Pause");
      loop();
    }
    function loop() {
      if (!playing) return;
      var wait = round >= ROUNDS.length ? 4200 : phase === 0 ? 1300 : phase === 1 ? 1500 : 2300;
      if (round >= ROUNDS.length) { timers.push(setTimeout(function () { if (playing) { reset(); loop(); } }, wait)); return; }
      advance();
      timers.push(setTimeout(loop, wait));
    }
    function stop() {
      playing = false;
      clearTimers();
      playBtn.textContent = "▶ Play";
      playBtn.setAttribute("aria-label", "Play");
      if (round < ROUNDS.length && phase === 1) finishDraft(ROUNDS[round]);
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
    var roots = document.querySelectorAll("figure.mtp-demo");
    for (var i = 0; i < roots.length; i++) mount(roots[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
