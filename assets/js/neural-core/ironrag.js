/* ---------------------------------------------------------------------------
   Neural Compute Core — RAG context assembler (retrieval)
   ---------------------------------------------------------------------------
   A mechanical pipeline in Iron Man livery: hot-rod red armour, gold trim
   and an arc reactor at its heart, hovering on repulsors over the vector
   database. Stages run along local +x → −x:

     query intake → embed gearbox → search probe → rerank rack →
     context window → output nozzle (aimed at the core)

   The probe piston drops toward the vector DB on each search, the top 3 of 6
   document cards lift and turn gold on rerank, and the chosen chunks pack
   into the context window before the nozzle fires the prompt at the LLM.

   Suit-up: every armour piece is its own group. After the intro, and again
   each time the component is selected, the pieces blast out, hover on
   repulsor glow, then fly back in one after another and clamp into place
   with a gold lock flash. Under reduced motion it simply stays assembled.

   Local frame: the spine is centred at y = Y0; the flows.js packet passes
   through (0, 0.3, 0) and leaves toward −x.
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const COL = {
  arc: new THREE.Color(0xbff6ff),
  cyan: new THREE.Color(0x4fd6ff),
  gold: new THREE.Color(0xffc24a),
  card: new THREE.Color(0x9cc8ff),
  dim: new THREE.Color(0x1a2a36),
};

const Y0 = 0.2;
/* Suit-up timeline (seconds): blast out, hover while the selection camera
   glides in (~1.5 s), then a staggered fly-in. */
const OUT = 0.6;
const HOLD = 1.6;
const SPREAD = 3.0;
const DUR = 1.0;
const END = OUT + HOLD + SPREAD + DUR + 0.4;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
const _c = new THREE.Color();

function plateTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#2a0507";
  g.fillRect(0, 0, 512, 64);
  g.strokeStyle = "#d9a441";
  g.lineWidth = 4;
  g.strokeRect(3, 3, 506, 58);
  g.fillStyle = "#ffcf6a";
  g.font = "700 30px ui-monospace, Menlo, Consolas, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("RAG · CONTEXT ASSEMBLER", 256, 33);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function buildIronRAG(ctx) {
  const low = ctx.quality.low;
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.y = 15 * DEG;
  g.add(body);

  /* ------------------------------ materials ---------------------------- */
  const red = new THREE.MeshStandardMaterial({ color: 0x9a1218, metalness: 0.82, roughness: 0.26 });
  const redDark = new THREE.MeshStandardMaterial({ color: 0x4a080b, metalness: 0.75, roughness: 0.35 });
  const redShell = new THREE.MeshStandardMaterial({ color: 0x9a1218, metalness: 0.82, roughness: 0.26, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.24 });
  const goldDark = new THREE.MeshStandardMaterial({ color: 0x8a6420, metalness: 0.95, roughness: 0.32 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x2b2e34, metalness: 0.9, roughness: 0.38 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb8bec8, metalness: 1, roughness: 0.18 });
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xbff6ff, toneMapped: false });
  const arcRingMat = new THREE.MeshBasicMaterial({ color: 0x4fd6ff, toneMapped: false });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

  /* Animated instances start collapsed (identity matrices would inflate the
     hit box main.js measures at build) and skip culling, since their stale
     bounds never track the live layout. */
  function liveInst(geo, count) {
    const m = new THREE.InstancedMesh(geo, ledMat, count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    _m.makeScale(1e-4, 1e-4, 1e-4);
    for (let i = 0; i < count; i++) {
      m.setMatrixAt(i, _m);
      m.setColorAt(i, COL.dim);
    }
    return m;
  }

  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 28);
  const cylLow = new THREE.CylinderGeometry(1, 1, 1, 12);
  const hex = new THREE.CylinderGeometry(1, 1, 1, 6);
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const disc = new THREE.CircleGeometry(1, 28);

  function add(parent, geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  }
  function ring(parent, mat, r, tube, x, y, z, rx = 0, ry = 0) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 40), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    parent.add(m);
    return m;
  }
  /* Gold hex bolt heads on a front face. */
  function bolts(parent, pts, z) {
    for (const [x, y] of pts) add(parent, hex, gold, x, y, z, 0.011, 0.008, 0.011, Math.PI / 2);
  }

  /* -------------------------------- pieces ----------------------------- */
  const pieces = [];
  /* order 0..1 = when the piece arrives during suit-up. */
  function piece(x, y, z, order) {
    const o = new THREE.Group();
    o.position.set(x, y, z);
    body.add(o);
    pieces.push({ obj: o, order });
    return o;
  }

  /* Keel: internal steel frame, energy channel and hover repulsors. */
  const keel = piece(0, Y0 - 0.075, 0, 0);
  add(keel, box, steel, 0, 0, 0, 1.7, 0.05, 0.13);
  for (const x of [-0.6, -0.2, 0.2, 0.6]) add(keel, box, goldDark, x, 0, 0, 0.03, 0.06, 0.15);
  const repulsors = [];
  for (const x of [-0.55, 0.55]) {
    add(keel, cyl, steel, x, -0.035, 0, 0.065, 0.025, 0.065);
    ring(keel, gold, 0.06, 0.008, x, -0.05, 0, Math.PI / 2);
    const r = add(keel, disc, ledMat.clone(), x, -0.049, 0, 0.05, 0.05, 1, Math.PI / 2);
    repulsors.push(r);
  }

  /* Arc reactor on the spine's front face. */
  const reactor = piece(0, Y0, 0.13, 0.03);
  add(reactor, cyl, steel, 0, 0, -0.01, 0.105, 0.05, 0.105, Math.PI / 2);
  ring(reactor, gold, 0.088, 0.013, 0, 0, 0.018);
  add(reactor, cyl, chrome, 0, 0, 0.005, 0.075, 0.02, 0.075, Math.PI / 2);
  add(reactor, disc, arcMat, 0, 0, 0.017, 0.045, 0.045, 1);
  ring(reactor, arcRingMat, 0.062, 0.006, 0, 0, 0.018);
  const coils = new THREE.InstancedMesh(box, arcRingMat, 10);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    _e.set(0, 0, a);
    _m.compose(_p.set(Math.cos(a) * 0.062, Math.sin(a) * 0.062, 0.02), _q.setFromEuler(_e), _s.set(0.012, 0.022, 0.006));
    coils.setMatrixAt(i, _m);
  }
  reactor.add(coils);
  const arcLight = new THREE.PointLight(0x7fe8ff, 0.6, 1.6, 2);
  arcLight.position.set(0, 0, 0.12);
  reactor.add(arcLight);

  /* Spine armour: four red plates with gold trim and bolts. */
  const SEG = [0.63, 0.21, -0.21, -0.63];
  SEG.forEach((x, i) => {
    const p = piece(x, Y0, 0, 0.08 + i * 0.05);
    add(p, box, red, 0, 0, 0, 0.4, 0.13, 0.2);
    add(p, box, gold, 0, 0.066, 0.1, 0.4, 0.012, 0.012);
    add(p, box, gold, 0, -0.066, 0.1, 0.4, 0.008, 0.008);
    add(p, box, redDark, 0, 0.068, 0, 0.36, 0.006, 0.12);
    bolts(p, [[-0.18, 0.045], [0.18, 0.045], [-0.18, -0.045], [0.18, -0.045]], 0.102);
    if (i === 0) {
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.04), new THREE.MeshBasicMaterial({ map: plateTexture(), toneMapped: false }));
      plate.position.set(0, 0.022, 0.101);
      p.add(plate);
    }
  });

  /* Packets ride the front channel; built only once the suit is closed. */
  const NP = 9;
  const packets = liveInst(sphere, NP);
  body.add(packets);
  const channel = add(body, box, new THREE.MeshBasicMaterial({ color: 0x0e3a4a, toneMapped: false }), 0, Y0 - 0.035, 0.101, 1.66, 0.014, 0.004);

  /* 1. Query intake: red funnel, gold lip, arc ring at the throat. */
  const intake = piece(0.95, Y0, 0, 0.3);
  add(intake, new THREE.CylinderGeometry(0.135, 0.075, 0.22, 24, 1, true), redShell, 0, 0, 0, 1, 1, 1, 0, 0, -Math.PI / 2);
  ring(intake, gold, 0.135, 0.012, 0.11, 0, 0, 0, Math.PI / 2);
  ring(intake, goldDark, 0.078, 0.01, -0.11, 0, 0, 0, Math.PI / 2);
  const intakeArc = ring(intake, arcRingMat, 0.055, 0.007, -0.06, 0, 0, 0, Math.PI / 2);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    add(intake, box, steel, 0.0, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.2, 0.012, 0.012, a, 0, 0);
  }

  /* 2. Embed gearbox: red drum, two meshing gold gears. */
  const gearbox = piece(0.48, Y0 + 0.17, 0, 0.4);
  add(gearbox, cyl, red, 0, 0, -0.01, 0.1, 0.11, 0.1, Math.PI / 2);
  add(gearbox, box, goldDark, 0, -0.085, 0, 0.1, 0.05, 0.1);
  function gear(r, teeth, x, y, z) {
    const gg = new THREE.Group();
    gg.position.set(x, y, z);
    add(gg, cyl, gold, 0, 0, 0, r, 0.018, r, Math.PI / 2);
    add(gg, cylLow, steel, 0, 0, 0.012, r * 0.35, 0.014, r * 0.35, Math.PI / 2);
    const t = new THREE.InstancedMesh(box, gold, teeth);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * TAU;
      _e.set(0, 0, a);
      _m.compose(_p.set(Math.cos(a) * r, Math.sin(a) * r, 0), _q.setFromEuler(_e), _s.set(0.03, ((TAU * r) / teeth) * 0.5, 0.016));
      t.setMatrixAt(i, _m);
    }
    gg.add(t);
    for (let i = 0; i < 4; i++) add(gg, box, goldDark, 0, 0, 0.004, r * 1.6, 0.008, 0.01, 0, 0, (i / 4) * Math.PI);
    return gg;
  }
  const gearA = gear(0.085, 14, 0, 0, 0.055);
  const gearB = gear(0.05, 9, 0.135, -0.07, 0.05);
  gearbox.add(gearA, gearB);
  const embedLed = add(gearbox, sphere, ledMat.clone(), 0, 0, 0.074, 0.016, 0.016, 0.016);

  /* 3. Search probe: hex turret on top, hydraulic piston below the keel
     reaching toward the vector DB. */
  const probe = piece(0.1, Y0, -0.01, 0.5);
  const turret = new THREE.Group();
  turret.position.y = 0.12;
  probe.add(turret);
  add(turret, hex, red, 0, 0, 0, 0.085, 0.1, 0.085);
  add(turret, hex, gold, 0, 0.055, 0, 0.09, 0.012, 0.09);
  add(turret, hex, steel, 0, 0.07, 0, 0.05, 0.03, 0.05);
  const lens = add(turret, disc, ledMat.clone(), 0, 0.005, 0.088, 0.028, 0.028, 1);
  ring(turret, gold, 0.03, 0.006, 0, 0.005, 0.089);
  add(probe, cyl, red, 0, -0.15, 0, 0.042, 0.13, 0.042);
  ring(probe, gold, 0.044, 0.008, 0, -0.215, 0, Math.PI / 2);
  const rod = add(probe, cylLow, chrome, 0, -0.3, 0, 0.02, 0.2, 0.02);
  const tip = add(probe, sphere, ledMat.clone(), 0, -0.4, 0, 0.026, 0.026, 0.026);

  /* 4. Rerank rack: six document cards in a red cradle with gold rails. */
  const rack = piece(-0.24, Y0 + 0.075, 0, 0.65);
  add(rack, box, red, 0, 0, 0, 0.44, 0.022, 0.19);
  add(rack, box, gold, 0, 0.012, 0.096, 0.44, 0.01, 0.01);
  for (const s of [-1, 1]) {
    add(rack, box, gold, s * 0.215, 0.07, 0, 0.012, 0.13, 0.18);
    add(rack, cylLow, chrome, s * 0.215, 0.14, 0, 0.012, 0.02, 0.012);
  }
  const NC = 6;
  const cards = liveInst(box, NC);
  rack.add(cards);
  const lift = new Float32Array(NC);
  const chosen = new Uint8Array(NC);

  /* 5. Context window: gold frame, three slots the chosen chunks pack into. */
  const ctxWin = piece(-0.64, Y0 + 0.2, 0, 0.8);
  const FW = 0.3;
  const FH = 0.24;
  add(ctxWin, box, steel, 0, 0, -0.008, FW, FH, 0.012);
  add(ctxWin, box, gold, 0, FH / 2, 0, FW + 0.02, 0.016, 0.024);
  add(ctxWin, box, gold, 0, -FH / 2, 0, FW + 0.02, 0.016, 0.024);
  add(ctxWin, box, gold, FW / 2, 0, 0, 0.016, FH, 0.024);
  add(ctxWin, box, gold, -FW / 2, 0, 0, 0.016, FH, 0.024);
  for (const s of [-1, 1]) add(ctxWin, cylLow, red, s * 0.1, -FH / 2 - 0.03, 0, 0.018, 0.06, 0.018);
  bolts(ctxWin, [[-FW / 2, FH / 2], [FW / 2, FH / 2], [-FW / 2, -FH / 2], [FW / 2, -FH / 2]], 0.014);
  const slots = liveInst(box, 3);
  ctxWin.add(slots);
  const slotFill = new Float32Array(3);

  /* 6. Output nozzle: aimed at the LLM, fires the packed prompt. */
  const nozzle = piece(-0.93, Y0, 0, 0.9);
  add(nozzle, cyl, steel, 0, 0, 0, 0.075, 0.18, 0.075, 0, 0, Math.PI / 2);
  add(nozzle, new THREE.CylinderGeometry(0.1, 0.085, 0.1, 24, 1, true), redShell, 0.02, 0, 0, 1, 1, 1, 0, 0, Math.PI / 2);
  ring(nozzle, gold, 0.1, 0.012, -0.03, 0, 0, 0, Math.PI / 2);
  const nozArc = ring(nozzle, new THREE.MeshBasicMaterial({ color: 0x4fd6ff, toneMapped: false }), 0.05, 0.008, -0.092, 0, 0, 0, Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const beamGeo = new THREE.CylinderGeometry(0.035, 0.012, 1, 16, 1, true);
  beamGeo.translate(0, 0.5, 0);
  const beam = add(nozzle, beamGeo, beamMat, -0.095, 0, 0, 1, 0.001, 1, 0, 0, Math.PI / 2);

  /* 7. Dorsal fins: swept red flaps with gold edges, the final clamp. */
  for (const [x, o] of [[0.36, 0.95], [-0.42, 1]]) {
    const fin = piece(x, Y0 + 0.11, -0.11, o);
    add(fin, box, red, 0, 0, 0, 0.26, 0.1, 0.014, 0, 0, x > 0 ? -12 * DEG : 12 * DEG);
    add(fin, box, gold, 0, 0.05, 0.002, 0.26, 0.01, 0.016, 0, 0, x > 0 ? -12 * DEG : 12 * DEG);
  }

  /* Record home poses and a deterministic exploded pose per piece. */
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const P of pieces) {
    P.home = P.obj.position.clone();
    P.homeQ = P.obj.quaternion.clone();
    P.dir = new THREE.Vector3(P.home.x * 1.4 + (rand() - 0.5) * 1.2, 0.35 + rand() * 0.9, (rand() - 0.5) * 2.2).normalize();
    P.dist = 1.2 + rand() * 1.0;
    P.axis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    P.spin = (rand() > 0.5 ? 1 : -1) * (1.5 + rand() * 2.5);
    P.ph = rand() * TAU;
    P.k = 1;
    P.flash = 0;
  }

  /* Repulsor trails (flying pieces) and gold lock flashes. */
  function glowPoints(size) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pieces.length * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pieces.length * 3), 3));
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ map: ctx.glow, size, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    );
    pts.frustumCulled = false;
    body.add(pts);
    return geo;
  }
  const thrustGeo = glowPoints(low ? 0.14 : 0.18);
  const flashGeo = glowPoints(0.5);

  /* Suit-up waits for the intro camera move; starts with the pieces out. */
  let tau = OUT;
  let armed = false;
  let wasSel = false;
  let packT = 99;
  let flow = 0;

  return {
    group: g,
    rerank() {
      chosen.fill(0);
      let picked = 0;
      while (picked < 3) {
        const k = Math.floor(Math.random() * NC);
        if (!chosen[k]) {
          chosen[k] = 1;
          picked++;
        }
      }
      packT = 0;
    },
    update(dt, t, sim, c) {
      const intro = sim.intro ? sim.intro.core : 1;
      const em = c.emph * (0.25 + 0.75 * intro);

      /* ----------------------------- suit-up --------------------------- */
      if (c.selected && !wasSel) {
        tau = 0;
        armed = true;
        for (const P of pieces) P.k = 0;
      }
      wasSel = c.selected;
      if (!armed && (sim.intro ? sim.intro.flows : 1) >= 0.999) armed = true;
      if (sim.motion === 0) tau = END;
      else if (armed) tau = Math.min(END, tau + dt);

      const out = 1 - (1 - clamp01(tau / OUT)) ** 3;
      const tp = thrustGeo.attributes.position.array;
      const tc = thrustGeo.attributes.color.array;
      const fp = flashGeo.attributes.position.array;
      const fc = flashGeo.attributes.color.array;
      for (let i = 0; i < pieces.length; i++) {
        const P = pieces[i];
        const st = OUT + HOLD + P.order * SPREAD;
        const k = clamp01((tau - st) / DUR);
        const kin = 1 - (1 - k) ** 3;
        const f = out * (1 - kin);
        if (dt > 0 && k >= 1 && P.k < 1) P.flash = 1;
        P.k = k;
        P.flash *= Math.exp(-dt * 4.5);

        _p.copy(P.home).addScaledVector(P.dir, P.dist * f);
        _p.y += (Math.sin(Math.PI * f) * 0.12 + Math.sin(t * 2.4 + P.ph) * 0.035) * f;
        P.obj.position.copy(_p);
        P.obj.quaternion.copy(P.homeQ).multiply(_q.setFromAxisAngle(P.axis, P.spin * f));
        P.obj.scale.setScalar(1 + 0.06 * P.flash);

        /* Trail sits behind the piece along its flight path. */
        const flying = k > 0 && k < 1 ? 1 : tau < OUT ? 1 : 0.35;
        const th = f > 0.002 ? flying * Math.min(1, f * 4) * em : 0;
        tp[i * 3] = _p.x + P.dir.x * 0.1;
        tp[i * 3 + 1] = _p.y + P.dir.y * 0.1 - 0.04;
        tp[i * 3 + 2] = _p.z + P.dir.z * 0.1;
        tc[i * 3] = COL.cyan.r * th;
        tc[i * 3 + 1] = COL.cyan.g * th;
        tc[i * 3 + 2] = COL.cyan.b * th;
        const fl = P.flash * 0.9 * em;
        fp[i * 3] = P.home.x;
        fp[i * 3 + 1] = P.home.y;
        fp[i * 3 + 2] = P.home.z + 0.1;
        fc[i * 3] = COL.gold.r * fl;
        fc[i * 3 + 1] = COL.gold.g * fl;
        fc[i * 3 + 2] = COL.gold.b * fl;
      }
      thrustGeo.attributes.position.needsUpdate = true;
      thrustGeo.attributes.color.needsUpdate = true;
      flashGeo.attributes.position.needsUpdate = true;
      flashGeo.attributes.color.needsUpdate = true;
      /* 1 once the suit is closed; drops as soon as it blasts apart. */
      const built = Math.max(1 - out, smooth(END - 0.9, END - 0.3, tau));

      /* --------------------------- arc reactor ------------------------- */
      const hum = 0.85 + 0.15 * Math.sin(t * 3.1) + 0.25 * sim.rerankGlow;
      arcMat.color.copy(COL.arc).multiplyScalar(hum * em);
      arcRingMat.color.copy(COL.cyan).multiplyScalar((0.7 + 0.3 * Math.sin(t * 5.3)) * em);
      arcLight.intensity = 0.6 * hum * em;
      for (const r of repulsors) r.material.color.copy(COL.cyan).multiplyScalar((0.55 + 0.2 * Math.sin(t * 9 + r.position.x * 4)) * em);
      channel.material.color.copy(COL.cyan).multiplyScalar(0.18 * built * em);

      /* ------------------------------ stages --------------------------- */
      intakeArc.rotation.z += dt * 2;
      const spin = dt * (0.8 + (sim.embedPulse || 0) * 6);
      gearA.rotation.z += spin;
      gearB.rotation.z -= spin * (0.085 / 0.05);
      embedLed.material.color.copy(COL.cyan).multiplyScalar((0.3 + (sim.embedPulse || 0) * 1.4) * em);

      const sg = sim.searchGlow || 0;
      turret.rotation.y = Math.sin(t * 0.6) * 0.5;
      lens.material.color.copy(COL.cyan).multiplyScalar((0.35 + sg * 1.3) * em);
      const ext = 0.12 + 0.22 * sg * built;
      rod.scale.y = ext;
      rod.position.y = -0.2 - ext / 2;
      tip.position.y = -0.2 - ext;
      tip.material.color.copy(COL.cyan).multiplyScalar((0.25 + sg * 1.6) * em);

      const rg = sim.rerankGlow || 0;
      const a = 1 - Math.exp(-dt * 8);
      for (let i = 0; i < NC; i++) {
        const target = chosen[i] ? rg : 0;
        lift[i] += (target - lift[i]) * a;
        _e.set(0, 0, (i - 2.5) * -3 * DEG);
        _m.compose(_p.set(-0.165 + i * 0.066, 0.11 + lift[i] * 0.07, 0), _q.setFromEuler(_e), _s.set(0.052, 0.16, 0.008));
        cards.setMatrixAt(i, _m);
        _c.copy(COL.card).lerp(COL.gold, clamp01(lift[i] * 1.4));
        cards.setColorAt(i, _c.multiplyScalar((0.16 + lift[i] * 1.2 + sg * 0.12) * em));
      }
      cards.instanceMatrix.needsUpdate = true;
      cards.instanceColor.needsUpdate = true;

      /* Chosen chunks pack in top-down, hold, then drain. */
      packT += dt;
      const drain = 1 - smooth(4.2, 5.6, packT);
      for (let j = 0; j < 3; j++) {
        slotFill[j] = smooth(0.35 + j * 0.22, 0.6 + j * 0.22, packT) * drain;
        const w = Math.max(1e-3, slotFill[j] * 0.25);
        _m.compose(_p.set(-0.125 + w / 2, 0.07 - j * 0.07, 0.002), _q.identity(), _s.set(w, 0.045, 0.006));
        slots.setMatrixAt(j, _m);
        slots.setColorAt(j, _c.copy(COL.gold).multiplyScalar((0.3 + slotFill[j] * 0.9) * em));
      }
      slots.instanceMatrix.needsUpdate = true;
      slots.instanceColor.needsUpdate = true;

      const fire = smooth(1.05, 1.25, packT) * (1 - smooth(1.4, 2.2, packT)) * built;
      beam.scale.set(1 + fire * 0.4, Math.max(0.001, 0.55 * fire), 1 + fire * 0.4);
      beamMat.opacity = 0.75 * fire * em;
      nozArc.material.color.copy(COL.cyan).lerp(COL.gold, fire).multiplyScalar((0.7 + fire) * em);

      /* Packets: cyan queries in, gold context out past the rerank rack. */
      flow += dt * (0.18 + rg * 0.35);
      for (let i = 0; i < NP; i++) {
        const u = (flow + i / NP) % 1;
        const x = 0.82 - u * 1.64;
        const s = 0.011 * (0.6 + 0.4 * built);
        _m.compose(_p.set(x, Y0 - 0.035, 0.105), _q.identity(), _s.setScalar(s));
        packets.setMatrixAt(i, _m);
        _c.copy(COL.cyan).lerp(COL.gold, smooth(-0.1, -0.35, x));
        packets.setColorAt(i, _c.multiplyScalar((0.9 + rg * 0.6) * built * em));
      }
      packets.instanceMatrix.needsUpdate = true;
      packets.instanceColor.needsUpdate = true;

      c.activity = 0.5 + rg + (1 - built) * 0.5;
    },
  };
}
