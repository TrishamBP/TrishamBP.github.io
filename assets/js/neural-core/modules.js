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
import { buildSatellite } from "./satellite.js";
import { buildStarship } from "./starship.js";
import { buildDeathStar } from "./deathstar.js";
import { buildDataPipeline } from "./datapipe.js";
import { buildVectorDB } from "./vectordb.js";

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
  rackBody: new THREE.MeshStandardMaterial({ color: 0x0a0b0d, metalness: 0.7, roughness: 0.42 }),
  cable: new THREE.MeshStandardMaterial({ color: 0x08090a, metalness: 0.3, roughness: 0.55 }),
  /* Perforated floor panels for the rack aisle (canvas texture, below). */
  grating: new THREE.MeshStandardMaterial({ color: 0x8a9099, metalness: 0.75, roughness: 0.45 }),
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
  green: new THREE.Color(0x2cff6e),
  greenDeep: new THREE.Color(0x0b6b2c),
};

/* One floor panel: framed plate with a grid of perforations. Tiled across
   the rack aisle so the deck reads as raised-floor grating. */
function makeGratingTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  g.fillStyle = "#2a2d32";
  g.fillRect(0, 0, size, size);
  g.fillStyle = "#050607";
  g.fillRect(0, 0, size, 4);
  g.fillRect(0, 0, 4, size);
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 10; x++) g.fillRect(12 + x * 11.2, 12 + y * 11.2, 6, 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  tex.anisotropy = 4;
  return tex;
}
M.grating.map = makeGratingTexture();

function canvasTex(w, h, draw, repeat) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

/* Server sled faceplate: honeycomb intake, four drive caddies, and a dark
   right-hand zone where the instanced status LEDs and eject lever sit. */
function drawFaceplate(g, w, h) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#6a717c");
  grad.addColorStop(0.12, "#454a53");
  grad.addColorStop(0.88, "#353941");
  grad.addColorStop(1, "#08090b");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#050607";
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 13; col++) {
      const x = 12 + col * 9 + (row % 2) * 4.5;
      const y = 16 + row * 15;
      g.beginPath();
      for (let k = 0; k < 6; k++) g.lineTo(x + Math.cos((k * TAU) / 6) * 3.6, y + Math.sin((k * TAU) / 6) * 3.6);
      g.fill();
    }
  for (let d = 0; d < 4; d++) {
    const x = 138 + d * 62;
    g.fillStyle = "#0b0c0e";
    g.fillRect(x, 10, 56, h - 20);
    g.fillStyle = "#5b616b";
    g.fillRect(x + 3, 13, 50, 10);
    g.fillStyle = "#131518";
    for (let k = 0; k < 5; k++) g.fillRect(x + 6, 30 + k * 10, 44, 4);
    g.fillStyle = "#aab2be";
    g.fillRect(x + 44, 15, 6, 6);
  }
  g.fillStyle = "#0a0b0d";
  g.fillRect(392, 8, 116, h - 16);
  g.fillStyle = "#1f2227";
  g.fillRect(398, h - 30, 22, 14);
  g.fillRect(424, h - 30, 22, 14);
  g.fillStyle = "#8b93a0";
  g.font = "600 13px monospace";
  g.fillText("SXM5", 398, 26);
}

/* Perforated steel for cabinet tops. */
function drawPerf(g, w, h) {
  g.fillStyle = "#30343b";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#040405";
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      g.beginPath();
      g.arc(4 + x * 8 + (y % 2) * 4, 4 + y * 8, 2.6, 0, TAU);
      g.fill();
    }
}

/* Cabinet side panel: seams plus louvre bands top and bottom. */
function drawSidePanel(g, w, h) {
  g.fillStyle = "#121418";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#050607";
  g.fillRect(0, h / 2 - 1, w, 2);
  g.fillRect(w / 2 - 1, 0, 2, h);
  for (const y0 of [24, h - 84]) for (let k = 0; k < 8; k++) g.fillRect(16, y0 + k * 7, w - 32, 3);
  g.fillStyle = "#2a2e35";
  g.fillRect(0, 0, w, 3);
  g.fillRect(0, h - 3, w, 3);
}

M.faceplate = new THREE.MeshStandardMaterial({ map: canvasTex(512, 96, drawFaceplate), metalness: 0.45, roughness: 0.5 });
M.perf = new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, drawPerf, [7, 4]), metalness: 0.8, roughness: 0.4 });
M.rackBody.map = canvasTex(128, 512, drawSidePanel);
M.rackBody.color.set(0xb8bec8);

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

/* Axial fan rotor: swept blades that widen toward the tip (flat). */
function makeRotorGeometry(blades = 9, r0 = 0.036, r1 = 0.188) {
  const shapes = [];
  const pt = (r, a) => [Math.cos(a) * r, Math.sin(a) * r];
  for (let k = 0; k < blades; k++) {
    const a = (k / blades) * TAU;
    const sweep = 0.55;
    const s = new THREE.Shape();
    s.moveTo(...pt(r0, a));
    s.quadraticCurveTo(...pt((r0 + r1) / 2, a + sweep * 0.3), ...pt(r1, a + sweep));
    for (let j = 1; j <= 3; j++) s.lineTo(...pt(r1, a + sweep + (j / 3) * 0.42));
    s.quadraticCurveTo(...pt((r0 + r1) / 2, a + 0.5), ...pt(r0, a + 0.3));
    s.closePath();
    shapes.push(s);
  }
  return new THREE.ShapeGeometry(shapes, 4);
}

/* Live per-cabinet status screens share one canvas atlas: row i is GPU i. */
function makeStatusAtlas(rows) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64 * rows;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const g = canvas.getContext("2d");
  return {
    tex,
    draw(i, util, temp, hot) {
      const y = i * 64;
      g.fillStyle = "#010503";
      g.fillRect(0, y, 512, 64);
      g.strokeStyle = "#0f3a1f";
      g.lineWidth = 2;
      g.strokeRect(2, y + 2, 508, 60);
      g.textBaseline = "middle";
      g.fillStyle = "#3dff7f";
      g.font = "700 28px monospace";
      g.fillText("GPU 0" + (i + 1), 14, y + 33);
      const segs = 12;
      const on = Math.round(util * segs);
      for (let k = 0; k < segs; k++) {
        g.fillStyle = k < on ? (k >= 9 && hot ? "#d4ff3a" : "#2cff6e") : "#0c2415";
        g.fillRect(168 + k * 14, y + 18, 10, 30);
      }
      g.font = "600 21px monospace";
      g.fillStyle = "#bfffd4";
      g.fillText(String(Math.round(util * 100)).padStart(3, " ") + "%", 346, y + 22);
      g.fillStyle = "#6fdc95";
      g.fillText(Math.round(temp) + "°C", 346, y + 45);
      g.fillStyle = hot ? "#d4ff3a" : "#2cff6e";
      g.font = "700 18px monospace";
      g.fillText(hot ? "PREFILL" : "ONLINE", 422, y + 33);
    },
  };
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
  /* Orbital spacecraft; see satellite.js (also owns the hologram). */
  "llm-inference"(ctx) {
    return buildSatellite(ctx);
  },

  /* Orbit rings around the spacecraft: one wide equatorial ring and two
     tighter ones above and below the hull. They open out with the
     spacecraft's exploded view (sim.holo) and glow gold in the hologram. */
  attention(ctx) {
    const g = new THREE.Group();
    const rings = [];
    const heads = [];
    const proxies = [];
    const MID = 1.7;
    const ys = [0.75, MID, 2.65];
    const radii = [1.25, 1.82, 1.25];
    const ringMat = M.titanium.clone();
    ringMat.emissive = new THREE.Color(0xffb444);
    ringMat.emissiveIntensity = 0;
    for (let r = 0; r < 3; r++) {
      const R = radii[r];
      const ring = new THREE.Group();
      ring.position.y = ys[r];
      ring.rotation.z = (r - 1) * 3 * DEG;
      const torus = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 8, 96), ringMat);
      torus.rotation.x = Math.PI / 2;
      ring.add(torus);
      const h = ledInst(G.sphere, 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        setInst(h, i, Math.cos(a) * R, 0, Math.sin(a) * R, 0.065, 0.065, 0.065);
      }
      ring.add(h);
      g.add(ring);
      rings.push(ring);
      heads.push(h);
      const p = new THREE.Mesh(new THREE.TorusGeometry(R, 0.1, 6, 32), M.proxy);
      p.rotation.x = Math.PI / 2;
      p.position.y = ys[r];
      proxies.push(p);
    }
    return {
      group: g,
      proxies,
      update(dt, t, sim, c) {
        const speed = 0.25 + sim.coreLevel * 0.6;
        const hk = sim.holo || 0;
        const ex = Math.min(1, hk / 0.6);
        const open = ex * ex * (3 - 2 * ex);
        ringMat.emissiveIntensity = hk * 0.3;
        for (let r = 0; r < 3; r++) {
          rings[r].rotation.y += dt * speed * (r % 2 ? -1 : 1) * (1 + r * 0.25) * sim.motion;
          rings[r].position.y = MID + (ys[r] - MID) * (1 + 0.6 * open);
          rings[r].scale.setScalar(1 + 0.35 * open);
          const h = heads[r];
          for (let i = 0; i < 8; i++) {
            /* A head flashes when the attention pulse sweeps past its index. */
            const phase = (sim.attnSweep * 8 - i - r * 2.7 + 64) % 8;
            const flash = phase < 1 ? 1 - phase : 0;
            const k = (0.25 + sim.attnPulse * flash * 1.6 + sim.prefillLevel * 0.5) * sim.intro.core * Math.max(c.emph, hk);
            h.setColorAt(i, lerpColor(PALETTE.blue, PALETTE.cool, flash).multiplyScalar(k));
          }
          h.instanceColor.needsUpdate = true;
        }
        c.activity = 1;
      },
    };
  },

  /* Starship hovering over the core; see starship.js. */
  "cpu-control"(ctx) {
    return buildStarship(ctx);
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

  /* Server-rack arc behind the core: eight cabinets, each one accelerator.
     Cabinets alternate between blade bays (drive sleds + status LEDs) and
     triple-fan cooling doors with neon rings; the outer face carries the
     opposite door so the hot aisle reads as well as the cold one. Every
     part is instanced across all cabinets via a per-cabinet basis matrix
     (local x = tangent, y = up, z = toward the core). */
  "gpu-compute"(ctx) {
    const g = new THREE.Group();
    const N = 8;
    const R = 3.3;
    const W = 0.92;
    const H = 1.85;
    const D = 0.56;
    const BAY0 = 0.16;
    const BAY1 = H - 0.2;
    const BLADES = ctx.quality.low ? 7 : 10;
    const FANS = 3;
    const ARC0 = -155;
    const SPAN = 130;
    const thAt = (i) => (ARC0 + (i * SPAN) / (N - 1)) * DEG;

    /* Door layout: a fan door on every third cabinet's inner face, and the
       opposite door type on the outer face. faces: [cabinet, side, isFan]. */
    const faces = [];
    for (let i = 0; i < N; i++) {
      const innerFan = i % 3 === 1;
      faces.push([i, 1, innerFan], [i, -1, !innerFan]);
    }
    const bladeFaces = faces.filter((f) => !f[2]);
    const fanFaces = faces.filter((f) => f[2]);

    const body = inst(G.box, M.rackBody, N);
    const posts = inst(G.box, M.titanium, N * 4);
    const plinths = inst(G.box, M.graphite, N);
    const caps = inst(G.box, M.titaniumDark, N);
    const tops = inst(G.box, M.perf, N);
    const cables = inst(G.cylLow, M.cable, N * 6);
    const clamps = inst(G.box, M.titanium, N * 2);
    const headers = inst(G.box, ctx.accent, faces.length);
    const spines = inst(G.box, M.graphite, N - 1);
    const trays = inst(G.box, M.titaniumDark, N - 1);
    const trayCables = inst(G.cylLow, M.cable, (N - 1) * 2);
    const bezels = inst(G.box, M.graphiteDark, faces.length);
    const slabs = inst(G.box, M.faceplate, bladeFaces.length * BLADES);
    const handles = inst(G.box, M.titanium, bladeFaces.length * BLADES);
    const housings = inst(G.box, M.titaniumDark, fanFaces.length * FANS);
    const hubs = inst(G.cylLow, M.titanium, fanFaces.length * FANS);
    const screws = inst(G.cylLow, M.titanium, fanFaces.length * FANS * 4);
    const guardOuter = inst(new THREE.TorusGeometry(0.15, 0.0045, 4, 40), M.titanium, fanFaces.length * FANS);
    const guardInner = inst(new THREE.TorusGeometry(0.085, 0.0045, 4, 32), M.titanium, fanFaces.length * FANS);
    const struts = inst(G.box, M.titanium, fanFaces.length * FANS * 2);
    const rotors = inst(makeRotorGeometry(), M.rotor, fanFaces.length * FANS, true);
    /* Emissive parts, coloured per frame. */
    const strips = ledInst(G.box, N * 4 + (N - 1));
    const topBars = ledInst(G.box, N);
    const bladeLeds = ledInst(G.box, bladeFaces.length * BLADES * 2);
    const fanRings = ledInst(new THREE.TorusGeometry(0.215, 0.018, 6, 40), fanFaces.length * FANS);
    const fanGlow = ledInst(new THREE.CircleGeometry(0.2, 32), fanFaces.length * FANS);

    /* Per-cabinet basis, then parts placed in cabinet-local coordinates. */
    const basis = [];
    const local = new THREE.Matrix4();
    function put(mesh, idx, i, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
      _p.set(x, y, z);
      _e.set(rx, ry, rz);
      _q.setFromEuler(_e);
      _s.set(sx, sy, sz);
      local.compose(_p, _q, _s);
      mesh.setMatrixAt(idx, _m.multiplyMatrices(basis[i], local));
    }
    for (let i = 0; i < N; i++) {
      const th = thAt(i);
      _p.set(Math.cos(th) * R, 0, Math.sin(th) * R);
      _q.setFromAxisAngle(_s.set(0, 1, 0), -(th + Math.PI / 2));
      basis.push(new THREE.Matrix4().compose(_p, _q, _s.set(1, 1, 1)));
    }

    const proxies = [];
    let sIdx = 0;
    for (let i = 0; i < N; i++) {
      put(body, i, i, 0, H / 2, 0, W, H, D);
      put(plinths, i, i, 0, 0.045, 0, W + 0.05, 0.09, D + 0.08);
      put(caps, i, i, 0, H + 0.025, 0, W + 0.03, 0.05, D + 0.03);
      for (let k = 0; k < 4; k++) put(posts, i * 4 + k, i, (k & 1 ? 1 : -1) * (W / 2), H / 2, (k & 2 ? 1 : -1) * (D / 2), 0.045, H, 0.045);
      put(tops, i, i, 0, H + 0.052, 0, W - 0.08, 0.008, D - 0.08);
      /* Two cable looms over the top, three cables each, plus clamps. */
      for (let b = 0; b < 2; b++) {
        const bx = b ? 0.22 : -0.24;
        for (let k = 0; k < 3; k++) {
          put(cables, i * 6 + b * 3 + k, i, bx + (k - 1) * 0.046, H + 0.078 + (k === 1 ? 0.034 : 0), 0, 0.026, D - 0.02, 0.026, Math.PI / 2, 0, 0);
        }
        put(clamps, i * 2 + b, i, bx, H + 0.09, 0.1, 0.17, 0.07, 0.035);
      }
      /* White light bar along the top edge (status screens: see doors). */
      put(topBars, i, i, 0, H - 0.025, D / 2 + 0.006, W - 0.1, 0.018, 0.01);
      /* Neon edge strips: two per face. */
      for (let k = 0; k < 4; k++) {
        const side = k & 2 ? -1 : 1;
        put(strips, sIdx++, i, (k & 1 ? 1 : -1) * (W / 2 - 0.045), (BAY0 + BAY1) / 2, side * (D / 2 + 0.006), 0.02, BAY1 - BAY0, 0.012);
      }
      const proxy = new THREE.Mesh(G.box, M.proxy);
      basis[i].decompose(proxy.position, proxy.quaternion, proxy.scale);
      proxy.position.y = H / 2;
      proxy.scale.set(W, H + 0.2, D);
      proxies.push(proxy);
    }

    /* Between cabinets: a recessed spine post whose core-facing edge is a
       neon seam, and a cable tray bridging the tops. */
    for (let i = 0; i < N - 1; i++) {
      const mid = (thAt(i) + thAt(i + 1)) / 2;
      const ry = -(mid + Math.PI / 2);
      const ox = Math.cos(mid);
      const oz = Math.sin(mid);
      setInst(spines, i, ox * (R - 0.06), H / 2, oz * (R - 0.06), 0.16, H - 0.04, D * 0.82, 0, ry, 0);
      setInst(strips, sIdx++, ox * (R - 0.06 - D * 0.41), (BAY0 + BAY1) / 2, oz * (R - 0.06 - D * 0.41), 0.035, BAY1 - BAY0, 0.012, 0, ry, 0);
      setInst(trays, i, ox * (R + 0.02), H + 0.06, oz * (R + 0.02), 0.34, 0.04, 0.3, 0, ry, 0);
      for (let k = 0; k < 2; k++) {
        const r = R - 0.05 + k * 0.12;
        setInst(trayCables, i * 2 + k, ox * r, H + 0.1, oz * r, 0.026, 0.36, 0.026, 0, ry, Math.PI / 2);
      }
    }

    /* Status screens: one plane per door, UVs cropped to the cabinet's row. */
    const atlas = makeStatusAtlas(N);
    const screenMat = new THREE.MeshBasicMaterial({ map: atlas.tex, toneMapped: false });
    const screenGeo = Array.from({ length: N }, (_, i) => {
      const geo = new THREE.PlaneGeometry(0.62, 0.078);
      const uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - (i + 1 - uv.getY(k)) / N);
      return geo;
    });
    const screenMatrix = new THREE.Matrix4();

    /* Doors. side = +1 inner face (toward the core), -1 outer face. */
    const rotorBase = [];
    let bIdx = 0;
    let fIdx = 0;
    faces.forEach(([i, side, isFan], f) => {
      const z = side * (D / 2);
      const flip = side > 0 ? 0 : Math.PI;
      put(bezels, f, i, 0, (BAY0 + BAY1) / 2, z + side * 0.004, W - 0.16, BAY1 - BAY0, 0.008);
      /* Header: live status screen with an accent underline. */
      put(headers, f, i, 0, H - 0.152, z + side * 0.006, 0.62, 0.008, 0.008);
      const screen = new THREE.Mesh(screenGeo[i], screenMat);
      _p.set(0, H - 0.1, z + side * 0.007);
      _q.setFromEuler(_e.set(0, flip, 0));
      screenMatrix.multiplyMatrices(basis[i], local.compose(_p, _q, _s.set(1, 1, 1)));
      screenMatrix.decompose(screen.position, screen.quaternion, screen.scale);
      g.add(screen);
      if (!isFan) {
        const pitch = (BAY1 - BAY0) / BLADES;
        for (let k = 0; k < BLADES; k++) {
          const y = BAY0 + pitch * (k + 0.5);
          const n = bIdx * BLADES + k;
          /* The faceplate texture reads left→right; turn it to face out. */
          put(slabs, n, i, 0, y, z + side * 0.016, W - 0.22, pitch * 0.8, 0.02, 0, flip, 0);
          const lx = side * 0.205;
          put(handles, n, i, side * 0.31, y, z + side * 0.03, 0.03, pitch * 0.62, 0.014);
          put(bladeLeds, n * 2, i, lx, y + pitch * 0.16, z + side * 0.028, 0.024, 0.02, 0.006);
          put(bladeLeds, n * 2 + 1, i, lx + side * 0.034, y + pitch * 0.16, z + side * 0.028, 0.024, 0.02, 0.006);
        }
        bIdx++;
      } else {
        const pitch = (BAY1 - BAY0) / FANS;
        for (let k = 0; k < FANS; k++) {
          const y = BAY0 + pitch * (k + 0.5);
          const n = fIdx * FANS + k;
          put(housings, n, i, 0, y, z + side * 0.012, W - 0.26, pitch * 0.94, 0.016);
          put(fanGlow, n, i, 0, y, z + side * 0.021, 1, 1, 1, 0, flip, 0);
          put(fanRings, n, i, 0, y, z + side * 0.028, 1, 1, 1, 0, flip, 0);
          put(hubs, n, i, 0, y, z + side * 0.038, 0.05, 0.02, 0.05, Math.PI / 2, 0, 0);
          /* Finger guard (two rings and a cross) and housing screws. */
          put(guardOuter, n, i, 0, y, z + side * 0.034, 1, 1, 1);
          put(guardInner, n, i, 0, y, z + side * 0.034, 1, 1, 1);
          for (let q = 0; q < 2; q++) put(struts, n * 2 + q, i, 0, y, z + side * 0.034, 0.006, 0.43, 0.006, 0, 0, (q ? 1 : -1) * 45 * DEG);
          const hw = (W - 0.26) / 2 - 0.035;
          const hh = (pitch * 0.94) / 2 - 0.035;
          for (let q = 0; q < 4; q++) {
            put(screws, n * 4 + q, i, (q & 1 ? 1 : -1) * hw, y + (q & 2 ? 1 : -1) * hh, z + side * 0.021, 0.012, 0.006, 0.012, Math.PI / 2, 0, 0);
          }
          /* Rotor basis, spun about its local z every frame. */
          _p.set(0, y, z + side * 0.026);
          _q.setFromEuler(_e.set(0, flip, 0));
          local.compose(_p, _q, _s.set(1.04, 1.04, 1.04));
          rotorBase.push(new THREE.Matrix4().multiplyMatrices(basis[i], local));
        }
        fIdx++;
      }
    });
    const fanCab = fanFaces.flatMap((f) => [f[0], f[0], f[0]]);
    const bladeCab = bladeFaces.map((f) => f[0]);

    for (const m of [body, posts, plinths, caps, tops, cables, clamps, headers, spines, trays, trayCables, bezels, slabs, handles, housings, hubs, screws, guardOuter, guardInner, struts]) g.add(m);
    for (const m of [strips, topBars, bladeLeds, fanRings, fanGlow, rotors]) g.add(m);

    /* Grated floor sector under the racks, edged by floor light arcs. */
    const pad = 9 * DEG;
    const floor = new THREE.Mesh(
      new THREE.RingGeometry(R - 0.62, R + 0.62, 48, 1, -(ARC0 + SPAN) * DEG - pad, SPAN * DEG + pad * 2),
      M.grating
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.022;
    g.add(floor);
    const arcMat = new THREE.MeshBasicMaterial({ color: 0xdfe6f2, toneMapped: false });
    const floorArcs = [];
    for (const r of [R - 0.66, R + 0.66]) {
      const arc = new THREE.Group();
      const torus = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 4, 64, SPAN * DEG + pad * 2), arcMat);
      torus.rotation.x = Math.PI / 2;
      arc.add(torus);
      arc.rotation.y = -(ARC0 * DEG - pad);
      arc.position.y = 0.03;
      g.add(arc);
      floorArcs.push(arc);
    }

    /* Green spill from the cold aisle onto the deck and the core. */
    const spill = new THREE.PointLight(PALETTE.green, 0, 6.5, 1.6);
    spill.position.set(0, 0.9, -(R - 1.1));
    g.add(spill);

    let spin = 0;
    const updateRotors = () => {
      for (let j = 0; j < rotorBase.length; j++) {
        local.makeRotationZ(spin * (j % 2 ? -1 : 1) + j * 0.7);
        rotors.setMatrixAt(j, _m.multiplyMatrices(rotorBase[j], local));
      }
      rotors.instanceMatrix.needsUpdate = true;
    };
    updateRotors();
    const onAt = (i, sim) => (sim.intro.gpu > i / N ? 1 : 0);
    let nextScreen = -1;
    const drawScreens = (t, sim) => {
      for (let i = 0; i < N; i++) {
        const util = Math.min(1, Math.max(0.03, sim.gpuLoad * (0.9 + 0.1 * Math.sin(i * 2.1)) + 0.05 * Math.sin(t * 3 + i * 1.7)));
        atlas.draw(i, util, 44 + util * 34 + Math.sin(t * 0.7 + i) * 1.5, sim.prefillLevel > 0.5);
      }
      atlas.tex.needsUpdate = true;
    };
    return {
      group: g,
      proxies,
      anchors: Array.from({ length: N }, (_, i) => {
        const r = R - D / 2 - 0.1;
        return [Math.cos(thAt(i)) * r, 1.0, Math.sin(thAt(i)) * r];
      }),
      update(dt, t, sim, c) {
        const load = sim.gpuLoad;
        spin += dt * (2 + load * 16) * sim.motion;
        updateRotors();
        const e = c.emph;
        for (let k = 0; k < strips.count; k++) {
          const i = k < N * 4 ? k >> 2 : k - N * 4;
          const wave = 0.85 + 0.15 * Math.sin(t * 2.4 - k * 0.6);
          strips.setColorAt(k, lit(PALETTE.green, (0.35 + load * 0.75) * wave * onAt(i, sim) * e + 0.02));
        }
        for (let i = 0; i < N; i++) topBars.setColorAt(i, lit(PALETTE.cool, 0.55 * onAt(i, sim) * e + 0.03));
        for (let j = 0; j < fanRings.count; j++) {
          const on = onAt(fanCab[j], sim);
          fanRings.setColorAt(j, lit(PALETTE.green, (0.45 + load * 0.9) * on * e + 0.03));
          fanGlow.setColorAt(j, lit(PALETTE.greenDeep, (0.35 + load * 0.6) * on * e + 0.02));
        }
        for (let b = 0; b < bladeCab.length; b++) {
          const on = onAt(bladeCab[b], sim);
          /* Activity LEDs climb with load: each blade bay is a bar meter. */
          const lvl = load * BLADES + Math.sin(t * 9 + b * 1.3) * 0.8;
          for (let k = 0; k < BLADES; k++) {
            const n = (b * BLADES + k) * 2;
            const busy = k < lvl && Math.sin(t * (11 + k) + b * 2.7 + k) > -0.4 ? 1 : 0.1;
            bladeLeds.setColorAt(n, lit(PALETTE.green, 0.7 * on * e + 0.03));
            const col = busy === 1 && sim.prefillLevel > 0.5 ? PALETTE.lime : PALETTE.cool;
            bladeLeds.setColorAt(n + 1, lit(col, busy * on * 0.8 * e + 0.02));
          }
        }
        for (const m of [strips, topBars, fanRings, fanGlow, bladeLeds]) m.instanceColor.needsUpdate = true;
        /* Screens redraw at ~4 Hz (string formatting is the one allocation). */
        if (t >= nextScreen || nextScreen - t > 1) {
          nextScreen = t + 0.25;
          drawScreens(t, sim);
        }
        screenMat.color.setScalar((0.08 + 0.92 * sim.intro.gpu) * Math.min(1.2, e));
        arcMat.color.copy(PALETTE.cool).multiplyScalar(0.25 + 0.45 * sim.intro.gpu * Math.min(1, e));
        spill.intensity = (1.2 + load * 3.2) * sim.intro.gpu * Math.min(1, e);
        c.activity = (0.25 + load * 1.5) * sim.intro.gpu;
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
    return buildVectorDB(ctx);
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
    return buildDeathStar(ctx);
  },

  "data-pipeline"(ctx) {
    return buildDataPipeline(ctx);
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
