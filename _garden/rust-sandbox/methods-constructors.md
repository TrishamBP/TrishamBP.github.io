---
layout: garden
guide: rust-sandbox
order: 6
note_no: "06"
nav_title: "Methods and constructors"
title: "Rust Methods, Constructors and Encapsulation: Building the Vector Type"
seo_title: "Rust Methods vs Associated Functions: Constructors, Self & Encapsulation"
description: "Rust methods and constructors explained: associated functions vs methods, Self, field init shorthand, private fields for encapsulation and naming rules."
keywords: "Rust methods, Rust associated functions, Rust constructor new, Rust Self keyword, field init shorthand, Rust encapsulation, Rust private fields, Rust naming conventions, Vec<T>"
lede: "How a real Rust type is built: the Vector struct with a private field, a constructor called new, read-only methods, and the naming conventions that tell you what each method does before you read its body."
sections:
  - id: mth-struct
    title: "1\\. The `Vector` struct: `Vec<T>`, generics and a private field"
  - id: mth-impl
    title: "2\\. The `impl` block and `Self`"
  - id: mth-new
    title: "3\\. `new`: the anatomy of a Rust function"
  - id: mth-assoc-vs-method
    title: "4\\. Associated functions vs methods"
  - id: mth-readonly
    title: "5\\. Read-only methods: `dimension` and `is_empty`"
  - id: mth-into
    title: "6\\. Consuming methods: `into_components`"
  - id: mth-naming
    title: "7\\. Rust naming conventions: read the name, know the cost"
  - id: mth-summary
    title: "Summary: Rust methods and constructors"
---

[Note 05](/digital-garden/rust-sandbox/structs-impl-display/) showed a struct whose fields were all `pub`. Real types usually hide their data and expose **methods** instead. This note builds the demo's `Vector` type that way, one function at a time.

All the code is in `src/math/matrix.rs` of the [demo project](/digital-garden/rust-sandbox/#demo-project).

## 1. The `Vector` struct: `Vec<T>`, generics and a private field
{: #mth-struct}

```rust
#[derive(Debug, Clone, PartialEq)]
pub struct Vector {
    components: Vec<f64>,
}
```

- **`f64`** is a 64-bit floating-point number, like Python's `float`.
- **`Vec<f64>`** is a list of `f64` values that can grow. It's like a Python `list`, but **every element must have the same type**. It stores its numbers on the heap ([Note 04](/digital-garden/rust-sandbox/ownership-borrowing/#own-stack-heap) shows the memory layout).
- **`<f64>`** is a **generic parameter**: `Vec` is written once in the standard library and works for any element type. `Vec<usize>` is a list of integers, and `Vec<String>` a list of strings. [Note 08](/digital-garden/rust-sandbox/traits/#trt-bounds) shows how to write your own generic functions.
- The `#[derive(...)]` line is explained in [Note 09](/digital-garden/rust-sandbox/derive/#der-vector).

### Encapsulation: why `components` has no `pub`
{: #mth-encapsulation}

The struct is `pub`, but its field isn't. So code outside `matrix.rs` can **use** a `Vector` but can't reach inside it:

```rust
// in src/main.rs, outside the module
let v = Vector { components: vec![1.0] };
```

```text
error[E0451]: field `components` of struct `Vector` is private
```

The outside world has to go through the methods (`Vector::new`, `v.components()`, ...). This is **encapsulation**, and it buys you two things:

1. **Freedom to change the inside.** Later you could store the numbers differently, say in a fixed array or with a cached length, and no outside code breaks, because none of it touched the field.
2. **Rules that can't be skipped.** If every `Vector` had to obey some rule (non-empty, normalised...), the constructor could enforce it, and nobody could sneak around it with a struct literal.

Python only has the *convention* `self._components`. Rust's privacy is enforced by the compiler.

## 2. The `impl` block and `Self`
{: #mth-impl}

```rust
impl Vector {
    // every function for Vector goes here
}
```

This is "Form A" from [Note 05](/digital-garden/rust-sandbox/structs-impl-display/#dsp-impl): your own functions for one type, not a trait. Inside the block, **`Self`** (capital S) is a shorthand for the type itself, here `Vector`. Writing `Self` means you don't have to repeat the type's name, and the code survives renaming.

## 3. `new`: the anatomy of a Rust function
{: #mth-new}

```rust
pub fn new(components: Vec<f64>) -> Self {
    Self { components }
}
```

Piece by piece:

| Part | Meaning |
|---|---|
| `pub` | callable from outside the module |
| `fn new` | defines a function named `new` |
| `components: Vec<f64>` | a parameter: **name, then `:`, then type**. Rust requires the type; Python doesn't |
| `-> Self` | the return type, here `Vector` |
| `Self { components }` | builds the struct and is the return value, because there's no `;` ([Note 05](/digital-garden/rust-sandbox/structs-impl-display/#dsp-semicolon)) |

### Field init shorthand
{: #mth-shorthand}

`Self { components }` is short for `Self { components: components }`. When a field and a variable have the same name, you write the name once. This is called **field init shorthand**.

### `new` is a convention, not a keyword
{: #mth-new-convention}

Rust has no built-in constructors like Python's `__init__`. `new` is just an ordinary function that, **by convention**, creates a value. You could call it `make`, but every Rust programmer looks for `new` first.

### The `Vec` moves into the `Vector`
{: #mth-new-move}

The parameter type is `Vec<f64>`, not `&Vec<f64>`. So the caller **gives** the `Vec` away, and it moves into the new `Vector`:

```rust
let data = vec![1.0, 2.0];    // vec! is a macro that creates a Vec
let v = Vector::new(data);    // data moves into v
println!("{:?}", data);       // ERROR: data was moved
```

```text
error[E0382]: borrow of moved value: `data`
```

Only the 24-byte stack part (pointer, length, capacity) moves. The heap numbers stay exactly where they are: **no copy, no new allocation**. That makes `new` as cheap as a constructor can be. If the caller wants to keep their data, there's a second constructor, `from_slice`, in [Note 07](/digital-garden/rust-sandbox/slices-lifetimes/#slc-from-slice).

## 4. Associated functions vs methods
{: #mth-assoc-vs-method}

`new` has **no `self` parameter**. That makes it an **associated function**: it belongs to the type, not to a particular value. You call it with `::` on the type:

```rust
let v = Vector::new(vec![1.0, 2.0]);
```

A function that **does** take `self`, `&self` or `&mut self` is a **method**. You call it with `.` on a value:

```rust
let n = v.dimension();
```

| | Associated function | Method |
|---|---|---|
| First parameter | no `self` | `self`, `&self` or `&mut self` |
| Called as | `Vector::new(...)` | `v.dimension()` |
| Python feel | `@staticmethod` / `@classmethod` | a normal method |
| Typical use | constructors (`new`, `from_slice`) | everything that works on one value |

A method call is just friendlier syntax for an associated-function call. These two lines are identical:

```rust
v.dimension()
Vector::dimension(&v)   // Rust adds the & for you in the line above
```

## 5. Read-only methods: `dimension` and `is_empty`
{: #mth-readonly}

```rust
pub fn dimension(&self) -> usize {
    self.components.len()
}

pub fn is_empty(&self) -> bool {
    self.components.is_empty()
}
```

- `&self` borrows the vector to read it ([Note 04](/digital-garden/rust-sandbox/ownership-borrowing/#own-self)).
- `self.components` reads the private field. That's allowed here, because these methods live in the **same module** as the struct.
- `.len()` is the `Vec`'s own method: the number of elements. `bool` is `true` or `false`.

**Why does `is_empty` exist?** It's a Rust convention: a type that has a "how many" method usually offers `is_empty` too. Clippy, Rust's official lint tool, even has a lint (`len_without_is_empty`) that warns when a public type has a `pub fn len` but no `is_empty`. Our method is called `dimension` rather than `len`, so that lint wouldn't fire. The project follows the convention anyway, because readers expect it.

## 6. Consuming methods: `into_components`
{: #mth-into}

```rust
pub fn into_components(self) -> Vec<f64> {
    self.components
}
```

The parameter is `self`, not `&self`, so the method **takes ownership**. The `Vec` inside moves out to the caller, and the `Vector` no longer exists after the call. [Note 04](/digital-garden/rust-sandbox/ownership-borrowing/#own-self) shows the compiler error you get if you use the vector afterwards.

## 7. Rust naming conventions: read the name, know the cost
{: #mth-naming}

Rust names carry meaning. The standard library and well-written crates follow these patterns, so a method's name tells you whether it copies, borrows or consumes before you read its body:

| Name pattern | Meaning | Examples |
|---|---|---|
| `new` | the main constructor | `Vector::new`, `Vec::new` |
| `from_...` | build from another kind of input | `Vector::from_slice`, `String::from` |
| `into_...` | **consumes** `self` and converts it | `into_components`, `into_iter` |
| `as_...` | a **cheap borrowed view**, no copy | `as_str`, `as_slice` |
| `to_...` | an **owned copy**, possibly expensive | `to_vec`, `to_string` |
| `is_...` / `has_...` | returns `bool` | `is_empty`, `is_nan` |
| `checked_...` | returns a `Result`/`Option` instead of panicking | `checked_add` ([Note 11](/digital-garden/rust-sandbox/error-handling-result/)) |
| `..._mut` | the same, but with mutable access | `iter_mut`, `get_mut` |

The demo's `components()` returns a borrowed view, so by the strict convention it could be called `as_components()`. Many crates use a bare noun for simple getters, though, and that's what this project does.

## Summary: Rust methods and constructors
{: #mth-summary}

- Keep fields private and expose methods: **encapsulation** is enforced by the compiler, not by convention.
- `impl Type { ... }` holds a type's own functions. Inside it, `Self` means the type.
- A function without `self` is an **associated function**, called with `::` (`Vector::new`). One with `self`/`&self`/`&mut self` is a **method**, called with `.`.
- `new` is a convention, not a keyword. Taking `Vec<f64>` by value moves the data in without copying it.
- `Self { components }` is field init shorthand.
- Names follow conventions: `into_` consumes, `as_` borrows cheaply, `to_` copies, `is_` returns `bool`, `checked_` returns a `Result`.
