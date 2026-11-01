# Uber System Design Academy: interactive labs

Interactive, animation-first labs for the **System Design** guide in the Digital Garden
(`/digital-garden/system-design/`). Uber is the case study: start with one ride, find each
bottleneck, introduce the concept that fixes it, and animate the change.

- **Content** (SEO-friendly markdown notes): `../_garden/system-design.md` and `../_garden/system-design/*.md`
- **Labs** (React islands): this folder, built into `../assets/sd-lab/`
- **Plan and status:** [CURRICULUM.md](CURRICULUM.md), [PROGRESS.md](PROGRESS.md), [ARCHITECTURE.md](ARCHITECTURE.md)

## Stack

React 19 · TypeScript · Tailwind CSS 4 · Motion · Vite 8 · SVG + Canvas.
Planned for later modules: D3 (charts) and `h3-js` (the real Uber H3 library).

## Commands

```bash
cd system-design-lab
npm install
npm run build        # type-check + build into ../assets/sd-lab (commit the output)
npm test             # unit tests: queue simulator vs M/M/1 theory, blast radius, quizzes
npm run typecheck
```

GitHub Pages runs Jekyll only (no Node), so **`assets/sd-lab/` must be rebuilt and committed**
whenever anything in `src/` changes.

### End-to-end test (real Chrome)

```bash
# from the repo root: build the site (see the empty-plugins workaround)
echo "plugins: []" > _ovr.yml && jekyll build --config _config.yml,_ovr.yml; rm _ovr.yml
python -m http.server 4123 -d _site &
cd system-design-lab && node tests/e2e/smoke.mjs   # screenshots in tests/e2e/shots/
```

The smoke test opens every System Design page and checks:

- every lab mounts, with no console errors;
- step forward and back, Explain and the inspector work;
- failure injection changes flow health;
- the traffic simulator produces errors at 2.5× load and clears them after scaling out;
- quizzes give feedback;
- Mermaid diagrams render and no `$math$` is left unrendered.

## Embedding a lab in a note

```markdown
---
layout: garden
guide: system-design
sd_lab: true        # loads assets/sd-lab/sd-lab.js
mathjax: true       # optional: $inline$ and $$display$$ math
---

<div data-sd-lab="gen2-traffic"></div>
<div data-sd-lab="quiz" data-quiz="m1-gen2"></div>
```

Register new labs in `src/main.tsx` (`LABS`), quizzes in `src/content/quizzes.ts`, and lessons in
`src/content/curriculum.ts`. After editing note headings, run
`python scripts/garden_sections.py _garden/system-design.md _garden/system-design/*.md`.

## Accuracy rules

- Every Uber-specific claim cites a public source (Uber Engineering blog, h3geo.org, Uber GitHub).
- Each note's References section separates **documented Uber facts** from **illustrative** designs.
- Simulated metrics are labelled as estimates from a model, never as Uber telemetry.
