---
layout: garden
guide: rust-sandbox
order: 1
note_no: "01"
nav_title: "Variables and mutability"
title: "Rust Variables and Mutability: let, mut, Shadowing, Scopes and Constants"
seo_title: "Rust Variables and Mutability Explained: let, mut, Shadowing & const"
description: "Rust variables and mutability explained: let vs let mut, println! interpolation, shadowing, scopes, const, type aliases and #[allow], with real compiler errors."
keywords: "Rust variables, Rust mutability, Rust let mut, Rust shadowing, Rust scope, Rust const vs let, Rust type alias, Rust println format, Rust error codes, Rust allow attribute"
lede: "Before ownership, before structs, there's let. This note covers how Rust variables really work: why they're read-only by default, how shadowing differs from mut, where a variable stops existing, and how to read the compiler's error codes."
sections:
  - id: var-let
    title: "1\\. `let`: declaring a variable"
  - id: var-print
    title: "2\\. Printing variables: `{}`, `{name}` and `{:?}`"
  - id: var-positional
    title: "3\\. Positional and named arguments in `println!`"
  - id: var-underscore
    title: "4\\. Unused variables and the `_` prefix"
  - id: var-mut
    title: "5\\. Immutable by default, `mut` when you need it"
  - id: var-error-codes
    title: "6\\. Rust error codes: `E0384` and `rustc --explain`"
  - id: var-shadowing
    title: "7\\. Shadowing: a new variable with the same name"
  - id: var-scopes
    title: "8\\. Scopes and blocks: where a variable lives"
  - id: var-const
    title: "9\\. Constants: `const` vs `let`"
  - id: var-alias
    title: "10\\. Type aliases: a second name for a type"
  - id: var-directives
    title: "11\\. Compiler directives: `#[allow]` and `#![allow]`"
  - id: var-table
    title: "12\\. All the variable rules together"
  - id: var-summary
    title: "Summary: Rust variables and mutability"
---

Rust variables look like Python variables with an extra `let`. They aren't. A Rust variable is **read-only unless you say otherwise**, it has one fixed type, and it stops existing at the closing `}` of its block.

This note covers Rust variables and mutability from the ground up: `let`, `mut`, printing with `println!`, shadowing, scopes, constants, type aliases and the attributes that silence warnings. Every later note builds on these rules, starting with Rust's data types in [Note 02](/digital-garden/rust-sandbox/integers-floats-casting/).

All the working code lives in one file, `examples/variables.rs` in the [demo project](/digital-garden/rust-sandbox/#demo-project). Run it with `cargo run --example variables`.

## 1. `let`: declaring a variable
{: #var-let}

```rust
let width = 3.0;          // type inferred: f64
let height: f64 = 4.0;    // type written out
let area = width * height;
```

`let` creates a new variable and **binds** a value to it. Rust calls a variable a *binding*: a name attached to a value.

- **Type inference:** the compiler works out that `3.0` is an `f64`, so you rarely need to write the type.
- **Type annotation:** `: f64` after the name states the type. You need it when the compiler can't guess, as with `"42".parse()` in [section 7](#var-shadowing).
- **One type, forever:** once `width` is an `f64`, it can never hold a string. Python lets `x = 1` become `x = "one"`; Rust doesn't.

You can declare first and assign later, but Rust refuses to read a variable that has no value yet:

```rust
let total: i32;
println!("{total}");
```

```text
error[E0381]: used binding `total` isn't initialized
```

Python would fail at runtime with a `NameError`. Rust catches it before the program exists.

## 2. Printing variables: `{}`, `{name}` and `{:?}`
{: #var-print}

`println!` prints a line. Each pair of **curly braces** `{}` is a slot that gets filled in, a feature called **interpolation**:

```rust
println!("area = {}", area);              // area = 12
println!("area = {area}");                // area = 12
println!("{width} x {height} = {area}");  // 3 x 4 = 12
```

The second form puts the variable name **inside** the braces. It works like a Python f-string, `f"area = {area}"`, and it's the style most modern Rust code uses.

One difference from Python: only a plain variable name fits inside the braces. An expression like `{v.len()}` is a compile error (`invalid format string: expected '}', found '.'`). Pass it as an argument instead: `println!("{}", v.len())`.

Notice that `3.0` printed as `3`. The slot type decides the format:

| Slot | Uses | `3.0_f64` prints | Python equivalent |
|---|---|---|---|
| `{}` | `Display`, output for users | `3` | `str(x)` |
| `{:?}` | `Debug`, output for programmers | `3.0` | `repr(x)` |
| `{:.2}` | `Display` with 2 decimals | `3.00` | `f"{x:.2f}"` |

```rust
println!("{:?}", [width, height]);   // [3.0, 4.0]
println!("{:.2}", area / 7.0);       // 1.71
```

Arrays need `{:?}` because they have no `Display`. Width, alignment and the other format specifiers are in [Note 02](/digital-garden/rust-sandbox/integers-floats-casting/#num-format). [Note 05](/digital-garden/rust-sandbox/structs-impl-display/#dsp-display) explains the `Display` and `Debug` traits behind these slots, and how to write `Display` for your own types.

## 3. Positional and named arguments in `println!`
{: #var-positional}

Plain `{}` slots are filled left to right. A number inside the braces picks an argument by **position**, starting at 0, so one value can appear several times:

```rust
println!("{0} x {1} = {2}, and {1} x {0} = {2}", width, height, area);
// 3 x 4 = 12, and 4 x 3 = 12
```

You can also name the arguments right in the call, which reads better than numbers:

```rust
println!("{w} x {h}", w = width, h = height);   // 3 x 4
```

`println!` is a **macro** (the `!` gives it away), so it checks every slot **while compiling**. A slot with no matching argument is a build error, not a runtime crash:

```rust
let a = 1;
println!("{0} {1}", a);
```

```text
error: invalid reference to positional argument 1 (there is 1 argument)
  = note: positional arguments are zero-based
```

The check also goes the other way. `println!("{a}", a)` fails with `error: redundant argument`, because `{a}` already reads the variable. Python's `"{0} {1}".format(a)` would only raise `IndexError` when that line runs.

## 4. Unused variables and the `_` prefix
{: #var-underscore}

Declare a variable and never read it, and Rust warns you:

```rust
let speed = 10;
```

```text
warning: unused variable: `speed`
  |     let speed = 10;
  |         ^^^^^ help: if this is intentional, prefix it with an underscore: `_speed`
```

An unused variable is often a bug: a typo, or a value you forgot to use. When it's intentional, start the name with an underscore:

```rust
let _unused = 42;     // a real variable, just no warning
let _ = area * 2.0;   // no variable at all: the value is thrown away
```

The two forms are different:

- **`_unused`** is a normal variable. You can still read it, and it lives until the end of the block.
- **`_` on its own** is not a variable. It's a pattern that means "ignore this". The value is dropped straight away, and `println!("{_}")` doesn't compile.

That difference matters later. `let _guard = lock()` keeps the lock until the end of the block, while `let _ = lock()` releases it immediately.

## 5. Immutable by default, `mut` when you need it
{: #var-mut}

In Rust, a variable can't be changed after it gets its value:

```rust
let count = 0;
count = 1;
```

```text
error[E0384]: cannot assign twice to immutable variable `count`
  |     let count = 0;
  |         ----- first assignment to `count`
  |     count = 1;
  |     ^^^^^^^^^ cannot assign twice to immutable variable
help: consider making this binding mutable
  |     let mut count = 0;
  |         +++
```

To allow changes, declare the variable with **`mut`** (mutable):

```rust
let mut count = 0;
count += 1;
count += 1;
println!("count = {count}");   // count = 2
```

**Why read-only by default?** If a variable isn't `mut`, you know its value can never change, however long the function is. You can read it once and trust it. Every `mut` stands out as "this one changes, watch it".

The compiler also flags the opposite mistake. `let mut x = 5;` that's never changed gives `warning: variable does not need to be mutable`.

Two rules to remember:

- `mut` lets the **value** change, never the **type**. `let mut x = "  42 ";` followed by `x = x.trim().len();` fails with `error[E0308]: mismatched types` (expected `&str`, found `usize`). [Shadowing](#var-shadowing) is the tool for changing the type.
- The same `mut` is needed to change a value **through a method**, or to lend it as `&mut`. [Note 04](/digital-garden/rust-sandbox/ownership-borrowing/#own-mut) shows that version of the error.

| | Python | Rust |
|---|---|---|
| Default | every name can be reassigned | read-only |
| Changeable | always | only with `let mut` |
| Constant by convention | `MAX = 3` (still changeable) | `const MAX: i32 = 3;` (enforced) |

## 6. Rust error codes: `E0384` and `rustc --explain`
{: #var-error-codes}

Most Rust errors carry a code, such as `error[E0384]`. The code is a key into the **Rust error codes index**, a page for every error with an example that triggers it and the usual fixes.

The compiler even tells you how to open it. The last line of the `E0384` error above reads:

```text
For more information about this error, try `rustc --explain E0384`.
```

Run that, and you get the full explanation in the terminal:

```text
An immutable variable was reassigned.

By default, variables in Rust are immutable. To fix this error, add the keyword
`mut` after the keyword `let` when declaring the variable.
```

The same pages are online at [doc.rust-lang.org/error_codes](https://doc.rust-lang.org/error_codes/), for example [E0384](https://doc.rust-lang.org/error_codes/E0384.html).

The codes in this note, as a quick reference:

| Code | Meaning | Section |
|---|---|---|
| `E0381` | used a variable before giving it a value | [1](#var-let) |
| `E0384` | assigned twice to a variable without `mut` | [5](#var-mut) |
| `E0308` | mismatched types | [5](#var-mut) |
| `E0425` | the name doesn't exist in this scope | [8](#var-scopes) |
| `E0435` | a `const` used a runtime value | [9](#var-const) |

Some errors, such as the format-string checks in [section 3](#var-positional), have no code. Warnings name a **lint** instead, like `#[warn(unused_variables)]`, which [section 11](#var-directives) shows how to control.

**Read the whole message, not just the first line.** Rust errors point at the exact characters, label each one, and often end with a `help:` line that is the fix.

## 7. Shadowing: a new variable with the same name
{: #var-shadowing}

You can declare a new variable with the **same name** as an old one. The new one **shadows** the old: from that line on, the name means the new variable.

```rust
let x = 5;
let x = x + 1;   // new x = 6, built from the old x
let x = x * 2;   // new x = 12
println!("x = {x}");   // x = 12
```

There's no `mut` here. Each `let` creates a **brand-new** variable, and each one is still read-only.

The real power: the new variable can have a **different type**. This is common when you clean up input step by step:

```rust
let input = "  42 ";                                  // &str
let input = input.trim();                             // &str, spaces removed
let input: i32 = input.parse().expect("not a number"); // i32
println!("input + 1 = {}", input + 1);                // input + 1 = 43
```

Without shadowing you'd need three names (`input_raw`, `input_trimmed`, `input_number`) for one idea. `.expect` stops the program if parsing fails; [Note 11](/digital-garden/rust-sandbox/error-handling-result/#err-unwrap) covers it.

### Shadowing vs `mut`
{: #var-shadow-vs-mut}

| | `let mut x` then `x = ...` | `let x = ...` again (shadowing) |
|---|---|---|
| Variables | one, changed in place | a new one each time |
| Type can change | no | yes |
| Result is read-only | no | yes |
| Inside a `{ }` block | the change stays after the `}` | the new variable ends at the `}` ([section 8](#var-scopes)) |

Use `mut` for a value that changes as the program runs, like a counter. Use shadowing for a value you **transform** a few times and then stop changing.

## 8. Scopes and blocks: where a variable lives
{: #var-scopes}

A **scope** is the region between `{` and `}`. A variable exists from its `let` line to the closing `}` of the block it was declared in. After that, the name is gone:

```rust
{
    let inner = 1;
}
println!("{inner}");
```

```text
error[E0425]: cannot find value `inner` in this scope
help: the binding `inner` is available in a different scope in the same function
```

Python works differently: a variable created inside an `if` or `for` block is still visible after the block. In Rust, **every** `{ }` is a scope, including bare blocks like the one above.

Scopes and shadowing combine. A variable shadowed inside a block only hides the outer one **until the block ends**:

```rust
let level = "outer";
{
    let level = "inner";
    let only_here = 1;
    println!("inside the block: {level}, {only_here}");  // inner, 1
}
println!("after the block: {level}");                    // outer
```

The outer `level` was never changed. It was hidden, and at the `}` it's visible again.

### A block is an expression
{: #var-block-expr}

A block produces a value: its **last line without a semicolon**. That lets you compute a value with temporary helper variables that vanish right after:

```rust
let diagonal = {
    let sum = width * width + height * height;
    sum.sqrt()            // no `;`: this is the block's value
};
println!("diagonal = {diagonal}");   // diagonal = 5
```

`sum` exists only inside the block, so it can't clutter the rest of the function. The same "last line without `;`" rule decides what a function returns ([Note 05](/digital-garden/rust-sandbox/structs-impl-display/#dsp-semicolon)).

Scopes matter far beyond names. When a variable's scope ends, Rust frees the value it owns. That rule is the basis of ownership, in [Note 04](/digital-garden/rust-sandbox/ownership-borrowing/#own-rules).

## 9. Constants: `const` vs `let`
{: #var-const}

```rust
const MAX_DIMENSION: usize = 3;
const ONE_MILLION: u32 = 1_000_000;
```

A **constant** is a value fixed **while compiling**. The compiler copies it into every place it's used.

Constants have stricter rules than `let`:

- **The type is required.** `const MAX = 3;` fails with `error: missing type for 'const' item`.
- **No `mut`, ever.** A constant can't change.
- **The value must be known at compile time.** It can't use a variable:

```rust
let n = 2;
const LIMIT: i32 = n * 2;
```

```text
error[E0435]: attempt to use a non-constant value in a constant
help: consider using `let` instead of `const`
```

- **Constants can live outside functions**, at the top of a file or module, and be used everywhere in it. `let` only works inside a function.
- **Names use `UPPER_SNAKE_CASE`.** `1_000_000` uses underscores as digit separators, which Rust ignores ([Note 02](/digital-garden/rust-sandbox/integers-floats-casting/#num-literals)).

| | `let` | `let mut` | `const` |
|---|---|---|---|
| Can change | no | yes | no |
| Type annotation | optional | optional | required |
| Value known | at runtime | at runtime | at compile time |
| Where | inside functions | inside functions | anywhere, including top level |
| Naming | `snake_case` | `snake_case` | `UPPER_SNAKE_CASE` |

The demo project's `DEFAULT_TOLERANCE` in `src/math/mod.rs` is a real example: `pub const DEFAULT_TOLERANCE: f64 = 1e-9;`. `pub` lets other modules use it ([Note 13](/digital-garden/rust-sandbox/modules-use/#mod-pub)).

You'll sometimes see **`static`** too, as in `static GREETING: &str = "hello";`. A `static` is one value at one fixed memory address, while a `const` is copied into each use. For plain fixed values, prefer `const`.

Constants attached to a type (`Matrix2::IDENTITY`) and functions the compiler can run (`const fn`) build on this. [Note 10](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-const) covers both.

## 10. Type aliases: a second name for a type
{: #var-alias}

```rust
type Meters = f64;

let run: Meters = 5.0;
let plain: f64 = run;      // fine: Meters IS f64
println!("{}", run + plain);   // 10
```

`type ... = ...;` creates a **type alias**: a second name for an existing type. It makes long or repeated types readable, and documents what a number means.

An alias is **not a new type**. `Meters` and `f64` are completely interchangeable, so the compiler won't stop you from adding meters to seconds if both are aliases of `f64`. To make the compiler keep two kinds of value apart, wrap the value in a struct instead (a *newtype*), as `Vector` wraps `Vec<f64>` in [Note 06](/digital-garden/rust-sandbox/methods-constructors/#mth-struct).

The demo uses an alias for 2-D vectors, `type Vector2 = [f64; 2];`, in [Note 10](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-alias).

## 11. Compiler directives: `#[allow]` and `#![allow]`
{: #var-directives}

Rust's warnings come from **lints**, named checks like `unused_variables`, `unused_mut` and `dead_code` (a function that's never called). An **attribute** lets you change how strict each lint is. It's a note to the compiler, written above the code it applies to.

There are two forms, and the `!` decides the reach:

```rust
#![allow(dead_code)] // inner attribute: applies to the whole file (crate or module)

fn main() {
    #[allow(unused_variables)] // outer attribute: applies to the next item only
    let temporary = 99;
}
```

- **`#[...]`** is an **outer attribute**. It applies to the one item directly below it: a variable, a function, a struct.
- **`#![...]`** is an **inner attribute**. It applies to the item it sits **inside**. At the top of `main.rs` or `lib.rs`, that's the whole crate. It must come before any other code in the file.

Every lint has one of four levels:

| Level | Effect |
|---|---|
| `allow` | silent |
| `warn` | prints a warning (the default for most lints) |
| `deny` | turns the warning into an error |
| `forbid` | like `deny`, and nothing below it can turn it back to `allow` |

`deny` is useful in CI, where you want warnings to fail the build:

```rust
#![deny(unused_variables)]

fn main() {
    let speed = 10;
}
```

```text
error: unused variable: `speed`
note: the lint level is defined here
  | #![deny(unused_variables)]
```

**Use `allow` sparingly.** While prototyping, `#![allow(dead_code)]` hides noise. In finished code, an unused-variable warning usually means a real mistake, so prefer the `_` prefix ([section 4](#var-underscore)) on the one variable that's meant to be unused.

Attributes do much more than control lints. `#[derive(...)]` writes trait code for you ([Note 09](/digital-garden/rust-sandbox/derive/)), and `#[test]` and `#[cfg(test)]` mark tests ([Note 14](/digital-garden/rust-sandbox/doc-comments-tests/#tst-module)).

## 12. All the variable rules together
{: #var-table}

| You want to... | Write | Watch out for |
|---|---|---|
| store a value | `let x = 5;` | read-only by default |
| change it later | `let mut x = 5; x += 1;` | the type can't change |
| transform it, maybe to a new type | `let x = x.trim();` | creates a new variable (shadowing) |
| keep a helper private to a few lines | `let y = { ... };` | the block's last line has no `;` |
| a fixed value used everywhere | `const MAX: u32 = 10;` | type required, compile-time value |
| a readable name for a type | `type Meters = f64;` | not a new type |
| silence one warning | `let _x = ...;` or `#[allow(...)]` | `_` alone drops the value at once |
| understand an error | `rustc --explain E0384` | read the `help:` line |

## Summary: Rust variables and mutability
{: #var-summary}

- `let` creates a read-only variable with one fixed type. Rust usually infers the type, and refuses to read a variable that has no value yet (`E0381`).
- `println!("{x}")` interpolates like an f-string. `{}` uses `Display`, `{:?}` uses `Debug`, and `{0}` or `{name}` pick arguments. The macro checks every slot while compiling.
- Prefix intentionally unused variables with `_`. A bare `_` isn't a variable; it drops the value immediately.
- Add `mut` to change a value (`E0384` without it). `mut` never lets the type change.
- Error codes like `E0384` are documented in the Rust error codes index: run `rustc --explain E0384`.
- Shadowing (`let x = x + 1;`) creates a new variable, can change the type, and inside a block lasts only until the `}`.
- Every `{ }` is a scope. Variables vanish at its end, and a block's last line without `;` is its value.
- `const` needs a type and a compile-time value, can live outside functions, and uses `UPPER_SNAKE_CASE`. `type` makes an alias, not a new type.
- `#[allow(...)]` affects the next item; `#![allow(...)]` the whole file. Lint levels are allow, warn, deny and forbid.
