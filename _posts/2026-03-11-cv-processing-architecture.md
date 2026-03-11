---
layout: post
title: "Engineering a Scalable Resume Processing Pipeline: From EC2 Workers to Event-Driven Serverless Architecture"
date: 2026-03-11
author: Trisham Patil
---

Large-scale document processing systems rarely fail because of machine learning models.

They fail because of **architecture limitations**.

When building our resume processing platform, we faced a fundamental challenge:

Recruiters could upload **thousands of CVs simultaneously**, and the system had to process them quickly while keeping the API responsive.

At the same time, we needed to keep the **cost per CV significantly lower than competing solutions**.

This article explains the **three architecture iterations** that allowed us to build a scalable system capable of processing hundreds of thousands of resumes per day.

---

# Problem Context

Typical usage looked like this:

- **Daily Active Users (DAU): ~100**
- **Files per user:** 2,500 PDFs
- **Potential daily workload:** 250,000 CVs

Each document passed through a multi-stage NLP pipeline.

The pipeline included four independent algorithms:

1. **CV Parser**
2. **JD Parser**
3. **Candidate Matching Engine**
4. **Resume Analyzer**

However, these stages were **not completely independent**.

The pipeline had a strict dependency structure:

CV Parser
↓
JD Parser
↓
Candidate Matching
↓
Resume Analyzer

Candidate matching relied on structured information extracted from the CV parser.

This meant processing could not be fully parallel inside a single document pipeline.

The architecture therefore needed to support **parallelism across documents**, not within them.

---

# Architecture Evolution

The system evolved through three major stages:

1. **Distributed Worker Architecture**
2. **Auto-Scaling Cloud Infrastructure**
3. **Event-Driven Serverless Processing**

Each iteration solved a different scalability constraint.

---

# End-to-End System Architecture

![End-to-End Architecture](/assets/images/posts/cv-processing-architecture/end-to-end-system-architecture.png)

The diagram above represents the **core system architecture used for large-scale CV processing**.

The system follows a fully asynchronous architecture designed to handle large batch workloads.

---

# Stage 1 — Distributed Worker Architecture

The first version of the system used a **queue-driven worker architecture**.

### API Layer

Users upload large batches of resumes through the frontend.

Typical batch size:

2,500 PDFs

The frontend communicates with a **FastAPI backend running on EC2**.

The backend used:

- **Gunicorn workers**
- **2 CPU cores per instance**
- asynchronous request handling

Uploads are immediately stored in **Amazon S3**.

The API returns quickly without waiting for processing.

---

### Task Queueing

Once the files are uploaded, the backend creates processing tasks.

These tasks are pushed into a **RabbitMQ cluster (RMQ)**.

RabbitMQ acts as the **central distributed queue** for processing jobs.

This allows the API to remain responsive even when thousands of files are uploaded simultaneously.

---

### Distributed Processing Workers

The processing layer consisted of **Celery workers running on EC2 instances**.

Each worker consumed tasks from RabbitMQ.

Each task executed the NLP pipeline using:

- SpaCy
- NLTK
- rule-based grammar models

Each algorithm ran on a **single CPU core**, meaning:

1 CV = 1 CPU core execution

Parallelism was achieved by running multiple workers across many machines.

---

### Result Storage

Once the pipeline finished processing a CV, the results were stored in a **MongoDB cluster**.

The database stored:

- extracted resume fields
- parsed job description features
- matching scores
- candidate analytics

MongoDB was well suited for storing **semi-structured NLP outputs**.

---

# Stage 2 — Batch Completion Detection

Processing thousands of resumes per batch created another challenge.

Users needed to know **when all resumes in their batch had completed processing**.

To solve this, we implemented **batch completion tracking**.

Each upload batch received a unique identifier:

BatchID

Each processed CV updated a counter in the database.

When the final document finished processing, the system triggered a **batch completion event**.

---

# Stage 3 — Event Driven Notification System

Once the entire batch finished processing, a notification event was triggered.

This event invoked a **notification service built with AWS Lambda and SQS**.

The notification service performed the following steps:

1. Detect batch completion
2. Trigger asynchronous notification
3. Notify the client application

The user receives a notification that processing is complete.

---

# Result Retrieval

Once the user receives the notification, the frontend retrieves results using the **BatchID**.

The system supports two mechanisms:

- polling the API
- WebSocket updates

This design ensures the user never waits synchronously for processing.

---

# Throughput

With the architecture above, the system supported workloads such as:

100 users × 2,500 CVs

Which equals:

250,000 resumes per day

Parallel processing across distributed worker nodes enabled large-scale batch processing.

---

# Cost Advantage

One of the most important outcomes of the architecture was cost efficiency.

Typical market pricing for resume parsing systems was approximately:

₹0.75 per CV

Our architecture allowed us to process resumes for approximately:

₹0.10 per CV

This was achieved by:

- CPU-based NLP pipelines
- asynchronous architecture
- efficient queue-based processing
- distributed worker scaling

---

# Engineering Lessons

Several important lessons emerged while building this system.

### Asynchronous architectures are essential

Large batch workloads cannot be handled using synchronous APIs.

Queue-based architectures allow the system to scale independently.

### Parallelism must be applied carefully

The NLP pipeline had dependencies between stages.

Instead of parallelizing inside the pipeline, we parallelized **across documents**.

### Event-driven systems improve user experience

Users should never wait for long-running processing tasks.

Notification-driven workflows allow systems to remain responsive.

---

# Final Thoughts

In large-scale AI systems, the machine learning model is only one piece of the puzzle.

The real challenge is designing infrastructure that can support:

- massive concurrency
- asynchronous workflows
- cost-efficient scaling

By evolving the system architecture from a simple worker model to an event-driven distributed pipeline, we were able to build a platform capable of processing **hundreds of thousands of resumes per day at a fraction of the industry cost**.

In production AI systems, \*_architecture decisions often matter more than the models themselves._
