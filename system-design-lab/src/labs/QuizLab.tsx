import { KnowledgeCheck } from "../engine/KnowledgeCheck";
import { QUIZZES } from "../content/quizzes";

export default function QuizLab({ el }: { el: HTMLElement }) {
  const quiz = QUIZZES[el.dataset.quiz ?? ""];
  if (!quiz) return <p style={{ color: "#f43f5e" }}>Unknown quiz "{el.dataset.quiz}".</p>;
  return <KnowledgeCheck quiz={quiz} />;
}
