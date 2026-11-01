---
layout: garden
guide: rust-sandbox
order: 1
note_no: "01"
nav_title: "Ownership and borrowing"
title: "Rust Ownership and Borrowing, Explained from Scratch"
seo_title: "Rust Ownership and Borrowing Explained: Move, Copy, Clone & References"
description: "Rust ownership and borrowing explained from scratch: stack vs heap, the three ownership rules, move, Copy, Clone, &T vs &mut T, with compiler-checked examples."
keywords: "Rust ownership, Rust borrowing, Rust move semantics, Rust Copy vs Clone, Rust references, &mut, Rust borrow checker, stack vs heap, Rust lifetimes, Rust drop"
lede: "Ownership is the idea that makes Rust different from Python. This note builds it up from first principles: why it exists, how moves and borrows work, and what each compiler error is protecting you from."
sections:
  - id: own-problem
    title: "1\\. The problem that ownership solves"
  - id: own-stack-heap
    title: "2\\. Stack and heap: the two memory areas"
  - id: own-rules
    title: "3\\. The three ownership rules"
  - id: own-move
    title: "4\\. Move: ownership is transferred"
  - id: own-copy-clone
    title: "5\\. Copy and Clone: two ways to duplicate"
  - id: own-borrow
    title: "6\\. Borrowing: use a value without owning it"
  - id: own-self
    title: "7\\. Back to `self`, `&self` and `&mut self`"
  - id: own-table
    title: "8\\. All the ownership concepts together"
  - id: own-summary
    title: "Summary: Rust ownership and borrowing"
---

Ownership is the most important idea in Rust. It's the main thing that makes Rust different from Python, and almost every other note in this guide builds on it: `&self`, moves, `Copy`, `.clone()`.

If a Rust compiler error has ever said *"value used after move"* or *"cannot borrow as mutable"*, this note explains why. I build it up one step at a time.

## 1. The problem that ownership solves
{: #own-problem}

A program stores data in memory. When the program no longer needs the data, that memory must be freed. Languages handle this in three ways:

| Language | Who frees the memory? | Problem |
|---|---|---|
| C | You call `free()` by hand | Forget it and the program leaks memory. Free twice, or use memory after freeing it, and it crashes or silently corrupts data. |
| Python | A garbage collector frees it while the program runs | It costs extra time and memory, and you don't control *when* it happens |
| Rust | The **compiler** works out where to free it, using ownership rules | You must follow the rules, and the compiler enforces them |

Python mainly counts how many names point to each object (reference counting). When the count drops to 0, Python frees the object, and a cycle collector cleans up what counting misses. All of this happens **while the program runs**.

Rust decides where memory is freed **while the code compiles**. At runtime nothing is counted or collected. That's how Rust is fast and memory-safe at the same time.

## 2. Stack and heap: the two memory areas
{: #own-stack-heap}

You need these two terms first.

**The stack** is fast and simple. It holds values whose size is fixed and known in advance, such as `f64`, `usize` and `[[f64; 2]; 2]`. A function puts its values on the stack when it starts, and they're removed automatically when it ends. Think of a stack of plates: you only add or remove at the top.

**The heap** holds data whose size can change while the program runs, such as `Vec<f64>` and `String`. The program has to ask the system for heap memory (an **allocation**), and that memory has to be freed later. Think of a warehouse: you rent space, and someone must give it back.

The `Vector` type from the demo (`src/math/vector.rs`) uses both:

```text
STACK (24 bytes)              HEAP
┌──────────────┐             ┌─────┬─────┬─────┐
│ pointer   ───┼────────────►│ 1.0 │ 2.0 │ 3.0 │
│ length = 3   │             └─────┴─────┴─────┘
│ capacity = 3 │
└──────────────┘
```

I checked the stack part with `std::mem::size_of::<Vector>()`: 24 bytes (a pointer, a length and a capacity, 8 bytes each on a 64-bit machine). The numbers themselves live on the heap.

The stack part cleans itself up. The real question is **who frees the heap part**. Ownership answers it.

## 3. The three ownership rules
{: #own-rules}

1. Every value has exactly **one owner**. Usually the owner is a variable. It can also be a struct field or a collection holding the value.
2. There can be only **one owner at a time**.
3. When the owner goes **out of scope**, Rust frees the value. This is called **drop**.

A **scope** is the region between `{` and `}`.

```rust
{
    let v = Vector::new(vec![1.0, 2.0, 3.0]); // v owns the vector
    // use v here
} // v goes out of scope here, and Rust frees the heap memory
```

You never write `free()`. The compiler inserts the cleanup at the `}`.

### See drop happen
{: #own-drop-demo}

You can watch this by giving a type a `Drop` implementation that prints a message when it's freed:

```rust
struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("dropping {}", self.0);
    }
}

fn main() {
    let _a = Noisy("a");
    {
        let _b = Noisy("b");
        println!("inner scope ends");
    }
    let c = Noisy("c");
    let _d = c; // move: only _d owns it now
    println!("main ends");
}
```

```text
inner scope ends
dropping b
main ends
dropping c
dropping a
```

Three things to notice:

- `b` is dropped exactly at the end of its inner `{ }`.
- At the end of `main`, values are dropped in **reverse** order of creation.
- `c` was moved into `_d` (see the next section), so it's dropped **once**, not twice.

## 4. Move: ownership is transferred
{: #own-move}

When you assign a heap-owning value to another variable, ownership **moves**:

```rust
let a = Vector::new(vec![1.0, 2.0]);
let b = a;              // ownership moves from a to b
println!("{:?}", a);    // ERROR: a was moved
```

```text
error[E0382]: borrow of moved value: `a`
```

Why does Rust do this? Imagine that `a` and `b` both owned the heap data. At the `}`, both would free the same memory: a **double free**, a classic C crash. With a move, only `b` owns the data, so it's freed exactly once.

A move is cheap. Only the 24-byte stack part is copied. The heap numbers stay where they are.

Compare this with Python:

```python
a = [1.0, 2.0]
b = a          # a and b point to the SAME list
b.append(3.0)
print(a)       # [1.0, 2.0, 3.0]: a changed too!
```

Python lets two names share one object. Rust doesn't allow two owners. (When you genuinely need shared ownership, Rust has explicit tools for it, such as `Rc`, but that's a later topic.)

### Passing a value to a function also moves it
{: #own-move-fn}

```rust
fn consume(v: Vector) { /* v is dropped at the end of this function */ }

let a = Vector::new(vec![1.0]);
consume(a);           // a moves into the function
println!("{:?}", a);  // ERROR: a was moved
```

The compiler points at the exact cause: `this parameter takes ownership of the value`.

## 5. Copy and Clone: two ways to duplicate
{: #own-copy-clone}

**`Copy`**: small, stack-only values are duplicated automatically. They never move.

```rust
let x: f64 = 1.5;
let y = x;           // a copy, not a move
println!("{}", x);   // OK
```

`f64`, `usize`, `bool`, `Matrix2` and `DimensionMismatch` are all `Copy`. [Note 04](/digital-garden/rust-sandbox/derive/#der-copy) shows how a struct becomes `Copy`.

**`Clone`**: an explicit, possibly expensive duplicate.

```rust
let a = Vector::new(vec![1.0, 2.0]);
let b = a.clone();   // new heap allocation, and the numbers are copied
println!("{:?}", a); // OK: a and b own two separate copies
```

## 6. Borrowing: use a value without owning it
{: #own-borrow}

Moving and cloning often aren't what you want. Usually you want to *look at* a value and then give it back. That's **borrowing**. A borrow is a **reference**, written with `&`.

**Analogy:** you own a book. A friend borrows it, reads it and returns it. You still own the book, and the friend isn't allowed to throw it away.

```rust
fn print_len(v: &Vector) {     // borrows: doesn't take ownership
    println!("len = {}", v.len());
}

let a = Vector::new(vec![1.0, 2.0]);
print_len(&a);        // lend a
print_len(&a);        // lend it again
println!("{:?}", a);  // a is still the owner
```

There are two kinds of borrow:

| Syntax | Name | Allows | Analogy |
|---|---|---|---|
| `&T` | shared borrow | read only | many people can read the book at the same time |
| `&mut T` | mutable borrow | read and change | one person writes in the book, and nobody else touches it |

A reference is just a pointer: `size_of::<&Vector>()` is 8 bytes.

### The borrowing rule
{: #own-borrow-rule}

At any one time you can have **either**:

- any number of `&T` (readers), **or**
- exactly one `&mut T` (one writer).

Never both at the same time.

```rust
let mut v = vec![1.0, 2.0];
let first = &v[0];     // a shared borrow (a reader)
v.push(3.0);           // ERROR: push needs &mut v, but a reader still exists
println!("{}", first);
```

```text
error[E0502]: cannot borrow `v` as mutable because it is also borrowed as immutable
```

Why is this an error? `push` may need more room and **move the numbers to a new, larger heap location**. `first` would then point at freed memory. In C, this bug silently corrupts memory. Rust stops it before the program even exists.

A detail that confused me: a borrow lasts only until its **last use**, not until the `}`. If you read `first` *before* the `push`, the code compiles:

```rust
let mut v = vec![1.0, 2.0];
let first = &v[0];
println!("{}", first); // last use of the reader...
v.push(3.0);           // ...so the writer is allowed now
```

### A borrow cannot outlive its owner
{: #own-outlive}

```rust
let r;
{
    let x = 5.0;
    r = &x;
}                   // x is dropped here
println!("{}", r);  // ERROR: r would point at freed memory
```

```text
error[E0597]: `x` does not live long enough
```

This check is what **lifetimes** are about: the compiler proves that every borrow ends before its owner is dropped.

### `mut`: changing needs permission twice
{: #own-mut}

Variables are read-only by default. To change a value, or to lend it out as `&mut`, the variable itself must be declared `let mut`:

```rust
let v = Vector::new(vec![1.0]);
v.scale(2.0);   // ERROR: v is not declared as mutable
```

```text
error[E0596]: cannot borrow `v` as mutable, as it is not declared as mutable
```

## 7. Back to `self`, `&self` and `&mut self`
{: #own-self}

Methods take their value in one of the same three ways. The demo's `Vector` has one method of each kind:

```rust
impl Vector {
    /// Borrow to read.
    pub fn len(&self) -> usize {
        self.components.len()
    }

    /// Borrow to change.
    pub fn scale(&mut self, k: f64) {
        for x in self.components.iter_mut() {
            *x *= k;
        }
    }

    /// Take ownership: the Vector is consumed.
    pub fn into_inner(self) -> Vec<f64> {
        self.components
    }
}
```

```rust
let mut v = Vector::new(vec![1.0, 2.0]);
v.len();                  // v is still usable
v.scale(2.0);             // v is still usable, and now holds [2.0, 4.0]
let raw = v.into_inner(); // v moved into the method; v is gone now
```

| Form | Meaning | After the call |
|---|---|---|
| `self` | take ownership (the value moves into the method) | the caller can't use it any more |
| `&self` | borrow to read | unchanged, still usable |
| `&mut self` | borrow to change | changed, still usable |

`Display::fmt` (the method behind `println!("{}", ...)`, see [Note 02](/digital-garden/rust-sandbox/structs-impl-display/)) takes `&self` because printing only reads. That's why you can still use a value after printing it.

## 8. All the ownership concepts together
{: #own-table}

| Concept | What happens | Cost |
|---|---|---|
| Owner | One variable (or field) is responsible for a value | none |
| Drop | The owner leaves its scope, and Rust frees the value | one free, at a known place |
| Move | Ownership transfers, and the old name becomes unusable | copies only the stack part (24 bytes for `Vector`) |
| Copy | A small stack value is duplicated automatically | copies a few bytes |
| Clone | An explicit full duplicate | can allocate heap memory |
| `&T` | A shared, read-only borrow; many can exist at once | a pointer, 8 bytes |
| `&mut T` | One exclusive borrow that can change the value | a pointer, 8 bytes |
| Lifetime | The compiler proves a borrow ends before the owner is dropped | none at runtime |

## Summary: Rust ownership and borrowing
{: #own-summary}

- Ownership is how Rust frees memory without a garbage collector.
- Every value has one owner. When the owner leaves its scope, Rust drops the value, exactly once.
- Assigning or passing a heap value moves it. `Copy` types are copied instead.
- `.clone()` makes an explicit, possibly expensive duplicate.
- `&` borrows to read. `&mut` borrows to change. You can have many readers or one writer, never both at once, and a borrow ends at its last use.
- The compiler checks all these rules before the program runs, so they cost nothing at runtime.

