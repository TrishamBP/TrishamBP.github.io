/* =============================================================================
   Physical Systems — procedural backdrop
   -----------------------------------------------------------------------------
   Draws a fixed full-screen scene on `.ps-canvas`, entirely in code:

     1. a near-black void with a blue glow low-left and a violet haze right,
        a perspective blueprint grid floor, faint vertical light streaks and
        a few translucent violet planes            (cached; redrawn on resize)
     2. two cyan wireframe turbines — a solid-lit one and a larger ghost —
        whose fan blades turn slowly                              (per frame)
     3. orange/amber flow streamlines following a smooth vector field, with
        occasional white sparks, on a fading trail layer           (per frame)

   Pauses when the tab is hidden; `prefers-reduced-motion` renders a still.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.querySelector(".ps-canvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.25);

  var CYAN = "79,210,255";
  var BLUE = "47,125,255";
  var ORANGE = "255,138,61";
  var AMBER = "255,181,77";
  var VIOLET = "155,107,255";
  var WHITE = "238,246,255";

  var W, H, bg, bgCtx, trail, trailCtx, particles, turbines, scrim;

  function layer(w, h) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  /* ---- 1. Static backdrop ------------------------------------------------ */

  function drawBackdrop() {
    var g = bgCtx;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.fillStyle = "#03050b";
    g.fillRect(0, 0, W, H);

    // Blue glow low-left, violet haze right, warm ember centre-right.
    [
      [W * 0.22, H * 0.78, Math.max(W, H) * 0.7, BLUE, 0.22],
      [W * 0.86, H * 0.32, Math.max(W, H) * 0.6, VIOLET, 0.18],
      [W * 0.66, H * 0.5, Math.max(W, H) * 0.35, ORANGE, 0.07],
    ].forEach(function (s) {
      var r = g.createRadialGradient(s[0], s[1], 0, s[0], s[1], s[2]);
      r.addColorStop(0, "rgba(" + s[3] + "," + s[4] + ")");
      r.addColorStop(1, "rgba(" + s[3] + ",0)");
      g.fillStyle = r;
      g.fillRect(0, 0, W, H);
    });

    // Perspective blueprint floor.
    var hz = H * 0.46, vx = W * 0.5;
    g.lineWidth = 1;
    for (var i = -24; i <= 24; i++) {
      var x = vx + i * (W / 10);
      g.strokeStyle = "rgba(" + CYAN + ",0.07)";
      g.beginPath();
      g.moveTo(vx + i * 6, hz);
      g.lineTo(x, H);
      g.stroke();
    }
    for (var k = 1; k < 16; k++) {
      var t = Math.pow(k / 16, 2.2);
      var y = hz + (H - hz) * t;
      g.strokeStyle = "rgba(" + CYAN + "," + (0.03 + 0.07 * t).toFixed(3) + ")";
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }

    // Faint vertical light streaks.
    var seed = 7;
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }
    for (var s = 0; s < 70; s++) {
      var sx = rnd() * W, top = rnd() * H * 0.5, len = H * (0.2 + rnd() * 0.5);
      var lg = g.createLinearGradient(sx, top, sx, top + len);
      lg.addColorStop(0, "rgba(" + BLUE + ",0)");
      lg.addColorStop(0.5, "rgba(" + BLUE + "," + (0.05 + rnd() * 0.08).toFixed(3) + ")");
      lg.addColorStop(1, "rgba(" + BLUE + ",0)");
      g.strokeStyle = lg;
      g.lineWidth = 1 + rnd() * 2;
      g.beginPath();
      g.moveTo(sx, top);
      g.lineTo(sx, top + len);
      g.stroke();
    }

    // Translucent violet planes, drifting diagonally like folded sheets.
    for (var p = 0; p < 5; p++) {
      var px = W * (0.48 + rnd() * 0.5), py = H * (0.08 + rnd() * 0.7);
      var pw = W * (0.14 + rnd() * 0.18), ph = H * (0.18 + rnd() * 0.25);
      var skew = (rnd() - 0.5) * pw * 0.8;
      var pg = g.createLinearGradient(px, py, px + pw, py + ph);
      pg.addColorStop(0, "rgba(" + VIOLET + ",0.10)");
      pg.addColorStop(1, "rgba(" + VIOLET + ",0.02)");
      g.fillStyle = pg;
      g.strokeStyle = "rgba(" + VIOLET + ",0.18)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + pw, py + skew * 0.4);
      g.lineTo(px + pw + skew, py + ph);
      g.lineTo(px + skew * 0.3, py + ph * 0.92);
      g.closePath();
      g.fill();
      g.stroke();
    }
  }

  /* ---- 2. Wireframe turbines -------------------------------------------- */

  function makeTurbines() {
    var m = Math.min(W, H);
    var narrow = W < 760;
    return [
      // Lit turbine (front-left).
      { x: W * (narrow ? 0.7 : 0.6), y: H * (narrow ? 0.74 : 0.54), r: m * (narrow ? 0.24 : 0.28), depth: m * 0.4,
        blades: 30, alpha: narrow ? 0.6 : 0.8, speed: 0.12, phase: 0 },
      // Ghost wireframe twin (right, larger, dimmer).
      { x: W * (narrow ? 0.98 : 0.84), y: H * (narrow ? 0.9 : 0.72), r: m * (narrow ? 0.26 : 0.34), depth: m * 0.48,
        blades: 34, alpha: narrow ? 0.3 : 0.38, speed: -0.08, phase: 1.3 },
    ];
  }

  // Front face is a tilted ellipse; the nacelle extends back-right by `depth`.
  function drawTurbine(tb, time) {
    var rx = tb.r * 0.62, ry = tb.r;
    var bx = tb.depth * 0.8, by = -tb.depth * 0.32; // back-face offset
    var a = tb.alpha;
    function pt(cx, cy, s, ang) {
      return [cx + rx * s * Math.cos(ang), cy + ry * s * Math.sin(ang)];
    }
    ctx.lineCap = "round";

    // Nacelle: back rings + longitudinal ribs.
    var ribs = 36;
    for (var pass = 0; pass < 2; pass++) {
      ctx.lineWidth = pass === 0 ? 3 : 1;
      var alphaMul = pass === 0 ? 0.12 : 0.5;
      ctx.strokeStyle = "rgba(" + CYAN + "," + (a * alphaMul).toFixed(3) + ")";
      for (var ring = 0; ring < 4; ring++) {
        var f = ring / 3, sc = 1 - f * 0.35;
        ctx.beginPath();
        ctx.ellipse(tb.x + bx * f, tb.y + by * f, rx * sc, ry * sc, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      for (var i = 0; i < ribs; i++) {
        var ang = (i / ribs) * Math.PI * 2;
        var p0 = pt(tb.x, tb.y, 1, ang);
        var p1 = [tb.x + bx + rx * 0.65 * Math.cos(ang), tb.y + by + ry * 0.65 * Math.sin(ang)];
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
      }
      ctx.stroke();
    }

    // Front rim teeth.
    ctx.strokeStyle = "rgba(" + CYAN + "," + (a * 0.7).toFixed(3) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var t = 0; t < 90; t++) {
      var ta = (t / 90) * Math.PI * 2;
      var q0 = pt(tb.x, tb.y, 1, ta), q1 = pt(tb.x, tb.y, 1.05, ta);
      ctx.moveTo(q0[0], q0[1]);
      ctx.lineTo(q1[0], q1[1]);
    }
    ctx.stroke();

    // Fan blades: curved, twisting spokes that turn slowly.
    var rot = tb.phase + time * tb.speed;
    for (var bp = 0; bp < 2; bp++) {
      ctx.lineWidth = bp === 0 ? 4 : 1.2;
      ctx.strokeStyle = bp === 0
        ? "rgba(" + BLUE + "," + (a * 0.14).toFixed(3) + ")"
        : "rgba(" + WHITE + "," + (a * 0.55).toFixed(3) + ")";
      ctx.beginPath();
      for (var b = 0; b < tb.blades; b++) {
        var ba = rot + (b / tb.blades) * Math.PI * 2;
        var h0 = pt(tb.x, tb.y, 0.16, ba);
        var mid = pt(tb.x, tb.y, 0.6, ba + 0.22);
        var tip = pt(tb.x, tb.y, 0.96, ba + 0.38);
        ctx.moveTo(h0[0], h0[1]);
        ctx.quadraticCurveTo(mid[0], mid[1], tip[0], tip[1]);
      }
      ctx.stroke();
    }

    // Hub.
    var hub = ctx.createRadialGradient(tb.x, tb.y, 0, tb.x, tb.y, rx * 0.2);
    hub.addColorStop(0, "rgba(" + WHITE + "," + (a * 0.9).toFixed(3) + ")");
    hub.addColorStop(1, "rgba(" + CYAN + ",0)");
    ctx.fillStyle = hub;
    ctx.beginPath();
    ctx.ellipse(tb.x, tb.y, rx * 0.2, ry * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // A few warm accents on the casing, like heated components.
    ctx.strokeStyle = "rgba(" + ORANGE + "," + (a * 0.8).toFixed(3) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var e = 0; e < 4; e++) {
      var ea = -1.25 + e * 0.12;
      var e0 = [tb.x + bx * 0.25 + rx * 1.01 * Math.cos(ea), tb.y + by * 0.25 + ry * 1.01 * Math.sin(ea)];
      var e1 = [tb.x + bx * 0.62 + rx * 0.82 * Math.cos(ea), tb.y + by * 0.62 + ry * 0.82 * Math.sin(ea)];
      ctx.moveTo(e0[0], e0[1]);
      ctx.lineTo(e1[0], e1[1]);
    }
    ctx.stroke();
  }

  /* ---- 3. Flow streamlines ---------------------------------------------- */

  function field(x, y, time) {
    var nx = x / W, ny = y / H;
    return (
      -0.35 +
      Math.sin(nx * 5.1 + time * 0.13) * 0.9 +
      Math.cos(ny * 6.3 - time * 0.09 + nx * 2.0) * 0.7
    );
  }

  function spawn(p, initial) {
    p.x = W * (0.2 + Math.random() * 0.8);
    p.y = initial ? Math.random() * H : H * (Math.random() * 0.9);
    p.life = 120 + Math.random() * 220;
    var r = Math.random();
    p.color = r < 0.62 ? ORANGE : r < 0.88 ? AMBER : VIOLET;
    p.width = 0.6 + Math.random() * 1.6;
    p.spark = Math.random() < 0.05;
    return p;
  }

  function makeParticles() {
    var n = Math.round(Math.min(220, (W * H) / 7000));
    var list = [];
    for (var i = 0; i < n; i++) list.push(spawn({}, true));
    return list;
  }

  function stepTrails(time) {
    var g = trailCtx;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "rgba(0,0,0,0.012)";
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var ang = field(p.x, p.y, time);
      var nx = p.x + Math.cos(ang) * 3, ny = p.y + Math.sin(ang) * 3;
      g.strokeStyle = "rgba(" + p.color + ",0.32)";
      g.lineWidth = p.width;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(nx, ny);
      g.stroke();
      if (p.spark && Math.random() < 0.08) {
        g.fillStyle = "rgba(" + WHITE + ",0.9)";
        g.fillRect(nx - 1, ny - 1, 2, 2);
      }
      p.x = nx;
      p.y = ny;
      if (--p.life <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) spawn(p, false);
    }
  }

  /* ---- Frame loop -------------------------------------------------------- */

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    bg = layer(canvas.width, canvas.height);
    bgCtx = bg.getContext("2d");
    trail = layer(canvas.width, canvas.height);
    trailCtx = trail.getContext("2d");
    drawBackdrop();
    var narrowScrim = W < 760;
    scrim = ctx.createLinearGradient(0, 0, W, 0);
    scrim.addColorStop(0, "rgba(3,5,11," + (narrowScrim ? 0.55 : 0.72) + ")");
    scrim.addColorStop(narrowScrim ? 0.7 : 0.38, "rgba(3,5,11," + (narrowScrim ? 0.35 : 0.45) + ")");
    scrim.addColorStop(narrowScrim ? 1 : 0.62, "rgba(3,5,11,0)");
    turbines = makeTurbines();
    particles = makeParticles();
  }

  function frame(time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    turbines.slice().reverse().forEach(function (tb) {
      drawTurbine(tb, time);
    });
    stepTrails(time);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(trail, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    // Reading scrim: keeps the heading and intro (left column) legible.
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);
  }

  var running = false, start = null;
  function loop(ts) {
    if (!running) return;
    if (start === null) start = ts;
    frame((ts - start) / 1000);
    requestAnimationFrame(loop);
  }

  function play() {
    if (running || reduceMotion) return;
    running = true;
    start = null;
    requestAnimationFrame(loop);
  }

  resize();
  if (reduceMotion) {
    // Still frame: grow the streamlines for a while first so they read.
    for (var i = 0; i < 420; i++) stepTrails(i / 60);
    frame(0);
  } else {
    play();
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (reduceMotion) frame(0);
    }, 150);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) running = false;
    else play();
  });
})();
