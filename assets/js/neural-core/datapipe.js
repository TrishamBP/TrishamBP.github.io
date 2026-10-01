/* ---------------------------------------------------------------------------
   Neural Compute Core — inference pipeline chassis (the data pipeline)
   ---------------------------------------------------------------------------
   A long machine chassis, styled after a disaggregated serving pipeline:

     request router → prefill cluster (blue) → KV cache layer (orange)
       → decode cluster (green) → scheduler & batching + GPU memory → output

   Fan-walled compute blocks, three glowing KV-cache cylinders whose level
   tracks the live KV occupancy, a blade rack and memory cards at the end,
   and bundles of glowing fibre carrying requests between stages. Label
   plates on the front name each stage and the engines behind it.

   The chassis is longer than the gap allows radially, so the body is
   turned to run tangent to the network-fabric ring (r 5.55) and pulled
   inward so it clears the ring, with the output end toward the embedding
   engine. flows.js starts the "pipeline" stream at the output (body-local
   (1.3, 0.4, 0) → world ≈ (3.93, 0.7, 2.69)); keep the two in sync.

   Body frame: flow runs along +x, y up, front (camera side) = +z,
   floor at y = 0.
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const TAU = Math.PI * 2;
const BLUE = new THREE.Color(0x3d9bff);
const ORANGE = new THREE.Color(0xff8a2a);
const GREEN = new THREE.Color(0x2cff6e);
const WHITE = new THREE.Color(0xffffff);

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

function put(mesh, i, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  mesh.setMatrixAt(i, _m);
}

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const css = (col) => "#" + col.getHexString();

/* Label plate: dark glass, coloured border, title + optional subtitle. */
function plateTexture(w, h, title, sub, col) {
  const PX = 900;
  return canvasTex(Math.round(w * PX), Math.round(h * PX), (g, W, H) => {
    g.fillStyle = "rgba(6,10,14,0.88)";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = css(col);
    g.globalAlpha = 0.85;
    g.lineWidth = 3;
    g.strokeRect(2, 2, W - 4, H - 4);
    g.globalAlpha = 1;
    const font = "Inter, 'Segoe UI', Roboto, Arial, sans-serif";
    const lines = title.split("\n");
    const size = Math.min(H * (sub ? 0.34 : 0.4 / Math.max(1, lines.length * 0.75)), W * 0.1);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#f2f6fa";
    g.font = `700 ${size}px ${font}`;
    const y0 = sub ? H * 0.36 : H / 2 - (lines.length - 1) * size * 0.6;
    lines.forEach((l, i) => g.fillText(l, W / 2, y0 + i * size * 1.2));
    if (sub) {
      g.fillStyle = css(col);
      g.font = `500 ${size * 0.8}px ${font}`;
      g.fillText(sub, W / 2, H * 0.7);
    }
  });
}

/* Fan rotor: seven swept blades around a hub, on transparent. */
function fanTexture() {
  return canvasTex(128, 128, (g, w) => {
    const C = w / 2;
    g.fillStyle = "#ffffff";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      g.beginPath();
      g.moveTo(C + Math.cos(a) * 14, C + Math.sin(a) * 14);
      g.quadraticCurveTo(C + Math.cos(a + 0.5) * 50, C + Math.sin(a + 0.5) * 50, C + Math.cos(a + 0.95) * 60, C + Math.sin(a + 0.95) * 60);
      g.lineTo(C + Math.cos(a + 0.55) * 60, C + Math.sin(a + 0.55) * 60);
      g.quadraticCurveTo(C + Math.cos(a + 0.2) * 34, C + Math.sin(a + 0.2) * 34, C + Math.cos(a + 0.4) * 14, C + Math.sin(a + 0.4) * 14);
      g.fill();
    }
    g.beginPath();
    g.arc(C, C, 16, 0, TAU);
    g.fill();
  });
}

function grilleTexture() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = "#1c1f24";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#07080a";
    for (let y = 4; y < h; y += 6) g.fillRect(4, y, w - 8, 3);
  });
}

export function buildDataPipeline(ctx) {
  const low = ctx.quality.low;
  const root = new THREE.Group();
  const g = new THREE.Group();
  g.position.set(-0.77, 0, -0.08);
  g.rotation.y = 39.8 * (Math.PI / 180);
  root.add(g);

  const dark = new THREE.MeshStandardMaterial({ color: 0x1d2126, metalness: 0.75, roughness: 0.4 });
  const darker = new THREE.MeshStandardMaterial({ color: 0x0d0f12, metalness: 0.6, roughness: 0.5 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.24 });
  const vent = new THREE.MeshStandardMaterial({ color: 0xffffff, map: grilleTexture(), metalness: 0.6, roughness: 0.55 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    g.add(m);
    return m;
  };
  const glowMat = (col) => new THREE.MeshBasicMaterial({ color: col.clone(), toneMapped: false });

  /* ------------------------------ layout ------------------------------- */
  const XL = -1.2;
  const XR = 1.45;
  const XC = (XL + XR) / 2;
  const LEN = XR - XL;
  const FZ = 0.24; // front face
  const Y_DECK = 0.28; // lower deck top / module floor
  const Y_MOD = 0.6; // module top
  const Y_TOP = 0.74; // roof
  const PREFILL = [-0.86, -0.54];
  const DECODE = [0.5, 0.82];
  const KV = [-0.22, 0, 0.22];
  const SCHED_X = 1.08;
  const MEM_X = 1.33;

  /* ------------------------------ chassis ------------------------------ */
  add(box, dark, XC, 0.03, 0, LEN + 0.12, 0.06, 0.6);
  const orangeStrip = glowMat(ORANGE);
  add(box, orangeStrip, XC, 0.045, 0.302, LEN + 0.1, 0.012, 0.004);
  add(box, dark, XC, (0.06 + Y_DECK) / 2, -0.01, LEN, Y_DECK - 0.06, 0.46);
  add(box, darker, XC, (Y_DECK + Y_TOP) / 2, -0.19, LEN, Y_TOP - Y_DECK, 0.1);
  add(box, dark, XC, Y_TOP + 0.015, 0, LEN + 0.04, 0.03, 0.52);
  add(box, vent, XC, Y_TOP + 0.031, -0.05, LEN - 0.2, 0.004, 0.3);
  /* End caps. */
  for (const x of [XL, XR]) add(box, dark, x, (0.06 + Y_TOP) / 2, 0, 0.04, Y_TOP - 0.06, 0.5);
  /* Roof light bars along the front edge, one per stage colour. */
  const barMats = { blue: glowMat(BLUE), green: glowMat(GREEN), orange: glowMat(ORANGE) };
  const roofBars = [
    [-1.15, -0.38, "blue"],
    [-0.34, 0.34, "blue"],
    [0.38, 0.95, "green"],
    [0.98, 1.42, "blue"],
  ];
  for (const [a, b, k] of roofBars) add(box, barMats[k], (a + b) / 2, Y_TOP + 0.034, FZ + 0.012, b - a - 0.04, 0.01, 0.012);
  for (const [a, b] of [[-1.0, -0.45], [-0.25, 0.25], [0.55, 1.1]]) add(box, barMats.orange, (a + b) / 2, Y_TOP + 0.034, -0.2, b - a, 0.008, 0.01);

  /* --------------------------- compute blocks -------------------------- */
  /* Prefill and decode: fan-walled blocks, 2 × 3 fans each, edge-lit. */
  const blocks = [...PREFILL.map((x) => ({ x, col: BLUE })), ...DECODE.map((x) => ({ x, col: GREEN }))];
  const BW = 0.28;
  const BH = Y_MOD - Y_DECK - 0.02;
  const BY = Y_DECK + 0.01 + BH / 2;
  const FAN_R = 0.046;
  const FANS = blocks.length * 6;
  const recess = new THREE.InstancedMesh(new THREE.CircleGeometry(FAN_R, 24), new THREE.MeshBasicMaterial({ color: 0x030405 }), FANS);
  const rotors = new THREE.InstancedMesh(
    new THREE.CircleGeometry(FAN_R * 0.9, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, map: fanTexture(), transparent: true, toneMapped: false, depthWrite: false }),
    FANS
  );
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(FAN_R, 0.006, 4, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), FANS);
  const edges = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), blocks.length * 4);
  const fans = [];
  blocks.forEach((b, i) => {
    add(box, dark, b.x, BY, 0.02, BW, BH, 0.36);
    add(box, darker, b.x, BY, FZ - 0.025, BW - 0.02, BH - 0.02, 0.01);
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 2; k++) {
        const x = b.x + (k - 0.5) * 0.124;
        const y = BY + (r - 1) * 0.098;
        fans.push({ x, y, block: i, phase: (r * 2 + k) * 0.7 });
        put(recess, fans.length - 1, x, y, FZ - 0.018, 1, 1, 1);
      }
    }
    put(edges, i * 4, b.x, BY + BH / 2, FZ - 0.01, BW, 0.008, 0.008);
    put(edges, i * 4 + 1, b.x, BY - BH / 2, FZ - 0.01, BW, 0.008, 0.008);
    put(edges, i * 4 + 2, b.x - BW / 2, BY, FZ - 0.01, 0.008, BH, 0.008);
    put(edges, i * 4 + 3, b.x + BW / 2, BY, FZ - 0.01, 0.008, BH, 0.008);
  });
  for (const m of [rotors, rings]) m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  g.add(recess, rotors, rings, edges);

  /* ---------------------------- KV cache layer ------------------------- */
  /* Three glass cylinders; the glowing column inside rises with KV fill. */
  const CYL_R = 0.082;
  const CYL_H = 0.27;
  const CYL_Y = Y_DECK + 0.03 + CYL_H / 2;
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffc89a,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const liquidMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.75, toneMapped: false, depthWrite: false });
  const ringMat = glowMat(ORANGE);
  const liquids = [];
  const kvGlows = [];
  for (const x of KV) {
    add(box, dark, x, Y_DECK + 0.012, 0.02, 0.2, 0.024, 0.22);
    add(new THREE.CylinderGeometry(CYL_R, CYL_R, CYL_H, 32, 1, true), glass, x, CYL_Y, 0.04);
    liquids.push(add(new THREE.CylinderGeometry(CYL_R * 0.82, CYL_R * 0.82, 1, 24), liquidMat, x, CYL_Y, 0.04));
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(CYL_R + 0.012, CYL_R + 0.012, 0.022, 32), steel, x, CYL_Y + s * (CYL_H / 2 + 0.011), 0.04);
      const r = add(new THREE.TorusGeometry(CYL_R + 0.006, 0.006, 6, 40), ringMat, x, CYL_Y + s * (CYL_H / 2 - 0.004), 0.04);
      r.rotation.x = Math.PI / 2;
    }
    add(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 12), steel, x, CYL_Y + CYL_H / 2 + 0.05, 0.04);
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: ctx.glow, color: 0xff7a1a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.4 })
    );
    sp.position.set(x, CYL_Y, 0.06);
    sp.scale.set(0.42, 0.55, 1);
    g.add(sp);
    kvGlows.push(sp);
  }
  /* Bubbles rising through the cylinders. */
  const BUB = low ? 24 : 54;
  const bubPos = new Float32Array(BUB * 3);
  const bubs = [];
  for (let i = 0; i < BUB; i++) {
    const a = i * 2.39996;
    const r = CYL_R * 0.7 * Math.sqrt((i * 0.618) % 1);
    bubs.push({ x: KV[i % 3] + Math.cos(a) * r, z: 0.04 + Math.sin(a) * r, u: (i * 0.381) % 1, v: 0.12 + ((i * 0.27) % 1) * 0.18 });
  }
  const bubGeo = new THREE.BufferGeometry();
  bubGeo.setAttribute("position", new THREE.BufferAttribute(bubPos, 3).setUsage(THREE.DynamicDrawUsage));
  const bubMat = new THREE.PointsMaterial({ size: 0.022, map: ctx.glow, color: 0xffe0b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const bubbles = new THREE.Points(bubGeo, bubMat);
  bubbles.frustumCulled = false;
  g.add(bubbles);
  /* Pump machinery on the lower deck under the cache. */
  add(box, vent, 0.01, 0.15, FZ - 0.09, 0.62, 0.17, 0.01);
  for (const [x, l] of [[-0.12, 0.3], [0.14, 0.24]]) {
    const pump = add(new THREE.CylinderGeometry(0.045, 0.045, l, 20), steel, x, 0.15, FZ - 0.03);
    pump.rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) {
      const fl = add(new THREE.CylinderGeometry(0.058, 0.058, 0.018, 20), dark, x + s * (l / 2 - 0.01), 0.15, FZ - 0.03);
      fl.rotation.z = Math.PI / 2;
    }
  }

  /* ------------------------ scheduler + GPU memory --------------------- */
  const SLOTS = 12;
  add(box, darker, SCHED_X, BY, 0.02, 0.2, BH, 0.36);
  const blades = new THREE.InstancedMesh(box, dark, SLOTS);
  const bladeLeds = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), SLOTS);
  for (let i = 0; i < SLOTS; i++) {
    const x = SCHED_X + ((i % 2) - 0.5) * 0.088;
    const y = Y_DECK + 0.04 + Math.floor(i / 2) * 0.047;
    put(blades, i, x, y, FZ - 0.03, 0.08, 0.038, 0.04);
    put(bladeLeds, i, x + 0.028, y, FZ - 0.008, 0.012, 0.008, 0.004);
  }
  g.add(blades, bladeLeds);
  const CARDS = 5;
  const cardLeds = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), CARDS);
  add(box, darker, MEM_X, BY, 0.02, 0.2, BH, 0.36);
  for (let i = 0; i < CARDS; i++) {
    const x = MEM_X + (i - 2) * 0.036;
    add(box, dark, x, BY, 0.06, 0.022, BH - 0.04, 0.3);
    put(cardLeds, i, x, BY, FZ - 0.016, 0.006, BH - 0.07, 0.004);
  }
  g.add(cardLeds);
  /* Pump wheel on the lower deck at the output end. */
  const wheel = add(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 32), steel, MEM_X, 0.17, FZ - 0.01);
  wheel.rotation.x = Math.PI / 2;
  const hub = add(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 16), dark, MEM_X, 0.17, FZ);
  hub.rotation.x = Math.PI / 2;

  /* -------------------------- pipes + cables --------------------------- */
  const tube = (pts, r, mat) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, low ? 20 : 40, r, 8), mat));
  };
  for (let i = 0; i < 3; i++) {
    const y = 0.36 + i * 0.07;
    tube([[-1.5, 0.06, 0.12 - i * 0.07], [-1.42, y - 0.04, 0.1 - i * 0.07], [-1.3, y, 0.06 - i * 0.05], [-1.19, y, 0.04 - i * 0.04]], 0.018, steel);
  }
  tube([[MEM_X + 0.05, 0.1, FZ + 0.02], [MEM_X + 0.16, 0.08, FZ + 0.06], [MEM_X + 0.3, 0.035, FZ + 0.04]], 0.022, steel);

  /* --------------------------- label plates ---------------------------- */
  const plates = [];
  const plate = (w, h, title, sub, col, x, y, z, ry = 0) => {
    const mat = new THREE.MeshBasicMaterial({ map: plateTexture(w, h, title, sub, col), transparent: true, toneMapped: false });
    const m = add(new THREE.PlaneGeometry(w, h), mat, x, y, z);
    m.rotation.y = ry;
    plates.push(mat);
    return m;
  };
  const PY = (Y_MOD + Y_TOP) / 2;
  plate(0.6, 0.11, "PREFILL CLUSTER", "DistServe", BLUE, -0.7, PY, FZ + 0.004);
  plate(0.62, 0.11, "KV CACHE LAYER", "Mooncake  |  Strata", ORANGE, 0, PY, FZ + 0.004);
  plate(0.6, 0.11, "DECODE CLUSTER", "DistServe", GREEN, 0.66, PY, FZ + 0.004);
  plate(0.22, 0.11, "SCHEDULER\n& BATCHING", null, BLUE, SCHED_X, PY, FZ + 0.004);
  plate(0.22, 0.11, "GPU MEMORY", null, GREEN, MEM_X, PY, FZ + 0.004);
  const LY = (0.06 + Y_DECK) / 2;
  plate(0.3, 0.15, "vLLM", "PagedAttention", BLUE, -0.86, LY, FZ + 0.004);
  plate(0.3, 0.15, "FlashInfer", null, BLUE, -0.53, LY, FZ + 0.004);
  plate(0.3, 0.15, "TensorRT-LLM", null, GREEN, 0.5, LY, FZ + 0.004);
  plate(0.3, 0.15, "SGLang", null, GREEN, 0.83, LY, FZ + 0.004);
  plate(0.26, 0.2, "REQUEST\nROUTER", null, BLUE, -1.56, 0.5, 0.16, 0.35);
  plate(0.22, 0.16, "OUTPUT", null, GREEN, 1.64, 0.48, 0.18, -0.35);
  for (const x of [-1.56, 1.64]) add(box, steel, x, 0.2, x < 0 ? 0.14 : 0.16, 0.012, 0.36, 0.012);

  /* ------------------------- glowing fibre flow ------------------------ */
  /* Bundles of curves between stages, plus the request stream entering
     from the router and the token stream leaving at the output. */
  const bundles = [];
  const bundle = (from, to, col, n, lift, spread) => {
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * spread;
      const a = new THREE.Vector3(from[0], from[1] + o, from[2] + o * 0.6);
      const b = new THREE.Vector3(to[0], to[1] - o, to[2] + o * 0.6);
      const mid = a.clone().lerp(b, 0.5);
      mid.y += lift;
      mid.z += 0.03;
      bundles.push({ curve: new THREE.CatmullRomCurve3([a, mid, b]), col });
    }
  };
  bundle([-1.9, 0.46, 0.2], [-1.0, 0.46, 0.2], BLUE, 5, 0.0, 0.025);
  bundle([-0.4, 0.47, 0.2], [-0.29, 0.45, 0.16], BLUE, 4, -0.03, 0.03);
  bundle([-0.29, 0.4, 0.16], [0.29, 0.4, 0.16], ORANGE, 3, -0.02, 0.03);
  bundle([0.29, 0.45, 0.16], [0.36, 0.46, 0.2], GREEN, 4, 0.03, 0.03);
  bundle([0.96, 0.42, 0.2], [0.98, 0.5, 0.2], ORANGE, 3, 0.04, 0.04);
  bundle([1.42, 0.44, 0.2], [1.85, 0.44, 0.2], GREEN, 5, 0.0, 0.025);
  const lineVerts = [];
  const lineCols = [];
  for (const b of bundles) {
    const pts = b.curve.getPoints(24);
    for (let i = 0; i < pts.length - 1; i++) {
      lineVerts.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      for (let k = 0; k < 2; k++) lineCols.push(b.col.r, b.col.g, b.col.b);
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));
  lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineCols, 3));
  const fibreMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  g.add(new THREE.LineSegments(lineGeo, fibreMat));

  /* Motes travel the fibres; long router/output streams get the most. */
  const P = low ? 90 : 220;
  const motes = [];
  const motePos = new Float32Array(P * 3);
  const moteCol = new Float32Array(P * 3);
  for (let i = 0; i < P; i++) {
    const b = bundles[i % bundles.length];
    const len = b.curve.getLength();
    motes.push({ b, u: (i * 0.618) % 1, speed: (0.35 + ((i * 0.37) % 1) * 0.3) / len });
    b.col.toArray(moteCol, i * 3);
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3).setUsage(THREE.DynamicDrawUsage));
  moteGeo.setAttribute("color", new THREE.BufferAttribute(moteCol, 3));
  const moteMat = new THREE.PointsMaterial({
    size: 0.028,
    map: ctx.glow,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const moteMesh = new THREE.Points(moteGeo, moteMat);
  moteMesh.frustumCulled = false;
  g.add(moteMesh);

  const proxy = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.85, 0.65), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.set(0.1, 0.42, 0.02);
  g.updateMatrix();
  proxy.applyMatrix4(g.matrix);

  let spin = 0;
  return {
    group: root,
    proxies: [proxy],
    update(dt, t, sim, c) {
      const em = Math.min(1.25, c.emph);
      const intro = sim.intro.core;
      const prefill = 0.45 + 0.8 * sim.prefillLevel;
      const decode = 0.45 + 0.6 * sim.tokenPulse + 0.3 * sim.coreLevel;
      spin += dt;

      /* Fans: prefill spins up with prefill load, decode with core load. */
      for (let i = 0; i < fans.length; i++) {
        const f = fans[i];
        const isPre = f.block < 2;
        const rate = isPre ? 6 + 10 * sim.prefillLevel : 6 + 6 * sim.coreLevel;
        put(rotors, i, f.x, f.y, FZ - 0.014, 1, 1, 1, 0, 0, -spin * rate - f.phase);
        put(rings, i, f.x, f.y, FZ - 0.012, 1, 1, 1);
        const k = (isPre ? prefill : decode) * em * intro;
        rotors.setColorAt(i, _c.copy(isPre ? BLUE : GREEN).multiplyScalar(0.35 * k));
        rings.setColorAt(i, _c.copy(isPre ? BLUE : GREEN).multiplyScalar(0.9 * k));
      }
      for (let i = 0; i < blocks.length; i++) {
        const k = (i < 2 ? prefill : decode) * em * intro;
        for (let j = 0; j < 4; j++) edges.setColorAt(i * 4 + j, _c.copy(blocks[i].col).multiplyScalar(1.1 * k));
      }
      rotors.instanceMatrix.needsUpdate = true;
      rings.instanceMatrix.needsUpdate = true;
      for (const m of [rotors, rings, edges]) m.instanceColor.needsUpdate = true;

      /* KV cylinders: liquid column tracks live KV occupancy. */
      const fill = 0.15 + 0.85 * Math.min(1, sim.kvFill);
      for (let i = 0; i < liquids.length; i++) {
        const lvl = Math.min(1, fill * (0.92 + 0.08 * Math.sin(t * 1.3 + i * 2)));
        const h = (CYL_H - 0.012) * lvl;
        liquids[i].scale.set(1, h, 1);
        liquids[i].position.y = CYL_Y - CYL_H / 2 + 0.006 + h / 2;
        kvGlows[i].material.opacity = (0.22 + 0.3 * lvl) * em * intro;
      }
      liquidMat.color.copy(ORANGE).multiplyScalar((0.7 + 0.4 * fill) * em * intro);
      ringMat.color.copy(ORANGE).multiplyScalar(0.9 * em * intro);
      for (let i = 0; i < BUB; i++) {
        const b = bubs[i];
        b.u = (b.u + dt * b.v) % 1;
        const y = CYL_Y - CYL_H / 2 + 0.01 + b.u * (CYL_H - 0.02) * fill;
        bubPos.set([b.x + Math.sin(t * 3 + i) * 0.004, y, b.z], i * 3);
      }
      bubGeo.attributes.position.needsUpdate = true;
      bubMat.opacity = 0.8 * em * intro;

      /* Scheduler blades blink with the batching tick; memory cards with load. */
      const tick = Math.floor(t * 6);
      for (let i = 0; i < SLOTS; i++) {
        const on = (i * 7 + tick) % 5 < 3;
        bladeLeds.setColorAt(i, _c.copy(i % 3 ? GREEN : BLUE).multiplyScalar((on ? 1.2 : 0.15) * em * intro));
      }
      bladeLeds.instanceColor.needsUpdate = true;
      for (let i = 0; i < CARDS; i++) {
        cardLeds.setColorAt(i, _c.copy(GREEN).multiplyScalar((0.5 + 0.6 * sim.coreLevel + 0.2 * Math.sin(t * 2 + i)) * em * intro));
      }
      cardLeds.instanceColor.needsUpdate = true;
      wheel.rotation.y += dt * 1.5;

      barMats.blue.color.copy(BLUE).multiplyScalar(1.2 * em * intro);
      barMats.green.color.copy(GREEN).multiplyScalar(1.2 * em * intro);
      barMats.orange.color.copy(ORANGE).multiplyScalar(0.9 * em * intro);
      orangeStrip.color.copy(ORANGE).multiplyScalar(0.7 * em * intro);
      for (const m of plates) m.color.copy(WHITE).multiplyScalar(0.55 + 0.45 * Math.min(1, em));

      /* Fibre motes. */
      for (let i = 0; i < P; i++) {
        const m = motes[i];
        m.u = (m.u + dt * m.speed) % 1;
        m.b.curve.getPointAt(m.u, _p);
        motePos.set([_p.x, _p.y, _p.z], i * 3);
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteMat.opacity = 0.9 * em * intro;
      fibreMat.opacity = 0.35 * em * intro;
      c.activity = 0.7;
    },
  };
}
