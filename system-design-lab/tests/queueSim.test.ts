import { test } from "node:test";
import assert from "node:assert/strict";
import { QueueSim } from "../src/engine/sim/queueSim.ts";

const run = (sim: QueueSim, ms: number, dt = 10) => { for (let t = 0; t < ms; t += dt) sim.step(dt); return sim.snapshot(); };
const base = { instances: 1, queueCap: 100000, timeoutMs: 1e9 };

test("M/M/1 mean sojourn time matches 1/(mu - lambda)", () => {
  // lambda = 500/s, mu = 1000/s  ->  W = 1/(1000-500) s = 2 ms
  const sim = new QueueSim({ ...base, rps: 500, workers: 1, serviceMs: 1 }, 7);
  let sum = 0, k = 0;
  run(sim, 2000);
  for (let i = 0; i < 20; i++) { const s = run(sim, 2000); sum += s.mean; k++; }
  const W = sum / k;
  assert.ok(Math.abs(W - 2) < 0.25, `W=${W}`);
});

test("below capacity: throughput ~= offered load, no errors", () => {
  const sim = new QueueSim({ ...base, rps: 1000, workers: 64, serviceMs: 40 }, 1); // mu = 1600/s
  run(sim, 3000);
  const s = run(sim, 2000);
  assert.ok(Math.abs(s.throughput - 1000) / 1000 < 0.08, `thr=${s.throughput}`);
  assert.equal(s.errorRate, 0);
});

test("Little's Law: L = lambda * W", () => {
  const sim = new QueueSim({ ...base, rps: 1400, workers: 64, serviceMs: 40 }, 3);
  run(sim, 4000);
  const s = run(sim, 2000);
  assert.ok(Math.abs(s.inFlight - s.littleL) / s.littleL < 0.25, `L=${s.inFlight} lw=${s.littleL}`);
});

test("above capacity: throughput caps at mu, requests fail", () => {
  const sim = new QueueSim({ instances: 1, queueCap: 500, timeoutMs: 2000, rps: 3000, workers: 64, serviceMs: 40 }, 5);
  run(sim, 5000);
  const s = run(sim, 2000);
  assert.ok(Math.abs(s.throughput - 1600) / 1600 < 0.1, `thr=${s.throughput}`);
  assert.ok(s.errorRate > 0.4, `err=${s.errorRate}`);
  assert.ok(s.p99 > 200, `p99=${s.p99}`);
});

test("horizontal scaling: doubling instances doubles capacity", () => {
  const sim = new QueueSim({ instances: 2, queueCap: 500, timeoutMs: 2000, rps: 3000, workers: 64, serviceMs: 40 }, 5);
  run(sim, 5000);
  const s = run(sim, 2000);
  assert.equal(s.capacityRps, 3200);
  assert.ok(s.errorRate < 0.05, `err=${s.errorRate}`);
});

test("gateway down: everything fails", () => {
  const sim = new QueueSim({ ...base, rps: 500, workers: 8, serviceMs: 10, down: true }, 9);
  const s = run(sim, 2000);
  assert.equal(s.throughput, 0);
  assert.equal(s.errorRate, 1);
});
