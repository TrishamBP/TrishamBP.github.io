import { test } from "node:test";
import assert from "node:assert/strict";
import { blastRadius } from "../src/engine/graph.ts";

const E = [
  { from: "app", to: "edge" }, { from: "edge", to: "home" }, { from: "edge", to: "eats" },
  { from: "home", to: "pricing" }, { from: "eats", to: "menu" }, { from: "pricing", to: "fare" },
];
test("leaf failure degrades only its transitive callers", () => {
  assert.deepEqual([...blastRadius(E, ["menu"])].sort(), ["app", "eats", "edge"]);
});
test("failed node itself is not reported as degraded", () => {
  assert.ok(!blastRadius(E, ["fare"]).has("fare"));
  assert.deepEqual([...blastRadius(E, ["fare"])].sort(), ["app", "edge", "home", "pricing"]);
});
test("cycles terminate", () => {
  assert.deepEqual([...blastRadius([{ from: "a", to: "b" }, { from: "b", to: "a" }], ["a"])], ["b"]);
});
