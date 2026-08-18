---
layout: post
title: "DSPy: Program, Don't Prompt — Programmatic Prompt Optimization for Production LLMs"
date: 2026-08-18
author: Trisham Patil
excerpt: "Why manual prompt engineering breaks in production, and how DSPy treats prompts as optimizable program components — Signatures, Modules, Metrics, and GEPA-driven optimization."
meta: "AI Engineering • LLM Systems"
category: "AI Engineering"
tags:
  - DSPy
  - Prompt Engineering
  - Prompt Optimization
  - LLM
  - Production AI
  - GEPA
  - LiteLLM
  - ReAct
  - Program Optimization
  - AI Engineering
---

<style>
/* Per-post typography override: Aptos font stack for this article only */
.post-content {
  font-family: "Aptos", "Aptos Display", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
}
.post-content h1,
.post-content h2,
.post-content h3,
.post-content h4 {
  font-family: "Aptos Display", "Aptos", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
}
</style>

# DSPy: Program, Don't Prompt

![DSPy and Prompt Engineering — programmatic prompt optimization for production LLM systems using Signatures, Modules, Metrics, and optimizers](/assets/images/blogs/dspy/dspy.png)

## Why I Started Questioning Prompt Engineering

I didn't come to DSPy because I was looking for a new framework to try. I came to it because I had already hit the limits of the way most of us build LLM applications—and I needed a better abstraction.

This post is about the problems that led me there, and why DSPy's core idea matters for anyone building production LLM systems.

---

## The Two Problems

### Problem 1: Prompts Are Coupled to Models

In a project I was working on, we had built and optimized our prompts around GPT-4o. At the time, everything worked. The prompts had been tuned—iteratively, painfully—to produce reliable outputs from that particular model.

Then the model ecosystem moved.

Newer models appeared. GPT-4o's position shifted. And suddenly our prompts, which encoded assumptions about one model's behavior, started producing regressions with others.

The fix was predictable and tedious:

1. Select a new model.
2. Run existing prompts.
3. Discover regressions.
4. Modify prompts.
5. Test again.
6. Repeat until quality is acceptable.

The application logic hadn't changed. The task requirements hadn't changed. But the prompts had to be revisited because the underlying model had changed.

This is a coupling problem.

If the actual requirement is something like "extract these fields from this document and return them in this structure," then why should the engineer maintain a carefully tuned natural-language prompt optimized for one specific LLM?

Ideally, the application should describe the task and its expected behavior. The system should determine how to communicate that task effectively to whatever model is selected.

---

### Problem 2: Describing a Constraint Is Not Enforcing It

The second problem was more frustrating.

I could tell an LLM exactly what structure I wanted. I could describe it in YAML, JSON, Markdown, Python data structures, or explicit formatting instructions. I could write:

```text
Return the response using exactly this structure:

{
    "field_1": "...",
    "field_2": "...",
    "field_3": "..."
}
```

And the model could still violate the requested structure.

This isn't necessarily a comprehension failure. It's a category error in how we're using prompts.

There is a difference between:

> "Please return this structure."

and

> "This program expects this structure."

The first is a request. The second is a contract.

With traditional prompt engineering, we rely on the model following natural-language instructions. But a model can add unexpected text, omit a field, change a name, produce invalid JSON, return wrong types, or behave differently after a model swap.

This matters most when the output of one LLM call becomes the input to another programmatic component. At that point, the LLM output isn't just text—it's an interface between the model and the rest of the software system. And interfaces need guarantees, not suggestions.

---

## The Question These Problems Lead To

Both problems point to the same underlying issue:

**We are treating prompts as the primary programming interface for LLM applications.**

That means the engineer is responsible for:

- Encoding the task logic in natural language
- Encoding the output format in natural language
- Encoding model-specific behavioral nudges in natural language
- Re-doing all of the above when the model changes

What if we stopped doing that?

What if, instead of writing:

```text
Here is a very long prompt...
Please reason about the task...
Please follow these instructions carefully...
Return exactly this format...
Do not include anything else...
```

we could describe the task like a software interface?

```python
class ExtractInformation(dspy.Signature):
    document: str = dspy.InputField()
    name: str = dspy.OutputField()
    email: str = dspy.OutputField()
```

The developer declares the contract of the task—inputs, outputs, types—rather than manually constructing the complete prompt.

---

## What DSPy Actually Proposes

DSPy, which originated at Stanford NLP, introduces a different abstraction for building LLM applications. The original research paper—*DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines*—was led by Omar Khattab along with researchers including Arnav Singhvi, Paridhi Maheshwari, Zhiyuan Zhang, Keshav Santhanam, and others.

The central observation was this: modern LLM applications are increasingly built as pipelines of language-model calls, but those pipelines are controlled by manually written and repeatedly tuned prompt templates.

DSPy proposes a separation:

**Task specification → Program → Optimization → Model execution**

rather than:

**Human → manually written prompt → Model**

The key ideas:

- **Signatures** declare what a task does (inputs and outputs) without specifying how to prompt for it.
- **Modules** compose LM tasks into programs, the way you'd compose functions in regular software.
- **Optimizers** improve how the program instructs the LM, based on a metric you define.

This makes the prompt an implementation detail rather than the central artifact the engineer maintains.

---

## What This Changes for the Engineer

The shift isn't just syntactic. It changes what question you're asking.

Instead of:

> "How do I write the perfect prompt for GPT-4o?"

you ask:

> "What is the task? What are the inputs and outputs? How do I measure success? How can the system optimize the LM program?"

That's a move from **prompt engineering** to **program engineering**.

It doesn't eliminate prompts—the model still receives a prompt at execution time. But DSPy generates and optimizes that prompt programmatically rather than requiring the engineer to hand-craft it.

---

## How DSPy Connects to Model Providers

One thing worth understanding early: DSPy does not implement a separate integration for every LLM provider.

Instead, it uses **LiteLLM** as an interoperability layer that normalizes different inference providers behind a common interface.

The architecture looks like this:

```
            DSPy Application
                  │
            dspy.Signature
            dspy.Module
                  │
                  ▼
               dspy.LM
                  │
                  ▼
               LiteLLM
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
  OpenAI      Anthropic      Google
```

In code, this means:

```python
lm = dspy.LM("openai/gpt-5-nano")
dspy.configure(lm=lm)
```

Two things are happening here:

1. `dspy.LM(...)` — Creates the language-model object, identified by a LiteLLM model string.
2. `dspy.configure(lm=lm)` — Makes that LM the default for DSPy programs in the current process.

Your DSPy program doesn't change when you switch providers. You change the model identifier:

```python
# Switch from OpenAI to Anthropic
lm = dspy.LM("anthropic/claude-sonnet-4-20250514")
dspy.configure(lm=lm)
```

The Signatures, Modules, and program logic remain the same. LiteLLM handles the provider-specific API differences underneath.

DSPy also supports temporarily overriding the model for a particular section of execution:

```python
with dspy.context(lm=another_lm):
    # This block uses a different model
    result = my_module(input_text="...")
```

This connects directly back to Problem 1. The reason model portability is possible in DSPy isn't just that the framework is well-designed—it's that there is a deliberate architectural separation between:

- **Your program** (Signatures, Modules, metrics)
- **The LM abstraction** (`dspy.LM`)
- **The provider interface** (LiteLLM)

Each layer can change independently. Your program doesn't know or care whether the underlying model is served by OpenAI, Anthropic, or Google. It only knows the task contract defined by your Signatures.

---

## How a DSPy Program Actually Runs

Let's trace through the simplest possible DSPy program to see how these abstractions work in practice.

```python
haiku_signature = "subject -> haiku"
haiku_generator = dspy.Predict(haiku_signature)

result = haiku_generator(subject="computer science")
print(result.haiku)
```

Four lines. But there's a full pipeline executing underneath.

### The Signature as a Function Contract

The string `"subject -> haiku"` is a Signature. Think of it as a function contract:

```
Input:  subject
Output: haiku
```

Because DSPy operates with language models, field names carry semantic weight. The name `haiku` isn't just a variable label—it's a hint to the LM about what kind of output to produce. Change it to `limerick` and the model would produce a limerick instead.

The Signature specifies **what** should happen. It does not specify which model to use—that's configured separately through `dspy.LM` and `dspy.configure`.

So the mental model is:

```
              DSPy Program
                   │
          ┌────────┴────────┐
          │                 │
      Signature             LM
          │                 │
     WHAT to do        WHICH model
          │                 │
          ▼                 ▼
   subject → haiku      GPT-5 Nano
          │
          └────────┬────────┘
                   ▼
              DSPy Adapter
                   │
                   ▼
           Generated prompt
                   │
                   ▼
                  LLM
```

### What Happens When You Call Predict

`dspy.Predict` is the foundational Module. When you call `haiku_generator(subject="computer science")`, here's the execution path:

1. The string `"subject -> haiku"` is parsed into a Signature class with typed input/output fields (defaulting to `str`).
2. A default instruction is generated: *"Given the fields `subject`, produce the fields `haiku`."*
3. An **Adapter** (by default, the `ChatAdapter`) renders the Signature and inputs into messages the LM can consume.
4. The adapter builds the full prompt: instructions, field schema, formatting markers, and the provided input.
5. The messages are sent to the configured LM. Caching is enabled by default.
6. The response is parsed by the adapter to extract the output fields.
7. A `Prediction` object is returned with accessible fields—`result.haiku` gives you the generated haiku.

The generated system prompt looks something like:

```text
Your input fields are:
1. `subject` (str):
Your output fields are:
1. `haiku` (str):

All interactions will be structured in the following way, with the appropriate values filled in.

[[ ## subject ## ]]
{subject}

[[ ## haiku ## ]]
{haiku}

[[ ## completed ## ]]

In adhering to this structure, your objective is:
    Given the fields `subject`, produce the fields `haiku`.
```

And the user message:

```text
[[ ## subject ## ]]
computer science

Respond with the corresponding output fields, starting with the field `[[ ## haiku ## ]]`,
and then ending with the marker for `[[ ## completed ## ]]`.
```

The LM responds:

```text
[[ ## haiku ## ]]
Silent code unfolds
Logic threads through hidden paths
Bugs bloom, then resolve

[[ ## completed ## ]]
```

The key insight: **you never wrote any of this prompt.** DSPy generated it from your Signature. The `[[ ## ... ## ]]` markers are how the ChatAdapter structures and parses the interaction.

### From Inline Strings to Class-Based Signatures

The inline string form is concise but limited. For more control, you can define a class-based Signature:

```python
class Haiku(dspy.Signature):
    """Write a haiku about the given subject."""
    subject: str = dspy.InputField()
    haiku: str = dspy.OutputField()
```

The docstring becomes the task instruction. The fields get explicit types. This is the same contract, expressed with more precision.

### The Four Levels of a DSPy Program

This reveals a layered structure that maps directly to the problems I described earlier:

**Level 1 — Signature:** WHAT should happen? (inputs, outputs, types)

**Level 2 — Instructions:** HOW should the task be interpreted? (docstrings, field descriptions)

**Level 3 — Examples:** SHOW the model what good behavior looks like. (demonstrations)

**Level 4 — Optimizer:** SEARCH and OPTIMIZE the program for better performance. (automated)

With traditional prompting, the engineer manually handles all four levels in a single prompt string:

```text
You are a poetry assistant.
Given a subject, write a haiku.
A haiku should have three lines with 5-7-5 syllables.
Here are some examples:
...
Follow this exact format:
...
Do not include anything else.
```

With DSPy, you express the task specification at the appropriate level and let the framework construct the actual LM interaction. That's the concrete meaning of "program, don't prompt."

---

## Expanding Signatures: Fields, Naming, and Types

The haiku example used a single input and single output. But Signatures scale naturally.

### Multiple Inputs and Outputs

Adding fields is as straightforward as separating names with commas:

```python
haiku_bot = dspy.Predict("location, mood -> haiku")
result = haiku_bot(location="a quiet library", mood="mysterious")
print(result.haiku)
```

```text
Books whisper in hush
Ink curls in soft dim corners
Night reads in quiet
```

Multiple outputs work the same way:

```python
haiku_bot = dspy.Predict("location, mood -> haiku, haiku_title")
result = haiku_bot(location="a quiet library", mood="mysterious")
print(result.haiku_title)
print(result.haiku)
```

```text
Where the Pages Breathe
- - -
Books whisper in hush
Ink curls in soft dim corners
Night reads in quiet
```

Each output field becomes an attribute on the returned `Prediction` object. The Signature is both the task contract and the interface definition.

### Naming Is the Cheapest Optimization

Here's something that makes DSPy different from traditional programming: **the LM reads your field names and uses them to infer intent.**

If we replace meaningful names with opaque identifiers:

```python
haiku_bot = dspy.Predict("a, b -> c")
result = haiku_bot(a="a quiet library", b="mysterious")
print(result.c)
```

```text
In the quiet library, a mysterious presence seemed to linger between
the shelves, as if it had been waiting for someone to notice.
```

The model doesn't know we want a haiku. It just guesses.

This is a fundamental difference from conventional software. In most programming languages, `x` and `descriptive_name` behave identically at runtime. In DSPy, naming is functional. A field called `research_request` will produce better completions than one called `request`, with no code changes.

This is both a feature and a design principle: Signatures communicate intent to both the engineer and the model simultaneously.

### Types as Structural Constraints

Inline types add enforcement beyond naming:

```python
haiku_bot = dspy.Predict("location, mood, contains_pun: bool -> haiku")
result = haiku_bot(location="a quiet library", mood="mysterious", contains_pun=True)
print(result.haiku)
```

```text
Dusty hush of books
Spine turns to hush of riddles
Novel jokes echo
```

DSPy coerces the LM's output into the declared types and surfaces clear warnings when coercion fails. This catches a class of silent failures that prompt-only systems hide.

For structured outputs, types express constraints that are easier to define in code than in natural language. Consider generating multiple haikus:

```python
haiku_bot = dspy.Predict("location, mood -> haikus: list[str]")
result = haiku_bot(location="a sunny beach", mood="relaxed")
print(f"Generated {len(result.haikus)} haikus")
print(result.haikus[0])
```

```text
Generated 3 haikus
Sun on sandy toes,
waves breathe slow, worries drift away—
soft light, easy air.
```

Richer types—Pydantic models, TypedDicts, dataclasses—can encode even more structural detail. The type system becomes a way to specify output contracts that the framework enforces programmatically, rather than hoping the model follows a natural-language formatting instruction.

This connects directly to Problem 2. The difference between "please return a list" in a prompt and `-> haikus: list[str]` in a Signature is the difference between a suggestion and a contract. DSPy's adapter and type coercion machinery is what closes that gap.

---

## Modules: Execution Strategies, Not Prompting Techniques

Once you understand Signatures (what) and Predict (the simplest how), the natural question is: what if a single LM call isn't enough?

DSPy answers this with different **Modules**—not different prompts, but different execution strategies for running an LM program.

This is an important distinction. Don't think:

> "DSPy has lots of different prompting techniques."

Think:

> "DSPy provides different modules that implement different strategies for executing an LM program."

### Predict — Just Answer

The baseline. One input, one LM call, one output.

```
Question
   ↓
  LLM
   ↓
Answer
```

```python
predict = dspy.Predict("question -> answer")
result = predict(question="What is the capital of France?")
```

### ChainOfThought — Answer with Reasoning

Instead of asking the model to jump directly to an answer, ChainOfThought adds an intermediate reasoning step:

```
Question
   ↓
Reasoning
   ↓
Answer
```

```python
cot = dspy.ChainOfThought("question -> answer")
result = cot(question="If a train leaves at 3pm going 60mph...")
print(result.reasoning)
print(result.answer)
```

The Signature stays the same. The module changes the execution strategy. ChainOfThought extends the Signature internally to include a `reasoning` field before the output, giving the model space to work through the problem.

### BestOfN — Generate Multiple Answers, Select the Best

Sometimes one attempt isn't reliable enough. BestOfN samples the wrapped module multiple times and uses a reward function to keep the best result:

```
             ┌→ Answer 1 ─┐
Question ────┼→ Answer 2 ─┼→ Reward Function → Best Answer
             └→ Answer 3 ─┘
```

```python
best = dspy.BestOfN(
    module=dspy.ChainOfThought("question -> answer"),
    N=3,
    reward_fn=my_scoring_function
)
```

This is a quality strategy: generate multiple candidates and let a metric decide which one wins.

### Refine — Try, Evaluate, Improve, Retry

Refine is fundamentally different from BestOfN.

BestOfN generates independently and picks the best. Refine generates, evaluates, produces feedback, and uses that feedback to improve the next attempt:

```
Generate
   ↓
Evaluate
   ↓
Feedback
   ↓
Improve
   ↓
Generate again
```

This is iterative self-improvement within a single execution. Each attempt is informed by what went wrong in the previous one.

### MultiChainComparison — Compare Multiple Reasoning Paths

Rather than committing to a single chain of reasoning, this module takes multiple already-generated reasoning paths and compares them to produce a final answer:

```
             ┌→ Reasoning path 1 ─┐
Question ────┼→ Reasoning path 2 ─┼→ Comparison → Final answer
             └→ Reasoning path 3 ─┘
```

The important detail: MultiChainComparison doesn't generate those drafts itself. The caller supplies the completions, and the module compares them. It's a synthesis strategy.

### ReAct — Reason and Use Tools

Once you need the model to interact with external systems—search, databases, APIs—you move beyond pure text generation:

```
Question
   ↓
Think
   ↓
Use Tool
   ↓
Observe
   ↓
Think
   ↓
Use Tool
   ↓
Final Answer
```

```python
react = dspy.ReAct("question -> answer", tools=[search, lookup])
```

ReAct interleaves reasoning with tool calls. The model thinks about what it needs, calls a tool, observes the result, and continues reasoning. This is the foundation for agentic DSPy programs.

### ProgramOfThought — Let the Model Write Code

A different strategy entirely: instead of reasoning in natural language, the model writes executable code to solve the problem:

```
Problem
   ↓
LLM generates Python
   ↓
Python executes
   ↓
Result
   ↓
LLM produces final answer
```

This is useful when the task is better solved computationally than linguistically—math, data manipulation, algorithmic problems.

### The Pattern

These modules share a common structure:

```
                     DSPy Program
                          │
                       Signature
                          │
             ┌────────────┴────────────┐
             │                         │
          Predict                 Other Modules
             │                         │
             │          ┌──────────────┼───────────────┐
             │          │              │               │
             ▼          ▼              ▼               ▼
          Basic    ChainOfThought    ReAct          BestOfN
          answer     reasoning       tools       multiple samples

                                      ┌──────────────┐
                                      │              │
                                      ▼              ▼
                                   Refine    MultiChainComparison
                                      │
                                      ▼
                              iterative improvement
```

The documentation notes that `Predict`, `ChainOfThought`, and `ReAct` cover most programs. The others exist for cases where you need multiple samples, iterative refinement, draft comparison, or code execution.

### The Four-Layer Mental Model

This is where DSPy becomes much more than "automatic prompt generation." The complete architecture separates four concerns:

| Layer | Role | Question it answers |
|-------|------|-------------------|
| **Signature** | Task contract | What are the inputs and outputs? |
| **Module** | Execution strategy | How should the task be executed? |
| **Adapter** | LM communication | How do we format this for the model? |
| **Optimizer** | Performance improvement | How do we make it better? |

Each layer is independent. You can change your module from `Predict` to `ChainOfThought` without touching your Signature. You can swap the underlying model without changing your module. And later, an optimizer can improve any layer's behavior against a metric you define.

This separation is what makes DSPy a programming model rather than a prompting library.

---

## Going Deeper: ReAct, Tools, and the Agentic Loop

Let's expand on ReAct because it's where DSPy programs become genuinely agentic.

### How ReAct Works

The execution loop:

```
User Task
   ↓
LLM reasons about what it needs
   ↓
Choose a tool
   ↓
Execute tool
   ↓
Observe result
   ↓
Reason again
   ↓
Choose another tool (or finish)
   ↓
Final synthesis
```

The model decides how many iterations it needs. `max_iters` provides a safety bound. The resulting `Prediction` carries the full trajectory—reasoning, tool calls, and observations.

### Tools Are Just Python Functions

In DSPy, a tool can be a Python function with typed arguments and a docstring:

```python
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    return weather_api.fetch(city)

react = dspy.ReAct("question -> answer", tools=[get_weather])
```

DSPy turns that function's name, parameters, and description into information the LM can use:

```text
Available tool:
get_weather(city: string)
Description: Get the current weather for a city.
```

The model reasons about whether and when to call it. The tool interface is extracted from the code itself—no separate tool-description schema to maintain.

### Python Execution and CodeAct

With a standard ReAct agent, tools are pre-defined functions. But ProgramOfThought goes further—the LM generates executable Python code:

```
Question
   ↓
LLM generates Python
   ↓
Python interpreter executes
   ↓
Execution result
   ↓
LLM produces final answer
```

CodeAct combines ReAct-style iterative reasoning with a Python sandbox. The model can write and execute code as part of its reasoning loop, not just call pre-defined tools.

### Where MCP Fits

MCP (Model Context Protocol) isn't a reasoning strategy. It's a protocol for exposing tools and resources to an agent:

```
                    DSPy ReAct
                       │
                       ▼
                  Agent / LM
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
        Python       API       MCP tools
         tool                   server
            │          │          │
            └──────────┼──────────┘
                       ▼
                   Observation
                       │
                       ▼
                    LM again
```

A DSPy ReAct program's available capabilities can include Python functions, APIs, database tools, MCP-provided tools—anything. The model decides which capability to use and when. That's what makes it agentic.

---

## Distinguishing the Strategies

These modules are not a linear progression. They solve different problems:

| Strategy | What it does | When to use it |
| --- | --- | --- |
| **Predict** | Direct generation | Simple tasks with straightforward answers |
| **ChainOfThought** | Adds reasoning before answering | Tasks requiring multi-step logic |
| **ReAct** | Iterative tool use | Tasks needing external information or actions |
| **ProgramOfThought** | Generates and executes code | Math, data manipulation, algorithmic problems |
| **BestOfN** | Samples N candidates, picks best | When reliability matters more than latency |
| **Refine** | Iterative self-improvement with feedback | When quality improves with revision |
| **MultiChainComparison** | Compares multiple reasoning paths | When you want synthesis from diverse approaches |

The critical distinction between the two that are most easily confused:

**ReAct** = iterative interaction with the environment

The model asks: *"What should I do next?"*

**Refine** = iterative improvement of an answer

The model asks: *"How can I improve what I just produced?"*

### Capability Levels

For building intuition, I'd organize these into levels based on what kind of problem they address:

**Level 1 — Basic generation:** Predict. Give me an answer.

**Level 2 — Reasoning:** ChainOfThought. Think through the problem before answering.

**Level 3 — Tool use:** ReAct. Reason, act, observe, repeat.

**Level 4 — Computational reasoning:** ProgramOfThought / CodeAct. Generate code and execute it.

**Level 5 — Multiple attempts:** BestOfN, MultiChainComparison. Generate alternatives and select.

**Level 6 — Iterative improvement:** Refine. Evaluate, get feedback, improve.

**Level 7 — Program optimization:** This is where DSPy diverges from every other agent framework.

### Level 7: The Bigger Idea

Levels 1–6 are about how to execute a single program. Level 7 is about how to make that program better over time.

Instead of the engineer manually deciding:

- "Let's add another reasoning step."
- "Let's add three examples to the prompt."
- "Let's change this instruction."
- "Let's rewrite the prompt for the new model."

you define a metric and let DSPy's optimizers search for a better-performing program.

That gives you two dimensions of the full DSPy picture:

**Dimension 1 — Program execution:**

```
                       Signature
                           │
                     "WHAT to do"
                           │
                           ▼
                        Module
                           │
                     "HOW to do it"
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       Predict           CoT              ReAct
          │                │                │
       direct          reasoning       reasoning +
       answer                           tools
                                           │
                              ┌────────────┼────────────┐
                              │            │            │
                           Python        MCP/API       DB
                           tools          tools       tools
                              │            │            │
                              └────────────┼────────────┘
                                           ↓
                                      Observations
                                           ↓
                                          LM
                                           ↓
                                        Output
```

**Dimension 2 — Program optimization:**

```
                    DSPy Program
                         │
             ┌───────────┼───────────┐
             │           │           │
           Metric      Examples    Traces
             │           │           │
             └───────────┼───────────┘
                         ↓
                    Optimizer
                         ↓
              Better DSPy Program
```

The first dimension is about running your program. The second dimension is about improving it.

This is the conceptual bridge:

**Prompt engineering → Agent engineering → Program optimization**

DSPy isn't giving you a collection of increasingly sophisticated prompts. It gives you different computational strategies for composing LM programs, and then provides mechanisms for evaluating and optimizing those programs automatically.

---

## Metrics and Optimization: The Second Dimension

Everything up to this point has been about how to *run* a DSPy program. Now we need to talk about how to *improve* one.

### The Optimizer Loop

A DSPy optimizer takes three inputs:

1. A DSPy program (Signature + Module)
2. An evaluation metric
3. Training examples / dataset

And it searches for a better version of that program:

```
DSPy Program
      +
Evaluation Metric
      +
Examples / Dataset
      ↓
   Optimizer
      ↓
Candidate Program 1 → Evaluate → Score
      ↓
Candidate Program 2 → Evaluate → Score
      ↓
Candidate Program 3 → Evaluate → Score
      ↓
     ...
      ↓
Best-performing program
```

The metric is the objective function. It defines what "better" means.

Without a metric, DSPy doesn't know what to optimize toward. This is the critical difference between DSPy and a prompt template library—DSPy has a concept of measurable improvement.

### What a Metric Can Evaluate

A metric can assess anything you can express as a score:

- Is the answer correct?
- Is the reasoning sound?
- Did the agent complete the task?
- Did it use the correct tools?
- Was the output in the required format?
- Was the response efficient (few steps, low token cost)?

For multi-step agents, metrics can evaluate the full execution trace—not just the final output, but the planning, tool selection, and intermediate reasoning.

```
                Agent / DSPy Program
                        │
                        ▼
                  Execution Trace
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
          Planning     Tools     Output
             │          │          │
             ▼          ▼          ▼
        Plan         Tool       Task
        Quality    Correctness Completion
```

This is where frameworks like DeepEval become relevant—they provide ready-made metrics for evaluating agent traces across reasoning, action, and execution layers. But the key insight is that DSPy's optimizers can use any metric as their feedback signal.

### What Optimizers Actually Change

DSPy optimizers vary in what they tune:

- **Some synthesize few-shot examples** — finding demonstrations that improve performance when included in the prompt.
- **Some optimize natural-language instructions** — searching for better task descriptions, constraints, or formatting guidance.
- **Some can optimize LM weights** — fine-tuning the model itself (for supported models).

For example, MIPROv2 searches over instructions and demonstrations. GEPA uses feedback and reflection to propose improved prompts iteratively.

### GEPA: Iterative Self-Improvement

GEPA is particularly interesting because it mirrors what an engineer does manually—but automates it:

```
Initial DSPy Program
        ↓
Run program on examples
        ↓
Collect execution traces
        ↓
Metric scores + feedback
        ↓
LLM reflects on what went wrong
        ↓
Propose improved instruction
        ↓
Run improved program
        ↓
Compare performance
        ↓
Keep promising candidate
        ↓
Repeat
```

GEPA collects traces and feedback, selects a module to improve, uses LLM reflection to propose a better instruction, rolls out the candidate, evaluates it, and maintains a Pareto candidate pool.

This is the automated version of the manual loop every LLM engineer has done:

> Run prompt → look at failures → rewrite prompt → run again → check if it's better → repeat

GEPA does that loop programmatically, with a metric as the objective.

### Model Switching and Re-Optimization

This connects directly to the model-coupling problem from the beginning of this post.

Suppose you've optimized a DSPy program for one model:

```python
lm = dspy.LM("openai/gpt-5-nano")
dspy.configure(lm=lm)
# optimizer has tuned instructions/examples for this model
```

Later you switch:

```python
lm = dspy.LM("anthropic/claude-sonnet-4-20250514")
dspy.configure(lm=lm)
```

The Signature remains the task specification. The Module remains the execution strategy. The LM is replaceable. The metric tells you whether the resulting behavior is good enough.

And the optimizer can re-search for better instructions and demonstrations for the new model:

```
              Same DSPy Program
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
        OpenAI    Anthropic   Google
          │          │          │
          ▼          ▼          ▼
       Evaluate   Evaluate   Evaluate
          │          │          │
          └──────────┼──────────┘
                     ▼
                  Metric
```

This is the key distinction:

**Model abstraction ≠ Automatic optimization**

These are two separate capabilities that work together:

1. DSPy abstracts the LM interaction behind its LM, Signature, Module, and Adapter interfaces, allowing the same program structure to be used across supported language models.
2. When an optimizer is applied, DSPy can optimize the instructions, demonstrations, or other program parameters for the selected LM according to an evaluation metric.

The first gives you portability. The second gives you performance recovery after a model switch—without manual prompt rewriting.

### The Traditional Approach vs. DSPy

Traditional LLM engineering:

```
Prompt → LLM → Output
   ↓
Engineer reads output
   ↓
Engineer manually rewrites prompt
   ↓
LLM → Output
   ↓
Engineer manually rewrites prompt again
   ↓
...
```

DSPy:

```
Signature + Module → LM → Program
       ↓
   Evaluation against metric
       ↓
   Optimizer proposes improvement
       ↓
Improved Program → LM → Evaluation
       ↓
   Optimizer proposes improvement
       ↓
   ...
```

The engineer's job shifts from *writing better prompts* to *defining better metrics and program structure*. The optimization loop is automated.

### Closing the Loop on the Original Problem

A year ago, I optimized prompts specifically for GPT-4o. When the model changed, I had to revisit those prompts manually. DSPy's philosophy is to make the task and program the stable engineering abstraction, while treating prompting and optimization as something that can be generated and tuned against an explicit metric.

That gives this entire post a natural arc:

**Prompt engineering → Evaluation → DSPy Programs → Metrics → Optimization → Model portability**

Each step builds on the last. And the result is a fundamentally different engineering posture: instead of maintaining fragile prompt strings, you maintain program structure and evaluation criteria. The prompts become a generated artifact—optimized, not hand-crafted.

---

## GEPA in Practice: What Optimization Actually Produces

To make this concrete, let's look at what GEPA actually does to a program.

### Setup

```python
from haiku_metric import haiku_metric

reflection_lm = dspy.LM("openai/gpt-5.4")

optimizer = dspy.GEPA(
    metric=haiku_metric,
    reflection_lm=reflection_lm,
    auto="light",
    num_threads=2,
)

optimized_haiku_bot = optimizer.compile(haiku_bot, trainset=train, valset=val)
```

Two things to notice:

1. **`reflection_lm`** — GEPA uses a separate LM for reflection and instruction writing. This model looks at examples, scores, and feedback, then proposes better instructions. When optimizing smaller models, using a larger reflection LM is worthwhile—they're better reasoners and only called a handful of times during optimization.

2. **`auto="light"`** — Controls the optimization budget. "light" evaluates around six candidate prompts. "medium" and "heavy" go further.

### What Happens During `compile`

Behind the scenes:

1. GEPA executes the program on training examples with the student LM.
2. Each result is scored with the metric. The metric can return text feedback explaining *why* a prediction failed.
3. Examples and their metric results are sent to the reflection LM, which proposes new instructions.
4. GEPA runs the program again with the new instructions, scores again, and keeps instruction candidates that score best.
5. This loop repeats until the budget runs out.

### The Metric Can Provide Feedback

This is a key GEPA feature. Instead of just returning a score, the metric can explain *why*:

```python
def haiku_score_gepa(example, prediction, trace=None, pred_name=None, pred_trace=None):
    text = prediction.haiku.lower()
    if example.season.strip().lower() in text:
        return dspy.Prediction(
            score=0.0,
            feedback="Don't reference the input season verbatim."
        )
    return dspy.Prediction(score=1.0, feedback=None)
```

That feedback string is passed to the reflection LM, which uses it to inform the next candidate instruction. This allows fine-grained guidance: labelers can annotate why specific examples should score differently, and LM judges can explain their reasoning.

### Before and After

The program started with this instruction (from the Signature docstring):

```text
Write a classical haiku given the provided inputs.
```

After GEPA optimization, the instruction became:

```text
Write a classical haiku from three inputs:

Inputs:
- location
- season
- mood

Output requirements:
- Return only the haiku itself.
- Exactly 3 lines.
- No title, no labels, no explanation, no reasoning, no quotation marks.

Primary success criteria, in order:
1. Exact 5-7-5 syllable counts, one line per count.
2. Exactly 3 lines.
3. A concrete seasonal image or cue appropriate to the given season.
4. Do not repeat the input season or mood words verbatim.
5. Keep diction sparse and image-heavy, with strong noun/verb focus.

Haiku style requirements:
- Use a classical haiku approach: brief, image-centered, present tense,
  emotionally restrained.
- Evoke the location, season, and mood indirectly through concrete imagery
  rather than naming them outright.
- Prefer concrete nouns and active present-tense verbs.
- Favor lexical density: most words should carry imagery or action.
- Keep adjectives very sparse; avoid piling on descriptors.
- Do not use first-person pronouns.
- Keep article use minimal.
```

The optimizer discovered what works for this specific model on this specific task—without the engineer manually writing any of it.

### The Results

Running GEPA with `gpt-5.4-nano` (student) and `gpt-5.4` (reflection):

- **Baseline score** (unoptimized nano): 78.1%
- **Baseline score** (unoptimized frontier `gpt-5.4`): 82.4%
- **Optimized score** (nano + GEPA): 90.1%

Once optimized, the smaller model is faster, cheaper, and better than an unoptimized frontier model.

And the same program optimizes differently depending on the model—because different models respond to different instruction patterns. That's exactly the coupling problem from the beginning of this post, now solved programmatically.

---

## DSPy and the Rise of Optimization Loops

DSPy's GEPA isn't the only system moving toward automated feedback loops. There's a broader pattern emerging across LLM engineering.

### Anthropic's Verification Loop

Anthropic's guidance for Claude Code describes verification as the most impactful practice: give the agent a way to check its own output so it can close the feedback loop and iterate until the result is correct.

Their verification loop:

```
Gather context
      ↓
Take action
      ↓
Verify result
      ↓
If incorrect → repair
      ↓
Verify again
      ↓
Done
```

This is primarily about runtime correctness: did the agent's work satisfy the requirements? If not, make another attempt.

### DSPy's Optimization Loop

DSPy + GEPA operates at a different level:

```
DSPy Program
      ↓
   LM call
      ↓
  Prediction
      ↓
    Metric
      ↓
Score + Feedback
      ↓
GEPA Reflection LM
      ↓
Improved instruction
      ↓
 New candidate
      ↓
    Metric
      ↓
     ...
      ↓
Best program found
```

This isn't verifying one execution—it's optimizing the program itself across many executions.

### The Distinction

| | Anthropic verification | DSPy/GEPA optimization |
| --- | --- | --- |
| **Scope** | Single execution | Program across many examples |
| **Question** | "Did this attempt succeed?" | "What instruction produces the best metric?" |
| **Output** | Correct result for this input | Improved program for all inputs |
| **Feedback goes to** | Same agent, same task | Reflection LM, next candidate |

They aren't the same algorithm. But they share the same underlying engineering principle:

**Don't trust the first generation. Create an objective way to evaluate the result, feed that information back into the system, and iterate.**

### The Historical Progression

There's a natural evolution here:

```
Traditional prompt engineering
        ↓
Prompt + examples (manual few-shot)
        ↓
Evaluate (manual inspection)
        ↓
Manually refine
        ↓
Automated prompt improvement (Anthropic Prompt Improver, etc.)
        ↓
Agentic verification loops (Action → Verify → Repair)
        ↓
DSPy / GEPA (Program → Metric → Reflection → Optimize)
```

Each step automates more of the feedback loop. Traditional engineering puts the human in every iteration. Verification loops let the agent self-correct at runtime. DSPy optimizers let the system discover better instructions across a dataset.

### The Broader Thesis

The emerging shift in LLM engineering is not "write a better prompt." It's:

**Build a feedback loop that can discover and verify better behavior.**

That's a much more interesting thesis than "DSPy is a prompt optimizer." DSPy is one implementation of a broader principle—that LM programs should be evaluated objectively and improved systematically, rather than tuned by hand through trial and error.

And when the model changes next month, you re-run the optimizer. The metric stays. The program structure stays. The instructions are regenerated for the new model's characteristics. That's model portability through optimization, not through careful manual prompt engineering.

---

## Saving and Loading: Programs as Deployable Artifacts

Once a DSPy program is optimized, you need to persist and reload it. This is where DSPy's separation of concerns pays off concretely.

### Two Modes of Saving

`.save(path)` has two modes:

```python
# State-only — small JSON file, human-readable, version-control friendly
optimized_haiku_bot.save("haiku_bot.json")

# Whole program — directory, includes structure + state as a pickled artifact
optimized_haiku_bot.save("haiku_bot/", save_program=True)
```

**State-only** (`.json`) stores the learned state: optimized instructions and few-shot demonstrations. It does *not* store the program's structure. To reload, you re-instantiate your program in code and apply the saved state on top.

**Whole program** (directory with `save_program=True`) writes the entire module—structure and state together. Use this when whoever loads the program won't have your Python class definitions available: shipping to another team, serving from a different repo, deploying as a standalone artifact.

The tradeoff: the state-only JSON is small, safe to share, and easy to diff. The directory form contains executable Python, so only load programs from trusted sources.

### Reloading

```python
# Whole program — rehydrates in one call
loaded = dspy.load("haiku_bot/")

# State-only — rebuild the program, then apply saved state
fresh = dspy.ReAct(HaikuBot, tools=[wikipedia_search, get_wikipedia_page])
fresh.load("haiku_bot.json")
```

### What's Saved vs. What's Not

The save file contains:

- Optimized instructions
- Demonstrations (few-shot examples)
- Signature metadata

It does **not** contain:

- LM client configuration
- API keys
- Provider choice
- Temperature or other inference parameters

That separation is intentional. You configure your LM as usual after loading, and the same program targets whichever model you point it at today.

This means you can:

1. Optimize a program against Model A.
2. Save the optimized state.
3. Load it later with Model B configured.
4. Evaluate whether the optimized state still performs well.
5. If not, re-optimize for Model B—same program structure, same metric, new instructions.

### Why This Matters for Production

This save/load design makes DSPy programs deployable artifacts rather than notebook experiments:

- **Version control:** The JSON state file diffs cleanly. You can track how instructions evolve across optimization runs.
- **CI/CD:** Optimization can run in a pipeline. Save the result. Deploy the artifact.
- **A/B testing:** Load two different optimization checkpoints and compare them against the same metric.
- **Model migration:** Load the same program structure, swap the LM, re-evaluate, re-optimize if needed.

The program's learned state is separated from both its structure (your code) and its runtime configuration (the LM). Each can change independently. That's the same architectural principle we've seen throughout DSPy—separation of concerns at every layer.

---

## The Complete Mental Model

Here's the full picture of DSPy as covered in this post:

```
DSPy
 │
 ├── Signature → WHAT the task is
 │
 ├── Module → HOW the task is executed
 │      ├── Predict
 │      ├── ChainOfThought
 │      ├── ReAct
 │      ├── Refine
 │      ├── BestOfN
 │      └── ProgramOfThought / CodeAct
 │
 ├── Adapter → translates the program into LM messages
 │
 ├── LM → which model/provider executes it
 │      └── LiteLLM provides provider abstraction
 │
 ├── Tools → Python functions / APIs / MCP capabilities
 │
 ├── Metrics → WHAT "good" means
 │
 └── Optimizer
       └── GEPA
            ├── execute
            ├── evaluate
            ├── reflect
            ├── improve
            └── repeat
```

And the production workflow:

**Specify → Execute → Evaluate → Optimize → Save → Deploy**

This is enough for 99% of use cases. You don't need to understand every optimizer variant, every adapter implementation, or every edge case in the DSPy API. If you understand the model above—Signatures define tasks, Modules define execution strategies, Metrics define success, and Optimizers improve the program—you can build production DSPy systems.

---

## Closing: What Actually Changes

The production-level takeaway is simple:

**You don't want your production system to depend on a manually perfected prompt for one particular model.**

You want:

- A program specification (Signature + Module)
- An evaluation metric (what "good" means, quantified)
- An optimization loop that determines whether a model or program change actually improves the system

That directly addresses the two problems I started with:

1. **Model changes → manually rewriting prompts** — DSPy separates task specification from model-specific instructions. When the model changes, re-optimize. The program structure and metric stay stable.

2. **Prompt instructions → unreliable structured behavior** — DSPy enforces types programmatically through its adapter and coercion machinery, rather than hoping the model follows natural-language formatting instructions.

### What DSPy Is Not

DSPy does not eliminate prompts—it generates them programmatically. It does not guarantee structured output—but it changes how structure is enforced. It does not automatically solve every model migration problem—but it decouples task logic from model-specific tuning. It does not make LLMs deterministic—nothing does.

What it does is change the level of abstraction at which the engineer works.

### The Shift

The old posture:

> "How do I write the perfect prompt for this model?"

The new posture:

> "What is my task? How do I measure success? How does the system improve itself?"

For those of us who have spent time debugging prompt regressions after a model update, or parsing broken JSON from a model that was explicitly told to return valid JSON, or re-tuning prompts every time a provider ships an update—that shift in abstraction is worth understanding deeply.

And if you've already been thinking about metrics as first-class components of your LLM system (through frameworks like DeepEval or your own evaluation pipelines), then DSPy's approach will feel natural. You're already doing the hard part—defining what "good" means. DSPy gives you the machinery to use that definition as the objective function for automated program improvement.

**Program, don't prompt.**
