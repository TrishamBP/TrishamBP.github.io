---
layout: garden
guide: rust-sandbox
order: 8
note_no: "08"
nav_title: "Traits"
title: "Rust Traits Explained: Shared Behaviour, Generics and dyn Trait"
seo_title: "Rust Traits Explained: Define, Implement, Generics & dyn Trait"
description: "Rust traits explained for beginners: define and implement a trait, default methods, trait bounds and generics, impl Trait, dyn Trait and the orphan rule."
keywords: "Rust traits, Rust trait tutorial, implement trait Rust, Rust trait bounds, Rust generics, impl Trait, dyn Trait, Rust default methods, Rust operator overloading, Rust orphan rule"
lede: "Traits are how Rust shares behaviour between types without inheritance. This note defines a trait from scratch, implements it for three different types, and shows every way to use it, with the compiler errors that keep you honest."
sections:
  - id: trt-what
    title: "1\\. What a trait is, in plain English"
  - id: trt-define
    title: "2\\. Defining a trait"
  - id: trt-impl
    title: "3\\. Implementing a trait for several types"
  - id: trt-scope
    title: "4\\. Calling trait methods: the trait must be in scope"
  - id: trt-bounds
    title: "5\\. Trait bounds: functions that accept \"anything that can...\""
  - id: trt-dyn
    title: "6\\. `dyn Trait`: mixing different types in one list"
  - id: trt-operators
    title: "7\\. Operators are traits too"
  - id: trt-orphan
    title: "8\\. The orphan rule: what you're allowed to implement"
  - id: trt-std
    title: "9\\. The standard traits you'll meet everywhere"
  - id: trt-summary
    title: "Summary: Rust traits"
---

Display (in [Note 05](/digital-garden/rust-sandbox/structs-impl-display/)) was one trait. `#[derive]` (in [Note 09](/digital-garden/rust-sandbox/derive/)) is a way to get traits for free. This note answers the general question: **what is a trait, and what can you do with one?**

We'll write our own trait, `Magnitude`, so nothing is hidden inside the standard library.

## 1. What a trait is, in plain English
{: #trt-what}

A **trait** is a named list of methods that a type **promises** to have. Any type can sign up for the promise by implementing the trait.

**Analogy:** a "driver's licence" is a trait. It doesn't care whether you're a teacher or a chef. It only says: *whoever holds this licence can drive*. A car-rental desk only asks for the licence, not your job.

In code, that means a function can say *"give me anything that can do X"*, instead of naming one concrete type.

| Language | Same idea | Difference from Rust |
|---|---|---|
| Java / C# | `interface` | Rust has no class inheritance at all; traits are the only way to share behaviour |
| Python | `typing.Protocol`, or plain duck typing | Python checks at runtime ("does it have the method?"). Rust checks **while the code compiles** |
| Go | `interface` | Go implements interfaces implicitly. Rust requires an explicit `impl Trait for Type` |

## 2. Defining a trait
{: #trt-define}

New file **`src/math/magnitude.rs`**, declared with `pub mod magnitude;` in `src/math/mod.rs`:

```rust
use super::complex::Complex;
use super::matrix::Vector;

/// Anything that has a size (a length, a norm, an absolute value).
pub trait Magnitude {
    /// Required: every implementing type must write this.
    fn magnitude(&self) -> f64;

    /// Provided: a default body that every type gets for free.
    fn is_unit(&self) -> bool {
        (self.magnitude() - 1.0).abs() < 1e-9
    }
}
```

Read it line by line:

- `pub trait Magnitude { ... }` declares the contract. `pub` lets other modules use it.
- `fn magnitude(&self) -> f64;` ends with a **`;` and has no body**. That makes it a **required method**: every type that implements the trait must provide it.
- `fn is_unit(&self) -> bool { ... }` **has a body**. That makes it a **provided (default) method**: implementers get it for free, and may override it. Notice that it calls `self.magnitude()`, even though it doesn't know which type `self` is yet. That's fine, because the trait guarantees the method exists.

## 3. Implementing a trait for several types
{: #trt-impl}

Same file. Each type explains, in its own way, what "magnitude" means for it:

```rust
impl Magnitude for Vector {
    fn magnitude(&self) -> f64 {
        // length of the arrow: sqrt(x² + y² + ...)
        self.components().iter().map(|x| x * x).sum::<f64>().sqrt()
    }
}

impl Magnitude for Complex {
    fn magnitude(&self) -> f64 {
        // distance from 0 on the complex plane: sqrt(re² + im²)
        (self.re * self.re + self.im * self.im).sqrt()
    }
}

impl Magnitude for f64 {
    fn magnitude(&self) -> f64 {
        self.abs()
    }
}
```

Three things worth noticing:

1. **None of them writes `is_unit`**, yet all three get it from the default body.
2. **You can implement your trait for a built-in type** like `f64`. In Python you can't add methods to `float`, but in Rust this is normal, because the trait is yours.
3. `Vector`'s field `components` is private, so `magnitude.rs` reads it through the public method `components()` (which returns a read-only `&[f64]` view).

Forget the required method and the compiler names exactly what's missing:

```rust
impl Magnitude for P {}
```

```text
error[E0046]: not all trait items implemented, missing: `magnitude`
```

## 4. Calling trait methods: the trait must be in scope
{: #trt-scope}

```rust
use shapes_demo::math::magnitude::Magnitude; // <- needed!
use shapes_demo::math::matrix::Vector;

let v = Vector::new(vec![3.0, 4.0]);
println!("{}", v.magnitude());  // 5
println!("{}", v.is_unit());    // false
```

Delete the `use ...::Magnitude;` line and the method seems to vanish:

```text
error[E0599]: no method named `magnitude` found for struct `Vector` in the current scope
  = help: items from traits can only be used if the trait is in scope
```

This surprised me. **Trait methods are only callable where the trait itself is imported.** It keeps two unrelated traits with a method of the same name from clashing. The common standard traits (`Clone`, `PartialEq`, `ToString`, `Iterator`...) are in the **prelude**, which Rust imports into every file for you. That's why you never write `use` for them. (See [Note 13](/digital-garden/rust-sandbox/modules-use/#mod-use) for how `use` works.)

## 5. Trait bounds: functions that accept "anything that can..."
{: #trt-bounds}

This is where traits really pay off. One function can work for **every** type that implements `Magnitude`:

```rust
fn describe<T: Magnitude>(x: &T) -> String {
    format!("magnitude {:.3}, unit: {}", x.magnitude(), x.is_unit())
}

describe(&Vector::new(vec![3.0, 4.0]));   // "magnitude 5.000, unit: false"
describe(&Complex { re: 0.0, im: 1.0 });  // "magnitude 1.000, unit: true"
describe(&-2.5_f64);                      // "magnitude 2.500, unit: false"
```

How to read `fn describe<T: Magnitude>(x: &T)`:

- `<T>` declares a **generic type parameter**: a placeholder for "some type, to be decided by the caller".
- `T: Magnitude` is a **trait bound**: "...but only types that implement `Magnitude`".
- `x: &T` borrows a value of that type.

Pass a type that doesn't implement the trait, and the build fails *at the call*, before anything runs:

```rust
describe(&5_i32);
```

```text
error[E0277]: the trait bound `i32: Magnitude` is not satisfied
```

In Python, the equivalent mistake would only appear at runtime, as an `AttributeError`, when that line happens to run.

### Three ways to write the same bound
{: #trt-bound-syntax}

```rust
// 1. Generic parameter with a bound
fn describe<T: Magnitude>(x: &T) -> String { /* ... */ }

// 2. `impl Trait` shorthand: same meaning, shorter
fn describe_short(x: &impl Magnitude) -> f64 {
    x.magnitude()
}

// 3. `where` clause: same meaning, tidier when there are many bounds
fn largest<T>(items: &[T]) -> f64
where
    T: Magnitude,
{
    items.iter().map(|x| x.magnitude()).fold(0.0, f64::max)
}
```

Use `impl Trait` for simple cases, and `where` when the bounds get long, such as `T: Magnitude + Clone + fmt::Debug`. The `+` means "must implement **all** of these".

### What generics cost: nothing at runtime
{: #trt-mono}

For generic functions, the compiler writes a **separate copy of the function for each concrete type you use** (`describe` for `Vector`, `describe` for `Complex`, ...). This is called **monomorphization**. Each copy calls the right `magnitude` directly, so it's as fast as hand-written code. The cost is a slightly bigger binary and longer compile times.

## 6. `dyn Trait`: mixing different types in one list
{: #trt-dyn}

Generics need one concrete type per call. But what if you want a list that holds a `Vector`, a `Complex` **and** an `f64` together? A `Vec` can only hold one type... unless that type is "something that implements `Magnitude`":

```rust
let things: Vec<Box<dyn Magnitude>> = vec![
    Box::new(Vector::new(vec![3.0, 4.0])),
    Box::new(Complex { re: 0.0, im: 1.0 }),
    Box::new(-7.0_f64),
];

for t in &things {
    println!("{}", t.magnitude());   // 5, then 1, then 7
}
```

- `dyn Magnitude` means "some type that implements `Magnitude`; we'll find out which **at runtime**".
- `Box<...>` puts each value on the heap. The values have different sizes, but every `Box` is the same size, so they fit in one `Vec`.

This is **dynamic dispatch**. Each value carries a hidden pointer to a table of its methods (a **vtable**), and the right `magnitude` is looked up while the program runs. You can see the extra pointer: on a 64-bit machine `size_of::<&Vector>()` is 8 bytes, but `size_of::<&dyn Magnitude>()` is **16**, a data pointer plus a vtable pointer.

| | Generics `<T: Trait>` | `dyn Trait` |
|---|---|---|
| Which method to call | decided while compiling | looked up at runtime (vtable) |
| Speed | fastest, can be inlined | one extra pointer lookup per call |
| Mixed types in one collection | no | yes |
| Binary size | one copy per type used | one copy total |

Rule of thumb: **reach for generics first**, and use `dyn Trait` when you truly need mixed types together, such as plugins, UI widgets, or a list of shapes.

## 7. Operators are traits too
{: #trt-operators}

In Python, `a + b` calls `a.__add__(b)`. In Rust, `a + b` calls the `add` method of the **`std::ops::Add`** trait. So to make `+` work for `Complex`, you implement `Add` (in **`src/math/complex.rs`**):

```rust
use std::ops::Add;

impl Add for Complex {
    type Output = Complex;

    fn add(self, other: Complex) -> Complex {
        Complex { re: self.re + other.re, im: self.im + other.im }
    }
}

let sum = Complex { re: 1.0, im: 2.0 } + Complex { re: 3.0, im: -1.0 };
println!("{:?}", sum);   // Complex { re: 4.0, im: 1.0 }
```

`type Output = Complex;` is an **associated type**: the trait lets each implementer choose what `+` returns. Adding two `Complex` values gives a `Complex`.

`Vector` doesn't implement `Add`, so `v + w` is rejected with `error[E0369]: cannot add 'Vector' to 'Vector'`. The same pattern gives you `-` (`Sub`), `*` (`Mul`), `==` (`PartialEq`) and `<` (`PartialOrd`).

## 8. The orphan rule: what you're allowed to implement
{: #trt-orphan}

You can implement a trait for a type only if **you own the trait or the type** (or both):

| Trait | Type | Allowed? | Example |
|---|---|---|---|
| yours | yours | yes | `impl Magnitude for Vector` |
| yours | foreign | yes | `impl Magnitude for f64` |
| foreign | yours | yes | `impl fmt::Display for DimensionMismatch` |
| foreign | foreign | **no** | `impl fmt::Display for Vec<f64>` |

```text
error[E0117]: only traits defined in the current crate can be implemented
              for types defined outside of the crate
```

Why? If two libraries could both implement `Display` for `Vec<f64>`, Rust couldn't know which one to use. The rule guarantees there's only ever **one** implementation. The usual workaround is a small wrapper type of your own, which is exactly what `Vector` (a wrapper around `Vec<f64>`) already is.

## 9. The standard traits you'll meet everywhere
{: #trt-std}

Most everyday Rust is these standard traits, implemented by hand or with `#[derive]`:

| Trait | Gives you | Derive? | Python feel |
|---|---|---|---|
| `Debug` | `{:?}` printing | yes | `__repr__` |
| `Display` | `{}` printing and `.to_string()` | no | `__str__` |
| `Clone` / `Copy` | `.clone()` / implicit copies | yes | `copy.deepcopy` |
| `PartialEq` / `Eq` | `==`, `!=` | yes | `__eq__` |
| `PartialOrd` / `Ord` | `<`, `>`, sorting | yes | `__lt__` |
| `Hash` | use as a `HashMap` key | yes | `__hash__` |
| `Default` | `Type::default()` | yes | default arguments |
| `Add`, `Sub`, `Mul`, ... | `+`, `-`, `*` | no | `__add__` |
| `From` / `Into` | conversions between types | no | `int("5")`-style |
| `Iterator` | `for` loops, `.map()`, `.sum()` | no | `__iter__` / `__next__` |
| `Drop` | cleanup code when a value is freed | no | `__del__` (but reliable) |

Two connections to earlier notes:

- **Free methods from blanket impls.** The standard library says, in effect, `impl<T: Display> ToString for T`: *every* type that implements `Display` automatically gets `.to_string()`. That's why `e.to_string()` worked in [Note 05](/digital-garden/rust-sandbox/structs-impl-display/#dsp-flow).
- **Supertraits.** A trait can require another one: `trait Copy: Clone`. That's why every `Copy` type must also be `Clone`, as [Note 09](/digital-garden/rust-sandbox/derive/#der-copy) showed.

## Summary: Rust traits
{: #trt-summary}

- A trait is a named set of methods that a type promises to have, like an interface, but checked while the code compiles.
- Methods ending in `;` are **required**. Methods with a body are **provided** (defaults).
- `impl Trait for Type` signs a type up. You can implement your own traits for built-in types like `f64`.
- Trait methods only work where the trait is **in scope** (`use`).
- `fn f<T: Trait>(x: &T)`, `x: &impl Trait` and `where T: Trait` all mean "any type that implements `Trait`". They compile to fast, type-specific copies.
- `dyn Trait` (usually `Box<dyn Trait>`) mixes different types at the cost of a runtime vtable lookup.
- Operators like `+` are traits (`std::ops::Add`), and the orphan rule says you must own the trait or the type.
