---
layout: garden
guide: rust-sandbox
order: 9
note_no: "09"
nav_title: "Iterators and closures"
title: "Rust Iterators and Closures: zip, map, collect, sum and the Turbofish"
seo_title: "Rust Iterators and Closures Explained: zip, map, collect & Turbofish"
description: "Rust iterators and closures explained step by step: iter vs iter_mut vs into_iter, zip, map, collect, type inference, laziness, sum and the turbofish."
keywords: "Rust iterators, Rust closures, Rust iter zip map collect, Rust collect type inference, Rust turbofish, Rust lazy iterators, zero-cost abstraction, Rust for loop range, Rust lambda, Rust sum"
lede: "One line of iterator code in checked_add replaces a whole loop. This note reads that chain one step at a time, then covers closures, laziness, type inference and the turbofish."
sections:
  - id: itr-chain
    title: "1\\. Reading an iterator chain step by step"
  - id: itr-iter
    title: "2\\. `iter`, `iter_mut` and `into_iter`"
  - id: itr-zip
    title: "3\\. `zip`: walking two sequences together"
  - id: itr-closures
    title: "4\\. Closures: small functions without a name"
  - id: itr-collect
    title: "5\\. `collect` and type inference"
  - id: itr-lazy
    title: "6\\. Iterators are lazy, and cost nothing extra"
  - id: itr-sum
    title: "7\\. `sum`: a result with no allocation"
  - id: itr-turbofish
    title: "8\\. The turbofish `::<>`"
  - id: itr-for
    title: "9\\. `for` loops and ranges"
  - id: itr-summary
    title: "Summary: Rust iterators and closures"
---

This is the body of `Vector::checked_add` after the dimension check from [Note 08](/digital-garden/rust-sandbox/error-handling-result/#err-question):

```rust
let components = self
    .components
    .iter()
    .zip(&other.components)
    .map(|`.map(|(a, b)| a + b)`| a + b)
    .collect();
Ok(Vector { components })
```

It looks dense, but it's just four small steps. This note takes them one at a time.

## 1. Reading an iterator chain step by step
{: #itr-chain}

An **iterator** hands out values **one at a time**. Each `.something()` takes the iterator from the line above and produces a new one. This style is called **method chaining**, and by convention each call goes on its own line.

With `a = [1, 2, 3]` and `b = [10, 20, 30]`:

| Step | Code | Produces |
|---|---|---|
| 1 | `self.components.iter()` | `&1, &2, &3` (borrowed values) |
| 2 | `.zip(&other.components)` | `(&1, &10), (&2, &20), (&3, &30)` (pairs) |
| 3 | <code>.map(&#124;(a, b)&#124; a + b)</code> | `11, 22, 33` |
| 4 | `.collect()` | a `Vec`: `[11, 22, 33]` |

The Python equivalent is a list comprehension:

```python
components = [a + b for a, b in zip(self.components, other.components)]
```

`checked_sub` is the same chain with `a - b`.

## 2. `iter`, `iter_mut` and `into_iter`
{: #itr-iter}

There are three ways to walk through a `Vec`, and they map directly onto the three ways of using a value from [Note 01](/digital-garden/rust-sandbox/ownership-borrowing/#own-self):

| Method | Each item is | The `Vec` afterwards | Used in the demo |
|---|---|---|---|
| `.iter()` | `&f64`, a shared borrow | unchanged | `checked_add`, `dot` |
| `.iter_mut()` | `&mut f64`, a mutable borrow | changed in place | `scale`: `for x in self.components.iter_mut() { *x *= k; }` |
| `.into_iter()` | `f64`, owned | consumed (moved) | |

In `scale`, `*x` **dereferences** the `&mut f64`: "the number that `x` points to". `*x *= k` multiplies that number in place.

`checked_add` only needs to read, so it uses `.iter()`. That's why its items are `&f64`, not `f64`.

## 3. `zip`: walking two sequences together
{: #itr-zip}

`.zip(...)` joins two iterators into pairs, like Python's `zip`. The argument can be anything iterable: `&other.components` borrows the other vector's `Vec`.

An important detail: **`zip` silently stops at the shorter input**.

```rust
let a = [1.0, 2.0];
let b = [10.0, 20.0, 30.0];
// a.iter().zip(&b).map(|(x, y)| x + y).collect()  ->  [11.0, 22.0]
```

No error, the `30.0` is just ignored. **That's the real reason `checked_add` calls `check_same_dimension` first.** Without it, adding a 2-vector to a 3-vector would quietly return a wrong 2-vector.

## 4. Closures: small functions without a name
{: #itr-closures}

```rust
|`.map(|(a, b)| a + b)`| a + b
```

This is a **closure**: a small anonymous function, like Python's `lambda`.

- The parameters go between the bars `| |`.
- **``.map(|(a, b)| a + b)``** is a pattern that unpacks each pair from `zip` ([destructuring](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-destructure)). The Python equivalent is `lambda pair: pair[0] + pair[1]`.
- After the bars comes the body. A single expression needs no braces and no `return`.

`a` and `b` are `&f64`, and Rust allows `&f64 + &f64` directly. The result is a plain `f64`.

### Closures can be stored and can capture variables
{: #itr-closure-vars}

A closure is a value, so you can keep it in a variable and call it like a function. One of the demo's tests does this, with the parameter types written out for clarity:

```rust
let dot = |u: Vector2, w: Vector2| Vector::from_slice(&u).dot(&Vector::from_slice(&w));
let before = dot(u, w).unwrap();
```

Unlike a normal `fn`, a closure can also use variables from the code around it (it **captures** them):

```rust
let k = 2.0;
let scale = |x: f64| x * k;   // uses k from outside
scale(3.0)                    // 6.0
```

## 5. `collect` and type inference
{: #itr-collect}

`.collect()` gathers the values into a collection. But **which** collection? A `Vec`, a `HashSet`, a `String`? `collect` can build any of them.

Rust **infers** the answer from how the result is used. The next line is `Ok(Vector { components })`, and the `components` field is a `Vec<f64>`, so `collect` builds a `Vec<f64>`. This is **type inference**: the compiler works out types you didn't write.

If nothing tells the compiler the type, it asks:

```rust
let w = v.iter().map(|x| x * 2.0).collect();
```

```text
error[E0283]: type annotations needed
  = note: the type must implement `FromIterator<f64>`
```

Fix it by naming the type on the variable, `let w: Vec<f64> = ...`, or on the call (see [the turbofish](#itr-turbofish)).

**Memory:** `.collect()` makes **one** heap allocation, for the result. The two input vectors are only borrowed.

## 6. Iterators are lazy, and cost nothing extra
{: #itr-lazy}

Steps 1 to 3 do **nothing by themselves**. They only describe the work. It happens when something **consumes** the iterator, like `.collect()`, `.sum()` or a `for` loop. Build a chain and never consume it, and the compiler warns you:

```rust
v.iter().map(|x| x * 2.0);
```

```text
warning: unused `Map` that must be used
  = note: iterators are lazy and do nothing unless consumed
```

Because the whole chain is known while compiling, the compiler fuses it into **one simple loop**, as fast as one you'd write by hand. Rust calls this a **zero-cost abstraction**: the readable version costs nothing at runtime.

## 7. `sum`: a result with no allocation
{: #itr-sum}

```rust
pub fn dot(&self, other: &Vector) -> Result<f64, DimensionMismatch> {
    self.check_same_dimension(other)?;
    Ok(self
        .components
        .iter()
        .zip(&other.components)
        .map(|`.map(|(a, b)| a + b)`| a * b)
        .sum())
}
```

`.sum()` adds up all the values into **one number**, so no `Vec` is created: no heap allocation at all. Rust knows the sum is an `f64` from the return type, `Result<f64, ...>`.

This is the dot product: a · b = a₁b₁ + a₂b₂ + ... + aₙbₙ.

## 8. The turbofish `::<>`
{: #itr-turbofish}

The `Magnitude` trait's implementation for `Vector` ([Note 05](/digital-garden/rust-sandbox/traits/#trt-impl)) contains this line:

```rust
self.components().iter().map(|x| x * x).sum::<f64>().sqrt()
```

`.map(|(a, b)| a + b)`|x| x * x)` squares each component, and `.sum::<f64>()` adds them up. The **`::<f64>`** is nicknamed the **turbofish** (`::<>` looks like a fish) and states the type directly.

**Why is it needed here, but not in `dot`?** `sum` can produce many types. In `dot`, the return type told Rust which one. Here, the next call is `.sqrt()`, and Rust can't pick a type for `sum` just from the fact that a method is called on the result. Without the turbofish:

```text
error[E0282]: type annotations needed
```

The maths: ‖v‖ = √(v₁² + v₂² + ... + vₙ²). For `[3, 4]`, that's √(9 + 16) = 5.

The turbofish works on `collect` too: `.collect::<Vec<f64>>()`.

## 9. `for` loops and ranges
{: #itr-for}

A `for` loop consumes an iterator, one item per pass:

```rust
for row in 0..2 {            // 0, 1
    for col in 0..2 { /* ... */ }
}
```

- `0..2` is a **range**: 0 and 1. The end is excluded, like Python's `range(0, 2)`.
- `0..=2` includes the end: 0, 1, 2.
- A `for` loop can walk an array directly, and destructure each item:

```rust
for theta in [-2.0, -0.3, 0.0, 0.7] { /* ... */ }
for (alpha, beta) in [(0.3, 0.4), (1.0, -2.5)] { /* ... */ }
```

The same range syntax makes slices ([Note 04](/digital-garden/rust-sandbox/slices-lifetimes/#slc-ranges)).

## Summary: Rust iterators and closures
{: #itr-summary}

- An iterator chain is a pipeline: `iter` → `zip` → `map` → `collect`, each step working on the one before.
- `.iter()` borrows items (`&T`), `.iter_mut()` borrows them mutably, `.into_iter()` takes ownership.
- `zip` stops at the shorter input **silently**, so check lengths first.
- Closures `|args| body` are anonymous functions. They can be stored in variables and can capture surrounding variables.
- `collect` builds whatever collection the context asks for (type inference). Write the type when nothing else says it.
- Iterators are lazy (nothing runs until consumed) and compile to plain loops: a zero-cost abstraction.
- `sum` allocates nothing. The turbofish `::<T>` names a type the compiler can't infer.
- `for x in 0..n` (end excluded) and `0..=n` (end included) loop over ranges, arrays and tuples.
