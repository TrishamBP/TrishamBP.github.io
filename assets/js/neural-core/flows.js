/* ---------------------------------------------------------------------------
   Neural Compute Core — data flow simulation
   ---------------------------------------------------------------------------
   Three building blocks:

   Stream      continuous particle flow along one or more CatmullRomCurve3
               paths (THREE.Points, one draw call per stream). Brightness is
               written into the vertex-colour buffer, so with additive
               blending a "dim" particle is simply a darker colour.
   PacketPool  discrete packets (a short comet of particles) that travel a
               path once and fire events at waypoints — decode tokens, RAG
               queries and agent calls.
   Flows       the scheduler. It runs three looping cycles (inference, RAG,
               agent), drives the KV-cache block state machine and writes
               everything into the shared `sim` state that the scene
               builders read for their micro-animations.

   All buffers are preallocated; update() never allocates.
   ------------------------------------------------------------------------ */

import * as THREE from "three";
import { PALETTE } from "./modules.js";

const _v = new THREE.Vector3();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const curve = (pts, closed = false) => new THREE.CatmullRomCurve3(pts.map((p) => V(p[0], p[1], p[2])), closed, "centripetal");

function damp(cur, target, rate, dt) {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

/* Arc-length parameter of the point on `c` closest to `p` (init-time only). */
function uAt(c, p) {
  let best = 0;
  let bestD = Infinity;
  const q = new THREE.Vector3();
  const target = V(p[0], p[1], p[2]);
  for (let i = 0; i <= 400; i++) {
    c.getPointAt(i / 400, q);
    const d = q.distanceToSquared(target);
    if (d < bestD) {
      bestD = d;
      best = i / 400;
    }
  }
  return best;
}

function pointsMaterial(glow, size) {
  return new THREE.PointsMaterial({
    size,
    map: glow,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    toneMapped: false,
  });
}

/* ------------------------------- Stream -------------------------------- */

export class Stream {
  constructor({ curves, count, color, size = 0.12, speed = 0.12, glow, level = 0, lane = "inference" }) {
    this.lane = lane;
    this.curves = curves;
    this.count = count;
    this.color = color.clone();
    this.speed = speed;
    this.level = level;
    this.target = level;
    this.time = Math.random() * 10;
    this.offsets = new Float32Array(count);
    this.sparkle = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.offsets[i] = (i / count + Math.random() * 0.5 / count) % 1;
      this.sparkle[i] = Math.random() * 6.28;
    }
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(geo, pointsMaterial(glow, size));
    this.points.frustumCulled = false;
  }

  update(dt, motion, master) {
    this.level = damp(this.level, this.target, 3.5, dt);
    const L = this.level * master;
    this.points.visible = L > 0.01;
    if (!this.points.visible) return;
    this.time += dt * this.speed * motion;
    const n = this.curves.length;
    const pos = this.positions;
    const col = this.colors;
    const c = this.color;
    for (let i = 0; i < this.count; i++) {
      const u = (this.offsets[i] + this.time) % 1;
      this.curves[i % n].getPointAt(u, _v);
      const o = i * 3;
      pos[o] = _v.x;
      pos[o + 1] = _v.y;
      pos[o + 2] = _v.z;
      /* Fade in/out at the ends so streams never pop. */
      const env = Math.min(1, u * 8, (1 - u) * 8);
      const k = L * env * (0.65 + 0.35 * Math.sin(this.sparkle[i] + this.time * 40));
      col[o] = c.r * k;
      col[o + 1] = c.g * k;
      col[o + 2] = c.b * k;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

/* ----------------------------- PacketPool ------------------------------ */
/* A "sequence" is { curve, duration, color, events: [{ u, fn }] }.          */

export class PacketPool {
  constructor({ slots, cluster = 5, lag = 0.012, size = 0.16, glow }) {
    this.slots = slots;
    this.cluster = cluster;
    this.lag = lag;
    this.seq = new Array(slots).fill(null);
    this.age = new Float32Array(slots);
    this.fired = new Uint8Array(slots * 8);
    const n = slots * cluster;
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(geo, pointsMaterial(glow, size));
    this.points.frustumCulled = false;
  }

  spawn(seq) {
    for (let s = 0; s < this.slots; s++) {
      if (this.seq[s]) continue;
      this.seq[s] = seq;
      this.age[s] = 0;
      this.fired.fill(0, s * 8, s * 8 + 8);
      return s;
    }
    return -1;
  }

  /* `gain(lane)` scales each packet's brightness by its flow lane. */
  update(dt, motion, master, gain) {
    const pos = this.positions;
    const col = this.colors;
    for (let s = 0; s < this.slots; s++) {
      const seq = this.seq[s];
      if (!seq) {
        for (let k = 0; k < this.cluster; k++) {
          const o = (s * this.cluster + k) * 3;
          col[o] = col[o + 1] = col[o + 2] = 0;
        }
        continue;
      }
      this.age[s] += dt * motion;
      const u = this.age[s] / seq.duration;
      const ev = seq.events;
      for (let e = 0; e < ev.length; e++) {
        if (!this.fired[s * 8 + e] && u >= ev[e].u) {
          this.fired[s * 8 + e] = 1;
          ev[e].fn();
        }
      }
      if (u >= 1 + this.lag * this.cluster) {
        this.seq[s] = null;
        continue;
      }
      const c = seq.color;
      for (let k = 0; k < this.cluster; k++) {
        const uk = u - k * this.lag;
        const o = (s * this.cluster + k) * 3;
        if (uk < 0 || uk > 1) {
          col[o] = col[o + 1] = col[o + 2] = 0;
          continue;
        }
        seq.curve.getPointAt(uk, _v);
        pos[o] = _v.x;
        pos[o + 1] = _v.y;
        pos[o + 2] = _v.z;
        const b = master * gain(seq.lane) * (1 - k / this.cluster) * Math.min(1, uk * 12, (1 - uk) * 12 + 0.2);
        col[o] = c.r * b;
        col[o + 1] = c.g * b;
        col[o + 2] = c.b * b;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

/* ------------------------------ sim state ------------------------------ */

const KV_COUNT = 40;
const PROMPT_BLOCKS = 18;
const KV_OFF = [0.045, 0.05, 0.058];

export function createSim() {
  const kv = {
    count: KV_COUNT,
    state: new Uint8Array(KV_COUNT), // 0 free · 1 populated · 2 active
    timer: new Float32Array(KV_COUNT),
    r: new Float32Array(KV_COUNT).fill(KV_OFF[0]),
    g: new Float32Array(KV_COUNT).fill(KV_OFF[1]),
    b: new Float32Array(KV_COUNT).fill(KV_OFF[2]),
    read: 0,
  };
  const BARS = 10;
  const history = [new Float32Array(BARS), new Float32Array(BARS), new Float32Array(BARS)];
  history.head = 0;
  return {
    motion: 1,
    motionPulse: 1,
    intro: { core: 1, gpu: 1, flows: 1 },
    phase: "IDLE",
    coreLevel: 0.35,
    gpuLoad: 0.1,
    hbmLoad: 0.1,
    prefillLevel: 0,
    storageLoad: 0.2,
    fabricLoad: 0.5,
    attnPulse: 0,
    attnSweep: 0,
    tokenPulse: 0,
    tokenIndex: 0,
    decoding: false,
    requestPulse: 0,
    kv,
    kvFill: 0,
    searchGlow: 0,
    rerankGlow: 0,
    embedPulse: 0,
    agentPulse: 0,
    agentTool: 0,
    agentToolGlow: 0,
    history,
  };
}

/* -------------------------------- Flows -------------------------------- */

const P = {
  client: [0, 0.95, 7.8],
  servingFront: [0, 0.8, 4.0],
  serving: [0, 1.0, 3.1],
  prefill: [-2.5, 1.5, 1.75],
  core: [0, 2.0, 0],
  decode: [2.5, 1.7, 1.75],
  kv: [-4.4, 1.3, 1.85],
  hbm: [-3.9, 0.75, -0.5],
  storage: [-4.4, 1.85, -2.6],
  embedding: [4.4, 1.55, 1.9],
  vector: [4.3, 1.3, -0.4],
  rag: [4.1, 3.05, -0.6],
  hub: [2.2, 4.3, 1.8],
  user: [3.4, 1.7, 7.6],
};

export class Flows {
  constructor({ scene, sim, glow, low, parts }) {
    this.sim = sim;
    this.parts = parts;
    this.low = low;
    const k = low ? 0.5 : 1;
    const n = (x) => Math.max(4, Math.round(x * k));
    this.streams = [];
    this.pools = [];

    const add = (s) => {
      this.streams.push(s);
      scene.add(s.points);
      return s;
    };

    /* Inference path ---------------------------------------------------- */
    this.prefillToCore = add(
      new Stream({
        curves: [
          curve([P.prefill, [-1.7, 1.75, 1.4], [-0.8, 1.95, 0.7], P.core]),
          curve([[-2.5, 1.2, 1.75], [-1.6, 1.4, 1.2], [-0.7, 1.6, 0.6], [0, 1.4, 0]]),
          curve([[-2.5, 1.8, 1.75], [-1.5, 2.3, 1.1], [-0.6, 2.4, 0.5], [0, 2.6, 0]]),
        ],
        count: n(54),
        color: PALETTE.lime,
        size: 0.11,
        speed: 0.55,
        glow,
      })
    );

    const gpuAnchors = parts["gpu-compute"].anchors;
    this.coreToGpu = add(
      new Stream({
        curves: gpuAnchors.map((a) => curve([[0, 1.9, 0], [a[0] * 0.45, 2.3, a[2] * 0.45], a])),
        count: n(64),
        color: PALETTE.cool,
        size: 0.09,
        speed: 0.42,
        glow,
      })
    );

    this.kvWrite = add(
      new Stream({
        curves: [curve([[0, 2.4, 0.2], [-1.4, 2.75, 0.9], [-3.2, 2.3, 1.6], P.kv])],
        count: n(30),
        color: PALETTE.lime,
        size: 0.1,
        speed: 0.5,
        glow,
      })
    );

    this.kvRead = add(
      new Stream({
        curves: [curve([P.kv, [-3.3, 0.85, 0.9], [-1.4, 1.0, 0.45], [0, 1.5, 0]])],
        count: n(26),
        color: PALETTE.blue,
        size: 0.09,
        speed: 0.4,
        glow,
      })
    );

    this.hbmRead = add(
      new Stream({
        curves: [
          curve([P.hbm, [-2.4, 1.0, -0.45], [-1.0, 1.5, -0.15], [0, 1.8, 0]]),
          curve([P.hbm, [-3.4, 1.0, -1.3], [-2.7, 1.2, -1.9]]),
        ],
        count: n(30),
        color: PALETTE.blue,
        size: 0.09,
        speed: 0.38,
        glow,
      })
    );

    /* Background infrastructure ---------------------------------------- */
    const ring = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ring.push([Math.cos(a) * 5.55, 0.47, Math.sin(a) * 5.55]);
    }
    this.fabric = add(new Stream({ curves: [curve(ring, true)], count: n(44), color: PALETTE.blue, size: 0.08, speed: 0.035, glow, level: 0.6, lane: "infra" }));
    this.pipeline = add(
      new Stream({
        curves: [curve([[3.93, 0.7, 2.69], [4.35, 1.1, 2.42], [4.6, 1.5, 2.15]])],
        count: n(10),
        color: PALETTE.blue,
        size: 0.08,
        speed: 0.3,
        glow,
        level: 0.6,
        lane: "retrieval",
      })
    );
    this.weights = add(
      new Stream({
        curves: [curve([[-4.4, 1.2, -2.1], [-4.25, 0.95, -1.3], P.hbm])],
        count: n(8),
        color: PALETTE.cool,
        size: 0.07,
        speed: 0.25,
        glow,
        level: 0.35,
        lane: "infra",
      })
    );

    /* Discrete packets --------------------------------------------------- */
    this.packets = new PacketPool({ slots: low ? 8 : 14, cluster: low ? 3 : 5, glow, size: 0.15 });
    scene.add(this.packets.points);

    const s = this.sim;

    this.requestSeq = {
      curve: curve([P.client, P.servingFront, P.serving, [-1.2, 1.25, 2.4], P.prefill]),
      duration: 1.0,
      lane: "inference",
      color: PALETTE.cool,
      events: [{ u: 0.4, fn: () => (s.requestPulse = 1) }],
    };

    this.tokenSeq = {
      curve: curve([[0, 2.0, 0.3], [1.3, 2.1, 1.0], P.decode, [2.1, 1.1, 2.6], [0.7, 0.9, 3.25], P.servingFront, [0.2, 1.0, 7.8]]),
      duration: 2.2,
      lane: "inference",
      color: PALETTE.lime,
      events: [],
    };

    const ragCurvePts = [[0.6, 1.0, 3.2], [2.5, 1.25, 3.0], P.embedding, [4.6, 1.5, 0.9], P.vector, [4.25, 2.3, -0.5], P.rag, [2.6, 3.05, -0.3], [1.0, 2.6, -0.1], [0, 2.3, 0]];
    const ragCurve = curve(ragCurvePts);
    this.ragSeq = {
      curve: ragCurve,
      duration: 6.0,
      lane: "retrieval",
      color: PALETTE.cool,
      events: [
        { u: uAt(ragCurve, P.embedding), fn: () => (s.embedPulse = 1) },
        {
          u: uAt(ragCurve, P.vector),
          fn: () => {
            parts["vector-db"].search();
            s.searchGlow = 1;
          },
        },
        {
          u: uAt(ragCurve, P.rag),
          fn: () => {
            parts.rag.rerank();
            s.rerankGlow = 1;
          },
        },
        { u: 0.985, fn: () => (s.attnPulse = 1) },
      ],
    };

    /* One agent path per tool node: user → agent → tool → data → model → response. */
    const toolPos = parts["agent-orchestration"].toolPos;
    this.agentSeqs = toolPos.map((tp, i) => {
      const tool = [P.hub[0] + tp[0], P.hub[1] + tp[1], P.hub[2] + tp[2]];
      const pts = [P.user, [3.0, 3.4, 4.4], P.hub, tool, [0.4, 5.2, -0.6], P.storage, [-2.4, 2.7, -1.1], [0, 2.4, 0], [0.5, 1.4, 2.2], P.servingFront, [0.6, 1.0, 7.8]];
      const c = curve(pts);
      return {
        curve: c,
        duration: 8.0,
        lane: "agents",
        color: PALETTE.cool,
        events: [
          { u: uAt(c, P.hub), fn: () => (s.agentPulse = 1) },
          {
            u: uAt(c, tool),
            fn: () => {
              s.agentTool = i;
              s.agentToolGlow = 1;
            },
          },
          { u: uAt(c, P.storage), fn: () => (s.storageLoad = 1) },
          { u: uAt(c, [0, 2.4, 0]), fn: () => (s.attnPulse = 1) },
        ],
      };
    });

    /* Flow focus (System Map / selection): the focused lane brightens and the
       rest dim, so one data path reads clearly through the machine. */
    this.focus = null;
    this.gains = { inference: 1, retrieval: 1, agents: 1, infra: 1 };
    this.gain = (lane) => this.gains[lane] ?? 1;

    /* Cycle clocks. */
    this.tInf = 0;
    this.tRag = 3.0;
    this.tAgent = 0;
    this.agentIndex = 0;
    this.nextToken = 0;
    this.historyClock = 0;
  }

  /* KV cache block state machine: free → populated → active (→ populated). */
  setKV(i, state, hold = 0.32) {
    const kv = this.sim.kv;
    if (i < 0 || i >= kv.count) return;
    kv.state[i] = state;
    kv.timer[i] = hold;
  }

  updateInference(dt) {
    const s = this.sim;
    const T = 10.6;
    const prev = this.tInf;
    this.tInf += dt;
    if (this.tInf >= T) {
      this.tInf -= T;
      this.nextToken = 0;
    }
    const t = this.tInf;

    if (prev > t || (prev <= 0 && t > 0)) this.packets.spawn(this.requestSeq);

    let gpu = 0.12;
    let hbm = 0.1;
    let core = 0.35;
    let prefill = 0;
    s.decoding = false;

    if (t < 0.9) {
      s.phase = "REQUEST";
    } else if (t < 2.9) {
      s.phase = "PREFILL";
      prefill = 1;
      gpu = 1;
      hbm = 0.45;
      core = 1;
      const filled = Math.floor(((t - 0.9) / 2.0) * PROMPT_BLOCKS);
      for (let i = 0; i < filled; i++) if (s.kv.state[i] === 0) this.setKV(i, 2, 0.28);
      s.attnSweep += dt * 6;
      s.attnPulse = Math.max(s.attnPulse, 0.6);
      s.tokenIndex = 0;
    } else if (t < 9.0) {
      s.phase = "DECODE";
      s.decoding = true;
      gpu = 0.3;
      hbm = 0.95;
      core = 0.65;
      if (t - 2.9 >= this.nextToken * 0.42) {
        /* One token: append a KV entry, re-read the cache, emit the token. */
        this.nextToken++;
        s.tokenIndex = this.nextToken;
        s.tokenPulse = 1;
        s.attnPulse = 1;
        s.kv.read = 1;
        this.setKV(PROMPT_BLOCKS + this.nextToken - 1, 2, 0.36);
        this.packets.spawn(this.tokenSeq);
      }
      s.attnSweep += dt * 2.4;
    } else {
      s.phase = "RELEASE";
      const freed = Math.floor(((t - 9.0) / 1.4) * s.kv.count);
      for (let i = 0; i < Math.min(freed, s.kv.count); i++) s.kv.state[i] = 0;
    }

    s.prefillLevel = damp(s.prefillLevel, prefill, 6, dt);
    s.gpuLoad = damp(s.gpuLoad, gpu, 3, dt);
    s.hbmLoad = damp(s.hbmLoad, hbm, 3, dt);
    s.coreLevel = damp(s.coreLevel, core, 3, dt);
    s.tokenPulse = damp(s.tokenPulse, 0, 7, dt);
    s.requestPulse = damp(s.requestPulse, 0, 3, dt);
    s.attnPulse = damp(s.attnPulse, 0, 3, dt);
    s.kv.read = damp(s.kv.read, 0, 6, dt);

    this.prefillToCore.target = prefill;
    this.kvWrite.target = prefill;
    this.coreToGpu.target = prefill ? 1 : s.decoding ? 0.3 : 0.1;
    this.kvRead.target = s.decoding ? 0.85 : 0;
    this.hbmRead.target = hbm * 0.8;
  }

  updateKV(dt) {
    const kv = this.sim.kv;
    let used = 0;
    const a = 1 - Math.exp(-dt * 9);
    const lime = PALETTE.lime;
    const blue = PALETTE.blue;
    const cool = PALETTE.cool;
    for (let i = 0; i < kv.count; i++) {
      if (kv.state[i] === 2) {
        kv.timer[i] -= dt;
        if (kv.timer[i] <= 0) kv.state[i] = 1;
      }
      let r, g, b;
      if (kv.state[i] === 0) {
        r = KV_OFF[0];
        g = KV_OFF[1];
        b = KV_OFF[2];
      } else if (kv.state[i] === 1) {
        used++;
        /* Populated blocks brighten briefly on every decode re-read. */
        const rd = kv.read * 0.35;
        r = blue.r * 0.42 + cool.r * rd;
        g = blue.g * 0.42 + cool.g * rd;
        b = blue.b * 0.42 + cool.b * rd;
      } else {
        used++;
        r = lime.r * 1.5;
        g = lime.g * 1.5;
        b = lime.b * 1.5;
      }
      kv.r[i] += (r - kv.r[i]) * a;
      kv.g[i] += (g - kv.g[i]) * a;
      kv.b[i] += (b - kv.b[i]) * a;
    }
    this.sim.kvFill = used / kv.count;
  }

  updateRag(dt) {
    const s = this.sim;
    this.tRag += dt;
    if (this.tRag >= 8.0) {
      this.tRag -= 8.0;
      this.packets.spawn(this.ragSeq);
    }
    s.embedPulse = damp(s.embedPulse, 0, 2.2, dt);
    s.searchGlow = damp(s.searchGlow, 0, 0.9, dt);
    s.rerankGlow = damp(s.rerankGlow, 0, 0.55, dt);
  }

  updateAgents(dt) {
    const s = this.sim;
    this.tAgent += dt;
    if (this.tAgent >= 9.5) {
      this.tAgent -= 9.5;
      this.agentIndex = (this.agentIndex + 1) % this.agentSeqs.length;
      this.packets.spawn(this.agentSeqs[this.agentIndex]);
    }
    s.agentPulse = damp(s.agentPulse, 0, 2, dt);
    s.agentToolGlow = damp(s.agentToolGlow, 0, 0.8, dt);
    s.storageLoad = damp(s.storageLoad, 0.2, 1.2, dt);
  }

  updateHistory(dt) {
    const s = this.sim;
    this.historyClock += dt;
    if (this.historyClock < 0.45) return;
    this.historyClock = 0;
    const h = s.history;
    h.head = (h.head + 1) % h[0].length;
    h[0][h.head] = Math.min(1, s.gpuLoad * 0.9 + Math.random() * 0.1);
    h[1][h.head] = s.kvFill;
    h[2][h.head] = s.decoding ? 0.55 + Math.random() * 0.3 : 0.08 + Math.random() * 0.08;
  }

  /* `dt` is real time; `motion` is 0 when motion is paused / reduced. */
  setFocus(lane) {
    this.focus = lane || null;
  }

  update(dt, motion) {
    const g = this.gains;
    for (const lane in g) {
      const t = !this.focus ? 1 : lane === this.focus ? 1.4 : 0.16;
      g[lane] = motion ? damp(g[lane], t, 5, dt) : t;
    }
    const sdt = dt * motion;
    if (sdt > 0) {
      this.updateInference(sdt);
      this.updateRag(sdt);
      this.updateAgents(sdt);
      this.updateHistory(sdt);
    }
    this.updateKV(sdt > 0 ? sdt : 1);
    const master = this.sim.intro.flows;
    for (let i = 0; i < this.streams.length; i++) {
      const st = this.streams[i];
      st.update(dt, motion, master * g[st.lane]);
    }
    this.packets.update(dt, motion, master, this.gain);
  }

  /* Advance the simulation silently, e.g. to a representative frame for
     reduced-motion users, who then see a static mid-decode snapshot. */
  preroll(seconds, step = 1 / 30) {
    for (let t = 0; t < seconds; t += step) this.update(step, 1);
  }
}
