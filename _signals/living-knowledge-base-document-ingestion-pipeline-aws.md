---
layout: post
title: "The Living Knowledge Base: a production document ingestion pipeline on AWS"
seo_title: "Document Ingestion Pipeline on AWS: Building a Living Knowledge Base"
description: "Build a production document ingestion pipeline on AWS with Step Functions, SQS, SNS, Lambda and dead-letter queues that keeps a knowledge base evolving."
lede: "Documents never stop arriving and not every team gets the biggest context window. This is the production plumbing on AWS (Lambda, Step Functions, SQS, SNS and dead-letter queues) that turns a document stream into a versioned knowledge base for analytics, processing and discovery."
keywords: "document ingestion pipeline on AWS, AWS Step Functions orchestration, SQS dead-letter queue, SNS SQS fan-out, event-driven architecture on AWS, Lambda batch processing, Step Functions Distributed Map, idempotent event processing, evolving knowledge base, small context window LLM pipeline"
highlight: "Living Knowledge Base"
category: "Production Engineering"
meta: "Production Engineering"
date: 2026-11-18
author: Trisham Patil
tags: ["AWS Architecture", "Event-Driven Systems", "Knowledge Engineering", "Production Engineering"]
image: "/assets/blogs/living-knowledge-base-aws/living-knowledge-base-aws-hero.png"
specs:
  - { label: "Pattern", value: "Event-driven", note: "claim-check + outbox" }
  - { label: "Orchestration", value: "Step Functions", note: "Standard parent, Express map" }
  - { label: "Messaging", value: "SNS + SQS", note: "fan-out, DLQ per hop" }
  - { label: "Context", value: "Small models", note: "bounded tokens per call" }
  - { label: "Knowledge", value: "Versioned", note: "append, never overwrite" }
og_type: article
robots: "index, follow"
structured_data: BlogPosting
published: true
---

<!--
  SEO
    Primary keyword:   document ingestion pipeline on AWS
    Secondary:         AWS Step Functions orchestration, SQS dead-letter queue, SNS SQS fan-out,
                       event-driven architecture on AWS, Lambda batch processing,
                       Step Functions Distributed Map, idempotent event processing,
                       evolving knowledge base, small context window LLM pipeline
    Slug:              /signals/living-knowledge-base-document-ingestion-pipeline-aws/
    Meta description:  (152 chars) see `description` above

  Generic production-engineering companion to the D2K2A signal post
  (/signals/document-to-knowledge-to-agents-aws/). No company or client names.
  Body sections are added only when the author asks for them.
  Hero: scripts/living_knowledge_base_hero.py (original artwork).
-->

![Document ingestion pipeline on AWS: documents land in S3 and buffer in SQS with a dead-letter queue, Step Functions splits them into small-context chunk extractions and reduces them, versioned facts are stored in DynamoDB and S3, and SNS fans change events out to analytics, discovery and processing SQS queues, each with its own DLQ, with feedback patches flowing back into the knowledge base](/assets/blogs/living-knowledge-base-aws/living-knowledge-base-aws-hero.png)
