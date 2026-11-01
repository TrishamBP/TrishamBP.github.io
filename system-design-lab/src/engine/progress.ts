import { useEffect, useState } from "react";

/** Learning progress, stored locally in the reader's browser only. */
export interface Progress {
  quizzes: Record<string, { correct: number; total: number; at: number }>;
  labs: Record<string, number>;      // lab id -> first interaction time
  exercises: Record<string, number>; // exercise id -> marked done time
}

const KEY = "sd-lab-progress-v1";
const EVT = "sd-lab-progress";

export function load(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { quizzes: p.quizzes ?? {}, labs: p.labs ?? {}, exercises: p.exercises ?? {} };
  } catch {
    return { quizzes: {}, labs: {}, exercises: {} };
  }
}

function save(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(EVT));
}

export function recordQuiz(id: string, correct: number, total: number) {
  const p = load();
  const prev = p.quizzes[id];
  if (!prev || correct >= prev.correct) p.quizzes[id] = { correct, total, at: Date.now() };
  save(p);
}

export function recordLab(id: string) {
  const p = load();
  if (!p.labs[id]) { p.labs[id] = Date.now(); save(p); }
}

export function toggleExercise(id: string) {
  const p = load();
  if (p.exercises[id]) delete p.exercises[id]; else p.exercises[id] = Date.now();
  save(p);
}

export function resetProgress() { save({ quizzes: {}, labs: {}, exercises: {} }); }

/** Live progress shared by every lab island on the page (and other tabs). */
export function useProgress(): Progress {
  const [p, setP] = useState<Progress>(load);
  useEffect(() => {
    const on = () => setP(load());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener(EVT, on); window.removeEventListener("storage", on); };
  }, []);
  return p;
}
