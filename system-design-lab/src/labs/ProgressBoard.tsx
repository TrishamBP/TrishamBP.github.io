import { CURRICULUM } from "../content/curriculum";
import { resetProgress, useProgress } from "../engine/progress";

export default function ProgressBoard() {
  const p = useProgress();
  const live = CURRICULUM.flatMap((m) => m.lessons).filter((l) => l.status === "live");
  const done = live.filter((l) => l.quiz && p.quizzes[l.quiz] && p.quizzes[l.quiz].correct === p.quizzes[l.quiz].total).length;
  return (
    <section className="rounded-2xl border border-lab-line bg-lab-panel p-4" aria-label="Your learning progress">
      <header className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-sky-300">Your progress</span>
        <h3 className="text-[15px] font-semibold text-white">{done}/{live.length} live lessons mastered</h3>
        <button type="button" onClick={() => { if (confirm("Reset your saved progress?")) resetProgress(); }}
          className="ml-auto text-[11px] text-lab-muted underline hover:text-white">reset</button>
      </header>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lab-raised">
        <div className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all" style={{ width: `${live.length ? (done / live.length) * 100 : 0}%` }} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {CURRICULUM.map((m) => (
          <div key={m.id}>
            <p className="text-xs font-semibold text-slate-200">{m.title}</p>
            <ol className="mt-1.5 space-y-1">
              {m.lessons.map((l) => {
                const q = l.quiz ? p.quizzes[l.quiz] : undefined;
                const tried = l.labs?.some((id) => p.labs[id]);
                const badge = l.status === "planned" ? "planned" : q ? `quiz ${q.correct}/${q.total}` : tried ? "in progress" : "not started";
                const tone = l.status === "planned" ? "text-lab-muted" : q && q.correct === q.total ? "text-emerald-300" : q || tried ? "text-amber-300" : "text-slate-400";
                return (
                  <li key={l.no} className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="font-mono text-[11px] text-lab-muted">{l.no}</span>
                    {l.status === "live"
                      ? <a href={`/digital-garden/system-design/${l.slug}/`} className="text-sky-200 hover:underline">{l.title}</a>
                      : <span className="text-slate-500">{l.title}</span>}
                    <span className={`ml-auto shrink-0 font-mono text-[10.5px] ${tone}`}>{badge}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-lab-muted">Progress is saved only in this browser (localStorage). Nothing is sent anywhere.</p>
    </section>
  );
}
