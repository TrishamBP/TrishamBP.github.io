/**
 * Discrete-time simulation of one service tier (e.g. an API gateway):
 *
 *   arrivals (Poisson, λ req/s) → bounded FIFO queue → c workers → done
 *
 * Each worker serves one request at a time; service time is exponential
 * with mean S ms, so capacity μ = c / S requests per ms. This is an
 * M/M/c/K queue with client timeouts, simple enough to reason about and
 * rich enough to show the three classic overload symptoms:
 *   1. latency climbs sharply as utilisation ρ = λ/μ → 1,
 *   2. the queue grows without bound once ρ > 1,
 *   3. requests fail: shed when the queue is full, or time out waiting.
 *
 * Self-contained (no imports) so it runs under `node --test` directly.
 */

export interface SimParams {
  rps: number;         // offered load λ (requests / second)
  instances: number;   // gateway replicas behind the load balancer
  workers: number;     // concurrent requests one instance can serve
  serviceMs: number;   // mean service time S
  queueCap: number;    // max queued requests per instance (K - c)
  timeoutMs: number;   // client gives up after this long
  down?: boolean;      // every instance unavailable
  /** Fraction of requests that hit a crashing code path (bad deploy). */
  crashRate?: number;
}

interface InFlight { arr: number; fin: number }

export interface Sample { t: number; lat: number }

export interface SimSnapshot {
  now: number;
  queued: number;
  busy: number;
  capacity: number;          // workers * instances
  capacityRps: number;       // μ in req/s
  utilisation: number;       // offered ρ = λ / μ
  throughput: number;        // completed req/s over the window
  errorRate: number;         // failed / (completed + failed) over the window
  shedRps: number;
  timeoutRps: number;
  p50: number; p95: number; p99: number; mean: number;
  inFlight: number;          // L, measured
  littleL: number;           // λ_eff × W, Little's Law prediction of L
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class QueueSim {
  now = 0;
  private queue: number[] = [];
  private head = 0;
  private busy: InFlight[] = [];
  private done: Sample[] = [];
  private fails: { t: number; kind: "shed" | "timeout" | "down" | "crash" }[] = [];
  private rand: () => number;
  readonly windowMs = 2000;

  p: SimParams;
  constructor(p: SimParams, seed = 42) {
    this.p = p;
    this.rand = mulberry32(seed);
  }

  private poisson(mean: number): number {
    if (mean <= 0) return 0;
    if (mean > 40) {
      // Normal approximation for large means (Box-Muller).
      const u = 1 - this.rand(), v = this.rand();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return Math.max(0, Math.round(mean + Math.sqrt(mean) * z));
    }
    const L = Math.exp(-mean);
    let k = 0, p = 1;
    do { k++; p *= this.rand(); } while (p > L);
    return k - 1;
  }

  private expo(mean: number) { return -Math.log(1 - this.rand()) * mean; }

  get queued() { return this.queue.length - this.head; }

  /** Advance the simulation by dt milliseconds. */
  step(dt: number) {
    const p = this.p;
    const end = this.now + dt;
    const cap = p.workers * p.instances;
    const qcap = p.queueCap * p.instances;

    // 1. New arrivals, spread uniformly across the tick (sorted, FIFO).
    const n = this.poisson((p.rps * dt) / 1000);
    const arrivals: number[] = [];
    for (let i = 0; i < n; i++) arrivals.push(this.now + this.rand() * dt);
    arrivals.sort((a, b) => a - b);
    for (const at of arrivals) {
      if (p.down) { this.fails.push({ t: at, kind: "down" }); continue; }
      if (p.crashRate && this.rand() < p.crashRate) { this.fails.push({ t: at, kind: "crash" }); continue; }
      if (this.queued >= qcap) { this.fails.push({ t: at, kind: "shed" }); continue; }
      this.queue.push(at);
    }
    if (p.down) { // a dead gateway drops whatever it was holding
      for (let i = this.head; i < this.queue.length; i++) this.fails.push({ t: end, kind: "down" });
      for (let i = 0; i < this.busy.length; i++) this.fails.push({ t: end, kind: "down" });
      this.queue = []; this.head = 0; this.busy = [];
    }

    // Take the next queued request for a worker that is free at time `free`.
    // A client that already waited longer than the timeout has given up.
    const take = (free: number): boolean => {
      while (this.head < this.queue.length && this.queue[this.head] <= end) {
        const arr = this.queue[this.head++];
        const start = Math.max(arr, free);
        if (start - arr > p.timeoutMs) { this.fails.push({ t: start, kind: "timeout" }); continue; }
        this.busy.push({ arr, fin: start + this.expo(p.serviceMs) });
        return true;
      }
      return false;
    };

    // 2. Idle workers start immediately.
    while (this.busy.length < cap && take(this.now)) { /* fill idle slots */ }

    // 3. Event loop inside the tick: each completion frees a worker, which
    //    immediately pulls the next request. (Avoids tick-size artefacts.)
    for (;;) {
      let mi = -1;
      for (let i = 0; i < this.busy.length; i++) {
        if (this.busy[i].fin <= end && (mi < 0 || this.busy[i].fin < this.busy[mi].fin)) mi = i;
      }
      if (mi < 0) break;
      const f = this.busy[mi];
      this.busy[mi] = this.busy[this.busy.length - 1];
      this.busy.pop();
      this.done.push({ t: f.fin, lat: f.fin - f.arr });
      take(f.fin);
    }

    // 4. Queued clients past their timeout give up.
    while (this.head < this.queue.length && end - this.queue[this.head] > p.timeoutMs) {
      this.fails.push({ t: end, kind: "timeout" });
      this.head++;
    }
    if (this.head > 4096) { this.queue = this.queue.slice(this.head); this.head = 0; }

    this.now = end;
    const cut = end - this.windowMs;
    if (this.done.length && this.done[0].t < cut) this.done = this.done.filter((s) => s.t >= cut);
    if (this.fails.length && this.fails[0].t < cut) this.fails = this.fails.filter((s) => s.t >= cut);
  }

  snapshot(): SimSnapshot {
    const p = this.p;
    const span = Math.min(this.windowMs, Math.max(1, this.now)) / 1000;
    const lats = this.done.map((s) => s.lat).sort((a, b) => a - b);
    const q = (f: number) => (lats.length ? lats[Math.min(lats.length - 1, Math.floor(f * lats.length))] : 0);
    const mean = lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 0;
    const failed = this.fails.length;
    const total = lats.length + failed;
    const capacityRps = p.down ? 0 : (p.workers * p.instances * 1000) / p.serviceMs;
    const throughput = lats.length / span;
    return {
      now: this.now,
      queued: this.queued,
      busy: this.busy.length,
      capacity: p.workers * p.instances,
      capacityRps,
      utilisation: capacityRps ? p.rps / capacityRps : Infinity,
      throughput,
      errorRate: total ? failed / total : 0,
      shedRps: this.fails.filter((f) => f.kind === "shed").length / span,
      timeoutRps: this.fails.filter((f) => f.kind === "timeout").length / span,
      p50: q(0.5), p95: q(0.95), p99: q(0.99), mean,
      inFlight: this.queued + this.busy.length,
      littleL: (throughput * mean) / 1000,
    };
  }
}
