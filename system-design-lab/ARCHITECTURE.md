# Architecture

## Why islands inside Jekyll (not Next.js)

The site is a Jekyll site deployed by GitHub Pages, which can't run Node. A separate Next.js app
would mean a second deployment and would split the content away from the Digital Garden's docs
layout (sidebar, prev/next, SEO frontmatter).

Instead:

- **Notes stay markdown.** Text, Mermaid diagrams, math and references are indexable HTML that
  works without JavaScript. That's good for SEO and for readers.
- **Labs are React islands.** `<div data-sd-lab="name">` placeholders are mounted by
  `assets/sd-lab/sd-lab.js` (built by Vite from `src/main.tsx`).
- **Each island renders in a Shadow DOM.** Tailwind (including preflight) is injected into the
  shadow root, so lab styles can't leak into the site, and the site's heavy `.post-content` rules
  can't leak into labs. Tailwind v4's `@property` rules don't apply inside shadow roots, so
  `main.tsx` hoists them into `document.head` once.
- **Labs are lazy chunks.** A page downloads only the labs it embeds (React itself is shared).

```
_garden/system-design/*.md  ──(Jekyll)──►  HTML page
        │  <div data-sd-lab="gen2-traffic">
        ▼
assets/sd-lab/sd-lab.js  (entry: island loader + Tailwind CSS string)
        │  dynamic import()
        ▼
assets/sd-lab/chunks/Gen2Traffic-*.js  ─►  shadowRoot ─► React tree
```

## Source layout

```
src/
  main.tsx               island loader, shadow DOM, lab registry
  styles.css             Tailwind theme: lab palette + one colour per component kind
  engine/                reusable visualization engine
    types.ts             DNode / DEdge / Step / Packet / NodeInfo
    geometry.ts          border intersection, quadratic edges, easing
    Diagram.tsx          SVG topology: nodes (rect/circle/cylinder/phone/bar), edges,
                         animated packets, status (down/degraded/hot/dim), zoom + pan, legend
    useTimeline.ts       play / pause / reset / step ± / speed; packets are a pure
                         function of (step, t), so replay and step-back are exact
    Controls.tsx         toolbar, step chips, step panel with "Explain this step",
                         wire inspector (request/response bodies per step)
    LabFrame.tsx         lab card, InfoPanel (click-to-inspect), Metric, Slider, Toggle
    Chart.tsx            multi-series SVG line chart
    graph.ts             blast radius: transitive callers of failed nodes
    sim/queueSim.ts      discrete-event M/M/c/K queue with timeouts (tested vs theory)
  labs/                  one file per lab (lazy chunk)
tests/                   node --test unit tests; e2e/smoke.mjs (Playwright + system Chrome)
```

## Visual grammar

| Kind | Colour | Shape |
|---|---|---|
| Client | slate `#cbd5e1` | phone |
| Edge / proxy | amber `#fbbf24` | bar |
| API gateway | orange `#f59e0b` | rect |
| Presentation service | rose `#fb7185` | rect |
| Product service | orange `#fb923c` | rect |
| Domain microservice | sky `#38bdf8` | circle / rect |
| Database | violet `#a78bfa` | cylinder |
| Cache | red `#f87171` | rect |
| Message queue | green `#4ade80` | rect |

Packets: blue = request, green = response, red = error, yellow = event.
Mermaid diagrams in notes use the same palette via `classDef` with dark fills, which the site's
Mermaid dark-mode adapter leaves untouched.

## Simulation model (gateway overload lab)

- Arrivals: Poisson with rate λ. Service time: exponential with mean S.
- Each instance has c workers and a bounded FIFO queue; clients give up after a timeout.
- The simulator is event-accurate inside each 10 ms tick: a freed worker immediately pulls the
  next request, so there are no tick-size artefacts.
- It's validated in `tests/queueSim.test.ts`:
  - M/M/1 mean sojourn time = 1/(μ−λ);
  - throughput = λ below capacity;
  - Little's Law L = λW;
  - throughput caps at μ under overload;
  - capacity scales linearly with instances.
