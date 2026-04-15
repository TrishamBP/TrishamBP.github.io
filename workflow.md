# Research Paper Mastery Workflow

A systematic, multi-pass protocol for deep paper comprehension, critical analysis, and original research thinking. This document functions as a repeatable execution framework — not a reading guide.

---

## 1. First Pass: Paper Framing

**Objective:** Build a structural map of the paper without engaging in deep reasoning. Time budget: 15–25 minutes.

**Protocol:**

1. Read the title, abstract, and conclusion first. Skip everything else.
2. Scan all section headings and subheadings. Note the paper's skeleton.
3. Look at every figure, table, and diagram. Read their captions only.
4. Read the first sentence of every paragraph in the introduction and related work.
5. Identify the paper's rhetorical structure: is it proposing a new method, improving an existing one, providing a theoretical result, or presenting an empirical study?
6. Do not attempt to understand any equation, proof, or implementation detail.

The first pass should answer exactly three questions:

- What problem is being addressed?
- What category of solution is proposed?
- What is the claimed result?

If you cannot answer all three after skimming, the paper may require domain bootstrapping before proceeding. Use Section 1.2 to close knowledge gaps.

---

### 1.1 Framing Prompts (Claude / NotebookLM)

Use these prompts immediately after the first skim. Feed the paper (PDF or pasted abstract + introduction) into Claude or NotebookLM.

**Problem Identification:**

- "What is the exact problem this paper is trying to solve? State it as a formal objective, not a vague motivation."
- "What failure or limitation in existing work motivates this paper? Be specific about what breaks and under what conditions."
- "Restate the problem this paper addresses without using any jargon from the paper itself."

**Contribution Identification:**

- "List every explicit contribution the authors claim. For each, classify it as: theoretical, empirical, architectural, or methodological."
- "Which of the claimed contributions is the most novel? Which is incremental?"
- "If you removed the primary contribution of this paper, what is the best existing alternative a practitioner would use?"

**Assumption Identification:**

- "What assumptions does this paper make about the data, compute, or problem setting that are not proven but taken as given?"
- "Identify any implicit assumptions in the experimental setup that could limit generalization."
- "What would break if the core assumptions of this paper were violated?"

**Architecture / Method Overview:**

- "Describe the proposed method at the level of a block diagram. What goes in, what comes out, and what are the major processing stages?"
- "What is the single most important design decision in this architecture? Why did the authors likely make that choice?"
- "Map the proposed method to the closest known baseline. What is structurally different?"

---

### 1.2 Consensus AI for Framing

Consensus is used here to contextualize the paper within its research landscape before deep reading begins. The goal is to understand what came before, what exists alongside, and what gap the paper claims to fill.

**How to use Consensus at this stage:**

1. Extract 2–3 core technical terms from the paper title and abstract.
2. Run broad queries first, then narrow progressively.
3. Look for survey papers and benchmarks in the results — these compress years of context.
4. Pay attention to citation counts and recency in results to gauge consensus maturity.
5. If Consensus returns conflicting findings, flag the topic as actively contested. This is valuable information.

**Example Queries — Concept Understanding (10):**

1. "What is [core technique from paper] and how does it differ from standard approaches?"
2. "What are the theoretical foundations of [method family]?"
3. "How is [key term] defined and measured in recent literature?"
4. "What is the difference between [term A] and [term B] in the context of [field]?"
5. "What are the necessary conditions for [technique] to work effectively?"
6. "What mathematical framework underlies [method]?"
7. "What is the relationship between [concept A] and [concept B] in [domain]?"
8. "How has the definition of [key metric] evolved in [field] over the past five years?"
9. "What are the known failure modes of [technique family]?"
10. "What prerequisites does [method] assume about input data distribution?"

**Example Queries — Problem Framing (10):**

11. "Why is [problem addressed by the paper] considered difficult?"
12. "What are the main bottlenecks in solving [problem]?"
13. "What makes [problem] different from [related problem] in practice?"
14. "What are the real-world consequences of not solving [problem]?"
15. "What constraints make [problem] intractable with standard methods?"
16. "How do practitioners currently handle [problem] in production systems?"
17. "What is the gap between theoretical solutions and practical deployment for [problem]?"
18. "What datasets or benchmarks are standard for evaluating [problem]?"
19. "What evaluation metrics are most informative for [problem] and which are misleading?"
20. "What is the current state-of-the-art performance on [benchmark] for [problem]?"

**Example Queries — Comparison (10):**

21. "How does [proposed method] compare to [baseline method] on [benchmark]?"
22. "What are the trade-offs between [approach A] and [approach B] for [task]?"
23. "Which methods outperform [technique] and under what conditions?"
24. "What are the computational costs of [method A] versus [method B]?"
25. "Is [proposed approach] more data-efficient than [competing approach]?"
26. "How do attention-based methods compare to recurrence-based methods for [task]?"
27. "What are the scaling properties of [method] relative to [alternative]?"
28. "Does [method] generalize better than [alternative] to out-of-distribution inputs?"
29. "What are the known advantages of [architecture A] over [architecture B] for [data type]?"
30. "How do supervised and self-supervised approaches compare for [task]?"

**Example Queries — Historical Evolution (10):**

31. "What was the first paper to propose [technique] and what problem did it solve originally?"
32. "How has [method family] evolved from its original formulation to current versions?"
33. "What were the key breakthroughs that enabled [current approach]?"
34. "What older methods were replaced by [technique] and why?"
35. "What paradigm shifts have occurred in [field] over the past decade?"
36. "How did the introduction of [concept, e.g., transformers, diffusion, RLHF] change [subfield]?"
37. "What abandoned approaches to [problem] have been revisited recently?"
38. "What was the dominant approach to [task] before [current method]?"
39. "How have benchmark results on [dataset] progressed over the last five years?"
40. "What hardware or data availability changes enabled [recent technique]?"

---

### 1.3 Expected Output After Framing

After completing the first pass, you should have a written artifact containing:

**Problem Definition (2–4 sentences):**
A precise, jargon-free statement of the problem. Include the input space, output space, and what "success" means. If the problem is an optimization objective, state the objective.

**Solution Category (1 sentence):**
Classify the paper's approach: new architecture, new training procedure, new loss function, new data pipeline, new theoretical framework, combination of existing ideas, or empirical study.

**Key Ideas (3–5 bullets):**
The non-obvious technical decisions that distinguish this work from baselines. Not a summary — a distillation of what is genuinely new.

**Mental Map of the Field:**
A short written paragraph (or rough diagram) placing this paper relative to 3–5 other works. Identify: direct predecessors (what this builds on), direct competitors (what solves the same problem differently), and downstream consumers (what could build on this).

Do not proceed to the second pass without this artifact. If you cannot produce it, you have knowledge gaps. Return to Section 1.2.

---

## 2. Second Pass: Deep Reading (No Getting Stuck)

**Objective:** Understand every section of the paper. Resolve confusion in real time using external tools. Time budget: 60–120 minutes.

**Protocol:**

1. Read linearly from introduction to conclusion.
2. When you hit a paragraph you do not understand, mark it and move to the tool prompts below. Do not sit with confusion for more than 3 minutes.
3. For every equation, ask: what is the input, what is the output, what does each term do?
4. For every figure, ask: what claim does this figure support? Is the evidence convincing?
5. For the experimental section, track: datasets used, baselines compared, metrics reported, statistical significance (or lack thereof).
6. Maintain a running "confusion log" — a list of things you do not understand, annotated with whether the confusion is resolved or still open.

The goal is comprehension with velocity. Perfectionism kills reading momentum. If a detail resists understanding after two tool queries, log it and move on.

---

### 2.1 Claude Web Prompts

**Paragraph Explanation:**

- "Explain this paragraph in plain language. Assume I understand [field] at a graduate level but have not read this specific paper: [paste paragraph]"
- "This paragraph is making an argument. Break it into: (1) the claim, (2) the evidence, (3) the reasoning connecting them: [paste paragraph]"
- "Restate the following in first-principles terms, avoiding any jargon introduced by this paper: [paste paragraph]"

**Equation Breakdown:**

- "Break down this equation term by term. For each variable, state: what it represents, its dimensionality, and its range of valid values: [paste equation]"
- "What is the intuition behind this equation? Explain what happens when [key variable] increases, decreases, or approaches zero: [paste equation]"
- "Derive this equation from scratch starting from [foundational concept]. Show each step."
- "This loss function has [N] terms. Explain what each term penalizes and what behavior it encourages in the model: [paste loss function]"
- "Compare this equation to the standard formulation of [related concept]. What is the key modification and why does it matter?"

**Architecture Simplification:**

- "Draw a data flow description of this architecture. For each component, state: input shape, output shape, and what transformation it applies."
- "If I removed [component X] from this architecture, what would break and why?"
- "What is the information bottleneck in this architecture? Where is representation compressed most aggressively?"
- "Map each component of this architecture to the component it replaces or extends from [baseline architecture]."

**First-Principles Restatement:**

- "Restate the core idea of this paper using only concepts from [foundational textbook/course]. No paper-specific terminology."
- "If I had to re-derive this method from scratch knowing only the problem statement, what sequence of design decisions would I make?"
- "What is the simplest possible version of this method that would still work? What does the full version add on top?"

---

### 2.2 NotebookLM Prompts

Upload the paper into NotebookLM and use these prompts to generate structured notes.

**Section Summarization:**

- "Summarize Section [X] in exactly five bullet points. Each bullet must contain one distinct technical claim."
- "What is the single most important sentence in Section [X]? Why?"
- "Identify every forward reference in Section [X] — places where the authors say 'we will show later' or 'as described in Section Y.' List them."

**Idea Connection:**

- "What concepts from the introduction are directly addressed in the experiments? What concepts are introduced but never tested?"
- "How does the related work section set up the contribution? Identify which cited papers the authors are explicitly positioning against."
- "Trace the logical chain from problem statement to proposed solution. Are there any gaps in the reasoning?"

**Insight Extraction:**

- "What is the most surprising result in this paper? Why is it surprising given prior work?"
- "Identify any results the authors downplay or mention only briefly. Why might they have minimized these?"
- "What implicit claims does this paper make that are never directly stated or defended?"

**Structured Note Generation:**

- "Generate a structured outline of this paper's argument with three levels of hierarchy."
- "Create a glossary of every new term or notation this paper introduces, with definitions."
- "List every hyperparameter mentioned in this paper, its value, and whether the authors justify the choice."

---

### 2.3 Consensus Queries (During Reading)

Use these when you encounter claims, techniques, or results during reading that need external validation.

**Clarification Queries (10):**

1. "What does [specific technical term from paper] mean in the context of [field]?"
2. "How does [component described in paper] work at a mechanistic level?"
3. "What is the standard implementation of [technique mentioned in paper]?"
4. "What are common pitfalls when implementing [method]?"
5. "What is the expected behavior of [algorithm] on [data type]?"
6. "How sensitive is [technique] to hyperparameter [X]?"
7. "What is the computational complexity of [operation described in paper]?"
8. "What does [metric used in paper] actually measure? What does it miss?"
9. "What are the assumptions required for [theoretical result] to hold?"
10. "What does convergence mean for [optimization method] used here?"

**Validation Queries (10):**

11. "Do other papers report similar results for [method] on [benchmark]?"
12. "Has [claimed result] been independently replicated?"
13. "Is [performance number] considered strong for [task] on [dataset]?"
14. "Are the baselines used in this paper considered fair and current?"
15. "Has [baseline method] been superseded by something the authors did not compare against?"
16. "What is the typical variance in results for [method] across random seeds?"
17. "Do other papers use the same evaluation protocol for [benchmark]?"
18. "Are there known issues with [dataset] that could affect these results?"
19. "Is the training setup (learning rate, batch size, epochs) in this paper standard for [model type]?"
20. "Have any errata or corrections been published for this paper?"

**Alternative Explanation Queries (10):**

21. "Are there simpler explanations for why [method] works beyond the authors' stated reason?"
22. "Could [observed improvement] be explained by [confounding factor] instead of [proposed mechanism]?"
23. "What alternative architectures achieve similar results to [proposed method]?"
24. "Is [technique] effective because of [stated reason] or because of implicit regularization?"
25. "Do ablation studies in other papers contradict the claims made here?"
26. "What role does data preprocessing play in the results of [method]?"
27. "Could the improvements be attributed to increased model capacity rather than architectural novelty?"
28. "Have any papers shown that [technique] works for different reasons than originally proposed?"
29. "What is the minimal change to the baseline that would achieve comparable results?"
30. "Are there negative results for [method] that the authors may not have cited?"

**Known Issues in Literature (8):**

31. "What are the known reproducibility issues with [method or benchmark]?"
32. "What criticisms have been raised about [evaluation metric] used here?"
33. "Are there adversarial settings where [method] fails catastrophically?"
34. "What data leakage concerns exist for [benchmark]?"
35. "Has [technique] been shown to not generalize to [domain]?"
36. "What ethical or fairness concerns have been raised about [method or application]?"
37. "What are the known scaling limitations of [architecture]?"
38. "Are there better benchmarks than [dataset] for evaluating [capability]?"

---

### 2.4 Multi-Source Understanding Strategy

Each tool serves a distinct cognitive function. Using them together eliminates blind spots.

**Claude Web — Reasoning Engine:**
Use Claude when you need to think through something. Claude is best at: breaking down complex arguments, deriving equations step by step, explaining why a design decision makes sense, and answering "what if" questions. Claude operates on your confusion. Feed it the specific thing you do not understand, along with context about what you do understand.

**NotebookLM — Structural Organizer:**
Use NotebookLM when you need to see the big picture. It excels at: cross-referencing sections within the paper, identifying patterns across multiple uploaded papers, generating structured summaries, and maintaining a running knowledge base. NotebookLM operates on the paper as a whole. Use it to track how ideas connect across sections.

**Consensus — Research Validator:**
Use Consensus when you need to check a claim against the literature. It answers: is this result typical, has this been tried before, what do other researchers think about this technique, and what is the current consensus on this question. Consensus operates on the field. Use it to ensure you are not taking the authors' word at face value.

**Integration Protocol:**

1. Read a section of the paper.
2. If confused about a specific passage: go to Claude.
3. After understanding the section: go to NotebookLM to generate a structured note.
4. If the section makes a strong claim: go to Consensus to validate.
5. Update your confusion log. Repeat.

Never rely on a single tool for understanding. Cross-validate interpretations. If Claude's explanation contradicts Consensus results, you have found something worth investigating.

---

## 3. Third Pass: Thinking Upgrade

**Objective:** Transition from comprehension to critical analysis and original thought. This is the most important pass. Time budget: 60–90 minutes.

After two passes, you understand what the paper does and how it works. The third pass asks: why does it work, when does it fail, and what comes next. This is where research thinking begins.

---

### 3.1 Insight Mining with Consensus

These queries are designed to surface information that the paper itself does not provide: its weaknesses, its blind spots, and the frontier beyond it.

**Limitations (10):**

1. "What are the main limitations of [method] according to follow-up work?"
2. "Does [method] degrade when applied to [different domain or scale]?"
3. "What assumptions in [paper] have been challenged by subsequent research?"
4. "What real-world deployment challenges exist for [method]?"
5. "How does [method] perform when the data distribution is non-stationary?"
6. "What are the memory and compute requirements of [method] at production scale?"
7. "Does [method] require labeled data that is expensive or impractical to collect?"
8. "How robust is [method] to noise, missing data, or adversarial inputs?"
9. "What types of inputs cause [method] to produce degenerate outputs?"
10. "Are there theoretical bounds on when [method] is guaranteed to fail?"

**Criticisms and Debates (8):**

11. "What published critiques exist of [paper or method]?"
12. "Has [claimed contribution] been disputed by other researchers?"
13. "Are there papers that argue [alternative approach] is superior to [this method]?"
14. "What methodological concerns have been raised about [experimental setup]?"
15. "Has the community converged on accepting or rejecting [key claim from paper]?"
16. "What replication attempts of [method] failed and why?"
17. "Do any survey papers classify [method] differently than the authors do?"
18. "Are there fundamental theoretical objections to the approach taken in this paper?"

**Ablation and Component Analysis (8):**

19. "Which components of [method] contribute most to its performance?"
20. "What happens when [specific module] is removed from [architecture]?"
21. "Are the reported ablation studies in [paper] comprehensive, or do they miss important variables?"
22. "What ablations do follow-up papers run that the original did not?"
23. "Is [component] necessary or does it just help optimization?"
24. "What is the marginal contribution of [technique X] over [simpler baseline]?"
25. "Does pre-training matter more than architectural design for [method]?"
26. "Which hyperparameters have the largest effect on performance?"

**Failure Cases and What Replaced It (8):**

27. "What methods have superseded [this approach] since publication?"
28. "What are the known failure cases of [method] documented in literature?"
29. "Has [method] been abandoned in favor of simpler alternatives?"
30. "What engineering difficulties led practitioners to prefer [alternative] over [this method]?"
31. "Were there scaling laws that made [method] impractical as datasets grew?"
32. "What class of problems is provably unsolvable with [method's] framework?"
33. "Did the community discover that [claimed advantage] was an artifact of the evaluation?"
34. "What new techniques from [year range] made [method] obsolete?"

**Open Problems (10):**

35. "What open problems remain in [subfield] after this paper?"
36. "What would a next-generation version of [method] need to solve?"
37. "What theoretical questions does this paper leave unanswered?"
38. "What new benchmarks or evaluation protocols are needed for [problem area]?"
39. "What cross-disciplinary ideas could address the limitations of [method]?"
40. "How could [method] be adapted for [emerging application domain]?"
41. "What would a compute-optimal version of [method] look like?"
42. "What data-centric improvements could enhance [method] without changing the model?"
43. "What interpretability challenges does [method] pose?"
44. "What safety or alignment concerns arise from deploying [method] at scale?"

---

### 3.2 Research Thinking Prompts (Claude)

Use these prompts after you have completed Consensus insight mining. Feed Claude the paper along with your notes from the first two passes.

**Challenge Assumptions:**

- "Identify the three strongest assumptions this paper makes. For each, describe a realistic scenario where the assumption is violated."
- "The authors assume [X]. What would happen to their results if [X] were false? Walk through the failure cascade."
- "What parts of this paper would not survive a change from [controlled setting] to [real-world setting]?"
- "Does this paper conflate correlation with causation anywhere? Point to specific claims."

**Identify Weaknesses:**

- "If you were reviewing this paper for a top venue, what are the three most substantive criticisms you would raise?"
- "What experiments are missing from this paper that would meaningfully strengthen or weaken the claims?"
- "The paper claims [result]. What alternative explanations could account for this result without invoking [proposed mechanism]?"
- "Where does the paper's argument rely on intuition rather than formal justification?"
- "What is the weakest link in the chain of reasoning from problem to solution to evaluation?"

**Propose Improvements:**

- "Suggest three concrete modifications to [method] that could address [identified weakness]. For each, estimate the implementation difficulty and expected impact."
- "If you had access to 10x the compute budget, how would you redesign the experiments in this paper?"
- "What regularization techniques, data augmentation strategies, or architectural changes could address [failure mode]?"
- "Propose a hybrid approach that combines [this method] with [competing method]. What would the architecture look like?"

**Suggest Experiments:**

- "Design an experiment to test whether [claimed contribution] is truly responsible for the performance gains."
- "What ablation study would most efficiently determine the importance of each component?"
- "Propose a stress test that would reveal the boundaries of [method's] generalization."
- "Design a minimal experiment to determine whether [method] outperforms [simple baseline] for the right reasons."
- "What dataset does not yet exist that would be the ideal benchmark for [problem]?"

---

### 3.3 Layered Thinking Model

Apply this six-layer framework to every paper. Each layer builds on the previous one. Mastery of a paper means you can operate at Layer 5 or 6. Most readers stop at Layer 2.

**Layer 1: What Does It Do**

Describe the input-output behavior of the system. What goes in, what comes out. No internals. This is the black-box view. You should be able to explain this to someone who has never heard of the method, in two sentences.

Completion test: Can you state the paper's contribution without using any term the paper invented?

**Layer 2: How Does It Work**

Describe the mechanism. Walk through the architecture, the training procedure, the inference pipeline. Trace data from input to output through every transformation. Know the shapes, the operations, the flow.

Completion test: Could you re-implement this method from your notes alone, without re-reading the paper?

**Layer 3: Why Does It Work**

This is where most readers stall. The paper may or may not explain this well. Ask: what inductive bias does the architecture encode? What property of the data does the method exploit? What objective landscape is the optimizer navigating, and why does it find good solutions?

Completion test: Can you explain why this method works better than the baseline, at a level deeper than "the numbers are higher"?

**Layer 4: When Does It Fail**

Every method has boundary conditions. Identify them. What data distributions break it? What scale thresholds change behavior? What implicit assumptions, if violated, cause degradation? Look for: small dataset regimes, out-of-distribution inputs, adversarial conditions, long-tail distributions, multi-modal data.

Completion test: Can you describe three realistic scenarios where this method would underperform a simpler baseline?

**Layer 5: How Can It Be Improved**

Given your understanding of layers 1–4, propose concrete improvements. These should not be vague ("use more data"). They should be specific technical interventions: a different loss term, a modified architecture component, a new training schedule, a better data sampling strategy. Each proposal should have a clear hypothesis.

Completion test: Do you have at least one improvement idea specific enough to implement in code within a week?

**Layer 6: What Can Be Built On Top**

This is the generative layer. What new systems, applications, or research directions does this paper enable? What would you build if this paper's method worked perfectly? What adjacent problems could this approach be adapted to? This layer is where new papers come from.

Completion test: Can you write a one-paragraph research proposal that uses this paper as a foundation?

---

## 4. Final Output: Learning Lab Integration

After completing all three passes, convert your understanding into a structured Learning Lab entry. This is your long-term knowledge artifact.

**Mapping from workflow to Learning Lab sections:**

| Workflow Stage                          | Learning Lab Section   | Content Source                             |
| --------------------------------------- | ---------------------- | ------------------------------------------ |
| First Pass: Problem + Contribution      | Why This Paper Matters | Framing artifact from Section 1.3          |
| First Pass: Key Ideas                   | Core Idea              | Distilled key ideas from Section 1.3       |
| Second Pass: Claude/NotebookLM notes    | Key Concepts           | Glossary + structured notes from 2.2       |
| Second Pass: Architecture comprehension | Architecture           | Data flow description from 2.1             |
| Second Pass: Training and optimization  | Training               | Loss function breakdown + training details |
| Second Pass: Experimental results       | Results                | Critical evaluation of experiments         |
| Third Pass: Layers 1–6                  | My Understanding       | Layered analysis from Section 3.3          |

**Section-by-section construction:**

**Why This Paper Matters (3–5 sentences):**
State the problem, why it matters, and what this paper changes about the landscape. Do not recite the abstract. Write this in your own voice based on your framing artifact and Consensus results.

**Core Idea (1 paragraph):**
The single most important insight of the paper. Not a summary of the method — the idea underneath the method. What conceptual move makes this work?

**Key Concepts (bullet list):**
Every new term, technique, or notation you needed to learn to understand this paper. Each entry should have: the term, a one-line definition, and why it matters for the paper.

**Architecture (structured description):**
A block-by-block description of the system. For each block: name, input, output, operation, and purpose. Include dimensionality where known. This section should be sufficient for re-implementation.

**Training (structured description):**
Objective function, optimizer, learning rate schedule, batch size, dataset, augmentation, regularization, hardware, and total training time. Flag any unjustified choices.

**Results (structured evaluation):**
For each reported experiment: dataset, metric, paper's result, best baseline's result, margin of improvement, and whether statistical significance is reported. Include your assessment of whether the experimental design is fair.

**My Understanding (free-form):**
Your Layer 1–6 analysis. What do you think about this paper? What surprised you? What do you disagree with? What would you do differently? What research directions does this open? This section is the most valuable part of your entry. It is where your thinking lives.

---

## 5. End Goal

This workflow is not about reading papers. It is about building a research operating system inside your head.

**After 5 papers using this workflow:**
You will have a calibrated sense of what "good" looks like in a subfield. You will recognize common architectural patterns, evaluation protocols, and rhetorical structures. You will start noticing when a paper omits a baseline, dodges a limitation, or over-claims a result.

**After 15 papers:**
You will develop pattern recognition across methods. You will see that many papers in a subfield are variations on a small number of core ideas. You will start predicting what a paper's method looks like before reading the method section, just from the problem statement and results. You will know which benchmarks are meaningful and which are performative.

**After 30 papers:**
You will have research intuition. You will be able to identify open problems by noticing what no one has tried. You will see connections between subfields that specialists miss because they read narrowly. You will be able to propose new research directions — not by random inspiration, but by systematic gap analysis. You will have enough structured knowledge to write a survey, a position paper, or an original contribution.

**The compounding mechanism:**
Each paper you read through this workflow adds to three assets simultaneously: (1) your technical vocabulary, which accelerates future reading; (2) your map of the field, which improves your ability to judge novelty and significance; (3) your library of techniques, which gives you a larger design space for proposing new ideas. These assets compound. The thirtieth paper is ten times faster and more productive than the first.

**The transition from reader to researcher:**
Reading papers is input. Producing original ideas is output. This workflow bridges the gap by forcing you through the critical middle stage: structured critical thinking (Section 3). Most people read papers and summarize them. Researchers read papers and argue with them. The Layered Thinking Model in Section 3.3 is designed to push you from comprehension to argumentation to generation. That transition — from Layer 2 to Layer 6 — is the entire point.

---

## Appendix: Quick Reference Checklist

Use this checklist for each paper to ensure completeness.

**First Pass Complete:**

- [ ] Problem defined in your own words
- [ ] Solution categorized
- [ ] Key ideas extracted (3–5)
- [ ] Field map sketched (predecessors, competitors, consumers)

**Second Pass Complete:**

- [ ] Every section read
- [ ] Confusion log maintained and mostly resolved
- [ ] All equations understood at the input/output/purpose level
- [ ] Experimental setup and results critically evaluated
- [ ] Structured notes generated in NotebookLM

**Third Pass Complete:**

- [ ] Limitations identified from literature
- [ ] Assumptions challenged
- [ ] Weaknesses articulated
- [ ] At least one concrete improvement proposed
- [ ] Layer 1–6 analysis completed
- [ ] At least one research direction identified

**Learning Lab Entry Complete:**

- [ ] All seven sections written
- [ ] "My Understanding" section reflects original thinking, not summary
- [ ] Entry is self-contained (readable without re-reading the paper)
