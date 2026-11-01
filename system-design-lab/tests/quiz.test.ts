import { test } from "node:test";
import assert from "node:assert/strict";
import { QUIZZES } from "../src/content/quizzes.ts";
import { shuffled } from "../src/engine/shuffle.ts";

test("every quiz answer index is valid and survives shuffling", () => {
  for (const quiz of Object.values(QUIZZES)) {
    for (const q of quiz.questions) {
      assert.ok(q.answer >= 0 && q.answer < q.options.length, q.q);
      const s = shuffled(q);
      assert.equal(s.options[s.answer], q.options[q.answer]);
      assert.deepEqual([...s.options].sort(), [...q.options].sort());
    }
  }
});

test("shuffled answers are not all in the same position", () => {
  const pos = Object.values(QUIZZES).flatMap((z) => z.questions.map((q) => shuffled(q).answer));
  console.log("answer positions:", pos.map((i) => "ABCD"[i]).join(""));
  const counts = [0, 1, 2, 3].map((i) => pos.filter((p) => p === i).length);
  assert.ok(Math.max(...counts) <= pos.length * 0.5, `counts ${counts}`);
});
