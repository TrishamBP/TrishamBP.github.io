---
layout: garden
guide: rust-sandbox
order: 4
note_no: "04"
nav_title: "Slices and lifetimes"
title: "Rust Slices and Lifetimes: &[T], Deref Coercion and Lifetime Elision"
seo_title: "Rust Slices and Lifetimes Explained: &[T], Deref Coercion, Elision"
description: "Rust slices and lifetimes explained: what &[f64] is, slicing with ranges, to_vec, owning vs borrowing constructors, deref coercion and lifetime elision."
keywords: "Rust slices, Rust &[T], Rust slice vs Vec, Rust to_vec, Rust deref coercion, Rust lifetime elision, Rust lifetimes explained, Rust 'a, does not live long enough, Rust ranges"
lede: "A slice is a borrowed window into a row of values. This note shows how slices let the Vector type accept and lend data without copying, and how lifetimes stop that window from outliving the data behind it."
sections:
  - id: slc-what
    title: "1\\. What a slice is"
  - id: slc-ranges
    title: "2\\. Slicing with ranges"
  - id: slc-from-slice
    title: "3\\. `from_slice`: borrow the input, copy the values"
  - id: slc-new-vs-from
    title: "4\\. `new` vs `from_slice`: who keeps the data?"
  - id: slc-components
    title: "5\\. Lending the data: `components()` and deref coercion"
  - id: slc-elision
    title: "6\\. Lifetime elision: the hidden `'a`"
  - id: slc-summary
    title: "Summary: Rust slices and lifetimes"
---

[Note 01](/digital-garden/rust-sandbox/ownership-borrowing/#own-borrow) introduced borrowing with `&T`. This note is about the most common borrowed type in Rust code, the **slice**, and the **lifetime** that the compiler quietly attaches to every borrow.

The code continues the `Vector` type from [Note 03](/digital-garden/rust-sandbox/methods-constructors/).

## 1. What a slice is
{: #slc-what}

**`&[f64]`** is a **slice**: a borrowed view into a row of `f64` values that sit next to each other in memory.

- It holds just two things: a **pointer** to the first element, and a **length**.
- It **doesn't own** the data. Someone else does: a `Vec`, an array, or part of one.

**Analogy:** a slice is a window onto a shelf of books. You can see a run of books through it, but you don't own the shelf, and the window is useless once the shelf is gone.

```text
data: Vec<f64> (owner)            &data[1..3] (a slice)
┌─────┬─────┬─────┬─────┐         ┌──────────────┐
│ 1.0 │ 2.0 │ 3.0 │ 4.0 │ ◄───────┤ pointer      │
└─────┴─────┴─────┴─────┘         │ length = 2   │
        ▲ points at index 1       └──────────────┘
```

On a 64-bit machine `size_of::<&[f64]>()` is **16 bytes** (pointer + length), and `size_of::<&Vec<f64>>()` is 8 bytes (just a pointer to the `Vec`). A reference that carries extra information like this is called a **fat pointer**.

## 2. Slicing with ranges
{: #slc-ranges}

You make a slice by indexing with a **range**. The end is **excluded**, exactly like Python's slicing:

```rust
let data = vec![1.0, 2.0, 3.0, 4.0];

&data[1..3]   // [2.0, 3.0]   indices 1 and 2
&data[..2]    // [1.0, 2.0]   from the start
&data[2..]    // [3.0, 4.0]   to the end
&data[..]     // all four
```

Unlike Python, a range that goes past the end isn't quietly shortened. It **panics**:

```text
range end index 9 out of range for slice of length 4
```

Ranges also drive `for` loops; see [Note 09](/digital-garden/rust-sandbox/iterators-closures/#itr-for).

## 3. `from_slice`: borrow the input, copy the values
{: #slc-from-slice}

```rust
pub fn from_slice(values: &[f64]) -> Self {
    Self {
        components: values.to_vec(),
    }
}
```

- The parameter is a **borrowed** slice, so the caller keeps their data.
- **`.to_vec()`** creates a brand-new `Vec` and copies the values into it. That costs one heap allocation plus the copy (the `to_` prefix signals the cost; see the [naming table](/digital-garden/rust-sandbox/methods-constructors/#mth-naming)).

Because it takes a slice, `from_slice` accepts many different sources:

```rust
let data = vec![1.0, 2.0, 3.0, 4.0];

Vector::from_slice(&data);         // a whole Vec        -> [1.0, 2.0, 3.0, 4.0]
Vector::from_slice(&data[1..3]);   // part of a Vec      -> [2.0, 3.0]
Vector::from_slice(&[9.0, 8.0]);   // an array literal   -> [9.0, 8.0]

println!("{:?}", data);            // data is still usable: it was only borrowed
```

## 4. `new` vs `from_slice`: who keeps the data?
{: #slc-new-vs-from}

| Constructor | Input | Cost | Does the caller keep the data? |
|---|---|---|---|
| `new` ([Note 03](/digital-garden/rust-sandbox/methods-constructors/#mth-new-move)) | `Vec<f64>` (owned) | no copy | no, the data moved |
| `from_slice` | `&[f64]` (borrowed) | one allocation and a copy | yes |

Offering both is idiomatic Rust: the caller picks between "take my data, I'm done with it" (fast) and "copy it, I still need mine" (safe and flexible).

A related convention: when a function only **reads** a list, take `&[T]` rather than `&Vec<T>`. A `&[T]` accepts vectors, arrays and sub-ranges, while `&Vec<T>` only accepts a whole `Vec`.

## 5. Lending the data: `components()` and deref coercion
{: #slc-components}

```rust
pub fn components(&self) -> &[f64] {
    &self.components
}
```

The method returns a **reference**: the caller gets a read-only view into the vector's heap data, and nothing is copied.

Look at the types, though. `&self.components` is a **`&Vec<f64>`**, but the function promises a **`&[f64]`**. It compiles because of **deref coercion**: a `Vec<T>` can always act as a slice of its elements, so Rust converts `&Vec<f64>` into `&[f64]` automatically wherever a slice is expected.

The same coercion is why `Vector::from_slice(&data)` worked above with a `Vec`. And it's why `&String` can be passed where a `&str` is expected.

## 6. Lifetime elision: the hidden `'a`
{: #slc-elision}

The returned slice points into `self`. If the `Vector` were freed, the slice would point at freed memory. So the compiler must know: **how long is the returned reference valid?**

The full form of the signature answers it with a **lifetime parameter**, `'a`:

```rust
pub fn components<'a>(&'a self) -> &'a [f64]
```

Read `'a` as a label for "some stretch of time". The signature says: *the output is valid for as long as the borrow of `self` is valid.*

You almost never write this, because of **lifetime elision**: for common patterns, the compiler fills in the lifetimes itself. The rule used here is: **if a method takes `&self`, any returned reference borrows from `self`.** (With a single reference parameter, the output borrows from that parameter.)

### What the lifetime prevents
{: #slc-dangling}

```rust
let slice;
{
    let v = Vector::new(vec![1.0]);
    slice = v.components();
}                          // v is dropped here
println!("{:?}", slice);   // ERROR: slice would point into freed memory
```

```text
error[E0597]: `v` does not live long enough
```

It's the same rule as in [Note 01](/digital-garden/rust-sandbox/ownership-borrowing/#own-outlive), but now flowing through a method. The hidden `'a` in `components` ties `slice` to `v`, so the compiler knows the slice must die before `v` does.

When the compiler **can't** work out which input an output borrows from (for example, a function taking two references and returning one), elision doesn't apply, and you have to write the `'a` yourself.

## Summary: Rust slices and lifetimes
{: #slc-summary}

- A slice `&[T]` is a borrowed view (pointer + length, 16 bytes) into a `Vec`, an array, or part of either. It never owns the data.
- Slice with ranges: `&v[1..3]`, `&v[..2]`, `&v[2..]`. The end is excluded, and out-of-range slicing panics.
- `.to_vec()` copies a slice into a new, owned `Vec`.
- Offer `new(Vec<T>)` for moving data in and `from_slice(&[T])` for copying. Take `&[T]` in functions that only read.
- **Deref coercion** turns `&Vec<T>` into `&[T]` (and `&String` into `&str`) automatically.
- **Lifetime elision** adds the `'a` for you: a reference returned from a `&self` method borrows from `self`, and can't outlive it.
