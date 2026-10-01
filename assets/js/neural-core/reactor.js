/* ---------------------------------------------------------------------------
   Neural Compute Core — fusion reactor (the LLM inference engine)
   ---------------------------------------------------------------------------
   The centre of the machine, modelled on a tokamak: a ring of D-shaped
   toroidal-field coils around a glowing plasma torus, a segmented central
   solenoid, poloidal-field rings, a cryostat lid with cable looms, four
   injection ports and a pedestal.

   Selecting it plays an exploded view that turns into a JARVIS-style gold
   hologram: the hardware separates and fades into fresnel "ghosts", a
   lat/long sphere, HUD dials and live callouts bloom around it, and the
   assembly can be grabbed and spun (holo.grab / holo.release from main.js).

   Local frame: y = 0 is the deck. Everything that spins lives in `asm`,
   whose origin is the plasma centre (Y0), so coordinates inside it are
   relative to the midplane.
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const Y0 = 1.7;
const GOLD = new THREE.Color(0xffb444);

const _m = new THREE.Matrix4();
const _b = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _sphere = new THREE.Sphere();

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/* Instance = basis * local TRS. */
function place(mesh, idx, basis, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  _p.set(x, y, z);
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  if (basis) _m.premultiply(basis);
  mesh.setMatrixAt(idx, _m);
}

/* Radial frame at angle a, pushed out by d: local x = outward, z = tangent. */
function radial(a, d) {
  _b.makeRotationY(-a);
  _b.setPosition(Math.cos(a) * d, 0, Math.sin(a) * d);
  return _b;
}

function solid(geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

function instanced(geo, mat, count) {
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  /* Instances move during the explode, so the cached bounds go stale. */
  m.frustumCulled = false;
  return m;
}

function ring(r, tube, segs = 96) {
  const g = new THREE.TorusGeometry(r, tube, 8, segs);
  g.rotateX(Math.PI / 2);
  return g;
}

/* D-shaped coil profile in the (r, y) plane: straight inner leg, elliptical
   outer arc. */
function dShape(leg, rx, ry) {
  const s = new THREE.Shape();
  s.moveTo(leg, -ry);
  s.lineTo(leg, ry);
  s.absellipse(leg, 0, rx, ry, Math.PI / 2, -Math.PI / 2, true);
  return s;
}

/* Thin band hugging the coil's outer arc between angles a0..a1. */
function bandShape(leg, rx, ry, a0, a1, w) {
  const s = new THREE.Shape();
  s.absellipse(leg, 0, rx + w, ry + w, a0, a1, false);
  s.absellipse(leg, 0, rx, ry, a1, a0, true);
  return s;
}

/* ------------------------------ materials ------------------------------ */

const PLASMA_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

/* Hot plasma: orange rim, pink body, white-hot helical field-line streaks. */
const PLASMA_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uLevel;
  uniform float uAlpha;
  uniform float uHolo;
  uniform float uCore;
  uniform vec3 uGold;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = abs(dot(normalize(vN), normalize(vV)));
    float rim = pow(1.0 - f, 1.7);
    float u = vUv.x * 6.28318;
    float v = vUv.y * 6.28318;
    float s1 = pow(0.5 + 0.5 * sin(u * 26.0 + v * 2.0 - uTime * 2.6), 12.0);
    float s2 = pow(0.5 + 0.5 * sin(u * 11.0 - v + uTime * 1.3 + 1.8 * sin(u * 3.0 - uTime * 0.7)), 7.0);
    float s3 = pow(0.5 + 0.5 * sin(v * 3.0 + u * 5.0 - uTime * 3.4), 3.0);
    float streak = s1 * 0.8 + s2 * 0.55;
    vec3 edge = vec3(1.0, 0.40, 0.07);
    vec3 pink = vec3(1.0, 0.30, 0.58);
    vec3 hot = vec3(1.0, 0.84, 0.62);
    vec3 col = edge * rim * 1.15 + pink * (0.16 + 0.26 * s3) * (1.0 - rim) + hot * streak * (0.3 + 0.8 * rim);
    col = mix(col, hot * (0.45 + streak), uCore * 0.75);
    float lum = dot(col, vec3(0.3, 0.5, 0.2));
    col = mix(col, uGold * lum * 1.5, uHolo * 0.65);
    gl_FragColor = vec4(col * uAlpha * (0.32 + 0.4 * uLevel), 1.0);
  }
`;

/* Hologram ghost: gold fresnel rim + rolling scanlines, additive. Works for
   plain and instanced meshes (instanceMatrix is declared by three). */
const HOLO_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
    #endif
    vec4 w = modelMatrix * p;
    vW = w.xyz;
    vec4 mv = viewMatrix * w;
    vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * n);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const HOLO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  void main() {
    float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    float rim = pow(f, 2.4);
    float scan = 0.6 + 0.4 * sin(vW.y * 70.0 - uTime * 5.0);
    float sweep = smoothstep(0.96, 1.0, 0.5 + 0.5 * sin(vW.y * 2.4 - uTime * 1.8));
    float a = (0.05 + rim * 0.95) * scan + sweep * 0.22;
    gl_FragColor = vec4(uColor * a * uOpacity, 1.0);
  }
`;

/* -------------------------------- HUD art ------------------------------ */

function hudTexture(kind) {
  const S = 1024;
  const C = S / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const g = canvas.getContext("2d");
  g.strokeStyle = g.fillStyle = "#fff";
  let seed = kind === "dial" ? 7 : 19;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const arc = (r, a0, a1, w, alpha) => {
    g.globalAlpha = alpha;
    g.lineWidth = w;
    g.beginPath();
    g.arc(C, C, r, a0 * DEG, a1 * DEG);
    g.stroke();
  };
  const ticks = (r0, r1, step, w, alpha) => {
    g.globalAlpha = alpha;
    g.lineWidth = w;
    g.beginPath();
    for (let d = 0; d < 360; d += step) {
      const a = d * DEG;
      g.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0);
      g.lineTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1);
    }
    g.stroke();
  };
  if (kind === "dial") {
    ticks(504, 490, 2, 2, 0.5);
    ticks(504, 474, 10, 3, 0.9);
    for (let a = 0; a < 360; ) {
      const len = 6 + rnd() * 34;
      if (rnd() > 0.3) arc(432, a, a + len, 14, 0.25 + rnd() * 0.5);
      a += len + 3;
    }
    arc(408, 0, 360, 1.5, 0.45);
    for (let a = 0; a < 360; a += 6) arc(384, a, a + 3.5, 6, 0.5);
    for (let a = 0; a < 360; a += 10) arc(330, a + 1, a + 8, 26, 0.12 + 0.35 * rnd());
    arc(302, 0, 360, 2, 0.5);
    g.font = "600 22px ui-monospace, Menlo, Consolas, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.globalAlpha = 0.85;
    for (let k = 0; k < 4; k++) {
      const a = k * 90 * DEG;
      g.save();
      g.translate(C + Math.cos(a) * 458, C + Math.sin(a) * 458);
      g.rotate(a + Math.PI / 2);
      g.fillText(String(k * 90).padStart(3, "0"), 0, 0);
      g.restore();
    }
  } else {
    ticks(508, 494, 1.5, 1.5, 0.5);
    ticks(508, 478, 15, 3, 0.9);
    arc(486, 0, 360, 1.5, 0.3);
    for (let k = 0; k < 3; k++) {
      const a0 = k * 120 + rnd() * 30;
      arc(468, a0, a0 + 50 + rnd() * 30, 8, 0.75);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function sphereLines(R, meridians, parallels, seg) {
  const pts = [];
  const at = (lat, lon) => [R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon)];
  for (let m = 0; m < meridians; m++) {
    const lon = (m / meridians) * TAU;
    for (let s = 0; s < seg; s++) pts.push(...at(-Math.PI / 2 + (s / seg) * Math.PI, lon), ...at(-Math.PI / 2 + ((s + 1) / seg) * Math.PI, lon));
  }
  for (let p = 1; p < parallels; p++) {
    const lat = -Math.PI / 2 + (p / parallels) * Math.PI;
    for (let s = 0; s < seg * 2; s++) pts.push(...at(lat, (s / (seg * 2)) * TAU), ...at(lat, ((s + 1) / (seg * 2)) * TAU));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

function circleGeo(r, seg = 96) {
  const pts = [];
  for (let i = 0; i < seg; i++) pts.push(Math.cos((i / seg) * TAU) * r, 0, Math.sin((i / seg) * TAU) * r);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

/* Callout card: index, title, rule, live value line and a segmented meter. */
function drawCallout(g, w, h, n, title, sub, level, hot) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = "#ffb444";
  g.globalAlpha = hot ? 0.2 : 0.1;
  g.fillRect(8, 8, w - 16, h - 30);
  g.strokeStyle = "#ffc46b";
  g.globalAlpha = hot ? 1 : 0.8;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(26, 8);
  g.lineTo(8, 8);
  g.lineTo(8, 34);
  g.moveTo(w - 26, h - 22);
  g.lineTo(w - 8, h - 22);
  g.lineTo(w - 8, h - 48);
  g.stroke();
  g.font = "600 22px ui-monospace, Menlo, Consolas, monospace";
  g.textBaseline = "middle";
  g.fillStyle = "#ffc46b";
  g.fillText(n, 24, 36);
  g.font = "700 30px ui-monospace, Menlo, Consolas, monospace";
  g.fillStyle = "#fff3dc";
  g.fillText(title, 66, 36);
  g.globalAlpha = 0.55;
  g.fillRect(24, 58, w - 48, 2);
  g.globalAlpha = 1;
  g.fillRect(24, 56, 44, 6);
  g.font = "500 23px ui-monospace, Menlo, Consolas, monospace";
  g.fillStyle = "#ffc46b";
  g.fillText(sub, 24, 88);
  const segs = 24;
  const on = Math.round(clamp01(level) * segs);
  for (let i = 0; i < segs; i++) {
    g.globalAlpha = i < on ? 0.95 : 0.18;
    g.fillRect(24 + i * 19, 110, 14, 10);
  }
  /* Leader attachment tick at the bottom centre. */
  g.globalAlpha = 0.9;
  g.fillRect(w / 2 - 1.5, h - 20, 3, 20);
}

/* -------------------------------- builder ------------------------------ */

export function buildReactor(ctx) {
  const low = ctx.quality.low;
  const NC = low ? 12 : 16;
  const g = new THREE.Group();
  const asm = new THREE.Group();
  asm.position.y = Y0;
  g.add(asm);

  /* Private materials so the hologram cross-fade never touches shared ones. */
  const steel = new THREE.MeshStandardMaterial({ color: 0x6a717b, metalness: 0.92, roughness: 0.3 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x23262c, metalness: 0.85, roughness: 0.38 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xd88a52, metalness: 0.9, roughness: 0.34 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1b2a4a, metalness: 0.65, roughness: 0.34 });
  const accent = ctx.accent;
  const solids = [steel, steelDark, copper, cableMat, accent];

  const time = { value: 0 };
  const gold = { value: GOLD };
  const holoMats = {};
  const holoMat = (name, base) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: gold, uTime: time, uOpacity: { value: 0 } },
      vertexShader: HOLO_VERT,
      fragmentShader: HOLO_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    holoMats[name] = { mat, base };
    return mat;
  };
  const ghosts = [];
  /* A gold twin of a part, drawn only while the hologram is up. */
  const ghost = (obj, mat) => {
    let twin;
    if (obj.isInstancedMesh) {
      twin = new THREE.InstancedMesh(obj.geometry, mat, obj.count);
      twin.instanceMatrix = obj.instanceMatrix;
      twin.frustumCulled = false;
    } else twin = new THREE.Mesh(obj.geometry, mat);
    twin.visible = false;
    twin.renderOrder = 3;
    obj.add(twin);
    ghosts.push(twin);
    return obj;
  };

  const cyl = new THREE.CylinderGeometry(1, 1, 1, 32);
  const cylLow = new THREE.CylinderGeometry(1, 1, 1, 12);
  const box = new THREE.BoxGeometry(1, 1, 1);

  /* ------------------------------ pedestal ----------------------------- */
  const base = new THREE.Group();
  g.add(base);
  base.add(ghost(solid(cyl, steelDark, 0, 0.15, 0, 1.28, 0.3, 1.28), holoMat("base", 0.5)));
  base.add(solid(cyl, steel, 0, 0.325, 0, 1.38, 0.035, 1.38));
  base.add(solid(ring(1.385, 0.014), accent, 0, 0.345, 0));
  const NL = low ? 20 : 32;
  const baseLeds = new THREE.InstancedMesh(box, accent, NL);
  for (let i = 0; i < NL; i++) {
    const a = (i / NL) * TAU;
    place(baseLeds, i, radial(a, 0), 1.285, 0.15, 0, 0.012, 0.05, 0.09);
  }
  base.add(baseLeds);

  /* ---------------------------- plasma torus --------------------------- */
  const plasmaUniforms = {
    uTime: time,
    uLevel: { value: 0.4 },
    uAlpha: { value: 1 },
    uHolo: { value: 0 },
    uCore: { value: 0 },
    uGold: gold,
  };
  const plasmaMat = (core) =>
    new THREE.ShaderMaterial({
      uniforms: { ...plasmaUniforms, uCore: { value: core } },
      vertexShader: PLASMA_VERT,
      fragmentShader: PLASMA_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  const shellGeo = new THREE.TorusGeometry(0.82, 0.33, low ? 20 : 32, low ? 64 : 128);
  shellGeo.rotateX(Math.PI / 2).scale(1, 1.5, 1);
  const coreGeo = new THREE.TorusGeometry(0.82, 0.15, 16, low ? 48 : 96);
  coreGeo.rotateX(Math.PI / 2).scale(1, 1.6, 1);
  const shell = new THREE.Mesh(shellGeo, plasmaMat(0));
  const coreShell = new THREE.Mesh(coreGeo, plasmaMat(1));
  shell.renderOrder = coreShell.renderOrder = 2;
  asm.add(shell, coreShell);
  const plasmaMats = [shell.material, coreShell.material];
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ctx.glow, color: 0xff7a30, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.4 })
  );
  halo.scale.set(3.6, 2.4, 1);
  asm.add(halo);

  /* --------------------------- toroidal coils -------------------------- */
  const OUT = [0.3, 1.24, 1.06];
  const INN = [0.43, 0.95, 0.88];
  const BEV = 0.012;
  const COIL_T = 0.085;
  const coilShape = dShape(...OUT);
  coilShape.holes.push(dShape(...INN));
  const coilGeo = new THREE.ExtrudeGeometry(coilShape, {
    depth: COIL_T,
    bevelEnabled: true,
    bevelThickness: BEV,
    bevelSize: BEV,
    bevelSegments: 1,
    curveSegments: low ? 18 : 30,
  });
  coilGeo.translate(0, 0, -COIL_T / 2);
  const bandGeo = new THREE.ExtrudeGeometry(bandShape(OUT[0], OUT[1] + BEV, OUT[2] + BEV, -30 * DEG, 30 * DEG, 0.022), {
    depth: 0.045,
    bevelEnabled: false,
    curveSegments: 12,
  });
  bandGeo.translate(0, 0, -0.0225);
  const coilAng = [];
  for (let i = 0; i < NC; i++) coilAng.push((i / NC) * TAU);
  /* Caps (group 0) copper windings, sides (group 1) steel casing. */
  const coils = ghost(instanced(coilGeo, [copper, steel], NC), holoMat("coils", 0.85));
  const bands = instanced(bandGeo, accent, NC);
  const clamps = ghost(instanced(box, steelDark, NC * 2), holoMat("clamps", 0.5));
  const feet = ghost(instanced(box, steelDark, NC), holoMat("feet", 0.45));
  asm.add(coils, bands, clamps, feet);
  const CLAMP_PHI = 36 * DEG;
  const clampX = OUT[0] + (OUT[1] + BEV) * Math.cos(CLAMP_PHI);
  const clampY = (OUT[2] + BEV) * Math.sin(CLAMP_PHI);
  const clampRot = Math.atan2(Math.sin(CLAMP_PHI) / OUT[2], Math.cos(CLAMP_PHI) / OUT[1]);
  function layoutCoils(d) {
    for (let i = 0; i < NC; i++) {
      const B = radial(coilAng[i], d);
      place(coils, i, B, 0, 0, 0, 1, 1, 1);
      place(bands, i, B, 0, 0, 0, 1, 1, 1);
      place(clamps, i * 2, B, clampX, clampY, 0, 0.07, 0.15, 0.15, 0, 0, clampRot);
      place(clamps, i * 2 + 1, B, clampX, -clampY, 0, 0.07, 0.15, 0.15, 0, 0, -clampRot);
      place(feet, i, B, 0.85, -1.14, 0, 0.16, 0.44, 0.1);
    }
    for (const m of [coils, bands, clamps, feet]) m.instanceMatrix.needsUpdate = true;
  }

  /* -------------------------- central solenoid ------------------------- */
  const NS = 6;
  const SEG = [];
  for (let j = 0; j < NS; j++) SEG.push((j - (NS - 1) / 2) * 0.42);
  const solSegs = ghost(instanced(cyl, copper, NS), holoMat("solenoid", 0.8));
  const solCaps = instanced(cyl, steel, NS * 2 + 2);
  const solGaps = instanced(cyl, accent, NS - 1);
  asm.add(solSegs, solCaps, solGaps);
  function layoutSolenoid(spread) {
    const k = 1 + spread;
    for (let j = 0; j < NS; j++) {
      const y = SEG[j] * k;
      place(solSegs, j, null, 0, y, 0, 0.225, 0.34, 0.225);
      place(solCaps, j * 2, null, 0, y + 0.17, 0, 0.245, 0.03, 0.245);
      place(solCaps, j * 2 + 1, null, 0, y - 0.17, 0, 0.245, 0.03, 0.245);
      if (j < NS - 1) place(solGaps, j, null, 0, ((SEG[j] + SEG[j + 1]) / 2) * k, 0, 0.19, 0.05, 0.19);
    }
    const end = (SEG[NS - 1] + 0.24) * k;
    place(solCaps, NS * 2, null, 0, end, 0, 0.3, 0.05, 0.3);
    place(solCaps, NS * 2 + 1, null, 0, -end, 0, 0.3, 0.05, 0.3);
    for (const m of [solSegs, solCaps, solGaps]) m.instanceMatrix.needsUpdate = true;
  }

  /* ---------------------- poloidal-field rings (KV) -------------------- */
  const pfGeo = ring(0.92, 0.05);
  const pfGlowGeo = ring(0.852, 0.014);
  const pf = [1, -1].map((sgn) => {
    const grp = new THREE.Group();
    grp.position.y = sgn * 1.0;
    grp.add(ghost(new THREE.Mesh(pfGeo, steel), holoMat(sgn > 0 ? "pfTop" : "pfBot", 0.9)));
    grp.add(new THREE.Mesh(pfGlowGeo, accent));
    asm.add(grp);
    return grp;
  });

  /* ------------------------- cryostat lid + looms ---------------------- */
  const lid = new THREE.Group();
  asm.add(lid);
  lid.add(ghost(solid(cyl, steelDark, 0, 1.16, 0, 1.02, 0.08, 1.02), holoMat("lid", 0.6)));
  lid.add(solid(ring(1.02, 0.016), accent, 0, 1.16, 0));
  lid.add(ghost(solid(cyl, steel, 0, 1.26, 0, 0.68, 0.12, 0.68), holoMats.lid.mat));
  lid.add(solid(cyl, steelDark, 0, 1.37, 0, 0.36, 0.1, 0.36));
  lid.add(solid(cyl, steel, 0, 1.68, 0, 0.15, 0.54, 0.15));
  const NB = low ? 12 : 20;
  const bolts = new THREE.InstancedMesh(cylLow, steel, NB);
  for (let i = 0; i < NB; i++) place(bolts, i, radial((i / NB) * TAU, 0), 0.88, 1.215, 0, 0.022, 0.03, 0.022);
  lid.add(bolts);
  /* Eight cable looms (three conductors each) rising from the lid into the
     scheduler deck above. One curve per conductor, instanced around Y. */
  const LOOMS = 8;
  for (const [dz, dr] of [[-0.058, 0], [0, 0.03], [0.058, 0]]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.7 + dr, 1.2, dz),
      new THREE.Vector3(0.84 + dr, 1.46, dz),
      new THREE.Vector3(1.03 + dr, 1.72, dz * 1.2),
      new THREE.Vector3(1.04 + dr, 2.0, dz * 1.3),
    ]);
    const loom = new THREE.InstancedMesh(new THREE.TubeGeometry(curve, 24, 0.026, 8, false), cableMat, LOOMS);
    for (let i = 0; i < LOOMS; i++) place(loom, i, radial(((i + 0.5) / LOOMS) * TAU, 0), 0, 0, 0, 1, 1, 1);
    lid.add(loom);
  }
  const collars = new THREE.InstancedMesh(cylLow, steel, LOOMS);
  for (let i = 0; i < LOOMS; i++) place(collars, i, radial(((i + 0.5) / LOOMS) * TAU, 0), 0.73, 1.24, 0, 0.11, 0.06, 0.11);
  lid.add(collars);

  /* ---------------------------- injection ports ------------------------ */
  const portAng = [];
  for (let j = 0; j < 4; j++) portAng.push(((j * NC) / 4 + Math.floor(NC / 8) + 0.5) * (TAU / NC));
  const PORT_Y = -0.32;
  const portDuct = ghost(instanced(cyl, steel, 4), holoMat("ports", 0.85));
  const portFlange = ghost(instanced(cyl, steelDark, 8), holoMats.ports.mat);
  const portWin = instanced(new THREE.TorusGeometry(1, 0.14, 6, 32), accent, 4);
  asm.add(portDuct, portFlange, portWin);
  function layoutPorts(d) {
    for (let j = 0; j < 4; j++) {
      const B = radial(portAng[j], d);
      place(portDuct, j, B, 1.56, PORT_Y, 0, 0.085, 0.62, 0.085, 0, 0, Math.PI / 2);
      place(portFlange, j * 2, B, 1.87, PORT_Y, 0, 0.155, 0.045, 0.155, 0, 0, Math.PI / 2);
      place(portFlange, j * 2 + 1, B, 1.36, PORT_Y, 0, 0.12, 0.03, 0.12, 0, 0, Math.PI / 2);
      place(portWin, j, B, 1.9, PORT_Y, 0, 0.11, 0.11, 0.11, 0, Math.PI / 2, 0);
    }
    for (const m of [portDuct, portFlange, portWin]) m.instanceMatrix.needsUpdate = true;
  }

  layoutCoils(0);
  layoutSolenoid(0);
  layoutPorts(0);

  /* ------------------------------ hologram ----------------------------- */
  const lineMat = (opacity) =>
    new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const SPH_R = 2.05;
  const sphere = new THREE.LineSegments(sphereLines(SPH_R, 18, 10, 32), lineMat(0));
  const scan = new THREE.LineLoop(circleGeo(1), lineMat(0));
  const hudMat = (map) =>
    new THREE.MeshBasicMaterial({ map, color: GOLD, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const dialTex = hudTexture("dial");
  const ringTex = hudTexture("ring");
  const floorDial = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), hudMat(dialTex));
  floorDial.rotation.x = -Math.PI / 2;
  floorDial.position.y = 0.04;
  const equator = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), hudMat(ringTex));
  equator.rotation.x = -Math.PI / 2;
  const gyro = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 4.7), hudMat(ringTex));
  const gyroPivot = new THREE.Group();
  gyroPivot.rotation.z = 22 * DEG;
  gyroPivot.add(gyro);
  const holo = new THREE.Group();
  holo.add(sphere, scan, gyroPivot);
  holo.visible = false;
  asm.add(holo);
  const equatorPivot = new THREE.Group();
  equatorPivot.position.y = Y0;
  equatorPivot.add(equator);
  const fixedHolo = new THREE.Group();
  fixedHolo.add(floorDial, equatorPivot);
  fixedHolo.visible = false;
  g.add(fixedHolo);
  for (const o of [sphere, scan, floorDial, equator, gyro]) o.renderOrder = 4;

  /* Callouts: fixed around the hologram; leaders track the spinning parts. */
  const CALLOUTS = [
    { n: "01", title: "TOKEN PLASMA", th: -14, r: 2.5, y: 0.62 },
    { n: "02", title: "ATTENTION COILS", th: 140, r: 2.45, y: 0.95, mat: "coils" },
    { n: "03", title: "SCHEDULER SOLENOID", th: 38, r: 1.15, y: 2.4, mat: "solenoid" },
    { n: "04", title: "KV CONFINEMENT", th: 168, r: 2.95, y: -0.55, mat: "pfBot" },
    { n: "05", title: "PREFILL INJECTORS", th: -36, r: 2.95, y: -0.7, mat: "ports" },
  ];
  const CW = 512;
  const CH = 160;
  const labels = new THREE.Group();
  fixedHolo.add(labels);
  const leaderPos = new Float32Array(CALLOUTS.length * 6);
  const leaderCol = new Float32Array(CALLOUTS.length * 6);
  const leaderGeo = new THREE.BufferGeometry();
  leaderGeo.setAttribute("position", new THREE.BufferAttribute(leaderPos, 3).setUsage(THREE.DynamicDrawUsage));
  leaderGeo.setAttribute("color", new THREE.BufferAttribute(leaderCol, 3).setUsage(THREE.DynamicDrawUsage));
  const leaders = new THREE.LineSegments(
    leaderGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })
  );
  const dotPos = new Float32Array(CALLOUTS.length * 3);
  const dotCol = new Float32Array(CALLOUTS.length * 3);
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPos, 3).setUsage(THREE.DynamicDrawUsage));
  dotGeo.setAttribute("color", new THREE.BufferAttribute(dotCol, 3).setUsage(THREE.DynamicDrawUsage));
  const dots = new THREE.Points(
    dotGeo,
    new THREE.PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })
  );
  leaders.frustumCulled = dots.frustumCulled = false;
  leaders.renderOrder = dots.renderOrder = 9;
  labels.add(leaders, dots);
  const sprites = [];
  for (const co of CALLOUTS) {
    const canvas = document.createElement("canvas");
    canvas.width = CW;
    canvas.height = CH;
    co.g = canvas.getContext("2d");
    co.tex = new THREE.CanvasTexture(canvas);
    co.tex.colorSpace = THREE.SRGBColorSpace;
    co.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: co.tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    );
    co.sprite.center.set(0.5, 0);
    co.sprite.scale.set(1.7, (1.7 * CH) / CW, 1);
    co.sprite.position.set(Math.cos(co.th * DEG) * co.r, Y0 + co.y, Math.sin(co.th * DEG) * co.r);
    co.sprite.renderOrder = 10;
    co.sprite.userData.callout = sprites.length;
    co.anchor = new THREE.Vector3();
    labels.add(co.sprite);
    sprites.push(co.sprite);
  }

  const proxy = solid(cyl, new THREE.MeshBasicMaterial({ visible: false }), 0, 1.8, 0, 1.62, 3.6, 1.62);

  /* -------------------------------- state ------------------------------ */
  let on = false;
  let k = 0;
  let lastEx = -1;
  let lastFade = -1;
  let yaw = 0;
  let tilt = 0;
  let yawVel = 0;
  let grabbing = false;
  let lastGrab = 0;
  let hot = -1;
  let nextCallout = 0;

  /* Anchor of callout i in asm-local space, chosen to face its label. */
  function anchorLocal(i, ex, out) {
    const co = CALLOUTS[i];
    const th = co.th * DEG + yaw;
    if (i === 0) return out.set(Math.cos(th) * 1.15, 0, Math.sin(th) * 1.15);
    if (i === 2) return out.set(Math.cos(th) * 0.25, SEG[NS - 2] * (1 + 0.6 * ex), Math.sin(th) * 0.25);
    if (i === 3) return out.set(Math.cos(th) * 0.95, pf[1].position.y, Math.sin(th) * 0.95);
    const angles = i === 1 ? coilAng : portAng;
    let best = 0;
    let bestD = 9;
    for (let j = 0; j < angles.length; j++) {
      const d = Math.abs(wrap(angles[j] - th));
      if (d < bestD) {
        bestD = d;
        best = angles[j];
      }
    }
    if (i === 1) {
      const r = 0.3 + 1.24 * Math.cos(25 * DEG) + 0.6 * ex;
      return out.set(Math.cos(best) * r, 1.06 * Math.sin(25 * DEG), Math.sin(best) * r);
    }
    const r = 1.9 + 0.9 * ex;
    return out.set(Math.cos(best) * r, PORT_Y, Math.sin(best) * r);
  }

  function redrawCallouts(sim) {
    const kvUsed = Math.round(sim.kvFill * sim.kv.count);
    const beat = (sim.tokenPulse || 0) * 0.6 + 0.3;
    const subs = [
      [`${sim.phase} · CORE ${Math.round(sim.coreLevel * 100)}%`, sim.coreLevel],
      [`${NC} TF COILS · 24 HEADS`, 0.35 + sim.attnPulse * 0.65],
      [`BATCH CLOCK · TOKEN ${sim.tokenIndex}`, beat],
      [`${kvUsed}/${sim.kv.count} BLOCKS PAGED`, sim.kvFill],
      [`4 PORTS · ${sim.prefillLevel > 0.15 ? "FIRING" : "STANDBY"}`, sim.prefillLevel],
    ];
    CALLOUTS.forEach((co, i) => {
      drawCallout(co.g, CW, CH, co.n, co.title, subs[i][0], subs[i][1], i === hot);
      co.tex.needsUpdate = true;
    });
  }

  return {
    group: g,
    proxies: [proxy],
    holo: {
      get k() {
        return k;
      },
      set(v) {
        on = v;
        if (!v) hot = -1;
      },
      /* Ray hits the hologram volume (used for grab + "don't deselect"). */
      hits(raycaster) {
        if (k < 0.3) return false;
        asm.getWorldPosition(_sphere.center);
        _sphere.radius = SPH_R + 0.35;
        return raycaster.ray.intersectsSphere(_sphere);
      },
      grab(dx, dy, ms) {
        grabbing = true;
        lastGrab = performance.now();
        yaw += dx * 0.0085;
        tilt = Math.max(-0.38, Math.min(0.38, tilt + dy * 0.0035));
        yawVel = Math.max(-5, Math.min(5, (dx * 0.0085) / (Math.max(8, ms) / 1000)));
      },
      release() {
        grabbing = false;
        if (performance.now() - lastGrab > 90) yawVel = 0;
      },
      /* Hover a callout: highlights the label and its part's ghost. */
      pick(raycaster) {
        let h = -1;
        if (k > 0.6) {
          const hit = raycaster.intersectObjects(sprites, false);
          if (hit.length) h = hit[0].object.userData.callout;
        }
        if (h !== hot) {
          hot = h;
          nextCallout = 0;
        }
        return h;
      },
    },
    update(dt, t, sim, c) {
      /* Linear progress so the open/close choreography has fixed timing. */
      if (dt > 0) k = clamp01(k + (on ? dt / 1.7 : -dt / 1.0));
      else k = on ? 1 : 0;
      const ex = ease(k / 0.6);
      const hk = ease((k - 0.28) / 0.72);
      time.value = t;

      if (Math.abs(ex - lastEx) > 1e-4) {
        lastEx = ex;
        layoutCoils(0.6 * ex);
        layoutSolenoid(0.6 * ex);
        layoutPorts(0.9 * ex);
        pf[0].position.y = 1.0 + 0.55 * ex;
        pf[1].position.y = -1.0 - 0.28 * ex;
        lid.position.y = 0.9 * ex;
      }

      /* Spin: auto-rotate while open, inertia after a throw, home on close. */
      if (on) {
        if (!grabbing && dt > 0) {
          yawVel += (0.16 * hk - yawVel) * (1 - Math.exp(-dt * 1.1));
          yaw += yawVel * dt;
        }
      } else {
        const home = Math.round(yaw / TAU) * TAU;
        const a = dt > 0 ? 1 - Math.exp(-dt * 3.2) : 1;
        yaw += (home - yaw) * a;
        tilt -= tilt * a;
        yawVel = 0;
        if (Math.abs(home - yaw) < 1e-4) yaw = 0;
      }
      asm.rotation.set(tilt, yaw, 0, "YXZ");
      asm.updateMatrix();

      /* Hardware fades to a ghost as the hologram takes over. */
      const fade = 1 - 0.9 * hk;
      if (fade !== lastFade) {
        lastFade = fade;
        const transparent = fade < 0.999;
        for (const m of solids) {
          if (m.transparent !== transparent) {
            m.transparent = transparent;
            m.needsUpdate = true;
          }
          m.opacity = fade;
          m.depthWrite = fade > 0.5;
        }
      }
      const showHolo = hk > 0.001;
      holo.visible = fixedHolo.visible = showHolo;
      for (const gm of ghosts) gm.visible = showHolo;

      const level = sim.coreLevel;
      plasmaUniforms.uLevel.value = level;
      for (const pm of plasmaMats) {
        pm.uniforms.uAlpha.value = sim.intro.core * Math.min(1.3, c.emph) * (1 - 0.5 * hk) * (hot === 0 ? 1.6 : 1);
        pm.uniforms.uHolo.value = hk;
      }
      halo.material.opacity = (0.16 + level * 0.32) * sim.intro.core * Math.min(1.2, c.emph);

      if (showHolo) {
        const hotMat = hot >= 0 ? CALLOUTS[hot].mat : null;
        for (const name in holoMats) {
          const h = holoMats[name];
          const lit = name === hotMat || (hotMat === "pfBot" && name === "pfTop");
          h.mat.uniforms.uOpacity.value = hk * h.base * (lit ? 2.2 : 1) * (0.9 + 0.1 * Math.sin(t * 17));
        }
        sphere.material.opacity = 0.3 * hk;
        sphere.rotation.y = -t * 0.05;
        const sy = Math.sin(t * 0.8) * SPH_R * 0.92;
        scan.position.y = sy;
        scan.scale.setScalar(Math.sqrt(SPH_R * SPH_R - sy * sy));
        scan.material.opacity = 0.55 * hk;
        floorDial.material.opacity = 0.75 * hk;
        floorDial.rotation.z = t * 0.06;
        equator.material.opacity = 0.5 * ease((k - 0.45) / 0.4);
        equator.rotation.z = -t * 0.11;
        gyro.material.opacity = 0.42 * ease((k - 0.55) / 0.4);
        gyroPivot.rotation.y = t * 0.23;
        gyro.scale.setScalar(0.85 + 0.15 * hk);

        if (t >= nextCallout || nextCallout - t > 1) {
          nextCallout = t + 0.2;
          redrawCallouts(sim);
        }
        for (let i = 0; i < CALLOUTS.length; i++) {
          const co = CALLOUTS[i];
          const a = ease((k - 0.5 - i * 0.07) / 0.3);
          co.sprite.material.opacity = a * (hot < 0 || hot === i ? 1 : 0.55);
          const s = 1.7 * (i === hot ? 1.1 : 1) * (0.7 + 0.3 * a);
          co.sprite.scale.set(s, (s * CH) / CW, 1);
          anchorLocal(i, ex, co.anchor).applyMatrix4(asm.matrix);
          const lp = co.sprite.position;
          leaderPos.set([co.anchor.x, co.anchor.y, co.anchor.z, lp.x, lp.y, lp.z], i * 6);
          const lc = a * (i === hot ? 1 : 0.6);
          for (let v = 0; v < 2; v++) leaderCol.set([GOLD.r * lc, GOLD.g * lc, GOLD.b * lc], i * 6 + v * 3);
          dotPos.set([co.anchor.x, co.anchor.y, co.anchor.z], i * 3);
          dotCol.set([GOLD.r * a, GOLD.g * a, GOLD.b * a], i * 3);
        }
        leaderGeo.attributes.position.needsUpdate = true;
        leaderGeo.attributes.color.needsUpdate = true;
        dotGeo.attributes.position.needsUpdate = true;
        dotGeo.attributes.color.needsUpdate = true;
      }

      c.activity = (0.85 + level * 0.55 + Math.sin(t * 2.2) * 0.04) * (1 - hk * 0.3);
    },
  };
}
