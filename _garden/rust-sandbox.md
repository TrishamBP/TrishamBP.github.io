---
layout: garden
title: The Rust Sandbox
seo_title: "The Rust Sandbox: Rust Programming Notes & Learning Guide"
description: "The Rust Sandbox: Rust programming notes and a hands-on learning guide to modules, use paths, pub visibility and #[derive] traits like Clone and Copy."
keywords: "Rust programming notes, learn Rust, Rust learning guide, Rust study guide, Rust modules and use, Rust pub visibility, Rust derive attribute, Rust Clone vs Copy, PartialEq vs Eq, Trisham Patil"
order: 1
tag: Rust
logo: /assets/images/garden/rust-crab.svg
logo_alt: "Rust crab logo for The Rust Sandbox Rust programming notes"
card_text: "My Rust programming notes, written while I learn the language: ownership, borrowing, lifetimes, traits and fearless concurrency, broken down from first principles into a study guide you can learn from too."
lede: "A living Rust learning guide, built in public. These are my notes from studying and experimenting with the Rust programming language, rewritten so another engineer can pick up each idea quickly and see why Rust works the way it does."
status: Growing
---

## Index: Rust notes in this guide
{: #index}

- [Note 01: Rust modules and `use`, importing with `crate::` paths](#note-01-rust-modules-and-use)
  - [The demo project](#n01-demo)
  - [1. What `use` actually does](#n01-use)
  - [2. Reading a path: `crate::`, `::` and the module tree](#n01-paths)
  - [3. Importing a module vs an item: `use std::fmt`](#n01-fmt)
  - [4. Visibility: `pub` is required](#n01-pub)
  - [Summary](#n01-summary)
- [Note 02: `#[derive]` in Rust, Debug, Clone, Copy, PartialEq and Eq](#note-02-rust-derive)
  - [Plain-English glossary: attribute, trait, derive](#n02-glossary)
  - [The demo files](#n02-demo)
  - [1. What `#[derive(...)]` does](#n02-derive)
  - [2. Each derived trait, one at a time](#n02-traits)
  - [3. Why the derive lists differ between types](#n02-lists)
  - [4. Memory and performance](#n02-memory)
  - [Summary](#n02-summary)
{: .dg-toc}

---

## Note 01: Rust modules and `use`, importing with `crate::` paths
{: #note-01-rust-modules-and-use}

A line like `use crate::math::trigonometry::sin_cos;` confused me at first. Where does `crate` come from? Why `::`? And why does the import fail when the function plainly exists?

This note answers all three with one small demo project that you can build yourself.

### The demo project for these Rust programming notes
{: #n01-demo}

Every example below comes from this project. The package is called `shapes_demo`, and it has a library crate (`src/lib.rs`) and a binary crate (`src/main.rs`) that uses it.

```text
shapes_demo/
├── Cargo.toml
└── src/
    ├── lib.rs              <- library crate root: crate::
    ├── main.rs             <- binary crate root (a separate crate)
    ├── point.rs            <- crate::point
    └── math/
        ├── mod.rs          <- crate::math
        └── trigonometry.rs <- crate::math::trigonometry
```

**`src/lib.rs`** declares the top-level modules:

```rust
pub mod math;
pub mod point;
```

**`src/math/mod.rs`** declares the module nested inside `math`:

```rust
pub mod trigonometry;
```

**`src/math/trigonometry.rs`** holds the function we want to import:

```rust
/// Returns (sine, cosine) of an angle given in radians.
pub fn sin_cos(angle: f64) -> (f64, f64) {
    (angle.sin(), angle.cos())
}
```

**`src/point.rs`** imports that function, plus the `fmt` module, so it can build a `Point` and print it:

```rust
use std::fmt;

use crate::math::trigonometry::sin_cos;

pub struct Point {
    x: f64,
    y: f64,
}

impl Point {
    /// The point on the unit circle at `angle` radians.
    pub fn on_unit_circle(angle: f64) -> Point {
        let (sin, cos) = sin_cos(angle);
        Point { x: cos, y: sin }
    }
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}
```

**`src/main.rs`** uses the library from outside it. That's why it starts with the package name, `shapes_demo::`, and not `crate::`:

```rust
use shapes_demo::math::trigonometry::sin_cos;
use shapes_demo::point::Point;

fn main() {
    let (sin, cos) = sin_cos(0.0);
    println!("sin = {sin}, cos = {cos}");

    let p = Point::on_unit_circle(0.0);
    println!("{}", p);
}
```

Running `cargo run` prints:

```text
sin = 0, cos = 1
(1, 0)
```

### 1. What `use` actually does
{: #n01-use}

`use` creates a **shortcut name** for something that already exists somewhere in the module tree. Without it, you could still call the function by its full path:

```rust
// No `use`: write the full path every time.
let (sin, cos) = crate::math::trigonometry::sin_cos(angle);

// With `use`: bind the short name `sin_cos` once at the top of the file.
use crate::math::trigonometry::sin_cos;
let (sin, cos) = sin_cos(angle);
```

Both versions compile to exactly the same program. `use` is resolved while the code compiles. It runs no code, loads nothing, and costs nothing at runtime.

This is the big difference from Python. In Python, `import` is a statement that runs: the first import of a module runs its code. Rust's `use` is closer to a name alias that the compiler sets up for you.

One more detail: a `use` applies only to the module (the file) it's written in. `point.rs` importing `sin_cos` doesn't make `sin_cos` available in `main.rs`. Each file declares its own imports.

### 2. Reading a path: `crate::`, `::` and the module tree
{: #n01-paths}

A path is read from left to right, one module at a time, and `::` separates the parts. It plays the same role as `.` in a Python import such as `import os.path`.

```text
crate :: math :: trigonometry :: sin_cos
  │       │          │              └── the function
  │       │          └── module declared in src/math/mod.rs
  │       └── module declared in src/lib.rs
  └── the root of the current crate (src/lib.rs here)
```

The first part tells Rust where to start:

| Path starts with | Starts from | Example |
|---|---|---|
| `crate::` | The root of the **current** crate (`src/lib.rs` for a library, `src/main.rs` for a binary) | `crate::math::trigonometry::sin_cos` |
| `self::` | The current module | `self::helpers::round` |
| `super::` | The parent module (like `..` in a file path) | `super::trigonometry::sin_cos` |
| A crate name | Another crate: a dependency, `std`, or your own library seen from `main.rs` | `std::fmt`, `shapes_demo::point::Point` |

That's why `point.rs` writes `crate::math::...` but `main.rs` writes `shapes_demo::math::...`. A package with both `lib.rs` and `main.rs` contains **two crates**. Inside `main.rs`, `crate::` means the binary crate, which has no `math` module. The binary has to reach the library by name, just as any outside user would.

#### The `mod` declarations build the tree, not the folders
{: #n01-mod}

This point catches almost everyone coming from Python, where a file on disk can be imported as a module. In Rust, a file is **only** part of the module tree if a `mod` line declares it:

```mermaid
flowchart TD
    root["src/lib.rs<br/>crate"] -->|"pub mod math;"| math["src/math/mod.rs<br/>crate::math"]
    root -->|"pub mod point;"| point["src/point.rs<br/>crate::point"]
    math -->|"pub mod trigonometry;"| trig["src/math/trigonometry.rs<br/>crate::math::trigonometry"]
    trig --> sincos(["pub fn sin_cos"])
```

When the compiler sees `pub mod math;` in `src/lib.rs`, it looks for the module's code in `src/math.rs` **or** `src/math/mod.rs`. The folder layout tells the compiler *where to find* a module's code. The `mod` line is what *creates* the module.

To check this, delete `pub mod point;` from `src/lib.rs`. `src/point.rs` still exists on disk, but the build fails:

```text
error[E0432]: unresolved import `shapes_demo::point`
 --> src\main.rs:2:18
```

As far as the compiler is concerned, the file is no longer part of the crate.

> **Two valid layouts.** `src/math/mod.rs` is the older style. Since the 2018 edition you can instead put the same code in `src/math.rs` and keep `src/math/trigonometry.rs` beside it. Both produce the same `crate::math::trigonometry` path. Pick one style per project.

### 3. Importing a module vs importing an item: `use std::fmt`
{: #n01-fmt}

Look at the first line of `point.rs` again:

```rust
use std::fmt;
```

This line imports the **module** `fmt`, not a function or type inside it. The code then names things through it: `fmt::Display`, `fmt::Formatter` and `fmt::Result`. You need all three to make your own type printable with `println!("{}", value)`:

```rust
impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}
```

- `fmt::Display` is the trait that `{}` in `println!` uses.
- `fmt::Formatter` is the output buffer you write into.
- `fmt::Result` is the return type, which tells the caller whether writing succeeded.

#### Why import `fmt` and not `fmt::Result`?
{: #n01-fmt-result}

`Result` already means something in Rust. The standard `Result<T, E>` is in every file automatically (through the *prelude*). `std::fmt::Result` is a different type: an alias for `Result<(), std::fmt::Error>`, which takes **no** type parameters.

If you write `use std::fmt::Result;`, your import hides the standard `Result` in that whole file. Any ordinary `Result<T, E>` in the file then breaks:

```rust
use std::fmt::Result; // hides the standard Result<T, E> in this file

pub fn parse(s: &str) -> Result<i32, String> {
    s.parse::<i32>().map_err(|e| e.to_string())
}
```

```text
error[E0107]: type alias takes 0 generic arguments but 2 generic arguments were supplied
```

Importing the module and writing `fmt::Result` avoids the clash, and the code also shows which `Result` you mean. Python programmers do the same thing when they write `import os` and then `os.path` instead of importing every name directly.

If you really want a short name, rename it on import:

```rust
use std::fmt::Result as FmtResult;
```

A common convention: import **functions** through their parent module (`fmt::write`), and import **types and traits** directly (`use std::collections::HashMap;`), unless the name would clash like `Result` does.

### 4. Visibility: `pub` is required
{: #n01-pub}

`use` only works if you're allowed to see every part of the path. Rust makes items **private by default**. Python doesn't: a leading `_` in Python is only a convention, and nothing stops you from importing it.

The precise rule: a private item is visible only inside the module that defines it and that module's children. `pub` makes it visible to the parent as well, and from there, to anyone who can reach the parent.

In the demo, three `pub` keywords make these imports compile:

- `pub mod math;` in `src/lib.rs`
- `pub mod trigonometry;` in `src/math/mod.rs`
- `pub fn sin_cos` in `src/math/trigonometry.rs`

I removed each one in turn and rebuilt. These are the real compiler errors:

| Remove `pub` from | Error | Where it fails |
|---|---|---|
| `fn sin_cos` | `error[E0603]: function 'sin_cos' is private` | `src/point.rs` |
| `mod trigonometry` | `error[E0603]: module 'trigonometry' is private` | `src/point.rs` |
| `mod math` | `error[E0603]: module 'math' is private` | `src/main.rs` only |

The last row is the subtle one. Without `pub mod math;`, `src/point.rs` **still compiles**. `math` is a private child of the crate root, and `point` is also inside the crate, so it can see its private sibling. Only `src/main.rs` fails, because it's a separate crate looking in from outside.

So `pub` on a top-level module decides what your **library exposes to other crates**. `pub` on deeper modules and items decides what is visible **between modules inside the crate**.

### Summary: Rust modules and `use`
{: #n01-summary}

- `use` creates a short name while the code compiles. It runs no code and costs nothing at runtime.
- `crate::` starts at the root of the current crate (`src/lib.rs` in a library). From `main.rs`, you reach your library by its package name.
- `::` separates the parts of a path, like `.` in Python.
- The `mod` declarations define the path. A file that no `mod` declares isn't part of the crate.
- Import modules (`use std::fmt;`) when the item names would clash or read better qualified, such as `fmt::Result`.
- Every part of the path must be visible from where you import it. Usually that means `pub`, or the build fails with `E0603 ... is private`.

[↑ Back to index](#index)

---

## Note 02: `#[derive]` in Rust, Debug, Clone, Copy, PartialEq and Eq
{: #note-02-rust-derive}

The line `#[derive(Debug, Clone, Copy, PartialEq, Eq)]` shows up above almost every struct in Rust code. It looks like noise at first, but each word in it changes what you're allowed to do with the type.

This note explains the line piece by piece. It starts with plain-English definitions, so you can follow it even if you've never seen a trait before.

### Plain-English glossary: attribute, trait, derive
{: #n02-glossary}

Read these first. The rest of the note uses all of these terms.

| Term | In plain English | Everyday analogy |
|---|---|---|
| **struct** | A custom data type that groups a few named values together. | A form with labelled boxes: "left", "right". |
| **field** | One named value inside a struct, such as `left: usize`. | One box on the form. |
| **attribute** `#[...]` | A note to the **compiler** attached to the item directly below it. It's not code that runs. It changes how the compiler treats that item. | A sticky note on a document: "please photocopy this twice". The note isn't part of the document, but it tells the office what to do with it. |
| **trait** | A named set of abilities that a type promises to have, such as "can be printed" or "can be compared". It's similar to an interface in Java or a protocol in Python. | A skill badge: "certified to drive". Any type that holds the badge must actually be able to do the thing. |
| **`impl`** | The block of code where you write how a type performs a trait. | The training that earns the badge. |
| **derive** | "Compiler, write the `impl` for these traits for me." It works for traits whose code follows an obvious pattern (compare every field, print every field...). | Auto-fill on a web form: the browser fills in the boxes it can work out by itself. |
| **move** | Handing a value to a new owner. The old variable can't be used afterwards. | Giving someone your only house key. |
| **copy** | Duplicating the value, so both variables stay usable. | Photocopying a page. |

So `#[derive(Debug, Clone, Copy, PartialEq, Eq)]` reads as: *"Compiler, please give the struct below these five abilities, and write the code for them yourself."*

### The demo files for this Rust derive note
{: #n02-demo}

This note extends the `shapes_demo` project from [Note 01](#note-01-rust-modules-and-use) with three new modules:

```text
shapes_demo/
└── src/
    ├── lib.rs
    ├── main.rs
    └── math/
        ├── mod.rs          <- declares the modules + approx_eq
        ├── matrix.rs       <- DimensionMismatch, Matrix2
        ├── complex.rs      <- Complex
        ├── vector.rs       <- Vector
        └── trigonometry.rs
```

**`src/math/mod.rs`**:

```rust
pub mod complex;
pub mod matrix;
pub mod trigonometry;
pub mod vector;

/// Float comparison with a tolerance. `==` is unreliable for f64,
/// and NaN is never equal to anything, not even itself.
pub fn approx_eq(a: f64, b: f64) -> bool {
    (a - b).abs() < 1e-9
}
```

**`src/math/matrix.rs`**:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DimensionMismatch {
    pub left: usize,
    pub right: usize,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Matrix2 {
    pub data: [[f64; 2]; 2],
}
```

**`src/math/complex.rs`**:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Complex {
    pub re: f64,
    pub im: f64,
}
```

**`src/math/vector.rs`**:

```rust
#[derive(Debug, Clone, PartialEq)]
pub struct Vector {
    pub data: Vec<f64>,
}

impl Vector {
    pub fn new(data: Vec<f64>) -> Vector {
        Vector { data }
    }
}
```

`DimensionMismatch` is an error value: "you tried to combine something of size `left` with something of size `right`". It's the main example below.

### 1. What `#[derive(...)]` does
{: #n02-derive}

`#[...]` is an **attribute**: an instruction to the compiler about the item directly below it. Other attributes you'll meet soon are `#[test]` (this function is a test) and `#[allow(dead_code)]` (don't warn me about unused code).

`derive` is one specific attribute. It tells the compiler: *"Write the code for these traits for me."*

Without `derive`, you have to write each implementation by hand. Here is `PartialEq` (the `==` ability) written out manually:

```rust
impl PartialEq for DimensionMismatch {
    fn eq(&self, other: &Self) -> bool {
        self.left == other.left && self.right == other.right
    }
}
```

`derive(PartialEq)` makes the compiler write exactly this: it compares each field in order. The generated code is as fast as code you'd write by hand, because it **is** that code. The compiler just writes it for you.

#### Python analogy: `@dataclass`

`derive` is like Python's `@dataclass`, which creates `__repr__`, `__eq__` and other methods automatically:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class DimensionMismatch:
    left: int
    right: int
```

The difference is **when** it happens. Python creates these methods while the program runs. Rust creates them while the code compiles, and it checks that they're valid before the program can exist (see [section 3](#n02-lists)).

### 2. Each derived trait, one at a time
{: #n02-traits}

#### `Debug`: print the value for debugging
{: #n02-debug}

**In plain English:** "Show me what's inside."

```rust
let e = DimensionMismatch { left: 4, right: 6 };
println!("{:?}", e);   // DimensionMismatch { left: 4, right: 6 }
println!("{:#?}", e);  // the same, pretty-printed over several lines
```

`{:?}` uses `Debug`. The Python equivalent is `__repr__`.

You need `Debug` to use `assert_eq!` in tests, because a failed assertion prints both values. Without it:

```text
error[E0277]: `P` doesn't implement `Debug`
```

`Debug` does **not** give you `{}`. For `{}` you must implement `Display` yourself (see [`use std::fmt` in Note 01](#n01-fmt)). Rust deliberately won't derive `Display`: there's no obvious "user-facing" format to generate. Using `{}` on a type without it fails:

```text
error[E0277]: `DimensionMismatch` doesn't implement `std::fmt::Display`
```

#### `Clone`: make an explicit copy with `.clone()`
{: #n02-clone}

**In plain English:** "You may duplicate me, but you have to ask out loud."

```rust
let a = Vector::new(vec![1.0, 2.0]);
let b = a.clone();      // a and b are now two separate vectors
```

The nearest Python equivalent is `copy.deepcopy(a)`. A derived `clone()` clones every field, and for a `Vec` that means new heap memory plus copying every number.

That's why a clone can be expensive. Writing `.clone()` makes the cost visible in your code.

#### `Copy`: assignment copies the value instead of moving it
{: #n02-copy}

**In plain English:** "I'm so small and simple that duplicating me is free, so do it automatically."

This is the most important trait in the list for **ownership**. By default, assigning a value to another variable *moves* it, and the old variable can't be used any more:

```rust
let a = Vector::new(vec![1.0, 2.0]);
let b = a;              // a MOVES into b
println!("{:?}", a);    // ERROR
```

```text
error[E0382]: borrow of moved value: `a`
  |     let b = a;
  |             - value moved here
  |     println!("{:?}", a);
  |                      ^ value borrowed here after move
```

With `Copy`, the compiler copies the bytes and `a` stays valid:

```rust
let a = DimensionMismatch { left: 4, right: 6 };
let b = a;              // the bytes are copied
println!("{:?}", a);    // OK: a is still valid
```

Rust allows `Copy` only when a plain byte-for-byte copy is safe and cheap:

- **every field must be `Copy` too** (`usize`, `f64`, `bool`, `char`, and arrays/tuples of them all are), and
- the type must not need cleanup, which means it can't own heap memory like `Vec` or `String`.

`usize` is `Copy`, so `DimensionMismatch` can be `Copy`.

`Copy` **requires** `Clone`: every `Copy` type must also be `Clone`. That's why the two always appear together. Drop `Clone` and the compiler refuses:

```text
error[E0277]: the trait bound `DimensionMismatch: Clone` is not satisfied
```

#### `PartialEq`: compare values with `==` and `!=`
{: #n02-partialeq}

**In plain English:** "You may ask whether two of me are equal."

The Python equivalent is `__eq__`. The derived version checks every field, as shown in [section 1](#n02-derive).

#### `Eq`: equality is a complete equivalence
{: #n02-eq}

**In plain English:** "...and my answer is always sensible: anything is equal to itself."

`Eq` has **no methods**. It's a promise: *every value is equal to itself* (`a == a` is always `true`).

Why does Rust need two traits for equality? Because of floating-point numbers. In `f64`, `NaN == NaN` is `false`:

```rust
println!("{}", f64::NAN == f64::NAN); // false
```

The compiler even warns about it (`incorrect NaN comparison`) and suggests `f64::is_nan()` instead. This is also why `approx_eq` in `src/math/mod.rs` exists: comparing floats with plain `==` is unreliable.

So `f64` is `PartialEq` but **not** `Eq`. Some code needs the full promise. For example, `HashMap` keys must be `Eq` **and** `Hash`. A key that isn't equal to itself could never be found again. To use `DimensionMismatch` as a key, add `Hash` to its derive list as well:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct DimensionMismatch { pub left: usize, pub right: usize }

let mut seen: HashMap<DimensionMismatch, u32> = HashMap::new();
*seen.entry(DimensionMismatch { left: 4, right: 6 }).or_insert(0) += 1;
// {DimensionMismatch { left: 4, right: 6 }: 1}
```

#### Bonus: `Default`, a sensible "empty" value
{: #n02-default}

**In plain English:** "If you don't tell me what to be, here is my starting value."

`Complex` derives `Default`, so `Complex::default()` sets every field to *its* default. For `f64` that's `0.0`, so you get `0 + 0i`:

```rust
let z = Complex::default();
println!("{:?}", z);    // Complex { re: 0.0, im: 0.0 }
```

### 3. Why the derive lists differ between types
{: #n02-lists}

Compare the four structs in the demo:

| Type | Fields | Derives | Reason |
|---|---|---|---|
| `DimensionMismatch` | `usize, usize` | Debug, Clone, Copy, PartialEq, Eq | Integers: cheap to copy, and full equality is possible |
| `Matrix2` | `[[f64; 2]; 2]` | no `Eq` | `f64` has NaN, so `Eq` isn't possible |
| `Complex` | `f64, f64` | no `Eq`, adds `Default` | `f64` again. `Default` gives `0 + 0i` |
| `Vector` | `Vec<f64>` | no `Copy`, no `Eq` | `Vec` owns heap memory, so `Copy` isn't possible |

The rule behind the table: **a struct can derive a trait only if every one of its fields has that trait.**

Try it. Add `Eq` to `Matrix2`, or `Copy` to `Vector`, and the compiler stops:

```text
// Eq on Matrix2
error[E0277]: the trait bound `f64: Eq` is not satisfied

// Copy on Vector
error[E0204]: the trait `Copy` cannot be implemented for this type
```

The compiler checks every field against every derived trait. Python's `@dataclass` can't do this check: it would happily generate `__eq__` and `__hash__` for a class full of floats.

### 4. Memory and performance
{: #n02-memory}

I checked the sizes with `std::mem::size_of`:

| Type | Size | What a copy costs |
|---|---|---|
| `Matrix2` | 32 bytes (4 × 8-byte `f64`) | Copying 32 bytes. Passed by value like a number, with no heap allocation |
| `Complex` | 16 bytes (2 × `f64`) | Copying 16 bytes |
| `Vector` | 24 bytes on the stack (pointer, length, capacity) **plus** the heap buffer | `Copy` isn't allowed. `.clone()` allocates and copies the whole heap buffer |

- Small `Copy` types like `Matrix2` behave like plain numbers: you can pass them around freely.
- `Vector` owns heap memory, so any copy must be an explicit `.clone()`. You always see the cost in the code.
- All derived code is generated while the code compiles. It has no runtime overhead compared with writing it by hand.

### Summary: Rust `#[derive]`
{: #n02-summary}

- `#[...]` is an attribute: a note to the compiler about the item below it.
- `#[derive(...)]` tells the compiler to write trait implementations for you, like Python's `@dataclass` but checked when the code compiles.
- `Debug` lets you print with `{:?}` (and is needed by `assert_eq!`). `PartialEq` lets you use `==`.
- `Clone` gives an explicit `.clone()`. `Copy` makes assignment copy the value instead of moving it, and it requires `Clone`.
- `Eq` promises full equality. Floats can't make that promise because of NaN. `HashMap` keys need `Eq + Hash`.
- A type can derive a trait only if every field supports it, and the compiler checks this for you.

[↑ Back to index](#index)
