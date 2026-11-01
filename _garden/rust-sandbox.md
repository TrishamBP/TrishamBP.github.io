---
layout: garden
title: The Rust Sandbox
seo_title: "The Rust Sandbox: Rust Programming Notes & Learning Guide"
description: "The Rust Sandbox: Rust programming notes and a hands-on learning guide covering modules, use paths, ownership, borrowing, traits and error handling."
keywords: "Rust programming notes, learn Rust, Rust learning guide, Rust study guide, Rust modules, Rust use keyword, crate path, Rust pub visibility, Rust fmt Display, Trisham Patil"
order: 1
tag: Rust
logo: /assets/images/garden/rust-crab.svg
logo_alt: "Rust crab logo for The Rust Sandbox Rust programming notes"
card_text: "My Rust programming notes, written while I learn the language: ownership, borrowing, lifetimes, traits and fearless concurrency, broken down from first principles into a study guide you can learn from too."
lede: "A living Rust learning guide, built in public. These are my notes from studying and experimenting with the Rust programming language, rewritten so another engineer can pick up each idea quickly and see why Rust works the way it does."
status: Growing
---

## Notes in this Rust learning guide

1. [Rust modules and `use`: importing with `crate::` paths](#note-01-rust-modules-and-use)

---

## Note 01: Rust modules and `use`, importing with `crate::` paths
{: #note-01-rust-modules-and-use}

A line like `use crate::math::trigonometry::sin_cos;` confused me at first. Where does `crate` come from? Why `::`? And why does the import fail when the function plainly exists?

This note answers all three with one small demo project that you can build yourself.

### The demo project for these Rust programming notes

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

- `use` creates a short name while the code compiles. It runs no code and costs nothing at runtime.
- `crate::` starts at the root of the current crate (`src/lib.rs` in a library). From `main.rs`, you reach your library by its package name.
- `::` separates the parts of a path, like `.` in Python.
- The `mod` declarations define the path. A file that no `mod` declares isn't part of the crate.
- Import modules (`use std::fmt;`) when the item names would clash or read better qualified, such as `fmt::Result`.
- Every part of the path must be visible from where you import it. Usually that means `pub`, or the build fails with `E0603 ... is private`.
