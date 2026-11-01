# Progress

A module is marked **complete** only when its explanations, animations, exercises and quizzes
work in the real browser test (`tests/e2e/smoke.mjs`).

## Milestone 0: Foundation (done, 2026-11-01)

- [x] Inspected the repo: Jekyll on GitHub Pages, no Node at deploy time, Mermaid 11 already
      site-wide (with zoom), MathJax pattern in `learning-paper.html`, Digital Garden docs layout.
- [x] Chose the architecture: React islands in Shadow DOM, built by Vite into committed
      `assets/sd-lab/` (see ARCHITECTURE.md).
- [x] Curriculum structure (CURRICULUM.md, `src/content/curriculum.ts`) and navigation:
      garden sidebar, prev/next, root-page curriculum table and live progress board.
- [x] Shared visualization engine: Diagram (nodes, edges, packets, status, zoom/pan), timeline
      (play/pause/reset/step ±/0.5x–2x), Explain panel, wire inspector, InfoPanel,
      Metric/Slider/Toggle, LineChart, KnowledgeCheck, localStorage progress, blast-radius graph
      helper, M/M/c/K queue simulator.
- [x] `garden.html` hooks: `sd_lab: true` loads the bundle; `mathjax: true` loads MathJax.
- [x] Unit tests: 11 passing (simulator vs M/M/1 theory and Little's Law, blast radius, quiz
      integrity and answer-position spread).
- [x] E2E smoke test with system Chrome via playwright-core: ALL OK.

## Milestone 1: Module 1, Uber's API architecture evolution (done, 2026-11-01)

- [x] Verified the reference image against Uber's *Designing Edge Gateway* (2020). Corrected the
      generation labels (dispatch/messageType = Gen 1; RTAPI = Gen 2).
- [x] Note 01, Gen 1 dispatch/messageType: lab `gen1-dispatch` (8 steps), 2 Mermaid diagrams,
      availability math, exercise, challenge, 4-question quiz, references.
- [x] Note 02, Gen 2 RTAPI: lab `gen2-request` (7-step request lifecycle with TLS/auth/routing and
      wire payloads), lab `gen2-traffic` (live queueing simulation with presets, crash and
      bad-deploy toggles, p50/p95/p99, Little's Law), 3 Mermaid diagrams, all 10 Part A questions,
      exercise, challenge, 6-question quiz, references.
- [x] Note 03, Gen 3 Edge Gateway: lab `gen3-evolution` (5-phase transformation, 5 animated user
      flows, click-to-inspect, fail-any-service blast radius), lab `gen-compare` (4 scenarios side
      by side + comparison table), 2 Mermaid diagrams, all 10 Part B questions, exercise,
      challenge, 6-question quiz, references.

## Next: Milestone 2, Module 2 Part B (Uber H3)

- [ ] Add `h3-js`; confirm the v4 API (`latLngToCell`, `gridDisk`, `cellToBoundary`,
      `cellToParent`, `cellToChildren`, `getResolution`, `getHexagonEdgeLengthAvg`) against h3geo.org.
- [ ] Hex map lab (real indexes only), resolution/radius/driver/rider/area controls,
      cell inspector, nearby-driver query animation, resolution trade-off chart.
- [ ] Note 05 with sources from h3geo.org and the Uber H3 blog post.

## Later milestones

- [ ] M3: Module 2 Part A, ride lifecycle (8 stages).
- [ ] M4: Module 2 Part C, scaling lab.
- [ ] M5: Module 3, REST/GraphQL/gRPC + UberQL investigation.
- [ ] M6–M14: Syllabus notes 08–16 (calculators in 16).
- [ ] M15: Failure laboratory (17).

## Known limitations

- The site-wide `/favicon.ico` 404 predates this project; the smoke test ignores it.
- Progress is per browser (localStorage), by design: no backend.
