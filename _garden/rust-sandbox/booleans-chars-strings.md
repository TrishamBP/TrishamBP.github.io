---
layout: garden
guide: rust-sandbox
order: 3
note_no: "03"
nav_title: "Booleans, chars and strings"
title: "Rust Booleans, char and Strings: Logic Operators, Raw Strings and dbg!"
seo_title: "Rust bool, char and String Types Explained: &&, ||, Raw Strings, dbg!"
description: "Rust booleans, char and strings explained: ! && || and short-circuiting, == vs !=, 4-byte chars, &str vs String, raw strings, methods and the dbg! macro."
keywords: "Rust booleans, Rust bool, Rust char type, Rust strings, Rust raw strings, Rust &str vs String, Rust logical operators, Rust short circuit, Rust dbg macro, Rust methods"
lede: "The rest of Rust's simple data types: true and false, the logic that combines them, a character type that holds any emoji, and strings, which are where Rust first gets interesting. Plus dbg!, the fastest way to see what a value really is."
sections:
  - id: txt-bool
    title: "1\\. Booleans: `bool`, `true` and `false`"
  - id: txt-not
    title: "2\\. Boolean inversion with `!`"
  - id: txt-compare
    title: "3\\. Equality and comparison operators: `==`, `!=`, `<`, `>`"
  - id: txt-logic
    title: "4\\. Logic with `&&` and `||`, and short-circuiting"
  - id: txt-char
    title: "5\\. The `char` type: one Unicode character"
  - id: txt-strings
    title: "6\\. Strings: `&str` and `String`"
  - id: txt-raw
    title: "7\\. Escape sequences and raw strings"
  - id: txt-methods
    title: "8\\. Calling methods on values"
  - id: txt-dbg
    title: "9\\. The `dbg!` macro: print a value and keep it"
  - id: txt-compound
    title: "10\\. Arrays, tuples, ranges and generics: where they're covered"
  - id: txt-summary
    title: "Summary: Rust booleans, chars and strings"
---

[Note 02](/digital-garden/rust-sandbox/integers-floats-casting/) covered the number types. This note finishes Rust's basic data types: **booleans** and the operators that combine them, the **`char`** type, and a first look at **strings**. Along the way it explains how to call methods on values, and how `dbg!` prints any value while you debug.

The code is in `examples/text.rs` in the [demo project](/digital-garden/rust-sandbox/#demo-project). Run it with `cargo run --example text`.

## 1. Booleans: `bool`, `true` and `false`
{: #txt-bool}

A **boolean** is a value that is either `true` or `false`. Its type is `bool`, and it takes 1 byte.

```rust
let is_raining = true;
let has_umbrella: bool = false;
```

Booleans are what `if` conditions need. Unlike Python, Rust has no "truthy" values. A number, an empty string or an empty list is **not** a boolean:

```rust
let n = 1;
if n {
    println!("yes");
}
```

```text
error[E0308]: mismatched types
  |     if n {
  |        ^ expected `bool`, found integer
```

Write the comparison you mean: `if n != 0`, `if !text.is_empty()`. [Note 11](/digital-garden/rust-sandbox/error-handling-result/#err-if) shows that `if` also produces a value.

Methods that answer a yes/no question return a `bool` and start with `is_` or `has_`: `is_empty()`, `is_nan()`, `is_alphabetic()`.

## 2. Boolean inversion with `!`
{: #txt-not}

`!` flips a boolean: `!true` is `false`. Python spells this `not`.

```rust
println!("{}", !is_raining);   // false

let mut light_on = false;
light_on = !light_on;          // toggle: now true
```

On an integer, `!` flips every **bit** instead (Python's `~`): `!5_u8` is `250`. The `!` in `println!` is unrelated. There it marks a macro.

## 3. Equality and comparison operators: `==`, `!=`, `<`, `>`
{: #txt-compare}

Comparisons produce a `bool`:

```rust
5 == 5      // true   equal
5 != 5      // false  not equal
3 < 5       // true
3 <= 3      // true
5 > 7       // false
5 >= 5      // true
```

They work on more than numbers. Strings and chars compare in alphabetical (strictly, Unicode) order:

```rust
"apple" == "apple"    // true: compares the text, like Python
"apple" < "banana"    // true
'a' < 'b'             // true
```

Two rules make Rust comparisons stricter than Python's:

- **Both sides must be the same type.** `5 == 5.0` and an `i32 == i64` don't compile. Cast first ([Note 02](/digital-garden/rust-sandbox/integers-floats-casting/#num-as)).
- **`==` only works for types that implement `PartialEq`.** Numbers, `bool`, `char` and strings do. Your own structs need `#[derive(PartialEq)]` ([Note 09](/digital-garden/rust-sandbox/derive/#der-partialeq)).

Floats need care: `0.1 + 0.2 == 0.3` is `false` ([Note 02](/digital-garden/rust-sandbox/integers-floats-casting/#num-floats)). Compare against a small tolerance instead: `(a - b).abs() < 1e-9`.

## 4. Logic with `&&` and `||`, and short-circuiting
{: #txt-logic}

| Rust | Python | True when |
|---|---|---|
| `a && b` | `a and b` | both are true |
| <code>a &#124;&#124; b</code> | `a or b` | at least one is true |
| `!a` | `not a` | `a` is false |

```rust
let age = 25;
let has_ticket = true;
age >= 18 && has_ticket       // true
age < 12 || age > 65          // false
```

Both operators **short-circuit**: they stop as soon as the answer is known. With `&&`, a `false` on the left means the right side never runs. With `||`, a `true` on the left skips it.

You can see it with a function that prints when it's called:

```rust
fn is_even(n: i32) -> bool {
    println!("  checking {n}");
    n % 2 == 0
}

let r = is_even(3) && is_even(4);   // prints only "checking 3", r = false
let r = is_even(4) || is_even(5);   // prints only "checking 4", r = true
```

That's what makes guards like `i < items.len() && items[i] > 0` safe: the index is only read when it's in range.

**Precedence:** `&&` binds tighter than `||`, so `true || false && false` means `true || (false && false)`, which is `true`. When you mix them, add parentheses so the reader doesn't have to remember.

Unlike Python's `and`/`or`, which return one of their operands, `&&` and `||` only accept `bool` values and always return a `bool`.

## 5. The `char` type: one Unicode character
{: #txt-char}

A `char` is a single character, written in **single quotes**:

```rust
let letter = 'a';
let emoji = '🦀';
let accented = 'é';
```

A Rust `char` is **4 bytes**, so it can hold any Unicode character, not just ASCII. Python has no separate character type; a "character" there is a string of length 1.

Single and double quotes mean different things in Rust, and the compiler tells you which one you meant:

```rust
let c: char = "a";   // error[E0308]: expected `char`, found `&str`
let c = 'ab';        // error: character literal may only contain one codepoint
```

Useful `char` methods:

```rust
letter.is_alphabetic()       // true
'7'.is_numeric()             // true
' '.is_whitespace()          // true
letter.to_ascii_uppercase()  // 'A'
'7'.to_digit(10)             // Some(7)
'A' as u32                   // 65, its Unicode number
```

## 6. Strings: `&str` and `String`
{: #txt-strings}

Rust has two main string types. This is the first place where Rust's memory model shows through:

| | `&str` (string slice) | `String` |
|---|---|---|
| What it is | a borrowed view of some text | an owned, growable text buffer |
| Where the text lives | anywhere (often baked into the program) | on the heap |
| Can grow | no | yes |
| Made by | a literal `"hello"` | `String::from("hello")`, `"hello".to_string()` |

```rust
let greeting: &str = "Hello, Rust";        // a string literal is a &str
let owned: String = String::from("Hello");
let also_owned = "world".to_string();

let mut message = String::new();
message.push_str("Hi");    // add text
message.push('!');         // add one char
```

Rule of thumb: use `String` when you need to **own or change** the text, and `&str` when you only need to **read** it. Function parameters are usually `&str`, because a `&String` turns into a `&str` automatically ([Note 07](/digital-garden/rust-sandbox/slices-lifetimes/#slc-components)). Why there are two types at all is an ownership question, covered from [Note 04](/digital-garden/rust-sandbox/ownership-borrowing/#own-stack-heap) on.

`+` can't join two `&str` values:

```rust
let s = "a" + "b";
```

```text
error[E0369]: cannot add `&str` to `&str`
  = note: string concatenation requires an owned `String` on the left
```

The left side must be a `String`: `String::from("a") + "b"` works. Most code uses `format!("{a}{b}")` instead, which works for any mix of values ([Note 05](/digital-garden/rust-sandbox/structs-impl-display/#dsp-write)).

Strings **can't be indexed** with a number. `s[0]` fails with `error[E0277]: the type 'str' cannot be indexed by '{integer}'`. Text is stored as UTF-8, where one character can take 1 to 4 bytes, so "the 0th character" isn't a simple lookup. Use `s.chars().nth(0)` to get a `char`.

## 7. Escape sequences and raw strings
{: #txt-raw}

Inside a normal string, a backslash starts an **escape sequence**:

| Escape | Means |
|---|---|
| `\n` | new line |
| `\t` | tab |
| `\\` | a backslash |
| `\"` | a double quote |
| `\u{1F980}` | a Unicode character by number (🦀) |

A string can also span several lines as written. A `\` at the end of a line joins it to the next and skips the next line's leading spaces: `"one \` + newline + `two"` gives `one two`.

A **raw string** turns escapes off. Write `r` before the quotes, and every backslash is just a backslash:

```rust
let path = r"C:\Users\name\notes.txt";   // C:\Users\name\notes.txt
```

To put a `"` inside a raw string, add `#` marks around it. The string ends only at a `"` followed by the same number of `#`:

```rust
let json = r#"{"name": "Ferris", "lang": "Rust"}"#;
```

Raw strings are ideal for Windows paths, regular expressions and embedded JSON. Python's `r"..."` is the same idea, but Python has no `#` form.

## 8. Calling methods on values
{: #txt-methods}

A **method** is a function that belongs to a type. You call it with a dot after the value, and the value becomes the method's input:

```rust
let text = "  Hello, Rust  ";
text.trim()                  // "Hello, Rust"
text.trim().to_uppercase()   // "HELLO, RUST" (methods chain left to right)
"hello".contains("ell")      // true
"hello".starts_with("he")    // true
"a,b,c".replace(",", " ")    // "a b c"
"ab".repeat(3)               // "ababab"
```

Every type has its own methods, even plain numbers and literals: `(-4_i32).abs()`, `9.0_f64.sqrt()`, `'a'.is_alphabetic()`. The dot form is shorthand for calling the function on the type: `(-4_i32).abs()` and `i32::abs(-4)` are the same call.

One method that surprises Python users: **`len()` counts bytes, not characters.**

```rust
"hello".len()            // 5
"héllo".len()            // 6: é takes 2 bytes in UTF-8
"héllo".chars().count()  // 5 characters
```

The standard library docs list every method for each type (search "str" or "f64" at [doc.rust-lang.org/std](https://doc.rust-lang.org/std/)). Writing your own methods with `impl` comes in [Note 06](/digital-garden/rust-sandbox/methods-constructors/).

## 9. The `dbg!` macro: print a value and keep it
{: #txt-dbg}

`dbg!` is a debugging print. It shows the **file and line**, the **code you wrote** and its **value**:

```rust
let width = 4;
let area = dbg!(width * 3) + 1;
dbg!(area);
dbg!(&greeting, letter);
```

```text
[examples\text.rs:85:16] width * 3 = 12
[examples\text.rs:86:5] area = 13
[examples\text.rs:87:5] &greeting = "Hello, Rust"
[examples\text.rs:87:5] letter = 'a'
```

What makes it different from `println!`:

- **It returns the value**, so you can wrap any expression without changing the code around it: `dbg!(width * 3) + 1` still adds 1.
- **It prints to stderr**, not stdout, so it doesn't mix into your program's real output. `cargo run 2>/dev/null` hides it.
- **It uses `Debug` formatting** (`{:#?}`), so the type must implement `Debug` ([Note 09](/digital-garden/rust-sandbox/derive/#der-debug)).
- **It takes ownership** of what you pass. `dbg!(s)` with a `String` moves it, and `s` can't be used afterwards (`error[E0382]: borrow of moved value`). Pass a reference instead: `dbg!(&s)`.

`dbg!` still runs in release builds, so remove it before you commit. It's for finding a bug, not for logging.

## 10. Arrays, tuples, ranges and generics: where they're covered
{: #txt-compound}

The other basic data types are covered where the demo project first needs them:

| Topic | Covered in |
|---|---|
| Arrays `[T; N]`, reading and writing elements | [Note 10](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-arrays) |
| Tuples `(A, B)` and `t.0` | [Note 10](/digital-garden/rust-sandbox/arrays-tuples-constants/#arr-tuples) |
| Ranges `0..5`, `0..=5` and range iteration | [Note 12](/digital-garden/rust-sandbox/iterators-closures/#itr-for) |
| The `Display` trait (`{}`) | [Note 05](/digital-garden/rust-sandbox/structs-impl-display/#dsp-display) |
| The `Debug` trait (`{:?}`) | [Note 09](/digital-garden/rust-sandbox/derive/#der-debug) |
| Generics `Vec<T>` | [Note 06](/digital-garden/rust-sandbox/methods-constructors/#mth-struct) |
| Generic functions and trait bounds | [Note 08](/digital-garden/rust-sandbox/traits/#trt-bounds) |

## Summary: Rust booleans, chars and strings
{: #txt-summary}

- `bool` is `true` or `false`. Conditions must be real booleans; Rust has no truthy values.
- `!` negates (Python's `not`). `==`, `!=`, `<` and `>` need both sides to be the same type.
- `&&` and `||` short-circuit, so the right side runs only when needed. `&&` binds tighter than `||`.
- `char` uses single quotes, takes 4 bytes and holds any Unicode character.
- `&str` is a borrowed view of text; `String` owns growable text. `+` needs a `String` on the left, and strings can't be indexed by number.
- Raw strings `r"..."` and `r#"..."#` turn off escapes. Ideal for paths, regex and JSON.
- Methods are called with a dot and chain left to right. `len()` counts bytes, `chars().count()` counts characters.
- `dbg!` prints file, line, expression and value to stderr, and returns the value. Pass `&x` to avoid moving it.
