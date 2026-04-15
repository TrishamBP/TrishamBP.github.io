---
layout: post
title: "How Transformer Models Are Evaluated: BLEU, Perplexity, F1, GLUE, and SuperGLUE Explained"
date: 2026-04-16
author: Trisham Patil
mathjax: true
---

"Attention Is All You Need" reports 28.4 BLEU on WMT 2014 English-to-German. That single number launched a thousand follow-up papers. But BLEU is only one instrument in the evaluation toolkit. Depending on the architecture — encoder-only, decoder-only, encoder-decoder — the paper reaches for different metrics and benchmarks entirely.

This post covers every evaluation metric the Transformer paper uses, plus the benchmarks that came after: what each one measures, the exact formula, where it applies, and where it silently fails.

---

## 1. Perplexity

Perplexity (PPL) measures how well a probability model predicts a sample. Intuitively, a lower perplexity means the model is less "surprised" by the text it sees. In the "Attention Is All You Need" paper, it is reported as **train PPL** and **dev PPL** and is used primarily to compare variations of the Transformer architecture against each other.

One important caveat the paper is explicit about: perplexities are reported **per-wordpiece** according to byte-pair encoding, and should not be compared directly to traditional per-word perplexities.

### Universal Formula

$$
\text{PPL} = \exp\!\left(-\frac{1}{N} \sum_{i=1}^{N} \log P(x_i \mid \text{context})\right)
$$

<div style="background-color:#000; padding:1.5rem; border-radius:8px; display:inline-block; width:100%;">
  <img src="/assets/blogs/perplexity.png" alt="Perplexity formula breakdown for GPT, BERT, and the original Transformer — showing how context changes across architectures" style="display:block; width:100%;" />
</div>

The math is identical across all three architectures — `exp(average negative log-likelihood)`. The only thing that changes is the **conditioning set**: what the model "sees" when predicting each token.

### GPT's Perplexity

GPT's PPL is the cleanest to compute. It's a single forward pass: each token's probability falls out naturally from the causal mask. Because GPT is autoregressive — each token is predicted from only left context — the probability of every token in a sequence can be computed in one shot.

This is why GPT-family models are the standard benchmarks for perplexity comparisons. The left-to-right factorization makes perplexity a direct and unambiguous measurement.

### BERT's Pseudo-Perplexity

BERT's pseudo-perplexity (PPPL) is expensive and non-standard. Because BERT sees the entire context bidirectionally, you cannot compute a proper left-to-right probability. Instead, you mask one token at a time and run a separate forward pass for each — a 512-token sequence therefore requires 512 forward passes. The resulting PPPL is also not directly comparable to GPT's PPL because bidirectional context gives BERT an "unfair advantage" (it is seeing both past and future when predicting the masked token).

### The Original Transformer's Perplexity

The original Transformer's PPL adds a cross-attention term: the decoder conditions on both its own previous outputs and the full encoder representation of the source sequence. This is why the paper reports PPL on the target (decoded) side only.

This connects to the per-wordpiece note — since all three architectures typically use subword tokenization (BPE or WordPiece), the N in the formula counts subword tokens, not full words. A per-word PPL would be lower because it averages over fewer, more predictable units.

### The Perplexity–Accuracy Paradox

One of the most counterintuitive findings in the paper: **label smoothing** actually hurts perplexity while improving accuracy and BLEU. This means the model becomes more "unsure" as measured by PPL — yet makes better decisions. Perplexity and accuracy are not proxies for each other. They measure fundamentally different things.

---

## 2. F1 Score and English Constituency Parsing

The F1 score is the standard metric for evaluating the Transformer's performance on **English constituency parsing** — specifically the Wall Street Journal (WSJ) portion of the Penn Treebank.

A 4-layer Transformer achieved an F1 score of **91.3** in a discriminative setting and **92.7** in a semi-supervised setting, outperforming many models that had been specifically engineered for this task over decades.

### What is English Constituency Parsing?

Constituency parsing is the task of breaking a sentence into its nested grammatical structure — identifying which words group together to form phrases, and how those phrases nest inside larger phrases. It is called "constituency" because you are finding the **constituents** (building blocks) of the sentence.

Take the sentence "The cat sat on the mat." A constituency parser produces a tree showing that "The cat" is a noun phrase (NP), "on the mat" is a prepositional phrase (PP), "sat on the mat" is a verb phrase (VP), and the whole thing is a sentence (S). The structure is **hierarchical and nested**: the PP lives inside the VP, which lives inside S.

The model's job is to produce this exact tree given only the raw sentence. "English" here refers to the Penn Treebank's Wall Street Journal section — approximately 40,000 hand-annotated parse trees that serve as the gold standard.

<div style="background-color:#000; padding:1.5rem; border-radius:8px; display:inline-block; width:100%;">
  <img src="/assets/blogs/parse.png" alt="Constituency parse tree for the sentence 'The cat sat on the mat' — showing S, NP, VP, PP, DT, NN, VBD, IN labels in a hierarchical tree structure" style="display:block; width:100%;" />
</div>

The labels in the tree are standard linguistic tags: S = sentence, NP = noun phrase, VP = verb phrase, PP = prepositional phrase, DT = determiner, NN = noun, VBD = verb (past tense), IN = preposition.

### The PARSEVAL F1 Formula

Parsing F1 uses the standard precision/recall framework, but the unit being scored is a **labeled bracket** — a span of words tagged with a phrase type. The tree above contains spans like NP(1,2) meaning "words 1–2 form a noun phrase" and VP(3,6) meaning "words 3–6 form a verb phrase."

<div style="background-color:#000; padding:1.5rem; border-radius:8px; display:inline-block; width:100%;">
  <img src="/assets/blogs/f.png" alt="F1 score formula showing precision, recall, F1 calculation and a worked example for labeled bracketing evaluation" style="display:block; width:100%;" />
</div>

The model gets credit only when it proposes a bracket with both the **correct span** and the **correct label**. This is called "labeled bracketing F1" or PARSEVAL F1, after the evaluation scheme standardized in the 1990s.

The 91.3 and 92.7 scores mean that the Transformer's predicted parse trees matched roughly 91–93% of the gold-standard brackets in the Penn Treebank test set. This was a striking result for a general-purpose architecture — one not specifically designed for parsing.

---

## 3. Accuracy

Accuracy is mentioned in the paper as a metric that improves when using regularization techniques like label smoothing. It is the natural metric for **classification tasks**, which encoder-only models like BERT are well-suited for.

### What Accuracy Measures

Accuracy is the simplest evaluation metric: out of all the examples the model classified, what fraction did it get right? Unlike F1 (which cares about precision and recall separately) or BLEU (which measures generation quality), accuracy asks a binary question per example — correct or not?

<div style="background-color:#000; padding:1.5rem; border-radius:8px; display:inline-block; width:100%;">
  <img src="/assets/blogs/accuracy.png" alt="Accuracy formula showing correct predictions divided by total predictions, with a worked example and comparison to confidence scores" style="display:block; width:100%;" />
</div>

An important nuance: accuracy only cares about the final decision (the argmax of the output probabilities), not how confident the model was. A model barely confident in a wrong answer (0.54) counts the same as a model 0.99 confident in the wrong answer. Accuracy is indifferent to calibration. This is exactly where the label smoothing paradox shows up.

### How BERT Actually Does Classification

BERT is an encoder-only Transformer — it produces rich contextual representations of the input but does not generate text. To use it for classification, you prepend a special `[CLS]` token to the input, run everything through the encoder, and then take the final hidden state of just that `[CLS]` position. That single vector gets fed through a small classification head (a linear layer + softmax) to produce a probability distribution over classes.

<div style="background-color:#000; padding:1.5rem; border-radius:8px; display:inline-block; width:100%;">
  <img src="/assets/blogs/bert.png" alt="BERT classification architecture — CLS token prepended, passed through 12 encoder layers, final CLS hidden state fed to linear classification head" style="display:block; width:100%;" />
</div>

The reason accuracy is the natural metric for BERT is architectural. Unlike GPT (which generates token by token and is evaluated with perplexity or BLEU), BERT's encoder produces a fixed representation that gets squeezed through a classification head to answer a single question: which class does this input belong to?

The `[CLS]` token acts as a "summary" position — through 12 layers of bidirectional self-attention, it aggregates information from every other token and becomes a compressed representation of the entire input's meaning. This is also why BERT excels on GLUE/SuperGLUE benchmarks, which are almost entirely classification tasks (sentiment analysis, textual entailment, paraphrase detection).

### The Label Smoothing Paradox

Now for the counterintuitive finding from the original Transformer paper. Here is what label smoothing does and why it pulls accuracy and perplexity in opposite directions:

<div style="background-color:#000; padding:1.5rem; border-radius:8px; display:inline-block; width:100%;">
  <img src="/assets/blogs/smoothing.png" alt="Label smoothing effect diagram — showing how smoothing distributes probability mass away from the target token, hurting perplexity but improving accuracy and BLEU" style="display:block; width:100%;" />
</div>

Without label smoothing, the model is trained to assign probability 1.0 to the correct token and 0.0 to everything else. Label smoothing redistributes a small probability (ε) across all tokens, so the target gets 1 − ε instead of 1.0. The model is being told: "be correct, but don't be *certain*."

This hurts perplexity — the model's predicted probabilities are lower for the correct token, so the average negative log-likelihood goes up. But it improves accuracy and BLEU because it prevents the model from memorizing individual training examples with extreme confidence, which improves generalization.

The paradox reveals that perplexity and accuracy are measuring fundamentally different things. Perplexity asks: "how confident is the model in its predictions?" Accuracy asks: "does the model's top prediction match the truth?" A model can be less confident (higher PPL) but more often correct (higher accuracy) — and that is exactly what label smoothing achieves.

### When Accuracy Falls Short

Accuracy has a well-known weakness: it can be misleading on **imbalanced datasets**. If 95% of your data is "positive" and 5% is "negative," a model that always predicts "positive" achieves 95% accuracy while being completely useless at detecting the minority class.

This is why GLUE and SuperGLUE tasks often report additional metrics alongside accuracy: Matthews Correlation Coefficient (MCC) for CoLA, F1 for MRPC and QQP, and Spearman correlation for STS-B. Accuracy works well when classes are roughly balanced — which is true for most of the benchmark tasks where BERT set its records.

---

## 4. Benchmarks for Specific Architectures

The Transformer family splits into three structural types, each matched to different evaluation suites:

| Model Type | Primary Metrics / Benchmarks |
|---|---|
| Transduction — Original Transformer | BLEU (translation), F1 (parsing) |
| Encoder-only — BERT, RoBERTa | GLUE, Accuracy (classification) |
| Decoder-only — GPT family | Next-token prediction, perplexity, downstream tasks |
| Encoder-Decoder — BART, T5 | SuperGLUE, summarization quality |

The architecture determines what evaluation makes sense. Encoder-only models are not generating sequences, so BLEU doesn't apply. Decoder-only models are not classifying, so GLUE's format doesn't directly fit without adaptation. Each benchmark was designed with a specific capability in mind.

---

## 5. The GLUE Benchmark

The **General Language Understanding Evaluation (GLUE)** benchmark is a collection of diverse NLU tasks used to evaluate models like BERT. It measures a model's ability to understand language across different task formats — not just one skill.

BERT's success on GLUE was largely attributed to its pretraining objectives: **masked language modeling (MLM)** and **next sentence prediction (NSP)**. These allowed it to build rich representations of text before fine-tuning on each specific GLUE task. At the time of BERT's release, it outperformed all existing state-of-the-art models on GLUE.

As models like BERT continued to improve, GLUE became less challenging — models began approaching human-level performance. This led to the creation of **SuperGLUE**, a harder successor with more demanding tasks.

### The 9 GLUE Tasks

GLUE contains 9 different NLU tasks. The model is fine-tuned separately on each one, scored on each, and the scores are averaged into a single GLUE number.

<div style="background-color:#000; padding:1.5rem; border-radius:8px; display:inline-block; width:100%;">
  <img src="/assets/blogs/gleu.png" alt="GLUE benchmark tasks table — showing all 9 tasks including CoLA, SST-2, MRPC, STS-B, QQP, MNLI, QNLI, RTE, WNLI with their metrics and dataset sizes" style="display:block; width:100%;" />
</div>

A few things to notice. GLUE uses different metrics per task depending on what makes sense:

- **CoLA** uses Matthews Correlation Coefficient (MCC) because its classes are imbalanced
- **STS-B** uses Spearman correlation because it is a regression task — predicting a continuous similarity score, not a class
- The rest use accuracy or F1

The final GLUE score is the **simple average** of all 9 numbers — no weighting. If BERT scores 95.0 on SST-2, 88.9 on MRPC, 85.3 on CoLA, and so on, you add all 9 and divide by 9. That number is "the GLUE score."

There is no NER task in GLUE — Named Entity Recognition is evaluated separately in benchmarks like CoNLL-2003. GLUE is focused entirely on sentence-level and sentence-pair understanding tasks.

---

## 6. SuperGLUE

SuperGLUE was created because models like BERT started saturating GLUE, scoring near human performance. It contains 8 tasks requiring more sophisticated reasoning — tasks that were specifically selected because BERT-level models struggled with them.

<div style="background-color:#000; padding:1.5rem; border-radius:8px; display:inline-block; width:100%;">
  <img src="/assets/blogs/super.png" alt="SuperGLUE benchmark tasks — showing harder NLU tasks including BoolQ, CB, COPA, MultiRC, ReCoRD, RTE, WiC, WSC requiring multi-step reasoning and world knowledge" style="display:block; width:100%;" />
</div>

Models that followed BERT — T5, DeBERTa — are often evaluated on SuperGLUE to demonstrate further advancement. The scoring works the same way as GLUE: fine-tune on each task separately, measure each task's metric, take the simple average.

---

## 7. How Do You Know Pretraining Is Actually Working?

This is a genuinely subtle question. During pretraining, you have no labeled data — BERT is just reading Wikipedia and BookCorpus with random words masked out. So what can you actually track?

<div style="background-color:#000; padding:1.5rem; border-radius:8px; display:inline-block; width:100%;">
  <img src="/assets/blogs/pre.png" alt="BERT pretraining monitoring — MLM loss curve decreasing and MLM accuracy increasing over training steps, with checkpoint fine-tuning on downstream tasks to validate representation quality" style="display:block; width:100%;" />
</div>

During pretraining, the primary signals are:

- **MLM loss** — cross-entropy on masked token prediction; goes down as training progresses
- **MLM accuracy** — fraction of masked tokens predicted correctly; goes up
- **NSP loss / accuracy** — for BERT's next sentence prediction objective

Early in training, the model guesses randomly (1 in 30,000 chance for a 30k vocabulary). As training progresses, MLM loss drops and MLM accuracy rises — meaning the model is learning that "sat" fits the context "The cat [MASK] on the mat" better than "economy" or "purple."

### The Real Validation: Checkpoint Fine-Tuning

Here is the subtle part: loss going down does not guarantee the model is learning *useful* representations. It could be learning shallow patterns.

The real validation happens at checkpoints — you pause pretraining, fine-tune on a real labeled task like sentiment classification, and measure accuracy. If the pretrained checkpoint from step 500k fine-tunes to 90% accuracy on SST-2 but the checkpoint from step 1M fine-tunes to 93%, those extra 500k steps of pretraining produced genuinely better language understanding — not just lower loss.

This two-phase approach is exactly why BERT was revolutionary. Pretraining learns general language structure from cheap unlabeled data (Wikipedia, books). Fine-tuning adapts that knowledge to expensive labeled tasks (GLUE). The GLUE score measures how well the pretraining **transferred** — not the pretraining loss itself.

---

## 8. BLEU: The Primary Translation Metric

BLEU (Bilingual Evaluation Understudy) evaluates a machine-translated candidate by comparing it to one or more human reference translations. It relies on two components.

### Modified N-gram Precision

For each n-gram length (1 through 4), BLEU counts how many n-grams in the candidate also appear in the references. It is "modified" to prevent over-counting: if a word appears once in the reference but three times in the candidate, it is credited at most once.

### Brevity Penalty

Without a brevity penalty, a model could achieve perfect precision by outputting a single, highly certain word. The brevity penalty (BP) penalizes candidates shorter than the reference:

$$
BP = \begin{cases} 1 & \text{if } c > r \\ e^{(1 - r/c)} & \text{if } c \leq r \end{cases}
$$

### The Full Formula

$$
\text{BLEU} = BP \cdot \exp\!\left(\sum_{n=1}^{N} w_n \log p_n\right)
$$

Where:
- $p_n$ is the modified n-gram precision for n-grams of length n
- $w_n$ are positive weights (typically 1/N) that sum to 1
- N is the maximum n-gram length (typically 4)

### Why a +2 BLEU Jump Is a Big Deal

On WMT 2014 English-to-German, the "big" Transformer reported **28.4 BLEU** — exceeding the previously reported best result (including ensembles) by more than **2 BLEU points**.

A useful calibration: a single major design decision like collapsing to one attention head reduces BLEU by roughly 1 point. In competitive machine translation benchmarks, changes of even 1 BLEU are considered meaningful. A +2 point shift is interpreted as a qualitative architectural leap, not an incremental improvement.

---

## Key Takeaways

- **Perplexity** — how surprised the model is; GPT computes it cleanly in one pass; BERT requires 512 passes for a 512-token sequence; not comparable across architectures
- **F1 (PARSEVAL)** — labeled bracket precision/recall; both span *and* label must match; the Transformer hit 91.3 on Penn Treebank without being designed for parsing
- **Accuracy** — correct/total; sensitive to class imbalance; BERT uses `[CLS]` → linear head for classification; fast to compute, can be misleading
- **Label smoothing** — hurts PPL, improves accuracy and BLEU; these metrics measure different things and cannot substitute for each other
- **GLUE** — 9 tasks, simple average, different metric per task; saturated by BERT-scale models
- **SuperGLUE** — 8 harder tasks; current frontier for encoder-based models
- **Pretraining validation** — track MLM loss/accuracy, but true validation is downstream fine-tuning at checkpoints
- **BLEU** — n-gram precision + brevity penalty; per-wordpiece, not per-word; +2 on a competitive MT benchmark is a large structural gain

---

## Conclusion

The Transformer paper is often cited for its BLEU score. That number is the headline — but it is one measurement in a broader evaluation apparatus.

Perplexity catches how well a model fits its own distribution. F1 catches structural accuracy on hierarchical predictions. Accuracy catches classification correctness. BLEU catches translation quality via n-gram overlap. GLUE and SuperGLUE aggregate across tasks to measure general language understanding.

None of these metrics is the "right" one in isolation. Each illuminates a different failure mode. Understanding which metric applies to which architecture — and what each one silently ignores — is what separates someone who reads benchmark results from someone who understands them.
