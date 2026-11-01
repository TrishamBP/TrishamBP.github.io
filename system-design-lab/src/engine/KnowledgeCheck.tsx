import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { recordQuiz, useProgress } from "./progress";
import { shuffled } from "./shuffle";

export interface Question {
  q: string;
  options: string[];
  answer: number;
  /** Why the answer is right, and why the tempting wrong answer is wrong. */
  why: string;
}

export interface Quiz { id: string; title: string; questions: Question[] }

export function KnowledgeCheck({ quiz: raw }: { quiz: Quiz }) {
  const quiz = useMemo(() => ({ ...raw, questions: raw.questions.map(shuffled) }), [raw]);
  const [picked, setPicked] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const progress = useProgress();
  const best = progress.quizzes[quiz.id];
  const answered = picked.filter((x) => x !== null).length;
  const correct = picked.filter((x, i) => x === quiz.questions[i].answer).length;

  const choose = (qi: number, oi: number) => {
    if (picked[qi] !== null) return;
    const next = picked.slice();
    next[qi] = oi;
    setPicked(next);
    if (next.every((x) => x !== null)) {
      recordQuiz(quiz.id, next.filter((x, i) => x === quiz.questions[i].answer).length, quiz.questions.length);
    }
  };

  return (
    <section className="rounded-2xl border border-lab-line bg-lab-panel p-4" aria-label={`Knowledge check: ${quiz.title}`}>
      <header className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-300">Knowledge check</span>
        <h3 className="text-[15px] font-semibold text-white">{quiz.title}</h3>
        <span className="ml-auto font-mono text-xs text-lab-muted">
          {answered === quiz.questions.length ? `score ${correct}/${quiz.questions.length}` : `${answered}/${quiz.questions.length} answered`}
          {best && ` · best ${best.correct}/${best.total}`}
        </span>
      </header>
      <ol className="mt-3 space-y-4">
        {quiz.questions.map((q, qi) => {
          const p = picked[qi];
          return (
            <li key={qi}>
              <p className="text-sm font-medium text-slate-100">{qi + 1}. {q.q}</p>
              <div className="mt-2 grid gap-1.5" role="radiogroup" aria-label={`Question ${qi + 1}`}>
                {q.options.map((o, oi) => {
                  const state = p === null ? "idle" : oi === q.answer ? "right" : oi === p ? "wrong" : "idle";
                  return (
                    <button key={oi} type="button" role="radio" aria-checked={p === oi} disabled={p !== null} onClick={() => choose(qi, oi)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        state === "right" ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-100"
                          : state === "wrong" ? "border-rose-400/70 bg-rose-500/15 text-rose-100"
                          : p === null ? "border-lab-line bg-lab-raised text-slate-200 hover:border-slate-500" : "border-lab-line bg-lab-raised text-lab-muted"
                      }`}>
                      <span className="mr-2 font-mono text-xs text-lab-muted">{String.fromCharCode(65 + oi)}</span>{o}
                    </button>
                  );
                })}
              </div>
              {p !== null && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className={`mt-2 rounded-lg border-l-2 bg-lab-raised px-3 py-2 text-sm text-slate-300 ${p === q.answer ? "border-emerald-400" : "border-rose-400"}`}>
                  <b className={p === q.answer ? "text-emerald-300" : "text-rose-300"}>{p === q.answer ? "Correct. " : "Not quite. "}</b>{q.why}
                </motion.p>
              )}
            </li>
          );
        })}
      </ol>
      {answered === quiz.questions.length && (
        <button type="button" onClick={() => setPicked(quiz.questions.map(() => null))}
          className="mt-4 rounded-md border border-lab-line bg-lab-raised px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500">
          Try again
        </button>
      )}
    </section>
  );
}
