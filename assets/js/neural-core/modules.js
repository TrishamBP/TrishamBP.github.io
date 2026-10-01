/* ---------------------------------------------------------------------------
   Neural Compute Core — scene builders
   ---------------------------------------------------------------------------
   One builder per entry in componentsData. Each returns a THREE.Group (local
   coordinates, positioned by the caller at `component.position`), optional
   custom hit proxies for raycasting, and an `update(dt, t, sim, c)` function
   for its micro-animations.

   Everything here is procedural primitives: no external models, textures or
   fonts. Repeated parts (fins, LEDs, KV blocks, vectors, tiles) are
   InstancedMesh; geometries and structural materials are shared; update()
   functions reuse module-level scratch objects and never allocate.
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/* ----------------------------- shared assets ---------------------------- */

export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 32),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 12),
  hex: new THREE.CylinderGeometry(1, 1, 1, 6),
  sphere: new THREE.SphereGeometry(1, 12, 8),
  ico: new THREE.IcosahedronGeometry(1, 0),
  octa: new THREE.OctahedronGeometry(1, 0),
};

export const M = {
  graphite: new THREE.MeshStandardMaterial({ color: 0x1b1d21, metalness: 0.78, roughness: 0.4 }),
  graphiteDark: new THREE.MeshStandardMaterial({ color: 0x0d0e10, metalness: 0.6, roughness: 0.55 }),
  /* Deck plate: mostly matte so it doesn't mirror the rim light. */
  deck: new THREE.MeshStandardMaterial({ color: 0x111215, metalness: 0.35, roughness: 0.82 }),
  titanium: new THREE.MeshStandardMaterial({ color: 0x8d939b, metalness: 0.95, roughness: 0.3 }),
  titaniumDark: new THREE.MeshStandardMaterial({ color: 0x3d4148, metalness: 0.9, roughness: 0.38 }),
  rotor: new THREE.MeshStandardMaterial({ color: 0x3d4148, metalness: 0.9, roughness: 0.38, side: THREE.DoubleSide }),
  /* LEDs: unlit, coloured per instance via instanceColor. */
  led: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  line: new THREE.LineBasicMaterial({ color: 0x3a3f47, transparent: true, opacity: 0.8 }),
  /* Invisible but raycastable. */
  proxy: new THREE.MeshBasicMaterial({ visible: false }),
};

export const PALETTE = {
  cool: new THREE.Color(0xc4cad6),
  blue: new THREE.Color(0x6fb2ff),
  deepBlue: new THREE.Color(0x2d6cdf),
  lime: new THREE.Color(0xc6f432),
  off: new THREE.Color(0x15171a),
  dim: new THREE.Color(0x24272c),
};

/* Soft round sprite generated on a canvas — used by particles and halos. */
export function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.75)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.14)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeAccent(color, intensity = 1) {
  return new THREE.MeshStandardMaterial({
    color: 0x050505,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    metalness: 0.2,
    roughness: 0.5,
  });
}

/* ------------------------------ scratch -------------------------------- */

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

function setInst(mesh, i, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  _p.set(x, y, z);
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  mesh.setMatrixAt(i, _m);
}

function inst(geo, mat, count, dynamic = false) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  if (dynamic) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

function ledInst(geo, count) {
  const mesh = inst(geo, M.led, count);
  for (let i = 0; i < count; i++) mesh.setColorAt(i, PALETTE.off);
  return mesh;
}

function mesh(geo, mat, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

/* Scales a colour by brightness into the shared scratch colour. */
function lit(color, k) {
  return _c.copy(color).multiplyScalar(k);
}

function lerpColor(a, b, k) {
  return _c.copy(a).lerp(b, k);
}

/* Five-petal rotor shape for GPU fans (flat, so it costs ~30 triangles). */
function makeRotorGeometry() {
  const shape = new THREE.Shape();
  const petals = 5;
  shape.moveTo(0.04, 0);
  for (let k = 0; k < petals; k++) {
    const a0 = (k / petals) * TAU;
    const a1 = a0 + TAU / petals * 0.55;
    const a2 = a0 + TAU / petals;
    shape.quadraticCurveTo(Math.cos(a0 + 0.2) * 0.2, Math.sin(a0 + 0.2) * 0.2, Math.cos(a1) * 0.16, Math.sin(a1) * 0.16);
    shape.lineTo(Math.cos(a2) * 0.04, Math.sin(a2) * 0.04);
  }
  return new THREE.ShapeGeometry(shape, 3);
}

/* ------------------------------- chassis ------------------------------- */

export function buildChassis() {
  const group = new THREE.Group();
  group.name = "CHASSIS";
  const base = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.55, 0.3, 64), M.graphiteDark);
  base.position.y = 0.15;
  group.add(base);
  group.add(mesh(G.cyl, M.deck, 0, 0.305, 0, 6.05, 0.02, 6.05));
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(6.3, 0.018, 6, 96),
    new THREE.MeshBasicMaterial({ color: 0x2b3038, toneMapped: false })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.31;
  group.add(rim);
  const grid = new THREE.PolarGridHelper(6.0, 16, 6, 64, 0x1d2026, 0x15171b);
  grid.position.y = 0.318;
  group.add(grid);
  return group;
}

/* ------------------------------- builders ------------------------------ */
/* ctx: { accent, quality: { low:boolean } }                                */

const builders = {
  "llm-inference"(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.cyl, M.graphite, 0, 0.18, 0, 1.08, 0.36, 1.08));
    g.add(mesh(G.cyl, M.graphite, 0, 0.5, 0, 0.95, 0.14, 0.95));
    g.add(mesh(G.cyl, M.graphite, 0, 3.38, 0, 0.95, 0.14, 0.95));
    const core = mesh(G.cyl, ctx.accent, 0, 1.95, 0, 0.5, 2.8, 0.5);
    g.add(core);
    const ribs = inst(G.box, M.titanium, 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      setInst(ribs, i, Math.cos(a) * 0.74, 1.95, Math.sin(a) * 0.74, 0.1, 2.8, 0.2, 0, -a, 0);
    }
    g.add(ribs);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: ctx.glow, color: 0xcfe0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 })
    );
    halo.position.set(0, 1.95, 0);
    halo.scale.set(3.4, 4.6, 1);
    g.add(halo);
    const proxy = mesh(G.cyl, M.proxy, 0, 1.75, 0, 0.98, 3.5, 0.98);
    return {
      group: g,
      proxies: [proxy],
      update(dt, t, sim, c) {
        c.activity = 0.55 + sim.coreLevel * 0.9 + Math.sin(t * 2.2) * 0.05;
        halo.material.opacity = (0.18 + sim.coreLevel * 0.45) * sim.intro.core * Math.min(1, c.emph);
      },
    };
  },

  attention(ctx) {
    const g = new THREE.Group();
    const rings = [];
    const heads = [];
    const ringGeo = new THREE.TorusGeometry(1.32, 0.026, 6, 72);
    const proxies = [];
    const ys = [1.05, 1.75, 2.45];
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Group();
      ring.position.y = ys[r];
      ring.rotation.z = (r - 1) * 4 * DEG;
      const torus = new THREE.Mesh(ringGeo, M.titanium);
      torus.rotation.x = Math.PI / 2;
      ring.add(torus);
      const h = ledInst(G.sphere, 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        setInst(h, i, Math.cos(a) * 1.32, 0, Math.sin(a) * 1.32, 0.065, 0.065, 0.065);
      }
      ring.add(h);
      g.add(ring);
      rings.push(ring);
      heads.push(h);
      const p = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.2, 6, 24), M.proxy);
      p.rotation.x = Math.PI / 2;
      p.position.y = ys[r];
      proxies.push(p);
    }
    return {
      group: g,
      proxies,
      update(dt, t, sim, c) {
        const speed = 0.25 + sim.coreLevel * 0.6;
        for (let r = 0; r < 3; r++) {
          rings[r].rotation.y += dt * speed * (r % 2 ? -1 : 1) * (1 + r * 0.25) * sim.motion;
          const h = heads[r];
          for (let i = 0; i < 8; i++) {
            /* A head flashes when the attention pulse sweeps past its index. */
            const phase = (sim.attnSweep * 8 - i - r * 2.7 + 64) % 8;
            const flash = phase < 1 ? 1 - phase : 0;
            const k = (0.25 + sim.attnPulse * flash * 1.6 + sim.prefillLevel * 0.5) * sim.intro.core * c.emph;
            h.setColorAt(i, lerpColor(PALETTE.blue, PALETTE.cool, flash).multiplyScalar(k));
          }
          h.instanceColor.needsUpdate = true;
        }
        c.activity = 1;
      },
    };
  },

  "cpu-control"(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.hex, M.graphite, 0, 0.06, 0, 1.15, 0.12, 1.15));
    g.add(mesh(G.box, M.titanium, 0, 0.17, 0, 0.56, 0.1, 0.56));
    g.add(mesh(G.box, ctx.accent, 0, 0.23, 0, 0.32, 0.03, 0.32));
    const traces = ledInst(G.box, 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 15 * DEG;
      setInst(traces, i, Math.cos(a) * 0.68, 0.125, Math.sin(a) * 0.68, 0.5, 0.012, 0.025, 0, -a, 0);
    }
    g.add(traces);
    const beat = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.014, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true }));
    beat.rotation.x = Math.PI / 2;
    beat.position.y = 0.13;
    g.add(beat);
    const proxy = mesh(G.hex, M.proxy, 0, 0.15, 0, 1.2, 0.45, 1.2);
    return {
      group: g,
      proxies: [proxy],
      update(dt, t, sim, c) {
        /* Double-beat heartbeat: the scheduler tick. */
        const ph = (t % 1.3) / 1.3;
        const hb = Math.exp(-((ph - 0.05) ** 2) / 0.0012) + 0.6 * Math.exp(-((ph - 0.2) ** 2) / 0.0012);
        const k = (0.25 + hb * sim.motionPulse) * sim.intro.core * c.emph;
        beat.material.color.copy(PALETTE.blue).multiplyScalar(0.4 + k * 1.4);
        for (let i = 0; i < 12; i++) {
          const w = 0.5 + 0.5 * Math.sin(t * 3 - i * 0.9);
          traces.setColorAt(i, lit(PALETTE.blue, (0.12 + w * 0.35 * sim.coreLevel) * c.emph));
        }
        traces.instanceColor.needsUpdate = true;
        c.activity = 0.5 + hb * 0.8 * sim.motionPulse;
      },
    };
  },

  prefill(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.box, M.graphite, 0, 0.35, 0, 0.5, 0.7, 0.5));
    g.add(mesh(G.box, M.graphite, 0, 1.15, 0, 1.7, 0.9, 0.9));
    g.add(mesh(G.box, ctx.accent, 0, 1.62, 0.46, 1.6, 0.025, 0.02));
    const lanes = ledInst(G.box, 8);
    for (let i = 0; i < 8; i++) setInst(lanes, i, -0.7 + i * 0.2, 1.12, 0.455, 0.12, 0.66, 0.02);
    g.add(lanes);
    const fins = inst(G.box, M.titanium, 10);
    for (let i = 0; i < 10; i++) setInst(fins, i, -0.72 + i * 0.16, 1.68, 0, 0.025, 0.16, 0.8);
    g.add(fins);
    return {
      group: g,
      update(dt, t, sim, c) {
        for (let i = 0; i < 8; i++) {
          const flick = 0.75 + 0.25 * Math.sin(t * 23 + i * 1.7);
          const k = (0.08 + sim.prefillLevel * 1.4 * flick) * c.emph;
          lanes.setColorAt(i, lerpColor(PALETTE.blue, PALETTE.lime, sim.prefillLevel).multiplyScalar(k));
        }
        lanes.instanceColor.needsUpdate = true;
        c.activity = 0.4 + sim.prefillLevel * 1.4;
      },
    };
  },

  decode(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.box, M.graphite, 0, 0.35, 0, 0.5, 0.7, 0.5));
    g.add(mesh(G.box, M.graphite, 0, 1.35, 0, 0.72, 1.3, 0.72));
    g.add(mesh(G.cyl, ctx.accent, 0, 1.35, 0.37, 0.05, 1.18, 0.05));
    const regs = ledInst(G.box, 6);
    for (let i = 0; i < 6; i++) setInst(regs, i, 0.22, 0.85 + i * 0.2, 0.365, 0.14, 0.11, 0.02);
    g.add(regs);
    g.add(mesh(G.box, M.titanium, 0, 2.04, 0, 0.78, 0.06, 0.78));
    return {
      group: g,
      update(dt, t, sim, c) {
        const active = sim.tokenIndex % 6;
        for (let i = 0; i < 6; i++) {
          const on = sim.decoding && i === active ? sim.tokenPulse : 0;
          const k = (0.1 + on * 1.6) * c.emph;
          regs.setColorAt(i, lerpColor(PALETTE.blue, PALETTE.lime, on).multiplyScalar(k));
        }
        regs.instanceColor.needsUpdate = true;
        c.activity = 0.4 + sim.tokenPulse * 1.2;
      },
    };
  },

  "model-serving"(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.box, M.graphite, 0, 0.36, 0, 2.8, 0.55, 0.55));
    g.add(mesh(G.box, ctx.accent, 0, 0.6, 0.28, 2.6, 0.035, 0.02));
    g.add(mesh(G.box, M.titanium, -1.45, 0.36, 0, 0.08, 0.6, 0.6));
    g.add(mesh(G.box, M.titanium, 1.45, 0.36, 0, 0.08, 0.6, 0.6));
    const ports = ledInst(G.box, 8);
    for (let i = 0; i < 8; i++) setInst(ports, i, -1.05 + i * 0.3, 0.34, 0.28, 0.18, 0.11, 0.03);
    g.add(ports);
    return {
      group: g,
      update(dt, t, sim, c) {
        for (let i = 0; i < 8; i++) {
          const blink = Math.sin(t * (3.1 + i * 0.7) + i * 2.1) > 0.55 ? 1 : 0.25;
          const k = (0.08 + blink * 0.5 * sim.motionPulse + sim.tokenPulse * 0.6 * (i === sim.tokenIndex % 8 ? 1 : 0)) * c.emph;
          ports.setColorAt(i, lit(i === sim.tokenIndex % 8 && sim.decoding ? PALETTE.lime : PALETTE.cool, k));
        }
        ports.instanceColor.needsUpdate = true;
        c.activity = 0.6 + sim.requestPulse * 0.8;
      },
    };
  },

  "gpu-compute"(ctx) {
    const g = new THREE.Group();
    const N = 8;
    const R = 3.3;
    const bodies = inst(G.box, M.graphite, N);
    const dies = inst(G.box, ctx.accent, N);
    const leds = ledInst(G.box, N * 6);
    const finCount = ctx.quality.low ? 5 : 9;
    const fins = inst(G.box, M.titanium, N * finCount);
    const fanRings = inst(new THREE.TorusGeometry(0.19, 0.016, 6, 24), M.titanium, N * 2);
    const rotors = inst(makeRotorGeometry(), M.rotor, N * 2, true);
    const bridges = inst(G.box, M.titanium, N - 1);
    const fanPos = [];
    const angles = [];
    for (let i = 0; i < N; i++) {
      const th = (-155 + (i * 130) / (N - 1)) * DEG;
      angles.push(th);
      const ry = -(th + Math.PI / 2);
      const cx = Math.cos(th) * R;
      const cz = Math.sin(th) * R;
      /* Radial unit vector (outward) and tangent. */
      const ox = Math.cos(th);
      const oz = Math.sin(th);
      const tx = -Math.sin(th);
      const tz = Math.cos(th);
      setInst(bodies, i, cx, 0.92, cz, 0.95, 1.7, 0.32, 0, ry, 0);
      /* Die window + LED strip on the inner face (toward the core). */
      setInst(dies, i, cx - ox * 0.165, 1.1, cz - oz * 0.165, 0.5, 0.5, 0.02, 0, ry, 0);
      for (let k = 0; k < 6; k++) {
        setInst(leds, i * 6 + k, cx - ox * 0.165 + tx * 0.36, 0.35 + k * 0.17, cz - oz * 0.165 + tz * 0.36, 0.05, 0.09, 0.02, 0, ry, 0);
      }
      /* Heat-sink fins and two fans on the outer face. */
      for (let k = 0; k < finCount; k++) {
        const off = -0.4 + (k * 0.8) / (finCount - 1);
        setInst(fins, i * finCount + k, cx + tx * off + ox * 0.2, 1.38, cz + tz * off + oz * 0.2, 0.025, 0.55, 0.1, 0, ry, 0);
      }
      for (let f = 0; f < 2; f++) {
        const fy = 0.45 + f * 0.48;
        const fx = cx + ox * 0.17;
        const fz = cz + oz * 0.17;
        setInst(fanRings, i * 2 + f, fx, fy, fz, 1, 1, 1, 0, ry, 0);
        fanPos.push(fx, fy, fz, ry);
      }
      if (i < N - 1) {
        const th2 = (-155 + ((i + 1) * 130) / (N - 1)) * DEG;
        const mid = (th + th2) / 2;
        setInst(bridges, i, Math.cos(mid) * (R - 0.05), 1.82, Math.sin(mid) * (R - 0.05), 0.95, 0.05, 0.12, 0, -(mid + Math.PI / 2), 0);
      }
    }
    for (const m of [bodies, dies, fins, fanRings, bridges]) g.add(m);
    g.add(leds);
    g.add(rotors);
    let spin = 0;
    const updateRotors = () => {
      for (let j = 0; j < N * 2; j++) {
        const o = j * 4;
        _p.set(fanPos[o], fanPos[o + 1], fanPos[o + 2]);
        _e.set(0, fanPos[o + 3], spin + j * 0.7, "YXZ");
        _q.setFromEuler(_e);
        _s.set(1, 1, 1);
        _m.compose(_p, _q, _s);
        rotors.setMatrixAt(j, _m);
      }
      rotors.instanceMatrix.needsUpdate = true;
    };
    updateRotors();
    return {
      group: g,
      anchors: angles.map((th) => [Math.cos(th) * (R - 0.2), 1.2, Math.sin(th) * (R - 0.2)]),
      update(dt, t, sim, c) {
        spin += dt * (2 + sim.gpuLoad * 16) * sim.motion;
        updateRotors();
        for (let i = 0; i < N; i++) {
          const on = sim.intro.gpu > i / N ? 1 : 0;
          for (let k = 0; k < 6; k++) {
            /* LEDs climb with load: a bar meter per GPU. */
            const lvl = sim.gpuLoad * 6 + Math.sin(t * 9 + i * 1.3) * 0.6;
            const v = k < lvl ? 1 : 0.12;
            const col = k >= 4 && v === 1 && sim.prefillLevel > 0.5 ? PALETTE.lime : PALETTE.cool;
            leds.setColorAt(i * 6 + k, lit(col, v * on * 0.9 * c.emph + 0.03));
          }
        }
        leds.instanceColor.needsUpdate = true;
        c.activity = (0.25 + sim.gpuLoad * 1.5) * sim.intro.gpu;
      },
    };
  },

  "cuda-kernel"(ctx) {
    const g = new THREE.Group();
    const cols = ctx.quality.low ? 10 : 16;
    const rows = ctx.quality.low ? 4 : 5;
    g.add(mesh(G.box, M.graphite, 0, 0.03, 0, 3.0, 0.06, 1.0));
    g.add(mesh(G.box, ctx.accent, 0, 0.065, 0.49, 3.0, 0.012, 0.012));
    const tiles = ledInst(G.box, cols * rows);
    const w = 2.8 / cols;
    const d = 0.86 / rows;
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < cols; k++)
        setInst(tiles, r * cols + k, -1.4 + w * (k + 0.5), 0.075, -0.43 + d * (r + 0.5), w * 0.78, 0.02, d * 0.72);
    g.add(tiles);
    return {
      group: g,
      update(dt, t, sim, c) {
        for (let r = 0; r < rows; r++)
          for (let k = 0; k < cols; k++) {
            /* Kernel-launch waves sweeping across the SM grid. */
            const wave = Math.max(0, Math.sin(k * 0.55 - t * 6 * sim.motion + r * 0.4));
            const v = (0.06 + wave * wave * (0.25 + sim.gpuLoad * 0.9)) * c.emph * sim.intro.gpu;
            tiles.setColorAt(r * cols + k, lit(PALETTE.blue, v));
          }
        tiles.instanceColor.needsUpdate = true;
        c.activity = 0.4 + sim.gpuLoad;
      },
    };
  },

  hbm(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.box, M.graphite, 0, 0.04, 0, 1.6, 0.08, 1.1));
    g.add(mesh(G.box, ctx.accent, 0, 0.085, 0.55, 1.6, 0.012, 0.012));
    const layers = ledInst(G.box, 30);
    const caps = inst(G.box, M.titanium, 6);
    for (let s = 0; s < 6; s++) {
      const x = -0.48 + (s % 3) * 0.48;
      const z = s < 3 ? -0.24 : 0.24;
      for (let k = 0; k < 5; k++) setInst(layers, s * 5 + k, x, 0.13 + k * 0.09, z, 0.34, 0.06, 0.34);
      setInst(caps, s, x, 0.6, z, 0.36, 0.05, 0.36);
    }
    g.add(layers);
    g.add(caps);
    return {
      group: g,
      update(dt, t, sim, c) {
        for (let s = 0; s < 6; s++)
          for (let k = 0; k < 5; k++) {
            /* Reads ripple up the stacks — strongest during decode. */
            const ripple = 0.5 + 0.5 * Math.sin(t * 8 * sim.motion - k * 0.9 - s * 1.4);
            const v = (0.05 + sim.hbmLoad * (0.25 + ripple * 0.6)) * c.emph;
            layers.setColorAt(s * 5 + k, lit(PALETTE.blue, v));
          }
        layers.instanceColor.needsUpdate = true;
        c.activity = 0.3 + sim.hbmLoad * 1.2;
      },
    };
  },

  "kv-cache"(ctx) {
    const g = new THREE.Group();
    const COLS = 8;
    const ROWS = 5;
    g.add(mesh(G.box, M.graphite, 0, 0.2, 0, 0.35, 0.4, 0.35));
    g.add(mesh(G.box, M.graphite, 0, 0.98, -0.02, 1.95, 1.2, 0.12));
    g.add(mesh(G.box, M.titanium, -1.0, 0.98, 0, 0.06, 1.28, 0.2));
    g.add(mesh(G.box, M.titanium, 1.0, 0.98, 0, 0.06, 1.28, 0.2));
    g.add(mesh(G.box, ctx.accent, 0, 1.62, 0.05, 1.95, 0.025, 0.03));
    const blocks = ledInst(G.box, COLS * ROWS);
    for (let r = 0; r < ROWS; r++)
      for (let k = 0; k < COLS; k++)
        /* Fill order: top row left→right, downward. */
        setInst(blocks, r * COLS + k, -0.84 + k * 0.24, 1.46 - r * 0.22, 0.07, 0.19, 0.17, 0.05);
    g.add(blocks);
    return {
      group: g,
      update(dt, t, sim, c) {
        const kv = sim.kv;
        for (let i = 0; i < kv.count; i++) {
          blocks.setColorAt(i, _c.setRGB(kv.r[i], kv.g[i], kv.b[i]).multiplyScalar(c.emph));
        }
        blocks.instanceColor.needsUpdate = true;
        c.activity = 0.5 + sim.kvFill * 0.8;
      },
    };
  },

  "distributed-storage"(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.box, M.graphite, 0, 0.72, 0, 1.3, 1.44, 0.9));
    g.add(mesh(G.box, ctx.accent, 0, 1.46, 0.45, 1.3, 0.02, 0.02));
    const fronts = inst(G.box, M.titaniumDark, 5);
    const leds = ledInst(G.box, 15);
    for (let d = 0; d < 5; d++) {
      setInst(fronts, d, 0, 0.2 + d * 0.26, 0.455, 1.18, 0.21, 0.03);
      for (let k = 0; k < 3; k++) setInst(leds, d * 3 + k, 0.36 + k * 0.08, 0.2 + d * 0.26, 0.475, 0.04, 0.04, 0.01);
    }
    g.add(fronts);
    g.add(leds);
    const platters = new THREE.Group();
    platters.position.set(0, 1.5, 0);
    for (let k = 0; k < 3; k++) platters.add(mesh(G.cyl, M.titanium, 0, k * 0.07, 0, 0.32, 0.025, 0.32));
    platters.add(mesh(G.cylLow, M.titaniumDark, 0, 0.08, 0, 0.05, 0.2, 0.05));
    g.add(platters);
    return {
      group: g,
      update(dt, t, sim, c) {
        platters.rotation.y += dt * 1.6 * sim.motion;
        for (let i = 0; i < 15; i++) {
          const on = Math.sin(t * (5 + (i % 5)) + i * 3.3) > 0.4 ? 1 : 0.15;
          leds.setColorAt(i, lit(i % 3 === 0 ? PALETTE.lime : PALETTE.blue, on * 0.6 * c.emph * (0.4 + sim.storageLoad)));
        }
        leds.instanceColor.needsUpdate = true;
        c.activity = 0.5 + sim.storageLoad * 0.8;
      },
    };
  },

  "network-fabric"(ctx) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.55, 0.055, 8, 128), M.titanium);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.37;
    g.add(ring);
    const glow = new THREE.Mesh(new THREE.TorusGeometry(5.55, 0.02, 6, 128), ctx.accent);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.43;
    g.add(glow);
    const spokes = inst(G.box, M.graphite, 8);
    const lines = inst(G.box, ctx.accent, 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 22.5 * DEG;
      const mid = 3.45;
      setInst(spokes, i, Math.cos(a) * mid, 0.33, Math.sin(a) * mid, 4.2, 0.04, 0.07, 0, -a, 0);
      setInst(lines, i, Math.cos(a) * mid, 0.355, Math.sin(a) * mid, 4.2, 0.01, 0.018, 0, -a, 0);
    }
    g.add(spokes);
    g.add(lines);
    const proxy = new THREE.Mesh(new THREE.TorusGeometry(5.55, 0.32, 6, 48), M.proxy);
    proxy.rotation.x = Math.PI / 2;
    proxy.position.y = 0.4;
    return {
      group: g,
      proxies: [proxy],
      update(dt, t, sim, c) {
        c.activity = 0.5 + sim.fabricLoad * 0.8;
      },
    };
  },

  "vector-db"(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.box, M.graphite, 0, 0.1, 0, 1.05, 0.2, 1.05));
    g.add(mesh(G.box, ctx.accent, 0, 0.205, 0, 0.9, 0.012, 0.9));
    const lattice = new THREE.Group();
    lattice.position.y = 1.0;
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.45, 1.45, 1.45)), M.line);
    lattice.add(frame);
    const n = ctx.quality.low ? 4 : 6;
    const count = n * n * n;
    const pts = ledInst(G.sphere, count);
    const step = 1.2 / (n - 1);
    /* Deterministic jitter so the lattice reads as data, not a grid. */
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
    for (let i = 0; i < count; i++) {
      const x = i % n;
      const y = Math.floor(i / n) % n;
      const z = Math.floor(i / (n * n));
      setInst(pts, i, -0.6 + x * step + rand() * 0.12, -0.6 + y * step + rand() * 0.12, -0.6 + z * step + rand() * 0.12, 0.032, 0.032, 0.032);
    }
    lattice.add(pts);
    g.add(lattice);
    const hits = new Int16Array(4).fill(-1);
    return {
      group: g,
      search() {
        for (let k = 0; k < 4; k++) hits[k] = Math.floor(Math.random() * count);
      },
      update(dt, t, sim, c) {
        lattice.rotation.y += dt * 0.12 * sim.motion;
        for (let i = 0; i < count; i++) {
          let hit = 0;
          for (let k = 0; k < 4; k++) if (hits[k] === i) hit = sim.searchGlow;
          const base = 0.14 + 0.06 * Math.sin(t * 1.5 + i);
          pts.setColorAt(i, hit > 0.02 ? lit(PALETTE.lime, (0.3 + hit * 1.4) * c.emph) : lit(PALETTE.blue, base * c.emph));
        }
        pts.instanceColor.needsUpdate = true;
        c.activity = 0.5 + sim.searchGlow;
      },
    };
  },

  embedding(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.cyl, M.graphite, 0, 0.25, 0, 0.4, 0.5, 0.4));
    g.add(mesh(G.cyl, M.titanium, 0, 0.52, 0, 0.44, 0.04, 0.44));
    const crystal = new THREE.Group();
    crystal.position.y = 1.25;
    crystal.add(mesh(G.octa, ctx.accent, 0, 0, 0, 0.36, 0.48, 0.36));
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(G.octa), M.line);
    wire.scale.set(0.48, 0.62, 0.48);
    crystal.add(wire);
    g.add(crystal);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.012, 6, 64), M.titanium);
    orbit.position.y = 1.25;
    g.add(orbit);
    return {
      group: g,
      update(dt, t, sim, c) {
        crystal.rotation.y += dt * (0.4 + sim.embedPulse * 5) * sim.motion;
        orbit.rotation.x = Math.PI / 2 + Math.sin(t * 0.7) * 0.35;
        orbit.rotation.y += dt * 0.5 * sim.motion;
        c.activity = 0.6 + sim.embedPulse * 1.6;
      },
    };
  },

  rag(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.box, M.graphite, 0, 0, 0, 1.5, 0.05, 0.62));
    g.add(mesh(G.box, ctx.accent, 0, 0.03, 0.31, 1.5, 0.012, 0.012));
    g.add(mesh(G.cylLow, M.titaniumDark, 0.2, -0.28, 0, 0.035, 0.55, 0.035));
    const docs = ledInst(G.box, 6);
    g.add(docs);
    const lift = new Float32Array(6);
    const chosen = new Uint8Array(6);
    return {
      group: g,
      rerank() {
        chosen.fill(0);
        let picked = 0;
        while (picked < 3) {
          const k = Math.floor(Math.random() * 6);
          if (!chosen[k]) {
            chosen[k] = 1;
            picked++;
          }
        }
      },
      update(dt, t, sim, c) {
        const a = 1 - Math.exp(-dt * 8);
        for (let i = 0; i < 6; i++) {
          const target = chosen[i] ? sim.rerankGlow : 0;
          lift[i] += (target - lift[i]) * a;
          setInst(docs, i, -0.6 + i * 0.24, 0.28 + lift[i] * 0.2, 0, 0.17, 0.46, 0.02, 0, 0, (i - 2.5) * -2 * DEG);
          const col = lift[i] > 0.05 ? lerpColor(PALETTE.cool, PALETTE.lime, lift[i]) : _c.copy(PALETTE.cool);
          docs.setColorAt(i, col.multiplyScalar((0.12 + lift[i] * 1.1 + sim.searchGlow * 0.15) * c.emph));
        }
        docs.instanceMatrix.needsUpdate = true;
        docs.instanceColor.needsUpdate = true;
        c.activity = 0.5 + sim.rerankGlow;
      },
    };
  },

  "agent-orchestration"(ctx) {
    const g = new THREE.Group();
    const hub = new THREE.Group();
    hub.add(mesh(G.ico, ctx.accent, 0, 0, 0, 0.26, 0.26, 0.26));
    const hubWire = new THREE.LineSegments(new THREE.EdgesGeometry(G.ico), M.line);
    hubWire.scale.setScalar(0.36);
    hub.add(hubWire);
    g.add(hub);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.012, 6, 48), M.titanium);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const TOOLS = 5;
    const toolPos = [];
    const nodes = inst(G.box, M.titanium, TOOLS);
    const caps = ledInst(G.box, TOOLS);
    const linePos = new Float32Array(TOOLS * 6);
    const lineCol = new Float32Array(TOOLS * 6);
    for (let i = 0; i < TOOLS; i++) {
      const a = (i / TOOLS) * TAU + 0.3;
      const x = Math.cos(a) * 1.05;
      const y = Math.sin(a * 2) * 0.18;
      const z = Math.sin(a) * 1.05;
      toolPos.push([x, y, z]);
      setInst(nodes, i, x, y, z, 0.16, 0.16, 0.16, 0.4, a, 0);
      setInst(caps, i, x, y + 0.1, z, 0.1, 0.02, 0.1, 0, a, 0);
      linePos.set([0, 0, 0, x, y, z], i * 6);
    }
    g.add(nodes);
    g.add(caps);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false }));
    g.add(lines);
    return {
      group: g,
      toolPos,
      update(dt, t, sim, c) {
        hub.rotation.y += dt * (0.5 + sim.agentPulse * 3) * sim.motion;
        hub.rotation.x = Math.sin(t * 0.6) * 0.3;
        for (let i = 0; i < TOOLS; i++) {
          const on = i === sim.agentTool ? sim.agentToolGlow : 0;
          const col = on > 0.02 ? lerpColor(PALETTE.blue, PALETTE.lime, on) : _c.copy(PALETTE.blue);
          col.multiplyScalar((0.18 + on * 1.3) * c.emph);
          caps.setColorAt(i, col);
          for (let v = 0; v < 2; v++) {
            const o = i * 6 + v * 3;
            lineCol[o] = col.r * (v ? 1 : 0.6);
            lineCol[o + 1] = col.g * (v ? 1 : 0.6);
            lineCol[o + 2] = col.b * (v ? 1 : 0.6);
          }
        }
        caps.instanceColor.needsUpdate = true;
        lineGeo.attributes.color.needsUpdate = true;
        c.activity = 0.6 + sim.agentPulse * 1.2;
      },
    };
  },

  "data-pipeline"(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.box, M.graphite, -0.9, 0.12, 0, 0.18, 0.24, 0.3));
    g.add(mesh(G.box, M.graphite, 0.9, 0.12, 0, 0.18, 0.24, 0.3));
    g.add(mesh(G.box, M.titanium, 0, 0.27, 0, 2.4, 0.05, 0.32));
    g.add(mesh(G.box, ctx.accent, 0, 0.3, 0.165, 2.4, 0.012, 0.012));
    g.add(mesh(G.box, M.graphite, 1.32, 0.42, 0, 0.3, 0.5, 0.42));
    const N = 6;
    const pkts = ledInst(G.box, N);
    pkts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    g.add(pkts);
    let shift = 0;
    return {
      group: g,
      update(dt, t, sim, c) {
        shift = (shift + dt * 0.35 * sim.motion) % 1;
        for (let i = 0; i < N; i++) {
          const u = (i / N + shift) % 1;
          const x = -1.1 + u * 2.3;
          const fade = Math.min(1, u * 6, (1 - u) * 6);
          setInst(pkts, i, x, 0.36, 0, 0.18 * fade + 0.001, 0.12 * fade + 0.001, 0.2 * fade + 0.001);
          pkts.setColorAt(i, lit(i % 3 === 0 ? PALETTE.lime : PALETTE.blue, (0.25 + 0.4 * fade) * c.emph));
        }
        pkts.instanceMatrix.needsUpdate = true;
        pkts.instanceColor.needsUpdate = true;
        c.activity = 0.7;
      },
    };
  },

  observability(ctx) {
    const g = new THREE.Group();
    g.add(mesh(G.box, M.graphite, 0, 0.05, 0, 0.55, 0.1, 0.55));
    g.add(mesh(G.cylLow, M.titanium, 0, 1.25, 0, 0.055, 2.4, 0.055));
    const beacon = mesh(G.sphere, M.led, 0, 2.5, 0, 0.06, 0.06, 0.06);
    beacon.material = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    g.add(beacon);
    const PANELS = 3;
    const BARS = 10;
    const panels = new THREE.Group();
    panels.rotation.y = -32 * DEG;
    const bars = ledInst(G.box, PANELS * BARS);
    bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let p = 0; p < PANELS; p++) {
      const y = 0.85 + p * 0.6;
      panels.add(mesh(G.box, M.graphite, 0, y, 0.12, 1.0, 0.48, 0.04));
      panels.add(mesh(G.box, ctx.accent, 0, y + 0.245, 0.145, 1.0, 0.012, 0.01));
    }
    panels.add(bars);
    g.add(panels);
    return {
      group: g,
      update(dt, t, sim, c) {
        const hist = sim.history;
        for (let p = 0; p < PANELS; p++) {
          const series = hist[p];
          for (let b = 0; b < BARS; b++) {
            const v = Math.max(0.04, series[(hist.head + b + 1) % BARS]);
            const h = v * 0.38;
            setInst(bars, p * BARS + b, -0.42 + b * 0.094, 0.85 + p * 0.6 - 0.2 + h / 2, 0.145, 0.06, h, 0.01);
            const col = b === BARS - 1 ? PALETTE.lime : p === 1 ? PALETTE.blue : PALETTE.cool;
            bars.setColorAt(p * BARS + b, lit(col, (0.3 + v * 0.5) * c.emph));
          }
        }
        bars.instanceMatrix.needsUpdate = true;
        bars.instanceColor.needsUpdate = true;
        const ph = (t % 1.3) / 1.3;
        beacon.material.color.copy(PALETTE.lime).multiplyScalar(0.2 + Math.exp(-((ph - 0.05) ** 2) / 0.002) * sim.motionPulse);
        c.activity = 0.7;
      },
    };
  },
};

export function buildComponent(id, ctx) {
  const builder = builders[id];
  if (!builder) throw new Error("No builder for component " + id);
  return builder(ctx);
}
