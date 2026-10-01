/* ---------------------------------------------------------------------------
   Neural Compute Core — vector database (retrieval)
   ---------------------------------------------------------------------------
   A glass cube on a glowing grid plinth holding a graph of embeddings: blue
   and orange nodes joined by vector lines (each node linked to its nearest
   neighbours, HNSW-style). Fibre streams feed new vectors in from below.
   A query lights up the nearest neighbours and the edges between them.

   When selected the index breaks apart like an atom: most nodes fly out to
   electron orbits and an electron cloud, the core nodes condense into a
   nucleus of protons and neutrons, and then the nucleus opens up so each
   nucleon shows its three quarks bound by jittering gluon lines.
   Deselecting reassembles the graph.

   Local frame: y = 0 is the floor, the cube is centred at y = CY.
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const COL = {
  blue: new THREE.Color(0x3aa0ff),
  orange: new THREE.Color(0xff8a2a),
  lime: new THREE.Color(0x9dff4a),
  proton: new THREE.Color(0xff5a2a),
  neutron: new THREE.Color(0xc6dcff),
  electron: new THREE.Color(0x5fd8ff),
  cloud: new THREE.Color(0x2a6fff),
};
const QUARK = [new THREE.Color(0xff3344), new THREE.Color(0x33ff77), new THREE.Color(0x3a7bff)];

const CY = 0.84;
const SIZE = 1.3;
const N_NUC = 12;
const RINGS = [
  { r: 0.5, tilt: 72, yaw: 0, speed: 1.1 },
  { r: 0.66, tilt: 72, yaw: 60, speed: -0.8 },
  { r: 0.82, tilt: 72, yaw: 120, speed: 0.6 },
];
const PER_RING = 8;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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

/* Glowing blue grid for the plinth top. */
function gridTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = "#020a1c";
    g.fillRect(0, 0, W, H);
    const rad = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7);
    rad.addColorStop(0, "rgba(40,130,255,0.55)");
    rad.addColorStop(1, "rgba(10,40,120,0)");
    g.fillStyle = rad;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i <= 16; i++) {
      const p = (i / 16) * W;
      g.strokeStyle = i % 4 === 0 ? "rgba(120,200,255,0.95)" : "rgba(60,150,255,0.5)";
      g.lineWidth = i % 4 === 0 ? 3 : 1.5;
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, H);
      g.moveTo(0, p);
      g.lineTo(W, p);
      g.stroke();
    }
    g.strokeStyle = "rgba(150,220,255,1)";
    g.lineWidth = 6;
    g.strokeRect(3, 3, W - 6, H - 6);
  });
}

function plateTexture() {
  return canvasTex(512, 64, (g, W, H) => {
    g.fillStyle = "#06101f";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#7cc4ff";
    g.font = "700 30px ui-monospace, Menlo, Consolas, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("VECTOR INDEX · HNSW", W / 2, H / 2 + 1);
  });
}

export function buildVectorDB(ctx) {
  const low = ctx.quality.low;
  const N = low ? 52 : 84;
  const g = new THREE.Group();

  /* -------------------------------- plinth ----------------------------- */
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a2130, metalness: 0.7, roughness: 0.35 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.13, 1.55), dark);
  base.position.y = 0.065;
  g.add(base);
  const gridMat = new THREE.MeshBasicMaterial({ map: gridTexture(), toneMapped: false });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 1.48), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.132;
  g.add(grid);
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x4aa8ff, toneMapped: false });
  const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.56, 0.02, 1.56)), new THREE.LineBasicMaterial({ color: 0x6cc4ff, toneMapped: false }));
  rim.position.y = 0.13;
  g.add(rim);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.1125), new THREE.MeshBasicMaterial({ map: plateTexture(), toneMapped: false }));
  plate.position.set(0, 0.065, 0.777);
  g.add(plate);
  /* Glow strips along the plinth's lower edge. */
  for (const s of [1, -1]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.012, 0.012), rimMat);
    a.position.set(0, 0.02, s * 0.778);
    g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 1.5), rimMat);
    b.position.set(s * 0.778, 0.02, 0);
    g.add(b);
  }

  /* ------------------------------ glass cube --------------------------- */
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x6fb8ff,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(SIZE, SIZE, SIZE), glassMat);
  glass.position.y = CY;
  g.add(glass);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x8fd4ff, transparent: true, opacity: 0.85, toneMapped: false });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE, SIZE, SIZE)), edgeMat);
  edges.position.y = CY;
  g.add(edges);
  /* Corner caps. */
  const capGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const m = new THREE.Mesh(capGeo, dark);
    m.position.set((x * SIZE) / 2, CY + (y * SIZE) / 2, (z * SIZE) / 2);
    g.add(m);
  }

  /* --------------------------------- graph ----------------------------- */
  const core = new THREE.Group();
  core.position.y = CY;
  g.add(core);

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* Roles: 0..N_NUC-1 nucleons (even = proton, odd = neutron), then electrons
     on the rings, the rest become the electron cloud. Graph positions put the
     nucleons near the middle so they condense naturally. */
  const nE = RINGS.length * PER_RING;
  const graphPos = [];
  const graphCol = [];
  const cloudDir = [];
  const delay = new Float32Array(N);
  const phase = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const spread = i < N_NUC ? 0.28 : 0.54;
    graphPos.push(new THREE.Vector3((rnd() * 2 - 1) * spread, (rnd() * 2 - 1) * spread, (rnd() * 2 - 1) * spread));
    const orange = i < N_NUC ? i % 2 === 0 : rnd() < 0.28;
    graphCol.push(orange ? COL.orange : COL.blue);
    const d = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    cloudDir.push(d.multiplyScalar(0.42 + rnd() * 0.4));
    delay[i] = rnd();
    phase[i] = rnd() * TAU;
  }

  /* Vector lines: each node to its 3 nearest neighbours (deduplicated). */
  const nearest = (i, k) => {
    const out = [];
    for (let j = 0; j < N; j++) if (j !== i) out.push([graphPos[i].distanceToSquared(graphPos[j]), j]);
    out.sort((a, b) => a[0] - b[0]);
    return out.slice(0, k).map((e) => e[1]);
  };
  const edgeSet = new Set();
  const edgeList = [];
  for (let i = 0; i < N; i++) {
    for (const j of nearest(i, 3)) {
      const key = i < j ? i * 1000 + j : j * 1000 + i;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edgeList.push(i, j);
      }
    }
  }
  const nEdge = edgeList.length / 2;
  const linePos = new Float32Array(nEdge * 6);
  const lineCol = new Float32Array(nEdge * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage));
  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;
  core.add(lines);

  /* Node cores (instanced) + additive halos (points). */
  const nodeMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), nodeMat, N);
  nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  nodes.frustumCulled = false;
  core.add(nodes);
  const haloPos = new Float32Array(N * 3);
  const haloCol = new Float32Array(N * 3);
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute("position", new THREE.BufferAttribute(haloPos, 3).setUsage(THREE.DynamicDrawUsage));
  haloGeo.setAttribute("color", new THREE.BufferAttribute(haloCol, 3).setUsage(THREE.DynamicDrawUsage));
  const halos = new THREE.Points(
    haloGeo,
    new THREE.PointsMaterial({
      map: ctx.glow,
      size: 0.16,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  halos.frustumCulled = false;
  core.add(halos);

  /* ---------------------------- atom extras ---------------------------- */
  const ringQuat = RINGS.map((r) => new THREE.Quaternion().setFromEuler(new THREE.Euler(r.tilt * DEG, r.yaw * DEG, 0, "YXZ")));
  const orbitMat = new THREE.LineBasicMaterial({ color: 0x5fd8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  RINGS.forEach((r, ri) => {
    const pts = [];
    for (let i = 0; i <= 96; i++) pts.push(new THREE.Vector3(Math.cos((i / 96) * TAU) * r.r, 0, Math.sin((i / 96) * TAU) * r.r));
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat);
    l.quaternion.copy(ringQuat[ri]);
    core.add(l);
  });

  /* Nucleus glow. */
  const nucGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ctx.glow, color: 0xff7a3a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })
  );
  nucGlow.scale.set(0.7, 0.7, 1);
  core.add(nucGlow);

  /* Translucent nucleon shells revealed in the quark phase. */
  const shellMats = [COL.proton, COL.neutron].map(
    (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
  );
  const shellGeo = new THREE.SphereGeometry(1, 20, 14);
  const shells = [];
  for (let i = 0; i < N_NUC; i++) {
    const m = new THREE.Mesh(shellGeo, shellMats[i % 2]);
    m.visible = false;
    core.add(m);
    shells.push(m);
  }

  /* Quarks: three per nucleon, one of each colour charge. */
  const NQ = N_NUC * 3;
  const quarks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), NQ);
  quarks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  quarks.frustumCulled = false;
  for (let i = 0; i < NQ; i++) quarks.setColorAt(i, QUARK[i % 3]);
  quarks.visible = false;
  core.add(quarks);
  const gluPos = new Float32Array(N_NUC * 3 * 6);
  const gluCol = new Float32Array(N_NUC * 3 * 6);
  for (let n = 0; n < N_NUC; n++) {
    for (let e = 0; e < 3; e++) {
      const a = QUARK[e];
      const b = QUARK[(e + 1) % 3];
      gluCol.set([a.r, a.g, a.b, b.r, b.g, b.b], (n * 3 + e) * 6);
    }
  }
  const gluGeo = new THREE.BufferGeometry();
  gluGeo.setAttribute("position", new THREE.BufferAttribute(gluPos, 3).setUsage(THREE.DynamicDrawUsage));
  gluGeo.setAttribute("color", new THREE.BufferAttribute(gluCol, 3));
  const gluMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const gluons = new THREE.LineSegments(gluGeo, gluMat);
  gluons.frustumCulled = false;
  gluons.visible = false;
  core.add(gluons);

  /* Nucleon packing directions (Fibonacci sphere). */
  const nucDir = [];
  for (let i = 0; i < N_NUC; i++) {
    const y = 1 - (2 * (i + 0.5)) / N_NUC;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    nucDir.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }

  /* --------------------------- fibre streams in ------------------------ */
  const fibreMat = new THREE.MeshBasicMaterial({ color: 0x3a9cff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const fibres = [
    [[-1.05, 0.03, 0.35], [-0.82, 0.08, 0.3], [-0.62, 0.3, 0.2], [-0.4, CY - 0.3, 0.1]],
    [[-1.05, 0.03, -0.25], [-0.8, 0.1, -0.3], [-0.6, 0.38, -0.25], [-0.3, CY - 0.1, -0.2]],
    [[-0.3, 0.03, -1.05], [-0.25, 0.1, -0.82], [-0.15, 0.4, -0.6], [0.05, CY - 0.2, -0.3]],
  ].map((p) => new THREE.CatmullRomCurve3(p.map((v) => new THREE.Vector3(...v))));
  for (const c of fibres) g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 32, 0.008, 5, false), fibreMat));
  const M_PER = low ? 4 : 7;
  const motePos = new Float32Array(fibres.length * M_PER * 3);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3).setUsage(THREE.DynamicDrawUsage));
  const moteMat = new THREE.PointsMaterial({ map: ctx.glow, color: 0x8fd4ff, size: 0.07, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  g.add(motes);

  const proxy = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.6, 1.55), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.y = 0.8;

  /* ------------------------------- state ------------------------------- */
  const hits = new Uint8Array(N);
  let T = 0;
  let flow = 0;
  const pos = Array.from({ length: N }, () => new THREE.Vector3());
  const col = Array.from({ length: N }, () => new THREE.Color());
  const scl = new Float32Array(N);
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _c = new THREE.Color();
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _p = new THREE.Vector3();

  return {
    group: g,
    proxies: [proxy],
    search() {
      hits.fill(0);
      const q = Math.floor(Math.random() * N);
      hits[q] = 1;
      for (const j of nearest(q, 5)) hits[j] = 1;
    },
    update(dt, t, sim, c) {
      const target = c.selected ? 2 : 0;
      if (dt <= 0) T = target;
      else T = target > T ? Math.min(target, T + dt * 0.5) : Math.max(target, T - dt * 0.8);
      const k = smooth(0, 1, T);
      const q = smooth(1.05, 1.9, T);
      const intro = sim.intro.core;
      const em = c.emph * intro;
      const sg = sim.searchGlow;

      core.rotation.y += dt * (0.12 + 0.18 * k);
      glassMat.opacity = 0.07 * (1 - 0.7 * k);
      edgeMat.opacity = 0.85 - 0.55 * k;
      gridMat.color.setScalar(0.55 + 0.35 * em + 0.3 * sg);

      /* Node positions: graph → atom, staggered per node. */
      const nucR = 0.12 + 0.26 * q;
      for (let i = 0; i < N; i++) {
        const kn = smooth(delay[i] * 0.35, delay[i] * 0.35 + 0.65, k);
        const gp = graphPos[i];
        _a.set(gp.x + Math.sin(t * 0.9 + phase[i]) * 0.02, gp.y + Math.sin(t * 0.7 + phase[i] * 1.7) * 0.02, gp.z + Math.cos(t * 0.8 + phase[i]) * 0.02);
        let ac;
        let size;
        if (i < N_NUC) {
          const j = 0.012 * Math.sin(t * 9 + phase[i]);
          _b.copy(nucDir[i]).multiplyScalar(nucR + j);
          ac = i % 2 === 0 ? COL.proton : COL.neutron;
          size = 0.05 * (1 - q);
        } else if (i < N_NUC + nE) {
          const e = i - N_NUC;
          const ri = e % RINGS.length;
          const r = RINGS[ri];
          const ang = (Math.floor(e / RINGS.length) / PER_RING) * TAU + t * r.speed;
          _b.set(Math.cos(ang) * r.r, 0, Math.sin(ang) * r.r).applyQuaternion(ringQuat[ri]);
          ac = COL.electron;
          size = 0.026;
        } else {
          const d = cloudDir[i];
          _b.copy(d).multiplyScalar(1 + 0.06 * Math.sin(t * 2 + phase[i]));
          _b.x += Math.sin(t * 3.1 + phase[i]) * 0.03;
          _b.z += Math.cos(t * 2.7 + phase[i]) * 0.03;
          ac = COL.cloud;
          size = 0.011;
        }
        /* Arc outward while flying so nodes don't tunnel through the core. */
        pos[i].lerpVectors(_a, _b, kn);
        pos[i].multiplyScalar(1 + Math.sin(Math.PI * kn) * 0.25);
        const hit = hits[i] ? sg * (1 - k) : 0;
        const pulse = 0.75 + 0.25 * Math.sin(t * 1.6 + phase[i]);
        col[i].copy(graphCol[i]).lerp(ac, kn).lerp(COL.lime, Math.min(1, hit * 1.5));
        col[i].multiplyScalar((pulse + hit * 1.2) * em);
        scl[i] = THREE.MathUtils.lerp(0.03, size, kn) * (1 + hit * 0.6);
        _m.compose(pos[i], _q.identity(), _s.setScalar(Math.max(1e-4, scl[i])));
        nodes.setMatrixAt(i, _m);
        nodes.setColorAt(i, col[i]);
        haloPos.set([pos[i].x, pos[i].y, pos[i].z], i * 3);
        const hk = i >= N_NUC + nE ? 0.6 : i < N_NUC ? 1 - q : 1;
        haloCol.set([col[i].r * 0.55 * hk, col[i].g * 0.55 * hk, col[i].b * 0.55 * hk], i * 3);
      }
      nodes.instanceMatrix.needsUpdate = true;
      nodes.instanceColor.needsUpdate = true;
      haloGeo.attributes.position.needsUpdate = true;
      haloGeo.attributes.color.needsUpdate = true;

      /* Vector lines follow the nodes; they fade (but stay faintly visible,
         stretched) once the atom has formed. */
      const lineK = 0.55 - 0.47 * k;
      for (let e = 0; e < nEdge; e++) {
        const i = edgeList[e * 2];
        const j = edgeList[e * 2 + 1];
        const pi = pos[i];
        const pj = pos[j];
        linePos.set([pi.x, pi.y, pi.z, pj.x, pj.y, pj.z], e * 6);
        const h = hits[i] && hits[j] ? sg * (1 - k) : 0;
        const w = lineK * (1 + 0.35 * Math.sin(t * 2.2 + e)) + h * 1.6;
        _c.copy(col[i]).lerp(COL.lime, Math.min(1, h * 2));
        lineCol.set([_c.r * w, _c.g * w, _c.b * w], e * 6);
        _c.copy(col[j]).lerp(COL.lime, Math.min(1, h * 2));
        lineCol.set([_c.r * w, _c.g * w, _c.b * w], e * 6 + 3);
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;

      orbitMat.opacity = 0.6 * smooth(0.5, 1, k) * em;
      nucGlow.material.opacity = (0.55 * k * (1 - 0.4 * q) + 0.12 * Math.sin(t * 6) * k) * em;
      nucGlow.scale.setScalar(0.45 + 0.5 * q);

      /* Quark phase. */
      const showQ = q > 0.001;
      quarks.visible = gluons.visible = showQ;
      for (const s of shells) s.visible = showQ;
      if (showQ) {
        const shellR = 0.1 * q;
        shellMats[0].opacity = shellMats[1].opacity = 0.16 * q * em;
        for (let n = 0; n < N_NUC; n++) {
          shells[n].position.copy(pos[n]);
          shells[n].scale.setScalar(Math.max(1e-4, shellR));
          for (let u = 0; u < 3; u++) {
            const a = phase[n] + (u / 3) * TAU + t * 2.4;
            const jr = shellR * (0.5 + 0.12 * Math.sin(t * 11 + u * 2 + n));
            _p.set(Math.cos(a) * jr, Math.sin(t * 7 + u + n) * jr * 0.5, Math.sin(a) * jr).add(pos[n]);
            _m.compose(_p, _q.identity(), _s.setScalar(0.022 * q));
            quarks.setMatrixAt(n * 3 + u, _m);
            gluPos.set([_p.x, _p.y, _p.z], (n * 3 + u) * 6);
            gluPos.set([_p.x, _p.y, _p.z], (n * 3 + ((u + 2) % 3)) * 6 + 3);
          }
        }
        quarks.instanceMatrix.needsUpdate = true;
        gluGeo.attributes.position.needsUpdate = true;
        gluMat.opacity = (0.6 + 0.4 * Math.sin(t * 13)) * q * em;
      }

      /* Fibre motes stream new vectors into the cube. */
      flow += dt * (0.25 + 0.5 * (sim.embedPulse || 0) + 0.4 * sg);
      for (let f = 0; f < fibres.length; f++) {
        for (let m = 0; m < M_PER; m++) {
          const u = (flow + m / M_PER + f * 0.13) % 1;
          fibres[f].getPointAt(u, _p);
          motePos.set([_p.x, _p.y, _p.z], (f * M_PER + m) * 3);
        }
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteMat.opacity = (0.5 + 0.5 * sg) * em * (1 - 0.6 * k);
      fibreMat.opacity = (0.3 + 0.3 * em) * (1 - 0.5 * k);

      c.activity = 0.5 + sg;
    },
  };
}
