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
  - id: intro-concepts
    title: "Rust concept index: where each idea is explained"
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
    ├── lib.rs              <- library crate root (Note 10)
    ├── main.rs             <- binary that uses the library (Note 10)
    ├── point.rs            <- Point + Display (Note 10)
    └── math/
        ├── mod.rs          <- declares the modules, DEFAULT_TOLERANCE, approx_eq
        ├── matrix.rs       <- the main file: DimensionMismatch, Vector, Vector2,
        │                      Matrix2, rotate_vector and the tests (Notes 01-11)
        ├── complex.rs      <- Complex, + via the Add trait (Notes 05, 06)
        ├── magnitude.rs    <- the Magnitude trait (Note 05)
        └── trigonometry.rs <- sin_cos (Notes 07, 10)
```

Create it with `cargo new --lib shapes_demo`, add the files as each note shows them, and run `cargo run`. Put small experiments in `examples/<name>.rs` and run them with `cargo run --example <name>`. Run `cargo test` for the unit tests and doc tests ([Note 11](/digital-garden/rust-sandbox/doc-comments-tests/)).

I compiled every snippet and every quoted compiler error in this guide with **Rust 1.99**, so you should see the same messages.

## Rust concept index: where each idea is explained
{: #intro-concepts}

Every concept is explained in **one** place. Other notes link back to it instead of repeating it. Use this table to jump straight to a concept:

| Concept | Note |
|---|---|
| [Ownership, move, drop](/digital-garden/rust-sandbox/ownership-borrowing/#own-rules) | 01 |
| [Borrowing `&T` / `&mut T`, `self` / `&self` / `&mut self`](/digital-garden/rust-sandbox/ownership-borrowing/#own-self) | 01 |
| [`struct`, `impl`, `Display`, `write!`](/digital-garden/rust-sandbox/structs-impl-display/) | 02 |
| [Implicit return (last line without `;`)](/digital-garden/rust-sandbox/structs-impl-display/#dsp-semicolon) | 02 |
| [Private fields and encapsulation](/digital-garden/rust-sandbox/methods-constructors/#mth-encapsulation) | 03 |
| [`Vec<T>` and generic parameters](/digital-garden/rust-sandbox/methods-constructors/#mth-struct) | 03 |
| [Associated functions vs methods, `Self`, field init shorthand](/digital-garden/rust-sandbox/methods-constructors/#mth-assoc-vs-method) | 03 |
| [Naming conventions (`new`, `from_`, `into_`, `as_`, `to_`)](/digital-garden/rust-sandbox/methods-constructors/#mth-naming) | 03 |
| [Slices `&[T]`, `to_vec`](/digital-garden/rust-sandbox/slices-lifetimes/#slc-what) | 04 |
| [Deref coercion `&Vec<T>` → `&[T]`](/digital-garden/rust-sandbox/slices-lifetimes/#slc-components) | 04 |
| [Lifetimes and lifetime elision](/digital-garden/rust-sandbox/slices-lifetimes/#slc-elision) | 04 |
| [Traits, generics, `impl Trait`, `dyn Trait`](/digital-garden/rust-sandbox/traits/) | 05 |
| [`#[derive]` and attributes](/digital-garden/rust-sandbox/derive/) | 06 |
| [Arrays `[T; N]`, type aliases](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-arrays) | 07 |
| [`const`, associated constants, `const fn`](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-const) | 07 |
| [Destructuring and tuples](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-destructure) | 07 |
| [Free functions, number literals](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-free) | 07 |
| [Enums, `Result`, `Ok`, `Err`, `match`](/digital-garden/rust-sandbox/error-handling-result/#err-enum) | 08 |
| [`if` as an expression](/digital-garden/rust-sandbox/error-handling-result/#err-if) | 08 |
| [The `?` operator](/digital-garden/rust-sandbox/error-handling-result/#err-question) | 08 |
| [`std::error::Error`, `Box<dyn Error>`](/digital-garden/rust-sandbox/error-handling-result/#err-error-trait) | 08 |
| [`unwrap`, `expect`, panics vs `Result`](/digital-garden/rust-sandbox/error-handling-result/#err-unwrap) | 08 |
| [Iterators: `iter`, `zip`, `map`, `collect`, `sum`](/digital-garden/rust-sandbox/iterators-closures/#itr-chain) | 09 |
| [Closures](/digital-garden/rust-sandbox/iterators-closures/#itr-closures) | 09 |
| [Type inference and the turbofish `::<>`](/digital-garden/rust-sandbox/iterators-closures/#itr-turbofish) | 09 |
| [`for` loops and ranges `0..2`, `0..=2`](/digital-garden/rust-sandbox/iterators-closures/#itr-for) | 09 |
| [Modules, `use`, `crate::`, `pub`](/digital-garden/rust-sandbox/modules-use/) | 10 |
| [Comments `//`, `///`, `//!` and `cargo doc`](/digital-garden/rust-sandbox/doc-comments-tests/#tst-comments) | 11 |
| [Doc tests](/digital-garden/rust-sandbox/doc-comments-tests/#tst-doctests) | 11 |
| [`#[cfg(test)]`, `mod tests`, `use super::*`](/digital-garden/rust-sandbox/doc-comments-tests/#tst-module) | 11 |
| [`#[test]`, `assert_eq!`, `#[should_panic]`](/digital-garden/rust-sandbox/doc-comments-tests/#tst-asserts) | 11 |

## The notes in this Rust guide
{: #intro-notes}

Each note builds on the one before it:
