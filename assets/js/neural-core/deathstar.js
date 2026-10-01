/* ---------------------------------------------------------------------------
   Neural Compute Core — battle station (the agent orchestrator)
   ---------------------------------------------------------------------------
   A half-built Death Star: the hull is a few hundred curved panels (one
   InstancedMesh per latitude band), with an equatorial trench, a concave
   superlaser dish, and an unfinished flank where the panels give way to
   bare superstructure and spikes. Five TIE fighters hold station at the
   tool positions; the green superlaser line fires at whichever tool the
   agent is calling.

   Selected, the station breaks apart: every panel and girder flies out
   along its normal and tumbles, a shockwave ring expands, and the glowing
   reactor core (the agent loop) is exposed. Deselecting reassembles it.

   `toolPos` is consumed by flows.js, so the five tool positions must stay
   where they are (hub-local).
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const R = 0.6;

const _m = new THREE.Matrix4();
const _b = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qt = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _y = new THREE.Vector3(0, 1, 0);

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* Direction on the unit sphere matching three's SphereGeometry layout. */
function dirAt(phi, theta, out) {
  return out.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
}

/* Hull panel art: plates of slightly different tone, seams and a scatter of
   lit windows (returned separately as the emissive map). */
function panelTextures() {
  const S = 256;
  const map = document.createElement("canvas");
  const win = document.createElement("canvas");
  map.width = map.height = win.width = win.height = S;
  const g = map.getContext("2d");
  const w = win.getContext("2d");
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = "#8e9aa8";
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const v = 120 + rnd() * 60;
    g.fillStyle = `rgb(${v - 8},${v + 2},${v + 14})`;
    g.fillRect(x, y, 8 + rnd() * 60, 4 + rnd() * 26);
  }
  g.strokeStyle = "#55606d";
  g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = rnd() * S;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(S, y);
    g.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y + 20 + rnd() * 80);
    g.stroke();
  }
  g.strokeStyle = "#3e4752";
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, S - 3, S - 3);
  w.fillStyle = "#000";
  w.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const n = 1 + Math.floor(rnd() * 5);
    w.fillStyle = rnd() > 0.15 ? "#dfeaff" : "#ffd7a0";
    for (let k = 0; k < n; k++) w.fillRect(x + k * 5, y, 2.5, 2.5);
  }
  const mk = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: mk(map), windows: mk(win) };
}

/* Superlaser dish art: concentric rings, radial ribs, darker toward focus. */
function dishTexture() {
  const S = 512;
  const C = S / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const g = canvas.getContext("2d");
  const grad = g.createRadialGradient(C, C, 10, C, C, C);
  grad.addColorStop(0, "#2a3038");
  grad.addColorStop(1, "#77828f");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "#20252c";
  for (const [r, w] of [[60, 3], [110, 2], [160, 4], [205, 2], [240, 3]]) {
    g.lineWidth = w;
    g.beginPath();
    g.arc(C, C, r, 0, TAU);
    g.stroke();
  }
  g.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    g.beginPath();
    g.moveTo(C + Math.cos(a) * 40, C + Math.sin(a) * 40);
    g.lineTo(C + Math.cos(a) * C, C + Math.sin(a) * C);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildDeathStar(ctx) {
  const low = ctx.quality.low;
  const NB = low ? 10 : 14;
  const NL = low ? 18 : 28;
  const g = new THREE.Group();
  const station = new THREE.Group();
  g.add(station);

  const tex = panelTextures();
  const hull = new THREE.MeshStandardMaterial({
    color: 0xc9d3de,
    map: tex.map,
    emissiveMap: tex.windows,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
    metalness: 0.55,
    roughness: 0.48,
    side: THREE.DoubleSide,
  });
  const frame = new THREE.MeshStandardMaterial({ color: 0x5d6773, metalness: 0.75, roughness: 0.4 });
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x0c0f13, metalness: 0.4, roughness: 0.7, transparent: true });

  /* Feature directions, chosen for the default camera (front-right): the
     dish faces the viewer, upper-left; the unfinished flank is on the right. */
  const DISH = new THREE.Vector3(0.06, 0.6, 0.8).normalize();
  const DISH_COS = Math.cos(21 * DEG);
  const OPEN = new THREE.Vector3(0.82, 0.05, -0.57).normalize();
  const TRENCH = 1.6 * DEG;

  /* ------------------------------ hull panels -------------------------- */
  /* Each band's panel is built once at phi = 0, recentred on its centroid,
     and instanced around Y. Panels in the dish or on the unfinished flank
     are skipped; the flank gets girders and spikes instead. */
  const pieces = [];
  const skeleton = [];
  const bands = [];
  const dPhi = TAU / NL;
  let n = 0;
  for (let b = 0; b < NB; b++) {
    let t0 = (b / NB) * Math.PI;
    let t1 = ((b + 1) / NB) * Math.PI;
    if (Math.abs(t1 - Math.PI / 2) < 1e-6) t1 -= TRENCH;
    if (Math.abs(t0 - Math.PI / 2) < 1e-6) t0 += TRENCH;
    const geo = new THREE.SphereGeometry(R, 4, 3, 0, dPhi, t0, t1 - t0);
    const tc = (t0 + t1) / 2;
    const c0 = dirAt(dPhi / 2, tc, new THREE.Vector3()).multiplyScalar(R);
    geo.translate(-c0.x, -c0.y, -c0.z);
    const list = [];
    for (let j = 0; j < NL; j++) {
      const phi = j * dPhi;
      const d = dirAt(phi + dPhi / 2, tc, new THREE.Vector3());
      const h = hash(++n);
      if (d.dot(DISH) > DISH_COS - 0.02) continue;
      const open = d.dot(OPEN) > 0.2 + 0.45 * hash(n + 0.5) - 0.15 * Math.abs(d.y);
      const piece = {
        qy: new THREE.Quaternion().setFromAxisAngle(_y, phi),
        pos: c0.clone().applyAxisAngle(_y, phi),
        dir: d,
        dist: 0.22 + h * 0.6,
        axis: new THREE.Vector3(hash(n + 1) - 0.5, hash(n + 2) - 0.5, hash(n + 3) - 0.5).normalize(),
        spin: (hash(n + 4) - 0.5) * 4.5,
        delay: hash(n + 5) * 0.25,
      };
      if (open) {
        /* Bare superstructure: a ring girder, a meridian girder and a
           spike of random height, all slightly below the hull line. */
        const len = R * dPhi * Math.sin(tc);
        skeleton.push(
          { ...piece, pos: d.clone().multiplyScalar(R * 0.95), sx: Math.max(0.02, len), sy: 0.012, sz: 0.012, lon: phi + dPhi / 2 },
          { ...piece, pos: d.clone().multiplyScalar(R * 0.93), sx: 0.012, sy: (R * Math.PI) / NB, sz: 0.012, lon: phi + dPhi / 2, merid: true },
          { ...piece, pos: d.clone().multiplyScalar(R * (0.9 + 0.08 * h)), sx: 0.03 + 0.03 * h, sy: 0.03, sz: 0.06 + 0.16 * hash(n + 6), lon: phi + dPhi / 2, spike: true }
        );
        continue;
      }
      list.push(piece);
    }
    if (!list.length) continue;
    const mesh = new THREE.InstancedMesh(geo, hull, list.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    station.add(mesh);
    bands.push({ mesh, list });
    pieces.push(...list);
  }
  const girders = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), frame, skeleton.length);
  girders.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  girders.frustumCulled = false;
  station.add(girders);
  /* Girder orientation: x along the latitude ring, y along the meridian,
     z outward; spikes point outward along z. */
  for (const s of skeleton) {
    _v.copy(s.dir);
    const east = new THREE.Vector3().crossVectors(_y, _v).normalize();
    if (!isFinite(east.x) || east.lengthSq() < 1e-6) east.set(1, 0, 0);
    const north = new THREE.Vector3().crossVectors(_v, east).normalize();
    _b.makeBasis(east, north, _v);
    s.base = new THREE.Quaternion().setFromRotationMatrix(_b);
    if (s.spike) s.pos.addScaledVector(s.dir, s.sz / 2);
  }

  /* Dark inner shell so gaps read as depth, not see-through. */
  const inner = new THREE.Mesh(new THREE.SphereGeometry(R * 0.9, 40, 24), innerMat);
  station.add(inner);

  /* Equatorial trench: recessed band with a line of lights. */
  const trench = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.965, R * 0.965, 2 * R * TRENCH, 64, 1, true), frame);
  station.add(trench);
  const trenchLights = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.968, R * 0.968, R * TRENCH * 0.5, 64, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xdfeaff, toneMapped: false, transparent: true, opacity: 0.55 })
  );
  station.add(trenchLights);

  /* ---------------------------- superlaser dish ------------------------ */
  const dishR = R * Math.sin(21 * DEG);
  const DEPTH = 0.05;
  const prof = [];
  for (let i = 0; i <= 10; i++) {
    const r = (i / 10) * dishR;
    prof.push(new THREE.Vector2(r, -DEPTH * (1 - (r / dishR) ** 2)));
  }
  const dishGeo = new THREE.LatheGeometry(prof, 48);
  /* Planar UVs so the ring/rib art lands concentric. */
  const uv = dishGeo.attributes.uv;
  const pos = dishGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * dishR), 0.5 + pos.getZ(i) / (2 * dishR));
  const dish = new THREE.Group();
  dish.quaternion.setFromUnitVectors(_y, DISH);
  dish.position.copy(DISH).multiplyScalar(R * Math.cos(21 * DEG));
  dish.add(new THREE.Mesh(dishGeo, new THREE.MeshStandardMaterial({ map: dishTexture(), metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide })));
  const dishRim = new THREE.Mesh(new THREE.TorusGeometry(dishR, 0.008, 6, 48), frame);
  dishRim.rotation.x = Math.PI / 2;
  dish.add(dishRim);
  const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.03, 16), frame);
  emitter.position.y = -DEPTH + 0.015;
  dish.add(emitter);
  const laserMat = new THREE.MeshBasicMaterial({ color: 0x48ff6a, toneMapped: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), laserMat);
  lens.position.y = -DEPTH + 0.035;
  dish.add(lens);
  /* Eight tributary beams converging on the focal point. */
  const FOCUS_H = 0.16;
  const trib = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const p0 = new THREE.Vector3(Math.cos(a) * dishR * 0.8, -DEPTH * 0.36, Math.sin(a) * dishR * 0.8);
    trib.push(p0.x, p0.y, p0.z, 0, FOCUS_H, 0);
  }
  const tribGeo = new THREE.BufferGeometry();
  tribGeo.setAttribute("position", new THREE.Float32BufferAttribute(trib, 3));
  const tribMat = new THREE.LineBasicMaterial({ color: 0x48ff6a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  dish.add(new THREE.LineSegments(tribGeo, tribMat));
  const focusGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ctx.glow, color: 0x48ff6a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })
  );
  focusGlow.scale.setScalar(0.22);
  focusGlow.position.y = FOCUS_H;
  dish.add(focusGlow);
  station.add(dish);
  const dishPiece = { dir: DISH, dist: 0.55, axis: new THREE.Vector3(1, 0, 0.3).normalize(), spin: 1.4, delay: 0 };
  const dishHome = dish.position.clone();
  const dishQ = dish.quaternion.clone();
  const focusLocal = DISH.clone().multiplyScalar(R * Math.cos(21 * DEG) + FOCUS_H);

  /* --------------------------- reactor core ---------------------------- */
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, toneMapped: false });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 2), coreMat);
  station.add(core);
  const coreWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.2, 1)),
    new THREE.LineBasicMaterial({ color: 0x6fb2ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  );
  station.add(coreWire);
  const coreGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ctx.glow, color: 0x8fc8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })
  );
  coreGlow.scale.setScalar(1.1);
  station.add(coreGlow);

  /* Shockwave: a flat ring that races out as the station breaks up. */
  const shockMat = new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 96), shockMat);
  shock.rotation.x = -Math.PI / 2 + 0.25;
  shock.visible = false;
  g.add(shock);

  /* ----------------------------- TIE fighters -------------------------- */
  const TOOLS = 5;
  const toolPos = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  const hexGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x8a939e, metalness: 0.7, roughness: 0.38 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, metalness: 0.6, roughness: 0.5 });
  const pods = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), tieMat, TOOLS);
  const wings = new THREE.InstancedMesh(hexGeo, panelMat, TOOLS * 2);
  const wingFrames = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.06, 4, 6), tieMat, TOOLS * 2);
  const struts = new THREE.InstancedMesh(box, tieMat, TOOLS);
  const eyes = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), TOOLS);
  for (let i = 0; i < TOOLS; i++) eyes.setColorAt(i, _c.setRGB(0.05, 0.05, 0.06));
  const ties = [];
  for (let i = 0; i < TOOLS; i++) {
    const a = (i / TOOLS) * TAU + 0.3;
    const x = Math.cos(a) * 1.05;
    const y = Math.sin(a * 2) * 0.18;
    const z = Math.sin(a) * 1.05;
    toolPos.push([x, y, z]);
    /* Fly tangentially around the station; local x = heading. */
    ties.push({ x, y, z, heading: a + Math.PI / 2 });
  }
  function placeTie(i, bob) {
    const T = ties[i];
    _b.makeRotationY(-T.heading);
    _b.setPosition(T.x, T.y + bob, T.z);
    const put = (mesh, idx, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
      _e.set(rx, ry, rz);
      _q.setFromEuler(_e);
      _m.compose(_p.set(x, y, z), _q, _v.set(sx, sy, sz)).premultiply(_b);
      mesh.setMatrixAt(idx, _m);
    };
    put(pods, i, 0, 0, 0, 0.045, 0.045, 0.045);
    put(eyes, i, 0.046, 0, 0, 0.022, 0.022, 0.022, 0, Math.PI / 2, 0);
    put(struts, i, 0, 0, 0, 0.02, 0.02, 0.16);
    for (const s of [1, -1]) {
      const k = i * 2 + (s > 0 ? 0 : 1);
      put(wings, k, 0, 0, s * 0.085, 0.1, 0.008, 0.1, Math.PI / 2, 0, 0);
      put(wingFrames, k, 0, 0, s * 0.088, 0.1, 0.1, 0.1, 0, 0, Math.PI / 6);
    }
  }
  for (let i = 0; i < TOOLS; i++) placeTie(i, 0);
  for (const m of [pods, wings, wingFrames, struts, eyes]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    g.add(m);
  }

  /* Superlaser / tool-call lines from the dish focus to each TIE. */
  const linePos = new Float32Array(TOOLS * 6);
  const lineCol = new Float32Array(TOOLS * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  lines.frustumCulled = false;
  g.add(lines);

  const proxy = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));

  /* ------------------------------- state ------------------------------- */
  let k = 0;
  let lastK = -1;
  const BLUE = new THREE.Color(0x6fb2ff);
  const GREEN = new THREE.Color(0x48ff6a);
  const OFF = new THREE.Color(0x15171a);

  /* Piece transform for break-up amount e (0 = assembled). */
  function placePiece(mesh, i, p, e, t, q0, sx = 1, sy = 1, sz = 1) {
    const f = ease((e - p.delay) / (1 - p.delay));
    _p.copy(p.pos).addScaledVector(p.dir, p.dist * f);
    _qt.setFromAxisAngle(p.axis, p.spin * f * (1 + 0.06 * t * f));
    _q.copy(q0).multiply(_qt);
    _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m);
  }

  function layout(e, t) {
    for (const band of bands) {
      for (let i = 0; i < band.list.length; i++) placePiece(band.mesh, i, band.list[i], e, t, band.list[i].qy);
      band.mesh.instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < skeleton.length; i++) {
      const s = skeleton[i];
      placePiece(girders, i, s, e, t, s.base, s.sx, s.sy, s.sz);
    }
    girders.instanceMatrix.needsUpdate = true;
    const f = ease(e);
    dish.position.copy(dishHome).addScaledVector(DISH, dishPiece.dist * f);
    _qt.setFromAxisAngle(dishPiece.axis, dishPiece.spin * f);
    dish.quaternion.copy(dishQ).premultiply(_qt);
    const shrink = 1 - 0.35 * f;
    trench.scale.set(1 + 0.9 * f, 1, 1 + 0.9 * f);
    trenchLights.scale.copy(trench.scale);
    innerMat.opacity = 1 - f;
    inner.visible = f < 0.99;
    inner.scale.setScalar(shrink);
  }
  layout(0, 0);

  return {
    group: g,
    proxies: [proxy],
    toolPos,
    update(dt, t, sim, c) {
      /* Break-up timeline: 1.6 s out, 1.2 s back together; snaps when
         motion is reduced/paused. */
      const on = !!c.selected;
      if (dt > 0) k = clamp01(k + (on ? dt / 1.6 : -dt / 1.2));
      else k = on ? 1 : 0;
      const e = k;
      if (e > 1e-4 || lastK !== 0) {
        layout(e, e > 0 ? t : 0);
        lastK = e > 1e-4 ? e : 0;
      }

      station.rotation.y = Math.sin(t * 0.12) * 0.12 * sim.motion;
      station.rotation.x = 0.12;

      const intro = sim.intro.core;
      const emph = c.emph;
      hull.emissiveIntensity = (0.55 + 0.4 * intro) * (1 - 0.4 * e);
      trenchLights.material.opacity = 0.35 + 0.25 * Math.sin(t * 1.7);

      /* Reactor core: the agent loop, beating on each agent pulse. */
      const beat = sim.agentPulse;
      const ce = ease(e * 1.5);
      coreMat.color.copy(BLUE).lerp(GREEN, beat * 0.6).multiplyScalar((0.4 + 1.2 * ce + beat * 0.8) * intro);
      core.scale.setScalar(1 + beat * 0.25 + ce * 0.3);
      core.rotation.y += dt * (0.4 + beat * 3);
      coreWire.material.opacity = ce * (0.5 + 0.4 * beat);
      coreWire.rotation.y -= dt * 0.6;
      coreWire.rotation.x += dt * 0.25;
      coreGlow.material.opacity = (0.55 + 0.35 * beat) * ce * intro;

      /* Shockwave on the way out only. */
      shock.visible = on && k > 0 && k < 0.85;
      if (shock.visible) {
        const s = 0.6 + k * 2.4;
        shock.scale.setScalar(s);
        shockMat.opacity = 0.8 * (1 - k / 0.85) ** 1.5;
      }

      /* Superlaser charges whenever the agent calls a tool. */
      const glow = sim.agentToolGlow;
      const charge = Math.max(beat, glow) * intro * (1 - e);
      laserMat.opacity = charge;
      tribMat.opacity = charge * 0.9;
      focusGlow.material.opacity = charge * 0.9;

      _v.copy(focusLocal).applyEuler(station.rotation);
      for (let i = 0; i < TOOLS; i++) {
        placeTie(i, Math.sin(t * 1.3 + i * 1.7) * 0.025 * sim.motion);
        const fire = i === sim.agentTool ? glow : 0;
        const col = fire > 0.02 ? _c.copy(BLUE).lerp(GREEN, fire) : _c.copy(BLUE);
        col.multiplyScalar((0.12 + fire * 1.4) * emph);
        eyes.setColorAt(i, fire > 0.02 ? col : _c.copy(OFF).lerp(BLUE, 0.3 * emph));
        const T = ties[i];
        linePos.set([_v.x, _v.y, _v.z, T.x, T.y, T.z], i * 6);
        const lc = fire > 0.02 ? _c.copy(BLUE).lerp(GREEN, fire).multiplyScalar((0.12 + fire * 1.4) * emph) : _c.copy(BLUE).multiplyScalar(0.12 * emph);
        for (let v = 0; v < 2; v++) lineCol.set([lc.r * (v ? 1 : 0.6), lc.g * (v ? 1 : 0.6), lc.b * (v ? 1 : 0.6)], i * 6 + v * 3);
      }
      for (const m of [pods, wings, wingFrames, struts, eyes]) m.instanceMatrix.needsUpdate = true;
      eyes.instanceColor.needsUpdate = true;
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;
      c.activity = 0.6 + sim.agentPulse * 1.2;
    },
  };
}
