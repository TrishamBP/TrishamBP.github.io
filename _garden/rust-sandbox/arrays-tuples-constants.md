---
layout: garden
guide: rust-sandbox
order: 10
note_no: "10"
nav_title: "Arrays, tuples and constants"
title: "Rust Arrays, Tuples, Constants and Destructuring: The Matrix2 Type"
seo_title: "Rust Arrays, Tuples, const fn and Destructuring Explained (Matrix2)"
description: "Rust arrays, tuples and constants explained with a 2x2 matrix: [T; N] vs Vec, type aliases, const fn, destructuring, free functions and number literals."
keywords: "Rust arrays, Rust array vs Vec, Rust tuples, Rust type alias, Rust const fn, Rust associated constant, Rust destructuring, Rust pattern matching, Rust number literals, Rust Copy types"
lede: "Not all data needs the heap. This note builds a 2x2 rotation matrix entirely on the stack, using fixed-size arrays, tuples, compile-time constants and destructuring patterns."
sections:
  - id: arr-arrays
    title: "1\\. Arrays: `[T; N]`"
  - id: arr-alias
    title: "2\\. Type aliases: `Vector2`"
  - id: arr-vs-vec
    title: "3\\. Array or `Vec`?"
  - id: arr-matrix2
    title: "4\\. `Matrix2`: a nested array inside a struct"
  - id: arr-const
    title: "5\\. Compile-time constants: `const`, associated constants and `const fn`"
  - id: arr-self-copy
    title: "6\\. `self` by value for small `Copy` types"
  - id: arr-destructure
    title: "7\\. Destructuring: taking data apart in one line"
  - id: arr-tuples
    title: "8\\. Tuples: fixed groups of values"
  - id: arr-free
    title: "9\\. Free functions: `rotate_vector`"
  - id: arr-literals
    title: "10\\. Number literals: Rust doesn't mix integers and floats"
  - id: arr-summary
    title: "Summary: Rust arrays, tuples and constants"
---

`Vector` ([Note 06](/digital-garden/rust-sandbox/methods-constructors/)) can hold any number of components, so it needs a heap-allocated `Vec`. For 2-D geometry the size is **always 2**, and Rust has better tools for fixed-size data. This note covers the rest of `src/math/matrix.rs`: `Vector2`, `Matrix2` and `rotate_vector`.

## 1. Arrays: `[T; N]`
{: #arr-arrays}

```rust
[f64; 2]
```

This is an **array**: exactly 2 `f64` values, stored side by side, with no heap involved.

The length is **part of the type**. So `[f64; 2]` and `[f64; 3]` are different types, and the compiler checks the length:

```rust
let a: [f64; 2] = [1.0, 2.0, 3.0];
```

```text
error[E0308]: mismatched types
help: consider specifying the actual array length
```

Indexing starts at 0, as in Python: `a[0]`, `a[1]`.

### Reading and writing array elements
{: #arr-elements}

```rust
let mut scores = [0.0; 3];   // [0.0, 0.0, 0.0]: value; count
scores[1] = 2.5;             // write one element
scores[2] += 1.0;            // update in place
let first = scores[0];       // read (f64 is Copy, so this copies it)
println!("{:?} len={}", scores, scores.len());   // [0.0, 2.5, 1.0] len=3
```

- `[value; count]` builds an array with every element set to the same value. `[[0; 2]; 2]` is a 2×2 grid of zeros.
- Writing an element changes the array, so the array must be `let mut`. Without it you get `error[E0594]: cannot assign to 'a[_]', as 'a' is not declared as mutable`.
- The index must be a `usize` ([Note 02](/digital-garden/rust-sandbox/integers-floats-casting/#num-usize)).
- Arrays print with `{:?}`, not `{}`.

**Out of bounds:** Python raises `IndexError`; Rust never reads past the end either. A constant index the compiler can check is a build error. An index computed at runtime is checked when it runs, and **panics**:

```text
error: this operation will panic at runtime
  |     println!("{}", a[3]);
  |                    ^^^^ index out of bounds: the length is 3 but the index is 3
```

```text
thread 'main' panicked at ...
index out of bounds: the len is 3 but the index is 3
```

When an index might be invalid, use `.get(i)`. It returns an `Option` instead of panicking: `scores.get(1)` is `Some(2.5)` and `scores.get(5)` is `None`.

## 2. Type aliases: `Vector2`
{: #arr-alias}

```rust
pub type Vector2 = [f64; 2];
```

`Vector2` is a **type alias** ([Note 01](/digital-garden/rust-sandbox/variables-mutability/#var-alias)): a second name for `[f64; 2]`. It makes signatures readable, as in `fn mul_vector(self, v: Vector2) -> Vector2`.

Because an alias isn't a new type, a plain `[f64; 2]` can be passed wherever a `Vector2` is expected.

## 3. Array or `Vec`?
{: #arr-vs-vec}

| | `[f64; 2]` (array) | `Vec<f64>` |
|---|---|---|
| Length | fixed, known while compiling | can change while the program runs |
| Memory | inline on the stack, 16 bytes | heap buffer **plus** 24 bytes on the stack |
| Allocation | none | yes |
| Dimension check | done by the compiler (types) | must happen at runtime (`DimensionMismatch`) |
| `Copy` | yes (if `T` is `Copy`) | no |

For 2-D rotations the length is always 2, so the array is both **faster** (no allocation) and **safer** (a wrong length doesn't even compile). Compare that with `Vector::checked_add`, which has to check lengths at runtime ([Note 11](/digital-garden/rust-sandbox/error-handling-result/#err-result)).

## 4. `Matrix2`: a nested array inside a struct
{: #arr-matrix2}

```rust
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Matrix2 {
    rows: [[f64; 2]; 2],
}
```

`[[f64; 2]; 2]` is an array of 2 arrays, each holding 2 `f64` values: 4 × 8 = **32 bytes**, all inline. There's no heap data, so the type can derive `Copy` ([Note 09](/digital-garden/rust-sandbox/derive/#der-copy)). Like `Vector`, the field is private.

## 5. Compile-time constants: `const`, associated constants and `const fn`
{: #arr-const}

```rust
impl Matrix2 {
    pub const IDENTITY: Matrix2 = Matrix2::new(1.0, 0.0, 0.0, 1.0);

    pub const fn new(m11: f64, m12: f64, m21: f64, m22: f64) -> Self {
        Self {
            rows: [[m11, m12], [m21, m22]],
        }
    }
}
```

- **`const`** declares a constant, computed **while compiling** ([Note 01](/digital-garden/rust-sandbox/variables-mutability/#var-const) covers `const` vs `let`).
- Because it's inside `impl Matrix2`, you use it as `Matrix2::IDENTITY`. That's an **associated constant**, like a class attribute in Python (`Matrix2.IDENTITY`).

### `const fn`: functions the compiler can run
{: #arr-const-fn}

A **`const fn`** is a function the compiler is able to run at compile time. That's why `IDENTITY` can call `Matrix2::new(...)`. A const fn can still be called normally while the program runs.

A constant may only call `const fn` functions. `rotation` is a normal `fn` (it calls `sin_cos`), so this fails:

```rust
const R: Matrix2 = Matrix2::rotation(0.0);
```

```text
error[E0015]: cannot call non-const associated function `Matrix2::rotation` in constants
```

In the demo, `new`, `from_rows`, `rows`, `get` and `transpose` are `const fn`, while `determinant` and `mul_vector` (which do float arithmetic) aren't.

**A version detail I checked:** floating-point arithmetic inside `const fn` was only allowed starting with **Rust 1.82**. On 1.99, this compiles fine:

```rust
const fn det(a: f64, b: f64, c: f64, d: f64) -> f64 { a * d - b * c }
const D: f64 = det(1.0, 2.0, 3.0, 4.0);   // -2, computed while compiling
```

So keeping `determinant` non-const is a choice (or a requirement for projects that support older compilers), not a rule of the language.

## 6. `self` by value for small `Copy` types
{: #arr-self-copy}

```rust
pub const fn rows(self) -> [[f64; 2]; 2] {
    self.rows
}
```

The receiver is `self`, not `&self`. For `Vector`, `self` meant "consume the value" ([Note 04](/digital-garden/rust-sandbox/ownership-borrowing/#own-self)). `Matrix2` is `Copy`, though, so the method receives a **copy**, and the caller keeps the original.

Why not `&self`? A reference is an 8-byte pointer to the 32 bytes, and every read has to follow it. For small `Copy` types, passing the bytes directly is often just as cheap or cheaper, and the values can stay in CPU registers. That's why all the `Matrix2` methods take `self` by value.

## 7. Destructuring: taking data apart in one line
{: #arr-destructure}

```rust
pub const fn transpose(self) -> Self {
    let [[a, b], [c, d]] = self.rows;
    Self::new(a, c, b, d)
}
```

`let [[a, b], [c, d]] = self.rows;` is a **destructuring pattern**. It unpacks the nested array and names all four values in one line. The Python equivalent is `(a, b), (c, d) = rows`.

The pattern must match the shape **exactly**, and the compiler checks it. A 2×2 pattern on a 3×3 array is rejected:

```text
error[E0527]: pattern requires 2 elements but array has 3
```

`Self::new(...)` calls the type's own associated function `new`.

The same technique gives a very readable matrix–vector product:

```rust
/// [ a  b ] [ x ]   [ a·x + b·y ]
/// [ c  d ] [ y ] = [ c·x + d·y ]
pub fn mul_vector(self, v: Vector2) -> Vector2 {
    let [[a, b], [c, d]] = self.rows;
    let [x, y] = v;
    [a * x + b * y, c * x + d * y]
}
```

The last line builds a new array and returns it. Everything stays on the stack: **nothing is allocated**. `determinant` (`a * d - b * c`) and `mul_matrix` follow the same pattern.

## 8. Tuples: fixed groups of values
{: #arr-tuples}

```rust
pub fn rotation(theta: f64) -> Matrix2 {
    let (sin, cos) = sin_cos(theta);
    Matrix2::new(cos, -sin, sin, cos)
}
```

- `sin_cos` (from `src/math/trigonometry.rs`) returns a **tuple**, `(f64, f64)`: a fixed group of values, like a Python tuple.
- `let (sin, cos) = ...` destructures the tuple into two variables.
- `-sin` is the negated value.

This builds the rotation matrix R(θ) = [[cos θ, −sin θ], [sin θ, cos θ]].

**Arrays vs tuples:** an array holds values of **one** type, accessed by index (`a[0]`). A tuple can mix types, accessed by position (`t.0`, `t.1`):

```rust
let p = (1.0, "label", 3_u8);
let (x, name, n) = p;     // destructure
println!("{}", p.1);      // "label"
```

## 9. Free functions: `rotate_vector`
{: #arr-free}

```rust
pub fn rotate_vector(v: Vector2, theta: f64) -> Vector2 {
    Matrix2::rotation(theta).mul_vector(v)
}
```

This function sits **outside every `impl` block**, so it's a **free function**, like a normal module-level function in Python. It chains two calls: build the rotation matrix, then multiply it with `v`.

Try it with a quarter turn, `rotate_vector([1.0, 0.0], FRAC_PI_2)`. Mathematically the answer is `[0, 1]`, but the program prints:

```text
[6.123233995736766e-17, 1.0]
```

`cos(π/2)` isn't exactly 0 in floating point. That tiny error is why the tests compare floats with a tolerance ([Note 14](/digital-garden/rust-sandbox/doc-comments-tests/#tst-helpers)).

## 10. Number literals: Rust doesn't mix integers and floats
{: #arr-literals}

The `Matrix2` code writes `1.0` and `0.0`, never `1` and `0`. `1` is an integer and `1.0` is a float, and Rust **never converts between them automatically**:

```rust
let x = 1.0 + 1;      // error[E0277]: cannot add an integer to a float
let y: f64 = 1;       // error[E0308]: mismatched types
```

So `Matrix2::new(1, 0, 0, 1)` wouldn't compile. [Note 02](/digital-garden/rust-sandbox/integers-floats-casting/#num-literals) covers number literals, suffixes like `2.5_f64`, and casting with `as`.

## Summary: Rust arrays, tuples and constants
{: #arr-summary}

- `[T; N]` is a fixed-size array. Its length is part of the type, so length mistakes are compile errors.
- `type Vector2 = [f64; 2];` is an alias, a second name for the same type, not a new type.
- Use arrays for small fixed sizes (no heap, `Copy`), and `Vec` when the size is only known at runtime.
- `const` values and associated constants (`Matrix2::IDENTITY`) are computed while compiling. Constants can only call `const fn`. Float maths in `const fn` needs Rust 1.82+.
- Small `Copy` types often take `self` by value instead of `&self`.
- Destructuring (`let [[a, b], [c, d]] = rows;`, `let (sin, cos) = ...`) names the parts of arrays and tuples in one line, and the compiler checks the shape.
- Free functions live outside any `impl`. Integers and floats never mix implicitly.
