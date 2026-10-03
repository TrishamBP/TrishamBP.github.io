/* =============================================================================
   Research cinema — animated full-screen backgrounds
   -----------------------------------------------------------------------------
   Every `.spx-section[data-scene]` gets a procedural canvas "video". Scenes
   only animate while their section is on screen, the device-pixel ratio is
   capped, and `prefers-reduced-motion` renders a single still frame instead.
   Sections with a real <video> (frontmatter `bg_video:`) are played/paused
   the same way; their canvas scene keeps running as a fallback until the
   video is actually playing, so a missing file never leaves a black panel.

   Scenes: ascent | orbit | stars | network | grid
   ========================================================================== */
(function () {
  "use strict";

  var body = document.body;
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  body.classList.add("spx-js");

  /* ---- nav solidifies once the hero starts scrolling away ---------------- */
  function onScroll() {
    body.classList.toggle("spx-scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- helpers ------------------------------------------------------------ */
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function makeStars(count, w, h, maxY) {
    var stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h * (maxY || 1),
        r: Math.random() < 0.92 ? rand(0.3, 0.9) : rand(1, 1.6),
        a: rand(0.25, 0.9),
        tw: rand(0.4, 1.6),
        ph: rand(0, Math.PI * 2)
      });
    }
    return stars;
  }

  function drawStars(ctx, stars, t) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = s.a * (0.65 + 0.35 * Math.sin(t * s.tw + s.ph));
      ctx.fillStyle = "rgba(240,240,250," + a.toFixed(3) + ")";
      ctx.fillRect(s.x, s.y, s.r * 1.4, s.r * 1.4);
    }
  }

  function starCount(w, h, density) {
    return Math.round((w * h) / (density || 5200));
  }

  /* =========================================================================
     Scene: ascent — a vehicle climbing from a pad with a particle plume
     ======================================================================= */
  function sceneAscent() {
    var w, h, stars, parts = [], cycle = 17, pad;

    function resize(W, H) {
      w = W;
      h = H;
      stars = makeStars(starCount(w, h, 4200), w, h, 0.8);
      pad = { x: w * 0.7, y: h * 0.88 };
    }

    function rocketAt(p) {
      // Slow lift-off, then accelerating climb with a gentle downrange pitch.
      var e = p * p * (1.4 - 0.4 * p);
      return {
        x: pad.x + Math.pow(p, 2.2) * w * 0.16,
        y: pad.y - e * (h * 1.15),
        tilt: Math.pow(p, 1.8) * 0.22
      };
    }

    function frame(ctx, t, dt) {
      var p = (t % cycle) / (cycle - 3); // last 3s of each cycle: empty sky
      var flying = p <= 1;

      var sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#000");
      sky.addColorStop(0.62, "#03060c");
      sky.addColorStop(0.86, "#0b1220");
      sky.addColorStop(1, "#020203");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      drawStars(ctx, stars, t);

      // Horizon / ground band.
      ctx.fillStyle = "#010101";
      ctx.fillRect(0, pad.y + 6, w, h - pad.y);

      var r = flying ? rocketAt(Math.max(p, 0)) : null;

      // Warm glow on the ground while the vehicle is low.
      if (r) {
        var low = Math.max(0, 1 - (pad.y - r.y) / (h * 0.5));
        if (low > 0) {
          var g = ctx.createRadialGradient(pad.x, pad.y, 0, pad.x, pad.y, w * 0.45);
          g.addColorStop(0, "rgba(255,150,60," + (0.35 * low).toFixed(3) + ")");
          g.addColorStop(1, "rgba(255,150,60,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      }

      // Launch tower silhouette.
      ctx.strokeStyle = "rgba(240,240,250,0.18)";
      ctx.lineWidth = 1;
      var tx = pad.x - 22, th = h * 0.11;
      ctx.beginPath();
      ctx.moveTo(tx, pad.y + 6);
      ctx.lineTo(tx, pad.y - th);
      ctx.moveTo(tx - 6, pad.y + 6);
      ctx.lineTo(tx - 6, pad.y - th);
      for (var k = 0; k < 9; k++) {
        var yy = pad.y + 6 - (k * th) / 8;
        ctx.moveTo(tx - 6, yy);
        ctx.lineTo(tx, yy - th / 8);
      }
      ctx.stroke();

      // Contrail: the path flown so far.
      if (r && p > 0.02) {
        ctx.beginPath();
        for (var s = 0; s <= 40; s++) {
          var q = rocketAt((p * s) / 40);
          if (s === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        }
        ctx.strokeStyle = "rgba(200,205,220,0.08)";
        ctx.lineWidth = 6;
        ctx.stroke();
      }

      // Emit plume particles at the nozzle.
      if (r && p >= 0) {
        var nx = r.x - Math.sin(r.tilt) * 10, ny = r.y + Math.cos(r.tilt) * 10;
        var n = Math.round(dt * 520);
        for (var i = 0; i < n && parts.length < 900; i++) {
          parts.push({
            x: nx + rand(-1.5, 1.5),
            y: ny,
            vx: rand(-14, 14) - Math.sin(r.tilt) * 60,
            vy: rand(90, 190),
            life: 0,
            max: rand(0.6, 2.4),
            size: rand(1.2, 2.6)
          });
        }
      }

      // Update + draw particles: hot core (additive) fading into grey smoke.
      ctx.globalCompositeOperation = "lighter";
      for (var j = parts.length - 1; j >= 0; j--) {
        var pt = parts[j];
        pt.life += dt;
        if (pt.life > pt.max) {
          parts.splice(j, 1);
          continue;
        }
        var age = pt.life / pt.max;
        pt.vx *= 0.985;
        pt.vy *= 0.97;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (pt.y > pad.y + 4) {
          pt.y = pad.y + 4;
          pt.vy = 0;
          pt.vx += (pt.x < pad.x ? -1 : 1) * 40 * dt * 10;
        }
        var rad = pt.size * (1 + age * 9);
        var col =
          age < 0.15
            ? "255,244,220"
            : age < 0.4
            ? "255,170,80"
            : "120,118,125";
        var alpha = age < 0.4 ? (1 - age) * 0.55 : (1 - age) * 0.12;
        ctx.fillStyle = "rgba(" + col + "," + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // Vehicle + engine bloom.
      if (r && p >= 0) {
        var bloom = ctx.createRadialGradient(r.x, r.y + 12, 0, r.x, r.y + 12, 46);
        bloom.addColorStop(0, "rgba(255,250,235,0.95)");
        bloom.addColorStop(0.2, "rgba(255,190,110,0.5)");
        bloom.addColorStop(1, "rgba(255,150,60,0)");
        ctx.fillStyle = bloom;
        ctx.fillRect(r.x - 50, r.y - 38, 100, 100);

        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.tilt);
        ctx.fillStyle = "rgba(235,236,242,0.95)";
        ctx.fillRect(-2, -26, 4, 34);
        ctx.beginPath();
        ctx.moveTo(-2, -26);
        ctx.lineTo(0, -32);
        ctx.lineTo(2, -26);
        ctx.fill();
        ctx.restore();
      }

      if (!flying && parts.length === 0) parts.length = 0;
    }

    return { resize: resize, frame: frame, still: 7.2 };
  }

  /* =========================================================================
     Scene: orbit — satellites on tilted orbits around a planet limb
     ======================================================================= */
  function sceneOrbit() {
    var w, h, stars, planet, orbits;

    function resize(W, H) {
      w = W;
      h = H;
      stars = makeStars(starCount(w, h), w, h);
      var R = Math.min(w, h) * 0.48;
      planet = { x: w * 0.68, y: h * 1.02, r: R };
      orbits = [];
      for (var i = 0; i < 5; i++) {
        orbits.push({
          rx: R * rand(1.12, 1.5),
          ryk: rand(0.38, 0.62),
          rot: rand(-0.55, -0.2),
          speed: rand(0.05, 0.12),
          ph: rand(0, Math.PI * 2),
          trail: []
        });
      }
    }

    function frame(ctx, t) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      drawStars(ctx, stars, t);

      // Orbit paths (faint).
      ctx.lineWidth = 1;
      for (var i = 0; i < orbits.length; i++) {
        var o = orbits[i];
        ctx.beginPath();
        ctx.ellipse(planet.x, planet.y, o.rx, o.rx * o.ryk, o.rot, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(240,240,250,0.1)";
        ctx.stroke();
      }

      // Satellites behind the planet are drawn first, then the planet, then
      // the ones in front.
      var front = [];
      for (var j = 0; j < orbits.length; j++) {
        var ob = orbits[j];
        var a = ob.ph + t * ob.speed;
        var cx = Math.cos(a) * ob.rx, cy = Math.sin(a) * ob.rx * ob.ryk;
        var x = planet.x + cx * Math.cos(ob.rot) - cy * Math.sin(ob.rot);
        var y = planet.y + cx * Math.sin(ob.rot) + cy * Math.cos(ob.rot);
        ob.trail.push({ x: x, y: y });
        if (ob.trail.length > 90) ob.trail.shift();
        var isFront = Math.sin(a) > 0;
        if (isFront) front.push(ob);
        else drawSat(ctx, ob);
      }

      // Planet body.
      var pg = ctx.createRadialGradient(
        planet.x - planet.r * 0.45, planet.y - planet.r * 0.55, planet.r * 0.1,
        planet.x, planet.y, planet.r
      );
      pg.addColorStop(0, "#1f4b78");
      pg.addColorStop(0.45, "#0b1d33");
      pg.addColorStop(1, "#010309");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.r, 0, Math.PI * 2);
      ctx.fill();

      // Atmosphere rim.
      ctx.save();
      ctx.shadowColor = "rgba(120,180,255,0.8)";
      ctx.shadowBlur = 34;
      ctx.strokeStyle = "rgba(130,185,255,0.55)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.r + 1, Math.PI * 1.02, Math.PI * 1.98);
      ctx.stroke();
      ctx.restore();

      for (var f = 0; f < front.length; f++) drawSat(ctx, front[f]);
    }

    function drawSat(ctx, o) {
      var tr = o.trail;
      for (var i = 1; i < tr.length; i++) {
        ctx.strokeStyle = "rgba(240,240,250," + ((i / tr.length) * 0.35).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(tr[i - 1].x, tr[i - 1].y);
        ctx.lineTo(tr[i].x, tr[i].y);
        ctx.stroke();
      }
      var hd = tr[tr.length - 1];
      if (!hd) return;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillRect(hd.x - 1.5, hd.y - 1.5, 3, 3);
      ctx.fillStyle = "rgba(160,200,255,0.5)";
      ctx.fillRect(hd.x - 6, hd.y - 0.5, 4, 1);
      ctx.fillRect(hd.x + 2, hd.y - 0.5, 4, 1);
    }

    return { resize: resize, frame: frame, still: 30 };
  }

  /* =========================================================================
     Scene: stars — slow flight through a starfield with drifting nebulae
     ======================================================================= */
  function sceneStars() {
    var w, h, pts;

    function reset(p, far) {
      p.x = rand(-1, 1);
      p.y = rand(-1, 1);
      p.z = far ? 1 : rand(0.05, 1);
      p.px = null;
    }

    function resize(W, H) {
      w = W;
      h = H;
      pts = [];
      var n = starCount(w, h, 1500);
      for (var i = 0; i < n; i++) {
        var p = {};
        reset(p, false);
        pts.push(p);
      }
    }

    function frame(ctx, t, dt) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      // Two soft nebula washes drifting slowly.
      var neb = [
        [w * (0.3 + 0.05 * Math.sin(t * 0.05)), h * 0.35, "60,70,140"],
        [w * (0.75 + 0.04 * Math.cos(t * 0.04)), h * 0.65, "90,50,110"]
      ];
      for (var k = 0; k < neb.length; k++) {
        var g = ctx.createRadialGradient(neb[k][0], neb[k][1], 0, neb[k][0], neb[k][1], Math.max(w, h) * 0.45);
        g.addColorStop(0, "rgba(" + neb[k][2] + ",0.26)");
        g.addColorStop(1, "rgba(" + neb[k][2] + ",0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      var cx = w / 2, cy = h / 2, f = Math.max(w, h) * 0.5;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.z -= dt * 0.08;
        if (p.z <= 0.02) {
          reset(p, true);
          continue;
        }
        var sx = cx + (p.x / p.z) * f, sy = cy + (p.y / p.z) * f;
        if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) {
          reset(p, true);
          continue;
        }
        var a = Math.min(1, (1 - p.z) * 1.3);
        var sz = Math.max(0.6, (1 - p.z) * 2.6);
        if (p.px !== null) {
          ctx.strokeStyle = "rgba(240,240,250," + (a * 0.5).toFixed(3) + ")";
          ctx.lineWidth = sz;
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(240,240,250," + a.toFixed(3) + ")";
        ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
        p.px = sx;
        p.py = sy;
      }
    }

    return { resize: resize, frame: frame, still: 0 };
  }

  /* =========================================================================
     Scene: network — drifting nodes, distance-weighted links, signal pulses
     ======================================================================= */
  function sceneNetwork() {
    var w, h, nodes, pulses, link;

    function resize(W, H) {
      w = W;
      h = H;
      link = Math.min(190, Math.max(120, w * 0.11));
      nodes = [];
      var n = Math.round(Math.min(110, (w * h) / 16000));
      for (var i = 0; i < n; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: rand(-12, 12),
          vy: rand(-8, 8),
          r: rand(1, 2.4)
        });
      }
      pulses = [];
    }

    function frame(ctx, t, dt) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      var i, j, a, b, dx, dy, d;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
      }

      ctx.lineWidth = 1;
      var edges = [];
      for (i = 0; i < nodes.length; i++) {
        for (j = i + 1; j < nodes.length; j++) {
          a = nodes[i];
          b = nodes[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < link) {
            var al = (1 - d / link) * 0.22;
            ctx.strokeStyle = "rgba(170,190,240," + al.toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            edges.push([i, j]);
          }
        }
      }

      // Spawn signal pulses along random live edges.
      if (edges.length && Math.random() < dt * 6 && pulses.length < 24) {
        var e = edges[(Math.random() * edges.length) | 0];
        pulses.push({ a: e[0], b: e[1], p: 0, s: rand(0.6, 1.2) });
      }
      ctx.globalCompositeOperation = "lighter";
      for (i = pulses.length - 1; i >= 0; i--) {
        var pu = pulses[i];
        pu.p += dt * pu.s;
        if (pu.p >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        a = nodes[pu.a];
        b = nodes[pu.b];
        var px = a.x + (b.x - a.x) * pu.p, py = a.y + (b.y - a.y) * pu.p;
        var g = ctx.createRadialGradient(px, py, 0, px, py, 10);
        g.addColorStop(0, "rgba(255,255,255,0.9)");
        g.addColorStop(1, "rgba(140,170,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(px - 10, py - 10, 20, 20);
      }
      ctx.globalCompositeOperation = "source-over";

      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.fillStyle = "rgba(240,240,250,0.75)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { resize: resize, frame: frame, still: 0 };
  }

  /* =========================================================================
     Scene: grid — perspective surface grid rolling toward a lit horizon
     ======================================================================= */
  function sceneGrid() {
    var w, h, stars, ridge;

    function resize(W, H) {
      w = W;
      h = H;
      stars = makeStars(starCount(w, h, 4800), w, h, 0.55);
      // Distant ridge line from a few summed sines (seeded per resize).
      var s1 = rand(0, 10), s2 = rand(0, 10), s3 = rand(0, 10);
      ridge = function (x) {
        var u = x / w;
        return (
          Math.sin(u * 7 + s1) * 0.012 +
          Math.sin(u * 17 + s2) * 0.006 +
          Math.sin(u * 41 + s3) * 0.0025
        );
      };
    }

    function frame(ctx, t) {
      var hz = h * 0.6;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      drawStars(ctx, stars, t);

      // Horizon glow.
      var g = ctx.createLinearGradient(0, hz - h * 0.22, 0, hz + 4);
      g.addColorStop(0, "rgba(90,110,160,0)");
      g.addColorStop(1, "rgba(120,140,190,0.22)");
      ctx.fillStyle = g;
      ctx.fillRect(0, hz - h * 0.22, w, h * 0.22 + 4);

      // Ridge silhouette.
      ctx.fillStyle = "#020203";
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (var x = 0; x <= w; x += 6) {
        ctx.lineTo(x, hz - (0.02 + ridge(x)) * h);
      }
      ctx.lineTo(w, h);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.fillRect(0, hz, w, h - hz);

      // Receding horizontal lines; offset scrolls them toward the camera.
      var cam = h * 0.42, spacing = 1, off = (t * 0.6) % spacing;
      ctx.lineWidth = 1;
      for (var z = 30; z > 0.6; z -= spacing) {
        var zz = z - off;
        if (zz <= 0.6) continue;
        var y = hz + cam / zz;
        if (y > h) continue;
        var a = Math.min(0.35, 0.9 / zz);
        ctx.strokeStyle = "rgba(240,240,250," + a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Converging lines to the vanishing point.
      var vx = w * 0.5;
      for (var k = -24; k <= 24; k++) {
        var bx = vx + k * (w / 16);
        var grad = ctx.createLinearGradient(0, hz, 0, h);
        grad.addColorStop(0, "rgba(240,240,250,0)");
        grad.addColorStop(1, "rgba(240,240,250,0.22)");
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(vx + k * 2, hz);
        ctx.lineTo(bx, h);
        ctx.stroke();
      }
    }

    return { resize: resize, frame: frame, still: 3 };
  }

  var SCENES = {
    ascent: sceneAscent,
    orbit: sceneOrbit,
    stars: sceneStars,
    network: sceneNetwork,
    grid: sceneGrid
  };

  /* ---- wiring --------------------------------------------------------------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll(".spx-section"));
  var running = [];

  function sizeCanvas(item) {
    var c = item.canvas;
    var W = c.clientWidth, H = c.clientHeight;
    if (!W || !H) return;
    c.width = Math.round(W * DPR);
    c.height = Math.round(H * DPR);
    item.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    item.scene.resize(W, H);
    if (reduceMotion) drawStill(item);
  }

  function drawStill(item) {
    // Advance the simulation to a representative moment, then hold it.
    var t = 0, target = item.scene.still || 0, step = 1 / 30;
    if (target === 0) {
      item.scene.frame(item.ctx, 0, step);
      return;
    }
    while (t < target) {
      item.scene.frame(item.ctx, t, step);
      t += step;
    }
  }

  var items = [];
  sections.forEach(function (sec) {
    var video = sec.querySelector(".spx-video");
    var canvas = sec.querySelector(".spx-canvas");
    var item = { sec: sec, video: video, visible: false, t: 0 };
    if (canvas) {
      var make = SCENES[sec.getAttribute("data-scene")] || sceneStars;
      item.canvas = canvas;
      item.ctx = canvas.getContext("2d");
      item.scene = make();
      sizeCanvas(item);
    }
    if (video) {
      video.addEventListener("playing", function () {
        item.videoReady = true;
        sec.classList.add("spx-video-ready");
        setVisible(item, item.visible, true);
      });
      if (reduceMotion) {
        video.removeAttribute("autoplay");
        video.pause();
      }
    }
    items.push(item);
  });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      items.forEach(function (it) {
        if (it.canvas) sizeCanvas(it);
      });
    }, 150);
  });

  var last = 0, rafId = 0;
  function tick(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    for (var i = 0; i < running.length; i++) {
      var it = running[i];
      it.t += dt;
      it.scene.frame(it.ctx, it.t, dt);
    }
    rafId = running.length ? requestAnimationFrame(tick) : 0;
    if (!rafId) last = 0;
  }

  function setVisible(it, on, force) {
    if (it.visible === on && !force) return;
    it.visible = on;
    if (it.video && !reduceMotion) {
      if (on) {
        var p = it.video.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        it.video.pause();
      }
    }
    if (!it.scene || reduceMotion) return;
    var animate = on && !it.videoReady;
    var idx = running.indexOf(it);
    if (animate && idx === -1) running.push(it);
    if (!animate && idx !== -1) running.splice(idx, 1);
    if (running.length && !rafId) rafId = requestAnimationFrame(tick);
  }

  if (!("IntersectionObserver" in window)) {
    items.forEach(function (it) {
      it.sec.classList.add("spx-in");
      setVisible(it, true);
    });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (en) {
        var it = items[sections.indexOf(en.target)];
        if (!it) return;
        if (en.isIntersecting && en.intersectionRatio > 0.25) {
          en.target.classList.add("spx-in");
        }
        setVisible(it, en.isIntersecting);
      });
    },
    { threshold: [0, 0.25] }
  );
  sections.forEach(function (s) {
    io.observe(s);
  });

  /* Pause everything while the tab is hidden. */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      last = 0;
    } else if (running.length && !rafId) {
      rafId = requestAnimationFrame(tick);
    }
  });
})();
