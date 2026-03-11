---
layout: post
title: "Designing a Scalable CV Processing Pipeline: From EC2 Workers to Serverless Processing"
date: 2026-03-11
author: Trisham Patil
---

When building large scale document processing systems, the biggest challenge is rarely the machine learning models.

The real challenge is **system architecture**.

In one of our systems, users could upload **thousands of CVs at once** for parsing and candidate-job matching.

The system needed to process documents quickly while remaining cost efficient.

At scale, even small inefficiencies can multiply dramatically.

This article explains how we designed a system capable of processing **tens of thousands of CVs per day**, while reducing the cost per CV to a fraction of existing solutions.

---

# The Problem

The platform allowed recruiters to upload **large batches of resumes for analysis**.

Typical usage looked like this:

- Daily Active Users (DAU): 100
- Files per user: 2,500 PDFs
- Total daily documents: 250,000 CVs

Each document had to go through multiple processing steps.

These included:

- CV parsing
- Job description parsing
- Resume-job matching
- Resume analysis

All algorithms were built using **CPU-based NLP pipelines**, using tools such as:

- SpaCy
- NLTK
- rule-based grammar models
- heuristic scoring models

The challenge was to keep **processing latency under 10 seconds per CV** while allowing users to upload large batches.

---

# Initial Architecture

![Initial Architecture](/assets/images/posts/cv-processing-architecture/initial-architecture.png)

The first version of the system used a traditional distributed worker architecture.

The workflow looked like this:

1. The client uploads CVs via the frontend.
2. Requests are sent to a **FastAPI backend**.
3. Uploaded files are stored in **Amazon S3**.
4. File metadata is pushed into a **RabbitMQ queue**.
5. **Celery workers** consume tasks from RabbitMQ.
6. Each worker processes a CV using the NLP pipelines.
7. Results are stored in **MongoDB**.

Each algorithm ran on a **separate CPU core**.

Python bytecode execution is single-threaded, so **one core handled one CV processing task**.

---

# Throughput Constraints

Even with multiple worker machines, scaling was limited.

If each user uploaded 2,500 CVs and there were 100 users per day:

```
100 × 2500 = 250,000 CVs
```

Processing this workload required a large number of worker nodes.

The limitations were:

- EC2 instances had fixed compute capacity
- Worker scaling required provisioning new instances
- Idle workers increased infrastructure cost
- Large queues increased latency

Although the system worked, it was **not cost optimal at scale**.

---

# Modernizing the Architecture

To improve reliability and scalability, we redesigned the architecture using cloud-native patterns.

![Cloud Architecture](/assets/images/posts/cv-processing-architecture/aws-autoscaling-architecture.png)

The updated architecture included:

- AWS **Application Load Balancer**
- containerized backend services
- **Auto Scaling Groups**
- distributed task processing
- managed storage

The new flow looked like this:

1. Client uploads files
2. Traffic goes through **Application Load Balancer**
3. Backend API runs in **containerized services**
4. Files are uploaded to **Amazon S3**
5. Processing tasks are queued
6. Workers consume tasks asynchronously

This ensured the API remained **non-blocking and responsive**, even during large uploads.

---

# The Cost Problem

Even with autoscaling, EC2 workers remained expensive.

Each worker instance had:

- fixed compute capacity
- idle time when queues were empty
- scaling delays during peak demand

We needed a system that could **scale instantly and process thousands of tasks in parallel**.

---

# Moving to Serverless Processing

The solution was to adopt a **serverless architecture**.

![Lambda Architecture](/assets/images/posts/cv-processing-architecture/sqs-lambda-architecture.png)

Instead of using Celery workers, we redesigned the processing pipeline.

The new workflow looked like this:

1. CV uploaded to **Amazon S3**
2. Message pushed into **Amazon SQS**
3. **Lambda functions triggered from SQS**
4. Each Lambda processes **one CV**
5. Results stored in **MongoDB cluster**

This allowed us to process documents **fully in parallel**.

---

# Massive Parallel Processing

One of the biggest advantages of serverless architecture is concurrency.

AWS Lambda allows large numbers of concurrent executions.

In our case:

- Up to **800 Lambda functions** could run simultaneously
- Each Lambda processed **one CV**
- 800 CVs could be processed in about **30 seconds**

Compared to fixed worker infrastructure, this allowed **dramatic throughput improvements**.

---

# Cost Optimization

One of the biggest wins came from cost reduction.

Competitor systems charged around:

```
₹0.75 per CV
```

With our optimized architecture we were able to deliver:

```
₹0.10 per CV
```

This was achieved through:

- serverless compute
- parallel execution
- efficient NLP pipelines
- reduced infrastructure overhead

---

# Accuracy of the System

The parsing and matching algorithms achieved:

- **80–90% accuracy on traditional CV formats**
- reliable job matching signals
- fast processing time

For many recruiting use cases, this level of accuracy was sufficient while maintaining high throughput.

---

# Final System Characteristics

The final system achieved:

- asynchronous CV uploads
- large batch processing
- sub-10-second processing latency
- massive concurrency
- significantly reduced cost

More importantly, the architecture could scale automatically based on demand.

---

# Key Lessons

Building scalable AI systems requires more than good models.

It requires **good infrastructure design**.

Some of the key lessons from this system were:

- asynchronous architectures are essential for large batch workloads
- message queues enable reliable distributed processing
- serverless compute can dramatically simplify scaling
- architecture decisions often determine cost more than the algorithms themselves

---

# Final Thoughts

Many engineering discussions focus heavily on machine learning models.

However, real-world AI systems often succeed or fail based on **system design**.

Optimizing architecture can dramatically improve:

- scalability
- cost efficiency
- system responsiveness

For document-heavy applications like CV processing, **cloud-native distributed architectures make a massive difference**.
