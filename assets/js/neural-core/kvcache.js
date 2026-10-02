/* ---------------------------------------------------------------------------
   Neural Compute Core — KV cache (memory)
   ---------------------------------------------------------------------------
   A KV cache "data centre" styled after raw_data/Futuristic KV Cache Data
   Center.png. Three projection pods (Q blue, K orange, V purple) feed glass
   fibre bundles into a dark cabinet. The cabinet's face is a wall of 40 glass
   blocks (sim.kv, 8 per row, one row per layer band), and a holographic
   KV CACHE / MEMORY sign sits on top.

   K and V flow into the cache. Q arcs over the cabinet into the attention
   tower on the right, which runs top to bottom: Q × Kᵀ → softmax → A × V.
   A five-step console in front (project → scores → softmax → weighted sum →
   output) lights up each stage in turn.

   Block colours follow the simulation: free blocks are dim glass, populated
   blocks are blue fading to purple down the layers, and blocks that were just
   written flash orange. Every decode re-read sweeps a scan column across the
   wall.

   Local frame: y = 0 is the deck and the front is +z. Everything fits
   between the chassis rim (left) and the prefill cluster (right).
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const TAU = Math.PI * 2;

const COL = {
  blue: new THREE.Color(0x2f8cff),
  cyan: new THREE.Color(0x5fd0ff),
  orange: new THREE.Color(0xff9a2e),
  purple: new THREE.Color(0x9b5cff),
  dim: new THREE.Color(0x0d1a2e),
};

const COLS = 8;
const ROWS = 5;
const PITCH_X = 0.17;
const PITCH_Y = 0.235;
const GRID_X0 = -0.8;
const GRID_Y0 = 1.42;
const FACE_Z = 0.2;
const LAYERS = ["LAYER 0", "LAYER 8", "LAYER 16", "LAYER 24", "LAYER 32"];

/* Attention tower (right) and pods (left). */
const TX = 0.93;
const TZ = 0.42;
const PX = -1.2;
const PZ = 0.28;
const POD_Y = { q: 1.55, k: 1.08, v: 0.61 };

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _w = new Float32Array(8);

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

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* Glass HUD panel background: dark navy glass, glowing border, corner ticks. */
function panelBg(g, W, H, glow) {
  g.clearRect(0, 0, W, H);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "rgba(10,22,44,0.92)");
  bg.addColorStop(1, "rgba(3,8,18,0.92)");
  g.fillStyle = bg;
  roundRect(g, 4, 4, W - 8, H - 8, 10);
  g.fill();
  g.shadowColor = glow;
  g.shadowBlur = 14;
  g.strokeStyle = glow;
  g.lineWidth = 3;
  roundRect(g, 4, 4, W - 8, H - 8, 10);
  g.stroke();
  g.shadowBlur = 0;
}

/* One cache block: glowing bezel, faint diagonal facets, bright core. The
   texture is white so instanceColor tints it per block. */
function tileTexture() {
  return canvasTex(128, 128, (g, W) => {
    g.clearRect(0, 0, W, W);
    const fill = g.createRadialGradient(64, 64, 4, 64, 64, 70);
    fill.addColorStop(0, "rgba(255,255,255,0.55)");
    fill.addColorStop(0.5, "rgba(255,255,255,0.12)");
    fill.addColorStop(1, "rgba(255,255,255,0.06)");
    g.fillStyle = fill;
    roundRect(g, 8, 8, 112, 112, 10);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.22)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(14, 14);
    g.lineTo(114, 114);
    g.moveTo(114, 14);
    g.lineTo(14, 114);
    g.stroke();
    g.shadowColor = "#fff";
    g.shadowBlur = 10;
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = 4;
    roundRect(g, 8, 8, 112, 112, 10);
    g.stroke();
    g.fillStyle = "#fff";
    g.fillRect(52, 52, 24, 24);
    g.shadowBlur = 0;
  });
}

function signTexture() {
  return canvasTex(512, 160, (g, W, H) => {
    panelBg(g, W, H, "#4fb4ff");
    g.fillStyle = "#4fb4ff";
    g.fillRect(14, 22, 6, H - 44);
    g.textAlign = "center";
    g.shadowColor = "#4fb4ff";
    g.shadowBlur = 18;
    g.fillStyle = "#bfe6ff";
    g.font = "700 64px 'Space Grotesk', Arial, sans-serif";
    g.fillText("KV CACHE", W / 2 + 8, 84);
    g.shadowBlur = 0;
    g.fillStyle = "rgba(200,225,255,0.75)";
    g.font = "500 22px 'Space Mono', monospace";
    g.fillText("M  E  M  O  R  Y", W / 2 + 8, 126);
  });
}

function layerTexture() {
  return canvasTex(128, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.font = "700 19px 'Space Mono', monospace";
    g.textBaseline = "middle";
    for (let r = 0; r < ROWS; r++) {
      const y = ((r + 0.5) / ROWS) * H;
      g.fillStyle = "rgba(140,190,255,0.85)";
      g.fillRect(4, y - 1, 12, 2);
      g.fillText(LAYERS[r], 22, y);
    }
  });
}

/* Projection pod face: big letter, label and a 3×3 weight grid. */
function podTexture(letter, label, hex) {
  return canvasTex(256, 320, (g, W, H) => {
    panelBg(g, W, H, hex);
    g.textAlign = "center";
    g.shadowColor = hex;
    g.shadowBlur = 20;
    g.fillStyle = "#ffffff";
    g.font = "700 120px 'Space Grotesk', Arial, sans-serif";
    g.fillText(letter, W / 2, 150);
    g.shadowBlur = 0;
    g.fillStyle = "rgba(230,240,255,0.85)";
    g.font = "500 30px 'Space Grotesk', Arial, sans-serif";
    g.fillText(label, W / 2, 200);
    g.globalAlpha = 0.85;
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 6; x++) {
        g.fillStyle = hex;
        g.globalAlpha = 0.25 + ((x * 7 + y * 3) % 5) * 0.15;
        g.fillRect(40 + x * 30, 230 + y * 24, 24, 18);
      }
    g.globalAlpha = 1;
  });
}

function tagTexture(text, hex, sub) {
  return canvasTex(256, 112, (g, W, H) => {
    panelBg(g, W, H, hex);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = hex;
    g.shadowBlur = 12;
    g.fillStyle = "#eef6ff";
    g.font = `700 ${sub ? 34 : 46}px 'Space Grotesk', Arial, sans-serif`;
    g.fillText(text, W / 2, sub ? 42 : H / 2 + 2);
    g.shadowBlur = 0;
    if (sub) {
      g.fillStyle = "rgba(200,220,255,0.7)";
      g.font = "500 20px 'Space Mono', monospace";
      g.fillText(sub, W / 2, 80);
    }
  });
}

/* Console step panels. Each draws a static mini-visual of its stage. */
const STEPS = [
  { title: "1. PROJECT", sub: "Input → Q, K, V", draw: "qkv" },
  { title: "2. SCORES", sub: "Q × Kᵀ", draw: "heat", hue: "#2f8cff" },
  { title: "3. SOFTMAX", sub: "Attention weights", draw: "heat", hue: "#5fd0ff" },
  { title: "4. WEIGHTED SUM", sub: "A × V", draw: "heat", hue: "#9b5cff" },
  { title: "5. OUTPUT", sub: "Context vectors", draw: "bars" },
];

function stepTexture(step, i) {
  return canvasTex(320, 220, (g, W, H) => {
    panelBg(g, W, H, "rgba(90,170,255,0.9)");
    g.fillStyle = "#e8f2ff";
    g.font = "700 24px 'Space Grotesk', Arial, sans-serif";
    g.fillText(step.title, 18, 40);
    g.fillStyle = "rgba(190,215,255,0.78)";
    g.font = "500 18px 'Space Mono', monospace";
    g.fillText(step.sub, 18, 68);
    const rnd = (a, b) => ((Math.sin(a * 12.9898 + b * 78.233 + i * 3.1) * 43758.5453) % 1 + 1) % 1;
    if (step.draw === "qkv") {
      ["#2f8cff", "#ff9a2e", "#9b5cff"].forEach((hex, n) => {
        for (let y = 0; y < 3; y++)
          for (let x = 0; x < 3; x++) {
            g.fillStyle = hex;
            g.globalAlpha = 0.35 + rnd(x + n, y) * 0.65;
            g.fillRect(26 + n * 96 + x * 22, 92 + y * 22, 19, 19);
          }
      });
      g.globalAlpha = 1;
      g.fillStyle = "rgba(220,230,255,0.85)";
      g.font = "500 17px 'Space Mono', monospace";
      ["X·Wq", "X·Wk", "X·Wv"].forEach((s, n) => g.fillText(s, 28 + n * 96, 186));
    } else if (step.draw === "heat") {
      const c = new THREE.Color(step.hue);
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 9; x++) {
          const v = 0.15 + rnd(x, y) * 0.85;
          g.fillStyle = `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${v})`;
          g.fillRect(22 + x * 28, 88 + y * 22, 25, 19);
        }
      const bar = g.createLinearGradient(0, 88, 0, 196);
      bar.addColorStop(0, "#ffd08a");
      bar.addColorStop(1, step.hue);
      g.fillStyle = bar;
      g.fillRect(282, 88, 10, 108);
    } else {
      for (let n = 0; n < 3; n++) {
        const y = 100 + n * 34;
        const grad = g.createLinearGradient(22, 0, 298, 0);
        grad.addColorStop(0, "#9b5cff");
        grad.addColorStop(1, "#d8b8ff");
        g.shadowColor = "#9b5cff";
        g.shadowBlur = 12;
        g.fillStyle = grad;
        roundRect(g, 22, y, 276, 12, 6);
        g.fill();
      }
      g.shadowBlur = 0;
    }
  });
}

function glowMat(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

function hudMat(map) {
  return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
}

function box(mat, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(x, y, z);
  return m;
}

function plane(mat, x, y, z, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  return m;
}

function curve(points) {
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.4);
}

export function buildKVCache(ctx) {
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

  /* --------------------------- plinth + cabinet --------------------------- */
  g.add(box(metalDark, -0.05, 0.05, 0.12, 2.5, 0.1, 1.15));
  const edgeBlue = glowMat(COL.blue, 0.9);
  const edgeOrange = glowMat(COL.orange, 0.9);
  g.add(box(edgeBlue, -0.05, 0.102, 0.695, 2.5, 0.008, 0.012));
  g.add(box(edgeOrange, -0.05, 0.03, 0.7, 2.3, 0.012, 0.01));

  g.add(box(metal, -0.05, 0.16, 0, 1.86, 0.12, 0.52));
  g.add(box(metal, -0.05, 0.94, -0.06, 1.76, 1.46, 0.4));
  g.add(box(metalDark, -0.12, 0.94, 0.15, 1.5, 1.34, 0.02));
  for (const x of [-0.94, 0.84]) {
    g.add(box(chrome, x, 0.94, 0.02, 0.05, 1.5, 0.46));
    g.add(box(edgeBlue, x + (x < 0 ? 0.03 : -0.03), 0.94, 0.25, 0.012, 1.1, 0.01));
  }
  g.add(box(chrome, -0.05, 1.69, 0.02, 1.84, 0.04, 0.46));
  const orangeStrip = box(glowMat(COL.orange, 1), -0.05, 0.23, 0.26, 1.4, 0.016, 0.01);
  g.add(orangeStrip);
  /* Coolant elbows running down into the deck. */
  const pipeMats = [glowMat(COL.blue, 0.35), glowMat(COL.orange, 0.35)];
  [-0.55, 0.35].forEach((x, n) => {
    const path = curve([[x, 0.2, 0.25], [x, 0.14, 0.45], [x + 0.12, 0.11, 0.62]]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 16, 0.035, 10), chrome));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 16, 0.045, 10), pipeMats[n]));
  });

  /* ------------------------------ block wall ----------------------------- */
  const count = COLS * ROWS;
  const bezels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.155, 0.2, 0.04), glass, count);
  const tileMat = new THREE.MeshBasicMaterial({
    map: tileTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.15, 0.195), tileMat, count);
  tiles.renderOrder = 2;
  const blockPos = [];
  for (let r = 0; r < ROWS; r++)
    for (let k = 0; k < COLS; k++) {
      /* Fill order matches the sim: top row left→right, then downward. */
      const i = r * COLS + k;
      const x = GRID_X0 + k * PITCH_X;
      const y = GRID_Y0 - r * PITCH_Y;
      blockPos.push([x, y]);
      _m.makeTranslation(x, y, FACE_Z - 0.03);
      bezels.setMatrixAt(i, _m);
      _m.makeTranslation(x, y, FACE_Z - 0.005);
      tiles.setMatrixAt(i, _m);
      tiles.setColorAt(i, COL.dim);
    }
  g.add(bezels, tiles);
  const layerLabels = plane(hudMat(layerTexture()), 0.66, 0.94, FACE_Z - 0.02, 0.22, 1.2);
  g.add(layerLabels);
  for (let r = 0; r < ROWS; r++) g.add(box(glowMat(COL.blue, 0.3), -0.2, GRID_Y0 - r * PITCH_Y - 0.115, FACE_Z - 0.04, 1.38, 0.004, 0.004));

  /* Scan column that sweeps across the wall on decode re-reads. */
  const scanMat = glowMat(COL.cyan, 0);
  const scan = plane(scanMat, GRID_X0, 0.94, FACE_Z + 0.01, 0.17, 1.24);
  g.add(scan);

  /* -------------------------------- sign --------------------------------- */
  const sign = new THREE.Group();
  sign.position.set(-0.05, 1.98, 0.08);
  sign.rotation.x = -0.12;
  sign.add(box(metal, 0, 0, -0.025, 0.98, 0.32, 0.03));
  sign.add(plane(hudMat(signTexture()), 0, 0, -0.008, 0.96, 0.3));
  sign.add(box(chrome, -0.32, -0.21, -0.03, 0.03, 0.14, 0.03));
  sign.add(box(chrome, 0.32, -0.21, -0.03, 0.03, 0.14, 0.03));
  g.add(sign);

  /* ------------------------------ Q/K/V pods ----------------------------- */
  const pods = {};
  const podDefs = [
    ["q", "Q", "Query", COL.blue, "#3d9bff"],
    ["k", "K", "Key", COL.orange, "#ff9a2e"],
    ["v", "V", "Value", COL.purple, "#a26bff"],
  ];
  for (const [id, letter, label, col, hex] of podDefs) {
    const pod = new THREE.Group();
    pod.position.set(PX, POD_Y[id], PZ);
    pod.rotation.y = 0.42;
    pod.add(box(metal, 0, 0, -0.06, 0.28, 0.36, 0.14));
    const face = plane(hudMat(podTexture(letter, label, hex)), 0, 0, 0.012, 0.26, 0.33);
    pod.add(face);
    /* Glass coupler where the fibres leave the pod. */
    const coupler = box(glowMat(col, 0.55), 0.17, 0, -0.04, 0.08, 0.24, 0.12);
    pod.add(coupler);
    pod.add(box(chrome, 0.215, 0, -0.04, 0.012, 0.28, 0.14));
    g.add(pod);
    pods[id] = { face, coupler, col };
  }
  g.add(box(chrome, PX - 0.02, 0.6, PZ - 0.1, 0.04, 1.2, 0.04));

  /* -------------------------- attention tower ---------------------------- */
  const tower = new THREE.Group();
  tower.position.set(TX, 0, TZ);
  tower.rotation.y = -0.38;
  tower.add(box(chrome, 0, 0.65, -0.1, 0.03, 1.3, 0.03));
  /* ⊗ node for Q × Kᵀ. */
  const mulRing = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 10, 40), glowMat(COL.orange, 1));
  mulRing.position.set(0, 1.62, 0);
  tower.add(mulRing);
  const mulCore = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), metalDark);
  mulCore.position.copy(mulRing.position);
  tower.add(mulCore);
  const cross = new THREE.Group();
  cross.position.copy(mulRing.position);
  cross.position.z += 0.062;
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const bar = box(glowMat(0xffffff, 0.95), 0, 0, 0, 0.085, 0.012, 0.004);
    bar.rotation.z = a;
    cross.add(bar);
  }
  tower.add(cross);
  const qkTag = plane(hudMat(tagTexture("Q × Kᵀ", "#ff9a2e")), 0, 1.86, 0, 0.26, 0.11);
  tower.add(qkTag);

  /* Softmax panel: live 5×5 weight grid. */
  tower.add(box(metal, 0, 1.13, -0.03, 0.34, 0.4, 0.03));
  tower.add(plane(hudMat(tagTexture("SOFTMAX", "#5fd0ff")), 0, 1.27, -0.012, 0.32, 0.1));
  const SM = 5;
  const smCells = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.044, 0.04), glowMat(0xffffff, 1), SM * SM);
  for (let y = 0; y < SM; y++)
    for (let x = 0; x < SM; x++) {
      _m.makeTranslation(-0.11 + x * 0.055, 1.17 - y * 0.05, -0.01);
      smCells.setMatrixAt(y * SM + x, _m);
      smCells.setColorAt(y * SM + x, COL.dim);
    }
  tower.add(smCells);

  /* A × V plate on a small purple-lit console. */
  tower.add(box(metal, 0, 0.32, -0.02, 0.32, 0.3, 0.2));
  const avGlow = box(glowMat(COL.purple, 0.8), 0, 0.165, 0.02, 0.36, 0.02, 0.24);
  tower.add(avGlow);
  tower.add(plane(hudMat(tagTexture("A × V", "#a26bff")), 0, 0.62, 0.0, 0.26, 0.11));
  const AV = 6;
  const avCells = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.036, 0.036), glowMat(0xffffff, 1), AV * 3);
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < AV; x++) {
      _m.makeTranslation(-0.115 + x * 0.046, 0.4 - y * 0.06, 0.081);
      avCells.setMatrixAt(y * AV + x, _m);
      avCells.setColorAt(y * AV + x, COL.dim);
    }
  tower.add(avCells);
  g.add(tower);
  tower.updateMatrix();

  /* Tower anchor points in cabinet space (so fibres can target them). */
  const towerPt = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(tower.matrix).toArray();
  const mulPt = towerPt(0, 1.62, 0);
  const smTop = towerPt(0.0, 1.34, -0.02);
  const smBot = towerPt(0.0, 0.92, -0.02);
  const avTop = towerPt(0.0, 0.48, 0.02);

  /* ------------------------------- fibres -------------------------------- */
  const streams = [];
  const sheathGeo = [];
  const addBundle = (key, col, paths, radius = 0.018) => {
    const sheath = glowMat(col, 0.22);
    const core = glowMat(col, 0.85);
    for (const pts of paths) {
      const cv = curve(pts);
      const seg = low ? 24 : 48;
      const sh = new THREE.Mesh(new THREE.TubeGeometry(cv, seg, radius, 8), sheath);
      const co = new THREE.Mesh(new THREE.TubeGeometry(cv, seg, radius * 0.32, 6), core);
      g.add(sh, co);
      sheathGeo.push(sh);
      streams.push({ key, curve: cv, col, phase: streams.length * 0.37 });
    }
    return { sheath, core };
  };
  const podExit = (id, dy) => [PX + 0.18, POD_Y[id] + dy, PZ + 0.04];
  const spreads = [-0.07, 0, 0.07];
  const fibres = {
    k: addBundle(
      "k",
      COL.orange,
      spreads.map((d) => [podExit("k", d), [PX + 0.34, POD_Y.k + d * 1.6, PZ - 0.02], [-0.98, 1.2 + d * 1.4, 0.05], [-0.92, 1.24 + d * 2.2, 0.0]])
    ),
    v: addBundle(
      "v",
      COL.purple,
      spreads.map((d) => [podExit("v", d), [PX + 0.34, POD_Y.v + d * 1.6, PZ - 0.02], [-0.98, 0.7 + d * 1.4, 0.05], [-0.92, 0.66 + d * 2.2, 0.0]])
    ),
    /* Q bypasses the cache: up and over the cabinet into the ⊗ node. */
    q: addBundle(
      "q",
      COL.blue,
      spreads.map((d) => [podExit("q", d), [-1.02, 2.05 + d, -0.05], [-0.1, 2.3 + d * 0.6, -0.22], [0.7, 2.05 + d * 0.6, 0.0], mulPt])
    ),
    /* Cached K into the scores, cached V into the weighted sum. */
    kOut: addBundle("kOut", COL.orange, [[[0.84, 1.3, 0.05], [0.9, 1.55, 0.2], mulPt]], 0.02),
    vOut: addBundle("vOut", COL.purple, [[[0.84, 0.55, 0.05], [0.9, 0.48, 0.28], avTop]], 0.02),
    /* Inside the tower: scores → softmax → A×V. */
    pipe: addBundle(
      "pipe",
      COL.cyan,
      [
        [mulPt, smTop],
        [smBot, avTop],
      ],
      0.012
    ),
  };

  /* Motes riding the fibres. */
  const MPS = low ? 5 : 9;
  const nMotes = streams.length * MPS;
  const motePos = new Float32Array(nMotes * 3);
  const moteCol = new Float32Array(nMotes * 3);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  moteGeo.setAttribute("color", new THREE.BufferAttribute(moteCol, 3));
  const moteMat = new THREE.PointsMaterial({
    size: 0.06,
    map: ctx.glow,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  motes.renderOrder = 3;
  g.add(motes);

  /* ----------------------------- step console ---------------------------- */
  const consoleG = new THREE.Group();
  consoleG.position.set(-0.17, 0.2, 0.66);
  consoleG.rotation.x = -1.0;
  const stepMats = [];
  STEPS.forEach((step, i) => {
    const mat = hudMat(stepTexture(step, i));
    mat.color.setScalar(0.6);
    stepMats.push(mat);
    consoleG.add(plane(mat, -0.76 + i * 0.38, 0, 0, 0.34, 0.234));
    if (i < STEPS.length - 1) {
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 3), glowMat(COL.cyan, 0.9));
      arrow.rotation.set(0, 0, -Math.PI / 2);
      arrow.position.set(-0.76 + i * 0.38 + 0.19, 0, 0.005);
      consoleG.add(arrow);
    }
  });
  const stepFrame = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.254), glowMat(COL.cyan, 0.0));
  stepFrame.position.z = -0.004;
  consoleG.add(stepFrame);
  g.add(consoleG);
  g.add(box(metal, -0.17, 0.12, 0.62, 1.98, 0.06, 0.26));

  /* Faint spill on the deck so the cabinet sits in its own glow. */
  const spill = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), glowMat(COL.blue, 0.1));
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(-0.05, 0.106, 0.2);
  spill.scale.set(1.1, 0.55, 1);
  g.add(spill);

  /* ------------------------------- update -------------------------------- */
  const cur = new Float32Array(count * 3);
  let flow = 0;
  let stepClock = 0;
  let scanX = 0;
  return {
    group: g,
    update(dt, t, sim, c) {
      const kv = sim.kv;
      const em = c.emph;
      const sel = c.selected ? 1 : 0;
      const read = kv.read || 0;
      const a = 1 - Math.exp(-dt * 8);
      scanX = (scanX + dt * (0.6 + read * 3)) % 1;
      const scanCol = Math.floor(scanX * COLS);

      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / COLS);
        const k = i % COLS;
        const st = i < kv.count ? kv.state[i] : 0;
        if (st === 0) _c.copy(COL.blue).multiplyScalar(0.2 + 0.04 * Math.sin(t * 1.7 + i));
        else if (st === 2) _c.copy(COL.orange).multiplyScalar(1.15);
        else {
          _c.copy(COL.blue).lerp(COL.purple, r / (ROWS - 1));
          const shimmer = 0.08 * Math.sin(t * 2.3 + i * 1.7);
          const sweep = k === scanCol ? read * 0.9 + 0.25 * sel : 0;
          _c.multiplyScalar(0.75 + shimmer + sweep + 0.25 * sel);
        }
        cur[i * 3] += (_c.r - cur[i * 3]) * a;
        cur[i * 3 + 1] += (_c.g - cur[i * 3 + 1]) * a;
        cur[i * 3 + 2] += (_c.b - cur[i * 3 + 2]) * a;
        tiles.setColorAt(i, _c.setRGB(cur[i * 3] * em, cur[i * 3 + 1] * em, cur[i * 3 + 2] * em));
      }
      tiles.instanceColor.needsUpdate = true;
      scan.position.x = GRID_X0 + scanCol * PITCH_X;
      scanMat.opacity = (0.06 + read * 0.25 + sel * 0.08) * em;

      /* Write traffic (K, V) follows prefill; read traffic follows decode. */
      const write = Math.min(1, 0.2 + (sim.prefillLevel || 0) * 1.2 + sel * 0.4);
      const readK = Math.min(1, 0.2 + (sim.decoding ? 0.55 : 0) + read * 0.6 + sel * 0.4);
      const level = { k: write, v: write, q: readK, kOut: readK, vOut: readK, pipe: readK };
      for (const key in fibres) {
        fibres[key].sheath.opacity = (0.12 + 0.18 * level[key]) * em;
        fibres[key].core.opacity = (0.3 + 0.6 * level[key]) * em;
      }
      for (const id in pods) {
        const kk = id === "q" ? readK : write;
        const pulse = 0.55 + 0.45 * Math.sin(t * 3 + POD_Y[id] * 4);
        pods[id].coupler.material.opacity = (0.25 + 0.5 * kk * pulse) * em;
        pods[id].face.material.color.setScalar(0.7 + 0.3 * kk * em);
      }

      flow += dt * (0.35 + 0.5 * Math.max(write, readK));
      let o = 0;
      for (const s of streams) {
        const lv = level[s.key];
        for (let m = 0; m < MPS; m++, o++) {
          const u = (flow * (s.key === "pipe" ? 1.6 : 1) + m / MPS + s.phase) % 1;
          s.curve.getPointAt(u, _p);
          motePos[o * 3] = _p.x;
          motePos[o * 3 + 1] = _p.y;
          motePos[o * 3 + 2] = _p.z;
          const b = (0.35 + lv * 1.1) * em * (0.6 + 0.4 * Math.sin(u * Math.PI));
          moteCol[o * 3] = s.col.r * b;
          moteCol[o * 3 + 1] = s.col.g * b;
          moteCol[o * 3 + 2] = s.col.b * b;
        }
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteGeo.attributes.color.needsUpdate = true;

      /* Attention tower. */
      const att = Math.min(1, readK + (sim.attnPulse || 0) * 0.5);
      mulRing.rotation.z = t * 0.8;
      mulRing.material.opacity = (0.5 + 0.5 * att) * em;
      for (let y = 0; y < SM; y++) {
        let sum = 0;
        for (let x = 0; x < SM; x++) sum += _w[x] = Math.exp(1.6 * Math.sin(t * 1.3 + x * 1.9 + y * 2.7));
        for (let x = 0; x < SM; x++) {
          const p = _w[x] / sum;
          _c.copy(COL.blue).lerp(COL.cyan, p).multiplyScalar((0.2 + p * 2.4 * att) * em);
          smCells.setColorAt(y * SM + x, _c);
        }
      }
      smCells.instanceColor.needsUpdate = true;
      for (let i = 0; i < AV * 3; i++) {
        const v = 0.5 + 0.5 * Math.sin(t * 2.1 + i * 0.9);
        avCells.setColorAt(i, _c.copy(COL.purple).multiplyScalar((0.25 + v * 1.3 * att) * em));
      }
      avCells.instanceColor.needsUpdate = true;
      avGlow.material.opacity = (0.35 + 0.45 * att) * em;

      /* Console: one stage at a time, faster while selected. */
      stepClock += dt * (0.7 + sel * 0.5);
      const active = Math.floor(stepClock) % STEPS.length;
      for (let i = 0; i < STEPS.length; i++) {
        const target = (i === active ? 1.15 : 0.55) * em;
        const mc = stepMats[i].color;
        mc.setScalar(mc.r + (target - mc.r) * a);
      }
      stepFrame.position.x = -0.76 + active * 0.38;
      stepFrame.material.opacity = (0.25 + 0.15 * Math.sin(t * 6)) * em;

      orangeStrip.material.opacity = (0.5 + 0.5 * write) * em;
      spill.material.opacity = (0.06 + 0.08 * sim.kvFill + 0.05 * sel) * em;
      c.activity = 0.5 + sim.kvFill * 0.8;
    },
  };
}
