/* ---------------------------------------------------------------------------
   Neural Compute Core — data processing line (the data pipeline)
   ---------------------------------------------------------------------------
   A glass-tube conveyor running through a row of framed processing
   stations, styled after a neon data factory:

     ingest housing → clean → chunk → embed → output cabinet (green fans)

   Raw documents enter the ingest housing as stacks of glowing pages. The
   clean station turns each stack into a glass data cube, the chunk station
   splits the cube into small blocks, the embed station recolours them lime
   in a cloud of sparks, and the blocks regroup and stream into the output
   cabinet. flows.js starts the "pipeline" stream at the cabinet (local
   x ≈ 1.3), so the cabinet must stay at the +x end.

   Local frame: flow runs along +x, y up, front (camera side) = +z,
   floor at y = 0.
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const TAU = Math.PI * 2;
const BLUE = new THREE.Color(0x4aa8ff);
const LIME = new THREE.Color(0xa6ff3a);
const GREEN = new THREE.Color(0x2cff6e);

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _c2 = new THREE.Color();

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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
  t.anisotropy = 4;
  return t;
}

/* A page of a document: header bar and lines of "text". */
function pageTexture() {
  return canvasTex(96, 128, (g, w, h) => {
    g.fillStyle = "#eef5ff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#7a9cc8";
    g.fillRect(10, 10, 46, 8);
    g.fillStyle = "#9cb4d4";
    for (let y = 28; y < h - 10; y += 8) g.fillRect(10, y, 50 + ((y * 37) % 26), 3);
    g.strokeStyle = "#b9cbe4";
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
  });
}

/* Fan rotor: seven swept blades around a hub, on transparent. */
function fanTexture() {
  return canvasTex(128, 128, (g, w) => {
    const C = w / 2;
    g.clearRect(0, 0, w, w);
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

/* Vent grille for cabinet and support panels. */
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
  const g = new THREE.Group();

  const dark = new THREE.MeshStandardMaterial({ color: 0x23272d, metalness: 0.7, roughness: 0.42 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8b939d, metalness: 0.85, roughness: 0.28 });
  const grille = grilleTexture();
  const vent = new THREE.MeshStandardMaterial({ color: 0xffffff, map: grille, metalness: 0.6, roughness: 0.55 });
  const cable = new THREE.MeshStandardMaterial({ color: 0x101215, metalness: 0.4, roughness: 0.6 });
  const blueLed = new THREE.MeshBasicMaterial({ color: 0x4aa8ff, toneMapped: false });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    g.add(m);
    return m;
  };

  /* ------------------------------ layout ------------------------------- */
  const TY = 0.42; // tube axis height
  const TR = 0.12; // tube radius
  const X0 = -1.12; // packets spawn here (inside ingest housing)
  const X1 = 1.2; // ... and disappear into the cabinet here
  const STATIONS = [
    { x: -1.0, w: 0.34, h: 0.44, d: 0.42 }, // ingest housing
    { x: -0.5, w: 0.26, h: 0.36, d: 0.36 }, // clean
    { x: 0.02, w: 0.26, h: 0.36, d: 0.36 }, // chunk
    { x: 0.54, w: 0.26, h: 0.36, d: 0.36 }, // embed
  ];
  const CAB = { x: 1.33, w: 0.32, h: 0.7, d: 0.5 };

  /* ----------------------------- base + legs --------------------------- */
  add(box, dark, 0.15, 0.03, 0, 2.75, 0.06, 0.34);
  add(box, ctx.accent, 0.15, 0.062, 0.171, 2.75, 0.01, 0.006);
  /* Under-tube rail with a light strip, as in the reference. */
  add(box, steel, 0.0, TY - TR - 0.035, 0.0, 2.2, 0.025, 0.1);
  add(box, blueLed, 0.0, TY - TR - 0.035, 0.052, 2.2, 0.008, 0.004);
  for (const s of STATIONS) {
    const legH = TY - s.h / 2 - 0.06;
    add(box, vent, s.x, 0.06 + legH / 2, 0, s.w * 0.75, legH, s.d * 0.7);
  }
  /* Rail pedestals between stations. */
  for (const x of [-0.24, 0.28, 0.86]) add(box, dark, x, 0.06 + (TY - TR - 0.11) / 2, 0, 0.06, TY - TR - 0.11, 0.08);

  /* ------------------------------ glass tube --------------------------- */
  const glass = new THREE.MeshStandardMaterial({
    color: 0xa8d8ff,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const tubeL = CAB.x - CAB.w / 2 - (STATIONS[0].x + STATIONS[0].w / 2);
  const tubeX = STATIONS[0].x + STATIONS[0].w / 2 + tubeL / 2;
  const tube = add(new THREE.CylinderGeometry(TR, TR, tubeL, 32, 1, true), glass, tubeX, TY, 0);
  tube.rotation.z = Math.PI / 2;
  /* Specular streaks along the top of the glass. */
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false });
  add(box, streakMat, tubeX, TY + TR * 0.93, TR * 0.3, tubeL, 0.006, 0.01);
  add(box, streakMat, tubeX, TY + TR * 0.6, TR * 0.78, tubeL, 0.004, 0.006);
  /* Clamp collars between stations. */
  const collarGeo = new THREE.TorusGeometry(TR + 0.006, 0.009, 8, 32);
  for (const x of [-0.76, -0.24, 0.28, 0.8, 1.06]) {
    const c = add(collarGeo, steel, x, TY, 0);
    c.rotation.y = Math.PI / 2;
  }

  /* ------------------------------ stations ----------------------------- */
  /* Each station: an open frame (12 edge bars), a dark back plate, blue
     corner light strips and a green status bar on top that flares as a
     payload passes through. */
  const BAR = 0.028;
  const frames = new THREE.InstancedMesh(box, steel, STATIONS.length * 12);
  const corners = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), STATIONS.length * 4);
  const status = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), STATIONS.length);
  let f = 0;
  STATIONS.forEach((s, i) => {
    const hw = s.w / 2;
    const hh = s.h / 2;
    const hd = s.d / 2;
    for (const y of [-hh, hh]) for (const z of [-hd, hd]) put(frames, f++, s.x, TY + y, z, s.w + BAR, BAR, BAR);
    for (const x of [-hw, hw]) for (const z of [-hd, hd]) put(frames, f++, s.x + x, TY, z, BAR, s.h, BAR);
    for (const x of [-hw, hw]) for (const y of [-hh, hh]) put(frames, f++, s.x + x, TY + y, 0, BAR, BAR, s.d + BAR);
    let k = 0;
    for (const x of [-hw, hw]) for (const z of [-hd, hd]) put(corners, i * 4 + k++, s.x + x + (x > 0 ? -1 : 1) * 0.02, TY, z + (z > 0 ? 0.016 : -0.016), 0.008, s.h * 0.82, 0.006);
    put(status, i, s.x, TY + hh + 0.022, hd - 0.05, s.w * 0.7, 0.014, 0.05);
    /* Back plate and roof plate close the frame from behind / above. */
    add(box, dark, s.x, TY, -hd + 0.005, s.w, s.h, 0.01);
    add(box, vent, s.x, TY + hh + 0.006, -0.04, s.w * 0.9, 0.012, s.d * 0.55);
    /* Port rings where the tube enters and leaves. */
    for (const x of [-hw, hw]) {
      if (i === 0 && x < 0) continue;
      const r = add(new THREE.TorusGeometry(TR + 0.02, 0.016, 8, 32), dark, s.x + x, TY, 0);
      r.rotation.y = Math.PI / 2;
    }
  });
  /* Ingest housing is enclosed on its intake side. */
  add(box, dark, STATIONS[0].x - STATIONS[0].w / 2 + 0.006, TY, 0, 0.012, STATIONS[0].h, STATIONS[0].d);
  g.add(frames, corners, status);

  /* -------------------------- output cabinet --------------------------- */
  add(box, dark, CAB.x, CAB.h / 2 + 0.06, 0, CAB.w, CAB.h, CAB.d);
  add(box, vent, CAB.x, CAB.h + 0.065, 0, CAB.w * 0.85, 0.012, CAB.d * 0.8);
  add(box, vent, CAB.x + CAB.w / 2 + 0.003, CAB.h / 2 + 0.06, 0, 0.006, CAB.h * 0.8, CAB.d * 0.7);
  for (const z of [-1, 1]) add(box, blueLed, CAB.x - CAB.w / 2 - 0.003, CAB.h / 2 + 0.06, z * (CAB.d / 2 - 0.03), 0.004, CAB.h * 0.75, 0.008);
  /* Three green fans on the camera-facing side. */
  const FAN_R = 0.088;
  const fanTex = fanTexture();
  const rotorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: fanTex, transparent: true, toneMapped: false, depthWrite: false });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const rotors = [];
  const fanZ = CAB.d / 2 + 0.004;
  for (let i = 0; i < 3; i++) {
    const y = 0.06 + CAB.h * (0.2 + i * 0.3);
    add(new THREE.CircleGeometry(FAN_R, 32), new THREE.MeshBasicMaterial({ color: 0x030604 }), CAB.x, y, fanZ);
    const ring = add(new THREE.TorusGeometry(FAN_R, 0.009, 6, 40), ringMat, CAB.x, y, fanZ + 0.004);
    ring.renderOrder = 1;
    const rotor = add(new THREE.CircleGeometry(FAN_R * 0.92, 32), rotorMat, CAB.x, y, fanZ + 0.006);
    rotors.push(rotor);
  }
  const fanGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ctx.glow, color: 0x2cff6e, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.3 })
  );
  fanGlow.position.set(CAB.x, 0.06 + CAB.h * 0.5, fanZ + 0.05);
  fanGlow.scale.set(0.55, 0.85, 1);
  g.add(fanGlow);

  /* ----------------------------- floor cables -------------------------- */
  const cableRuns = [
    [[-1.0, 0.07, -0.14], [-0.4, 0.075, -0.25], [0.4, 0.075, -0.26], [1.0, 0.07, -0.24], [1.22, 0.16, -0.2]],
    [[-0.5, 0.07, -0.12], [0.1, 0.08, -0.22], [0.8, 0.08, -0.22], [1.2, 0.28, -0.18]],
    [[0.02, 0.07, -0.12], [0.6, 0.085, -0.19], [1.05, 0.09, -0.19], [1.2, 0.4, -0.16]],
  ];
  for (const pts of cableRuns) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, low ? 24 : 48, 0.014, 6), cable));
  }

  /* ------------------------------ payloads ----------------------------- */
  const N = 8;
  const SHEETS = 3;
  const CHUNKS = 8;
  const pageMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: pageTexture(), toneMapped: false, transparent: true, side: THREE.DoubleSide });
  const pages = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), pageMat, N * SHEETS);
  const shellMat = new THREE.MeshBasicMaterial({ color: 0x3a8cff, transparent: true, opacity: 0.42, toneMapped: false, depthWrite: false });
  const shells = new THREE.InstancedMesh(box, shellMat, N);
  const cores = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), N);
  const chunks = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9 }), N * CHUNKS);
  for (const m of [pages, shells, cores, chunks]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    g.add(m);
  }
  for (let i = 0; i < N; i++) cores.setColorAt(i, BLUE);
  for (let i = 0; i < N * CHUNKS; i++) chunks.setColorAt(i, BLUE);

  /* Spark clouds in the chunk and embed stations. */
  const SPARKS = low ? 40 : 90;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkCol = new Float32Array(SPARKS * 3);
  for (let i = 0; i < SPARKS; i++) {
    const r = 0.04 + 0.08 * Math.cbrt(((i * 0.618) % 1));
    const a = i * 2.39996;
    const y = ((i * 0.381) % 1) * 2 - 1;
    const rr = Math.sqrt(1 - y * y) * r;
    sparkPos.set([Math.cos(a) * rr, y * r, Math.sin(a) * rr], i * 3);
    (i % 3 ? LIME : BLUE).toArray(sparkCol, i * 3);
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkCol, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.045,
    map: ctx.glow,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sparkClouds = [STATIONS[2], STATIONS[3]].map((s) => {
    const p = new THREE.Points(sparkGeo, sparkMat);
    p.position.set(s.x, TY, 0);
    g.add(p);
    return p;
  });

  const proxy = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.85, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.set(0.18, 0.42, 0);

  const CHUNK_DIRS = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) CHUNK_DIRS.push(new THREE.Vector3(x, y, z));
  const stationHeat = new Float32Array(STATIONS.length);
  let shift = 0;

  return {
    group: g,
    proxies: [proxy],
    update(dt, t, sim, c) {
      shift = (shift + dt * 0.075) % 1;
      const em = c.emph;
      stationHeat.fill(0);

      for (let i = 0; i < N; i++) {
        const u = (i / N + shift) % 1;
        const x = X0 + u * (X1 - X0);
        const fade = smooth(X0, X0 + 0.08, x) * (1 - smooth(X1 - 0.12, X1, x));
        STATIONS.forEach((s, k) => {
          stationHeat[k] = Math.max(stationHeat[k], 1 - smooth(0, s.w * 0.6, Math.abs(x - s.x)));
        });

        /* Stage 1: page stacks, folding into a cube inside the clean station. */
        const pg = fade * (1 - smooth(-0.58, -0.46, x));
        for (let k = 0; k < SHEETS; k++) {
          const o = (k - 1) * 0.032;
          const sc = pg * 0.999 + 0.001;
          put(pages, i * SHEETS + k, x + o, TY + 0.005 + (k - 1) * 0.006, (k - 1) * 0.012, 0.15 * sc, 0.2 * sc, 1, 0.05 * (k - 1), Math.PI / 2 + 0.12 * (k - 1), 0.05);
        }

        /* Stage 2: glass data cube with a bright core, splitting in the chunk station. */
        const cb = fade * smooth(-0.54, -0.44, x) * (1 - smooth(-0.04, 0.05, x));
        const spin = t * 0.6 + i;
        put(shells, i, x, TY, 0, 0.13 * cb + 0.001, 0.13 * cb + 0.001, 0.13 * cb + 0.001, 0.3, spin, 0.2);
        put(cores, i, x, TY, 0, 0.06 * cb + 0.001, 0.06 * cb + 0.001, 0.06 * cb + 0.001, 0.3, spin, 0.2);
        const cleaned = smooth(-0.56, -0.42, x);
        cores.setColorAt(i, _c.copy(BLUE).lerp(LIME, cleaned * 0.6).multiplyScalar((0.5 + 0.9 * cleaned) * em));

        /* Stage 3: chunks — spread apart, turn lime in the embed station,
           then regroup on the way into the cabinet. */
        const ch = fade * smooth(-0.04, 0.05, x);
        const spread = 0.065 * smooth(-0.02, 0.12, x) * (1 - 0.55 * smooth(0.7, 1.05, x));
        const embedded = smooth(0.42, 0.62, x);
        _c.copy(BLUE).lerp(LIME, embedded).multiplyScalar((0.6 + 0.6 * embedded) * em);
        const rot = t * 0.9 + i * 1.3;
        const cr = Math.cos(rot);
        const sr = Math.sin(rot);
        for (let k = 0; k < CHUNKS; k++) {
          const d = CHUNK_DIRS[k];
          const dx = d.x * cr - d.z * sr;
          const dz = d.x * sr + d.z * cr;
          const sz = (0.04 + 0.012 * ((k * 5) % 3)) * ch + 0.001;
          put(chunks, i * CHUNKS + k, x + dx * spread, TY + d.y * spread * 0.85, dz * spread, sz, sz, sz, rot, rot * 0.7, 0);
          chunks.setColorAt(i * CHUNKS + k, k % 4 === 0 ? _c2.copy(_c).lerp(GREEN, 0.5 * embedded) : _c);
        }
      }
      for (const m of [pages, shells, cores, chunks]) m.instanceMatrix.needsUpdate = true;
      cores.instanceColor.needsUpdate = true;
      chunks.instanceColor.needsUpdate = true;

      /* Station lights flare as payloads pass. */
      for (let k = 0; k < STATIONS.length; k++) {
        const h = stationHeat[k];
        status.setColorAt(k, _c.copy(GREEN).multiplyScalar((0.35 + 1.1 * h) * em));
        for (let j = 0; j < 4; j++) corners.setColorAt(k * 4 + j, _c.copy(BLUE).multiplyScalar((0.45 + 0.6 * h) * em));
      }
      status.instanceColor.needsUpdate = true;
      corners.instanceColor.needsUpdate = true;
      sparkClouds.forEach((p, k) => {
        p.rotation.y = t * (0.5 + k * 0.3);
        p.rotation.x = Math.sin(t * 0.4 + k) * 0.4;
        p.scale.setScalar(0.7 + 0.5 * stationHeat[k + 2]);
      });
      sparkMat.opacity = (0.3 + 0.5 * Math.max(stationHeat[2], stationHeat[3])) * Math.min(1, em);

      pageMat.color.setScalar(0.55 + 0.45 * Math.min(1, em));
      for (let i = 0; i < rotors.length; i++) rotors[i].rotation.z -= dt * (9 + i);
      const fanK = (0.45 + 0.35 * Math.min(1, em)) * (0.85 + 0.15 * Math.sin(t * 3));
      rotorMat.color.copy(GREEN).multiplyScalar(0.55 * fanK);
      ringMat.color.copy(GREEN).multiplyScalar(1.1 * fanK);
      fanGlow.material.opacity = 0.18 + 0.2 * fanK;
      blueLed.color.copy(BLUE).multiplyScalar(0.5 + 0.4 * Math.min(1, em));
      c.activity = 0.7;
    },
  };
}
