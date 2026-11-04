---
layout: garden
guide: rust-sandbox
order: 14
note_no: "14"
nav_title: "Comments, docs and tests"
title: "Rust Comments, Doc Tests and Unit Tests: //!, ///, #[test] and cargo test"
seo_title: "Rust Doc Comments, Doc Tests & Unit Tests Explained (cargo test)"
description: "Rust documentation and testing explained: //, /// and //! comments, cargo doc, doc tests, #[cfg(test)] modules, #[test], assert_eq! and #[should_panic]."
keywords: "Rust doc comments, Rust doc tests, Rust unit tests, cargo test, cargo doc, Rust cfg(test), Rust assert_eq, Rust should_panic, Rust test module, Rust testing tutorial"
lede: "Rust documentation and tests live right next to the code they describe. This note covers the three kinds of comments, examples that cargo test actually runs, and the unit tests at the bottom of matrix.rs."
sections:
  - id: tst-comments
    title: "1\\. Three kinds of comments"
  - id: tst-docs
    title: "2\\. Module docs `//!`, item docs `///` and `cargo doc`"
  - id: tst-doctests
    title: "3\\. Doc tests: examples that can't go stale"
  - id: tst-module
    title: "4\\. Unit tests: `#[cfg(test)]` and `mod tests`"
  - id: tst-asserts
    title: "5\\. `#[test]` functions and the assertion macros"
  - id: tst-should-panic
    title: "6\\. `#[should_panic]`: testing that code fails correctly"
  - id: tst-helpers
    title: "7\\. Helper functions and float comparisons"
  - id: tst-loops
    title: "8\\. Table-driven tests: loops over cases"
  - id: tst-run
    title: "9\\. Running the tests"
  - id: tst-summary
    title: "Summary: Rust comments, docs and tests"
---

This is the last note, because it uses nearly everything before it: modules ([Note 13](/digital-garden/rust-sandbox/modules-use/)) for `mod tests`, derives for `assert_eq!`, and `Result` for `unwrap`. It's also the one that makes the rest of the code **trustworthy**.

## 1. Three kinds of comments
{: #tst-comments}

| Syntax | Name | What it documents |
|---|---|---|
| `//` | normal comment | nothing; only people read it |
| `///` | documentation comment | the item **below** it (a function, a struct, ...) |
| `//!` | module documentation comment | the file (module) that **contains** it |

`src/math/matrix.rs` uses `//` comments as section dividers:

```rust
// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
```

## 2. Module docs `//!`, item docs `///` and `cargo doc`
{: #tst-docs}

The file starts with module documentation:

```rust
//! Matrix and vector operations.
//!
//! - [`Vector`]: an `n`-dimensional vector that owns its components on the heap.
//! - [`Matrix2`]: a 2 × 2 matrix stored inline, used for 2-D rotations.
//! - [`DimensionMismatch`]: the error returned when two vectors have different lengths.
```

Doc comments are written in **Markdown**:

- Backticks (`` `n` ``) format text as code.
- **`` [`Vector`] ``** is an **intra-doc link**. In the generated documentation you can click it to jump to `Vector`. Rust resolves the name like code, and `cargo doc` warns about broken links.

Run **`cargo doc --open`**, and Rust builds a documentation website from these comments and opens it. It works like a Python module docstring, but it's rendered into browsable HTML, in the same format as the official docs at docs.rs.

Rust docs use a few standard Markdown headings: `# Examples`, **`# Panics`** (when the function panics, as on `Matrix2::get` in [Note 11](/digital-garden/rust-sandbox/error-handling-result/#err-panic)), `# Errors` (when it returns `Err`) and `# Safety`.

## 3. Doc tests: examples that can't go stale
{: #tst-doctests}

````rust
/// An `n`-dimensional vector of `f64` components.
///
/// ```
/// use shapes_demo::math::matrix::Vector;
/// let a = Vector::new(vec![1.0, 2.0, 3.0]);
/// assert_eq!(a.dimension(), 3);
/// ```
pub struct Vector { /* ... */ }
````

Code inside ```` ``` ```` in a `///` comment is a **real test**. `cargo test` compiles and runs it. If the example is wrong, the test fails, so **the documentation can't silently go out of date**. I broke the example on purpose (`3` → `4`):

```text
src\math\matrix.rs - math::matrix::Vector (line 45) --- FAILED
assertion `left == right` failed
  left: 3
 right: 4
```

Notice the first line of the example: `use shapes_demo::math::matrix::Vector;`. A doc test is compiled **as if it were a separate crate using your library**, so it starts from the crate name (like `main.rs` in [Note 13](/digital-garden/rust-sandbox/modules-use/#mod-paths)) and can only use public items. That's exactly what a reader of the docs would have to write.

### `text` blocks: "this isn't code"
{: #tst-text}

````rust
/// ```text
/// M = [ m₁₁  m₁₂ ]
///     [ m₂₁  m₂₂ ]
/// ```
````

The word `text` after the opening fence means *"don't compile or run this"*. The file uses it for maths. Drop the `text` and rustdoc tries to compile the formula as Rust, and fails:

```text
error: unknown start of token: \u{2081}
```

`\u{2081}` is the subscript `₁`, which isn't valid Rust.

## 4. Unit tests: `#[cfg(test)]` and `mod tests`
{: #tst-module}

The bottom of `matrix.rs` holds the unit tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::{approx_eq, DEFAULT_TOLERANCE};

    // ... test functions ...
}
```

- **`#[cfg(test)]`** is **conditional compilation**: the attribute ([Note 09](/digital-garden/rust-sandbox/derive/#der-glossary)) tells the compiler to include this block **only** when running `cargo test`. Your normal program doesn't contain the tests at all.
- **`mod tests { ... }`** declares a module **inside the file**. A module doesn't have to be a separate file ([Note 13](/digital-garden/rust-sandbox/modules-use/#mod-tree)).
- **`use super::*;`**: `super` is the parent module (`matrix`), and `*` means everything in it. It's like Python's `from parent import *`.
- **`use crate::math::{approx_eq, DEFAULT_TOLERANCE};`** imports two names in one line with braces.

### Tests can see private items
{: #tst-private}

`tests` is a **child** of `matrix`, and a child module can see its parent's private items ([visibility rule](/digital-garden/rust-sandbox/modules-use/#mod-pub)). So the tests can call the private helper and read the private field, even though `main.rs` can't:

```rust
#[test]
fn private_helper_is_visible_to_tests() {
    let a = Vector::new(vec![1.0]);
    let b = Vector::new(vec![1.0, 2.0]);
    assert_eq!(
        a.check_same_dimension(&b),
        Err(DimensionMismatch { left: 1, right: 2 })
    );
    assert_eq!(a.components, vec![1.0]);   // private field: fine here
}
```

## 5. `#[test]` functions and the assertion macros
{: #tst-asserts}

```rust
#[test]
fn new_moves_values_and_keeps_order() {
    let v = Vector::new(vec![1.0, -2.0, 3.5]);
    assert_eq!(v.dimension(), 3);
    assert_eq!(v.components(), &[1.0, -2.0, 3.5]);
    assert!(!v.is_empty());
}
```

- **`#[test]`** marks a function as a test. `cargo test` finds and runs it.
- A test **passes** if it finishes normally, and **fails** if it panics.

| Macro | Panics if | Python |
|---|---|---|
| `assert!(x)` | `x` is `false` | `assert x` |
| `assert_eq!(a, b)` | `a != b`, and prints both values | `assert a == b` |
| `assert_ne!(a, b)` | `a == b` | `assert a != b` |

In `!v.is_empty()`, the `!` means **not**. It isn't a macro, because no name comes directly before it.

`assert_eq!` prints both sides when it fails, which is far more useful than a bare "assertion failed":

```text
assertion `left == right` failed
  left: [0.1, 1.0]
 right: [0.0, 1.0]
```

### Why the derives matter in tests
{: #tst-derive}

```rust
assert_eq!(a.dot(&b), Ok(32.0));
```

This compares two `Result<f64, DimensionMismatch>` values. Rust can only compare them if **both** `f64` and `DimensionMismatch` implement `PartialEq`, and only print them on failure if both implement `Debug`. That's one more reason the error type derives `Debug` and `PartialEq` ([Note 09](/digital-garden/rust-sandbox/derive/#der-traits)).

### `unwrap` is fine in tests
{: #tst-unwrap}

```rust
let sum = a.checked_add(&b).unwrap();
assert_eq!(sum.components(), &[11.0, 22.0, 33.0]);
```

In a test, a panic from `unwrap` simply means "the test fails", which is exactly what you want. In library code, return the `Result` instead ([Note 11](/digital-garden/rust-sandbox/error-handling-result/#err-unwrap)).

## 6. `#[should_panic]`: testing that code fails correctly
{: #tst-should-panic}

```rust
#[test]
#[should_panic]
fn get_out_of_range_panics() {
    Matrix2::IDENTITY.get(2, 0);
}
```

This test passes **only if** the code panics. It proves the bounds check from [Note 11](/digital-garden/rust-sandbox/error-handling-result/#err-panic) works.

A stricter version also checks the panic message, so the test can't pass because of some unrelated panic:

```rust
#[should_panic(expected = "index out of bounds")]
```

## 7. Helper functions and float comparisons
{: #tst-helpers}

```rust
fn assert_vector2_eq(actual: Vector2, expected: Vector2) {
    assert!(
        approx_eq(actual[0], expected[0], DEFAULT_TOLERANCE)
            && approx_eq(actual[1], expected[1], DEFAULT_TOLERANCE),
        "expected {expected:?}, got {actual:?}"
    );
}
```

- No `#[test]` on it, so it's a **helper** that the tests call.
- `&&` means **and** ([Note 03](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-logic)).
- The second argument of `assert!` is the message shown when it fails.
- **`{expected:?}`** puts the variable straight into the text, in `Debug` format. It's like a Python f-string, `f"expected {expected!r}"`.

**Why not just `assert_eq!`?** Floating-point maths is rarely exact. A quarter turn of `[1, 0]` gives `[6.123233995736766e-17, 1.0]`, not `[0, 1]` ([Note 10](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-free)). So the helper accepts any difference up to `DEFAULT_TOLERANCE` (`1e-9`), via `approx_eq` from `src/math/mod.rs`:

```rust
pub const DEFAULT_TOLERANCE: f64 = 1e-9;

pub fn approx_eq(a: f64, b: f64, tolerance: f64) -> bool {
    (a - b).abs() <= tolerance
}
```

## 8. Table-driven tests: loops over cases
{: #tst-loops}

Instead of writing one test per input, loop over many inputs ([`for` loops](/digital-garden/rust-sandbox/iterators-closures/#itr-for)):

```rust
use std::f64::consts::{FRAC_PI_2, FRAC_PI_4, PI, TAU};

#[test]
fn rotation_keeps_length_and_determinant_is_one() {
    for theta in [-2.0, -0.3, 0.0, 0.7, FRAC_PI_2, 2.5, PI, 100.0] {
        let r = Matrix2::rotation(theta);
        assert!(approx_eq(r.determinant(), 1.0, DEFAULT_TOLERANCE));
    }
}

#[test]
fn rotations_compose() {
    for (alpha, beta) in [(0.3, 0.4), (1.0, -2.5), (PI, FRAC_PI_2)] {
        // rotating by alpha then beta == rotating by alpha + beta
    }
}
```

The constants come from the standard library:

| Name | Value |
|---|---|
| `PI` | π ≈ 3.14159 |
| `FRAC_PI_2` | π/2 (90°) |
| `FRAC_PI_4` | π/4 (45°) |
| `TAU` | 2π (360°, one full turn) |

A `use` line doesn't have to be at the top of a module. Here it sits just above the tests that need it.

## 9. Running the tests
{: #tst-run}

```text
cargo test                 # every unit test + every doc test
cargo test rotation        # only tests whose name contains "rotation"
cargo test --doc           # only the doc tests
```

For the demo project, `cargo test` reports the unit tests and the doc test separately:

```text
running 10 tests
test math::matrix::tests::checked_add_adds_components ... ok
test math::matrix::tests::get_out_of_range_panics - should panic ... ok
...
test result: ok. 10 passed; 0 failed

   Doc-tests shapes_demo
test src\math\matrix.rs - math::matrix::Vector (line 45) ... ok
test result: ok. 1 passed; 0 failed
```

## Summary: Rust comments, docs and tests
{: #tst-summary}

- `//` is for people, `///` documents the next item, `//!` documents the whole module. `cargo doc --open` turns them into a website.
- Doc comments are Markdown. `` [`Name`] `` links to an item, and `# Panics` / `# Errors` / `# Examples` are standard headings.
- Code blocks in doc comments are **doc tests**: compiled and run by `cargo test`, as an outside user of the crate would. Mark non-code blocks `text`.
- `#[cfg(test)] mod tests { use super::*; ... }` keeps unit tests next to the code, out of the real program, with access to private items.
- `#[test]` marks a test. `assert!`, `assert_eq!` and `assert_ne!` panic on failure, and `assert_eq!` needs `Debug` + `PartialEq`.
- `#[should_panic(expected = "...")]` tests that bugs are caught. Compare floats with a tolerance, never with `==`.
- Loop over arrays of inputs for table-driven tests, and filter with `cargo test <name>`.
