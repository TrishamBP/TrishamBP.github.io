/* ---------------------------------------------------------------------------
   Neural Compute Core — embedding engine
   ---------------------------------------------------------------------------
   A 90° V8, styled after raw_data/images (1).jpeg. It has a grey cast block,
   red coil packs on the valve covers, a silver intake plenum and throttle
   body in the V, chrome exhaust headers down both flanks, a serpentine belt
   drive at the front and a flywheel at the back.

   It really runs. The crank turns, and eight pistons and rods follow it with
   slider-crank kinematics in a cross-plane firing order. Each coil flashes as
   its cylinder fires, and the RPM jumps with every embed pulse
   (sim.embedPulse). The exhausts blow out a stream of glowing vector motes:
   text goes in, dense vectors come out.

   While selected (`c.selected`), the engine explodes into its sub-parts, and
   each one is labelled with the embedding stage it stands for:
     intake plenum + throttle → tokenizer
     cylinder heads + coils   → attention heads
     pistons + rods           → transformer layers
     crankshaft               → mean pooling
     exhaust headers          → vector output
     belt drive               → batch scheduler
     flywheel                 → ONNX runtime
     oil pan                  → L2 normalize
   Deselecting reassembles it.

   Local frame: y = 0 is the deck, the crank runs along z and the belt drive
   faces +z.
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const TAU = Math.PI * 2;
const YC = 0.56; // crank axis height
const BANK = Math.PI / 4; // each bank is 45° off vertical → 90° V
const CR = 0.07; // crank throw
const ROD = 0.24; // con-rod length
const CYL_Z = [-0.33, -0.11, 0.11, 0.33];
const STAGGER = 0.05; // left bank is offset along the crank
/* Cross-plane crank: throw angle per cylinder index. */
const THROW = [0, Math.PI / 2, (3 * Math.PI) / 2, Math.PI];

const BLUE = new THREE.Color(0x4fb4ff);
const ORANGE = new THREE.Color(0xff9a2e);
const RED = new THREE.Color(0xff2a2a);

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const _p = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _d = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _c = new THREE.Color();

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

/* Exploded-view callout: stage name over the engine part's name. */
function labelSprite(title, sub) {
  const tex = canvasTex(512, 128, (g, W, H) => {
    g.fillStyle = "rgba(4,10,22,0.82)";
    g.fillRect(6, 10, W - 12, H - 20);
    g.strokeStyle = "#4fb4ff";
    g.shadowColor = "#4fb4ff";
    g.shadowBlur = 10;
    g.lineWidth = 3;
    g.strokeRect(6, 10, W - 12, H - 20);
    g.shadowBlur = 0;
    g.fillStyle = "#4fb4ff";
    g.fillRect(6, 10, 8, H - 20);
    g.fillStyle = "#e6f3ff";
    g.font = "700 40px 'Space Grotesk', Arial, sans-serif";
    g.fillText(title, 32, 60);
    g.fillStyle = "rgba(160,205,255,0.8)";
    g.font = "500 24px 'Space Mono', monospace";
    g.fillText(sub, 32, 98);
  });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 });
  const s = new THREE.Sprite(mat);
  s.scale.set(0.64, 0.16, 1);
  s.center.set(0, 0.5);
  s.renderOrder = 10;
  return s;
}

export function buildEngine(ctx) {
  const low = ctx.quality && ctx.quality.low;
  const seg = low ? 16 : 28;

  const M = {
    block: new THREE.MeshStandardMaterial({ color: 0x8f878d, metalness: 0.72, roughness: 0.42 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.92, roughness: 0.26 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.16 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1b1f, metalness: 0.55, roughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0.1, roughness: 0.8 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x6d737c, metalness: 0.95, roughness: 0.3 }),
    plinth: new THREE.MeshStandardMaterial({ color: 0x08090b, metalness: 0.6, roughness: 0.5 }),
  };

  const box = (mat, x, y, z, sx, sy, sz, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  /* Cylinder with its axis along z. */
  const zcyl = (mat, x, y, z, r, len, parent, n = seg) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, n), mat);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const tube = (mat, pts, r, parent) => {
    const cv = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(cv, low ? 16 : 32, r, 10), mat);
    parent.add(m);
    return m;
  };

  const g = new THREE.Group();

  /* Display plinth with a blue-lit edge. */
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.98, 0.07, 6), M.plinth);
  plinth.position.y = 0.035;
  g.add(plinth);
  const plinthGlow = new THREE.Mesh(
    new THREE.TorusGeometry(0.93, 0.008, 6, 6),
    new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, toneMapped: false })
  );
  plinthGlow.rotation.set(Math.PI / 2, 0, Math.PI / 6);
  plinthGlow.position.y = 0.074;
  g.add(plinthGlow);

  /* Everything above the plinth; lifts while exploded so the oil pan can
     drop clear. Turned so the belt drive faces the camera three-quarters. */
  const engine = new THREE.Group();
  engine.rotation.y = -0.5;
  engine.scale.setScalar(0.86);
  g.add(engine);

  /* Exploding pieces: { obj, base, off, delay } (offset in parent space). */
  const pieces = [];
  const piece = (obj, off, delay = 0) => {
    pieces.push({ obj, base: obj.position.clone(), off: new THREE.Vector3(...off), delay });
    return obj;
  };
  const labels = [];
  const label = (parent, title, sub, pos) => {
    const s = labelSprite(title, sub);
    s.position.set(...pos);
    parent.add(s);
    labels.push(s);
  };

  /* ------------------------------ bottom end ----------------------------- */
  const crankcase = new THREE.Group();
  box(M.block, 0, YC - 0.04, 0, 0.62, 0.3, 0.96, crankcase);
  box(M.block, 0, YC + 0.12, 0, 0.46, 0.12, 0.98, crankcase);
  for (const z of [-0.44, -0.22, 0, 0.22, 0.44]) box(M.block, 0, YC - 0.05, z, 0.66, 0.26, 0.04, crankcase);
  engine.add(crankcase);

  const pan = new THREE.Group();
  box(M.dark, 0, 0.27, 0, 0.56, 0.12, 0.9, pan);
  for (let i = 0; i < 6; i++) box(M.steel, 0, 0.205, -0.36 + i * 0.144, 0.5, 0.012, 0.03, pan);
  engine.add(pan);
  piece(pan, [0, -0.24, 0]);
  label(pan, "L2 NORMALIZE", "oil pan", [0.38, 0.22, 0.3]);

  /* Crankshaft: main journal, counterweights and throws. */
  const crank = new THREE.Group();
  crank.position.set(0, YC, 0);
  zcyl(M.steel, 0, 0, 0, 0.03, 1.12, crank);
  for (let j = 0; j < 4; j++) {
    const a = THROW[j];
    const throwG = new THREE.Group();
    throwG.position.z = CYL_Z[j];
    throwG.rotation.z = a;
    for (const dz of [-0.07, 0.07]) {
      const web = box(M.steel, 0, 0, dz, 0.07, CR * 2 + 0.06, 0.03, throwG);
      web.position.y = CR / 2 - 0.01;
      box(M.steel, 0, -0.06, dz, 0.16, 0.06, 0.03, throwG);
    }
    zcyl(M.chrome, 0, CR, 0, 0.022, 0.15, throwG, 12);
    crank.add(throwG);
  }
  engine.add(crank);
  label(engine, "MEAN POOLING", "crankshaft", [0.5, YC - 0.15, -0.2]);

  /* Pistons and rods, posed every frame from the crank angle. */
  const cylinders = [];
  const pistonGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.09, seg);
  const crownGeo = new THREE.CylinderGeometry(0.074, 0.074, 0.008, seg);
  const rodGeo = new THREE.BoxGeometry(0.028, 1, 0.02);
  for (const s of [1, -1]) {
    const dir = new THREE.Vector3(Math.sin(s * BANK), Math.cos(BANK), 0);
    const perp = new THREE.Vector3(dir.y, -dir.x, 0); // in-plane normal to the bore
    const qBank = new THREE.Quaternion().setFromUnitVectors(_up, dir);
    for (let j = 0; j < 4; j++) {
      const z = CYL_Z[j] + (s < 0 ? STAGGER / 2 : -STAGGER / 2);
      const piston = new THREE.Mesh(pistonGeo, M.alu);
      piston.quaternion.copy(qBank);
      const crownMat = new THREE.MeshBasicMaterial({ color: BLUE.clone(), toneMapped: false });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = 0.049;
      piston.add(crown);
      const rod = new THREE.Mesh(rodGeo, M.steel);
      engine.add(piston, rod);
      /* Facing cylinders share a crank pin; the 90° V does the phasing. */
      cylinders.push({ s, j, z, dir, perp, piston, rod, crownMat, phase: -THROW[j], tdc: s * BANK, cycle: 0, fire: 0 });
    }
  }
  label(engine, "TRANSFORMER LAYERS", "pistons + rods", [0.55, YC + 0.32, 0.55]);

  /* ------------------------------ cylinder banks ------------------------- */
  const banks = [];
  for (const s of [1, -1]) {
    const bank = new THREE.Group();
    bank.position.set(0, YC, s < 0 ? STAGGER / 2 : -STAGGER / 2);
    bank.rotation.z = -s * BANK;
    engine.add(bank);
    /* Cylinder block: open-deck bores so the pistons show when it lifts off. */
    const blockG = new THREE.Group();
    box(M.block, 0, 0.3, 0, 0.36, 0.38, 0.06, blockG).position.z = -0.48;
    box(M.block, 0, 0.3, 0, 0.36, 0.38, 0.06, blockG).position.z = 0.48;
    box(M.block, 0.165, 0.3, 0, 0.03, 0.38, 1.0, blockG);
    box(M.block, -0.165, 0.3, 0, 0.03, 0.38, 1.0, blockG);
    for (const z of [-0.22, 0, 0.22]) box(M.block, 0, 0.3, z, 0.33, 0.38, 0.03, blockG);
    /* Freeze plugs and ribs on the outer wall. */
    for (let j = 0; j < 4; j++) {
      const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.015, 16), M.brass);
      plug.rotation.z = Math.PI / 2;
      plug.position.set(0.185 * s, 0.26, CYL_Z[j]);
      blockG.add(plug);
      box(M.block, 0.19 * s, 0.3, CYL_Z[j] + 0.11, 0.025, 0.34, 0.025, blockG);
    }
    bank.add(blockG);
    piece(blockG, [0.3 * s, 0.36, 0], 0.15);

    /* Head, cam carriers and valve cover with coil packs. */
    const head = new THREE.Group();
    box(M.block, 0, 0.55, 0, 0.4, 0.12, 1.0, head);
    for (const x of [-0.09, 0.09]) zcyl(M.alu, x, 0.62, 0, 0.035, 1.02, head, 12);
    bank.add(head);
    piece(head, [0.2 * s, 0.7, 0], 0.08);

    const cover = new THREE.Group();
    box(M.dark, 0, 0.69, 0, 0.38, 0.06, 0.98, cover);
    /* Domed top: a squashed half-cylinder along the bank. */
    zcyl(M.dark, 0, 0.72, 0, 0.17, 0.96, cover).scale.set(1, 1, 0.35);
    const coils = [];
    for (let j = 0; j < 4; j++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xc8101c, metalness: 0.35, roughness: 0.4, emissive: RED.clone(), emissiveIntensity: 0.1 });
      const coil = box(mat, 0, 0.775, CYL_Z[j], 0.11, 0.06, 0.09, cover);
      box(mat, 0, 0.775, CYL_Z[j] + 0.065, 0.05, 0.035, 0.05, cover);
      box(M.dark, 0.06 * s, 0.79, CYL_Z[j], 0.04, 0.03, 0.04, cover);
      coils.push(coil);
    }
    /* Red fuel rail along the outer edge. */
    zcyl(new THREE.MeshStandardMaterial({ color: 0xc8101c, metalness: 0.4, roughness: 0.35 }), 0.17 * s, 0.72, 0, 0.018, 0.96, cover, 12);
    bank.add(cover);
    piece(cover, [0.24 * s, 1.02, 0], 0);
    if (s > 0) label(cover, "ATTENTION HEADS", "heads + coil packs", [0.25, 0.86, 0.1]);

    /* Exhaust headers: four primaries into a collector, in engine space. */
    const exhaust = new THREE.Group();
    const outN = new THREE.Vector3(Math.sin(s * BANK), Math.cos(BANK), 0); // bore axis
    const outP = new THREE.Vector3(s * Math.cos(BANK), -Math.sin(BANK), 0); // outward, down
    const bz = s < 0 ? STAGGER / 2 : -STAGGER / 2;
    for (let j = 0; j < 4; j++) {
      const z = CYL_Z[j] + bz;
      const st = outN.clone().multiplyScalar(0.55).addScaledVector(outP, 0.2);
      tube(
        M.chrome,
        [
          [st.x, YC + st.y, z],
          [st.x + 0.1 * s, YC + st.y - 0.04, z],
          [0.6 * s, YC + 0.05, z * 0.85],
          [0.6 * s, YC - 0.12, z * 0.55 - 0.08],
        ],
        0.034,
        exhaust
      );
    }
    tube(M.chrome, [[0.6 * s, YC - 0.12, 0.12], [0.6 * s, YC - 0.14, -0.3], [0.56 * s, YC - 0.2, -0.62]], 0.05, exhaust);
    engine.add(exhaust);
    piece(exhaust, [0.66 * s, -0.12, 0], 0.2);
    if (s > 0) label(exhaust, "VECTOR OUTPUT", "exhaust headers", [0.72, YC - 0.25, 0.3]);

    banks.push({ s, coils, outlet: new THREE.Vector3(0.56 * s, YC - 0.2, -0.64), exhaust });
  }

  /* ------------------------------ intake --------------------------------- */
  const intake = new THREE.Group();
  const plenumY = YC + 0.66;
  box(M.alu, 0, plenumY, -0.02, 0.5, 0.12, 0.92, intake);
  zcyl(M.alu, 0, plenumY + 0.05, -0.02, 0.25, 0.92, intake).scale.set(1, 1, 0.38);
  for (let i = 0; i < 7; i++) box(M.steel, 0, plenumY + 0.13, -0.38 + i * 0.12, 0.38, 0.012, 0.02, intake);
  /* Runners curling down into each head. */
  for (const s of [1, -1])
    for (let j = 0; j < 4; j++) {
      const z = CYL_Z[j] + (s < 0 ? STAGGER / 2 : -STAGGER / 2);
      tube(M.alu, [[0.16 * s, plenumY - 0.04, z], [0.24 * s, plenumY - 0.1, z], [0.27 * s, YC + 0.44, z]], 0.032, intake);
    }
  /* Throttle body facing the front, with a glowing intake ring. */
  zcyl(M.alu, 0, plenumY, 0.5, 0.075, 0.12, intake);
  zcyl(M.dark, 0, plenumY, 0.565, 0.06, 0.012, intake);
  const intakeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.007, 8, 32),
    new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, toneMapped: false })
  );
  intakeRing.position.set(0, plenumY, 0.57);
  intake.add(intakeRing);
  engine.add(intake);
  piece(intake, [0, 1.25, 0.05], 0);
  label(intake, "TOKENIZER", "intake + throttle body", [0.3, plenumY + 0.18, 0.45]);

  /* ------------------------------ front drive ---------------------------- */
  const front = new THREE.Group();
  box(M.dark, 0, YC + 0.2, 0.52, 0.6, 0.68, 0.04, front);
  const pulleys = [
    { x: 0, y: YC, r: 0.15, w: 0.07 }, // crank
    { x: 0.27, y: YC + 0.42, r: 0.075, w: 0.05 }, // idler
    { x: 0, y: YC + 0.36, r: 0.085, w: 0.05 }, // water pump
    { x: -0.27, y: YC + 0.42, r: 0.075, w: 0.05 }, // AC compressor
    { x: -0.28, y: YC - 0.08, r: 0.09, w: 0.06 }, // alternator
    { x: 0.22, y: YC - 0.1, r: 0.05, w: 0.04 }, // tensioner
  ];
  const spinning = [];
  for (const p of pulleys) {
    const pg = new THREE.Group();
    pg.position.set(p.x, p.y, 0.59);
    zcyl(M.alu, 0, 0, 0, p.r, p.w, pg);
    zcyl(M.dark, 0, 0, 0.002, p.r * 0.55, p.w + 0.004, pg, 16);
    for (let k = 0; k < 5; k++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(p.r * 0.18, p.r * 0.5, p.w + 0.01), M.steel);
      const a = (k / 5) * TAU;
      spoke.position.set(Math.cos(a) * p.r * 0.32, Math.sin(a) * p.r * 0.32, 0);
      spoke.rotation.z = a + Math.PI / 2;
      pg.add(spoke);
    }
    front.add(pg);
    spinning.push({ g: pg, ratio: 0.15 / p.r });
  }
  /* Alternator body behind its pulley. */
  zcyl(M.alu, -0.28, YC - 0.08, 0.47, 0.1, 0.16, front);
  /* Serpentine belt hugging the outer side of each pulley. */
  const cx = pulleys.reduce((a, p) => a + p.x, 0) / pulleys.length;
  const cy = pulleys.reduce((a, p) => a + p.y, 0) / pulleys.length;
  const ordered = pulleys.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  const beltPts = [];
  for (const p of ordered) {
    const a0 = Math.atan2(p.y - cy, p.x - cx);
    for (const da of [-0.6, 0, 0.6]) beltPts.push(new THREE.Vector3(p.x + Math.cos(a0 + da) * (p.r + 0.01), p.y + Math.sin(a0 + da) * (p.r + 0.01), 0.59));
  }
  front.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beltPts, true), low ? 60 : 120, 0.012, 6, true), M.rubber));
  /* Accent ring on the crank pulley. */
  const pulleyRing = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.006, 8, 48), ctx.accent);
  pulleyRing.position.set(0, YC, 0.63);
  front.add(pulleyRing);
  engine.add(front);
  piece(front, [0, 0.05, 0.62], 0.1);
  label(front, "BATCH SCHEDULER", "belt drive", [0.36, YC + 0.18, 0.62]);

  /* ------------------------------ flywheel ------------------------------- */
  const rear = new THREE.Group();
  zcyl(M.alu, 0, YC, -0.54, 0.34, 0.08, rear, 40);
  zcyl(M.steel, 0, YC, -0.6, 0.3, 0.03, rear, 40);
  const teeth = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.012, 6, 48), M.steel);
  teeth.position.set(0, YC, -0.62);
  rear.add(teeth);
  engine.add(rear);
  piece(rear, [0, 0.05, -0.62], 0.12);
  label(rear, "ONNX RUNTIME", "flywheel", [0.3, YC + 0.38, -0.62]);

  /* ------------------------------ exhaust motes -------------------------- */
  const N = low ? 60 : 140;
  const mPos = new Float32Array(N * 3);
  const mCol = new Float32Array(N * 3);
  const mLife = new Float32Array(N).fill(-1);
  const mVel = new Float32Array(N * 3);
  const mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
  mGeo.setAttribute("color", new THREE.BufferAttribute(mCol, 3));
  const motes = new THREE.Points(
    mGeo,
    new THREE.PointsMaterial({
      size: 0.05,
      map: ctx.glow,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  motes.frustumCulled = false;
  engine.add(motes);
  let spawnAcc = 0;
  let nextMote = 0;

  /* Hit proxy: the assembled engine (the exploded view stays clickable via
     the same box, which is generous enough). */
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.45, 1.6), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.set(0, 0.72, 0);

  /* ------------------------------ update --------------------------------- */
  let theta = 0;
  let spin = 0;
  let k = 0;
  let lastK = -1;
  return {
    group: g,
    proxies: [proxy],
    update(dt, t, sim, c) {
      const on = !!c.selected;
      if (dt > 0) k = clamp01(k + (on ? dt / 1.4 : -dt / 1.1));
      else k = on ? 1 : 0;
      const em = c.emph;
      /* Exploded engine turns slowly on its plinth so every part shows;
         it winds back to the nearest full turn when reassembling. */
      if (on) spin += dt * 0.32 * k;
      else spin += (Math.round(spin / TAU) * TAU - spin) * (1 - Math.exp(-dt * 2.5));
      engine.rotation.y = -0.5 + spin;
      const pulse = sim.embedPulse || 0;

      if (k !== lastK) {
        lastK = k;
        engine.position.y = 0.3 * smooth(0, 0.6, k);
        for (const pc of pieces) {
          const e = smooth(pc.delay, pc.delay + 0.75, k);
          pc.obj.position.copy(pc.base).addScaledVector(pc.off, e);
        }
        for (const l of labels) l.material.opacity = smooth(0.7, 1, k) * 0.95;
        for (const l of labels) l.visible = k > 0.7;
      }

      /* Idle ~1 rev/s, revving hard on each embed pulse; slower while
         exploded so the kinematics read. */
      const rps = (0.9 + pulse * 5) * (1 - 0.55 * k);
      theta += dt * rps * TAU;
      crank.rotation.z = -theta;
      for (const sp of spinning) sp.g.rotation.z = -theta * sp.ratio;

      for (const cy of cylinders) {
        /* Crank pin in the engine's xy plane. */
        const a = theta + cy.phase;
        _p.set(Math.sin(a) * CR, Math.cos(a) * CR, 0);
        const u = _p.dot(cy.dir);
        const w = _p.dot(cy.perp);
        const d = u + Math.sqrt(ROD * ROD - w * w);
        _a.set(_p.x, YC + _p.y, cy.z);
        _b.copy(cy.dir).multiplyScalar(d);
        _b.y += YC;
        _b.z = cy.z;
        cy.piston.position.copy(_b).addScaledVector(cy.dir, 0.02);
        cy.rod.position.addVectors(_a, _b).multiplyScalar(0.5);
        cy.rod.scale.y = ROD;
        cy.rod.quaternion.setFromUnitVectors(_up, _d.subVectors(_b, _a).normalize());
        /* Four-stroke: fire at every second top dead centre. */
        const cycle = Math.floor((a - cy.tdc) / (2 * TAU));
        if (cycle !== cy.cycle) {
          cy.cycle = cycle;
          cy.fire = 1;
        }
        cy.fire = Math.max(0, cy.fire - dt * 6);
        const glow = (0.25 + cy.fire * 2.2 + pulse * 0.6) * em;
        cy.crownMat.color.copy(BLUE).lerp(ORANGE, cy.fire).multiplyScalar(glow);
        const coil = banks[cy.s > 0 ? 0 : 1].coils[cy.j];
        coil.material.emissiveIntensity = (0.08 + cy.fire * 1.6) * em;
      }

      intakeRing.material.color.copy(BLUE).multiplyScalar((0.6 + pulse * 2) * em);
      plinthGlow.material.color.copy(BLUE).multiplyScalar((0.5 + 0.3 * k + pulse) * em);

      /* Vector motes out of both exhausts. */
      spawnAcc += dt * (18 + pulse * 120);
      while (spawnAcc > 1) {
        spawnAcc -= 1;
        const i = nextMote;
        nextMote = (nextMote + 1) % N;
        const b = banks[i % 2];
        b.exhaust.updateMatrix();
        _p.copy(b.outlet).applyMatrix4(b.exhaust.matrix);
        mPos.set([_p.x, _p.y, _p.z], i * 3);
        mVel.set([b.s * 0.05 + (Math.random() - 0.5) * 0.12, 0.05 + Math.random() * 0.08, -0.35 - Math.random() * 0.2], i * 3);
        mLife[i] = 1;
      }
      for (let i = 0; i < N; i++) {
        if (mLife[i] <= 0) {
          mCol[i * 3] = mCol[i * 3 + 1] = mCol[i * 3 + 2] = 0;
          continue;
        }
        mLife[i] -= dt * 0.8;
        mPos[i * 3] += mVel[i * 3] * dt;
        mPos[i * 3 + 1] += mVel[i * 3 + 1] * dt;
        mPos[i * 3 + 2] += mVel[i * 3 + 2] * dt;
        const life = Math.max(0, mLife[i]);
        _c.copy(i % 3 ? BLUE : ORANGE).multiplyScalar(life * 1.4 * em);
        mCol[i * 3] = _c.r;
        mCol[i * 3 + 1] = _c.g;
        mCol[i * 3 + 2] = _c.b;
      }
      mGeo.attributes.position.needsUpdate = true;
      mGeo.attributes.color.needsUpdate = true;

      c.activity = 0.6 + pulse * 1.6;
    },
  };
}
