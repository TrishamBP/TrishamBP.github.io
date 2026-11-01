---
layout: garden
guide: rust-sandbox
guide_root: true
card_order: 1
order: 0
nav_title: "Introduction"
title: The Rust Sandbox
seo_title: "The Rust Sandbox: Rust Programming Notes & Learning Guide"
description: "The Rust Sandbox: Rust programming notes and a beginner-friendly learning guide to ownership, borrowing, structs, traits, #[derive] and modules, with real code."
keywords: "Rust programming notes, learn Rust, Rust learning guide, Rust study guide, Rust for Python developers, Rust ownership, Rust traits, Rust derive, Rust modules, Trisham Patil"
tag: Rust
logo: /assets/images/garden/rust-crab.svg
logo_alt: "Rust crab logo for The Rust Sandbox Rust programming notes"
card_text: "My Rust programming notes, written while I learn the language: ownership, borrowing, lifetimes, traits and fearless concurrency, broken down from first principles into a study guide you can learn from too."
lede: "A living Rust learning guide, built in public. These are my notes from studying and experimenting with the Rust programming language, rewritten so another engineer can pick up each idea quickly and see why Rust works the way it does."
status: Growing
sections:
  - id: intro-how
    title: "How to use this Rust learning guide"
  - id: demo-project
    title: "The demo project used in these Rust notes"
  - id: intro-notes
    title: "The notes in this Rust guide"
---

## How to use this Rust learning guide
{: #intro-how}

These Rust programming notes come from reading real Rust code and asking "why?" at every line. Each note takes one idea, explains it in plain English first, and then backs it up with code you can run.

- **Read in order.** The notes go from the foundation (ownership) up to how files fit together (modules). Each one links back to what it builds on.
- **Use the sidebar.** Click a note to open it, or a subsection to jump straight to that part. **Next →** at the bottom of every page continues the path.
- **Run the code.** Every snippet comes from one small demo project (below). Breaking the code on purpose and reading the compiler error is the fastest way to learn Rust.
- **Coming from Python?** Most sections compare the Rust idea with its closest Python equivalent.

## The demo project used in these Rust notes
{: #demo-project}

Every note uses one small Cargo project, `shapes_demo`, so the examples connect. Each note shows the files it needs. This is the whole project:

```text
shapes_demo/
├── Cargo.toml
├── examples/               <- small experiments: cargo run --example <name>
└── src/
    ├── lib.rs              <- library crate root (Note 05)
    ├── main.rs             <- binary that uses the library (Note 05)
    ├── point.rs            <- Point + Display (Note 05)
    └── math/
        ├── mod.rs          <- declares the math modules, approx_eq (Notes 04, 05)
        ├── vector.rs       <- Vector: heap data, len/scale/into_inner (Notes 01, 04)
        ├── matrix.rs       <- DimensionMismatch + Display, Matrix2 (Notes 02, 04)
        ├── complex.rs      <- Complex, + via the Add trait (Notes 03, 04)
        ├── magnitude.rs    <- the Magnitude trait (Note 03)
        └── trigonometry.rs <- sin_cos (Note 05)
```

Create it with `cargo new --lib shapes_demo`, add the files as each note shows them, and run `cargo run`. Put small experiments in `examples/<name>.rs` and run them with `cargo run --example <name>`.

I compiled every snippet and every quoted compiler error in this guide with **Rust 1.99**, so you should see the same messages.

## The notes in this Rust guide
{: #intro-notes}

Each note builds on the one before it:
