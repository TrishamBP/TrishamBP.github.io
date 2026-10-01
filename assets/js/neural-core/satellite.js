/* ---------------------------------------------------------------------------
   Neural Compute Core — orbital spacecraft (the LLM inference engine)
   ---------------------------------------------------------------------------
   The centre of the machine, modelled on a cargo spacecraft: a white
   pressurised module stacked on a foil-wrapped service module, a berthing
   ring on top, RCS thrusters and a main engine underneath, two camera pods
   and a pair of decagonal UltraFlex-style solar wings on booms. It hovers
   over a pedestal on its engine plume.

   Selecting it plays an exploded view that turns into a JARVIS-style gold
   hologram: the modules separate (revealing the token core inside) and fade
   into fresnel "ghosts", a lat/long sphere, HUD dials and live callouts
   bloom around it, and the assembly can be grabbed and spun (holo.grab /
   holo.release from main.js).

   Local frame: y = 0 is the deck. Everything that spins lives in `asm`,
   whose origin is the spacecraft's centre (Y0), so coordinates inside it
   are relative to that point. The body axis is vertical; the wings extend
   along ±x.
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
const hash = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

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

function ring(r, tube, segs = 96) {
  const g = new THREE.TorusGeometry(r, tube, 8, segs);
  g.rotateX(Math.PI / 2);
  return g;
}

/* Crumpled multi-layer insulation: jitter every vertex along `axis`
   (radial when axis is null) and let flat shading turn it into facets.
   The hash is positional, so seam vertices move together. */
function crinkle(geo, amp, axis) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    const n = (hash(_v.x * 9.1, _v.y * 9.1, _v.z * 9.1) - 0.5) * 2 * amp;
    if (axis) _v.addScaledVector(axis, n);
    else {
      const r = Math.hypot(_v.x, _v.z) || 1;
      _v.x += (_v.x / r) * n;
      _v.z += (_v.z / r) * n;
    }
    pos.setXYZ(i, _v.x, _v.y, _v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------ materials ------------------------------ */

const BASIC_VERT = /* glsl */ `
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

/* Token core: orange rim, pink body, white-hot helical streaks. */
const CORE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uLevel;
  uniform float uAlpha;
  uniform float uHolo;
  uniform vec3 uGold;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = abs(dot(normalize(vN), normalize(vV)));
    float rim = pow(1.0 - f, 1.7);
    float u = vUv.x * 6.28318;
    float v = vUv.y * 6.28318;
    float s1 = pow(0.5 + 0.5 * sin(u * 6.0 + v * 9.0 - uTime * 3.2), 10.0);
    float s2 = pow(0.5 + 0.5 * sin(u * 3.0 - v * 5.0 + uTime * 1.6 + 1.8 * sin(v * 2.0 - uTime * 0.7)), 7.0);
    float s3 = pow(0.5 + 0.5 * sin(v * 14.0 - uTime * 4.0), 3.0);
    vec3 edge = vec3(1.0, 0.40, 0.07);
    vec3 pink = vec3(1.0, 0.30, 0.58);
    vec3 hot = vec3(1.0, 0.84, 0.62);
    vec3 col = edge * rim * 1.15 + pink * (0.16 + 0.26 * s3) * (1.0 - rim) + hot * (s1 * 0.8 + s2 * 0.55) * (0.4 + 0.7 * rim);
    float lum = dot(col, vec3(0.3, 0.5, 0.2));
    col = mix(col, uGold * lum * 1.5, uHolo * 0.5);
    gl_FragColor = vec4(col * uAlpha * (0.35 + 0.45 * uLevel), 1.0);
  }
`;

/* Engine plume: hot at the nozzle (uv.y = 1), fading downstream. */
const PLUME_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform float uHolo;
  uniform vec3 uGold;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = abs(dot(normalize(vN), normalize(vV)));
    float body = pow(vUv.y, 1.8);
    float flick = 0.82 + 0.18 * sin(uTime * 37.0 + vUv.y * 24.0) * sin(uTime * 23.0 + vUv.x * 40.0);
    float diamond = 0.75 + 0.25 * pow(0.5 + 0.5 * cos(vUv.y * 28.0 - uTime * 9.0), 4.0);
    vec3 col = mix(vec3(1.0, 0.38, 0.1), vec3(1.0, 0.86, 0.66), f * f);
    col = mix(col, uGold, uHolo * 0.6);
    gl_FragColor = vec4(col * body * f * flick * diamond * uPower, 1.0);
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

/* ------------------------------ wing art ------------------------------- */

const WING_N = 10;

/* Decagonal UltraFlex blanket: deep-blue cell gores split by orange spars,
   an orange star around the hub and orange tips at each vertex. Vertex k
   sits at angle k·36° so it lines up with CircleGeometry(r, 10). */
function wingTexture() {
  const S = 1024;
  const C = S / 2;
  const R = 500;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const g = canvas.getContext("2d");
  const at = (k, r, off = 0) => {
    const a = (k / WING_N) * TAU + off;
    return [C + Math.cos(a) * r, C - Math.sin(a) * r];
  };
  const line = (p, q, w, color, alpha) => {
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(...p);
    g.lineTo(...q);
    g.stroke();
  };
  const tri = (a, b, c, color, alpha) => {
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(...a);
    g.lineTo(...b);
    g.lineTo(...c);
    g.closePath();
    g.fill();
  };
  g.fillStyle = "#0d1630";
  g.fillRect(0, 0, S, S);
  const grad = g.createRadialGradient(C, C, 20, C, C, R);
  grad.addColorStop(0, "#1a2d66");
  grad.addColorStop(1, "#2a4796");
  for (let k = 0; k < WING_N; k++) {
    tri([C, C], at(k, R), at(k + 1, R), "#1c2f6c", 1);
    g.globalAlpha = 1;
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(C, C);
    g.lineTo(...at(k, R - 4));
    g.lineTo(...at(k + 1, R - 4));
    g.closePath();
    g.fill();
    /* Cell grid: chords parallel to the outer edge, rays across the gore. */
    for (let j = 2; j < 14; j++) line(at(k, (R * j) / 14), at(k + 1, (R * j) / 14), 2, "#7d9be6", 0.32);
    for (let m = 1; m < 6; m++) {
      const [ax, ay] = at(k, R);
      const [bx, by] = at(k + 1, R);
      line([C, C], [ax + ((bx - ax) * m) / 6, ay + ((by - ay) * m) / 6], 1.5, "#0a1430", 0.7);
    }
    const mid = (k + 0.5) / WING_N;
    line(at(0, R * 0.42, mid * TAU), at(0, R * 0.97, mid * TAU), 3, "#f08a3c", 0.55);
  }
  for (let k = 0; k < WING_N; k++) {
    tri(at(k, R * 0.09, -9 * DEG), at(k, R * 0.09, 9 * DEG), at(k, R * 0.5), "#f0883a", 0.95);
    tri(at(k, R, -3.2 * DEG), at(k, R, 3.2 * DEG), at(k, R * 0.84), "#f0883a", 0.9);
    line([C, C], at(k, R), 7, "#e8843a", 1);
  }
  g.globalAlpha = 1;
  g.fillStyle = "#c86a2a";
  g.beginPath();
  g.arc(C, C, R * 0.1, 0, TAU);
  g.fill();
  g.strokeStyle = "#c9ced8";
  g.lineWidth = 7;
  g.beginPath();
  for (let k = 0; k <= WING_N; k++) g[k ? "lineTo" : "moveTo"](...at(k, R - 3));
  g.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* Gold wireframe of a wing (spars, edge, two rings) for the hologram. */
function wingLines(R) {
  const pts = [];
  const at = (k, r) => [Math.cos((k / WING_N) * TAU) * r, Math.sin((k / WING_N) * TAU) * r, 0.004];
  for (let k = 0; k < WING_N; k++) {
    pts.push(0, 0, 0.004, ...at(k, R));
    for (const r of [R, R * 0.66, R * 0.33]) pts.push(...at(k, r), ...at(k + 1, r));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

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

export function buildSatellite(ctx) {
  const low = ctx.quality.low;
  const g = new THREE.Group();
  const asm = new THREE.Group();
  asm.position.y = Y0;
  g.add(asm);

  /* Private materials so the hologram cross-fade never touches shared ones. */
  const hull = new THREE.MeshStandardMaterial({ color: 0xe6e8ec, metalness: 0.08, roughness: 0.5 });
  const seam = new THREE.MeshStandardMaterial({ color: 0xa9afb8, metalness: 0.5, roughness: 0.4 });
  const foil = new THREE.MeshStandardMaterial({ color: 0xd2d7de, metalness: 1, roughness: 0.16, flatShading: true });
  const steel = new THREE.MeshStandardMaterial({ color: 0x737a84, metalness: 0.92, roughness: 0.3, side: THREE.DoubleSide });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x23262c, metalness: 0.85, roughness: 0.38 });
  const lens = new THREE.MeshStandardMaterial({ color: 0x040507, metalness: 0.3, roughness: 0.06 });
  const wingTex = wingTexture();
  const wingFront = new THREE.MeshStandardMaterial({
    map: wingTex,
    emissiveMap: wingTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.22,
    metalness: 0.4,
    roughness: 0.36,
  });
  const wingBack = new THREE.MeshStandardMaterial({ color: 0x8d929b, metalness: 0.6, roughness: 0.45 });
  const accent = ctx.accent;
  const solids = [hull, seam, foil, steel, steelDark, lens, wingFront, wingBack, accent];

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

  const SEGS = low ? 32 : 56;
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 32);
  const cylLow = new THREE.CylinderGeometry(1, 1, 1, 12);
  const box = new THREE.BoxGeometry(1, 1, 1);

  /* ------------------------------ pedestal ----------------------------- */
  const base = new THREE.Group();
  g.add(base);
  base.add(ghost(solid(cyl, steelDark, 0, 0.15, 0, 1.28, 0.3, 1.28), holoMat("base", 0.5)));
  base.add(solid(cyl, steel, 0, 0.325, 0, 1.38, 0.035, 1.38));
  base.add(solid(ring(1.385, 0.014), accent, 0, 0.345, 0));
  base.add(solid(ring(0.42, 0.012), accent, 0, 0.346, 0));
  const NL = low ? 20 : 32;
  const baseLeds = new THREE.InstancedMesh(box, accent, NL);
  for (let i = 0; i < NL; i++) place(baseLeds, i, radial((i / NL) * TAU, 0), 1.285, 0.15, 0, 0.012, 0.05, 0.09);
  base.add(baseLeds);

  /* ------------------------------ token core --------------------------- */
  /* Hidden inside the hull until the modules separate. */
  const coreMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uLevel: { value: 0.4 }, uAlpha: { value: 1 }, uHolo: { value: 0 }, uGold: gold },
    vertexShader: BASIC_VERT,
    fragmentShader: CORE_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.2, 8, 40), coreMat);
  core.position.y = 0.15;
  core.renderOrder = 2;
  asm.add(core);
  const coreHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ctx.glow, color: 0xff7a30, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })
  );
  coreHalo.scale.set(1.6, 2.6, 1);
  coreHalo.position.y = 0.15;
  asm.add(coreHalo);

  /* --------------------------- service module -------------------------- */
  /* Foil-wrapped drum: body, end plate, rim rings. Stays put in the explode. */
  const SVC_R = 0.56;
  const SVC_TOP = -0.05;
  const SVC_BOT = -0.82;
  const svc = new THREE.Group();
  asm.add(svc);
  const svcGeo = crinkle(new THREE.CylinderGeometry(SVC_R, SVC_R, SVC_TOP - SVC_BOT, SEGS, low ? 6 : 10, true), 0.018, null);
  svc.add(ghost(solid(svcGeo, foil, 0, (SVC_TOP + SVC_BOT) / 2, 0), holoMat("bus", 0.6)));
  svc.add(solid(ring(SVC_R + 0.004, 0.018, SEGS), seam, 0, SVC_TOP, 0));
  svc.add(solid(ring(SVC_R + 0.01, 0.026, SEGS), steel, 0, SVC_BOT + 0.02, 0));
  /* Avionics boxes and handrails on the foil. */
  const NBX = 6;
  const svcBoxes = new THREE.InstancedMesh(box, steelDark, NBX);
  for (let i = 0; i < NBX; i++) {
    const a = ((i + 0.25) / NBX) * TAU;
    place(svcBoxes, i, radial(a, 0), SVC_R + 0.03, -0.52 + (i % 2) * 0.22, 0, 0.06, 0.12, 0.16);
  }
  svc.add(svcBoxes);

  /* ---------------------- interface ring (dock adapter) ---------------- */
  const iface = new THREE.Group();
  asm.add(iface);
  iface.add(ghost(solid(cyl, steelDark, 0, -0.01, 0, 0.54, 0.08, 0.54), holoMats.bus.mat));
  iface.add(solid(ring(0.545, 0.012, SEGS), accent, 0, -0.01, 0));

  /* ------------------------ pressurised cargo module ------------------- */
  const CARGO_R = 0.52;
  const cargo = new THREE.Group();
  asm.add(cargo);
  const cargoMat = holoMat("cargo", 0.8);
  cargo.add(ghost(solid(new THREE.CylinderGeometry(CARGO_R, CARGO_R, 1.02, SEGS, 1, true), hull, 0, 0.54, 0), cargoMat));
  const domeGeo = new THREE.SphereGeometry(CARGO_R, SEGS, 12, 0, TAU, 0, Math.PI / 2);
  domeGeo.scale(1, 0.42, 1);
  cargo.add(ghost(solid(domeGeo, hull, 0, 1.05, 0), cargoMat));
  for (const [y, t] of [[0.05, 0.02], [0.37, 0.009], [0.71, 0.009], [1.05, 0.016]]) {
    cargo.add(solid(ring(CARGO_R + 0.004, t, SEGS), seam, 0, y, 0));
  }
  /* Longitudinal stringers and a few grapple fixtures. */
  const NST = 8;
  const stringers = new THREE.InstancedMesh(box, seam, NST);
  for (let i = 0; i < NST; i++) place(stringers, i, radial(((i + 0.5) / NST) * TAU, 0), CARGO_R + 0.004, 0.54, 0, 0.008, 1.0, 0.02);
  cargo.add(stringers);
  const grapples = new THREE.InstancedMesh(box, steelDark, 3);
  for (let i = 0; i < 3; i++) place(grapples, i, radial((i / 3) * TAU + 0.3, 0), CARGO_R + 0.02, 0.86, 0, 0.04, 0.09, 0.09);
  cargo.add(grapples);
  /* Small S-band dish on a mast off the dome. */
  const dish = new THREE.Group();
  dish.position.set(-0.3, 1.12, -0.18);
  dish.add(solid(cylLow, steel, 0, 0.1, 0, 0.012, 0.2, 0.012));
  const dishGeo = new THREE.SphereGeometry(0.11, 20, 6, 0, TAU, 0, 0.9);
  const dishMesh = solid(dishGeo, steel, 0, 0.2, 0);
  dishMesh.rotation.set(Math.PI * 0.62, 0, 0.5);
  dish.add(dishMesh);
  cargo.add(dish);

  /* ----------------------------- berthing ring ------------------------- */
  const dock = new THREE.Group();
  asm.add(dock);
  dock.add(ghost(solid(cyl, steel, 0, 1.25, 0, 0.27, 0.1, 0.27), holoMat("dock", 0.95)));
  dock.add(solid(ring(0.272, 0.012, 48), accent, 0, 1.3, 0));
  dock.add(solid(cyl, steelDark, 0, 1.31, 0, 0.2, 0.02, 0.2));
  const petals = new THREE.InstancedMesh(box, steelDark, 8);
  for (let i = 0; i < 8; i++) place(petals, i, radial((i / 8) * TAU, 0), 0.25, 1.33, 0, 0.05, 0.05, 0.06);
  dock.add(petals);

  /* ------------------------ engine + RCS thrusters --------------------- */
  const prop = new THREE.Group();
  asm.add(prop);
  const plateGeo = crinkle(new THREE.RingGeometry(0.08, SVC_R, SEGS, 4), 0.012, new THREE.Vector3(0, 0, 1));
  plateGeo.rotateX(Math.PI / 2);
  prop.add(ghost(solid(plateGeo, foil, 0, SVC_BOT, 0), holoMats.bus.mat));
  const bellGeo = new THREE.LatheGeometry(
    [new THREE.Vector2(0.07, 0), new THREE.Vector2(0.09, -0.05), new THREE.Vector2(0.14, -0.15), new THREE.Vector2(0.19, -0.24)],
    32
  );
  const thrMat = holoMat("thrusters", 0.9);
  prop.add(ghost(solid(bellGeo, steel, 0, SVC_BOT, 0), thrMat));
  prop.add(solid(ring(0.19, 0.008, 32), accent, 0, SVC_BOT - 0.24, 0));
  const NR = 8;
  const RCS_R = 0.47;
  const rcs = ghost(new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.09, 10, 1, true), steel, NR), thrMat);
  const rcsGlowMat = new THREE.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const rcsGlow = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), rcsGlowMat, NR);
  const rcsPos = [];
  for (let i = 0; i < NR; i++) {
    const a = ((i + 0.5) / NR) * TAU;
    rcsPos.push([Math.cos(a) * RCS_R, Math.sin(a) * RCS_R]);
    place(rcs, i, null, rcsPos[i][0], SVC_BOT - 0.045, rcsPos[i][1], 1, 1, 1);
    place(rcsGlow, i, null, rcsPos[i][0], SVC_BOT - 0.1, rcsPos[i][1], 0.028, 0.05, 0.028);
  }
  prop.add(rcs, rcsGlow);
  const plumeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uPower: { value: 0 }, uHolo: { value: 0 }, uGold: gold },
    vertexShader: BASIC_VERT,
    fragmentShader: PLUME_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const PLUME_L = 0.3;
  const plume = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.05, PLUME_L, 24, 1, true), plumeMat);
  plume.position.y = SVC_BOT - 0.24 - PLUME_L / 2;
  plume.renderOrder = 2;
  prop.add(plume);
  const plumeGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ctx.glow, color: 0xff7a30, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })
  );
  plumeGlow.scale.set(1.1, 0.8, 1);
  plumeGlow.position.y = SVC_BOT - 0.3;
  prop.add(plumeGlow);

  /* ----------------------------- camera pods --------------------------- */
  const POD_ANG = [72 * DEG, 108 * DEG];
  const podMat = holoMat("pods", 0.7);
  const pods = POD_ANG.map((a, i) => {
    const pod = new THREE.Group();
    pod.rotation.y = -a;
    const body = new THREE.Group();
    body.position.y = i ? -0.26 : -0.58;
    body.add(ghost(solid(box, steelDark, SVC_R + 0.05, 0, 0, 0.12, 0.15, 0.15), podMat));
    const lensMesh = solid(cyl, lens, SVC_R + 0.13, 0, 0, 0.05, 0.06, 0.05);
    lensMesh.rotation.z = Math.PI / 2;
    body.add(lensMesh);
    const lensRing = solid(new THREE.TorusGeometry(0.055, 0.008, 6, 24), accent, SVC_R + 0.16, 0, 0);
    lensRing.rotation.y = Math.PI / 2;
    body.add(lensRing);
    pod.add(body);
    asm.add(pod);
    return body;
  });

  /* ------------------------------ solar wings -------------------------- */
  const WR = 0.86;
  const WING_Y = -0.45;
  const TILT = 28 * DEG;
  const discGeo = new THREE.CircleGeometry(WR, WING_N);
  const wingLineGeo = wingLines(WR);
  const wingLineMat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const wingGhost = holoMat("wings", 0.35);
  const boomMat = holoMat("booms", 0.7);
  const wings = [1, -1].map((s) => {
    const wing = new THREE.Group();
    const panel = new THREE.Group();
    panel.rotation.x = -Math.PI / 2 + TILT;
    wing.add(panel);
    panel.add(ghost(new THREE.Mesh(discGeo, wingFront), wingGhost));
    const back = new THREE.Mesh(discGeo, wingBack);
    back.rotation.y = Math.PI;
    back.position.z = -0.006;
    panel.add(back);
    panel.add(new THREE.Mesh(new THREE.TorusGeometry(WR, 0.012, 4, WING_N), steel));
    const hub = solid(cyl, steelDark, 0, 0, 0, 0.075, 0.07, 0.075);
    hub.rotation.x = Math.PI / 2;
    panel.add(hub);
    const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 6, 24), accent);
    hubRing.position.z = 0.02;
    panel.add(hubRing);
    const lines = new THREE.LineSegments(wingLineGeo, wingLineMat);
    lines.visible = false;
    panel.add(lines);
    ghosts.push(lines);
    /* Yoke and hinge where the boom meets the wing. */
    wing.add(ghost(solid(box, steelDark, -s * (WR + 0.05), 0, 0, 0.1, 0.06, 0.08), boomMat));
    const boom = ghost(solid(cyl, steel, 0, WING_Y, 0, 0.022, 1, 0.022), boomMat);
    boom.rotation.z = Math.PI / 2;
    asm.add(wing, boom);
    return { s, wing, boom };
  });
  const root = ghost(new THREE.Mesh(box, steelDark), boomMat);
  root.scale.set(SVC_R * 2 + 0.1, 0.08, 0.1);
  root.position.y = WING_Y;
  asm.add(root);

  /* Explode layout: modules slide apart along the body axis, wings and pods
     push outward. */
  function layout(ex) {
    cargo.position.y = 0.5 * ex;
    dock.position.y = 0.85 * ex;
    iface.position.y = 0.22 * ex;
    prop.position.y = -0.42 * ex;
    for (const p of pods) p.position.x = 0.35 * ex;
    const hubX = SVC_R + 0.12 + WR + 0.15 * ex;
    for (const w of wings) {
      w.wing.position.set(w.s * hubX, WING_Y, 0);
      /* The boom runs from the body right across the wing (it's the white
         spar visible on the real thing). */
      const x0 = SVC_R;
      const x1 = hubX + WR * 0.94;
      w.boom.scale.y = x1 - x0;
      w.boom.position.x = (w.s * (x0 + x1)) / 2;
    }
  }
  layout(0);

  /* ------------------------------ hologram ----------------------------- */
  const lineMat = (opacity) =>
    new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const SPH_R = 2.55;
  const sphere = new THREE.LineSegments(sphereLines(SPH_R, 18, 10, 32), lineMat(0));
  const scan = new THREE.LineLoop(circleGeo(1), lineMat(0));
  const hudMat = (map) =>
    new THREE.MeshBasicMaterial({ map, color: GOLD, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const dialTex = hudTexture("dial");
  const ringTex = hudTexture("ring");
  const floorDial = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 6.0), hudMat(dialTex));
  floorDial.rotation.x = -Math.PI / 2;
  floorDial.position.y = 0.04;
  const equator = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 6.6), hudMat(ringTex));
  equator.rotation.x = -Math.PI / 2;
  const gyro = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 5.8), hudMat(ringTex));
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

  /* Callouts: fixed around the hologram; leaders track the spinning parts.
     Each lists candidate anchor points (asm-local); the one nearest the
     label wins, so the leader never cuts across the body. */
  const CALLOUTS = [
    { n: "01", title: "TOKEN CORE", th: -12, r: 2.75, y: 0.45 },
    { n: "02", title: "ATTENTION ARRAYS", th: 162, r: 3.05, y: 0.75, mat: "wings" },
    { n: "03", title: "SCHEDULER DOCK", th: 40, r: 1.7, y: 2.15, mat: "dock" },
    { n: "04", title: "KV PAYLOAD", th: 128, r: 2.2, y: 1.55, mat: "cargo" },
    { n: "05", title: "PREFILL THRUSTERS", th: 62, r: 2.6, y: -1.25, mat: "thrusters" },
  ];
  const ring8 = (r, y, out, i0 = 0) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      out[i0 + i].set(Math.cos(a) * r, y, Math.sin(a) * r);
    }
    return 8;
  };
  const cand = Array.from({ length: 8 }, () => new THREE.Vector3());
  function candidates(i, ex) {
    if (i === 0) return ring8(0.25, 0.3, cand);
    if (i === 1) {
      const hubX = SVC_R + 0.12 + WR + 0.15 * ex;
      cand[0].set(hubX, WING_Y, 0);
      cand[1].set(-hubX, WING_Y, 0);
      return 2;
    }
    if (i === 2) {
      cand[0].set(0, 1.34 + 0.85 * ex, 0);
      return 1;
    }
    if (i === 3) return ring8(CARGO_R + 0.01, 0.62 + 0.5 * ex, cand);
    for (let j = 0; j < NR; j++) cand[j].set(rcsPos[j][0], SVC_BOT - 0.09 - 0.42 * ex, rcsPos[j][1]);
    return NR;
  }
  function anchorWorld(i, ex, target, out) {
    const n = candidates(i, ex);
    let best = Infinity;
    for (let j = 0; j < n; j++) {
      _v.copy(cand[j]).applyMatrix4(asm.matrix);
      const d = _v.distanceToSquared(target);
      if (d < best) {
        best = d;
        out.copy(_v);
      }
    }
    return out;
  }

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

  const proxies = [
    solid(cyl, new THREE.MeshBasicMaterial({ visible: false }), 0, 1.65, 0, 0.7, 3.2, 0.7),
    solid(box, new THREE.MeshBasicMaterial({ visible: false }), 0, Y0 + WING_Y, 0, 2 * (SVC_R + 0.12 + 2 * WR), 0.5, 2 * WR),
  ];

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

  function redrawCallouts(sim) {
    const kvUsed = Math.round(sim.kvFill * sim.kv.count);
    const beat = (sim.tokenPulse || 0) * 0.6 + 0.3;
    const subs = [
      [`${sim.phase} · CORE ${Math.round(sim.coreLevel * 100)}%`, sim.coreLevel],
      [`2 × ${WING_N} GORES · 24 HEADS`, 0.35 + sim.attnPulse * 0.65],
      [`BATCH CLOCK · TOKEN ${sim.tokenIndex}`, beat],
      [`${kvUsed}/${sim.kv.count} BLOCKS PAGED`, sim.kvFill],
      [`${NR} RCS · ${sim.prefillLevel > 0.15 ? "FIRING" : "STANDBY"}`, sim.prefillLevel],
    ];
    CALLOUTS.forEach((co, i) => {
      drawCallout(co.g, CW, CH, co.n, co.title, subs[i][0], subs[i][1], i === hot);
      co.tex.needsUpdate = true;
    });
  }

  return {
    group: g,
    proxies,
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
        _sphere.radius = SPH_R + 0.3;
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
        layout(ex);
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
      /* Station-keeping bob while it hovers over the pedestal. */
      asm.position.y = Y0 + Math.sin(t * 0.9) * 0.03 * sim.motion * (1 - hk);
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
      const intro = sim.intro.core;
      const emph = Math.min(1.3, c.emph);
      /* The core only shows once the hull opens up. */
      coreMat.uniforms.uLevel.value = level;
      coreMat.uniforms.uAlpha.value = intro * emph * ease(ex * 1.4) * (1 - 0.35 * hk) * (hot === 0 ? 1.7 : 1);
      coreMat.uniforms.uHolo.value = hk;
      coreHalo.material.opacity = (0.15 + level * 0.3) * intro * ex;
      const thrust = (0.45 + level * 0.4 + sim.prefillLevel * 0.35) * intro * emph * (1 - 0.5 * hk);
      plumeMat.uniforms.uPower.value = thrust * (hot === 4 ? 1.6 : 1);
      plumeMat.uniforms.uHolo.value = hk;
      plumeGlow.material.opacity = 0.3 * thrust;
      rcsGlowMat.opacity = clamp01(sim.prefillLevel * 1.4) * (0.6 + 0.4 * Math.sin(t * 31)) * intro;

      if (showHolo) {
        const hotMat = hot >= 0 ? CALLOUTS[hot].mat : null;
        for (const name in holoMats) {
          const h = holoMats[name];
          const lit = name === hotMat || (hotMat === "wings" && name === "booms");
          h.mat.uniforms.uOpacity.value = hk * h.base * (lit ? 2.2 : 1) * (0.9 + 0.1 * Math.sin(t * 17));
        }
        wingLineMat.opacity = 0.7 * hk * (hotMat === "wings" ? 1.5 : 1);
        sphere.material.opacity = 0.28 * hk;
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
          anchorWorld(i, ex, co.sprite.position, co.anchor);
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
