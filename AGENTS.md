# AGENTS.md — SEO-FIRST CONTENT GENERATION POLICY

## 🎯 PRIMARY OBJECTIVE

ALL content generated in this codebase MUST be **SEO-optimized by default**.

This includes:

- Blog posts
- Articles
- Documentation pages
- Landing pages
- Any long-form or structured content

SEO is NOT optional. It is a **strict requirement**.

---

## 🚨 NON-NEGOTIABLE RULE

Codex MUST prioritize:

> Search visibility, ranking potential, and discoverability over stylistic creativity.

---

## 🔍 SEO REQUIREMENTS

### 1. TITLE (MANDATORY)

- Must be keyword-rich
- Clear and descriptive (no vague titles)
- Include primary keyword naturally
- Optimized for search intent

---

### 2. META DESCRIPTION (MANDATORY)

- Length: 150–160 characters
- Must include primary keyword
- Should encourage clicks (CTR optimized)

---

### 3. URL SLUG (MANDATORY)

- Lowercase
- Hyphen-separated
- No stop words unless necessary
- Example:
  `/transformer-ffn-vs-attention-explained`

---

### 4. KEYWORDS (MANDATORY)

Codex must extract:

- 1 primary keyword
- 5–10 secondary keywords

These must be:

- Naturally integrated into content
- Not keyword-stuffed

---

### 5. CONTENT STRUCTURE (STRICT)

All content MUST follow:
H1 (Title with primary keyword)
Introduction
Include keyword in first 100 words
Define problem clearly
Main Sections (H2, H3)
Structured hierarchy
Keyword variations included
Visual Section (if applicable)
Key Insights / Takeaways
Conclusion

---

### 6. HEADING OPTIMIZATION

- Use proper hierarchy (H1 → H2 → H3)
- Include keywords in headings where natural
- Avoid generic headings like "Overview"

---

### 7. READABILITY

- Short paragraphs (2–4 lines max)
- Use spacing for clarity
- Avoid dense blocks of text

---

### 8. INTERNAL LINKING (IF APPLICABLE)

- Suggest links to:
  - Existing blogs
  - Related topics
- Improves SEO authority

---

### 9. IMAGE SEO (CRITICAL)

If images are included:

- Use descriptive alt text
- Include keywords in alt text
- Add captions if helpful

Example:

---

### 10. KEYWORD DISTRIBUTION

Primary keyword must appear in:

- Title
- Meta description
- First 100 words
- At least one H2
- Naturally throughout content

---

## ⚠️ STRICTLY AVOID

- Keyword stuffing
- Vague or clickbait titles without substance
- Missing metadata
- Poor structure
- Unformatted content

---

## 🧠 CONTENT STYLE GUIDELINES

- Technical but readable
- Clear explanations
- Structured thinking
- No fluff
- No generic filler text

---

## 📤 OUTPUT REQUIREMENTS

Every content piece MUST include:

1. SEO Title
2. Meta Description
3. URL Slug
4. Keywords (primary + secondary)
5. Structured content (Markdown)

---

## 🧩 GOAL

All content should:

- Rank on search engines
- Be discoverable via relevant queries
- Provide real value (not just optimized text)

---

## 🔥 PRIORITY ORDER

1. SEO optimization
2. Clarity
3. Structure
4. Depth

---

If there is ever a conflict:
👉 SEO optimization takes priority

# 🧠 BLOG TEMPLATE — SEO OPTIMIZED + HIGH AUTHORITY

---

## 🏷️ METADATA (MANDATORY)

Title: <SEO optimized, keyword-rich title>  
Description: <150–160 char meta description with primary keyword>  
Slug: <lowercase-hyphen-separated-url>  
Date: <Month Year>  
Author: Trisham Patil

Primary Keyword: <main keyword>  
Secondary Keywords: <5–10 related keywords>

---

# <H1: SEO Title with Primary Keyword>

## 🚀 Introduction

- Hook the reader immediately (problem / contradiction / insight)
- Include **primary keyword within first 100 words**
- Clearly state:
  - What this blog explains
  - Why it matters

---

## 🧩 The Core Idea

- Explain the concept clearly
- Build intuition first
- Avoid jargon overload
- Use examples if needed

---

## ⚙️ How It Works (Step-by-Step)

Break down the system/process:

### Step 1: ...

### Step 2: ...

### Step 3: ...

- Keep it structured
- Make it scannable

---

## 🖼️ Visual Explanation (IMPORTANT)

If diagrams/images are referenced:

```markdown
![Descriptive alt text with keyword](./images/your-image.png)
Add short explanation below image
Use images to simplify complexity
🔬 Deep Dive
Go deeper into:
Technical details
Edge cases
Why things work this way
This is where authority is built
⚖️ Trade-offs / Limitations
What are the drawbacks?
When does this fail?
Real-world engineering considerations
💡 Practical Applications
Where is this used?
Industry relevance
Real-world examples
🧠 Key Takeaways
Bullet-point summary
4–6 key insights
Make it memorable
🔗 Related Topics (Internal Linking)
Suggest links to:
Other blogs
Related concepts
🧾 Conclusion
Reinforce main idea
End with:
Insight OR
Thought-provoking question
🔖 SEO CHECKLIST (SELF-VERIFY)
Primary keyword in title
Keyword in first 100 words
Keyword in at least one H2
Meta description included
Proper heading structure (H1 → H2 → H3)
Images have alt text
Readability (short paragraphs)

## 🔍 SEO VALIDATION CHECK (MANDATORY BEFORE OUTPUT)

Before generating or finalizing ANY content, Codex MUST run this checklist:

---

### 1. TITLE CHECK

- Is the title keyword-rich?
- Does it match search intent?
- Is it clear and not vague?

---

### 2. META DESCRIPTION CHECK

- 150–160 characters?
- Includes primary keyword?
- Encourages clicks?

---

### 3. KEYWORD CHECK

- Primary keyword identified?
- 5–10 secondary keywords included?
- No keyword stuffing?

---

### 4. CONTENT STRUCTURE CHECK

- H1 present?
- Proper H2 / H3 hierarchy?
- Logical flow?

---

### 5. KEYWORD DISTRIBUTION CHECK

- Present in:
  - Title
  - First 100 words
  - At least one H2
  - Naturally throughout?

---

### 6. READABILITY CHECK

- Short paragraphs?
- Clean formatting?
- No dense blocks?

---

### 7. IMAGE SEO CHECK (IF IMAGES USED)

- Alt text included?
- Descriptive + keyword-aware?

---

### 8. INTERNAL LINKING CHECK

- Suggestions for related content included?

---

### 9. VALUE CHECK (VERY IMPORTANT)

- Does content provide real insight?
- Or is it generic filler?

---

## 🚨 FAILURE CONDITION

If ANY of the above checks fail:

👉 Codex MUST rewrite the content before returning output

---

## 🧩 FINAL RULE

Content should pass this test:

👉 “Would this rank on Google AND provide real value?”

If not → improve it

# Learning Lab Standard — Research Papers

## 🎯 Purpose

The Learning Lab is not a blog.
It is a **thinking system in public**.

Each paper entry should:

- Capture _what I understood_ (not just what the paper says)
- Break down complex ideas into first principles
- Highlight what actually matters vs what is noise
- Surface insights that are often missed
- Help another engineer “get it” quickly and deeply

---

## 🏗️ Standard Structure (MANDATORY)

Every paper must follow this structure:

### 1. 🚀 Why This Paper Matters

- What problem does this paper solve?
- Why was this problem important at the time?
- What were previous limitations?

👉 Goal: Context + motivation

---

### 2. 🧠 Core Idea (Intuition First)

- Explain the main idea in simple terms
- Avoid jargon initially
- Use analogy if helpful

👉 Goal: “If you only read this section, you understand the paper”

---

### 3. ⚙️ Key Concepts

Break the paper into its core building blocks.

For each concept:

- What is it?
- Why is it needed?
- How does it work (high-level)?

👉 Goal: Modular understanding

---

### 4. 🏗️ Architecture / Method Breakdown

- Step-by-step explanation of the system
- Data flow (input → processing → output)
- Components interaction

👉 Goal: Make the system reconstructable in the reader’s head

---

### 5. 🔍 Training / Methodology

- How is the model trained?
- What are the phases (if any)?
- Why this training strategy works

👉 Goal: Understand _how learning happens_

---

### 6. 📊 Results & Impact

- What benchmarks improved?
- Why results are significant
- Real-world implications

👉 Goal: Separate hype from actual contribution

---

### 7. 🧩 My Understanding (MOST IMPORTANT)

This is the core of Learning Lab.

Include:

- What clicked for me
- What confused me initially
- How I simplified it mentally
- What I think is underrated or overlooked
- Any critique or limitation

👉 Goal: Original thinking > repetition

---

### 8. 🖼️ Visual Learning (Optional but Powerful)

Use visuals ONLY when they:

- clarify a concept
- show flow / architecture
- simplify complexity

👉 Goal: Reduce cognitive load

---

## 🎨 Visual Grammar (IMPORTANT)

Use visuals in a consistent way:

### 1. Flow Diagrams

- For pipelines and data movement
- Example: input → encoder → output

### 2. Block Diagrams

- For architecture breakdown
- Example: transformer layers, embeddings

### 3. Highlight Diagrams

- To explain one key idea
- Example: masked tokens in BERT

### Rule:

> If a concept takes >5 sentences to explain → consider a diagram

---

## 📊 Paper Difficulty Tiers

Tag each paper:

### 🟢 Tier 1 — Foundational

- Easy to grasp
- Core concepts
- Example: BERT, Attention Is All You Need

### 🟡 Tier 2 — Intermediate

- Requires some prior knowledge
- More engineering depth

### 🔴 Tier 3 — Advanced

- Heavy math / research depth
- Novel or complex ideas

👉 Goal: Build a structured learning path for readers

---

## 🧱 Consistency Rules

Across ALL papers:

- Same section order
- Same tone (engineer-to-engineer)
- Same depth level
- Same visual style
- Same linking pattern

---

## ✍️ Writing Style

DO:

- Write like you're explaining to a smart engineer friend
- Prefer clarity over completeness
- Break things into small chunks
- Use intuition before equations

DON’T:

- Copy paper language
- Write like an academic
- Add fluff
- Over-explain obvious things

---

## 🧠 Mental Model (VERY IMPORTANT)

Each paper should answer:

1. What problem is being solved?
2. What is the core idea?
3. How does it actually work?
4. Why does it work?
5. Why does it matter?

If these 5 are clear → the paper is well understood

---

## 🔁 Workflow (Your Process)

For each paper:

1. Read paper (1st pass — skim)
2. Read again (2nd pass — deep)
3. Write raw notes
4. Identify:
   - key ideas
   - confusing parts
   - insights

5. Add visuals where needed
6. Convert into Learning Lab format

---

## 🚀 End Goal

After 10–20 papers, this should:

- Showcase deep understanding
- Reflect your thinking style
- Act as a public research notebook
- Signal strong AI engineering capability

---

## 🧩 Philosophy

This is not about covering papers.

This is about:
👉 building a _way of thinking_
👉 making that thinking visible
👉 compounding understanding over time
```
