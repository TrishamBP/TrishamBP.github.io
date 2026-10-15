---
layout: post
title: "The Weekly Tech Brew"
subtitle: "by Trisham Patil"
date: 2026-10-19
author: Trisham Patil
# Work in progress: listed on /newsletter/ while it is being written, but kept
# out of /newsletter/feed.xml (so no RSS-to-email send) until this is removed.
wip: true
# Fill these in once the stories are written:
# email_subject: "The Weekly Tech Brew #2: ..."
# seo_title: "... | The Weekly Tech Brew"
# description: "150-160 characters naming this issue's top stories."
# keywords: "..."
---

## AI Model Releases

### 1. Muse Wonder and Muse Wonder Full: Frontier Models for Agents

**Takeaways**

- **Two models, two audiences:** Muse Wonder is open to developers through the Meta Model API and Muse Code. Muse Wonder Full is limited to Muse Code subscribers for now.
- **Built for agents:** the focus is long, multi-step tasks in expert areas like law, finance and health, plus frontier-level coding.
- **Two new abilities:** Active Memory carries context from one conversation to the next. Active Focus keeps a task going through errors and checks in before anything important.
- **Safety report still to come:** Meta says a full report with more safety evaluations will follow.
- **The claims are Meta's own:** "state-of-the-art" is Meta's description, so the real test is how the models do on independent benchmarks.

Meta has released Muse Wonder and Muse Wonder Full, which it calls its most capable models to date. Meta says both deliver state-of-the-art results on personal and professional agentic tasks, from handling an insurance claim to understanding a lease to building a working app.

Muse Wonder is available now to developers and builders through the Meta Model API and Muse Code. Muse Wonder Full is available now to Muse Code subscribers. Muse Wonder will also power features in the Muse app soon, rolling out to subscribers first.

<button type="button" class="nl-modal-open" data-modal-open="muse-wonder" aria-haspopup="dialog">
  Dive deep &rarr;
</button>

<dialog id="muse-wonder" class="nl-modal nl-modal--wide" aria-labelledby="muse-wonder-title">
  <div class="nl-modal-head">
    <h2 id="muse-wonder-title">Inside Muse Wonder: Meta's New Models for AI Agents</h2>
    <button type="button" class="nl-modal-close" data-modal-close aria-label="Close">&times;</button>
  </div>

  <div class="nl-modal-body" markdown="1">

### How Meta Got Here

Fourteen months ago, Meta started overhauling its AI work. It first rebuilt its foundations, and it now says it is pushing the frontier.

The Muse Wonder series is the result. It builds on the groundwork Meta laid with its earlier model, Muse Spark.

### Built for Real-World Tasks

Think of the jobs people actually need help with: working through an insurance claim, understanding a lease, or making sense of someone's finances. In each case, the model has to read the information in front of it and reason its way through the problem.

Meta says Muse Wonder and Muse Wonder Full bring that skill to expert domains such as **law, finance and health**. They also offer frontier coding performance, whether you are building a game or an app for a new business.

### Active Memory and Active Focus

Real work doesn't finish in one sitting, so Meta has built two abilities into the models:

- **Active Memory:** the model carries what matters to you across conversations and brings back the details that are relevant to the current task.
- **Active Focus:** when a task gets hard, the model keeps working toward your goal. It tries other approaches, recovers from errors and follows through. It asks for clarification when it needs to, and checks in with you before doing anything important.

### How Meta Approaches Safety

A personal agent does real work on your behalf, which often means reading your messages, calendar and documents. Meta says it trained the Muse Wonder family to:

- **Protect private information:** not share it without your permission.
- **Refuse genuinely harmful requests:** turn down requests to help carry out harmful acts.
- **Strengthen security:** help defend against cyber attacks.

There is a balance here. Developers and security teams use models like Muse Wonder to find flaws in their own code, so Meta says it made sure the models can still do that defensive work.

Meta trains, evaluates and releases its most capable models under its **Meta Superintelligence Scaling Framework**. A full report with more safety evaluations is due soon.

### Where You Can Use It

Muse Wonder is available today through the Meta Model API and Muse Code. It will soon power more of the Muse app, rolling out to subscribers first.

Meta calls this a major step toward "personal superintelligence for everyone", and says much more is coming.

<a class="nl-source" href="https://research.meta.ai/blog/muse-wonder" target="_blank" rel="noopener">Read more about their research at Meta &rarr;</a>

  </div>
</dialog>

### 2. Gemini 4 Argon: Google's Enterprise Model for Long-Running Agent Work

**Takeaways**

**The core idea:** Google is pitching Gemini 4 Argon as an enterprise model that carries out complex, long-running, multi-step tasks on its own, with a focus on accuracy, reliability, coding and security.

1. **Autonomous execution of complex tasks:** it reads long documents that mix text, tables, charts and images, combines information from many sources, and produces structured outputs for legal, finance and executive work.
2. **Accuracy for enterprise workloads:** the focus is on getting calculations right, spreadsheet analysis, financial reconciliation, legal research and accurate citations, where results have to be verifiable and repeatable.
3. **Long-horizon coding:** it can work across hundreds of files, optimise existing codebases, refactor architecture and run multi-step development tasks inside automated testing guardrails.
4. **Engineering wins Google reports:** a 40% cut in in-memory session prep time and 21% faster cold imports in its ADK Python framework, plus more agentic code submissions across its own engineering teams.
5. **Security and vulnerability fixes:** it supports defensive security work, including finding and fixing vulnerabilities through CodeMender. Google reports a 68% score on CWE-Bench v1 and better resistance to indirect prompt injection.
6. **Availability and pricing:** it is available through Gemini for business, the API, Google AI Studio and Google Antigravity. Introductory pricing is $2 per million input tokens and $10 per million output tokens until November 30, 2026, after which standard rates are double.

**What matters most for AI engineers**

- **From chatbots to execution:** the focus moves from generating answers to finishing tasks end to end.
- **Reliability is a capability:** testing, citations, honestly reporting failures and asking before irreversible actions matter as much as raw intelligence.
- **Big codebases are a key use case:** long-running agents can make coordinated changes across many files and optimise mature systems.
- **Security belongs in the agent design:** resisting prompt injection and controlling execution are essential once agents read untrusted documents, websites and tools.

All performance figures here are claims reported by Google and its launch partners, not independent results.

Google has launched Gemini 4 Argon, built for the deep, multi-step work that used to take teams hours or days. It is available today in Gemini for business, and developers can call it through the API as `gemini-4-argon`.

<button type="button" class="nl-modal-open" data-modal-open="gemini-4-argon" aria-haspopup="dialog">
  Dive deep &rarr;
</button>

<dialog id="gemini-4-argon" class="nl-modal nl-modal--wide" aria-labelledby="gemini-4-argon-title">
  <div class="nl-modal-head">
    <h2 id="gemini-4-argon-title">Four Ways Gemini 4 Argon Changes How Businesses Work</h2>
    <button type="button" class="nl-modal-close" data-modal-close aria-label="Close">&times;</button>
  </div>

  <div class="nl-modal-body" markdown="1">

### 1. Hand Off the Hardest Work

Teams already use Gemini for business to answer questions and draft content. Google's pitch for Argon goes further: hand it the deep, multi-step work that used to take hours or days, and get back something finished and usable.

Argon reads long documents that mix text, tables, charts and images, and turns them into a single clear output grounded in those sources. It can:

- **Combine many sources** into one structured answer.
- **Analyse data over time.**
- **Write stronger documents** for legal, finance and executive teams.

On long tasks it keeps going until the job is done. Google says it trained Argon to respect system boundaries, report negative findings honestly and pause for confirmation before irreversible steps. It also says so when it couldn't find something or finish a task.

According to Google, early testers say Argon is especially good at turning huge, messy inputs into coherent outputs. GitLab's VP Stuart Moncada says agentic software development needs models that can handle long-running work across the whole development lifecycle, and that Argon is designed to do this inside a company's existing workflows and controls.

### 2. Precise, Verifiable Results

In finance, legal, tax and other regulated work, calculations and data extraction must be precise, repeatable and verifiable.

- **Finance:** Argon can help automate multi-step ledger reconciliations, spreadsheet formulas and variance analyses. Google says it gets calculations, formulas and citations right, and that it leads the **Vals Index**, which measures economic impact across finance, coding, legal and tax work.
- **Legal research:** it can review case law and regulatory filings to pull out verified citations and key precedents. Google says it leads domain evaluations such as **Harvey's Legal Agent Benchmark** for legal research and drafting.

Two launch partners back this up:

- **Harvey:** Niko Grupen, its head of applied research, reports big gains over Gemini 3.1 Pro on Harvey's legal agent evaluations, especially in corporate M&A, data privacy and cybersecurity, and EC/VC work. Accuracy also held up on long-document analysis.
- **ServiceNow:** SVP Nenshad Bardoliwalla says the company helped shape Gemini 4 for enterprise work through its NowAI-Bench. In early access, task success was about 20% higher than Gemini 3.8 Flash, with the biggest gains in HR and customer service.

### 3. Build and Ship Products Faster

Argon is built to run complex projects from start to finish: breaking down goals, tracking progress and updating many files at once. Figma's Chief Design Officer, Loredana Crisan, says it reliably handles complex work, from 3D games to rich animations, and helps teams turn ambitious ideas into prototypes in Figma Make.

Google also tested Argon on its own tools:

- **Agent Development Kit (ADK):** the team behind the open-source ADK wanted to cut framework overhead without breaking existing apps. Working autonomously overnight inside automated testing guardrails, Argon found optimisations, now live in `google/adk-python`, that cut in-memory session prep time by **40%** in long sessions and made cold imports **21%** faster.
- **Google Antigravity:** engineering teams using Argon there increased agentic code submissions by **more than 35%** and cut code rollbacks by nearly a third.
- **Chromium:** the Chrome team used Argon to finish an architectural refactor across hundreds of files in Chromium's 40-million-line codebase, doing months of work in weeks.
- **AlphaEvolve:** Google's code optimisation and discovery agent uses Argon to improve real enterprise workloads, including factory scheduling, logistics, game code speed-ups and chip layout, along with hard maths benchmarks.

Google adds that better spatial reasoning, maths precision and visual coding make it faster to go from idea to working prototype.

### 4. Stronger Defence for Code and the Business

Argon blocks offensive cyber tasks such as penetration testing and exploitation, but its defensive skills stay available. You can use it with **CodeMender** to find and fix vulnerabilities, or plug it into your own security harness. It ties for first on **CWE-Bench v1**, scoring 68% at fixing security vulnerabilities.

HubX's Chief AI Officer, Yunus Emre, says the company is building Argon into MarketingX for automated codebase security audits. In its tests, the model caught 100% of top-priority vulnerabilities and invented none.

Security also means trusting the model inside your own systems:

- **Prompt injection:** Google calls Argon its most resilient model yet against indirect prompt injection, where hidden instructions in content try to hijack the model. It leads the **Gray Swan Indirect Prompt Injection** benchmark, cutting attack success to **0.7%** across 15 adaptive attempts. That matters when Argon reads emails, documents and webpages that may carry hidden instructions.
- **Unrestricted access for vetted defenders:** Google is releasing a version of Argon without cyber guardrails to a small group of trusted defenders, so they can test its full cybersecurity capabilities. They are vetted through the **Fairwind Program**, which gives government, critical-infrastructure and cybersecurity partners exclusive access to unrestricted models.

Google says enterprise customers in its early access programme, including Amplitude, Deloitte and Rakuten, are already reporting strong results.

### Getting Started and Pricing

Gemini 4 Argon is available today in Gemini for business on web, desktop and mobile. Developers can use it through the API in the Gemini platform (model ID `gemini-4-argon`), in Google AI Studio and in Google Antigravity.

| | Until Nov 30, 2026 | From Dec 1, 2026 |
|---|---|---|
| Input tokens (per million) | $2 | $4 |
| Output tokens (per million) | $10 | $20 |

Cached input tokens are 95% off. Google's model card and developer guide cover the full specs, token limits and migration steps. Cyber defenders can also learn how to use Argon against machine-speed threats at Google's Security Summit.

  </div>
</dialog>

### 3. Claude Haiku 5.5: Anthropic's Cheapest, Fastest Small Model

![Claude Haiku 5.5 launch banner from Anthropic, the new fast and low-cost small Claude model](/assets/newsletter/weekly-tech-brew-2026-10-19/claude-haiku-5-5-hero.jpg){: .nl-hero}

**Takeaways**

- **Built for volume:** Haiku 5.5 is aimed at high-volume jobs where cost matters most, such as summaries, context compaction, database queries and classification.
- **A subagent for the bigger models:** on coding work, it pairs with Opus 5.5 or Sonnet 5.5, taking the smaller, repetitive tasks off their hands.
- **Anthropic's fastest model yet:** that makes it a fit for speed-sensitive work like live customer support and browser use. (Opus in Fast Mode is still quicker.)
- **About 75% cheaper to run** than Haiku 4.5 on average, according to Anthropic.
- **First Haiku with an effort setting:** you can now trade cost against intelligence, as with the larger Claude models.
- **Sonnet 5.5 got cheaper too:** its cache reads are now half price, which cuts the cost of most agentic work by about 20%.

Anthropic has released Claude Haiku 5.5, which it calls the cheapest, fastest and most capable small model it has ever shipped. It is available now on every platform, with the model ID `claude-haiku-5-5`.

<button type="button" class="nl-modal-open" data-modal-open="claude-haiku-5-5" aria-haspopup="dialog">
  Dive deep &rarr;
</button>

<dialog id="claude-haiku-5-5" class="nl-modal nl-modal--wide" aria-labelledby="claude-haiku-5-5-title">
  <div class="nl-modal-head">
    <h2 id="claude-haiku-5-5-title">Inside Claude Haiku 5.5: Benchmarks, Pricing and What It's For</h2>
    <button type="button" class="nl-modal-close" data-modal-close aria-label="Close">&times;</button>
  </div>

  <div class="nl-modal-body" markdown="1">

### What Haiku 5.5 Is For

Haiku 5.5 is the model you reach for when you have lots of small, quick jobs and every cent counts: summarising, compacting long contexts, running database queries and classifying requests.

It also works as a **subagent**. In a coding setup, Opus 5.5 or Sonnet 5.5 can plan the work and hand the narrow, repetitive pieces to Haiku. And because it is Anthropic's fastest model at standard speed, it suits work where latency matters, like live customer support and browser automation.

On top of the new model, Anthropic is improving value across its range: cheaper cache reads for Sonnet 5.5, and a new monthly API credit for Claude Max and Team subscribers.

### How It Scores on Benchmarks

Anthropic compared Haiku 5.5 with its predecessor, OpenAI's GPT-6 Luna, and its own bigger Sonnet 5.5 (included for reference):

| Benchmark | Haiku 5.5 | Haiku 4.5 | GPT-6 Luna | Sonnet 5.5 |
|---|---|---|---|---|
| GDPval-AA v2.1 (knowledge work, Elo) | 1620 | 735 | 1437 | 1840 |
| AA-Briefcase v1.1 (knowledge work, Elo) | 1578 | 614 | 1336 | 1824 |
| OSWorld 2.1, offline subset (computer use) | 72.4% | 15.7% | 48.9% | 83.9% |
| Humanity's Last Exam, no tools | 45.9% | 10.2% | — | 56.9% |
| Humanity's Last Exam, with tools | 57.4% | 18.7% | — | 64.5% |
| Terminal-Bench 4.0 (agentic coding) | 39.2% | 0.0% | 16.4% | 70.6% |
| FrontierCode 1.1, Main (agentic coding) | 46.4% | — | 42.4% | 52.1% (Xhigh) |
| Chartography, no tools (visual reasoning) | 46.4% | 6.4% | 29.1% | 61.6% |

The jump from Haiku 4.5 is large on every row, and Haiku 5.5 beats GPT-6 Luna wherever both were tested. Anthropic's Haiku 5.5 System Card explains how each evaluation was run.

### An Effort Dial for Haiku

Haiku 5.5 is the first Haiku-class model with an **adjustable effort setting**, from Low up to Max. Higher effort costs more per task but scores higher, so you can choose where to sit between cheap and smart.

The charts below plot score against cost per attempt for each effort level.

![OSWorld 2.1 accuracy vs cost chart: Claude Haiku 5.5 scores 42% at Low effort rising to 72% at Max, above GPT-6 Luna at every price](/assets/newsletter/weekly-tech-brew-2026-10-19/haiku-5-5-osworld-accuracy-vs-cost.png){: .nl-hero}

![GDPval-AA v2.1 accuracy vs cost chart: Claude Haiku 5.5 knowledge-work Elo rising from about 1,120 at Low effort to 1,620 at Max](/assets/newsletter/weekly-tech-brew-2026-10-19/haiku-5-5-gdpval-accuracy-vs-cost.png){: .nl-hero}

![Humanity's Last Exam accuracy vs cost chart: Claude Haiku 5.5 rising from 31% at Low effort to 46% at Max with no tools](/assets/newsletter/weekly-tech-brew-2026-10-19/haiku-5-5-humanitys-last-exam-accuracy-vs-cost.png){: .nl-hero}

Charts: Anthropic
{: .nl-repo-meta}

On computer use (OSWorld), Haiku 5.5 beats GPT-6 Luna at every price point. On knowledge work (GDPval-AA), the two are close at the low end, and Haiku pulls ahead at higher effort.

### What Early Customers Saw

Anthropic says early testers reported results in line with the benchmarks. Asana ran Haiku 5.5 through the eval suite for its AI Teammates agent, covering bug triage, project set-up and searching large portfolios for risky or overdue work. Compared with its current model, Asana saw latency for completing tasks drop by **over 30%**, and inference per agent turn run up to **2.5x faster**.

Anthropic also lists HubSpot, AlphaSense, Box, Rogo and Cognition among its early customers.

### Pricing

Haiku 5.5 has two price tiers, depending on whether a prompt is up to or over 100,000 tokens. The cheaper tier covers most real use: around 90% of requests to Haiku 4.5 were under that size.

| Price per million tokens | Haiku 5.5 (up to / over 100K) | Haiku 4.5 | Sonnet 5.5 |
|---|---|---|---|
| Cache reads | $0.01 / $0.05 | $0.10 | $0.10 |
| Cache writes | $0.125 / $0.625 | $1.25 | $2.50 |
| Input tokens | $0.10 / $0.50 | $1.00 | $2.00 |
| Output tokens | $0.50 / $2.50 | $5.00 | $10.00 |

That is **90% cheaper** than Haiku 4.5 for prompts up to 100K tokens and 50% cheaper above it. Anthropic's "around 75% less to run" figure also accounts for a new tokenizer, shared with Sonnet 5.5 and Opus 5.5, which uses slightly more tokens per task.

### Safety

- **Alignment:** Anthropic reports big improvements over Haiku 4.5 on almost all of its alignment evaluations, with far fewer cases of misaligned behaviour and less willingness to help with misuse.
- **Cyber safeguards:** stricter than Haiku 4.5's but a little looser than other recent models'. Haiku 5.5 allows a wider range of defensive security tasks than Sonnet 5.5, but still blocks penetration testing and other attacker-style techniques.
- **Biology safeguards:** the same as Sonnet 5, Sonnet 5.5 and Opus 5. Research questions are fine; requests judged likely to cause harm are restricted.

Organisations that need wider biology or cyber access can apply to Anthropic's Life Sciences Verification Program or Cyber Verification Program.

### Where to Get It

Haiku 5.5 is live on all platforms, including Amazon Web Services, Google Cloud and Microsoft Azure. On the Claude Platform, the model ID is `claude-haiku-5-5`, and Anthropic has a migration guide for moving over from older models.

### More Updates From Anthropic

**1. Cheaper Sonnet 5.5 cache reads.** Cache reads on Sonnet 5.5 are now half price: $0.10 per million tokens instead of $0.20. Cache reads make up a large share of token use in agent work, so this cuts Sonnet 5.5's cost on most agentic tasks by about 20%.

![Terminal-Bench 4.0 accuracy vs cost chart: Sonnet 5.5 with $0.10 cache reads reaches the same scores for less than with $0.20 cache reads, while Claude Haiku 5.5 tops out at 39%](/assets/newsletter/weekly-tech-brew-2026-10-19/haiku-5-5-terminal-bench-sonnet-cache-price-cut.png){: .nl-hero}

Chart: Anthropic
{: .nl-repo-meta}

The chart also shows where Haiku fits. On complex agentic coding like Terminal-Bench 4.0, Sonnet 5.5 and Opus 5.5 are still the better choice. Haiku 5.5 shines on narrower tasks that used to be too expensive to run on Claude, such as compaction, summarisation and subagent work.

**2. Monthly API credits for subscribers.** This week, Max and Team subscribers start getting a monthly credit to spend on the Claude Platform, on any model:

- **Max 5x:** $100 per month.
- **Max 20x:** $200 per month.
- **Team:** up to $500 per month, pooled across the team.

The idea is to let subscribers experiment with building tools, apps and agents on the API.

**3. Computer use and browser use in the SDKs.** The Claude Python and TypeScript SDKs now support computer use and browser use in beta. Anthropic says Haiku 5.5's mix of speed, capability and price makes it especially well suited to these tasks.

<a class="nl-source" href="https://www.anthropic.com/claude-haiku-5-5" target="_blank" rel="noopener">Read Anthropic's full announcement &rarr;</a>

  </div>
</dialog>

### 4. Mistral Large 4: A 1-Trillion-Parameter Open-Weight Model Led by Cybersecurity

**Takeaways**

- **Mistral's biggest model yet:** a natively multimodal mixture-of-experts with 1 trillion total parameters (49 billion active per token), a 512K-token context window and up to 256K tokens of output.
- **Open weights are coming:** it launched on October 6 as a public API preview, and Mistral has promised open weights by the end of October.
- **Cybersecurity is the headline:** Mistral says it ranks in the top five on the Artificial Analysis Cyber Index, with 93% on Cybench and 82% on the index's reproduce-and-patch test, which Mistral says is the highest of any model.
- **Self-hosting is the point for security teams:** with open weights, they can run it under their own policies instead of depending on a provider's refusals.
- **Built in Europe:** Mistral says it trained the model from scratch on 3,800 NVIDIA Grace Blackwell GPUs in its own European datacentres.

Mistral pitches Large 4 at reasoning, coding and agentic work, and says it will become the base for a new generation of specialised Mistral models.

The cyber results come with a twist. Mistral points out that several closed models scored close to zero on the reproduce-and-patch test because they refused to do the task at all. Before the open release, the preview was red-teamed with security firms, vetted partners and state authorities, who got a less heavily moderated build with expanded cyber capabilities.

Here is how it scored on Artificial Analysis runs, made before the test harness went public:

| Benchmark | Mistral Large 4 |
|---|---|
| SWE-Atlas Codebase QnA (coding) | 59.4% |
| DeepSWE 1.1 (coding) | 61.7% |
| Terminal-Bench 4.0 (command line) | 28.3% |
| AA Coding Agent Index | 49.8 |
| AutomationBench (agentic tool use) | 59.9% |
| AA-Briefcase v1.1 (knowledge work, Elo) | 1,393 |

Its Coding Agent Index score puts it ahead of DeepSeek-V4-Pro-0813 and Qwen3.8-Max on Mistral's own chart. On the API, it costs **$0.68 per million input tokens and $2.09 per million output tokens**, or $0.748 and $2.299 in Mistral's EU region.

### 5. Grok Voice 3.0: xAI's New Realtime Voice Agent Model

**Takeaways**

- **A realtime speech-to-speech model:** xAI released Grok Voice 3.0 on October 14 for its Voice Agent API, under the model ID `grok-voice-3.0`.
- **A drop-in upgrade:** the `grok-voice-latest` alias now points to it, and the WebSocket endpoint, session parameters and events are unchanged. Grok Voice 2.0 is now deprecated.
- **Built for agents:** sessions handle audio and text, and support custom voices, function calls, search and MCP tools.
- **One benchmark so far, and it's xAI's own:** xAI reports 74% accuracy on EVA-Bench. There are no independent results yet.
- **Closed model:** the weights are not published, and parameters and pricing have not been disclosed.

For developers already on Grok Voice 2.0, the upgrade is mostly a model switch, since the API surface hasn't changed. Function calling and MCP support mean a voice agent can look things up and take actions mid-conversation, not just talk.

Treat the 74% figure as a launch claim until independent speech benchmarks catch up. Text-model leaderboards don't rank voice models like this one either, so expect few side-by-side comparisons for now.

### 6. Qwen-Image-2.1: One Open-Weight Model for Image Generation and Editing

**Takeaways**

**The core idea:** Qwen-Image-2.1 is an open-weight model that both generates and edits images. It adds native transparency, up to 10 reference images and efficient inference, all in a compact 7B-parameter visual generation component.

1. **Compact, efficient architecture:** 32 single-stream Diffusion Transformer (DiT) layers with 7B parameters. Mixed-granularity attention and KV cache reuse speed up inference, especially when editing several input images at once.
2. **Generation and editing in one model:** it handles text-to-image and image editing, including native transparent images and editing of RGBA layers.
3. **Up to 10 reference images:** it combines subjects and assets from several images into one coherent picture, for uses like virtual try-ons, group portraits and interior design.
4. **Precise local edits:** mark a region with a circle, painted annotations or a separate mask, and it changes only that area while leaving the rest of the image intact.
5. **Higher fidelity:** it works to preserve faces, product shapes, textures and text, and improves typography, portrait lighting and fine detail, so edits stay consistent.
6. **Broad creative uses:** panoramas, infographics, storyboards and step-by-step edits for simple animations, useful across design, e-commerce, marketing and visual storytelling.

**What matters most for AI engineers**

- **Efficiency:** KV cache reuse means the static image and text context isn't recomputed at every denoising step.
- **Richer editing:** multiple reference images plus region-based controls make complex image transformations possible.
- **Fewer models to run:** generation, editing and transparency live in one model instead of several specialised ones.
- **Practical to deploy:** a 7B visual generation component keeps a good balance between image quality and compute cost.

The model shown on Hugging Face is **Qwen-Image-2.1-Turbo**, an accelerated checkpoint that generates in just **8 denoising steps** with the same 7B architecture. It loads directly with `QwenImage21Pipeline` in Diffusers and ships with its sampling schedule built in, so there is nothing to configure.

One caveat: the weights are released under Qwen's own research licence, not a standard open-source licence, so check its terms before using it commercially.

<a class="nl-source" href="https://huggingface.co/Qwen/Qwen-Image-2.1-Turbo" target="_blank" rel="noopener">Qwen/Qwen-Image-2.1-Turbo on Hugging Face &rarr;</a>

<a class="nl-source" href="https://qwen.ai/blog?id=qwen-image-2.1" target="_blank" rel="noopener">Read more on the Qwen blog &rarr;</a>

### 7. LFM2.5-24B-A2B: Liquid AI's 2B-Active Reasoning Model for On-Device Agents

**Takeaways**

- **Big model, tiny active footprint:** 24B total parameters, but only about 2B are active per token, so it runs fast and privately on a laptop.
- **Built for agents:** on Liquid AI's numbers, it beats Qwen3.6-35B-A3B, a model with roughly 50% more parameters, on LiveClaw (48.09 vs 38.19) and most tool-use tests.
- **Always reasons first:** it is a pure reasoning model that thinks before every answer, and each thinking token is cheap because so few parameters are active.
- **Fast on real hardware:** 184 tokens/s on an Apple M5 Max, up to 1.7x faster than comparable MoE models, and over 21K output tokens/s on a single NVIDIA B300 GPU.
- **Not a know-it-all:** Liquid AI says it is weaker on knowledge-heavy tasks and should be paired with retrieval or web search. It also trails Qwen3.6 on SWE-Bench Verified (51.0 vs 66.2).
- **The last of its family:** it is the largest and final LFM2.5 model, completing a line that runs from 230M to 24B parameters.

Liquid AI has released LFM2.5-24B-A2B on Hugging Face, along with a base model for fine-tuning and ready-made FP8, GGUF, ONNX and MLX versions.

<button type="button" class="nl-modal-open" data-modal-open="lfm2-5-24b-a2b" aria-haspopup="dialog">
  Dive deep &rarr;
</button>

<dialog id="lfm2-5-24b-a2b" class="nl-modal nl-modal--wide" aria-labelledby="lfm2-5-24b-a2b-title">
  <div class="nl-modal-head">
    <h2 id="lfm2-5-24b-a2b-title">Inside LFM2.5-24B-A2B: How a 2B-Active Model Runs Agents on Your Device</h2>
    <button type="button" class="nl-modal-close" data-modal-close aria-label="Close">&times;</button>
  </div>

  <div class="nl-modal-body" markdown="1">

### What It Is

LFM2.5-24B-A2B is a general-purpose, text-only reasoning model built for fast, private agents that run on your own hardware. It is a **mixture-of-experts (MoE)** model: each token is routed to a few small "expert" networks instead of the whole model, so only a fraction of the weights do work at any moment.

It closes out the LFM2.5 family, which now spans two orders of magnitude, from LFM2.5-230M up to this 24B model.

### The Architecture at a Glance

| Spec | Value |
|---|---|
| Total parameters | 24.0B |
| Active parameters per token | 2.45B |
| Layers | 40 (30 double-gated short-convolution blocks + 10 GQA attention blocks) |
| Experts | 64 per MoE block, top-4 routing |
| Training budget | 36 trillion tokens |
| Context length | 131,072 tokens |
| Vocabulary | 128,000 tokens |
| Languages | 16, including English, Hindi, Arabic, Chinese, Japanese and Korean |

Most of the layers are cheap short convolutions rather than attention. Only 10 of the 40 use attention (GQA), which is a big reason it is quick and light on memory.

### What Changed From LFM2-24B-A2B

The architecture is the same as the previous LFM2-24B-A2B, with two changes:

- **Longer context:** up from 32K to 131K tokens.
- **Bigger vocabulary:** doubled from 65K to 128K tokens through an in-place tokenizer expansion, which handles non-Latin scripts better.

### How It Was Trained

- **Pre-training:** about 33T tokens, nearly double the ~17T used before.
- **Mid-training:** 2T tokens at 32K context on curated data weighted toward reasoning, maths, code, instruction following and multilingual text, then 300B tokens of long-context data at 131K. Tool calls and multi-turn conversations appear in both phases.
- **Post-training:** supervised fine-tuning, then specialist "teacher" models, then two stages of multi-domain on-policy distillation (MOPD), one non-agentic and one agentic, and finally agentic reinforcement learning.

![LFM2.5-24B-A2B post-training recipe: base model, SFT, non-agentic and agentic multi-domain on-policy distillation from specialist SFT and RL teachers, then agentic RL to the final model](/assets/newsletter/weekly-tech-brew-2026-10-19/lfm2-5-24b-a2b-post-training-recipe.png){: .nl-hero}

The final RL stage ran inside popular agent harnesses (**OpenClaw, Hermes Agent, Pi and OpenCode**), so the model learned their tools, system prompts and interaction patterns directly.

### Benchmarks

Liquid AI compared it with three MoE models of similar size on 16 benchmarks covering knowledge, instruction following, maths, code, tool use and agentic workflows.

![LFM2.5-24B-A2B benchmarks vs Qwen3.6-35B-A3B, Gemma-4-26B-A4B-it and Nemotron-3.5-Lightning across 16 tests, leading on AutomationBench, LiveClaw, ToolSandbox and IFBench](/assets/newsletter/weekly-tech-brew-2026-10-19/lfm2-5-24b-a2b-benchmarks.png){: .nl-hero}

Reading the chart:

- **Where it leads:** agentic and tool-use tests (AutomationBench 27.69 vs 8.72 for Qwen3.6, LiveClaw, ToolSandbox, BFCLv4, τ³-Bench Banking) and instruction following (IFEval 96.75, IFBench 74.69, Multi-IF).
- **Where it trails:** coding and hard knowledge. Qwen3.6-35B-A3B is ahead on SWE-Bench Verified (66.20 vs 51.00), WebArena Verified, GPQA Diamond and SciCode.
- **Maths is a tie:** all four models land around 96% on MATH-500.

That split matches Liquid AI's own advice: use it to reason and call tools, and let retrieval supply the facts.

### Speed on Your Laptop

On-device, it is the fastest of the four models at both reading prompts (prefill) and writing answers (decode), while using the least memory.

![LFM2.5-24B-A2B edge inference: 184 tokens/s decode and 15 GB memory on Apple M5 Max, fastest of four MoE models on M5 Max, Mac Studio and AMD Ryzen AI Max+ 395](/assets/newsletter/weekly-tech-brew-2026-10-19/lfm2-5-24b-a2b-edge-inference.png){: .nl-hero}

- **Apple M5 Max:** 184 tokens/s decode using 15 GB of memory, against 118 tokens/s and 22 GB for Qwen3.6.
- **AMD Ryzen AI Max+ 395:** 114 tokens/s decode, up to 1.7x faster than the next-best model.

### Speed on a GPU

On a single NVIDIA B300 (SGLang, BF16, 1,024 input and 256 output tokens), it keeps scaling as concurrent requests grow, reaching **over 21K output tokens per second** at 1,024 concurrent requests. The other models level off between roughly 9K and 13K.

![LFM2.5-24B-A2B GPU inference throughput on one NVIDIA B300: over 21K output tokens per second at 1,024 concurrency, ahead of Qwen3.6, Nemotron-3.5-Lightning and Gemma-4](/assets/newsletter/weekly-tech-brew-2026-10-19/lfm2-5-24b-a2b-gpu-inference.png){: .nl-hero}

Charts: Liquid AI
{: .nl-repo-meta}

### Pick the Right Version

| Version | Best for |
|---|---|
| LFM2.5-24B-A2B | Fine-tuning, or inference with Transformers, vLLM and SGLang |
| LFM2.5-24B-A2B-Base | Your own fine-tuning from the pre-trained base |
| FP8 | High-throughput GPU serving with less memory |
| GGUF | llama.cpp, CPU inference and local use |
| ONNX | Cross-platform deployment on cloud, edge and mobile |
| MLX-4bit | Fast inference on Apple Silicon Macs |
| DSpark | A draft model for faster speculative decoding in SGLang (coming soon) |

### Tips for Using It

- **It always thinks:** the chat template opens every answer with a `<think>` tag, unlike the older LFM2-24B-A2B.
- **Recommended settings:** temperature 0.1, top_k 50 and repetition penalty 1.05.
- **Tool calls are Python by default:** it writes calls as a Python list between special tokens, but you can ask for JSON in the system prompt.
- **Plug it into agents:** serve it with any OpenAI-compatible backend, then point Hermes, OpenClaw or Pi at it.
- **Fine-tune it:** Liquid AI provides notebooks for continued pre-training and SFT (Unsloth), plus SFT, DPO and GRPO with LoRA (TRL).

The weights use Liquid AI's own LFM 1.0 licence, so check its terms before commercial use.

<a class="nl-source" href="https://huggingface.co/LiquidAI/LFM2.5-24B-A2B" target="_blank" rel="noopener">LiquidAI/LFM2.5-24B-A2B on Hugging Face &rarr;</a>

<a class="nl-source" href="https://www.liquid.ai/blog/lfm2-5-24b-a2b" target="_blank" rel="noopener">Read Liquid AI's blog post &rarr;</a>

  </div>
</dialog>
