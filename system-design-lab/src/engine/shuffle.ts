import type { Question } from "./KnowledgeCheck";

/** Stable per-question option order (seeded by the question text), so the
 *  right answer isn't always in the position it was authored in. */
export function shuffled(q: Question): Question {
  let h = 2166136261;
  for (let i = 0; i < q.q.length; i++) h = Math.imul(h ^ q.q.charCodeAt(i), 16777619);
  const idx = q.options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    const j = h % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return { ...q, options: idx.map((i) => q.options[i]), answer: idx.indexOf(q.answer) };
}

