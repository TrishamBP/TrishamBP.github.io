---
layout: garden
guide: rust-sandbox
order: 9
note_no: "09"
nav_title: "#[derive] and attributes"
title: "Rust #[derive] Explained: Debug, Clone, Copy, PartialEq and Eq"
seo_title: "Rust #[derive] Explained: Debug, Clone, Copy, PartialEq and Eq"
description: "Rust #[derive] explained in plain English: what attributes are, what Debug, Clone, Copy, PartialEq and Eq give you, and why f64 and Vec limit derives."
keywords: "Rust derive, Rust attributes, Rust Debug trait, Rust Clone vs Copy, Rust PartialEq vs Eq, Rust NaN equality, Rust Default trait, derive macro, Rust dataclass"
lede: "The #[derive(...)] line sits above almost every Rust struct. This note explains attributes in plain English, then what each derived trait gives you and why different types derive different lists."
sections:
  - id: der-glossary
    title: "Plain-English glossary: attribute, trait, derive"
  - id: der-files
    title: "The demo files for this Rust derive note"
  - id: der-derive
    title: "1\\. What `#[derive(...)]` does"
  - id: der-traits
    title: "2\\. Each derived trait, one at a time"
  - id: der-lists
    title: "3\\. Why the derive lists differ between types"
  - id: der-vector
    title: "4\\. Worked example: why `Vector` derives only three traits"
  - id: der-memory
    title: "5\\. Memory and performance"
  - id: der-summary
    title: "Summary: Rust `#[derive]`"
---

The line `#[derive(Debug, Clone, Copy, PartialEq, Eq)]` shows up above almost every struct in Rust code. It looks like noise at first, but each word in it changes what you're allowed to do with the type.

This note explains the line piece by piece. It builds on moves from [Note 04](/digital-garden/rust-sandbox/ownership-borrowing/) and on traits from [Note 08](/digital-garden/rust-sandbox/traits/). It starts with a plain-English glossary you can come back to.

## Plain-English glossary: attribute, trait, derive
{: #der-glossary}

A recap of the terms from the earlier notes, plus the new ones. The rest of the note uses all of them.

| Term | In plain English | Everyday analogy |
|---|---|---|
| **struct** | A custom data type that groups a few named values together. | A form with labelled boxes: "left", "right". |
| **field** | One named value inside a struct, such as `left: usize`. | One box on the form. |
| **attribute** `#[...]` | A note to the **compiler** attached to the item directly below it. It's not code that runs. It changes how the compiler treats that item. | A sticky note on a document: "please photocopy this twice". The note isn't part of the document, but it tells the office what to do with it. |
| **trait** | A named set of abilities that a type promises to have, such as "can be printed" or "can be compared". It's similar to an interface in Java or a protocol in Python. [Note 08](/digital-garden/rust-sandbox/traits/) covers traits in depth. | A skill badge: "certified to drive". Any type that holds the badge must actually be able to do the thing. |
| **`impl`** | The block of code where you write how a type performs a trait. | The training that earns the badge. |
| **derive** | "Compiler, write the `impl` for these traits for me." It works for traits whose code follows an obvious pattern (compare every field, print every field...). | Auto-fill on a web form: the browser fills in the boxes it can work out by itself. |
| **move** | Handing a value to a new owner. The old variable can't be used afterwards. | Giving someone your only house key. |
| **copy** | Duplicating the value, so both variables stay usable. | Photocopying a page. |

So `#[derive(Debug, Clone, Copy, PartialEq, Eq)]` reads as: *"Compiler, please give the struct below these five abilities, and write the code for them yourself."*

## The demo files for this Rust derive note
{: #der-files}

These are the files from the [demo project](/digital-garden/rust-sandbox/#demo-project) that this note uses:

```text
shapes_demo/
└── src/
    ├── lib.rs
    ├── main.rs
    └── math/
        ├── mod.rs          <- declares the modules + approx_eq
        ├── matrix.rs       <- DimensionMismatch, Vector, Matrix2
        ├── complex.rs      <- Complex
        └── trigonometry.rs
```

**`src/math/mod.rs`**:

```rust
pub mod complex;
pub mod magnitude;
pub mod matrix;
pub mod trigonometry;

/// The tolerance used when comparing `f64` results.
pub const DEFAULT_TOLERANCE: f64 = 1e-9;

/// Float comparison with a tolerance. `==` is unreliable for f64,
/// and NaN is never equal to anything, not even itself.
pub fn approx_eq(a: f64, b: f64, tolerance: f64) -> bool {
    (a - b).abs() <= tolerance
}
```

**`src/math/matrix.rs`**, the three structs (their methods and the `Display` impl come in other notes):

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DimensionMismatch {
    pub left: usize,
    pub right: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Vector {
    components: Vec<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Matrix2 {
    rows: [[f64; 2]; 2],
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

The fields `components` and `rows` have no `pub`, so they're **private**. Why that matters is covered in [Note 06](/digital-garden/rust-sandbox/methods-constructors/#mth-encapsulation).

`DimensionMismatch` is an error value: "you tried to combine something of size `left` with something of size `right`". It's the main example below.

## 1. What `#[derive(...)]` does
{: #der-derive}

`#[...]` is an **attribute**: an instruction to the compiler about the item directly below it. You've already met `#[allow(dead_code)]` ([Note 01](/digital-garden/rust-sandbox/variables-mutability/#var-directives)), and `#[test]` (this function is a test) comes later.

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

### Python analogy: `@dataclass`

`derive` is like Python's `@dataclass`, which creates `__repr__`, `__eq__` and other methods automatically:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class DimensionMismatch:
    left: int
    right: int
```

The difference is **when** it happens. Python creates these methods while the program runs. Rust creates them while the code compiles, and it checks that they're valid before the program can exist (see [section 3](#der-lists)).

## 2. Each derived trait, one at a time
{: #der-traits}

### `Debug`: print the value for debugging
{: #der-debug}

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

`Debug` does **not** give you `{}`. For `{}` you must implement `Display` yourself, as [Note 05](/digital-garden/rust-sandbox/structs-impl-display/) does for this exact type. Rust deliberately won't derive `Display`: there's no obvious "user-facing" format to generate. Using `{}` on a type without it fails:

```text
error[E0277]: `DimensionMismatch` doesn't implement `std::fmt::Display`
```

### `Clone`: make an explicit copy with `.clone()`
{: #der-clone}

**In plain English:** "You may duplicate me, but you have to ask out loud."

```rust
let a = Vector::new(vec![1.0, 2.0]);
let b = a.clone();      // a and b are now two separate vectors
```

The nearest Python equivalent is `copy.deepcopy(a)`. A derived `clone()` clones every field, and for a `Vec` that means new heap memory plus copying every number.

That's why a clone can be expensive. Writing `.clone()` makes the cost visible in your code.

### `Copy`: assignment copies the value instead of moving it
{: #der-copy}

**In plain English:** "I'm so small and simple that duplicating me is free, so do it automatically."

This is the most important trait in the list for **ownership** ([Note 04](/digital-garden/rust-sandbox/ownership-borrowing/#own-move) explains moves in full). By default, assigning a value to another variable *moves* it, and the old variable can't be used any more:

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

### `PartialEq`: compare values with `==` and `!=`
{: #der-partialeq}

**In plain English:** "You may ask whether two of me are equal."

The name means **Partial Equality** (not "partial equation"). It's the trait that makes `==` and `!=` work. The Python equivalent is `__eq__`. The derived version checks every field, as shown in [section 1](#der-derive).

Why "partial"? Because with this trait alone, a value is **not guaranteed to equal itself**. The next trait explains why that can happen.

### `Eq`: equality is a complete equivalence
{: #der-eq}

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

### Bonus: `Default`, a sensible "empty" value
{: #der-default}

**In plain English:** "If you don't tell me what to be, here is my starting value."

`Complex` derives `Default`, so `Complex::default()` sets every field to *its* default. For `f64` that's `0.0`, so you get `0 + 0i`:

```rust
let z = Complex::default();
println!("{:?}", z);    // Complex { re: 0.0, im: 0.0 }
```

## 3. Why the derive lists differ between types
{: #der-lists}

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

## 4. Worked example: why `Vector` derives only three traits
{: #der-vector}

This line sits directly above `Vector` in `src/math/matrix.rs`:

```rust
#[derive(Debug, Clone, PartialEq)]
pub struct Vector {
    components: Vec<f64>,
}
```

### The three traits `Vector` gets
{: #der-vector-three}

| Trait | What it gives you | Example | Python equivalent |
|---|---|---|---|
| `Debug` | print the value for debugging with `{:?}` | `println!("{:?}", v)` prints `Vector { components: [1.0, 2.0] }` | `__repr__` |
| `Clone` | a full, separate copy with `.clone()` | `let b = a.clone();` | `copy.deepcopy(a)` |
| `PartialEq` | compare two values with `==` and `!=` | `a == b` is `true` if every component is equal | `__eq__` |

### Why "Partial"? The NaN problem, inside a `Vector`
{: #der-vector-partial}

Equality is "partial" because a value isn't always equal to itself. For `f64`, `NaN == NaN` is `false`, and that carries straight through to any struct that holds floats:

```rust
let n = Vector::new(vec![f64::NAN]);
println!("{}", n == n);   // false: n is not equal to itself!
```

**Full** equality is the separate trait `Eq`, which promises that `a == a` is always `true`. `Vector` contains `f64` numbers, so it can't make that promise, and it can only be `PartialEq`.

### Why the list is shorter than `DimensionMismatch`'s
{: #der-vector-shorter}

`DimensionMismatch` derives `Debug, Clone, Copy, PartialEq, Eq`. `Vector` has **no `Copy` and no `Eq`**, and that's deliberate:

- **No `Eq`:** the elements are `f64`, and `f64` has NaN. The compiler doesn't allow `Eq` (`the trait bound 'f64: Eq' is not satisfied`).
- **No `Copy`:** `Vec<f64>` owns heap memory. If assignment copied only the 24 stack bytes, two variables would point at, and both *own*, the same heap numbers. At the end of the scope Rust would free that memory twice, a **double free**. So Rust refuses `Copy` for this type (`error[E0204]`).

### All three traits in action
{: #der-vector-demo}

```rust
let a = Vector::new(vec![1.0, 2.0]);

let b = a.clone();     // Clone: new heap allocation; a is still valid
assert!(a == b);       // PartialEq: compares each component
println!("{:?}", a);   // Debug: Vector { components: [1.0, 2.0] }

let c = a;             // no Copy, so this is a MOVE
// println!("{:?}", a); // ERROR: a was moved into c
```

Uncomment the last line and you get the familiar `error[E0382]: borrow of moved value: 'a'` from [Note 04](/digital-garden/rust-sandbox/ownership-borrowing/#own-move).

**In short:** `Debug` prints with `{:?}`. `Clone` is an explicit copy, which for `Vector` allocates heap memory. `PartialEq` (Partial Equality) gives `==`, and it's "partial" because NaN ≠ NaN. `Vector` can't be `Copy` because it owns heap memory, and can't be `Eq` because it contains `f64`.

## 5. Memory and performance
{: #der-memory}

I checked the sizes with `std::mem::size_of`:

| Type | Size | What a copy costs |
|---|---|---|
| `Matrix2` | 32 bytes (4 × 8-byte `f64`) | Copying 32 bytes. Passed by value like a number, with no heap allocation |
| `Complex` | 16 bytes (2 × `f64`) | Copying 16 bytes |
| `Vector` | 24 bytes on the stack (pointer, length, capacity) **plus** the heap buffer | `Copy` isn't allowed. `.clone()` allocates and copies the whole heap buffer |

- Small `Copy` types like `Matrix2` behave like plain numbers: you can pass them around freely.
- `Vector` owns heap memory, so any copy must be an explicit `.clone()`. You always see the cost in the code.
- All derived code is generated while the code compiles. It has no runtime overhead compared with writing it by hand.

## Summary: Rust `#[derive]`
{: #der-summary}

- `#[...]` is an attribute: a note to the compiler about the item below it.
- `#[derive(...)]` tells the compiler to write trait implementations for you, like Python's `@dataclass` but checked when the code compiles.
- `Debug` lets you print with `{:?}` (and is needed by `assert_eq!`). `PartialEq` (Partial Equality) lets you use `==`.
- `Clone` gives an explicit `.clone()`. `Copy` makes assignment copy the value instead of moving it, and it requires `Clone`.
- `Eq` promises full equality. Floats can't make that promise because of NaN. `HashMap` keys need `Eq + Hash`.
- A type can derive a trait only if every field supports it, and the compiler checks this for you.

