---
layout: garden
guide: rust-sandbox
guide_root: true
card_order: 1
order: 0
nav_title: "Introduction"
title: The Rust Sandbox
seo_title: "The Rust Sandbox: Rust Programming Notes & Learning Guide"
description: "The Rust Sandbox: beginner-friendly Rust programming notes and learning guide to variables, ownership, borrowing, structs, traits and modules, with real code."
keywords: "Rust programming notes, learn Rust, Rust learning guide, Rust study guide, Rust for Python developers, Rust variables, Rust ownership, Rust traits, Rust derive, Rust modules, Trisham Patil"
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

- **Read in order.** The notes go from the foundations (variables and data types, then ownership) up to how files fit together (modules). Each one links back to what it builds on.
- **Use the sidebar.** Click a note to open it, or a subsection to jump straight to that part. **Next →** at the bottom of every page continues the path.
- **Run the code.** Every snippet comes from one small demo project (below). Breaking the code on purpose and reading the compiler error is the fastest way to learn Rust.
- **Coming from Python?** Most sections compare the Rust idea with its closest Python equivalent.

## The demo project used in these Rust notes
{: #demo-project}

Every note uses one small Cargo project, `shapes_demo`, so the examples connect. Each note shows the files it needs. This is the whole project:

```text
shapes_demo/
├── Cargo.toml
├── examples/
│   ├── variables.rs        <- cargo run --example variables (Note 01)
│   ├── numbers.rs          <- cargo run --example numbers (Note 02)
│   └── text.rs             <- cargo run --example text (Note 03)
└── src/
    ├── lib.rs              <- library crate root (Note 13)
    ├── main.rs             <- binary that uses the library (Note 13)
    ├── point.rs            <- Point + Display (Note 13)
    └── math/
        ├── mod.rs          <- declares the modules, DEFAULT_TOLERANCE, approx_eq
        ├── matrix.rs       <- the main file: DimensionMismatch, Vector, Vector2,
        │                      Matrix2, rotate_vector and the tests (Notes 04-14)
        ├── complex.rs      <- Complex, + via the Add trait (Notes 08, 09)
        ├── magnitude.rs    <- the Magnitude trait (Note 08)
        └── trigonometry.rs <- sin_cos (Notes 10, 13)
```

Create it with `cargo new --lib shapes_demo`, add the files as each note shows them, and run `cargo run`. Put small experiments in `examples/<name>.rs` and run them with `cargo run --example <name>`. Run `cargo test` for the unit tests and doc tests ([Note 14](/digital-garden/rust-sandbox/doc-comments-tests/)).

I compiled every snippet and every quoted compiler error in this guide with **Rust 1.99**, so you should see the same messages.

## Rust concept index: where each idea is explained
{: #intro-concepts}

Every concept is explained in **one** place. Other notes link back to it instead of repeating it. Use this table to jump straight to a concept:

| Concept | Note |
|---|---|
| [`let`, type inference and annotations](/digital-garden/rust-sandbox/variables-mutability/#var-let) | 01 |
| [`println!` interpolation `{}`, `{name}`, `{:?}`, `{:.2}`](/digital-garden/rust-sandbox/variables-mutability/#var-print) | 01 |
| [Positional `{0}` and named arguments in `println!`](/digital-garden/rust-sandbox/variables-mutability/#var-positional) | 01 |
| [Unused variables, `_name` and `_`](/digital-garden/rust-sandbox/variables-mutability/#var-underscore) | 01 |
| [Immutable by default, `let mut`](/digital-garden/rust-sandbox/variables-mutability/#var-mut) | 01 |
| [Rust error codes, `rustc --explain`](/digital-garden/rust-sandbox/variables-mutability/#var-error-codes) | 01 |
| [Shadowing vs `mut`](/digital-garden/rust-sandbox/variables-mutability/#var-shadowing) | 01 |
| [Scopes and blocks as expressions](/digital-garden/rust-sandbox/variables-mutability/#var-scopes) | 01 |
| [`const` vs `let`, `static`](/digital-garden/rust-sandbox/variables-mutability/#var-const) | 01 |
| [Type aliases `type X = Y;`](/digital-garden/rust-sandbox/variables-mutability/#var-alias) | 01 |
| [Lints and compiler directives `#[allow]`, `#![allow]`, `deny`](/digital-garden/rust-sandbox/variables-mutability/#var-directives) | 01 |
| [Data types overview: scalar vs compound](/digital-garden/rust-sandbox/integers-floats-casting/#num-types) | 02 |
| [Integer types `i8`...`u128`, `MIN`/`MAX`](/digital-garden/rust-sandbox/integers-floats-casting/#num-integers) | 02 |
| [Number literals: `1_000_000`, `3_u8`, `0xff`, `0b1010`](/digital-garden/rust-sandbox/integers-floats-casting/#num-literals) | 02 |
| [`usize` and `isize`](/digital-garden/rust-sandbox/integers-floats-casting/#num-usize) | 02 |
| [Floats `f64` / `f32`, `NaN`, `inf`](/digital-garden/rust-sandbox/integers-floats-casting/#num-floats) | 02 |
| [Format specifiers `{:.2}`, `{:8.3}`, `{:e}`, `{:x}`](/digital-garden/rust-sandbox/integers-floats-casting/#num-format) | 02 |
| [Casting with `as`, `try_from`, `From`](/digital-garden/rust-sandbox/integers-floats-casting/#num-as) | 02 |
| [Math operators, integer division, `pow`, `sqrt`](/digital-garden/rust-sandbox/integers-floats-casting/#num-math) | 02 |
| [Integer overflow, `checked_` / `wrapping_` / `saturating_`](/digital-garden/rust-sandbox/integers-floats-casting/#num-overflow) | 02 |
| [Augmented assignment `+=`, no `++`](/digital-garden/rust-sandbox/integers-floats-casting/#num-augmented) | 02 |
| [`bool`, no truthy values](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-bool) | 03 |
| [Boolean inversion `!`](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-not) | 03 |
| [Equality and comparison `==`, `!=`, `<`, `>`](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-compare) | 03 |
| [`&&`, <code>&#124;&#124;</code> and short-circuiting](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-logic) | 03 |
| [`char`, Unicode](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-char) | 03 |
| [`&str` vs `String`](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-strings) | 03 |
| [Escape sequences and raw strings `r"..."`, `r#"..."#`](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-raw) | 03 |
| [Calling methods, `len` vs `chars().count()`](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-methods) | 03 |
| [The `dbg!` macro](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-dbg) | 03 |
| [Ownership, move, drop](/digital-garden/rust-sandbox/ownership-borrowing/#own-rules) | 04 |
| [Borrowing `&T` / `&mut T`, `self` / `&self` / `&mut self`](/digital-garden/rust-sandbox/ownership-borrowing/#own-self) | 04 |
| [`struct`, `impl`, `Display`, `write!`](/digital-garden/rust-sandbox/structs-impl-display/) | 05 |
| [Implicit return (last line without `;`)](/digital-garden/rust-sandbox/structs-impl-display/#dsp-semicolon) | 05 |
| [Private fields and encapsulation](/digital-garden/rust-sandbox/methods-constructors/#mth-encapsulation) | 06 |
| [`Vec<T>` and generic parameters](/digital-garden/rust-sandbox/methods-constructors/#mth-struct) | 06 |
| [Associated functions vs methods, `Self`, field init shorthand](/digital-garden/rust-sandbox/methods-constructors/#mth-assoc-vs-method) | 06 |
| [Naming conventions (`new`, `from_`, `into_`, `as_`, `to_`)](/digital-garden/rust-sandbox/methods-constructors/#mth-naming) | 06 |
| [Slices `&[T]`, `to_vec`](/digital-garden/rust-sandbox/slices-lifetimes/#slc-what) | 07 |
| [Deref coercion `&Vec<T>` → `&[T]`](/digital-garden/rust-sandbox/slices-lifetimes/#slc-components) | 07 |
| [Lifetimes and lifetime elision](/digital-garden/rust-sandbox/slices-lifetimes/#slc-elision) | 07 |
| [Traits, generics, `impl Trait`, `dyn Trait`](/digital-garden/rust-sandbox/traits/) | 08 |
| [`#[derive]` and attributes](/digital-garden/rust-sandbox/derive/) | 09 |
| [Arrays `[T; N]`, reading/writing elements, out of bounds](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-arrays) | 10 |
| [Associated constants, `const fn`](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-const) | 10 |
| [Destructuring and tuples](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-destructure) | 10 |
| [Free functions](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-free) | 10 |
| [Enums, `Result`, `Ok`, `Err`, `match`](/digital-garden/rust-sandbox/error-handling-result/#err-enum) | 11 |
| [`if` as an expression](/digital-garden/rust-sandbox/error-handling-result/#err-if) | 11 |
| [The `?` operator](/digital-garden/rust-sandbox/error-handling-result/#err-question) | 11 |
| [`std::error::Error`, `Box<dyn Error>`](/digital-garden/rust-sandbox/error-handling-result/#err-error-trait) | 11 |
| [`unwrap`, `expect`, panics vs `Result`](/digital-garden/rust-sandbox/error-handling-result/#err-unwrap) | 11 |
| [Iterators: `iter`, `zip`, `map`, `collect`, `sum`](/digital-garden/rust-sandbox/iterators-closures/#itr-chain) | 12 |
| [Closures](/digital-garden/rust-sandbox/iterators-closures/#itr-closures) | 12 |
| [Type inference and the turbofish `::<>`](/digital-garden/rust-sandbox/iterators-closures/#itr-turbofish) | 12 |
| [`for` loops and ranges `0..2`, `0..=2`](/digital-garden/rust-sandbox/iterators-closures/#itr-for) | 12 |
| [Modules, `use`, `crate::`, `pub`](/digital-garden/rust-sandbox/modules-use/) | 13 |
| [Comments `//`, `///`, `//!` and `cargo doc`](/digital-garden/rust-sandbox/doc-comments-tests/#tst-comments) | 14 |
| [Doc tests](/digital-garden/rust-sandbox/doc-comments-tests/#tst-doctests) | 14 |
| [`#[cfg(test)]`, `mod tests`, `use super::*`](/digital-garden/rust-sandbox/doc-comments-tests/#tst-module) | 14 |
| [`#[test]`, `assert_eq!`, `#[should_panic]`](/digital-garden/rust-sandbox/doc-comments-tests/#tst-asserts) | 14 |

## The notes in this Rust guide
{: #intro-notes}

Each note builds on the one before it:
