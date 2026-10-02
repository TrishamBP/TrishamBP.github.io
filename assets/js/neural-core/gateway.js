/* ---------------------------------------------------------------------------
   Neural Compute Core — model serving gateway (inference)
   ---------------------------------------------------------------------------
   A glass-walled serving chassis styled after raw_data/Neon Model Serving
   Gateway.png. Requests enter through the port on the left and run through
   six stages before the tokens stream back out of the right-hand port:

     1. request intake      tokenize · batch · route
     2. KV cache lookup     prefix hits light cyan, misses stay dim
     3. prefill / attention glass ring chamber, Q × Kᵀ → softmax → A × V
     4. model execution     a 3×3×3 cube whose layers twist like a puzzle
     5. KV cache update     orange blocks follow the live KV write state
     6. response streaming  flashes on every decoded token

   Fibre lanes carry motes the whole length; they run blue at the ends and
   turn orange through the compute stages. A tilted console in front plots
   routing, batching, GPU load, KV memory and tokens/s from the simulation.

   Local frame: y = 0 is the deck, the front is +z and the request path runs
   −x → +x. The body stays low so it never hides the spacecraft behind it.
   ------------------------------------------------------------------------ */

import * as THREE from "three";
import { canvasTex, roundRect, panelBg, tileTexture, glowMat, hudMat, box, plane, curve } from "./kvcache.js";

const COL = {
  blue: new THREE.Color(0x2f8cff),
  cyan: new THREE.Color(0x5fd0ff),
  orange: new THREE.Color(0xff9a2e),
  amber: new THREE.Color(0xffc46b),
  dim: new THREE.Color(0x0d1a2e),
  white: new THREE.Color(0xffffff),
};

const N = 6;
const PITCH = 0.47;
const X0 = -((N - 1) / 2) * PITCH;
const MY = 0.42; // module centre height
const FRONT = 0.31; // glass front
const BACK = -0.28;
const X = Array.from({ length: N }, (_, i) => X0 + i * PITCH);

const STAGES = [
  ["1. REQUEST INTAKE", "Tokenize · Batch · Route"],
  ["2. KV CACHE LOOKUP", "Hit · Miss · Load"],
  ["3. PREFILL / ATTENTION", "Q × Kᵀ → Softmax → A × V"],
  ["4. MODEL EXECUTION", "vLLM | SGLang | TensorRT-LLM"],
  ["5. KV CACHE UPDATE", "Write · Evict · Compress"],
  ["6. RESPONSE STREAMING", "Decode · Stream · Return"],
];

const METRICS = ["ROUTING", "BATCHING", "GPU INFERENCE", "KV CACHE MEMORY", "TOKENS / SEC"];

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

const hash = (n) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

/* --------------------------------- art ---------------------------------- */

function signTexture() {
  return canvasTex(640, 170, (g, W, H) => {
    panelBg(g, W, H, "#4fb4ff");
    g.strokeStyle = "rgba(79,180,255,0.9)";
    g.lineWidth = 3;
    for (const [x, y, dx, dy] of [[14, 14, 1, 1], [W - 14, 14, -1, 1], [14, H - 14, 1, -1], [W - 14, H - 14, -1, -1]]) {
      g.beginPath();
      g.moveTo(x, y + dy * 22);
      g.lineTo(x, y);
      g.lineTo(x + dx * 22, y);
      g.stroke();
    }
    g.shadowColor = "#4fb4ff";
    g.shadowBlur = 18;
    g.fillStyle = "#d6eeff";
    g.font = "700 52px 'Space Grotesk', Arial, sans-serif";
    g.fillText("Model Serving Gateway", 40, 80, W - 80);
    g.shadowBlur = 0;
    g.fillStyle = "rgba(79,180,255,0.55)";
    g.fillRect(40, 100, W - 80, 2);
    g.fillStyle = "rgba(200,225,255,0.8)";
    g.font = "500 24px 'Space Mono', monospace";
    g.fillText("I N F E R E N C E", 40, 140);
  });
}

function labelTexture(title, sub) {
  return canvasTex(400, 116, (g, W, H) => {
    panelBg(g, W, H, "#3d9bff");
    g.textAlign = "center";
    g.shadowColor = "#3d9bff";
    g.shadowBlur = 10;
    g.fillStyle = "#eaf4ff";
    g.font = "700 31px 'Space Grotesk', Arial, sans-serif";
    g.fillText(title, W / 2, 50, W - 30);
    g.shadowBlur = 0;
    g.fillStyle = "#5fd0ff";
    g.font = "500 21px 'Space Mono', monospace";
    g.fillText(sub, W / 2, 88, W - 30);
  });
}

/* Line-art icons for the intake and streaming stages. */
function iconTexture(kind) {
  return canvasTex(160, 160, (g, W) => {
    g.clearRect(0, 0, W, W);
    g.strokeStyle = "#7cc8ff";
    g.shadowColor = "#3d9bff";
    g.shadowBlur = 12;
    g.lineWidth = 6;
    g.lineJoin = "round";
    if (kind === "docs") {
      for (let k = 2; k >= 0; k--) {
        g.fillStyle = "rgba(4,12,26,0.95)";
        roundRect(g, 34 + k * 14, 26 + k * 14, 64, 82, 8);
        g.fill();
        g.stroke();
      }
      g.lineWidth = 5;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(76, 84 + k * 14);
        g.lineTo(112, 84 + k * 14);
        g.stroke();
      }
    } else {
      g.fillStyle = "rgba(4,12,26,0.95)";
      roundRect(g, 54, 26, 82, 60, 10);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(34, 60);
      g.lineTo(108, 60);
      g.arcTo(118, 60, 118, 70, 10);
      g.lineTo(118, 110);
      g.arcTo(118, 120, 108, 120, 10);
      g.lineTo(62, 120);
      g.lineTo(42, 138);
      g.lineTo(44, 120);
      g.arcTo(24, 120, 24, 110, 10);
      g.lineTo(24, 70);
      g.arcTo(24, 60, 34, 60, 10);
      g.closePath();
      g.fill();
      g.stroke();
      g.lineWidth = 5;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(40, 78 + k * 14);
        g.lineTo(102 - k * 14, 78 + k * 14);
        g.stroke();
      }
    }
  });
}

/* Console panel: icon on the left, title and empty chart tracks on the
   right. The live bars and sparkline are geometry laid over the tracks. */
const CW = 448;
const CH = 136;
const PW = 0.56;
const PH = 0.17;
const toLocal = (cx, cy) => [(cx / CW - 0.5) * PW, (0.5 - cy / CH) * PH];

function metricTexture(title, i) {
  return canvasTex(CW, CH, (g, W, H) => {
    panelBg(g, W, H, "rgba(61,155,255,0.9)");
    g.fillStyle = "#e8f2ff";
    g.font = "700 22px 'Space Grotesk', Arial, sans-serif";
    g.fillText(title, 140, 40);
    g.strokeStyle = "#7cc8ff";
    g.fillStyle = "#7cc8ff";
    g.shadowColor = "#3d9bff";
    g.shadowBlur = 10;
    g.lineWidth = 5;
    const cx = 70;
    const cy = 72;
    g.beginPath();
    if (i === 0) {
      for (const [x, y] of [[cx, cy - 26], [cx - 26, cy + 22], [cx + 26, cy + 22]]) {
        g.moveTo(x + 9, y);
        g.arc(x, y, 9, 0, Math.PI * 2);
      }
      g.moveTo(cx, cy - 17);
      g.lineTo(cx, cy);
      g.lineTo(cx - 20, cy + 14);
      g.moveTo(cx, cy);
      g.lineTo(cx + 20, cy + 14);
    } else if (i === 1) {
      for (let k = 0; k < 3; k++) {
        roundRect(g, cx - 28, cy - 30 + k * 21, 56, 15, 4);
      }
    } else if (i === 2) {
      roundRect(g, cx - 22, cy - 22, 44, 44, 6);
      for (let k = -1; k <= 1; k++) {
        g.moveTo(cx + k * 12, cy - 22);
        g.lineTo(cx + k * 12, cy - 32);
        g.moveTo(cx + k * 12, cy + 22);
        g.lineTo(cx + k * 12, cy + 32);
        g.moveTo(cx - 22, cy + k * 12);
        g.lineTo(cx - 32, cy + k * 12);
        g.moveTo(cx + 22, cy + k * 12);
        g.lineTo(cx + 32, cy + k * 12);
      }
    } else if (i === 3) {
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) roundRect(g, cx - 28 + x * 20, cy - 28 + y * 20, 15, 15, 3);
    } else {
      g.moveTo(cx + 8, cy - 32);
      g.lineTo(cx - 14, cy + 4);
      g.lineTo(cx + 2, cy + 4);
      g.lineTo(cx - 8, cy + 32);
      g.lineTo(cx + 16, cy - 6);
      g.lineTo(cx, cy - 6);
      g.closePath();
    }
    g.stroke();
    g.shadowBlur = 0;
    /* Chart tracks. */
    g.fillStyle = "rgba(61,155,255,0.16)";
    if (i === 0 || i === 1 || i === 3) for (let k = 0; k < 3; k++) g.fillRect(140, 62 + k * 20, 280, 8);
    else {
      g.fillRect(140, 118, 280, 2);
      for (let k = 0; k < 4; k++) g.fillRect(140, 60 + k * 19, 280, 1);
    }
  });
}

/* -------------------------------- build --------------------------------- */

export function buildGateway(ctx) {
  const low = ctx.quality && ctx.quality.low;
  const g = new THREE.Group();

  const metal = new THREE.MeshStandardMaterial({ color: 0x14171c, metalness: 0.85, roughness: 0.35 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x07080a, metalness: 0.6, roughness: 0.5 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0x9aa3ae, metalness: 1, roughness: 0.22 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0b1626,
    metalness: 0.3,
    roughness: 0.15,
    transparent: true,
    opacity: 0.55,
  });
  /* Glass that glowing parts sit inside: no depth write, so the additive
     cores behind its faces still draw. */
  const glassSeeThru = glass.clone();
  glassSeeThru.opacity = 0.35;
  glassSeeThru.depthWrite = false;
  const pane = new THREE.MeshBasicMaterial({
    color: 0x3d9bff,
    transparent: true,
    opacity: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const edgeBlue = glowMat(COL.blue, 0.9);
  const edgeOrange = glowMat(COL.orange, 0.9);

  /* ------------------------------ chassis ------------------------------- */
  g.add(box(metalDark, 0, 0.04, 0.1, 3.24, 0.08, 1.06));
  g.add(box(edgeBlue, 0, 0.082, 0.632, 3.24, 0.008, 0.012));
  g.add(box(edgeOrange, 0, 0.02, 0.636, 3.0, 0.012, 0.01));
  g.add(box(metal, 0, 0.11, 0.01, 3.04, 0.06, 0.62));
  g.add(box(metal, 0, 0.5, BACK, 3.04, 0.78, 0.04));
  g.add(box(metalDark, 0, 0.5, BACK + 0.022, 2.92, 0.66, 0.005));
  const backGlow = box(glowMat(COL.blue, 0.8), 0, 0.82, BACK + 0.026, 2.9, 0.01, 0.004);
  g.add(backGlow);
  g.add(box(glowMat(COL.orange, 0.6), 0, 0.17, BACK + 0.026, 2.9, 0.006, 0.004));
  /* Glass front and roof, framed in chrome with glowing seams. */
  const front = plane(pane, 0, 0.5, FRONT, 3.0, 0.76);
  g.add(front);
  const roof = plane(pane, 0, 0.885, 0.015, 3.0, 0.58);
  roof.rotation.x = -Math.PI / 2;
  g.add(roof);
  for (const [y, z] of [[0.89, FRONT], [0.89, BACK], [0.14, FRONT]]) g.add(box(chrome, 0, y, z, 3.06, 0.03, 0.03));
  g.add(box(edgeBlue, 0, 0.872, FRONT + 0.016, 3.0, 0.006, 0.004));
  g.add(box(edgeBlue, 0, 0.158, FRONT + 0.016, 3.0, 0.006, 0.004));
  for (const sx of [-1, 1]) {
    const x = sx * 1.53;
    g.add(box(metal, x, 0.5, 0.015, 0.07, 0.8, 0.64));
    for (const z of [FRONT, BACK]) g.add(box(chrome, x, 0.5, z, 0.045, 0.82, 0.045));
    g.add(box(edgeBlue, x - sx * 0.04, 0.5, FRONT + 0.02, 0.006, 0.7, 0.004));
    g.add(box(edgeBlue, x + sx * 0.037, 0.5, 0.015, 0.004, 0.66, 0.5));
    /* Pipe port: chrome sleeve with a glowing collar. */
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.24, 24), chrome);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.set(x + sx * 0.13, MY, 0.0);
    g.add(sleeve);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 32), glowMat(COL.cyan, 0.9));
    collar.rotation.y = Math.PI / 2;
    collar.position.set(x + sx * 0.25, MY, 0.0);
    g.add(collar);
  }
  /* Thin dividers between stages, each with a faint glowing edge. */
  for (let i = 0; i < N - 1; i++) {
    const x = (X[i] + X[i + 1]) / 2;
    g.add(box(metal, x, 0.5, BACK + 0.06, 0.02, 0.7, 0.08));
    g.add(box(glowMat(COL.blue, 0.35), x, 0.5, BACK + 0.102, 0.004, 0.6, 0.004));
  }

  /* ---------------------------- stage labels ---------------------------- */
  const labelMats = [];
  STAGES.forEach(([title, sub], i) => {
    const mat = hudMat(labelTexture(title, sub));
    mat.color.setScalar(0.75);
    labelMats.push(mat);
    g.add(plane(mat, X[i], 0.77, FRONT - 0.03, 0.43, 0.125));
  });

  /* ------------------------------- sign --------------------------------- */
  const sign = new THREE.Group();
  sign.position.set(0.72, 1.06, -0.04);
  sign.rotation.x = -0.18;
  sign.add(box(metal, 0, 0, -0.022, 1.05, 0.29, 0.03));
  sign.add(plane(hudMat(signTexture()), 0, 0, -0.005, 1.03, 0.274));
  sign.add(box(edgeBlue, 0, -0.152, -0.01, 1.0, 0.008, 0.008));
  for (const x of [-0.38, 0.38]) sign.add(box(chrome, x, -0.17, -0.03, 0.028, 0.1, 0.028));
  g.add(sign);

  /* ------------------------------ pedestals ----------------------------- */
  for (const x of X) {
    g.add(box(metal, x, 0.19, 0, 0.36, 0.1, 0.36));
    g.add(box(glowMat(COL.blue, 0.5), x, 0.242, 0.181, 0.3, 0.005, 0.004));
  }

  /* ----------------------------- fibre lanes ---------------------------- */
  const LANES = 5;
  const lanes = [];
  const sheath = glowMat(COL.blue, 0.2);
  const core = glowMat(COL.cyan, 0.7);
  const hot = glowMat(COL.orange, 0.7);
  for (let l = 0; l < LANES; l++) {
    const d = (l - (LANES - 1) / 2) * 0.034;
    const pts = [
      [-2.25, MY - 0.2 + d * 3, 0.32 + d * 2],
      [-1.95, MY + d * 1.5, 0.12 + d],
      [-1.62, MY + d * 0.7, d * 0.7],
    ];
    for (const x of X) pts.push([x, MY + d * 0.8 + Math.sin(x * 4 + l) * 0.012, d * 0.8]);
    pts.push([1.62, MY + d * 0.7, d * 0.7], [1.95, MY + d * 1.5, 0.12 + d], [2.25, MY - 0.2 + d * 3, 0.32 + d * 2]);
    const cv = curve(pts);
    const seg = low ? 60 : 140;
    g.add(new THREE.Mesh(new THREE.TubeGeometry(cv, seg, 0.011, 6), sheath));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(cv, seg, 0.0035, 4), l % 2 ? hot : core));
    lanes.push({ curve: cv, phase: hash(l + 1) });
  }
  /* Glowing couplers between stages: blue at the ends, orange in the
     compute stages, like the beams in the reference image. */
  const couplers = [];
  for (let i = 0; i < N - 1; i++) {
    const col = i >= 1 && i <= 3 ? COL.orange : COL.blue;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 16, 1, true), glowMat(col, 0.35));
    m.rotation.z = Math.PI / 2;
    m.position.set((X[i] + X[i + 1]) / 2, MY, 0);
    g.add(m);
    couplers.push(m);
    for (const s of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 6, 24), chrome);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(m.position.x + s * 0.065, MY, 0);
      g.add(ring);
    }
  }

  const MPL = low ? 14 : 26;
  const nMotes = LANES * MPL;
  const motePos = new Float32Array(nMotes * 3);
  const moteCol = new Float32Array(nMotes * 3);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  moteGeo.setAttribute("color", new THREE.BufferAttribute(moteCol, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      size: 0.055,
      map: ctx.glow,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  motes.frustumCulled = false;
  motes.renderOrder = 3;
  g.add(motes);

  /* ---------------------- 1 · 6: intake and streaming -------------------- */
  const icons = [];
  for (const [i, kind] of [[0, "docs"], [5, "chat"]]) {
    g.add(box(metalDark, X[i], MY, -0.01, 0.28, 0.3, 0.26));
    g.add(box(chrome, X[i], MY, 0.125, 0.3, 0.32, 0.012));
    g.add(box(metalDark, X[i], MY, 0.13, 0.26, 0.28, 0.006));
    const mat = hudMat(iconTexture(kind));
    g.add(plane(mat, X[i], MY, 0.136, 0.24, 0.24));
    const frame = box(glowMat(COL.cyan, 0.4), X[i], MY + 0.158, 0.13, 0.26, 0.006, 0.006);
    g.add(frame);
    icons.push({ mat, frame });
  }

  /* -------------------- 2 · 5: KV lookup and KV update ------------------- */
  const tileMat = new THREE.MeshBasicMaterial({
    map: tileTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const GRID = 4;
  const CELL = 0.068;
  const PER = GRID * GRID * 2; // front face + top face
  const makeCube = (x) => {
    g.add(box(metalDark, x, MY, 0, 0.29, 0.29, 0.29));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) g.add(box(chrome, x + sx * 0.148, MY, sz * 0.148, 0.014, 0.3, 0.014));
    const bez = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL * 0.92, CELL * 0.92, 0.012), glass, PER);
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(CELL * 0.9, CELL * 0.9), tileMat, PER);
    tiles.renderOrder = 2;
    for (let f = 0; f < 2; f++)
      for (let r = 0; r < GRID; r++)
        for (let k = 0; k < GRID; k++) {
          const i = f * GRID * GRID + r * GRID + k;
          const u = (k - 1.5) * CELL;
          const v = (1.5 - r) * CELL;
          if (f === 0) {
            _p.set(x + u, MY + v, 0.15);
            _e.set(0, 0, 0);
          } else {
            _p.set(x + u, MY + 0.15, -v);
            _e.set(-Math.PI / 2, 0, 0);
          }
          _q.setFromEuler(_e);
          _m.compose(_p, _q, _s.set(1, 1, 1));
          tiles.setMatrixAt(i, _m);
          _p.addScaledVector(f === 0 ? _s.set(0, 0, -1) : _s.set(0, -1, 0), 0.008);
          _m.compose(_p, _q, _s.set(1, 1, 1));
          bez.setMatrixAt(i, _m);
          tiles.setColorAt(i, COL.dim);
        }
    g.add(bez, tiles);
    return { tiles, cur: new Float32Array(PER * 3) };
  };
  const lookup = makeCube(X[1]);
  const update = makeCube(X[4]);

  /* ------------------------ 3: prefill / attention ----------------------- */
  const cx3 = X[2];
  const chamber = new THREE.Group();
  chamber.position.set(cx3, MY, 0);
  g.add(chamber);
  chamber.add(box(glassSeeThru, 0, 0, 0, 0.34, 0.28, 0.26));
  for (const sy of [-1, 1])
    for (const sz of [-1, 1]) chamber.add(box(chrome, 0, sy * 0.145, sz * 0.135, 0.36, 0.014, 0.014));
  const ringMats = [];
  for (const sx of [-1, 1]) {
    chamber.add(box(metal, sx * 0.18, 0, 0, 0.03, 0.3, 0.28));
    for (const [r, tube] of [[0.11, 0.012], [0.075, 0.008]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 40), glowMat(COL.cyan, 0.8));
      ring.rotation.y = Math.PI / 2;
      ring.position.x = sx * 0.2;
      chamber.add(ring);
      ringMats.push(ring.material);
    }
  }
  const BARS = 12;
  const beams = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.24, 0.006), glowMat(COL.white, 1), BARS);
  for (let b = 0; b < BARS; b++) {
    const a = (b / BARS) * Math.PI * 2;
    _m.makeTranslation(Math.cos(a) * 0.045 * (1 + (b % 3) * 0.4), 0, Math.sin(a) * 0.05);
    beams.setMatrixAt(b, _m);
    beams.setColorAt(b, COL.blue);
  }
  beams.renderOrder = 2;
  chamber.add(beams);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.006, 6, 48), glowMat(COL.orange, 0.9));
  orbit.rotation.x = Math.PI / 2 - 0.25;
  chamber.add(orbit);
  const orbit2 = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.004, 6, 48), glowMat(COL.amber, 0.7));
  orbit2.rotation.x = Math.PI / 2 + 0.3;
  chamber.add(orbit2);

  /* --------------------------- 4: model execution ------------------------ */
  const cube = new THREE.Group();
  cube.position.set(X[3], MY + 0.005, 0.0);
  cube.rotation.set(0.32, -0.62, 0);
  g.add(cube);
  const CUB = 0.078;
  const CP = 0.087;
  const layers = [];
  for (let ly = 0; ly < 3; ly++) {
    const layer = new THREE.Group();
    layer.position.y = (ly - 1) * CP;
    cube.add(layer);
    const shells = new THREE.InstancedMesh(new THREE.BoxGeometry(CUB, CUB, CUB), glassSeeThru, 9);
    const cores = new THREE.InstancedMesh(new THREE.BoxGeometry(CUB * 0.62, CUB * 0.62, CUB * 0.62), glowMat(COL.white, 1), 9);
    for (let n = 0; n < 9; n++) {
      _m.makeTranslation(((n % 3) - 1) * CP, 0, (Math.floor(n / 3) - 1) * CP);
      shells.setMatrixAt(n, _m);
      cores.setMatrixAt(n, _m);
      cores.setColorAt(n, COL.blue);
    }
    cores.renderOrder = 2;
    layer.add(shells, cores);
    layers.push({ layer, cores });
  }
  cube.add(box(chrome, 0, -0.15, 0, 0.3, 0.012, 0.3));

  /* ------------------------------- console ------------------------------ */
  const con = new THREE.Group();
  con.position.set(0, 0.14, 0.47);
  con.rotation.x = -1.05;
  g.add(con);
  g.add(box(metal, 0, 0.1, 0.46, 3.04, 0.05, 0.22));
  const PX = METRICS.map((_, i) => (i - 2) * 0.59);
  const metricMats = METRICS.map((title, i) => {
    const mat = hudMat(metricTexture(title, i));
    mat.color.setScalar(0.85);
    con.add(plane(mat, PX[i], 0, 0, PW, PH));
    return mat;
  });
  /* Horizontal bars (routing, batching, KV memory) and GPU columns. */
  const HB = [0, 1, 3];
  const GPU_BARS = 14;
  const nBars = HB.length * 3 + GPU_BARS;
  const bars = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMat(COL.white, 1), nBars);
  bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bars.position.z = 0.003;
  con.add(bars);
  const [bx0] = toLocal(140, 0);
  const [bx1] = toLocal(420, 0);
  const BAR_W = bx1 - bx0;
  const hbY = [0, 1, 2].map((k) => toLocal(0, 66 + k * 20)[1]);
  const [, base] = toLocal(0, 118);
  const [, top] = toLocal(0, 56);
  const setBar = (i, x, y, w, h) => {
    _m.makeScale(Math.max(w, 1e-4), Math.max(h, 1e-4), 1);
    _m.setPosition(x, y, 0);
    bars.setMatrixAt(i, _m);
  };
  for (let i = 0; i < nBars; i++) setBar(i, 0, 0, 0, 0);
  /* Tokens/s sparkline. */
  const SP = 16;
  const sparkPos = new Float32Array(SP * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.LineBasicMaterial({ color: COL.cyan.clone(), transparent: true, toneMapped: false });
  const spark = new THREE.Line(sparkGeo, sparkMat);
  spark.position.set(PX[4], 0, 0.004);
  spark.frustumCulled = false;
  con.add(spark);
  const tokHist = new Float32Array(SP);

  /* Deck spill and orange floor strips in front of the chassis. */
  const spill = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), glowMat(COL.blue, 0.1));
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0, 0.006, 0.15);
  spill.scale.set(1.9, 0.6, 1);
  g.add(spill);
  for (const x of [-1.0, 1.0]) g.add(box(glowMat(COL.orange, 0.45), x, 0.006, 0.95, 0.012, 0.004, 0.6));

  /* ------------------------------- update ------------------------------- */
  let flow = 0;
  let twistClock = 0;
  let twistLayer = 0;
  let lookupEpoch = 0;
  let lastReq = 0;
  let sparkClock = 0;
  const a8 = (dt) => 1 - Math.exp(-dt * 8);
  const tintTiles = (cube, i, col, k, a, em) => {
    const cur = cube.cur;
    cur[i * 3] += (col.r * k - cur[i * 3]) * a;
    cur[i * 3 + 1] += (col.g * k - cur[i * 3 + 1]) * a;
    cur[i * 3 + 2] += (col.b * k - cur[i * 3 + 2]) * a;
    cube.tiles.setColorAt(i, _c.setRGB(cur[i * 3] * em, cur[i * 3 + 1] * em, cur[i * 3 + 2] * em));
  };

  return {
    group: g,
    update(dt, t, sim, c) {
      const em = c.emph;
      const sel = c.selected ? 1 : 0;
      const a = a8(dt);
      const req = sim.requestPulse || 0;
      const tok = sim.decoding ? sim.tokenPulse : 0;
      const pre = sim.prefillLevel || 0;
      const busy = Math.min(1, 0.25 + req * 0.6 + pre * 0.6 + (sim.decoding ? 0.45 : 0) + sel * 0.3);

      /* Motes: blue at the ports, orange through stages 3–5. */
      flow += dt * (0.08 + 0.12 * busy);
      let o = 0;
      for (const lane of lanes) {
        for (let m = 0; m < MPL; m++, o++) {
          const u = (flow + m / MPL + lane.phase) % 1;
          lane.curve.getPointAt(u, _p);
          motePos[o * 3] = _p.x;
          motePos[o * 3 + 1] = _p.y;
          motePos[o * 3 + 2] = _p.z;
          const w = Math.max(0, 1 - Math.abs(_p.x - X[3]) / 0.75);
          _c.copy(COL.blue).lerp(COL.orange, Math.min(1, w * 1.4));
          const b = (0.45 + busy * 0.9) * em * (0.55 + 0.45 * Math.sin(u * Math.PI));
          moteCol[o * 3] = _c.r * b;
          moteCol[o * 3 + 1] = _c.g * b;
          moteCol[o * 3 + 2] = _c.b * b;
        }
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteGeo.attributes.color.needsUpdate = true;
      sheath.opacity = (0.12 + 0.16 * busy) * em;
      core.opacity = hot.opacity = (0.35 + 0.5 * busy) * em;
      for (let i = 0; i < couplers.length; i++)
        couplers[i].material.opacity = (0.22 + 0.3 * busy + 0.15 * Math.sin(t * 4 - i)) * em;

      /* Stage activity: which stage is "doing" the current phase. */
      const stage = [req, req * 0.6 + pre * 0.5, pre + (sim.attnPulse || 0) * 0.4, Math.max(pre, sim.decoding ? 0.7 : 0), pre * 0.6 + tok, tok];
      for (let i = 0; i < N; i++) {
        const target = (0.62 + 0.55 * Math.min(1, stage[i]) + 0.15 * sel) * em;
        const mc = labelMats[i].color;
        mc.setScalar(mc.r + (target - mc.r) * a);
      }

      /* 1 · 6: icons. */
      icons[0].mat.color.setScalar((0.65 + 0.7 * req + 0.15 * sel) * em);
      icons[0].frame.material.opacity = (0.25 + 0.75 * req) * em;
      icons[1].mat.color.setScalar((0.65 + 0.7 * tok + 0.15 * sel) * em);
      icons[1].frame.material.opacity = (0.25 + 0.75 * tok) * em;

      /* 2: prefix lookup — a fresh hit pattern per request. */
      if (req > 0.9 && lastReq <= 0.9) lookupEpoch++;
      lastReq = req;
      for (let i = 0; i < PER; i++) {
        const h = hash(i * 7.13 + lookupEpoch * 31.7);
        const hit = h < 0.55;
        const k = hit ? 0.7 + 0.5 * req + 0.2 * Math.sin(t * 2.2 + i) + 0.2 * sel : 0.18 + 0.05 * Math.sin(t * 1.4 + i);
        tintTiles(lookup, i, hit ? COL.cyan : COL.blue, k, a, em);
      }
      lookup.tiles.instanceColor.needsUpdate = true;

      /* 5: KV writes, mirrored from the live cache state. */
      const kv = sim.kv;
      for (let i = 0; i < PER; i++) {
        const j = i % kv.count;
        const st = j < kv.count ? kv.state[j] : 0;
        const col = st === 2 ? COL.amber : st === 1 ? COL.orange : COL.blue;
        const k = st === 2 ? 1.3 : st === 1 ? 0.7 + 0.12 * Math.sin(t * 2 + i) + 0.2 * sel : 0.16;
        tintTiles(update, i, col, k, a, em);
      }
      update.tiles.instanceColor.needsUpdate = true;

      /* 3: attention chamber. */
      const att = Math.min(1, pre + (sim.attnPulse || 0) * 0.6 + sel * 0.3);
      orbit.rotation.z = t * (0.8 + att * 2.5);
      orbit2.rotation.z = -t * (0.6 + att * 2);
      orbit.material.opacity = (0.45 + 0.55 * att) * em;
      orbit2.material.opacity = (0.3 + 0.5 * att) * em;
      for (let i = 0; i < ringMats.length; i++) ringMats[i].opacity = (0.4 + 0.5 * att + 0.1 * Math.sin(t * 5 + i)) * em;
      for (let b = 0; b < BARS; b++) {
        const f = 0.5 + 0.5 * Math.sin(t * (9 + b) + b * 2.1);
        beams.setColorAt(b, _c.copy(COL.blue).lerp(COL.cyan, f).multiplyScalar((0.25 + att * 1.4 * f) * em));
      }
      beams.instanceColor.needsUpdate = true;

      /* 4: model execution — one layer twists at a time. */
      twistClock += dt * (0.55 + 0.5 * busy + 0.6 * sel);
      if (twistClock >= 1) {
        twistClock -= 1;
        layers[twistLayer].layer.rotation.y = 0;
        twistLayer = (twistLayer + 1) % 3;
      }
      const tw = Math.min(1, twistClock / 0.45);
      layers[twistLayer].layer.rotation.y = (twistLayer === 1 ? -1 : 1) * ease(tw) * (Math.PI / 2);
      const exe = Math.max(sim.gpuLoad || 0, sim.decoding ? 0.55 : 0.2);
      for (let ly = 0; ly < 3; ly++) {
        const cores = layers[ly].cores;
        for (let n = 0; n < 9; n++) {
          const f = 0.5 + 0.5 * Math.sin(t * (2.4 + exe * 5) + n * 1.7 + ly * 2.3);
          const col = (n + ly) % 4 === 0 ? COL.white : COL.cyan;
          _c.copy(COL.blue).lerp(col, f * 0.7).multiplyScalar((0.35 + exe * 1.1 * f + 0.2 * sel) * em);
          cores.setColorAt(n, _c);
        }
        cores.instanceColor.needsUpdate = true;
      }

      /* Console. */
      let b = 0;
      const vals = [
        [0.35 + req * 0.6, 0.5 + 0.2 * Math.sin(t * 1.3), 0.3 + 0.15 * Math.sin(t * 0.9 + 1)],
        [sim.decoding ? 0.85 : 0.3 + pre * 0.5, 0.45 + 0.2 * Math.sin(t * 1.7 + 2), 0.25 + 0.3 * busy],
        [sim.kvFill, Math.min(1, sim.kvFill * 0.7 + 0.1), 0.2 + (kv.read || 0) * 0.6],
      ];
      for (let h = 0; h < HB.length; h++) {
        for (let k = 0; k < 3; k++, b++) {
          const v = Math.min(1, Math.max(0.03, vals[h][k]));
          setBar(b, PX[HB[h]] + bx0 + (BAR_W * v) / 2, hbY[k], BAR_W * v, 0.0095);
          bars.setColorAt(b, _c.copy(k === 0 ? COL.cyan : COL.blue).multiplyScalar((0.6 + 0.6 * v) * em));
        }
      }
      const hist = sim.history[0];
      const hn = hist.length;
      const gw = BAR_W / GPU_BARS;
      for (let k = 0; k < GPU_BARS; k++, b++) {
        const s = hist[(sim.history.head + 1 + Math.floor((k / GPU_BARS) * hn)) % hn];
        const v = Math.max(0.05, s * (0.75 + 0.25 * Math.sin(t * 6 + k * 1.9)));
        const h = v * (top - base);
        setBar(b, PX[2] + bx0 + gw * (k + 0.5), base + h / 2, gw * 0.62, h);
        bars.setColorAt(b, _c.copy(COL.blue).lerp(COL.cyan, v).multiplyScalar((0.5 + 0.8 * v) * em));
      }
      bars.instanceMatrix.needsUpdate = true;
      bars.instanceColor.needsUpdate = true;

      sparkClock += dt;
      if (sparkClock > 0.2) {
        sparkClock = 0;
        tokHist.copyWithin(0, 1);
        tokHist[SP - 1] = sim.decoding ? 0.55 + 0.3 * Math.random() : 0.08 + 0.06 * Math.random();
      }
      for (let k = 0; k < SP; k++) {
        sparkPos[k * 3] = bx0 + (BAR_W * k) / (SP - 1);
        sparkPos[k * 3 + 1] = base + tokHist[k] * (top - base);
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkMat.opacity = Math.min(1, 0.9 * em);
      for (const mat of metricMats) mat.color.setScalar((0.8 + 0.2 * sel) * em);

      backGlow.material.opacity = (0.5 + 0.4 * busy) * em;
      pane.opacity = 0.04 + 0.03 * sel;
      spill.material.opacity = (0.05 + 0.07 * busy) * em;
      c.activity = 0.6 + req * 0.8 + tok * 0.4;
    },
  };
}
