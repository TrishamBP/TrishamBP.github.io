---
layout: learning-paper
title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
authors: "Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., Kiela, D."
year: 2020
venue: "NeurIPS 2020"
description: "Introduces RAG — a general-purpose recipe that combines a parametric memory (a pre-trained seq2seq model) with a non-parametric memory (a dense retrieval index over Wikipedia). The retriever pulls relevant passages at inference time; the generator conditions on them to produce grounded, factually accurate answers. RAG is the architectural ancestor of every modern retrieval-augmented LLM pipeline."
highlights:
  - "Dense Passage Retrieval (DPR) encodes both queries and documents into a shared embedding space for fast maximum-inner-product search"
  - "Generator is conditioned on top-k retrieved passages, marginalising over them to produce the final output"
  - "Non-parametric memory can be updated without retraining — a key advantage over pure parametric models"
  - "Outperforms parametric seq2seq models on Open-Domain QA, Jeopardy question generation, and fact verification"
tags: ["RAG", "Retrieval", "Generative Models", "NLP", "Dense Retrieval", "Knowledge-Intensive", "LLM"]
date: 2020-05-22
---
