---
layout: learning-paper
title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
authors: "Devlin, J., Chang, M.-W., Lee, K., Toutanova, K."
year: 2019
venue: "NAACL 2019"
description: "Introduces BERT — a deeply bidirectional pre-training approach for language representations. Unlike prior models that read text left-to-right or as a shallow concatenation of left-to-right and right-to-left passes, BERT pre-trains using masked language modelling and next-sentence prediction, producing contextual embeddings that can be fine-tuned across a wide range of NLP tasks with minimal task-specific architecture changes."
highlights:
  - "Masked Language Modelling (MLM) enables true bidirectional context — the model sees the full sentence when predicting masked tokens"
  - "Next Sentence Prediction (NSP) pre-trains sentence-level relationship understanding"
  - "Fine-tuning with a single additional output layer achieves state-of-the-art on 11 NLP tasks"
  - "BERT-Large sets a new GLUE score of 80.5, outperforming prior work by over 7 points"
tags: ["BERT", "Pre-training", "Bidirectional", "NLP", "Transfer Learning", "Transformers", "Fine-tuning"]
date: 2018-10-11
---
