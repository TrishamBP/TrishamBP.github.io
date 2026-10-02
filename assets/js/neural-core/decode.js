/* ---------------------------------------------------------------------------
   Neural Compute Core — decode stage (inference)
   ---------------------------------------------------------------------------
   A glass decode tower in the gateway's neon palette. It is built to show
   why decode is memory-bandwidth-bound:

     · KV stack     ten slabs (K orange, V purple) inside the glass column.
                    Every generated token sends a read wave up the whole
                    stack, because each step re-reads the cache from HBM.
     · query beam   a cyan core through the slabs, lit while decoding.
     · emitter      the ring on top flashes and launches one token per step.
     · HBM meter    a bandwidth bar on the +x face, pinned high in decode.
     · console      a token register (one slot per step) and four batch
                    lanes that advance together and refill on completion,
                    which is continuous batching.

   Local frame: y = 0 is the deck and the front is +z. The footprint stays
   inside ±0.45 so it clears the satellite wings and the embedding engine.
   ------------------------------------------------------------------------ */

import * as THREE from "three";
import { canvasTex, panelBg, glowMat, hudMat, box, plane } from "./kvcache.js";

const COL = {
  blue: new THREE.Color(0x2f8cff),
  cyan: new THREE.Color(0x5fd0ff),
  orange: new THREE.Color(0xff9a2e),
  amber: new THREE.Color(0xffc46b),
  purple: new THREE.Color(0x9b5cff),
  dim: new THREE.Color(0x0d1a2e),
  white: new THREE.Color(0xffffff),
};

const SLABS = 10;
const SLAB_Y0 = 0.46;
const SLAB_DY = 0.112;
const TOP = 1.74;
const SLOTS = 6;
const LANES = 4;
const STEPS = 8;

const _m = new THREE.Matrix4();
const _c = new THREE.Color();

/* Console canvas → local plane coordinates. */
const CW = 512;
const CH = 168;
const PW = 0.74;
const PH = (PW * CH) / CW;
const toLocal = (cx, cy) => [(cx / CW - 0.5) * PW, (0.5 - cy / CH) * PH];
const slotX = (k) => 24 + k * 40;
const laneY = (j) => 78 + j * 20;
const stepX = (k) => 304 + k * 24;

function consoleTexture() {
  return canvasTex(CW, CH, (g, W, H) => {
    panelBg(g, W, H, "rgba(61,155,255,0.9)");
    g.fillStyle = "#e8f2ff";
    g.font = "700 24px 'Space Grotesk', Arial, sans-serif";
    g.fillText("DECODE · 1 TOKEN / STEP", 22, 38);
    g.fillStyle = "#ff9a2e";
    g.font = "600 17px 'Space Mono', monospace";
    g.textAlign = "right";
    g.fillText("TPOT", W - 22, 38);
    g.textAlign = "left";
    g.fillStyle = "rgba(190,215,255,0.78)";
    g.font = "500 15px 'Space Mono', monospace";
    g.fillText("TOKEN REGISTER", 24, 64);
    g.fillText("BATCH", 304, 64);
    g.strokeStyle = "rgba(95,208,255,0.45)";
    g.lineWidth = 2;
    for (let k = 0; k < SLOTS; k++) g.strokeRect(slotX(k), 76, 32, 58);
    g.fillStyle = "rgba(61,155,255,0.16)";
    for (let j = 0; j < LANES; j++) for (let k = 0; k < STEPS; k++) g.fillRect(stepX(k), laneY(j) - 6, 16, 12);
    g.fillStyle = "rgba(190,215,255,0.6)";
    g.font = "500 13px 'Space Mono', monospace";
    g.fillText("t", 24, 154);
    g.fillText("t+5", slotX(5) + 2, 154);
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
    g.fillText("DECODE", W / 2, 58);
    g.shadowBlur = 0;
    g.fillStyle = "rgba(200,225,255,0.8)";
    g.font = "500 18px 'Space Mono', monospace";
    g.fillText("M E M O R Y - B O U N D", W / 2, 94);
  });
}

function meterTexture() {
  return canvasTex(96, 384, (g, W, H) => {
    panelBg(g, W, H, "rgba(255,154,46,0.85)");
    g.fillStyle = "rgba(255,154,46,0.14)";
    g.fillRect(34, 40, 28, H - 100);
    g.save();
    g.translate(W / 2 + 6, H - 14);
    g.rotate(-Math.PI / 2);
    g.fillStyle = "#ffd9a8";
    g.font = "600 20px 'Space Mono', monospace";
    g.fillText("HBM", 0, 0);
    g.restore();
  });
}

export function buildDecode(ctx) {
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
  const edgeBlue = glowMat(COL.blue, 0.9);

  /* ------------------------------ plinth -------------------------------- */
  g.add(box(metalDark, 0, 0.05, 0.04, 0.9, 0.1, 0.98));
  g.add(box(edgeBlue, 0, 0.102, 0.532, 0.9, 0.008, 0.012));
  g.add(box(glowMat(COL.orange, 0.9), 0, 0.03, 0.536, 0.8, 0.012, 0.01));
  g.add(box(metal, 0, 0.2, 0, 0.74, 0.2, 0.74));
  g.add(box(glowMat(COL.orange, 0.7), 0, 0.2, 0.372, 0.6, 0.012, 0.004));
  /* Coolant/HBM feeds running down into the deck. */
  for (const x of [-0.2, 0.2]) {
    g.add(box(chrome, x, 0.2, -0.39, 0.06, 0.2, 0.04));
    g.add(box(glowMat(COL.orange, 0.5), x, 0.2, -0.413, 0.02, 0.16, 0.004));
  }

  /* --------------------------- glass column ----------------------------- */
  const H = TOP - 0.3;
  const CY = 0.3 + H / 2;
  for (const [x, z] of [[-0.31, -0.31], [0.31, -0.31], [-0.31, 0.31], [0.31, 0.31]])
    g.add(box(chrome, x, CY, z, 0.04, H, 0.04));
  for (const sx of [-1, 1]) g.add(box(edgeBlue, sx * 0.285, CY, 0.334, 0.006, H - 0.06, 0.004));
  for (const [rx, ry, rz, w, d] of [[0, 0, 0.31, 0.62, 0.04], [0, 0, -0.31, 0.62, 0.04], [0.31, 0, 0, 0.04, 0.62], [-0.31, 0, 0, 0.04, 0.62]]) {
    g.add(box(chrome, rx, 0.32 + ry, rz, w, 0.03, d));
    g.add(box(chrome, rx, TOP + ry, rz, w, 0.03, d));
  }
  for (const [x, z, ry] of [[0, 0.31, 0], [0, -0.31, 0], [0.31, 0, Math.PI / 2], [-0.31, 0, Math.PI / 2]]) {
    const p = plane(pane, x, CY, z, 0.6, H - 0.04);
    p.rotation.y = ry;
    g.add(p);
  }

  /* KV slab stack: bezelled glass plates with additive glowing cores. */
  const slabGlass = new THREE.MeshStandardMaterial({
    color: 0x0b1626,
    metalness: 0.3,
    roughness: 0.15,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const shells = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), slabGlass, SLABS);
  const cores = new THREE.InstancedMesh(new THREE.BoxGeometry(0.44, 0.022, 0.44), glowMat(COL.white, 1), SLABS);
  for (let i = 0; i < SLABS; i++) {
    _m.makeTranslation(0, SLAB_Y0 + i * SLAB_DY, 0);
    shells.setMatrixAt(i, _m);
    cores.setMatrixAt(i, _m);
    cores.setColorAt(i, COL.dim);
  }
  cores.renderOrder = 2;
  g.add(shells, cores);
  /* Rail posts the slabs hang from. */
  for (const [x, z] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]])
    g.add(box(metal, x, SLAB_Y0 + ((SLABS - 1) * SLAB_DY) / 2, z, 0.02, (SLABS - 1) * SLAB_DY + 0.08, 0.02));

  const beamMat = glowMat(COL.cyan, 0.6);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, TOP - 0.36, 12), beamMat);
  beam.position.y = 0.33 + (TOP - 0.36) / 2;
  g.add(beam);
  const sheathMat = glowMat(COL.blue, 0.2);
  const sheath = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, TOP - 0.36, 16, 1, true), sheathMat);
  sheath.position.copy(beam.position);
  g.add(sheath);
  /* The read wave: a bright band climbing the column. */
  const waveMat = glowMat(COL.amber, 0);
  const wave = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.035, 0.56), waveMat);
  g.add(wave);

  /* ------------------------------ emitter ------------------------------- */
  g.add(box(metal, 0, TOP + 0.04, 0, 0.66, 0.05, 0.66));
  g.add(box(edgeBlue, 0, TOP + 0.066, 0.331, 0.6, 0.006, 0.004));
  const ringMat = glowMat(COL.cyan, 0.8);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.014, 8, 48), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = TOP + 0.1;
  g.add(ring);
  const ring2Mat = glowMat(COL.orange, 0.7);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 6, 40), ring2Mat);
  ring2.position.y = TOP + 0.12;
  g.add(ring2);
  const seatMat = glowMat(COL.cyan, 0.5);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 20), seatMat);
  seat.position.y = TOP + 0.08;
  g.add(seat);
  /* The token: an octahedron that rises out of the ring and fades. */
  const tokenMat = glowMat(COL.amber, 0);
  const token = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), tokenMat);
  g.add(token);
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ctx.glow, color: 0xffb060, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  halo.scale.setScalar(0.32);
  g.add(halo);

  /* -------------------------------- sign -------------------------------- */
  const sign = new THREE.Group();
  sign.position.set(0, TOP + 0.52, -0.22);
  sign.rotation.x = -0.12;
  sign.add(box(metal, 0, 0, -0.02, 0.6, 0.19, 0.025));
  sign.add(plane(hudMat(signTexture()), 0, 0, -0.006, 0.585, 0.183));
  for (const x of [-0.2, 0.2]) sign.add(box(chrome, x, -0.18, -0.02, 0.02, 0.18, 0.02));
  g.add(sign);

  /* ----------------------------- HBM meter ------------------------------ */
  const meter = new THREE.Group();
  meter.position.set(0.345, 0.98, 0.05);
  meter.rotation.y = Math.PI / 2;
  meter.add(plane(hudMat(meterTexture()), 0, 0, 0, 0.16, 0.64));
  const MH = (284 / 384) * 0.64;
  const MB = 0.32 - (40 + 284) / 384 * 0.64;
  const fillMat = glowMat(COL.orange, 0.95);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.044, 1), fillMat);
  fill.position.set(((48 / 96) - 0.5) * 0.16, 0, 0.003);
  meter.add(fill);
  g.add(meter);

  /* ------------------------------ console ------------------------------- */
  const con = new THREE.Group();
  con.position.set(0, 0.17, 0.46);
  con.rotation.x = -1.0;
  const conMat = hudMat(consoleTexture());
  con.add(plane(conMat, 0, 0, 0, PW, PH));
  g.add(con);
  const cells = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMat(COL.white, 1), SLOTS + LANES * STEPS);
  cells.position.z = 0.003;
  for (let k = 0; k < SLOTS; k++) {
    const [x, y] = toLocal(slotX(k) + 16, 105);
    _m.makeScale(26 / CW * PW, 50 / CW * PW, 1).setPosition(x, y, 0);
    cells.setMatrixAt(k, _m);
    cells.setColorAt(k, COL.dim);
  }
  for (let j = 0; j < LANES; j++)
    for (let k = 0; k < STEPS; k++) {
      const [x, y] = toLocal(stepX(k) + 8, laneY(j));
      _m.makeScale(14 / CW * PW, 10 / CW * PW, 1).setPosition(x, y, 0);
      cells.setMatrixAt(SLOTS + j * STEPS + k, _m);
      cells.setColorAt(SLOTS + j * STEPS + k, COL.dim);
    }
  con.add(cells);

  const spill = new THREE.Mesh(new THREE.CircleGeometry(0.6, 40), glowMat(COL.blue, 0.1));
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0, 0.106, 0.05);
  g.add(spill);

  /* ------------------------------- update ------------------------------- */
  const cur = new Float32Array(SLABS * 3);
  const lane = [0, 3, 5, 1];
  const laneLen = [8, 6, 7, 5];
  let lastToken = -1;
  let waveU = 1;
  let rise = 1;

  return {
    group: g,
    update(dt, t, sim, c) {
      const em = c.emph;
      const sel = c.selected ? 1 : 0;
      const a = 1 - Math.exp(-dt * 10);
      const dec = sim.decoding ? 1 : 0;
      const read = sim.kv.read || 0;
      const pulse = sim.tokenPulse || 0;

      /* A new token: restart the read wave and launch the token, and every
         batch lane advances one step (lanes that finish refill at once). */
      if (sim.tokenIndex !== lastToken) {
        if (sim.tokenIndex > 0 && dec) {
          waveU = 0;
          rise = 0;
          for (let j = 0; j < LANES; j++) {
            lane[j]++;
            if (lane[j] > laneLen[j]) {
              lane[j] = 0;
              laneLen[j] = 4 + ((j * 3 + sim.tokenIndex) % 5);
            }
          }
        }
        lastToken = sim.tokenIndex;
      }
      waveU = Math.min(1.2, waveU + dt * (2.6 + sel));
      rise = Math.min(1, rise + dt * 2.4);

      const waveY = SLAB_Y0 + waveU * (SLABS - 1) * SLAB_DY;
      wave.position.y = waveY;
      waveMat.opacity = (waveU < 1 ? 0.5 * (1 - waveU * 0.5) : 0) * em;

      const kvOn = Math.max(sim.kvFill || 0, 0.15);
      for (let i = 0; i < SLABS; i++) {
        const y = SLAB_Y0 + i * SLAB_DY;
        const hitWave = waveU < 1.1 ? Math.exp(-((y - waveY) ** 2) / 0.006) : 0;
        const filled = i / SLABS < kvOn + 0.05;
        _c.copy(i % 2 ? COL.purple : COL.orange);
        /* Kept dim: seen from above, the additive slabs stack on each other. */
        const k = filled ? 0.2 + 0.05 * Math.sin(t * 2 + i) + hitWave * 0.75 + 0.06 * sel : 0.05;
        _c.lerp(COL.amber, hitWave * 0.6).multiplyScalar(k);
        cur[i * 3] += (_c.r - cur[i * 3]) * a;
        cur[i * 3 + 1] += (_c.g - cur[i * 3 + 1]) * a;
        cur[i * 3 + 2] += (_c.b - cur[i * 3 + 2]) * a;
        cores.setColorAt(i, _c.setRGB(cur[i * 3] * em, cur[i * 3 + 1] * em, cur[i * 3 + 2] * em));
      }
      cores.instanceColor.needsUpdate = true;

      beamMat.opacity = (0.25 + 0.55 * dec + 0.3 * pulse) * em;
      sheathMat.opacity = (0.08 + 0.14 * dec + 0.1 * sel) * em;

      ring.rotation.z = t * (0.6 + dec * 1.6);
      ring2.rotation.y = -t * (0.9 + dec * 2);
      ring2.rotation.x = 0.35 * Math.sin(t * 0.7);
      ringMat.opacity = (0.45 + 0.55 * pulse + 0.15 * sel) * em;
      ring2Mat.opacity = (0.35 + 0.4 * dec) * em;
      seatMat.opacity = (0.3 + 0.7 * pulse) * em;
      token.position.y = TOP + 0.13 + rise * 0.24;
      token.rotation.y = t * 3;
      tokenMat.opacity = (1 - rise) * dec * em;
      halo.position.copy(token.position);
      halo.material.opacity = (1 - rise) * 0.6 * dec * em;

      const bw = Math.min(1, 0.12 + dec * 0.65 + read * 0.25 + sel * 0.05);
      const fh = MH * bw;
      fill.scale.y = Math.max(fh, 1e-4);
      fill.position.y = MB + fh / 2;
      fillMat.opacity = (0.55 + 0.4 * read) * em;

      /* Console: emitted tokens fill the register left to right. */
      const active = dec ? (sim.tokenIndex - 1 + SLOTS) % SLOTS : -1;
      for (let k = 0; k < SLOTS; k++) {
        let col = COL.dim;
        let kk = 1;
        if (k === active) {
          col = COL.amber;
          kk = 0.8 + pulse * 1.2;
        } else if (dec && k < active) {
          col = COL.cyan;
          kk = 0.55;
        }
        cells.setColorAt(k, _c.copy(col).multiplyScalar(kk * em));
      }
      for (let j = 0; j < LANES; j++)
        for (let k = 0; k < STEPS; k++) {
          let kk = 0.0;
          let col = COL.dim;
          if (k < laneLen[j]) {
            col = COL.blue;
            kk = 0.35;
          }
          if (k < lane[j]) {
            col = COL.cyan;
            kk = 0.7;
          }
          if (k === lane[j] - 1) {
            col = COL.amber;
            kk = 0.7 + pulse * 1.1;
          }
          cells.setColorAt(SLOTS + j * STEPS + k, kk ? _c.copy(col).multiplyScalar(kk * em) : COL.dim);
        }
      cells.instanceColor.needsUpdate = true;
      conMat.color.setScalar((0.8 + 0.2 * sel) * em);

      spill.material.opacity = (0.05 + 0.07 * dec) * em;
      c.activity = 0.4 + pulse * 1.2;
    },
  };
}
