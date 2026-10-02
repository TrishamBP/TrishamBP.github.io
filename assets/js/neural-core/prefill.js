/* ---------------------------------------------------------------------------
   Neural Compute Core — prefill stage (inference)
   ---------------------------------------------------------------------------
   The compute-bound counterpart to the decode tower (decode.js), in the same
   neon palette. Decode is one token per step re-reading memory; prefill is
   every prompt token at once saturating the tensor cores:

     · prompt rail   twelve token chips across the top. They arrive with the
                     request and all drop into the array together.
     · token lanes   one light lane per chip, all firing in the same pass.
     · core array    an 8 × 4 × 2 block of tensor-core cubes inside the glass.
                     During prefill the whole array flares at once, with a
                     diagonal sweep standing in for GEMM tiles.
     · heat fins     the back fins run hot orange while the cores are busy.
     · KV outlet     an orange line off the back of the −x side carries the burst of keys
                     and values toward the KV cache.
     · console       prompt tokens processed, chunked-prefill progress (four
                     chunks so decode is not starved) and tensor utilisation.

   Local frame: y = 0 is the deck and the front is +z. The footprint stays
   inside x ±0.82 so it clears the KV cache on the left.
   ------------------------------------------------------------------------ */

import * as THREE from "three";
import { canvasTex, panelBg, glowMat, hudMat, box, plane, curve } from "./kvcache.js";

const COL = {
  blue: new THREE.Color(0x2f8cff),
  cyan: new THREE.Color(0x5fd0ff),
  orange: new THREE.Color(0xff9a2e),
  amber: new THREE.Color(0xffc46b),
  dim: new THREE.Color(0x0d1a2e),
  white: new THREE.Color(0xffffff),
};

const AX = 8;
const AY = 4;
const AZ = 2;
const CPX = 0.16;
const CPY = 0.21;
const CPZ = 0.19;
const AY0 = 0.55;
const TOP = 1.46;
const TOKENS = 12;
const CHUNKS = 4;
const PASS = 2.0; // seconds of prefill in the sim (flows.js: 0.9 → 2.9)

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

/* Console canvas → local plane coordinates. */
const CW = 640;
const CH = 168;
const PW = 1.24;
const PH = (PW * CH) / CW;
const toLocal = (cx, cy) => [(cx / CW - 0.5) * PW, (0.5 - cy / CH) * PH];
const tokX = (k) => 24 + k * 30;
const chunkX = (k) => 410 + k * 52;

function consoleTexture() {
  return canvasTex(CW, CH, (g, W) => {
    panelBg(g, W, CH, "rgba(61,155,255,0.9)");
    g.fillStyle = "#e8f2ff";
    g.font = "700 24px 'Space Grotesk', Arial, sans-serif";
    g.fillText("PREFILL · ALL TOKENS / PASS", 22, 38);
    g.fillStyle = "#5fd0ff";
    g.font = "600 17px 'Space Mono', monospace";
    g.textAlign = "right";
    g.fillText("TTFT", W - 22, 38);
    g.textAlign = "left";
    g.fillStyle = "rgba(190,215,255,0.78)";
    g.font = "500 15px 'Space Mono', monospace";
    g.fillText("PROMPT TOKENS", 24, 66);
    g.fillText("CHUNKED PREFILL", 410, 66);
    g.fillText("TENSOR CORE UTIL", 24, 128);
    g.strokeStyle = "rgba(95,208,255,0.45)";
    g.lineWidth = 2;
    for (let k = 0; k < TOKENS; k++) g.strokeRect(tokX(k), 78, 24, 28);
    for (let k = 0; k < CHUNKS; k++) g.strokeRect(chunkX(k), 78, 44, 28);
    g.fillStyle = "rgba(61,155,255,0.16)";
    g.fillRect(200, 118, 412, 14);
  });
}

function signTexture() {
  return canvasTex(384, 120, (g, W, H) => {
    panelBg(g, W, H, "#4fb4ff");
    g.textAlign = "center";
    g.shadowColor = "#4fb4ff";
    g.shadowBlur = 16;
    g.fillStyle = "#d6eeff";
    g.font = "700 46px 'Space Grotesk', Arial, sans-serif";
    g.fillText("PREFILL", W / 2, 58);
    g.shadowBlur = 0;
    g.fillStyle = "rgba(200,225,255,0.8)";
    g.font = "500 18px 'Space Mono', monospace";
    g.fillText("C O M P U T E - B O U N D", W / 2, 94);
  });
}

export function buildPrefill(ctx) {
  const low = ctx.quality && ctx.quality.low;
  const g = new THREE.Group();

  const metal = new THREE.MeshStandardMaterial({ color: 0x14171c, metalness: 0.85, roughness: 0.35 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x07080a, metalness: 0.6, roughness: 0.5 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0x9aa3ae, metalness: 1, roughness: 0.22 });
  const pane = new THREE.MeshBasicMaterial({
    color: 0x3d9bff,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  /* No depth write, so the additive cores behind its faces still draw. */
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0b1626,
    metalness: 0.3,
    roughness: 0.15,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const edgeBlue = glowMat(COL.blue, 0.9);

  /* ------------------------------ plinth -------------------------------- */
  g.add(box(metalDark, 0, 0.05, 0.04, 1.64, 0.1, 0.98));
  g.add(box(edgeBlue, 0, 0.102, 0.532, 1.64, 0.008, 0.012));
  g.add(box(glowMat(COL.orange, 0.9), 0, 0.03, 0.536, 1.5, 0.012, 0.01));
  g.add(box(metal, 0, 0.2, 0, 1.5, 0.2, 0.74));
  g.add(box(glowMat(COL.blue, 0.7), 0, 0.2, 0.372, 1.3, 0.012, 0.004));

  /* ---------------------------- glass block ----------------------------- */
  const W = 1.44;
  const D = 0.62;
  const H = TOP - 0.3;
  const CY = 0.3 + H / 2;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) g.add(box(chrome, (sx * W) / 2, CY, (sz * D) / 2, 0.04, H, 0.04));
  for (const sx of [-1, 1]) g.add(box(edgeBlue, sx * (W / 2 - 0.025), CY, D / 2 + 0.024, 0.006, H - 0.06, 0.004));
  for (const y of [0.32, TOP]) {
    for (const sz of [-1, 1]) g.add(box(chrome, 0, y, (sz * D) / 2, W, 0.03, 0.04));
    for (const sx of [-1, 1]) g.add(box(chrome, (sx * W) / 2, y, 0, 0.04, 0.03, D));
  }
  g.add(box(edgeBlue, 0, TOP - 0.03, D / 2 + 0.024, W - 0.06, 0.006, 0.004));
  for (const [x, z, ry, w] of [[0, D / 2, 0, W], [-W / 2, 0, Math.PI / 2, D], [W / 2, 0, Math.PI / 2, D]]) {
    const p = plane(pane, x, CY, z, w - 0.04, H - 0.04);
    p.rotation.y = ry;
    g.add(p);
  }
  /* Dark back wall, with heat fins behind it. */
  g.add(box(metal, 0, CY, -D / 2 + 0.01, W - 0.04, H - 0.04, 0.02));
  const FINS = 15;
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, H - 0.16, 0.12), chrome, FINS);
  const heat = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, H - 0.2, 0.004), glowMat(COL.white, 1), FINS - 1);
  for (let i = 0; i < FINS; i++) {
    const x = -W / 2 + 0.08 + (i * (W - 0.16)) / (FINS - 1);
    _m.makeTranslation(x, CY, -D / 2 - 0.06);
    fins.setMatrixAt(i, _m);
    if (i < FINS - 1) {
      _m.makeTranslation(x + (W - 0.16) / (FINS - 1) / 2, CY, -D / 2 - 0.012);
      heat.setMatrixAt(i, _m);
      heat.setColorAt(i, COL.dim);
    }
  }
  g.add(fins, heat);

  /* ---------------------------- core array ------------------------------ */
  const NC = AX * AY * AZ;
  const shells = new THREE.InstancedMesh(new THREE.BoxGeometry(0.115, 0.15, 0.13), glass, NC);
  const cores = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.1, 0.08), glowMat(COL.white, 1), NC);
  cores.renderOrder = 2;
  const cell = [];
  for (let z = 0; z < AZ; z++)
    for (let y = 0; y < AY; y++)
      for (let x = 0; x < AX; x++) {
        const i = cell.length;
        _m.makeTranslation((x - (AX - 1) / 2) * CPX, AY0 + y * CPY, (z - (AZ - 1) / 2) * CPZ);
        shells.setMatrixAt(i, _m);
        cores.setMatrixAt(i, _m);
        cores.setColorAt(i, COL.dim);
        cell.push([x, y, z]);
      }
  g.add(shells, cores);
  /* Bus bars between array rows. */
  for (let y = 0; y < AY - 1; y++)
    g.add(box(glowMat(COL.blue, 0.35), 0, AY0 + (y + 0.5) * CPY, D / 2 - 0.08, W - 0.2, 0.004, 0.004));

  /* ---------------------- prompt rail + token lanes --------------------- */
  g.add(box(metal, 0, TOP + 0.04, 0, W + 0.04, 0.05, D + 0.04));
  g.add(box(chrome, 0, TOP + 0.09, 0.12, W - 0.1, 0.03, 0.05));
  g.add(box(edgeBlue, 0, TOP + 0.066, D / 2 + 0.021, W - 0.06, 0.006, 0.004));
  const TX = (k) => (k - (TOKENS - 1) / 2) * 0.105;
  const chips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.05, 0.075), glowMat(COL.white, 1), TOKENS);
  chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const lanes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 1, 0.008), glowMat(COL.white, 1), TOKENS);
  lanes.renderOrder = 2;
  const laneH = TOP - AY0 + 0.04;
  for (let k = 0; k < TOKENS; k++) {
    _m.makeScale(1, laneH, 1).setPosition(TX(k), AY0 - 0.06 + laneH / 2, 0.12);
    lanes.setMatrixAt(k, _m);
    lanes.setColorAt(k, COL.dim);
    chips.setColorAt(k, COL.dim);
  }
  g.add(chips, lanes);

  /* ----------------------------- KV outlet ------------------------------ */
  const outCurve = curve([
    [-W / 2 - 0.02, 0.95, -0.12],
    [-W / 2 - 0.08, 0.9, -0.16],
    [-0.8, 0.5, -0.22],
    [-0.79, 0.16, -0.3],
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(outCurve, 24, 0.03, 10), chrome));
  const outGlow = glowMat(COL.orange, 0.35);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(outCurve, 24, 0.04, 10), outGlow));
  const coupler = box(glowMat(COL.orange, 0.6), -W / 2 - 0.005, 0.95, -0.12, 0.03, 0.12, 0.12);
  g.add(coupler);
  const MOTES = low ? 6 : 10;
  const motePos = new Float32Array(MOTES * 3);
  const moteCol = new Float32Array(MOTES * 3);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  moteGeo.setAttribute("color", new THREE.BufferAttribute(moteCol, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      size: 0.07,
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

  /* -------------------------------- sign -------------------------------- */
  const sign = new THREE.Group();
  sign.position.set(0, TOP + 0.4, -0.2);
  sign.rotation.x = -0.12;
  sign.add(box(metal, 0, 0, -0.02, 0.6, 0.19, 0.025));
  sign.add(plane(hudMat(signTexture()), 0, 0, -0.006, 0.585, 0.183));
  for (const x of [-0.2, 0.2]) sign.add(box(chrome, x, -0.2, -0.02, 0.02, 0.22, 0.02));
  g.add(sign);

  /* ------------------------------ console ------------------------------- */
  const con = new THREE.Group();
  con.position.set(0, 0.17, 0.46);
  con.rotation.x = -1.0;
  const conMat = hudMat(consoleTexture());
  con.add(plane(conMat, 0, 0, 0, PW, PH));
  g.add(con);
  const NCELL = TOKENS + CHUNKS + 1;
  const cells = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMat(COL.white, 1), NCELL);
  cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cells.position.z = 0.003;
  const px = PW / CW;
  for (let k = 0; k < TOKENS; k++) {
    const [x, y] = toLocal(tokX(k) + 12, 92);
    _m.makeScale(18 * px, 22 * px, 1).setPosition(x, y, 0);
    cells.setMatrixAt(k, _m);
    cells.setColorAt(k, COL.dim);
  }
  for (let k = 0; k < CHUNKS; k++) {
    const [x, y] = toLocal(chunkX(k) + 22, 92);
    _m.makeScale(38 * px, 22 * px, 1).setPosition(x, y, 0);
    cells.setMatrixAt(TOKENS + k, _m);
    cells.setColorAt(TOKENS + k, COL.dim);
  }
  const [utilX0, utilY] = toLocal(200, 125);
  const UTIL_W = 412 * px;
  con.add(cells);

  const spill = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40), glowMat(COL.blue, 0.1));
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0, 0.106, 0.05);
  spill.scale.set(1.15, 0.7, 1);
  g.add(spill);

  /* ------------------------------- update ------------------------------- */
  const cur = new Float32Array(NC * 3);
  let pass = 0; // seconds into the current prefill pass
  let arrive = 0; // prompt chips settling onto the rail
  let flow = 0;
  let util = 0;

  return {
    group: g,
    update(dt, t, sim, c) {
      const em = c.emph;
      const sel = c.selected ? 1 : 0;
      const a = 1 - Math.exp(-dt * 10);
      const pre = sim.prefillLevel || 0;
      const req = sim.requestPulse || 0;
      const on = pre > 0.5;
      pass = on ? Math.min(PASS, pass + dt) : sim.decoding ? PASS : 0;
      const prog = pass / PASS;
      /* Chips arrive with the request and leave once the pass is done. */
      const want = on || req > 0.2 ? 1 : 0;
      arrive += (want - arrive) * (1 - Math.exp(-dt * 6));

      /* Prompt rail: every chip lit; they all drop together during a pass. */
      for (let k = 0; k < TOKENS; k++) {
        const drop = on ? 0.02 * Math.sin(t * 22 + k) : 0;
        _m.makeScale(1, 0.4 + 0.6 * arrive, 1).setPosition(TX(k), TOP + 0.13 + (1 - arrive) * 0.12 + drop, 0.12);
        chips.setMatrixAt(k, _m);
        _c.copy(COL.blue).lerp(COL.cyan, pre).multiplyScalar((0.15 + 0.9 * arrive + 0.6 * pre) * em);
        chips.setColorAt(k, _c);
        const f = 0.75 + 0.25 * Math.sin(t * 30 + k * 2.3);
        lanes.setColorAt(k, _c.copy(COL.cyan).multiplyScalar((0.04 + pre * 1.3 * f + 0.08 * sel) * em));
      }
      chips.instanceMatrix.needsUpdate = true;
      chips.instanceColor.needsUpdate = true;
      lanes.instanceColor.needsUpdate = true;

      /* Core array: all cubes flare at once, with a diagonal GEMM sweep. */
      const sweep = (sim.attnSweep || 0) * 0.5;
      for (let i = 0; i < NC; i++) {
        const [x, y, z] = cell[i];
        const d = ((x + y * 2 + z * 3) * 0.12 - sweep) % 1;
        const e = ((d + 1) % 1) - 0.5;
        const tile = Math.exp(-(e * e) / 0.02);
        const idle = 0.12 + 0.04 * Math.sin(t * 1.3 + i);
        const k = idle + pre * (0.55 + 0.6 * tile) + 0.08 * sel;
        _c.copy(COL.blue).lerp(COL.cyan, pre * 0.6).lerp(COL.white, pre * tile * 0.35).multiplyScalar(k);
        cur[i * 3] += (_c.r - cur[i * 3]) * a;
        cur[i * 3 + 1] += (_c.g - cur[i * 3 + 1]) * a;
        cur[i * 3 + 2] += (_c.b - cur[i * 3 + 2]) * a;
        cores.setColorAt(i, _c.setRGB(cur[i * 3] * em, cur[i * 3 + 1] * em, cur[i * 3 + 2] * em));
      }
      cores.instanceColor.needsUpdate = true;

      /* Fins heat up under load and cool slowly. */
      util += (Math.min(1, pre + (sim.decoding ? 0.2 : 0.05)) - util) * (1 - Math.exp(-dt * (pre > util ? 5 : 1.2)));
      for (let i = 0; i < FINS - 1; i++) {
        const f = 0.85 + 0.15 * Math.sin(t * 3 + i * 1.1);
        heat.setColorAt(i, _c.copy(COL.orange).lerp(COL.amber, util * 0.4).multiplyScalar((0.06 + util * 0.9 * f) * em));
      }
      heat.instanceColor.needsUpdate = true;

      /* KV burst out of the −x side. */
      flow += dt * (0.3 + pre * 1.4);
      for (let m = 0; m < MOTES; m++) {
        const u = (flow + m / MOTES) % 1;
        outCurve.getPointAt(u, _p);
        motePos[m * 3] = _p.x;
        motePos[m * 3 + 1] = _p.y;
        motePos[m * 3 + 2] = _p.z;
        const b = (0.1 + pre * 1.2) * em * Math.sin(u * Math.PI);
        moteCol[m * 3] = COL.orange.r * b;
        moteCol[m * 3 + 1] = COL.orange.g * b;
        moteCol[m * 3 + 2] = COL.orange.b * b;
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteGeo.attributes.color.needsUpdate = true;
      outGlow.opacity = (0.15 + 0.45 * pre) * em;
      coupler.material.opacity = (0.3 + 0.6 * pre) * em;

      /* Console. */
      const pulse = on ? 0.8 + 0.2 * Math.sin(t * 18) : 1;
      for (let k = 0; k < TOKENS; k++) {
        const lit = prog > 0 || arrive > 0.5;
        const col = prog >= 1 ? COL.cyan : on ? COL.amber : COL.blue;
        const kk = lit ? (prog >= 1 ? 0.6 : on ? 1.1 * pulse : 0.45 * arrive) : 0;
        cells.setColorAt(k, kk ? _c.copy(col).multiplyScalar(kk * em) : COL.dim);
      }
      const chunk = Math.min(CHUNKS, Math.floor(prog * CHUNKS + 1e-6));
      for (let k = 0; k < CHUNKS; k++) {
        const kk = k < chunk ? 0.65 : k === chunk && on ? 1.2 * pulse : 0;
        cells.setColorAt(TOKENS + k, kk ? _c.copy(k < chunk ? COL.cyan : COL.amber).multiplyScalar(kk * em) : COL.dim);
      }
      const uw = Math.max(1e-4, UTIL_W * Math.max(0.03, util));
      _m.makeScale(uw, 10 * px, 1).setPosition(utilX0 + uw / 2, utilY, 0);
      cells.setMatrixAt(NCELL - 1, _m);
      cells.setColorAt(NCELL - 1, _c.copy(COL.cyan).lerp(COL.amber, util).multiplyScalar((0.6 + 0.6 * util) * em));
      cells.instanceMatrix.needsUpdate = true;
      cells.instanceColor.needsUpdate = true;
      conMat.color.setScalar((0.8 + 0.2 * sel) * em);

      spill.material.opacity = (0.05 + 0.09 * pre) * em;
      c.activity = 0.4 + pre * 1.4;
    },
  };
}
