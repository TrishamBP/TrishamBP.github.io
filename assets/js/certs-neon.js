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
  var X_MIN = -12, X_MAX = 12; // racer arena
  var Z_MIN = 6, Z_MAX = 24;
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
      yaw: dir * (Math.PI / 2), // rendered heading, eases toward `dir`
      lean: 0,
      turned: 0 // >0 for a moment after a turn: throws sparks
    };
  }

  var racers = [
    makeRacer(CYAN, -6, 8, 1, 7.5),
    makeRacer(ORANGE, 8, 16, 3, 7),
    makeRacer(WHITE, 0, 22, 2, 6.2)
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
          r.turned = 0.35;
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

  /* -------------------------------------------------------------------------
     The racer: an original low-poly bike built in local space and projected
     with the scene camera.
       fwd = along the heading,  lat = to the rider's right,  y = up
     Body: a faceted side profile extruded to a tapering half-width, with a
     raised cowl and a tail fin. Wheels: solid discs with a glowing rim,
     inner ring, spinning spokes and a hub. Rider: a hunched generic figure
     with a dark helmet, a lit visor arc and a spine seam.
     ----------------------------------------------------------------------- */
  // Side profile [fwd, y, halfWidth]: nose -> tail along the top, then belly.
  var PROFILE = [
    [1.18, 0.3, 0.1],
    [1.0, 0.56, 0.17],
    [0.62, 0.74, 0.22],
    [0.3, 0.9, 0.2], // cowl peak
    [0.02, 0.76, 0.21],
    [-0.42, 0.74, 0.24], // seat
    [-0.86, 0.9, 0.2], // tail fin root
    [-1.14, 0.98, 0.06], // fin tip
    [-1.1, 0.56, 0.18],
    [-0.98, 0.24, 0.2],
    [0.98, 0.2, 0.16]
  ];
  var TOP_EDGES = 8; // PROFILE[0..8] is the lit upper seam
  var WHEELS = [
    { fwd: 0.74, r: 0.34 },
    { fwd: -0.7, r: 0.36 }
  ];
  var sparks = [];

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function racerFrame(r) {
    var fx = Math.sin(r.yaw), fz = Math.cos(r.yaw);
    return { fx: fx, fz: fz, sx: fz, sz: -fx, cl: Math.cos(r.lean), sl: Math.sin(r.lean) };
  }

  // Local (fwd, lat, y) -> projected screen point (+ world x/y and depth).
  function L2S(r, F, fwd, lat, y) {
    var l = lat * F.cl - y * F.sl; // lean rolls around the forward axis
    var yy = lat * F.sl + y * F.cl;
    var x = r.x + F.fx * fwd + F.sx * l;
    var z = r.z + F.fz * fwd + F.sz * l;
    return { x: px(x, z), y: py(yy, z), z: z, wx: x, wy: yy };
  }

  function polyPath(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }

  function avgZ(pts) {
    var sum = 0;
    for (var i = 0; i < pts.length; i++) sum += pts[i].z;
    return sum / pts.length;
  }

  function ringPts(r, F, w, lat, k, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      out.push(L2S(r, F, w.fwd + Math.cos(a) * w.r * k, lat, w.r + Math.sin(a) * w.r * k));
    }
    return out;
  }

  function drawWheel(r, F, fc, col, lw, t) {
    polyPath(fc.pts);
    ctx.fillStyle = "rgba(1,6,9,0.96)";
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(" + col + ",0.35)";
    ctx.lineWidth = lw * 4;
    ctx.stroke();
    ctx.strokeStyle = "rgba(" + WHITE + ",0.95)";
    ctx.lineWidth = lw * 1.3;
    ctx.stroke();

    polyPath(ringPts(r, F, fc.w, fc.lat, 0.58, 18));
    ctx.strokeStyle = "rgba(" + col + ",0.8)";
    ctx.lineWidth = lw;
    ctx.stroke();

    var c = L2S(r, F, fc.w.fwd, fc.lat, fc.w.r);
    var spin = -t * 9;
    ctx.strokeStyle = "rgba(" + col + ",0.5)";
    for (var sp = 0; sp < 3; sp++) {
      var a = spin + (sp * Math.PI * 2) / 3;
      var e = L2S(r, F, fc.w.fwd + Math.cos(a) * fc.w.r * 0.58, fc.lat, fc.w.r + Math.sin(a) * fc.w.r * 0.58);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(" + WHITE + ",0.95)";
    ctx.fillRect(c.x - lw, c.y - lw, lw * 2, lw * 2);
    ctx.globalCompositeOperation = "source-over";
  }

  function drawRacer(r, t) {
    if (r.z < 1.4) return;
    var F = racerFrame(r);
    var col = r.color;
    var scale = f / r.z;
    var lw = Math.max(1, scale * 0.022);
    var faces = [];

    // Floor glow: a flattened radial pool under the bike.
    var g0 = L2S(r, F, 0, 0, 0);
    var R0 = scale * 1.6;
    ctx.globalCompositeOperation = "lighter";
    ctx.save();
    ctx.translate(g0.x, g0.y);
    ctx.scale(1, 0.32);
    var gl = ctx.createRadialGradient(0, 0, 0, 0, 0, R0);
    gl.addColorStop(0, "rgba(" + col + ",0.35)");
    gl.addColorStop(1, "rgba(" + col + ",0)");
    ctx.fillStyle = gl;
    ctx.fillRect(-R0, -R0, R0 * 2, R0 * 2);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";

    // Body: two side panels + the strips between them.
    var left = PROFILE.map(function (p) {
      return L2S(r, F, p[0], -p[2], p[1]);
    });
    var right = PROFILE.map(function (p) {
      return L2S(r, F, p[0], p[2], p[1]);
    });
    faces.push({ kind: "side", pts: left, z: avgZ(left) });
    faces.push({ kind: "side", pts: right, z: avgZ(right) });
    for (var i = 0; i < PROFILE.length; i++) {
      var j = (i + 1) % PROFILE.length;
      var q = [left[i], left[j], right[j], right[i]];
      faces.push({ kind: "strip", pts: q, z: avgZ(q), top: i < TOP_EDGES });
    }

    // Wheels: a disc on each face of the tyre.
    WHEELS.forEach(function (w) {
      [-0.15, 0.15].forEach(function (lat) {
        var rim = ringPts(r, F, w, lat, 1, 22);
        faces.push({ kind: "wheel", pts: rim, z: avgZ(rim), w: w, lat: lat });
      });
    });

    // Rider: torso + two arms reaching to the bars.
    var torso = [
      L2S(r, F, -0.42, -0.15, 0.78),
      L2S(r, F, 0.12, -0.13, 1.08),
      L2S(r, F, 0.22, 0, 1.12),
      L2S(r, F, 0.12, 0.13, 1.08),
      L2S(r, F, -0.42, 0.15, 0.78)
    ];
    faces.push({ kind: "rider", pts: torso, z: avgZ(torso) - 0.01 });
    [-0.17, 0.17].forEach(function (lat) {
      var arm = [
        L2S(r, F, 0.12, lat * 0.8, 1.05),
        L2S(r, F, 0.62, lat, 0.82),
        L2S(r, F, 0.6, lat, 0.74),
        L2S(r, F, 0.08, lat * 0.8, 0.96)
      ];
      faces.push({ kind: "rider", pts: arm, z: avgZ(arm) });
    });

    // Painter's order: far faces first.
    faces.sort(function (a, b) {
      return b.z - a.z;
    });

    faces.forEach(function (fc) {
      if (fc.kind === "wheel") {
        drawWheel(r, F, fc, col, lw, t);
        return;
      }
      polyPath(fc.pts);
      if (fc.kind === "rider") {
        ctx.fillStyle = "rgba(3,9,13,0.97)";
        ctx.fill();
        ctx.strokeStyle = "rgba(" + col + ",0.55)";
        ctx.lineWidth = lw * 0.8;
        ctx.stroke();
        return;
      }
      // Glossy dark panels; upper strips catch a little light.
      ctx.fillStyle = fc.kind === "strip" && fc.top ? "rgba(14,30,38,0.97)" : "rgba(4,12,17,0.97)";
      ctx.fill();
      ctx.strokeStyle = "rgba(" + col + ",0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Light seams along both flanks, drawn last so they glow on top.
    ctx.globalCompositeOperation = "lighter";
    [left, right].forEach(function (side) {
      ctx.beginPath();
      for (var k = 0; k <= TOP_EDGES; k++) {
        if (k === 0) ctx.moveTo(side[k].x, side[k].y);
        else ctx.lineTo(side[k].x, side[k].y);
      }
      ctx.strokeStyle = "rgba(" + col + ",0.35)";
      ctx.lineWidth = lw * 5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(" + WHITE + ",0.9)";
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(side[9].x, side[9].y);
      ctx.lineTo(side[10].x, side[10].y);
      ctx.strokeStyle = "rgba(" + col + ",0.9)";
      ctx.lineWidth = lw * 1.4;
      ctx.stroke();
    });
    ctx.globalCompositeOperation = "source-over";

    // Helmet: dark dome with a glowing visor arc.
    var hc = L2S(r, F, 0.3, 0, 1.2);
    var hr = Math.max(2, scale * 0.13);
    ctx.beginPath();
    ctx.ellipse(hc.x, hc.y, hr, hr * 0.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(3,9,13,0.98)";
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.ellipse(hc.x, hc.y, hr, hr * 0.9, 0, Math.PI * 0.95, Math.PI * 1.9);
    ctx.strokeStyle = "rgba(" + col + ",0.95)";
    ctx.lineWidth = lw * 1.2;
    ctx.stroke();

    // Spine seam down the rider's back.
    var s0 = L2S(r, F, 0.2, 0, 1.13), s1 = L2S(r, F, -0.4, 0, 0.82);
    ctx.beginPath();
    ctx.moveTo(s0.x, s0.y);
    ctx.lineTo(s1.x, s1.y);
    ctx.strokeStyle = "rgba(" + col + ",0.9)";
    ctx.stroke();

    // Headlight + tail light.
    [[1.16, 0.32, "255,255,255"], [-1.12, 0.6, col]].forEach(function (Lt) {
      var p = L2S(r, F, Lt[0], 0, Lt[1]);
      var rr = scale * 0.16;
      var lg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      lg.addColorStop(0, "rgba(" + Lt[2] + ",0.95)");
      lg.addColorStop(1, "rgba(" + Lt[2] + ",0)");
      ctx.fillStyle = lg;
      ctx.fillRect(p.x - rr, p.y - rr, rr * 2, rr * 2);
    });
    ctx.globalCompositeOperation = "source-over";
  }

  /* Sparks: thrown from the rear wheel's contact patch on every turn and,
     sparsely, while riding. World-space particles with gravity + bounce. */
  function emitSparks(r, n) {
    var F = racerFrame(r);
    var c = L2S(r, F, -0.7, 0, 0.02);
    for (var i = 0; i < n && sparks.length < 500; i++) {
      var spd = rand(2, 7);
      var a = rand(0, Math.PI * 2);
      sparks.push({
        x: c.wx,
        y: 0.03,
        z: c.z,
        vx: Math.cos(a) * spd - F.fx * 3,
        vy: rand(1.5, 4.5),
        vz: Math.sin(a) * spd - F.fz * 3,
        life: 0,
        max: rand(0.35, 0.9),
        col: Math.random() < 0.5 ? r.color : "255,236,190"
      });
    }
  }

  function drawSparks(dt) {
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.life += dt;
      if (s.life > s.max || s.z < 0.6) {
        sparks.splice(i, 1);
        continue;
      }
      var ox = s.x, oy = s.y, oz = s.z;
      s.vy -= 9.8 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      if (s.y < 0) {
        s.y = 0;
        s.vy *= -0.35;
        s.vx *= 0.6;
        s.vz *= 0.6;
      }
      var a = 1 - s.life / s.max;
      // Streak from a slightly older position for motion blur.
      var tz = oz - s.vz * 0.02;
      if (tz < 0.6) continue;
      ctx.beginPath();
      ctx.moveTo(px(ox - s.vx * 0.02, tz), py(oy - s.vy * 0.02, tz));
      ctx.lineTo(px(s.x, s.z), py(s.y, s.z));
      ctx.strokeStyle = "rgba(" + s.col + "," + a.toFixed(3) + ")";
      ctx.lineWidth = Math.max(1, 16 / s.z);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.globalCompositeOperation = "source-over";
  }

  function updateRacerPose(r, dt) {
    var target = r.dir * (Math.PI / 2);
    var diff = target - r.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    r.yaw += diff * Math.min(1, dt * 9);
    // Lean into the turn, then settle upright.
    var targetLean = Math.max(-0.5, Math.min(0.5, -diff * 0.9));
    r.lean += (targetLean - r.lean) * Math.min(1, dt * 7);
    if (r.turned > 0) {
      emitSparks(r, Math.round(dt * 220));
      r.turned -= dt;
    } else if (Math.random() < dt * 3) {
      emitSparks(r, 2);
    }
  }

  function render(t, dt) {
    racers.forEach(function (r) {
      stepRacer(r, dt, t);
      updateRacerPose(r, dt);
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
      .forEach(function (r) {
        drawRacer(r, t);
      });
    drawSparks(dt);

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
        updateRacerPose(r, 1 / 30);
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
