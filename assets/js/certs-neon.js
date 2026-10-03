/* =============================================================================
   Certifications — neon grid backdrop
   -----------------------------------------------------------------------------
   Draws a fixed full-screen scene on `.gn-canvas`: a perspective grid floor,
   a lit horizon with an outlined ridge, data pulses running down the grid,
   and three light racers that ride the grid lines, turn at nodes and leave
   fading walls of light behind them.

   Pseudo-3D: world floor coords (x, z) with y up; a fixed camera projects
   them with  sx = cx + f·x/z,  sy = hz + f·(camH − y)/z.
   Pauses when the tab is hidden; `prefers-reduced-motion` renders a still.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.querySelector(".gn-canvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.25);

  var CYAN = "77,243,255";
  var ORANGE = "255,154,60";
  var WHITE = "233,253,255";

  // World layout.
  var CELL = 2; // grid spacing (world units)
  var X_MIN = -18, X_MAX = 18; // racer arena
  var Z_MIN = 4, Z_MAX = 40;
  var CAM_H = 1.6; // camera height
  var WALL_H = 0.55; // light wall height
  var TRAIL_LIFE = 7; // seconds a wall segment stays lit

  var W, H, cx, hz, f, ridge;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2;
    hz = H * 0.44;
    f = Math.max(W, H) * 0.62;
    var s1 = 1.7, s2 = 4.1, s3 = 0.6;
    ridge = function (x) {
      var u = x / W;
      return (
        Math.abs(Math.sin(u * 5.5 + s1)) * 0.05 +
        Math.abs(Math.sin(u * 13 + s2)) * 0.022 +
        Math.sin(u * 31 + s3) * 0.006
      );
    };
  }

  function px(x, z) {
    return cx + (f * x) / z;
  }
  function py(y, z) {
    return hz + (f * (CAM_H - y)) / z;
  }

  /* ---- racers ----------------------------------------------------------- */
  var DIRS = [
    { x: 0, z: 1 },
    { x: 1, z: 0 },
    { x: 0, z: -1 },
    { x: -1, z: 0 }
  ];

  function makeRacer(color, x, z, dir, speed) {
    return {
      color: color,
      x: x,
      z: z,
      dir: dir,
      speed: speed,
      trail: [{ x: x, z: z, t: 0 }],
      nextNode: 0
    };
  }

  var racers = [
    makeRacer(CYAN, -6, 10, 1, 7.5),
    makeRacer(ORANGE, 8, 26, 3, 7),
    makeRacer(WHITE, 0, 34, 2, 6.2)
  ];

  function blocked(r, d) {
    var nx = r.x + DIRS[d].x * CELL, nz = r.z + DIRS[d].z * CELL;
    return nx < X_MIN || nx > X_MAX || nz < Z_MIN || nz > Z_MAX;
  }

  function stepRacer(r, dt, t) {
    var dist = r.speed * dt;
    while (dist > 0) {
      var d = DIRS[r.dir];
      // Distance to the next grid node along the current heading.
      var along = d.x !== 0 ? r.x : r.z;
      var sign = d.x !== 0 ? d.x : d.z;
      var nextLine = sign > 0 ? Math.floor(along / CELL + 1e-6) * CELL + CELL : Math.ceil(along / CELL - 1e-6) * CELL - CELL;
      var toNode = Math.abs(nextLine - along);
      if (toNode < 1e-6) toNode = CELL;
      var move = Math.min(dist, toNode);
      r.x += d.x * move;
      r.z += d.z * move;
      dist -= move;
      if (move >= toNode - 1e-6) {
        // At a node: snap, then maybe turn (always turn if the arena ends).
        r.x = Math.round(r.x / CELL) * CELL;
        r.z = Math.round(r.z / CELL) * CELL;
        var turn = blocked(r, r.dir) || Math.random() < 0.22;
        if (turn) {
          var left = (r.dir + 3) % 4, right = (r.dir + 1) % 4;
          var options = [left, right].filter(function (o) {
            return !blocked(r, o);
          });
          if (!options.length) options = [(r.dir + 2) % 4];
          r.dir = options[(Math.random() * options.length) | 0];
          r.trail.push({ x: r.x, z: r.z, t: t });
        }
      }
    }
    // Drop corners whose following segment has fully faded.
    while (r.trail.length > 1 && t - r.trail[1].t > TRAIL_LIFE) r.trail.shift();
  }

  /* ---- drawing ------------------------------------------------------------ */
  function drawSky() {
    ctx.fillStyle = "#000306";
    ctx.fillRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, "rgba(0,3,6,0)");
    g.addColorStop(1, "rgba(" + CYAN + ",0.13)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hz);

    // Ridge: dark fill + neon outline.
    ctx.beginPath();
    ctx.moveTo(0, hz);
    for (var x = 0; x <= W; x += 8) ctx.lineTo(x, hz - ridge(x) * H);
    ctx.lineTo(W, hz);
    ctx.closePath();
    ctx.fillStyle = "#00080c";
    ctx.fill();
    ctx.beginPath();
    for (var x2 = 0; x2 <= W; x2 += 8) {
      var y2 = hz - ridge(x2) * H;
      if (x2 === 0) ctx.moveTo(x2, y2);
      else ctx.lineTo(x2, y2);
    }
    ctx.strokeStyle = "rgba(" + CYAN + ",0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Horizon line with bloom.
    ctx.globalCompositeOperation = "lighter";
    var hg = ctx.createLinearGradient(0, hz - 26, 0, hz + 26);
    hg.addColorStop(0, "rgba(" + CYAN + ",0)");
    hg.addColorStop(0.5, "rgba(" + CYAN + ",0.22)");
    hg.addColorStop(1, "rgba(" + CYAN + ",0)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, hz - 26, W, 52);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(" + CYAN + ",0.85)";
    ctx.fillRect(0, hz - 0.5, W, 1);
  }

  function drawFloor(t) {
    ctx.fillStyle = "#000103";
    ctx.fillRect(0, hz + 0.5, W, H - hz);

    ctx.lineWidth = 1;
    // Lines across (constant z).
    for (var z = Z_MIN - 2; z <= 80; z += CELL) {
      if (z <= 0.5) continue;
      var y = py(0, z);
      if (y > H) continue;
      var a = Math.min(0.5, 3 / z);
      ctx.strokeStyle = "rgba(" + CYAN + "," + a.toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Lines into depth (constant x).
    var zNear = 0.9, zFar = 80;
    for (var x = -60; x <= 60; x += CELL) {
      var g = ctx.createLinearGradient(0, py(0, zFar), 0, H);
      g.addColorStop(0, "rgba(" + CYAN + ",0)");
      g.addColorStop(1, "rgba(" + CYAN + ",0.45)");
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(px(x, zFar), py(0, zFar));
      ctx.lineTo(px(x, zNear), py(0, zNear));
      ctx.stroke();
    }

    // Data pulses sliding toward the camera along a few depth lines.
    ctx.globalCompositeOperation = "lighter";
    for (var k = 0; k < 6; k++) {
      var lx = (((k * 7) % 13) - 6) * CELL * 2;
      var zz = 60 - (((t * 9 + k * 11) % 60));
      if (zz < 1.2) continue;
      var sx = px(lx, zz), sy = py(0, zz), r = Math.max(1.5, 24 / zz);
      var pg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4);
      pg.addColorStop(0, "rgba(" + WHITE + ",0.9)");
      pg.addColorStop(1, "rgba(" + CYAN + ",0)");
      ctx.fillStyle = pg;
      ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function wallQuad(a, b) {
    ctx.beginPath();
    ctx.moveTo(px(a.x, a.z), py(0, a.z));
    ctx.lineTo(px(b.x, b.z), py(0, b.z));
    ctx.lineTo(px(b.x, b.z), py(WALL_H, b.z));
    ctx.lineTo(px(a.x, a.z), py(WALL_H, a.z));
    ctx.closePath();
  }

  function drawTrails(t) {
    // Gather wall segments from every racer, draw far-to-near.
    var segs = [];
    racers.forEach(function (r) {
      var pts = r.trail.concat([{ x: r.x, z: r.z, t: t }]);
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        // A segment is as old as the corner that ends it.
        var age = t - (i + 1 < pts.length - 1 ? pts[i + 1].t : t);
        var life = 1 - age / TRAIL_LIFE;
        if (life <= 0) continue;
        segs.push({ a: a, b: b, c: r.color, life: life, z: (a.z + b.z) / 2 });
      }
    });
    segs.sort(function (p, q) {
      return q.z - p.z;
    });

    segs.forEach(function (s) {
      var alpha = 0.34 * s.life;
      wallQuad(s.a, s.b);
      var top = Math.min(py(WALL_H, s.a.z), py(WALL_H, s.b.z));
      var bot = Math.max(py(0, s.a.z), py(0, s.b.z));
      var g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, "rgba(" + s.c + "," + (alpha * 1.6).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + s.c + "," + (alpha * 0.35).toFixed(3) + ")");
      ctx.fillStyle = g;
      ctx.fill();

      // Bright top edge, drawn twice for a cheap bloom.
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.moveTo(px(s.a.x, s.a.z), py(WALL_H, s.a.z));
      ctx.lineTo(px(s.b.x, s.b.z), py(WALL_H, s.b.z));
      ctx.strokeStyle = "rgba(" + s.c + "," + (0.25 * s.life).toFixed(3) + ")";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = "rgba(" + WHITE + "," + (0.8 * s.life).toFixed(3) + ")";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    });
  }

  /* An original low-slung racer: a wedge body on two wheel rings with a
     glowing core, oriented along its heading. */
  function drawRacer(r) {
    var d = DIRS[r.dir];
    var side = { x: d.z, z: -d.x }; // perpendicular
    var L = 1.5, Wd = 0.42;
    function P(fwd, lat, y) {
      var x = r.x + d.x * fwd + side.x * lat;
      var z = r.z + d.z * fwd + side.z * lat;
      return { x: px(x, z), y: py(y, z), z: z };
    }
    var nose = P(0.25, 0, 0.18);
    var tail = P(-L, 0, 0.5);
    var tailL = P(-L, -Wd / 2, 0.08);
    var tailR = P(-L, Wd / 2, 0.08);
    var midL = P(-L * 0.45, -Wd / 2, 0.06);
    var midR = P(-L * 0.45, Wd / 2, 0.06);
    if (nose.z < 0.8) return;

    var scale = f / Math.max(1, r.z);

    // Halo.
    ctx.globalCompositeOperation = "lighter";
    var hx = (nose.x + tail.x) / 2, hy = (nose.y + tail.y) / 2;
    var halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, scale * 1.4);
    halo.addColorStop(0, "rgba(" + r.color + ",0.45)");
    halo.addColorStop(1, "rgba(" + r.color + ",0)");
    ctx.fillStyle = halo;
    ctx.fillRect(hx - scale * 1.4, hy - scale * 1.4, scale * 2.8, scale * 2.8);
    ctx.globalCompositeOperation = "source-over";

    // Body wedge.
    ctx.beginPath();
    ctx.moveTo(nose.x, nose.y);
    ctx.lineTo(midL.x, midL.y);
    ctx.lineTo(tailL.x, tailL.y);
    ctx.lineTo(tail.x, tail.y);
    ctx.lineTo(tailR.x, tailR.y);
    ctx.lineTo(midR.x, midR.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,8,12,0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(" + r.color + ",0.95)";
    ctx.lineWidth = Math.max(1, scale * 0.04);
    ctx.stroke();

    // Wheel rings (front + rear), as glowing ellipses.
    [0.0, -L * 0.85].forEach(function (fw) {
      var c = P(fw, 0, 0.2);
      var rr = Math.max(1.5, scale * 0.2);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, rr * 0.55, rr, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(" + WHITE + ",0.9)";
      ctx.lineWidth = Math.max(1, scale * 0.035);
      ctx.stroke();
    });

    // Core light.
    var core = P(-L * 0.45, 0, 0.3);
    ctx.globalCompositeOperation = "lighter";
    var cg = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, scale * 0.35);
    cg.addColorStop(0, "rgba(255,255,255,0.95)");
    cg.addColorStop(1, "rgba(" + r.color + ",0)");
    ctx.fillStyle = cg;
    ctx.fillRect(core.x - scale * 0.35, core.y - scale * 0.35, scale * 0.7, scale * 0.7);
    ctx.globalCompositeOperation = "source-over";
  }

  function render(t, dt) {
    racers.forEach(function (r) {
      stepRacer(r, dt, t);
    });
    drawSky();
    drawFloor(t);
    drawTrails(t);
    // Racers far-to-near so nearer ones overlap.
    racers
      .slice()
      .sort(function (a, b) {
        return b.z - a.z;
      })
      .forEach(drawRacer);

    // Soft vignette keeps the card text readable.
    var v = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.55, Math.max(W, H) * 0.8);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---- loop ---------------------------------------------------------------- */
  var t = 0, last = 0, raf = 0;

  function tick(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    t += dt;
    render(t, dt);
    raf = requestAnimationFrame(tick);
  }

  function still() {
    // Run the simulation forward so walls exist, then hold one frame.
    for (var i = 0; i < 180; i++) {
      t += 1 / 30;
      racers.forEach(function (r) {
        stepRacer(r, 1 / 30, t);
      });
    }
    render(t, 0);
  }

  resize();
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (reduceMotion) render(t, 0);
    }, 120);
  });

  if (reduceMotion) {
    still();
    return;
  }

  raf = requestAnimationFrame(tick);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    } else if (!raf) {
      raf = requestAnimationFrame(tick);
    }
  });
})();
