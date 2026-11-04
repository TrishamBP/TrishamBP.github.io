---
layout: garden
guide: rust-sandbox
order: 11
note_no: "11"
nav_title: "Error handling: Result and ?"
title: "Rust Error Handling: Result, Enums, the ? Operator and Panics"
seo_title: "Rust Error Handling Explained: Result, ?, std::error::Error & Panics"
description: "Rust error handling for beginners: enums, Result, Ok and Err, match, the ? operator, std::error::Error, Box<dyn Error>, unwrap vs expect and when to panic."
keywords: "Rust error handling, Rust Result, Rust Ok Err, Rust question mark operator, Rust enum, Rust match, std::error::Error, Box dyn Error, Rust unwrap vs expect, Rust panic"
lede: "Rust has no exceptions. Errors are ordinary values in the return type, so the compiler makes sure you deal with them. This note follows one error, DimensionMismatch, from where it's created to where it's handled."
sections:
  - id: err-struct
    title: "1\\. Why the error is a struct, not a text message"
  - id: err-enum
    title: "2\\. Enums: a type that is one of several variants"
  - id: err-result
    title: "3\\. `Result<T, E>`, `Ok` and `Err`"
  - id: err-if
    title: "4\\. `if` is an expression"
  - id: err-match
    title: "5\\. `match`: handle every case"
  - id: err-question
    title: "6\\. The `?` operator: pass the error up"
  - id: err-error-trait
    title: "7\\. `std::error::Error` and `Box<dyn Error>`"
  - id: err-must-use
    title: "8\\. Ignoring a `Result` is a warning"
  - id: err-unwrap
    title: "9\\. `unwrap` and `expect`: \"I'm sure this is `Ok`\""
  - id: err-panic
    title: "10\\. Panics: for bugs, not for expected errors"
  - id: err-summary
    title: "Summary: Rust error handling"
---

Adding a 2-component vector to a 3-component vector is meaningless. Python would `raise` an exception. Rust's `Vector::checked_add` instead **returns** an error as a value, and the type system makes sure the caller can't ignore it.

This note builds on the error type from [Note 05](/digital-garden/rust-sandbox/structs-impl-display/) and on traits ([Note 08](/digital-garden/rust-sandbox/traits/)).

## 1. Why the error is a struct, not a text message
{: #err-struct}

```rust
pub struct DimensionMismatch {
    pub left: usize,
    pub right: usize,
}
```

The error could have been a `String` like `"sizes 2 and 3 differ"`. A struct is better because it **keeps the numbers**. The caller can write `if e.left > e.right { ... }` in code. With only a message, the caller would have to parse text to get the numbers back.

The human-readable text still exists: that's the `Display` impl from [Note 05](/digital-garden/rust-sandbox/structs-impl-display/#dsp-display). The fields are `pub` on purpose, so callers can read `error.left` directly.

## 2. Enums: a type that is one of several variants
{: #err-enum}

A **struct** holds several values **at once** (`left` **and** `right`). An **enum** holds **exactly one of several** variants:

```rust
enum Result<T, E> {
    Ok(T),    // success, carrying a value of type T
    Err(E),   // failure, carrying an error of type E
}
```

That's (simplified) how the standard library defines `Result`. Each variant can carry data. A `Result` is **either** `Ok` with a value **or** `Err` with an error, never both, never neither.

Its sibling **`Option<T>`** works the same way for "maybe there's no value": `Some(value)` or `None`. Rust uses it instead of `null`/`None` checks.

## 3. `Result<T, E>`, `Ok` and `Err`
{: #err-result}

Here is the private helper that every vector operation calls first:

```rust
fn check_same_dimension(&self, other: &Vector) -> Result<(), DimensionMismatch> {
    if self.dimension() == other.dimension() {
        Ok(())
    } else {
        Err(DimensionMismatch {
            left: self.dimension(),
            right: other.dimension(),
        })
    }
}
```

- There's **no `pub`**, so it's a private helper. Only code in this module can call it.
- `other: &Vector` borrows a second vector.
- The return type is `Result<(), DimensionMismatch>`. `T` is `()`, the unit type ("no value", see [Note 05](/digital-garden/rust-sandbox/structs-impl-display/#dsp-result)). So `Ok(())` means *"success, and nothing to hand back"*: the check passed.

The big difference from Python: the possible error is **written in the signature**. You can't call this function and forget that it might fail.

## 4. `if` is an expression
{: #err-if}

In Rust, `if ... { A } else { B }` **produces a value**: either `A` or `B`. Above, it produces `Ok(())` or `Err(...)`, and because it's the last expression in the function (no `;`), that value is returned.

It works anywhere, much like Python's `A if condition else B`:

```rust
let n = 3;
let kind = if n % 2 == 0 { "even" } else { "odd" };   // "odd"
```

Both branches must produce the **same type**.

## 5. `match`: handle every case
{: #err-match}

`match` compares a value against **patterns** and runs the first arm that fits. It's the most direct way to handle a `Result`:

```rust
match a.checked_add(&b) {
    Ok(sum) => println!("sum = {:?}", sum),
    Err(e) => println!("cannot add: {e}"),
}
```

`Ok(sum)` both **checks** the variant and **unpacks** the value inside into `sum` (destructuring, as in [Note 10](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-destructure)).

`match` must be **exhaustive**. Forget the `Err` arm and the build fails:

```text
error[E0004]: non-exhaustive patterns: `Err(_)` not covered
```

This is how Rust guarantees that the error case is handled, not merely hoped about.

## 6. The `?` operator: pass the error up
{: #err-question}

`checked_add` needs to stop as soon as the dimension check fails:

```rust
pub fn checked_add(&self, other: &Vector) -> Result<Vector, DimensionMismatch> {
    self.check_same_dimension(other)?;
    // ... add the components (Note 12) ...
    Ok(Vector { components })
}
```

`?` means: **"If this is `Err`, return that error from this function right now. If it's `Ok`, unwrap the value and keep going."** Without `?`, you'd write:

```rust
match self.check_same_dimension(other) {
    Ok(()) => {}
    Err(e) => return Err(e),
}
```

It feels like Python's exceptions bubbling up to the caller, but **visible**: every place where an error can leave a function is marked with a `?`.

`?` only works inside a function that itself returns a `Result` (or an `Option`). Use it in a plain `fn main()` and you get:

```text
error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option`
```

### `?` can also convert the error type
{: #err-from}

`?` does one more thing: before returning the error, it calls `From::from` on it. So an error can be converted into the caller's error type automatically. The next section relies on this.

## 7. `std::error::Error` and `Box<dyn Error>`
{: #err-error-trait}

```rust
impl std::error::Error for DimensionMismatch {}
```

`std::error::Error` is the standard trait for *"this type is an error"*. The block is **empty** because every method of the trait has a default body ([provided methods](/digital-garden/rust-sandbox/traits/#trt-define)).

The trait has two **supertraits** ([Note 08](/digital-garden/rust-sandbox/traits/#trt-std)): an `Error` must also implement `Debug` and `Display`. That's one reason `DimensionMismatch` derives `Debug` and implements `Display` by hand.

**Why bother?** Real programs hit many kinds of errors: a dimension mismatch here, a number that won't parse there. They often collect them all in one general type, **`Box<dyn std::error::Error>`** ("any error, on the heap"; see [`dyn Trait`](/digital-garden/rust-sandbox/traits/#trt-dyn)). Only types that implement `Error` can go into it, and `?` converts them automatically ([previous section](#err-from)):

```rust
use std::error::Error;

fn run() -> Result<f64, Box<dyn Error>> {
    let a = Vector::new(vec![1.0, 2.0]);
    let b = Vector::new(vec![1.0, 2.0, 3.0]);
    let d = a.dot(&b)?;              // DimensionMismatch -> Box<dyn Error>
    let n: f64 = "2.5".parse()?;     // ParseFloatError   -> Box<dyn Error>
    Ok(d + n)
}

match run() {
    Ok(x) => println!("ok {x}"),
    Err(e) => println!("error: {e}"),
}
```

```text
error: dimension mismatch: the left vector has 2 components, the right vector has 3
```

Two completely different error types flow through one `?`-based function, and the caller prints whichever one happened.

## 8. Ignoring a `Result` is a warning
{: #err-must-use}

```rust
a.checked_add(&b);   // result thrown away
```

```text
warning: unused `Result` that must be used
  = note: this `Result` may be an `Err` variant, which should be handled
```

`Result` is marked `#[must_use]`, so silently dropping one is flagged.

## 9. `unwrap` and `expect`: "I'm sure this is `Ok`"
{: #err-unwrap}

`.unwrap()` takes the value out of `Ok(...)`. If the result is `Err`, it **panics** (crashes the program with a message):

```rust
let sum = a.checked_add(&b).unwrap();
```

```text
called `Result::unwrap()` on an `Err` value: DimensionMismatch { left: 1, right: 2 }
```

`.expect("...")` does the same, but adds your explanation to the message. That makes crashes much easier to diagnose:

```rust
a.checked_add(&b).expect("vectors from the same sensor");
// vectors from the same sensor: DimensionMismatch { left: 1, right: 2 }
```

They're fine in tests and quick experiments ([Note 14](/digital-garden/rust-sandbox/doc-comments-tests/#tst-unwrap)). **In library code, avoid them**: return the `Result` and let the caller decide.

## 10. Panics: for bugs, not for expected errors
{: #err-panic}

`Matrix2::get` returns a plain `f64`, not a `Result`:

```rust
/// # Panics
///
/// Panics if `row` or `col` is 2 or more.
pub const fn get(self, row: usize, col: usize) -> f64 {
    self.rows[row][col]
}
```

Every array index in Rust is **bounds-checked**. If `row` is 2, the program stops with a panic instead of reading random memory, as C would:

```text
index out of bounds: the len is 2 but the index is 2
```

**Why `f64` and not `Result` here?** Rust separates two kinds of failure:

| | Expected error | Bug |
|---|---|---|
| Example | user passes vectors of different lengths | code asks for row 2 of a 2×2 matrix |
| Can a correct program hit it? | yes, it depends on the input | no, the calling code is wrong |
| Rust tool | return `Result` (`checked_add`) | **panic** (`get`) |
| Python analogy | `raise ValueError` for the caller to catch | `assert` / an `IndexError` you never catch |

The `/// # Panics` section in the doc comment tells callers exactly when `get` panics. It's a standard heading in Rust documentation ([Note 14](/digital-garden/rust-sandbox/doc-comments-tests/#tst-docs)). The `checked_` prefix ([naming conventions](/digital-garden/rust-sandbox/methods-constructors/#mth-naming)) signals the opposite: this one returns a `Result` instead of panicking.

## Summary: Rust error handling
{: #err-summary}

- Errors are **values**. A struct error keeps machine-readable details, and `Display` adds the human text.
- An **enum** is one of several variants. `Result<T, E>` is `Ok(T)` or `Err(E)`. `Option<T>` is `Some(T)` or `None`.
- `if` and `match` are expressions. `match` must cover every case, so errors can't be forgotten.
- `?` returns the error early, and converts it with `From`. It only works in functions that return `Result`/`Option`.
- `impl std::error::Error` (it needs `Debug` + `Display`) lets your error join `Box<dyn Error>` alongside any other error.
- `unwrap`/`expect` panic on `Err`: fine in tests, avoid in libraries. Unused `Result`s are warnings.
- Return `Result` for failures a correct program can hit, and **panic** for bugs, documented under `# Panics`.
