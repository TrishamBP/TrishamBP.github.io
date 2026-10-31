/* Homepage text-only hero (_includes/hero-text.html). No Three.js.
   Drives the same classes / custom properties as the old 3D hero
   (assets/js/neural-core/main.js) so css/neural-core.css still applies:
     nc-is-live nc-story     tall scroll section with a sticky stage
     nc-t-name / -tag / -cta intro steps, nc-t-done when finished
     nc-scrolled             title block retires once you start scrolling
     --nc-out (0 → 1)        handoff to "02 Who builds it"
     --nc-words (0 → 4)      ENGINEER → BUILDER → RESEARCHER → POLYMATH */
(function () {
  var root = document.getElementById("neural-core");
  if (!root) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function measure() {
    var nav = document.querySelector(".topnav");
    root.style.setProperty("--nc-nav", (nav ? nav.offsetHeight : 0) + "px");
    root.style.setProperty("--nc-vw", document.documentElement.clientWidth + "px");
  }
  measure();

  root.classList.add("nc-is-live", "nc-story");

  function smooth(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function progress() {
    var stage = root.querySelector(".nc-stage");
    var r = root.getBoundingClientRect();
    var span = r.height - (stage ? stage.clientHeight : window.innerHeight);
    return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  }

  /* Intro: kicker + name, then keywords + lede, then the scroll cue.
     Skipped when the page loads already scrolled or with reduced motion. */
  var steps = [[150, "nc-t-name"], [650, "nc-t-tag"], [1150, "nc-t-cta"]];
  function finishIntro() {
    steps.forEach(function (s) { root.classList.add(s[1]); });
    root.classList.add("nc-t-done");
  }
  if (reduced || progress() > 0.02) {
    finishIntro();
  } else {
    steps.forEach(function (s) {
      setTimeout(function () { root.classList.add(s[1]); }, s[0]);
    });
    setTimeout(function () { root.classList.add("nc-t-done"); }, 1500);
  }

  var ticking = false;
  function update() {
    ticking = false;
    var p = progress();
    root.classList.toggle("nc-scrolled", p > 0.035);
    var out = smooth(0.06, 0.3, p);
    root.style.setProperty("--nc-out", out.toFixed(3));
    root.classList.toggle("nc-handoff-on", out > 0.02);
    /* ENGINEER arrives with the handoff; the other three follow on scroll. */
    var words = out < 0.6 ? 0 : 1 + 3 * smooth(0.32, 0.82, p);
    root.style.setProperty("--nc-words", words.toFixed(3));
  }
  function request() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", function () { measure(); request(); }, { passive: true });
  update();
})();
