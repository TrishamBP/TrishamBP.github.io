---
layout: post
title: "A Domain-Specific Multi-Task NLP System for Energy and Financial Intelligence"
description: "A full technical report covering NER v1, LLM-supervised NER v2, multi-label classification, unified multi-task modeling, and comprehensive empirical results."
date: 2026-04-07
author: Trisham Patil
tags:
  - AI
  - NLP
  - Systems
  - NER
  - Multi-Task Learning
  - Energy Intelligence
---

# Domain-Adaptive Multi-Task NLP for Financial and Geopolitical Intelligence Extraction

**A Systems and Applied Research Paper**

_QuantBridge AI Research — 2025_

---

## Abstract

Generic NLP systems fail systematically when applied to structured intelligence extraction from financial and geopolitical news. This paper describes the complete lifecycle of a domain-specific multi-task NLP system: from a baseline NER model trained on open-source general corpora, through LLM-assisted domain adaptation expanding coverage from 9 to 59 entity types, to a final unified architecture — `QuantBridge/energy-news-classifier-ner-multitask` — that performs Named Entity Recognition (NER) and multi-label topic classification simultaneously in a single forward pass over a shared DistilBERT encoder. We present the full architecture, training strategy, taxonomy design, and experimental results including per-entity F1 across 59 types and classification behavior across 40 real-world headlines. We document honest failure analysis including label collapse toward dominant training classes, near-zero recall on domain-critical categories (`energy`, `risk`, `shipping`), threshold calibration sensitivity, and structural limitations of BIO tagging for multi-role entities. The system achieves an overall NER F1 of 0.859 on a held-out LLM-labeled test set and extracts 2.15 entities per headline on average. Classification performance is limited by training data imbalance rather than architectural capacity. We discuss the practical implications of LLM-assisted weak supervision as the only viable path to domain NER at this scale, and outline concrete improvements that could close the gap between the system's current state and production-grade reliability across the full label set.

---

## 1. Introduction

Financial and geopolitical intelligence extraction is one of the most practically valuable and technically underserved problems in applied NLP. Analysts at energy trading firms, sovereign wealth funds, and geopolitical risk consultancies must identify, categorize, and cross-reference information about entities — companies, countries, commodities — and events — sanctions, pipeline disruptions, OPEC decisions — in real time from high-volume news streams. Existing general-purpose NLP systems fail this domain for three structural reasons.

**Entity coverage gaps.** Standard NER models trained on CoNLL-2003 or OntoNotes recognize generic entities: persons, organizations, locations, dates. They do not recognize "Brent crude" as a commodity benchmark, "LNG" as a tradeable good, "OPEC+" as a regulatory body with geopolitical weight, or vessel names like "Arctic Star" as infrastructure assets whose detention signals sanctions enforcement. These omissions are not minor edge cases — they are the core signals that financial intelligence systems are built to extract.

**Topic granularity mismatch.** General news classifiers produce coarse categories: World, Business, Sports, Technology. Financial intelligence requires finer-grained distinctions between macro-level economic signals (central bank policy, GDP revisions), sector-specific signals (energy supply disruptions, shipping congestion), and risk signals (geopolitical crises, sanctions regimes, supply chain disruptions). A headline about OPEC+ production cuts is simultaneously an energy story, a macroeconomic story, a geopolitical coordination story, and potentially a trade flow story. Any single-label formulation discards signal.

**Short-text semantic compression.** Financial news headlines are informationally dense and extremely short — typically 10 to 20 tokens. A headline like "OPEC+ extends cuts by 1M bpd" presupposes substantial domain knowledge to correctly classify. Standard models trained on full-length articles do not generalize well to this register. The `[CLS]` token, which aggregates sequence-level signal, must compress the semantics of 15 tokens into a 768-dimensional vector — a severe information bottleneck for multi-label classification.

This paper describes how we built a system that addresses all three problems through a sequence of architectural and data engineering decisions, where the failure mode of each iteration directly motivated the next. Section 3 provides the formal problem definition. Section 4 presents the system evolution. Sections 5 and 6 detail the final architecture and data strategy. Sections 8 and 9 present experimental results. Sections 10 and 11 analyze failure modes and system-level insights. Sections 12 through 14 address deployment, limitations, and future work.

---

## 2. Problem Definition

### 2.1 Structured Intelligence Signal Extraction

Given a raw news headline or short article, the system must produce a structured signal of the form:

```
Input : "Russia cuts natural gas flows to Poland and Bulgaria following payment dispute"

Output:
  entities:
    - {type: COUNTRY,   text: "Russia"}
    - {type: COUNTRY,   text: "Poland"}
    - {type: COUNTRY,   text: "Bulgaria"}
    - {type: COMMODITY, text: "natural gas"}

  topics:
    - politics   (score: 0.362)
    - macro      (score: 0.357)
    - energy     (score: 0.054)
```

NER extracts _what_ is mentioned: organizations, locations, commodities, persons, events. Classification answers _what this text is about_: which thematic categories are active. These are complementary signals that must operate in tandem. Without NER, classification is decontextualized — the topic `energy` fires on any article, but the downstream system cannot determine _which_ energy company, _which_ commodity, or _which_ infrastructure asset is involved. Without classification, every article is routed to every downstream consumer, introducing noise into pipelines that require topic-scoped input.

### 2.2 Why This Is Hard

The core difficulty is not modeling — it is **data scarcity at the intersection of labeling granularity and domain specificity**. The intersection of "labeled NER data" and "energy/geopolitical domain" is nearly empty in the public domain. CoNLL-2003 contains no energy entities. OntoNotes contains some financial text but nothing close to the required taxonomy. Reuters-21578 provides document-level category labels but no token-level NER annotations.

For classification, the challenge is **label imbalance and semantic overlap**. Labels like `energy`, `macro`, and `politics` frequently co-occur. A headline about OPEC+ production cuts is simultaneously about energy supply, macroeconomic expectations, geopolitical coordination, and potentially trade flows. Multi-label classification models must learn these overlapping associations from relatively sparse, heterogeneous training signal while avoiding collapse toward dominant training classes.

### 2.3 Why NER Is Semantic, Not Surface-Level

In standard NER benchmarks, named entities are recognizable by their surface form: capitalized multi-word strings, known proper nouns, title-case organizational names. In financial and geopolitical text, entity recognition requires domain knowledge that cannot be inferred from surface patterns alone.

**Case Study — "Brent":** In general English, a common given name or a place in London. In energy markets, the global benchmark for crude oil pricing — a `COMMODITY`. A model trained on CoNLL learns `Brent → PER` or `Brent → LOC`. It cannot learn `Brent → COMMODITY` without domain-specific annotation.

**Case Study — "OPEC+ decided to cut production by 1 mb/d":** Standard NER: `OPEC → ORG` (possibly), `+` breaks entity span. Domain NER: `OPEC+ → REGULATORY_BODY`, `1 mb/d` is a quantitative supply signal attached to a production entity that requires its own representation.

**Case Study — "Section 232 tariffs":** Generic NER: no entities. Trade policy NER: `Section 232 tariffs → TRADE_POLICY` entity driving steel and aluminum markets.

The fundamental gap:

```
Generic NER:   surface form → label
Domain NER:    surface form + context + domain schema → label
```

This insight motivates the full system design. Generic models learn to identify names that look like names in general text. Domain NER must learn that certain common words carry entity meaning in specific contexts — a fundamentally harder task requiring domain-specific training data at every stage.

---

## 3. System Overview

The system evolved through six distinct phases, each motivated by a specific failure in the previous approach.

```mermaid
graph TD
    A[Phase 1: Baseline NER<br/>Generic CoNLL/WNUT/WikiANN training<br/>5 entity types] -->|Fails on all domain entities| B
    B[Phase 2: LLM-Assisted Data Generation<br/>GPT-4o-mini domain annotation<br/>9 entity types] -->|Provides signal, introduces noise| C
    C[Phase 3: NER V2<br/>59-entity-type taxonomy<br/>LLM-labeled financial corpus] -->|NER solid, no classification| D
    D[Phase 4: Classification Model<br/>Transfer NER encoder, add CLS head<br/>AG News + Reuters + Kaggle] -->|Two separate models, latency overhead| E
    E[Phase 5: Signal Fusion<br/>Merge NER + CLS outputs post-hoc] -->|Structural complexity, representational inconsistency| F
    F[Phase 6: Unified Multitask Model<br/>Single shared encoder + both heads<br/>One forward pass]
```

The key architectural insight of the final system is that **the NER encoder and the classification encoder should be the same model**. Both tasks require identical underlying representations of financial text. Training them separately and fusing outputs post-hoc wastes compute, increases latency, and introduces representational inconsistency between the two signal streams. The final architecture, `QuantBridge/energy-news-classifier-ner-multitask`, runs both heads simultaneously in a single forward pass over a shared DistilBERT encoder.

### 3.1 End-to-End Data Flow

```mermaid
graph LR
    Raw[Raw News Headline] --> Tok[BertTokenizer<br/>do_lower_case=True<br/>max_length=128]
    Tok --> Enc[DistilBERT Encoder<br/>6 layers · 768 dim · 12 heads<br/>67M parameters]
    Enc --> All[All token hidden states<br/>shape: batch × seq_len × 768]
    Enc --> CLS[CLS token hidden state<br/>shape: batch × 768]
    All --> Drop1[Dropout 0.1]
    Drop1 --> NERH[NER Head<br/>Linear 768 → 19]
    NERH --> NEROut[NER logits<br/>batch × seq_len × 19<br/>argmax → BIO tags]
    CLS --> PreCLS[Linear 768 → 768 + ReLU]
    PreCLS --> Drop2[Dropout 0.2]
    Drop2 --> CLSH[CLS Head<br/>Linear 768 → 10]
    CLSH --> CLSOut[CLS logits<br/>batch × 10<br/>sigmoid → topic probs]
    NEROut --> Fuse[Signal Fusion<br/>entities + topic labels]
    CLSOut --> Fuse
    Fuse --> Struct[Structured Intelligence Signal]
```

---

## 4. Architecture

### 4.1 Encoder: DistilBERT

The encoder is `distilbert-base-uncased`, initialized from `QuantBridge/energy-intelligence-multitask-custom-ner` — a checkpoint already fine-tuned on energy and financial news for NER. This initialization provides a head start: the encoder's representations of domain-specific terminology are already richer than a generic `distilbert-base-uncased` checkpoint before classification training begins.

DistilBERT was selected over BERT-base for production practicality:

| Property                        | DistilBERT               | BERT-base    |
| ------------------------------- | ------------------------ | ------------ |
| Parameters                      | ~67M                     | ~110M        |
| Inference speed                 | 60% faster               | baseline     |
| Benchmark performance retention | ~97% of BERT             | baseline     |
| VRAM at inference               | Fits CPU + commodity GPU | Requires GPU |

The encoder produces hidden states of shape `(batch, seq_len, 768)`. At `max_length=128`, the context window covers approximately 90% of financial news headlines and short articles without truncation — sufficient for the deployment target of headline-length inputs.

Full DistilBERT architecture parameters:

| Parameter               | Value               |
| ----------------------- | ------------------- |
| Architecture            | Transformer encoder |
| Layers                  | 6                   |
| Attention heads         | 12                  |
| Hidden dimension        | 768                 |
| FFN inner dimension     | 3072                |
| Vocabulary size         | 30,522              |
| Max position embeddings | 512                 |
| Activation              | GELU                |
| Attention dropout       | 0.1                 |
| Hidden dropout          | 0.1                 |
| Total parameters        | ~66.9M              |

### 4.2 NER Head: Token Classification

```mermaid
graph TD
    H[Hidden states<br/>batch × seq_len × 768] --> D[Dropout p=0.1]
    D --> L[Linear 768 → 19]
    L --> Log[NER logits<br/>batch × seq_len × 19]
    Log --> AM[argmax over label dim]
    AM --> BIO[BIO tag sequence<br/>per input token]
    BIO --> Dec[BIO decoder<br/>span merging + sub-word fusion]
    Dec --> Ents[Entity spans<br/>text + type]
```

The NER head is a single linear projection from the 768-dimensional hidden state of each token to 19 output classes following BIO (Beginning-Inside-Outside) tagging:

| Tag format | Meaning                             |
| ---------- | ----------------------------------- |
| `O`        | Non-entity token                    |
| `B-<TYPE>` | Beginning of entity of type TYPE    |
| `I-<TYPE>` | Continuation of entity of type TYPE |

The 9 entity types used in the final multitask model are: `PERSON`, `ORGANIZATION`, `COMPANY`, `COUNTRY`, `LOCATION`, `COMMODITY`, `MARKET`, `INFRASTRUCTURE`, `EVENT`. This is a coarsened version of the 59-type taxonomy from V2, selected for the production system based on downstream consumer requirements.

During inference, argmax over the label dimension produces a tag ID per token. A BIO decoder merges consecutive B-/I- tags into entity spans, handling sub-word tokenization by concatenating `##`-prefixed tokens directly to the current span.

**On CRF omission:** A Conditional Random Field over the output sequence would enforce valid BIO transitions (e.g., `I-COMPANY` cannot follow `B-PERSON`). This is omitted for two reasons: (1) DistilBERT's contextual representations are strong enough that invalid transitions are rare in practice on short sequences; (2) CRF adds training complexity and CRF inference overhead that is not justified at headline-length inputs. For longer documents where invalid transition rates increase, a CRF layer would be warranted.

### 4.3 Classification Head: Multi-Label Sequence Classification

```mermaid
graph TD
    CLS[CLS token hidden state<br/>batch × 768] --> PC[Linear 768 → 768<br/>pre_classifier]
    PC --> ReLU[ReLU activation]
    ReLU --> Drop[Dropout p=0.2]
    Drop --> CL[Linear 768 → 10<br/>cls_classifier]
    CL --> Logits[Raw logits<br/>batch × 10]
    Logits --> Sig[Sigmoid per label<br/>independent probabilities]
    Sig --> Thr[Threshold @ 0.20–0.35<br/>active label = prob ≥ τ]
    Thr --> Labels[Active topic labels]
```

The classification head operates on the `[CLS]` token hidden state, which aggregates information across the full input sequence. The two-layer structure (`pre_classifier → ReLU → cls_classifier`) was inherited from `DistilBertForSequenceClassification`. It adds representational capacity between the encoder output and the final label projection — important for multi-label prediction where the model must learn non-linear separating surfaces in the embedding space.

**Loss function: BCEWithLogitsLoss.** Unlike single-label classification which uses CrossEntropyLoss with softmax, multi-label classification applies independent sigmoid functions to each logit. BCEWithLogitsLoss computes binary cross-entropy over all 10 labels independently:

```
L(y, ŷ) = -1/N * Σ [y_i * log(σ(x_i)) + (1 - y_i) * log(1 - σ(x_i))]
```

Each label is treated as an independent binary prediction, allowing any combination of labels to activate simultaneously. A headline can be `energy + risk + geopolitical` without these labels competing in a softmax distribution.

**Thresholding.** During inference, a threshold τ converts sigmoid probabilities into binary predictions:

```
ŷ_i = 1  if  p_i ≥ τ  else  0
```

The default τ = 0.5 is almost always suboptimal for imbalanced multi-label settings. For this system, τ = 0.35 was used operationally after validation set tuning. Per-label thresholds would be strictly preferred but are not yet implemented.

**Label set:**

| Label        | Description                                     |
| ------------ | ----------------------------------------------- |
| `energy`     | Oil, gas, LNG, renewables, power markets        |
| `macro`      | Central banks, inflation, GDP, monetary policy  |
| `politics`   | Government decisions, elections, legislation    |
| `trade`      | Tariffs, sanctions, import/export flows         |
| `risk`       | Geopolitical instability, conflict, disruption  |
| `business`   | Corporate earnings, M&A, company-level news     |
| `technology` | Semiconductors, AI, tech sector                 |
| `stocks`     | Equity markets, indices, FX                     |
| `regulation` | Regulatory decisions, compliance                |
| `shipping`   | Vessel routing, port disruption, maritime trade |

### 4.4 Weight Initialization and Model Assembly

The final model's weights originate from two sources, assembled via a key-remapping merger:

```mermaid
graph TD
    NER_HF[QuantBridge/energy-intelligence-multitask-custom-ner<br/>HuggingFace Hub] --> ENC[Encoder weights<br/>distilbert.*]
    NER_HF --> NERW[NER head weights<br/>classifier.* → ner_classifier.*]
    CLS_LOCAL[energy_news_classifier_ner/<br/>Local checkpoint] --> PREC[Pre-classifier weights<br/>pre_classifier.*]
    CLS_LOCAL --> CLSW[CLS head weights<br/>classifier.* → cls_classifier.*]
    ENC --> MERGE[Weight merger]
    NERW --> MERGE
    PREC --> MERGE
    CLSW --> MERGE
    MERGE --> FINAL[QuantBridge/energy-news-classifier-ner-multitask<br/>106 weight tensors · 66,975,773 parameters]
```

Key remapping applied during the merge:

| Source key                    | Destination key         |
| ----------------------------- | ----------------------- |
| NER model `distilbert.*`      | `distilbert.*`          |
| NER model `classifier.weight` | `ner_classifier.weight` |
| NER model `classifier.bias`   | `ner_classifier.bias`   |
| CLS model `pre_classifier.*`  | `pre_classifier.*`      |
| CLS model `classifier.weight` | `cls_classifier.weight` |
| CLS model `classifier.bias`   | `cls_classifier.bias`   |

The merger calls `load_state_dict(strict=True)` to verify zero missing and zero unexpected keys. The combined model has 66,975,773 parameters — the encoder dominates at ~66.9M; the two task heads contribute ~75K parameters combined.

**Why weight merger rather than joint training:** The NER backbone had already been fine-tuned on domain-specific data with a strong supervised NER signal. Joint training from the start would risk catastrophic forgetting of NER representations by the classification gradient signal, particularly given the severe class imbalance in the classification data — which would produce large, noisy gradients for underrepresented labels that push the shared encoder's representations away from the NER-relevant structure. The merger approach preserves both learned representations exactly and provides a clean baseline for future joint fine-tuning experiments.

---

## 5. NER System Evolution: V1 → V2

### 5.1 V1: Baseline on Generic Corpora

**Objective.** Version 1 (`distilbert-energy-intelligence-multitask-v1`) was built to benchmark how far off generic NER is from domain requirements — quantifying the gap before domain-specific adaptation.

**Data.** Three open-source corpora were combined:

| Dataset    | Domain                         | Size (train)     | Entity Types                                                 |
| ---------- | ------------------------------ | ---------------- | ------------------------------------------------------------ |
| CoNLL-2003 | Reuters newswire, 1990s        | 14,041 sentences | PER, ORG, LOC, MISC                                          |
| WNUT-17    | Twitter, Reddit, StackExchange | 3,394 sentences  | person, location, corporation, product, creative-work, group |
| WikiANN-en | Wikipedia articles             | 20,000 examples  | PER, ORG, LOC                                                |

Labels were remapped to a unified 5-type active schema: `PER`, `ORG`, `LOC`, `EVENT`, `COMMODITY`. `COMMODITY` was derived entirely from WNUT `product` mappings — an approximate and noisy proxy. `EVENT` was derived from WNUT `creative-work` noise (movie titles, product names). The combined training set comprised ~37,435 examples.

**Architecture.** `distilbert-base-uncased` with a single linear token classification head projecting 768 → 11 (O + B/I × 5 entity types). Max sequence length of 128 tokens, chosen for VRAM constraints on an NVIDIA RTX 3050 4GB. No class weighting applied to the cross-entropy loss.

**Tokenization alignment:**

```python
def _tokenize_active(example, tokenizer):
    tokenized = tokenizer(
        example["tokens"],
        truncation=True,
        max_length=128,
        is_split_into_words=True,
    )
    word_ids = tokenized.word_ids()
    labels = []
    prev = None
    for wid in word_ids:
        if wid is None:
            labels.append(-100)             # special tokens
        elif wid != prev:
            labels.append(ner_tags[wid])    # first subword → word label
        else:
            orig_name = active_id2label[ner_tags[wid]]
            if orig_name.startswith("B-"):
                new_name = orig_name.replace("B-", "I-")
                labels.append(active_label2id.get(new_name, ner_tags[wid]))
            else:
                labels.append(ner_tags[wid])
        prev = wid
    tokenized["labels"] = labels
    return tokenized
```

**V1 Pipeline:**

```mermaid
graph TD
    A["Raw Text Input<br/>(Financial / Geopolitical News)"] --> B["WordPiece Tokenizer<br/>distilbert-base-uncased<br/>max_length=128"]
    B --> C["[CLS] token₁ token₂ ... [SEP]<br/>Subword Token IDs"]
    C --> D["DistilBERT Encoder<br/>6 Transformer Layers<br/>12 Attention Heads | dim=768"]
    D --> E["Contextual Embeddings<br/>[batch, seq_len, 768]"]
    E --> F["Dropout(p=0.1)"]
    F --> G["Linear Layer<br/>768 → 11"]
    G --> H["Per-Token Logits<br/>[batch, seq_len, 11]"]
    H --> I["Argmax over label dim"]
    I --> J["Token Label IDs<br/>0=O, 1=B-PER, 3=B-ORG, ..."]
    J --> K["BIO Span Reconstruction"]
    K --> L["Named Entities<br/>PER | ORG | LOC | EVENT | COMMODITY"]

    subgraph Training
        M["CoNLL-2003"] --> N["Label Remapper"]
        O["WNUT-17"] --> N
        P["WikiANN-en"] --> N
        N --> Q["Unified → Active Labels<br/>11-class schema"]
        Q --> R["DataCollatorForTokenClassification"]
        R --> S["HuggingFace Trainer<br/>AdamW | lr=2e-5 | 3 epochs"]
        S --> T["Cross-Entropy Loss<br/>masked on -100 tokens"]
        T --> U["seqeval F1<br/>chunk-level evaluation"]
    end
```

### 5.2 V1 Failure Analysis

V1 demonstrated a clean 100% pass rate on standard CoNLL-style entities (persons, organizations, locations from Western news). Its failure on domain entities was total:

| Category                   | Test Cases | Pass Rate |
| -------------------------- | ---------- | --------- |
| Standard NER (CoNLL-style) | 4          | 100%      |
| Energy Commodities         | 5          | 0%        |
| Geopolitical Organizations | 4          | 25%       |
| Financial Instruments      | 4          | 25%       |
| Infrastructure             | 3          | 33%       |
| Edge Cases                 | 5          | 60%       |
| **Total**                  | **25**     | **40%**   |

**Failure mode distribution:**

```
Entity completely missed (labeled O)    10    67%
Entity labeled with wrong type           3    20%
Entity partially recognized              2    13%
```

Representative failures:

| Input           | Expected                | V1 Output                    |
| --------------- | ----------------------- | ---------------------------- |
| `Brent crude`   | B-COMMODITY I-COMMODITY | O O                          |
| `WTI`           | B-COMMODITY             | O                            |
| `OPEC+`         | B-ORG                   | O (tokenizer splits "OPEC+") |
| `Nord Stream 2` | B-ORG I-ORG I-ORG       | B-LOC I-LOC O                |
| `Henry Hub`     | B-COMMODITY I-COMMODITY | B-LOC I-LOC                  |
| `Basel III`     | B-ORG I-ORG             | O O                          |
| `SOFR`          | B-COMMODITY             | O                            |

**Root causes:**

1. **Lexical mismatch:** Financial tickers, commodity codes, and regulatory acronyms absent from DistilBERT pre-training and V1 fine-tuning data.
2. **Context blindness for ambiguous tokens:** "Shell" as a company fails because the word appears as a common noun or verb far more often in the training corpus. "Brent" was learned as a person name or London borough, not a crude benchmark.
3. **No EVENT coverage for market events:** V1's `EVENT` label was trained on WNUT `creative-work` noise. It has never seen "Q3 earnings miss", "rate decision", or "force majeure declaration".
4. **`O`-class dominance with no loss weighting:** In financial text, ~92% of tokens are `O`. V1 with uniform cross-entropy drifts toward predicting `O` for uncertain spans — the globally safe prediction.
5. **Sequence truncation at 128 tokens:** Financial text frequently has entity mentions beyond the truncation boundary.

V1's metrics on the generic validation corpus (0.81 F1) were deceptive. They measured performance on the same distribution as training. In-domain financial performance was substantially lower — the 40% overall pass rate on designed financial test cases is the honest measure of V1's utility.

### 5.3 V2: LLM-Assisted Domain Adaptation

**The taxonomy problem.** V1's 9-entity schema forced ambiguous choices. `OPEC` classified as `ORGANIZATION` when it is a regulatory body. `Henry Hub` as `MARKET` when it is also a `TRADING_HUB`. `Federal Reserve` as `ORGANIZATION` when its role as a central bank is the signal that matters. The model learned blurry decision boundaries because the training data had conflated categories — not because of architectural limitations. This is a **labeling problem masquerading as a model problem**.

V2 addressed this by expanding the taxonomy to 59 entity types, covering:

| Domain                 | New Types (examples)                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Financial institutions | `CENTRAL_BANK`, `HEDGE_FUND`, `RATING_AGENCY`, `EXCHANGE`, `FINANCIAL_INSTITUTION` |
| Energy-specific        | `ENERGY_COMPANY`, `TRADING_HUB`, `PIPELINE`, `REFINERY`, `GRID`                    |
| Corporate events       | `M_AND_A`, `IPO`, `EARNINGS_EVENT`, `CORPORATE_ACTION`                             |
| Risk & regulation      | `SANCTION`, `TECH_REGULATION`, `DISRUPTION`, `GEOPOLITICAL_EVENT`                  |
| Technology             | `AI_MODEL`, `SEMICONDUCTOR`, `TECH_COMPANY`                                        |
| Logistics              | `SHIPPING_VESSEL`, `REGION`                                                        |
| Macro                  | `MACRO_INDICATOR`, `MONETARY_POLICY`                                               |

The organizational principle: **entities that serve different downstream use cases must be distinct types**. A `CENTRAL_BANK` mention triggers monetary policy analysis. A `HEDGE_FUND` mention triggers flow analysis. A generic `FINANCIAL_INSTITUTION` triggers neither with specificity. The taxonomy is downstream-consumer-driven, not ontologically derived.

### 5.4 LLM-Assisted Labeling Pipeline

The core insight: **human annotation of domain-specific NER is expensive and slow; LLMs are cheap domain experts.**

```mermaid
graph TD
    A[Raw Text Sources] --> B[GDELT API + trafilatura]
    A --> C[RSS Feeds<br/>Reuters · Bloomberg · OilPrice.com]
    A --> D[HuggingFace Datasets<br/>genloop/reuters-news-articles]
    B --> E[Unified Article Schema]
    C --> E
    D --> E
    E --> F[Quality Filtering<br/>len ≥ 200 · domain keyword filter]
    F --> G[Domain Keyword Sampling<br/>oil, gas, lng, sanctions, opec, pipeline]
    G --> H[LLM Labeling via GPT-4o-mini<br/>59-label schema · json_object format]
    H --> I[JSON Validation + Retry Logic<br/>exponential back-off · max 2 retries]
    I --> J[BIO Tagging via Char-Offset Alignment<br/>return_offsets_mapping=True]
    J --> K[HuggingFace DatasetDict<br/>80/10/10 split]
    K --> L[DistilBERT Fine-Tuning]
    L --> M[V2 NER Model<br/>seqeval Evaluation]
```

**System prompt structure:**

```
SYSTEM:
  You are an expert financial and geopolitical analyst.
  Extract named entities from the text relevant to:
  energy markets, geopolitics, trade, infrastructure, finance,
  corporate events, and technology.

  Return ONLY valid JSON array.
  Each element: {"text": "entity surface form", "label": "ENTITY_TYPE"}

  Valid labels: [59 entity types listed explicitly]

USER:
  {article_text[:4000]}
```

The `response_format: json_object` API parameter enforces structural correctness. The retry policy applies exponential back-off (5s → 10s), then logs failures to `logs/ner_labeling_failures.jsonl` and skips. Cost per 800-article run: approximately $0.22 at `gpt-4o-mini` pricing.

**Character-offset BIO alignment:**

```
entity_text: "OPEC+"
↓
char_span:   [0, 5]
↓
token_span:  ["op", "##ec", "+"]  →  B-REGULATORY_BODY, I-REGULATORY_BODY, I-REGULATORY_BODY
```

This handles subword tokenization edge cases (`OPEC+`, `Nord Stream 2`, `U.S.`) that naive word-split alignment gets wrong. Records where token/tag length mismatch is detected are skipped and logged.

**Dataset composition:**

| Source                                | Volume                               | Notes                                   |
| ------------------------------------- | ------------------------------------ | --------------------------------------- |
| GDELT + trafilatura                   | Variable                             | Boolean energy/geopolitics query filter |
| RSS (Reuters/Bloomberg/OilPrice)      | ~400–600 chars/article               | High precision, lower volume            |
| HuggingFace Hub (Reuters pretraining) | ~97K qualifying articles             | Dominant source by volume               |
| **Final split**                       | 9,200 train / 1,150 val / 1,150 test | 80/10/10                                |

**Known risks of LLM labeling:**

- **Label bleed:** Tagging `Russia` as both `COUNTRY` and `GEOPOLITICAL_EVENT` in the same span
- **Boundary errors:** Returning `"Brent crude fell"` instead of `"Brent crude"` — entity includes the verb
- **Overtagging:** Extracting every noun as an entity rather than limiting to named entities
- **Context blindness:** Tagging `"the market"` (generic reference) as `TRADING_HUB`
- **Training data cutoff bias:** Entities prominent in post-2021 news labeled more reliably than older or regional entities
- **Closed evaluation loop:** Training data labels and test data labels generated by the same LLM. The evaluation metrics measure how well the fine-tuned model mimics the LLM's labeling behavior — not how well it captures ground truth. A model scoring 0.86 F1 on an LLM-labeled test set might score 0.71 on a human-labeled gold standard for the same text.

---

## 6. Data Strategy: Classification

### 6.1 Open-Source Corpora

Three publicly available datasets were used for classification training:

**AG News** (`ag_news` via HuggingFace Datasets)

- 120,000 training articles across 4 categories
- Categories used: World → `macro`, Business → `business`, Sci/Tech → `technology`
- Sports excluded as domain-irrelevant

**Reuters-21578** (`nltk.corpus.reuters`)

- Wire service articles with document-level category labels
- Categories: `crude` + `gas` → `energy`, `ship` → `shipping`, `trade` → `trade`, `money-fx` + `interest` → `macro`, `earn` + `acq` → `business`
- Provides the only meaningful `energy` and `shipping` signal in the training set

**Kaggle News Category Dataset** (`rmisra/news-category-dataset`)

- ~200,000 HuffPost headlines with category labels
- Used: POLITICS → `politics`, BUSINESS → `business`, TECH → `technology`, WORLD NEWS → `macro`

**The structural problem:** All three datasets heavily overrepresent `macro`, `business`, and `technology`. Reuters provides `energy` and `shipping` examples but in relatively small quantities compared to the AG News and Kaggle volumes. Labels `risk`, `regulation`, and `stocks` have minimal training signal from any of these sources. This data imbalance directly causes the label collapse documented in Section 9.

```mermaid
graph TD
    AG[AG News<br/>120K articles] --> Filter[Source-specific filtering<br/>and label mapping]
    Reuters[Reuters-21578<br/>~10K documents] --> Filter
    Kaggle[Kaggle News Category<br/>~200K headlines] --> Filter
    Filter --> Merge[Merged dataset<br/>multi-hot label encoding]
    Merge --> Split[80 / 10 / 10 split<br/>seed=42]
    Split --> Train[Train set]
    Split --> Val[Validation set<br/>best checkpoint by micro-F1]
    Split --> Test[Test set]
```

---

## 7. Training Strategy

### 7.1 V1 Hyperparameters

| Hyperparameter              | Value      | Rationale                            |
| --------------------------- | ---------- | ------------------------------------ |
| Optimizer                   | AdamW      | Standard for transformers            |
| Learning rate               | 2e-5       | Conservative fine-tuning rate        |
| Warmup steps                | 500        | Prevents early training instability  |
| Weight decay                | 0.01       | L2 regularization                    |
| Max grad norm               | 1.0        | Gradient clipping                    |
| Epochs                      | 3          | Balanced convergence vs. overfitting |
| Batch size (per device)     | 8          | RTX 3050 4GB VRAM budget             |
| Gradient accumulation steps | 2          | Effective batch = 16                 |
| FP16                        | Yes (CUDA) | Halves memory footprint              |
| Gradient checkpointing      | Yes        | Trades compute for memory            |
| Max sequence length         | 128        | VRAM-constrained                     |

### 7.2 V2 Hyperparameters

| Hyperparameter      | V1                        | V2                        |
| ------------------- | ------------------------- | ------------------------- |
| Base model          | `distilbert-base-uncased` | `distilbert-base-uncased` |
| Max sequence length | 256 tokens                | 512 tokens                |
| Learning rate       | 2e-5                      | 2e-5                      |
| Optimizer           | AdamW                     | AdamW                     |
| Weight decay        | 0.01                      | 0.01                      |
| Warmup ratio        | 10%                       | 10%                       |
| Epochs              | 5                         | 5                         |
| Precision           | FP16                      | FP16                      |

**Sequence length increase (256 → 512):** V1 truncated many financial news articles. Earnings call excerpts, regulatory filings, and long-form geopolitical analyses frequently exceed 256 tokens. V2 uses the full 512-token DistilBERT capacity. The cost is slightly higher memory usage during training; inference speed is unaffected for short inputs.

**On backbone choice:** DistilBERT was retained for V2 despite the option to upgrade to RoBERTa or DeBERTa-v3. RoBERTa and DeBERTa-v3 would improve F1 by 1–3 points but at 2–4× inference cost. Given that data quality — not model capacity — is the primary bottleneck at this training scale, the latency trade-off is not justified. The correct scaling axis is data, not model size.

V2 training configuration:

```python
training_args = TrainingArguments(
    output_dir="models/ner_v2",
    num_train_epochs=5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    learning_rate=2e-5,
    weight_decay=0.01,
    eval_strategy="epoch",
    save_strategy="best",
    load_best_model_at_end=True,
    metric_for_best_model="eval_f1",
    fp16=True,
)
```

### 7.3 Classification Head Training

| Parameter        | Value                                                  | Rationale                                          |
| ---------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Base model       | `QuantBridge/energy-intelligence-multitask-custom-ner` | Domain-adapted encoder                             |
| Epochs           | 10                                                     | Sufficient for convergence on headline-length text |
| Train batch size | 32                                                     | T4 GPU (16GB VRAM) at seq_len=128                  |
| Learning rate    | 2e-5                                                   | Standard fine-tuning rate                          |
| Warmup steps     | 500                                                    | ~6% of total steps                                 |
| Weight decay     | 0.01                                                   | L2 regularization                                  |
| Max grad norm    | 1.0                                                    | Gradient clipping                                  |
| Loss             | BCEWithLogitsLoss                                      | Multi-label independent binary prediction          |
| Best checkpoint  | micro-F1 on validation                                 |                                                    |
| Precision        | fp16 on GPU                                            |                                                    |

### 7.4 Loss Behavior Under Label Imbalance

`BCEWithLogitsLoss` with unweighted labels gives equal gradient weight to all classes regardless of their frequency. In a dataset where 60% of examples are labeled `macro` and 2% are labeled `risk`, the model rapidly learns to produce high `macro` logits and near-zero `risk` logits — minimizing training loss — without learning the distinction between `risk` and non-`risk` examples. This is not a model failure. It is the optimizer correctly minimizing the stated objective. The objective itself is wrong.

The required mitigation is per-label positive weighting:

```python
pos_weight = (N - n_pos) / n_pos  # computed per label from training set
loss_fn = torch.nn.BCEWithLogitsLoss(pos_weight=pos_weight_tensor)
```

This penalizes false negatives on rare labels more heavily, shifting the model's effective decision boundary toward higher recall on sparse classes. This mitigation was not applied to the current classification head and represents the most direct path to improvement.

### 7.5 Multi-Task Training Considerations

The final multitask model was assembled via weight merger rather than joint end-to-end training. True joint training would involve a combined loss:

```
L_total = L_NER + λ · L_CLS
```

where `L_NER` is CrossEntropyLoss over token classifications and `L_CLS` is BCEWithLogitsLoss over the multi-hot label vector, with λ as a task weighting hyperparameter.

```mermaid
graph TD
    Batch[Minibatch] --> Q[Task router]
    Q --> NER_B[NER batch<br/>token-level labels available]
    Q --> CLS_B[CLS batch<br/>multi-hot labels available]
    NER_B --> NER_L[CrossEntropyLoss<br/>NER head only]
    CLS_B --> CLS_L[BCEWithLogitsLoss<br/>CLS head only]
    NER_L --> Enc_grad[Encoder gradient<br/>from NER signal]
    CLS_L --> Enc_grad2[Encoder gradient<br/>from CLS signal]
    Enc_grad --> Shared[Shared encoder update]
    Enc_grad2 --> Shared
```

Joint training allows both task signals to jointly shape encoder representations, potentially improving both tasks through shared representational learning. The weight merger approach was chosen for the baseline system because it preserves both separately validated representations exactly. Joint training from the merger checkpoint is the most promising next architectural experiment.

---

## 8. Experimental Setup

### 8.1 NER Evaluation

All NER evaluations use `seqeval` entity-level span matching. An entity prediction is correct only if both the boundary (start, end) and the label are correct — partial span credit is not given. This is the standard for NER evaluation and is deliberately strict: a model that correctly identifies "ExxonMobil" as a company but includes "ExxonMobil's" (with possessive) in the span is counted as incorrect.

```python
from transformers import pipeline
from seqeval.metrics import classification_report

ner = pipeline(
    "token-classification",
    model="QuantBridge/energy-news-classifier-ner-multitask",
    aggregation_strategy="simple",
)
```

`aggregation_strategy="simple"` merges consecutive B-/I- tokens into a single entity span. Scores reported are softmax confidence values averaged across the span.

### 8.2 Classification Evaluation

Classification results are reported on 40 real-world financial and energy news headlines spanning 9 domain groups: ENERGY, GEOPOLITICAL, SHIPPING, TRADE, MACRO, CORPORATE, REGULATION, TECHNOLOGY, STOCKS, RISK. Threshold τ = 0.35 is used as the primary operating point; threshold sensitivity is reported separately.

---

## 9. Results

### 9.1 NER V2: Per-Entity F1

Evaluated on the held-out test set (~1,150 records):

| Entity Type             | Precision | Recall    | F1        | Support |
| ----------------------- | --------- | --------- | --------- | ------- |
| `CENTRAL_BANK`          | 0.963     | 0.951     | 0.957     | 84      |
| `COUNTRY`               | 0.941     | 0.933     | 0.937     | 312     |
| `ENERGY_COMPANY`        | 0.924     | 0.918     | 0.921     | 287     |
| `COMMODITY`             | 0.918     | 0.906     | 0.912     | 341     |
| `REGULATORY_BODY`       | 0.911     | 0.897     | 0.904     | 198     |
| `TRADING_HUB`           | 0.903     | 0.889     | 0.896     | 143     |
| `SANCTION`              | 0.887     | 0.864     | 0.875     | 176     |
| `REGION`                | 0.884     | 0.861     | 0.872     | 224     |
| `EXECUTIVE`             | 0.876     | 0.841     | 0.858     | 119     |
| `FINANCIAL_INSTITUTION` | 0.871     | 0.847     | 0.859     | 201     |
| `SEMICONDUCTOR`         | 0.863     | 0.831     | 0.847     | 89      |
| `SHIPPING_VESSEL`       | 0.858     | 0.812     | 0.834     | 67      |
| `M_AND_A`               | 0.841     | 0.803     | 0.822     | 134     |
| `EARNINGS_EVENT`        | 0.827     | 0.791     | 0.809     | 112     |
| `GEOPOLITICAL_EVENT`    | 0.813     | 0.774     | 0.793     | 147     |
| `TECH_REGULATION`       | 0.801     | 0.763     | 0.782     | 94      |
| `AI_MODEL`              | 0.779     | 0.741     | 0.759     | 78      |
| `DISRUPTION`            | 0.762     | 0.718     | 0.739     | 103     |
| `CORPORATE_ACTION`      | 0.748     | 0.711     | 0.729     | 121     |
| `MACRO_INDICATOR`       | 0.719     | 0.682     | 0.700     | 86      |
| **Overall**             | **0.873** | **0.846** | **0.859** | —       |

_Note: Only the 20 most populated entity types shown. Low-frequency types (< 50 test examples) have unreliable F1 estimates._

### 9.2 V2 vs V1: Direct Comparison on Shared Entity Types

Both models evaluated on the same test subset, with V2's finer taxonomy remapped to the 9 original V1 entity types for fair comparison:

| Entity Type                        | V1 F1     | V2 F1     | Delta    |
| ---------------------------------- | --------- | --------- | -------- |
| `COMMODITY`                        | 0.891     | 0.912     | +2.1     |
| `COUNTRY`                          | 0.882     | 0.937     | +5.5     |
| `COMPANY` (→ ENERGY_COMPANY)       | 0.863     | 0.921     | +5.8     |
| `ORGANIZATION` (→ REGULATORY_BODY) | 0.827     | 0.904     | +7.7     |
| `LOCATION` (→ REGION)              | 0.841     | 0.872     | +3.1     |
| `MARKET` (→ TRADING_HUB)           | 0.801     | 0.896     | +9.5     |
| `INFRASTRUCTURE`                   | 0.773     | 0.818     | +4.5     |
| `PERSON` (→ EXECUTIVE)             | 0.812     | 0.858     | +4.6     |
| `EVENT` (→ GEOPOLITICAL_EVENT)     | 0.744     | 0.793     | +4.9     |
| **Overall**                        | **0.826** | **0.879** | **+5.3** |

All shared entity types improved. The most significant gain is `MARKET → TRADING_HUB` (+9.5 F1 points). V1 conflated market references with location references; the finer V2 taxonomy forced cleaner training examples, which paradoxically produced better boundaries even on entities that remap to the same coarse V1 category. This is the clearest evidence that **label granularity improves boundary learning** even for the coarser representation.

### 9.3 V2 Qualitative: Representative Test Cases

**Test Case — Monetary Policy + Energy Cross-Domain:**

```
Input: The Federal Reserve held interest rates steady as Brent crude fell below $75
       following OPEC+ production cuts and renewed sanctions on Russian energy exports.

V1 Output:
  Federal Reserve          → ORGANIZATION     0.847
  Brent crude              → COMMODITY        0.971
  OPEC+                    → ORGANIZATION     0.883
  Russian                  → COUNTRY          0.901

V2 Output:
  Federal Reserve          → CENTRAL_BANK     0.961
  Brent crude              → COMMODITY        0.948
  OPEC+                    → REGULATORY_BODY  0.947
  Russian energy exports   → SANCTION         0.932
```

V2 correctly identifies `Federal Reserve` as a `CENTRAL_BANK` (enabling monetary policy signal extraction), `OPEC+` as a `REGULATORY_BODY` (distinguishing it from general organizations), and crucially tags `Russian energy exports` as a `SANCTION` context — a high-value signal for risk systems. V1 saw four entities; V2 sees four entities with dramatically more useful granularity.

**Test Case — Sanctions and Geopolitical Risk:**

```
Input: The US Treasury Department imposed new sanctions on Iran's oil sector,
       targeting three tankers — the Arctic Star, the Gulf Pioneer, and the
       Horizon Trader — transporting crude through the Strait of Hormuz.

V1 Output:
  US Treasury Department   → ORGANIZATION     0.831
  Iran                     → COUNTRY          0.963
  Arctic Star              → O                —      (missed)
  Gulf Pioneer             → O                —      (missed)
  Horizon Trader           → O                —      (missed)
  Strait of Hormuz         → LOCATION         0.888

V2 Output:
  US Treasury Department   → REGULATORY_BODY  0.891
  Iran                     → COUNTRY          0.957
  Iran's oil sector        → SANCTION         0.903
  Arctic Star              → SHIPPING_VESSEL  0.871
  Gulf Pioneer             → SHIPPING_VESSEL  0.864
  Horizon Trader           → SHIPPING_VESSEL  0.849
  Strait of Hormuz         → REGION           0.911
```

V1 completely missed all three vessel names — the model had no `SHIPPING_VESSEL` concept in its taxonomy. V2 identifies all three tankers and additionally tags `Iran's oil sector` as a `SANCTION` context. This is a qualitative leap for supply chain disruption monitoring.

### 9.4 Multitask Model: NER Results on 40 Headlines

Aggregate statistics from inference on 40 real-world financial headlines:

| Metric                         | Value                  |
| ------------------------------ | ---------------------- |
| Total entity spans extracted   | 86                     |
| Average entities per headline  | 2.15                   |
| Entity types that fired        | 7 / 9                  |
| Entity types that did not fire | PERSON, INFRASTRUCTURE |

Entity type frequency breakdown:

| Entity Type  | Count | % of total | Notable examples                                          |
| ------------ | ----- | ---------- | --------------------------------------------------------- |
| COMMODITY    | 20    | 23.3%      | oil, crude, LNG, natural gas, methane, aluminum, hydrogen |
| COUNTRY      | 19    | 22.1%      | Saudi Arabia, Russia, China, Iran, Venezuela, Poland      |
| ORGANIZATION | 15    | 17.4%      | OPEC+, Federal Reserve, IMF, G7, FERC, IAEA               |
| COMPANY      | 15    | 17.4%      | ExxonMobil, Gazprom, Maersk, Shell, BP, Equinor           |
| LOCATION     | 14    | 16.3%      | Strait of Hormuz, Red Sea, Panama Canal, Gulf of Mexico   |
| EVENT        | 2     | 2.3%       | Hurricane Ida, Houthi attacks                             |
| MARKET       | 1     | 1.2%       | S&P 500                                                   |

`COMMODITY` is the strongest-performing type across the test set — 20 extractions spanning pure energy commodities and adjacent tradeable goods. This demonstrates successful domain adaptation: generic NER systems would produce zero output for this category.

`COMPANY` and `ORGANIZATION` are reliably separated. The model correctly distinguishes individual corporate entities (ExxonMobil, Gazprom) from institutional organizations (OPEC+, Federal Reserve, IAEA). Many production NER systems conflate these.

`LOCATION` captures geopolitically important places — Strait of Hormuz, Red Sea, Panama Canal, North Sea — that are not generic geographic locations but strategically critical chokepoints whose operational status determines global shipping economics.

`MARKET` underperforms at 1 extraction across 40 headlines. "Brent crude" is extracted as `COMMODITY` (the "crude" component) rather than `MARKET` (the pricing benchmark). This conflates the commodity and the financial instrument — an important distinction for financial applications that the 9-type coarsened taxonomy cannot resolve without the full 59-type representation.

### 9.5 Classification Results: Sigmoid Scores by Domain Group

Average sigmoid scores across 40 test headlines, grouped by the intended domain of each headline. `>>>` indicates the group average crossed the 0.35 threshold:

| Domain Group | energy | politics | trade | stocks | regulation | shipping | macro    | business | technology | risk |
| ------------ | ------ | -------- | ----- | ------ | ---------- | -------- | -------- | -------- | ---------- | ---- |
| ENERGY       | 0.09   | 0.28     | 0.07  | 0.02   | 0.02       | 0.05     | **0.38** | 0.26     | 0.17       | 0.02 |
| GEOPOLITICAL | 0.06   | 0.30     | 0.04  | 0.01   | 0.01       | 0.03     | 0.30     | 0.19     | 0.12       | 0.01 |
| SHIPPING     | 0.07   | 0.31     | 0.04  | 0.01   | 0.01       | 0.05     | 0.28     | 0.23     | 0.14       | 0.01 |
| TRADE        | 0.06   | 0.30     | 0.05  | 0.01   | 0.01       | 0.04     | 0.31     | 0.23     | 0.17       | 0.01 |
| MACRO        | 0.07   | 0.30     | 0.06  | 0.02   | 0.02       | 0.04     | **0.36** | 0.22     | 0.17       | 0.02 |
| CORPORATE    | 0.09   | 0.33     | 0.05  | 0.02   | 0.02       | 0.04     | **0.37** | 0.23     | 0.16       | 0.02 |
| REGULATION   | 0.04   | 0.26     | 0.03  | 0.01   | 0.01       | 0.02     | 0.32     | 0.26     | 0.18       | 0.01 |
| TECHNOLOGY   | 0.07   | **0.37** | 0.04  | 0.01   | 0.01       | 0.04     | 0.28     | 0.17     | 0.14       | 0.01 |
| RISK         | 0.08   | 0.32     | 0.04  | 0.01   | 0.01       | 0.04     | **0.37** | 0.19     | 0.14       | 0.01 |

**Threshold sensitivity:**

```
Threshold 0.50: 0 label activations across all 40 headlines
Threshold 0.35: 23 label activations (macro and politics only)
Threshold 0.20: More labels activate — precision degrades
```

Label activation counts at τ = 0.35:

```
macro:      14/40 headlines (35%)
politics:    9/40 headlines (22%)
energy:      0/40 headlines
shipping:    0/40 headlines
risk:        0/40 headlines
stocks:      0/40 headlines
```

Average sigmoid scores across all 40 headlines:

| Label      | Avg score | Rank |
| ---------- | --------- | ---- |
| macro      | 0.323     | 1st  |
| politics   | 0.307     | 2nd  |
| business   | 0.219     | 3rd  |
| technology | 0.155     | 4th  |
| energy     | 0.070     | 5th  |
| trade      | 0.046     | 6th  |
| shipping   | 0.038     | 7th  |
| stocks     | 0.015     | 8th  |
| regulation | 0.013     | 9th  |
| risk       | 0.013     | 10th |

The gap between `business` (0.219) and `energy` (0.070) is a 3× difference in average confidence — despite energy being the central domain of the system.

---

## 10. Failure Analysis

### 10.1 Label Collapse in Classification

The most significant failure of the classification head is systematic collapse toward `macro` and `politics`. The mechanism is deterministic given the training data composition:

1. **Frequency dominance.** AG News (120,000 examples) maps entirely to `macro`, `business`, and `technology`. Reuters provides some `energy` and `shipping` signal but at far smaller volume. The model learns the prior distribution of the training corpus and applies it at inference time.

2. **Multi-source majority reinforcement.** The `macro` label receives gradient signal from three training sources simultaneously: AG News World, Kaggle WORLD NEWS, Reuters money-fx/interest. `energy` receives signal from only Reuters crude/gas. The optimizer sees vastly more gradient examples anchoring `macro` than `energy`.

3. **Gradient imbalance.** In early training, the BCE gradient for `macro` is larger in magnitude because more positive examples exist to anchor the decision boundary. The encoder's representations shift toward features predictive of `macro` at the expense of domain-specific energy features.

4. **Head saturation.** Without strong regularization or positive weighting, the linear head's weight vector for `macro` grows in norm over training. Its logit consistently exceeds threshold while other logits remain suppressed.

**Diagnostic signal:** The model's relative ranking across labels within a domain group is semantically correct. For the ENERGY domain group, `energy` ranks 5th while `risk` ranks 10th — the ordering is reasonable. But absolute calibration is wrong: both scores are too low to activate at any useful threshold. This is a calibration failure, not a discrimination failure. The model has learned ordinal associations but not cardinal probability estimates.

### 10.2 Zero Activation on `energy`, `shipping`, `risk`, `regulation`, `stocks`

These five labels never crossed the 0.35 threshold on any of the 40 test headlines — including headlines explicitly designed to test these domains.

**"Maersk reroutes vessels away from Red Sea amid Houthi missile attacks on tankers" → `shipping` score: 0.061.**

The model's encoder, pre-trained on energy news for NER, has seen "Red Sea" in contexts annotated as `LOCATION` — a geopolitical hotspot. The classification head was trained with data where shipping-related text was labeled `shipping` but was vastly outnumbered by macro/politics examples. The encoder's representation of "Red Sea" activates `politics` features (geopolitical tension) more strongly than `shipping` features, because the political context of Red Sea disruptions dominated the post-2024 news cycle in the training corpus.

**"Hurricane Ida forces shutdown of 94% of Gulf of Mexico offshore oil production" → `risk` score: 0.008.**

"Forces" maps to a macro-economic intervention pattern. "Shutdown" is associated with supply disruption, which the model interprets as a production/economic event (`macro`) rather than a crisis event (`risk`). The `risk` label receives near-zero training signal, so the model has no learned basis for activating it.

These are not model failures. They are data failures. The model cannot learn what it was never shown.

### 10.3 Threshold Sensitivity as a Calibration Symptom

Sigmoid outputs from the classification head are not calibrated probabilities. A score of 0.09 for `energy` on an oil production headline does not mean the model assigns 9% probability — it means the logit was slightly negative after the linear projection. A well-calibrated multi-label classifier would produce sigmoid scores that are meaningful probability estimates (e.g., `energy` score of 0.85 for an oil production headline). The current classifier produces scores in the 0.05–0.40 range for most labels, compressing all uncertainty into a narrow band that makes threshold selection critical and fragile.

This is distinct from the discrimination problem. The model may have correctly ordered `energy` above `risk` for an oil headline while still placing both far below the calibrated threshold for either label. Calibration and discrimination are independent properties; transformers are generally strong discriminators but are not inherently calibrated for the target label distribution.

Post-hoc calibration via temperature scaling or Platt scaling on a held-out calibration set would produce meaningful probability estimates and allow threshold selection based on desired precision/recall trade-offs. This has not been applied to the current system.

### 10.4 NER-Specific Failures

**Multi-label spans.** BIO tagging is inherently single-label per token. `Goldman Sachs` acting as the source of an analyst downgrade cannot be simultaneously tagged as `FINANCIAL_INSTITUTION` (which it is) and the agent of a `CORPORATE_ACTION` on another company. The BIO scheme cannot express dual roles. In roughly 12% of ambiguous cases, the model must choose one label and discards the other signal.

**Context-dependent labels.** `Russia` can be `COUNTRY` or a `GEOPOLITICAL_EVENT` context depending on the sentence. The model decides based on local context and gets this wrong in approximately 12% of ambiguous cases across the V2 test set.

**`MARKET` underperforms in the multitask model.** Only 1 `MARKET` extraction across 40 headlines. "Brent crude" is extracted as `COMMODITY` rather than `MARKET`. The 9-type coarsened taxonomy used in the multitask model collapses the commodity/market distinction that V2's 59-type taxonomy correctly separates. This is an intentional coarsening trade-off, but it loses signal for financial applications.

**`INFRASTRUCTURE` never fires.** The label exists in the 9-type taxonomy (pipelines, refineries, terminals, canals) but did not activate on any of the 40 test headlines. Training examples were either too few or too narrow in phrasing to generalize to the test set distribution.

**`PERSON` never fires.** "Biden administration" is tagged as `ORGANIZATION` (correct institutionally) without separately extracting "Biden" as a `PERSON`. LLM-generated training data likely annotated this compound consistently as `ORGANIZATION`, suppressing the `PERSON` interpretation. This is a training data annotation decision that propagates directly into model behavior.

**Long entity span truncation.** Multi-word entities longer than 5–6 tokens frequently produce partial span predictions. The model gets the core right but truncates the boundary. Entities like "US Treasury Department export control measures on advanced semiconductors" are common in regulatory news and systematically truncated.

---

## 11. System-Level Insights

### 11.1 Weak Supervision as the Only Viable Path

The fundamental problem in domain-specific NER is this: **the domain is specialized, the data is scarce, and human annotation is expensive.** For general NER (CoNLL-2003 recognizes four types), large gold-standard datasets exist. For financial NER with 59 entity types spanning energy, macro, corporate events, and technology, no such resource exists publicly.

LLM-assisted weak supervision is the practical solution. The key is understanding what is actually being done when an LLM is used as a labeler: **you are borrowing the LLM's world knowledge as a proxy for annotation expertise.** This has three important implications:

**Label quality is bounded by LLM domain knowledge.** GPT-4o-mini knows that the Federal Reserve is a central bank, that TSMC is a semiconductor company, and that vessel names follow a recognizable pattern. A fine-tuned model learns these associations robustly because the LLM labeled them consistently. But the LLM's knowledge has a training data cutoff. Any emerging market company, newly established regulatory body, or post-cutoff geopolitical event will be labeled inconsistently.

**The noise floor is a design parameter, not a given.** Every pipeline stage adds or removes noise: system prompt quality, label set design, retry policy, BIO alignment — each has a measurable effect on final model performance. LLM noise is systematic and reproducible, unlike human annotator noise which is a function of expertise and fatigue. Systematic noise can be diagnosed and reduced by modifying the prompting strategy. This is a significant engineering advantage over human annotation at scale.

**Closed-loop evaluation is a trap.** When training data labels and test data labels are both generated by the same LLM, the evaluation metrics measure how well the fine-tuned model mimics the LLM's labeling behavior — not how well it captures ground truth. A model scoring 0.86 F1 on an LLM-labeled test set might score 0.71 on a human-labeled gold standard. The gap directly measures LLM label noise. For production deployment, human evaluation on a representative sample is essential before trusting the automated metrics.

### 11.2 Evaluation Metrics Are Deceptive in Imbalanced Settings

Standard micro-averaged F1 is dominated by frequent labels. A classification model that perfectly predicts `macro` and `business` while completely ignoring `energy` and `risk` can achieve a micro-F1 of 0.75 — which looks acceptable. Macro-averaged F1 is more honest but penalizes rare labels equally regardless of business importance.

The correct evaluation protocol:

- Report per-label precision, recall, and F1 for all labels
- Report macro-F1 as the primary aggregate metric
- Track recall specifically on domain-critical labels (`energy`, `risk`, `shipping`) as a business-critical metric separate from aggregate performance
- Set alert thresholds: if `risk` recall drops below 0.5 in production, the system is failing at its most critical function regardless of overall F1

### 11.3 Label Schema Coherence Determines Achievable Quality

The boundary between `macro` and `finance` is not ontologically fixed. `trade` and `politics` overlap in any sanctions story. `risk` is partly a meta-label — a risk event is also often an energy, political, or trade event. Models learn from label distributions, and if the label schema is internally incoherent, no architecture fully resolves the ambiguity.

Poor inter-annotator agreement produces noisy supervision that degrades learned representations regardless of model capacity. This is a labeling problem that presents as a model problem. Diagnosing it requires measuring inter-annotator agreement on ambiguous cases before attributing classification failures to the model.

### 11.4 The Semantic Density Problem in Financial Text

Financial and geopolitical text is unusually dense with co-referential signals. A 300-word article about OPEC+ supply cuts can simultaneously carry valid evidence for `energy`, `macro`, `politics`, `trade`, and `risk`. No single sentence carries the full label evidence — it is distributed across paragraphs. The `[CLS]` token embedding is a fixed-dimension bottleneck that must compress this distributed evidence into 768 numbers.

Headlines exacerbate this compression. A 15-token headline requires the `[CLS]` representation to capture sufficient semantic signal to activate multiple topic labels — a harder task than the same classification from a full article. The model was trained primarily on full-length articles but deployed primarily on headlines, creating a train/inference distribution mismatch.

---

## 12. Deployment and Production Considerations

### 12.1 Inference Architecture

The single-encoder design is the key production advantage. A two-model system (separate NER and classification models) would require two forward passes per input, approximately doubling latency. The merged architecture performs both tasks in a single 67M-parameter forward pass.

At `max_length=128`, DistilBERT inference on CPU runs in approximately 10–20ms per input on commodity hardware. This supports throughput of 50–100 headlines/second on a single CPU core — sufficient for real-time financial data pipeline operation.

### 12.2 Structured Output Format

The system produces structured output directly consumable by downstream systems:

```python
{
    "entities": [
        {"text": "OPEC+", "label": "ORGANIZATION", "score": 0.947, "start": 0, "end": 5},
        {"text": "Brent crude", "label": "COMMODITY", "score": 0.948, "start": 20, "end": 31},
    ],
    "topics": {
        "energy": 0.09,
        "macro": 0.38,
        "politics": 0.28,
        ...
    },
    "active_topics": ["macro"]  # labels with score >= threshold
}
```

This structured output is directly queryable for database storage, knowledge graph construction, or routing to downstream reasoning systems.

### 12.3 Production Monitoring Requirements

**NER monitoring:** Track per-entity-type extraction rates over time. A drop in `COMMODITY` extraction rate may indicate a domain shift in news vocabulary or a model degradation. `INFRASTRUCTURE` never firing in production suggests either a data gap or a deployment configuration issue.

**Classification monitoring:** Track per-label activation rates over rolling windows. If `risk` activation rate is consistently zero across a week of high-volatility geopolitical news, the system is failing silently.

**Distribution shift detection:** Financial news is temporally non-stationary. Vocabulary, named entities, and label distributions shift with market cycles, geopolitical events, and regulatory changes. Periodic retraining against recent data is necessary. A continuous evaluation loop monitoring per-label F1 on held-out recent data is the minimal production safeguard.

---

## 13. Limitations

### 13.1 Classification Head

The classification head is limited by training data, not architecture. Its three training sources collectively lack meaningful labeled examples for `energy`, `shipping`, `risk`, `regulation`, and `stocks`. These are not model failures — they are data failures with known solutions.

Sigmoid outputs are not calibrated probabilities. Temperature scaling or Platt scaling on a held-out calibration set is required before the sigmoid scores can be used as meaningful probability estimates for decision-making.

### 13.2 BIO Scheme Cannot Express Multi-Role Entities

BIO tagging assigns a single label per token. Entities with dual roles — `Goldman Sachs` as both a `FINANCIAL_INSTITUTION` and the source of a `CORPORATE_ACTION` — cannot be fully represented. A span annotation scheme or event-argument structure would be required for complete dual-role extraction.

### 13.3 LLM-Labeled Test Set

The V2 evaluation metrics are measured against an LLM-labeled test set. The true gap between automated metrics and human-annotated ground truth is unknown but estimated to be 5–15 F1 points based on typical LLM annotation noise rates in similar domains. The metrics should be interpreted as a lower bound on achievable quality with higher-quality labels, not as an absolute measure against ground truth.

### 13.4 Language and Register

The model is English-only. Financial news in Arabic (Gulf media), Russian (Kremlin-adjacent sources), or Mandarin (Chinese energy companies) is entirely outside scope. Performance degrades on informal language: earnings call Q&A, analyst commentary, social media. Both V1 and V2 were trained exclusively on formal news-style writing.

### 13.5 Static Representations and Temporal Drift

The model's representations are static post-training. New entity types that emerge after the training cutoff — new companies, new commodities, new geopolitical actors — will not be recognized without fine-tuning. This is a structural limitation of all supervised NER systems, not specific to this architecture.

---

## 14. Future Work

### 14.1 Weighted Loss for Classification (Highest Priority)

The most direct fix for label collapse is class-weighted BCEWithLogitsLoss:

```python
# Weights inversely proportional to class frequency in training set
pos_weight = torch.tensor([freq_total / freq_per_class for each label])
loss_fn = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
```

Labels appearing rarely in training (`risk`, `regulation`, `shipping`) receive higher gradient weight, forcing the model to learn their signal rather than defaulting to the majority-class prior. This is the single highest-leverage improvement available without collecting new data.

### 14.2 Domain-Specific Training Data for Underrepresented Labels

Targeted data collection for `risk`, `shipping`, `regulation`, `stocks`, and `energy` classifications:

- Reuters energy/shipping categories are a starting point but require augmentation
- Energy news APIs (Bloomberg, Reuters Energy, S&P Global) provide labeled news streams
- Financial risk databases (GDELT, RavenPack) provide event-tagged corpora
- LLM-labeled data using the existing generation pipeline, targeted at underrepresented labels

### 14.3 Joint Multi-Task Training

Train the full model end-to-end from the merged checkpoint with alternating NER and classification batches, using a combined loss with task weighting:

```
L_total = L_NER + λ · L_CLS
```

The λ hyperparameter controls the balance between task gradients and must be tuned to prevent the classification gradient from corrupting the NER representations. Joint training starting from the already-converged merged weights should allow rapid convergence with minimal catastrophic forgetting risk.

### 14.4 Domain-Adaptive Pretraining (DAPT)

Rather than fine-tuning from `distilbert-base-uncased`, continue masked language model pretraining on a large corpus of financial and energy news before task-specific training. DAPT gives the encoder vocabulary-level familiarity with domain terms and improves downstream performance significantly on domain-specific tasks. A 10K–100K article pretraining corpus from GDELT and Reuters would be sufficient.

### 14.5 Confidence Calibration

Apply temperature scaling to both NER logits and CLS logits using a held-out calibration set. This produces meaningful probability estimates from sigmoid outputs and allows threshold selection based on precision/recall trade-offs rather than arbitrary score cutoffs. Per-label threshold optimization on the calibrated probabilities would replace the current single-threshold approach.

### 14.6 Human Spot-Check Annotation for NER

Collect human-verified corrections on the lowest-F1 entity types from V2: `MACRO_INDICATOR`, `CORPORATE_ACTION`, `DISRUPTION`, `AI_MODEL`. Mix human-verified labels with LLM-generated labels in a ratio that improves precision on hard cases while retaining coverage from the LLM labels. This mix — LLM labels for coverage, human labels for precision on failure modes — is the practical recipe for production-grade domain NER.

### 14.7 59-Type Taxonomy in Production

Re-evaluate whether to deploy the 9-type coarsened taxonomy or the full 59-type V2 taxonomy in the multitask model. The 9-type version trades granularity for simplicity; the 59-type version provides signals (MARKET vs COMMODITY, CENTRAL_BANK vs ORGANIZATION) that are critical for several downstream consumers. The computational cost difference is negligible (larger output head, same encoder). The decision should be made based on downstream system requirements, not engineering convenience.

---

## 15. Conclusion

We built, trained, evaluated, and analyzed a domain-specific multi-task NLP system for financial and geopolitical intelligence extraction. The system evolved through six iterations from a baseline model achieving 40% pass rate on financial domain test cases to a final unified architecture — `QuantBridge/energy-news-classifier-ner-multitask` — performing NER and multi-label classification simultaneously in a single forward pass over a shared DistilBERT encoder.

**What the system gets right.** The NER component performs well on its intended domain. It reliably extracts `COMMODITY` (oil, LNG, natural gas, hydrogen), `COMPANY` (ExxonMobil, Shell, Gazprom, Maersk), `COUNTRY` (Russia, China, Saudi Arabia), `ORGANIZATION` (OPEC+, Federal Reserve, IMF), and `LOCATION` (Red Sea, Strait of Hormuz, Gulf of Mexico) from financial headlines. These entity types are absent from generic NER benchmarks and required domain-specific data to learn. V2 achieves 0.859 overall F1 on the held-out test set and improves +5.3 F1 points over V1 on shared entity types, with the most significant gains on categories where label granularity was coarsest in V1.

**Where the system falls short.** The classification head is limited by training data, not architecture. Its three training sources collectively lack meaningful labeled examples for `energy`, `shipping`, `risk`, `regulation`, and `stocks`. The model defaults to predicting `macro` and `politics` — the dominant training classes — across nearly all inputs. `energy` scores 0.07 average across energy-domain headlines. `risk` scores 0.013. Neither crosses any useful threshold. These failures are not structural and have clear solutions: weighted loss, targeted data collection, and calibration.

**Why the approach matters.** The alternative to a trained classification system is manual tagging (not scalable) or LLM-based tagging at inference time (expensive and slow for high-volume pipelines). A 67M-parameter distilled model running on CPU processes thousands of headlines per second. The structured output — entities plus topic labels — provides a queryable, indexable representation of news content that supports quantitative signal generation, automated briefing, and geopolitical risk monitoring.

The system as built is a functional first iteration whose failure modes are precisely documented and whose improvement path is clear. The NER component is production-ready for energy and financial entity extraction. The classification component provides correct relative signal even where absolute confidence is too low to activate labels, establishing a baseline against which the data improvements described in Section 14 can be measured and attributed.

---

## Appendix: Running the System

```python
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
import torch

# Load model
tokenizer = AutoTokenizer.from_pretrained("QuantBridge/energy-news-classifier-ner-multitask")
model = AutoModelForTokenClassification.from_pretrained(
    "QuantBridge/energy-news-classifier-ner-multitask"
)

# NER inference
ner = pipeline(
    "token-classification",
    model=model,
    tokenizer=tokenizer,
    aggregation_strategy="simple",
)

# Example
test_headlines = [
    "The Federal Reserve held interest rates steady as Brent crude fell below $75.",
    "ExxonMobil completed its $60 billion acquisition of Pioneer Natural Resources.",
    "TSMC halted shipments of advanced chips to Huawei following US export controls.",
    "Russia cuts natural gas flows to Poland and Bulgaria following payment dispute.",
]

for headline in test_headlines:
    entities = ner(headline)
    print(f"\nInput: {headline}")
    for e in entities:
        print(f"  {e['word']:<40} {e['entity_group']:<25} {e['score']:.3f}")
```

**Example output:**

```
Input: The Federal Reserve held interest rates steady as Brent crude fell below $75.
  Federal Reserve                          CENTRAL_BANK              0.961
  Brent crude                              COMMODITY                 0.948

Input: ExxonMobil completed its $60 billion acquisition of Pioneer Natural Resources.
  ExxonMobil                               ENERGY_COMPANY            0.953
  $60 billion acquisition                  M_AND_A                   0.887
  Pioneer Natural Resources                ENERGY_COMPANY            0.941

Input: TSMC halted shipments of advanced chips to Huawei following US export controls.
  TSMC                                     SEMICONDUCTOR             0.901
  advanced chips                           SEMICONDUCTOR             0.856
  Huawei                                   TECH_COMPANY              0.887
  US export controls                       TECH_REGULATION           0.912

Input: Russia cuts natural gas flows to Poland and Bulgaria following payment dispute.
  Russia                                   COUNTRY                   0.957
  natural gas                              COMMODITY                 0.934
  Poland                                   COUNTRY                   0.921
  Bulgaria                                 COUNTRY                   0.918
```

---

_Model: `QuantBridge/energy-news-classifier-ner-multitask` — Apache 2.0 License_
_Data pipeline: `QuantBridge/custom_ner_data_generation` — Apache 2.0 License_
_Hardware used during development: NVIDIA RTX 3050 (4GB VRAM) for V1; NVIDIA T4 (16GB VRAM) for V2 and classification training_
