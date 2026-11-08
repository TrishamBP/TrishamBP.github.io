/* The Weekly Tech Brew: Diwali Edition fireworks.
 *
 * Draws on the fixed, click-through <canvas id="nl-fireworks"> that
 * _layouts/post.html adds to issues with `festive: diwali`.
 *
 *   - opening show: a volley of rockets over the first few seconds;
 *   - click / tap the .nl-diwali-greeting card to launch a rocket at that spot;
 *   - ambient rockets only while the greeting card is on screen, so the show
 *     never runs over the stories you are reading;
 *   - the loop stops when nothing is in the air, and pauses in hidden tabs;
 *   - does nothing under prefers-reduced-motion.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("nl-fireworks");
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.remove();
    return;
  }

  var ctx = canvas.getContext("2d");
  var greeting = document.querySelector(".nl-diwali-greeting");

  // Diwali palette: gold, saffron, marigold, rose, white-hot, a little cyan for the space skin.
  var PALETTE = ["#ffc94a", "#ff8a1f", "#ffb000", "#ff4f9a", "#fff3c4", "#7fe7ff", "#ff5a3c", "#b9ff6b"];
  var GRAVITY = 0.045;
  var MAX_PARTICLES = 1400;

  var W = 0, H = 0, dpr = 1;
  var rockets = [], sparks = [];
  var running = false, lastT = 0;
  var greetingVisible = false, ambientTimer = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  /* ---------------------------------------------------------------- rockets */

  function launch(tx, ty) {
    var x = tx == null ? rand(W * 0.12, W * 0.88) : tx;
    var y = ty == null ? rand(H * 0.12, H * 0.42) : ty;
    var sx = x + rand(-W * 0.08, W * 0.08);
    var sy = H + 10;
    var frames = rand(48, 64);                 // flight time in 60fps frames
    rockets.push({
      x: sx, y: sy,
      vx: (x - sx) / frames,
      // solve for v0 so the rocket peaks near the target under gravity
      vy: (y - sy - 0.5 * GRAVITY * frames * frames) / frames,
      life: frames,
      color: pick(PALETTE),
      trail: []
    });
    start();
  }

  function explode(r) {
    var type = pick(["peony", "peony", "ring", "willow", "crackle", "double"]);
    var color = r.color;
    var alt = pick(PALETTE);
    var count, i, a, s;

    if (type === "ring") {
      count = 70;
      var tilt = rand(0.35, 1);
      for (i = 0; i < count; i++) {
        a = (i / count) * Math.PI * 2;
        spark(r.x, r.y, Math.cos(a) * 4.8, Math.sin(a) * 4.8 * tilt, color, 70, 0.985, 2);
      }
      for (i = 0; i < 24; i++) {
        a = rand(0, Math.PI * 2); s = rand(0.3, 1.4);
        spark(r.x, r.y, Math.cos(a) * s, Math.sin(a) * s, "#fff3c4", 40, 0.96, 1.6);
      }
    } else if (type === "willow") {
      // long, heavy gold trails that droop: the classic "golden shower"
      count = 110;
      for (i = 0; i < count; i++) {
        a = rand(0, Math.PI * 2); s = rand(0.8, 4.2);
        spark(r.x, r.y, Math.cos(a) * s, Math.sin(a) * s, i % 3 ? "#ffc94a" : "#ffb000", rand(110, 150), 0.975, 1.6, { gravity: 1.5 });
      }
    } else if (type === "crackle") {
      count = 90;
      for (i = 0; i < count; i++) {
        a = rand(0, Math.PI * 2); s = rand(1, 4.8);
        spark(r.x, r.y, Math.cos(a) * s, Math.sin(a) * s, color, rand(60, 85), 0.965, 1.8, { crackle: true });
      }
    } else {
      // peony (sphere) and double (sphere inside a sphere of another colour)
      count = 120;
      for (i = 0; i < count; i++) {
        a = rand(0, Math.PI * 2); s = Math.sqrt(Math.random()) * 5.6;
        spark(r.x, r.y, Math.cos(a) * s, Math.sin(a) * s, color, rand(65, 95), 0.97, 2);
      }
      if (type === "double") {
        for (i = 0; i < 50; i++) {
          a = rand(0, Math.PI * 2); s = rand(0.8, 2.4);
          spark(r.x, r.y, Math.cos(a) * s, Math.sin(a) * s, alt, rand(55, 75), 0.97, 2);
        }
      }
    }

    // flash
    spark(r.x, r.y, 0, 0, "#ffffff", 8, 1, 26, { flash: true });
  }

  function spark(x, y, vx, vy, color, life, drag, size, opts) {
    if (sparks.length >= MAX_PARTICLES) return;
    opts = opts || {};
    sparks.push({
      x: x, y: y, px: x, py: y, vx: vx, vy: vy,
      color: color, life: life, max: life, drag: drag, size: size,
      g: GRAVITY * (opts.gravity || 1),
      crackle: !!opts.crackle, flash: !!opts.flash
    });
  }

  /* ------------------------------------------------------------------- loop */

  function step(t) {
    if (!running) return;
    var dt = lastT ? Math.min((t - lastT) / 16.667, 3) : 1;  // frame-rate independent
    lastT = t;

    // Fade the previous frame towards transparent: that leaves the trails.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0," + Math.min(0.22 * dt, 0.6) + ")";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    var i, r, p;
    for (i = rockets.length - 1; i >= 0; i--) {
      r = rockets[i];
      r.px = r.x; r.py = r.y;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.vy += GRAVITY * dt;
      r.life -= dt;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r.px, r.py);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
      // a few embers falling off the rocket's tail
      if (Math.random() < 0.6) spark(r.x, r.y, rand(-0.3, 0.3), rand(0.2, 0.8), "#ffb000", rand(12, 22), 0.95, 1.2);
      if (r.life <= 0 || r.vy >= 0) {
        explode(r);
        rockets.splice(i, 1);
      }
    }

    for (i = sparks.length - 1; i >= 0; i--) {
      p = sparks[i];
      p.px = p.x; p.py = p.y;
      var d = Math.pow(p.drag, dt);
      p.vx *= d; p.vy *= d;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }

      var k = p.life / p.max;
      if (p.flash) {
        var grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (1.5 - k));
        grd.addColorStop(0, "rgba(255,247,220," + (0.55 * k) + ")");
        grd.addColorStop(1, "rgba(255,180,60,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.5 - k), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      // crackle sparks strobe on and off near the end of their life
      if (p.crackle && k < 0.45 && Math.random() < 0.5) continue;

      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * (0.4 + 0.6 * k);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (rockets.length || sparks.length) {
      requestAnimationFrame(step);
    } else {
      running = false;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);
    }
  }

  function start() {
    if (running || document.hidden) return;
    running = true;
    lastT = 0;
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------------- triggers */

  function openingShow() {
    var shots = W < 640 ? 9 : 15;
    for (var i = 0; i < shots; i++) {
      setTimeout(function () { launch(); }, 250 + i * rand(260, 380));
    }
  }

  function scheduleAmbient() {
    clearTimeout(ambientTimer);
    if (!greetingVisible) return;
    ambientTimer = setTimeout(function () {
      if (greetingVisible && !document.hidden) {
        launch();
        if (Math.random() < 0.35) setTimeout(function () { launch(); }, rand(150, 400));
      }
      scheduleAmbient();
    }, rand(1800, 3600));
  }

  if (greeting) {
    greeting.addEventListener("click", function (e) {
      if (e.target.closest("a, button")) return;   // keep links usable
      launch(e.clientX, e.clientY);
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        greetingVisible = entries[0].isIntersecting;
        scheduleAmbient();
      }, { threshold: 0.25 }).observe(greeting);
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && (rockets.length || sparks.length)) start();
  });
  window.addEventListener("resize", resize);

  resize();
  openingShow();
})();
