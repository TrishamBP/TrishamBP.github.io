---
layout: garden
guide: rust-sandbox
order: 2
note_no: "02"
nav_title: "Numbers: integers, floats, casting"
title: "Rust Data Types: Integers, Floats, Casting with as and Math Operators"
seo_title: "Rust Integer and Float Types Explained: usize, as Casting & Overflow"
description: "Rust data types for numbers explained: i32 vs u8, usize, f64, format specifiers, casting with as, integer overflow, math and += operators, with real errors."
keywords: "Rust data types, Rust integer types, Rust usize vs isize, Rust f64 vs f32, Rust as casting, Rust integer overflow, Rust format specifier, Rust float formatting, Rust math operators, Rust number literals"
lede: "Python has one int and one float. Rust has twelve integer types and two float types, and it never converts between them on its own. This note explains why, and how to pick, print, convert and calculate with Rust's number types without surprises."
sections:
  - id: num-types
    title: "1\\. Rust data types at a glance"
  - id: num-integers
    title: "2\\. Integer types: signed and unsigned"
  - id: num-literals
    title: "3\\. Number literals: `_` separators, suffixes, hex and binary"
  - id: num-usize
    title: "4\\. `usize` and `isize`: the pointer-sized integers"
  - id: num-floats
    title: "5\\. Floating-point types: `f64` and `f32`"
  - id: num-format
    title: "6\\. Formatting floats with format specifiers"
  - id: num-as
    title: "7\\. Casting types with the `as` keyword"
  - id: num-math
    title: "8\\. Math operations: `+ - * / %` and number methods"
  - id: num-overflow
    title: "9\\. Integer overflow: panic, wrap, check or saturate"
  - id: num-augmented
    title: "10\\. Augmented assignment: `+=`, `-=`, `*=`"
  - id: num-summary
    title: "Summary: Rust integers, floats and casting"
---

Every value in Rust has a **data type**, and the compiler must know all of them before the program runs. For numbers, that means choosing a size and a sign: an `i32` is not a `u8`, and neither is an `f64`.

This note covers the numeric Rust data types: integers, `usize`, floats, how to format them, how to cast between them with `as`, and what happens when the maths overflows. It builds on `let` and `mut` from [Note 01](/digital-garden/rust-sandbox/variables-mutability/).

The code is in `examples/numbers.rs` in the [demo project](/digital-garden/rust-sandbox/#demo-project). Run it with `cargo run --example numbers`.

## 1. Rust data types at a glance
{: #num-types}

Rust's built-in types fall into two groups:

- **Scalar types** hold a single value: integers, floats, booleans and characters.
- **Compound types** group several values: tuples and arrays.

| Group | Type | Example | Covered in |
|---|---|---|---|
| Scalar | integers `i32`, `u8`, `usize`... | `42` | this note |
| Scalar | floats `f64`, `f32` | `3.14` | this note |
| Scalar | `bool` | `true` | [Note 03](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-bool) |
| Scalar | `char` | `'a'` | [Note 03](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-char) |
| Text | `&str`, `String` | `"hi"` | [Note 03](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-strings) |
| Compound | array `[T; N]` | `[1, 2, 3]` | [Note 10](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-arrays) |
| Compound | tuple `(A, B)` | `(1.0, "x")` | [Note 10](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-tuples) |

Rust is **statically typed**: every variable's type is fixed while compiling. Usually the compiler infers it ([Note 01](/digital-garden/rust-sandbox/variables-mutability/#var-let)), but when it can't, it asks you to write it.

**Why so many number types?** A type tells the compiler exactly how many bytes a value takes and what range it can hold. That's how Rust stores numbers without any wrapper, checks ranges at compile time, and runs as fast as C.

## 2. Integer types: signed and unsigned
{: #num-integers}

An integer is a whole number. Its type name tells you two things: **`i` or `u`** (signed or unsigned), and the **number of bits**.

| Bits | Signed | Range | Unsigned | Range |
|---|---|---|---|---|
| 8 | `i8` | −128 to 127 | `u8` | 0 to 255 |
| 16 | `i16` | −32,768 to 32,767 | `u16` | 0 to 65,535 |
| 32 | `i32` | about ±2.1 billion | `u32` | 0 to about 4.3 billion |
| 64 | `i64` | about ±9.2 × 10¹⁸ | `u64` | 0 to about 1.8 × 10¹⁹ |
| 128 | `i128` | about ±1.7 × 10³⁸ | `u128` | 0 to about 3.4 × 10³⁸ |
| pointer | `isize` | depends on the machine | `usize` | depends on the machine |

- **Signed** (`i`) types can be negative. **Unsigned** (`u`) types can't, so they reach twice as high.
- With no other information, an integer literal is an **`i32`**.
- Each type knows its own limits: `i8::MIN` is `-128`, `u8::MAX` is `255`.

```rust
let a = 42;              // i32 by default
let small: u8 = 255;
let negative: i8 = -128;
println!("u8: {} to {}", u8::MIN, u8::MAX);   // u8: 0 to 255
```

A literal that doesn't fit is a compile error, not a silent truncation:

```rust
let x: u8 = 256;
```

```text
error: literal out of range for `u8`
  = note: the literal `256` does not fit into the type `u8` whose range is `0..=255`
```

**Coming from Python:** a Python `int` grows as large as it needs to, so it never overflows. A Rust integer has a fixed size. You pick the size, and the CPU can work on the number directly.

**Which one to use?** Use `i32` by default, `usize` for counts and indexes, `u8` for raw bytes, and `i64`/`u64` when values can pass about 2 billion.

## 3. Number literals: `_` separators, suffixes, hex and binary
{: #num-literals}

```rust
let million = 1_000_000;     // 1000000
let hex = 0xff;              // 255
let octal = 0o17;            // 15
let binary = 0b1010_1010;    // 170
let byte = b'A';             // 65, a u8
let typed = 3_u8;            // a u8, not an i32
```

- **Underscores are visual separators.** Rust ignores them, so `1_000_000` is just easier to read than `1000000`. They can go anywhere after the first digit, as in `0b1010_1010`.
- **Suffixes pick an exact type:** `3_u8`, `10_usize`, `2.5_f64`. The `_` before the suffix is optional, but it's easier to read.
- **Prefixes pick a base:** `0x` hex, `0o` octal, `0b` binary.
- **`b'A'`** is a byte literal: the ASCII code of the character, as a `u8`.
- **Scientific notation** makes a float: `1e10` is 1 × 10¹⁰, `1e-3` is 0.001.

`1` and `1.0` are different values to Rust. `1` is an integer and `1.0` is a float, which is why maths code always writes `1.0` ([section 8](#num-math)).

## 4. `usize` and `isize`: the pointer-sized integers
{: #num-usize}

`usize` and `isize` have the size of a memory address on the machine you compile for: **64 bits** on a 64-bit computer, 32 bits on a 32-bit one.

```rust
let items = [10, 20, 30];
let count: usize = items.len();
let offset: isize = -1;
println!("usize bits = {}", usize::BITS);   // usize bits = 64
```

**`usize` is the type for sizes and indexes.** `.len()` returns a `usize`, and indexing needs a `usize`. Any other integer type is rejected, even a small `i32`:

```rust
let i: i32 = 1;
println!("{}", items[i]);
```

```text
error[E0277]: the type `[{integer}]` cannot be indexed by `i32`
  |     println!("{}", items[i]);
  |                          ^ slice indices are of type `usize` or ranges of `usize`
```

Why so strict? An index is a distance into memory. It can never be negative, and it has to cover all of memory, which is exactly what `usize` is. Convert with `items[i as usize]` ([section 7](#num-as)), or better, make the variable a `usize` to begin with.

Because `usize` is unsigned, `let i: usize = -1;` fails with `error[E0600]: cannot apply unary operator '-' to type 'usize'`.

`isize` is the signed version. It's mainly for differences between positions, which can be negative.

## 5. Floating-point types: `f64` and `f32`
{: #num-floats}

A float is a number with a fractional part. Rust has two:

| Type | Size | Precision | Use |
|---|---|---|---|
| `f64` | 8 bytes | about 15–17 significant digits | the default, and almost always the right choice |
| `f32` | 4 bytes | about 6–9 significant digits | graphics, ML weights, large arrays where memory matters |

```rust
let pi = 3.14159;        // f64 by default
let f: f32 = 0.1;
```

Python's `float` is an `f64`. Both follow the IEEE 754 standard, so the classic surprise is the same:

```rust
println!("{}", 0.1 + 0.2);   // 0.30000000000000004
```

Floats are stored in binary, and 0.1 has no exact binary form, like 1/3 has no exact decimal form. That's why the demo's tests compare floats with a tolerance ([Note 14](/digital-garden/rust-sandbox/doc-comments-tests/#tst-helpers)).

Floats also have three special values. Dividing a float by zero doesn't panic:

```rust
println!("{} {} {}", 1.0 / 0.0, -1.0 / 0.0, 0.0_f64 / 0.0);   // inf -inf NaN
```

**NaN** ("not a number") isn't equal to anything, not even itself. `f64::NAN == f64::NAN` is `false`, and the compiler warns `incorrect NaN comparison`. Use `x.is_nan()` instead. This is why floats get `PartialEq` but not `Eq` ([Note 09](/digital-garden/rust-sandbox/derive/#der-eq)).

One more trap: a bare `2.0` has no concrete type until something decides it, so you can't call a method on it yet:

```rust
let y = 2.0.sqrt();
```

```text
error[E0689]: can't call method `sqrt` on ambiguous numeric type `{float}`
help: you must specify a concrete type for this numeric value, like `f32`
  |     let y = 2.0_f32.sqrt();
```

Write `2.0_f64.sqrt()`, or give the variable a type: `let x: f64 = 2.0;`.

## 6. Formatting floats with format specifiers
{: #num-format}

Inside `{}`, everything after a colon is a **format specifier**. It controls how the value is printed. [Note 01](/digital-garden/rust-sandbox/variables-mutability/#var-print) introduced `{}` and `{:?}`. Here's the rest:

```rust
let x = 2.0 / 3.0;
println!("{}", x);          // 0.6666666666666666
println!("{:.2}", x);       // 0.67       (2 decimal places)
println!("[{:8.3}]", x);    // [   0.667] (width 8, right-aligned)
println!("[{:<8.3}]", x);   // [0.667   ] (left-aligned)
println!("[{:^8.3}]", x);   // [ 0.667  ] (centred)
println!("[{:08.3}]", x);   // [0000.667] (padded with zeros)
println!("{:+.1}", x);      // +0.7       (always show the sign)
println!("{:e}", 1234.5);   // 1.2345e3   (scientific)
```

The general shape is `{name:fill align sign width .precision type}`, and every part is optional:

| Part | Example | Meaning |
|---|---|---|
| name | `{x:.3}` | which variable (Note 01's inline names work here too) |
| fill + align | `{:*^8}` | `<` left, `>` right, `^` centre, padded with `*` |
| sign | `{:+}` | always print `+` or `-` |
| width | `{:8}` | at least 8 characters wide |
| zero pad | `{:08.3}` | pad with zeros instead of spaces |
| precision | `{:.2}` | digits after the decimal point |
| type | `{:e}` `{:x}` `{:b}` `{:o}` | scientific, hex, binary, octal |

The precision can come from a variable, too:

```rust
let places = 4;
println!("{x:.places$}");   // 0.6667
println!("{:.*}", 1, x);    // 0.7  (precision passed as an argument)
```

For integers, the type letters pick the base, and `#` adds the prefix: `println!("{:x} {:b} {:#x}", 255, 5, 255)` prints `ff 101 0xff`.

**A rounding detail I checked:** when a value sits **exactly** halfway, formatting rounds to the even digit. `{:.0}` prints `2.5` as `2` and `3.5` as `4`. The `.round()` method is different: it rounds halves away from zero, so `2.5_f64.round()` is `3`. Python's `round(2.5)` gives `2`, like the formatter.

## 7. Casting types with the `as` keyword
{: #num-as}

Rust **never** converts between number types on its own. Converting is your job, and the simplest tool is `as`:

```rust
let n: i32 = 7;
let half = n as f64 / 2.0;   // 3.5
```

Without `as`, `n / 2.0` doesn't compile ([section 8](#num-math)).

`as` always succeeds. When the value doesn't fit the target type, it **changes the value quietly**, so you need to know the rules:

| Cast | Result | Rule |
|---|---|---|
| `3.99_f64 as i32` | `3` | float → integer **cuts off** the fraction (towards zero) |
| `-3.99_f64 as i32` | `-3` | towards zero, not down |
| `1e10_f64 as i32` | `2147483647` | out of range **saturates** to the type's max or min |
| `f64::NAN as i32` | `0` | NaN becomes 0 |
| `300_i32 as u8` | `44` | integer → smaller integer **keeps the low bits** (300 − 256) |
| `-1_i32 as u8` | `255` | the same bits, read as unsigned |
| `5_000_000_000_i64 as i32` | `705032704` | silently wrong |
| `'A' as u32` | `65` | a char's Unicode number |
| `97_u8 as char` | `'a'` | only `u8` can be cast to `char` (`error[E0604]` otherwise) |
| `true as i32` | `1` | `false` is `0` |

Widening casts like `i32 → i64` or `u8 → u32` are always safe. Narrowing casts and float → integer casts can lose data with no warning.

**When the value might not fit, use `try_from` instead.** It returns a `Result` that you have to handle ([Note 11](/digital-garden/rust-sandbox/error-handling-result/#err-result)):

```rust
let ok: u8 = u8::try_from(200_i32).unwrap();   // 200
println!("{:?}", u8::try_from(300_i32));       // Err(TryFromIntError(PosOverflow))
let widened: i64 = i64::from(n);               // From: only exists for lossless conversions
```

Rule of thumb: use `From`/`into` for conversions that can't fail, `try_from` for ones that can, and `as` when you know the value fits or truncation is exactly what you want.

## 8. Math operations: `+ - * / %` and number methods
{: #num-math}

```rust
println!("{} {} {} {} {}", 7 + 2, 7 - 2, 7 * 2, 7 / 2, 7 % 2);   // 9 5 14 3 1
println!("{}", 7.0 / 2.0);                                        // 3.5
```

- **Integer division cuts off the fraction.** `7 / 2` is `3`. For a fractional answer, use floats: `7.0 / 2.0`.
- **`%` is the remainder.** It works on floats too: `7.5 % 2.0` is `1.5`.
- **Precedence** is the usual maths order: `1 + 2 * 3` is `7`. Use parentheses when in doubt.

### Different from Python: negative division
{: #num-negative-division}

Rust rounds integer division **towards zero**. Python's `//` rounds **down**. With negative numbers they disagree:

| Expression | Rust | Python |
|---|---|---|
| `-7 / 2` (Python `-7 // 2`) | `-3` | `-4` |
| `-7 % 2` | `-1` | `1` |

For Python-style results, use `(-7_i32).div_euclid(2)` and `(-7_i32).rem_euclid(2)` (which gives `1`). It matters for things like wrapping an index around a circular buffer.

### Both sides must be the same type
{: #num-same-type}

Rust has no automatic widening, not even from `i32` to `i64`, and never between integers and floats:

```rust
let c = 5 + 2.0;
```

```text
error[E0277]: cannot add a float to an integer
  |     let c = 5 + 2.0;
  |               ^ no implementation for `{integer} + {float}`
```

`a + b` with `a: i32` and `b: i64` fails the same way (`cannot add 'i64' to 'i32'`). Cast one side with `as` so both match. It feels noisy at first, but it means every conversion in a program is visible.

### Powers, roots and rounding are methods
{: #num-methods}

Rust has no `**` operator. Powers and other maths functions are **methods** on the number ([Note 03](/digital-garden/rust-sandbox/booleans-chars-strings/#txt-methods) explains calling methods):

```rust
2_i32.pow(10)          // 1024  (integer power)
2.0_f64.powi(3)        // 8.0   (float to an integer power)
2.0_f64.powf(0.5)      // 1.414 (float to a float power)
9.0_f64.sqrt()         // 3.0
(-5_i32).abs()         // 5
2.7_f64.floor()        // 2.0, and .ceil(), .round(), .trunc()
5_i32.max(9)           // 9, and .min()
```

**Precedence trap:** a method call binds tighter than a minus sign. `-2_i32.pow(2)` means `-(2.pow(2))`, which is `-4`, not `4`. Write `(-2_i32).pow(2)` when you mean the negative number.

### Division by zero
{: #num-div-zero}

Integer division by zero **panics** (stops the program): `attempt to divide by zero`. If the compiler can see it, as in `7 / 0`, it refuses to build: `error: this operation will panic at runtime`. Float division by zero gives `inf` or `NaN` instead ([section 5](#num-floats)).

## 9. Integer overflow: panic, wrap, check or saturate
{: #num-overflow}

What is `255_u8 + 1`? There is no correct `u8` answer. Rust's behaviour depends on how you build:

- If the compiler can see the overflow, it's a **compile error**: `error: this arithmetic operation will overflow`.
- In a **debug build** (`cargo run`), overflow at runtime **panics**: `attempt to add with overflow`.
- In a **release build** (`cargo run --release`), the check is removed for speed, and the value **wraps around**: `255 + 1` becomes `0`.

So never rely on overflow behaviour. When overflow is possible, say what you want with an explicit method:

```rust
250_u8.checked_add(10)      // None       (Option: no answer)
250_u8.checked_add(5)       // Some(255)
250_u8.wrapping_add(10)     // 4          (wrap around on purpose)
250_u8.saturating_add(10)   // 255        (stop at the limit)
250_u8.overflowing_add(10)  // (4, true)  (wrapped value + "it overflowed")
```

All four exist for `sub`, `mul` and the other operations too. The demo's `Vector::checked_add` borrows the `checked_` name for the same idea: return "no answer" instead of a wrong one ([Note 06](/digital-garden/rust-sandbox/methods-constructors/#mth-naming)).

## 10. Augmented assignment: `+=`, `-=`, `*=`
{: #num-augmented}

An **augmented assignment operator** updates a variable in place: `x += 5` means `x = x + 5`. The variable must be `mut` ([Note 01](/digital-garden/rust-sandbox/variables-mutability/#var-mut)).

```rust
let mut total = 10;
total += 5;    // 15
total -= 3;    // 12
total *= 2;    // 24
total /= 4;    // 6
total %= 4;    // 2
```

The bitwise operators have versions too: `<<=`, `>>=`, `&=`, `|=`, `^=`.

Rust has **no `++` or `--`**. The compiler even suggests the fix:

```text
error: Rust has no postfix increment operator
help: use `+= 1` instead
```

Leaving them out avoids the `i++` vs `++i` puzzles from C. Write `count += 1`.

## Summary: Rust integers, floats and casting
{: #num-summary}

- Rust data types are scalar (integers, floats, `bool`, `char`) or compound (tuples, arrays), and every type is known while compiling.
- Integers are `i` (signed) or `u` (unsigned) plus a bit size. The default is `i32`. `usize` is for lengths and indexes, and is the only type that can index an array.
- Literals can use `_` separators (`1_000_000`), suffixes (`3_u8`) and `0x`/`0o`/`0b` prefixes.
- `f64` is the default float. `0.1 + 0.2 != 0.3`, `NaN != NaN`, and float division by zero gives `inf`.
- Format specifiers like `{:.2}`, `{:8.3}`, `{:08.3}` and `{:e}` control width, alignment and precision.
- Rust never converts number types implicitly. `as` converts but can truncate, wrap or saturate silently; `try_from` fails safely.
- Integer `/` cuts towards zero, unlike Python's `//`. Powers and roots are methods (`pow`, `powi`, `sqrt`), and `-2.pow(2)` is `-4`.
- Overflow is a compile error, a debug panic or a release wrap. Use `checked_`, `wrapping_` or `saturating_` to choose.
- Use `+=` and friends on `mut` variables. There's no `++`.
