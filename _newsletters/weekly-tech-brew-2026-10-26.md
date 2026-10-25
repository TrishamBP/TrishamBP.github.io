---
layout: post
title: "The Weekly Tech Brew"
subtitle: "by Trisham Patil"
date: 2026-10-26
author: Trisham Patil
# Work in progress: listed on /newsletter/ while it is being written, but kept
# out of /newsletter/feed.xml (so no RSS-to-email send) until this is removed.
wip: true
# Fill these in once the stories are written:
# email_subject: "The Weekly Tech Brew #3: ..."
# seo_title: "... | The Weekly Tech Brew"
# description: "150-160 characters naming this issue's top stories."
# keywords: "..."
---

## Cybersecurity Armageddon

![Cybersecurity Armageddon warning: a yellow and black nuclear-style hazard placard with a radiation symbol, reading threat level critical for all infrastructure](/assets/newsletter/weekly-tech-brew-2026-10-26/cybersecurity-armageddon-cybergeddon-warning.png){: .nl-hero}

<div class="nl-danger" markdown="1">

<p class="nl-danger-label">&#9762; Threat advisory &middot; Severity: critical</p>

**Cybersecurity Armageddon** (frequently referred to as **cybergeddon**) is a term used by security professionals, policy experts, and the media to describe a hypothetical or catastrophic worst-case scenario in which a coordinated, massive wave of cyberattacks simultaneously cripples critical global infrastructure.

</div>

### 1. What Is PHP, and Why Did It Spark a Global Cybersecurity Scramble?

The latest major incident is **PHP2Shell** (CVE-2026-109618 and CVE-2026-109619): a pair of critical remote code execution (RCE) vulnerabilities found in the core PHP runtime engine.

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

#### Global PHP Vulnerability Crisis

![PHP logo: the official PHP programming language logo, black lowercase php lettering on a purple oval](/assets/newsletter/weekly-tech-brew-2026-10-26/php-programming-language-logo.png){: .nl-logo}

**What is PHP?** It's an open-source scripting language that runs on web servers and builds pages before they reach your browser. It powers an estimated **70% of the world's websites**, including major platforms like Wikipedia and WordPress.

That's why this one is serious. Security researchers have uncovered two critical remote code execution flaws in PHP's core engine, and they're **about a decade old**. A bug at that level puts a huge share of the web's infrastructure at risk of compromise.

**AI sped up the discovery.** Researchers at firms including **Wiz** and **Calif** used advanced AI tools to scan for and pin down these complex bugs far faster than traditional manual review. That's a win for defenders. But experts warn the same tools let attackers generate and scale automated exploits just as quickly.

**The disclosure set off a worldwide scramble.**

- **Cloudflare** reported **millions of automated hacking attempts** within hours of the announcement.
- The **BBC**, **Wikimedia** and several **government agencies across Europe** temporarily took vulnerable systems offline as a precaution.

**What to do now.** The **PHP Foundation** has released emergency security patches. The US **National Security Agency (NSA)** and the UK's **National Cyber Security Centre (NCSC)** are urging every website operator to update immediately.

If you can't patch right away, the advice is to **take your platform offline temporarily**. An unpatched server risks giving attackers full control of the machine and the databases behind it.

<a class="nl-source" href="https://www.bbc.com/news/articles/c3qjnwye0ep5o" target="_blank" rel="noopener">Read more on BBC News &rarr;</a>

</div>
</details>

### 2. Trust, but Verify: The eMudhra Fallout

India's **eMudhra** is leaving the website security business after flaws in its certificates set off a global alarm. It raises a basic question: who verifies the institutions that secure our internet?

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

![eMudhra digital certificate security flaw: silhouettes of people working at computers in front of a glowing blue Cyber Security sign](/assets/newsletter/weekly-tech-brew-2026-10-26/emudhra-cyber-security-digital-certificates.png){: .nl-hero}

**eMudhra**, a prominent Bengaluru-based digital trust company and certifying authority, is at the centre of a major global cybersecurity controversy. Here's what happened.

**The security lapse: flawed keys.** Something went badly wrong in how eMudhra generated the cryptographic keys behind its global TLS/SSL certificates, the certificates that secure websites. Instead of large, unpredictable random numbers, the process produced drastically weak keys. In one case, a key was generated from a trivial value: the number **4**.

**A global security alarm.** With keys that weak, attackers could in theory guess or recover the private keys of intermediate certificates. That could let them spoof websites, intercept encrypted traffic or issue fraudulent certificates. Browser vendors such as **Mozilla** and international cybersecurity agencies raised major alerts.

**Exit from the global certificate business.** After mounting backlash, regulatory scrutiny and a severe loss of trust across the security community, eMudhra announced it is shutting down and fully withdrawing from its global digital certificate business.

**Government probe and market impact.** The Indian government ordered an official probe into the error. Investors reacted sharply, and eMudhra's shares fell significantly over several trading sessions.

**Domestic services are separate.** eMudhra says the incident mainly affected its global TLS/SSL operations, a small part of its overall revenue. Its domestic Indian **Digital Signature Certificate (DSC)** and **eSign** services are separate and running normally.

<a class="nl-source" href="https://www.reuters.com/legal/litigation/indian-firm-emudhra-exits-global-digital-certificates-business-after-2026-10-22/" target="_blank" rel="noopener">Read more on Reuters &rarr;</a>

</div>
</details>

### 3. When Your AI Gateway Becomes the Attack Vector

**LiteLLM** suffered a critical supply chain attack on October 21, 2026. A compromised version, **v1.107.0**, was published to PyPI and Docker registries, potentially exposing downstream users to malicious code execution.

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

#### What Is a Supply Chain Attack?

A supply chain attack is when attackers compromise a trusted piece of software, library or vendor to reach everyone who depends on it.

In LiteLLM's case, the attackers didn't go after each company using LiteLLM one by one. They compromised a single software release, then let trusted package registries like PyPI deliver it for them.

![LiteLLM supply chain attack explained: stolen GitHub tokens, a poisoned 1.107.0 release on PyPI and Docker, pip install litellm, and malware running at Python startup](/assets/newsletter/weekly-tech-brew-2026-10-26/litellm-supply-chain-attack-flow.png){: .nl-hero}

**How it works:**

1. **You trust a dependency.** Your application installs LiteLLM with `pip install litellm`.
2. **The attacker compromises the software.** A malicious version is published to the package registry.
3. **Developers install the compromised version.** The malicious code runs in their environment, where it can steal credentials or execute commands.

**Why it's dangerous:** you can follow every security best practice in your own code and still be compromised, because a dependency you trust has been tampered with.

Think of it like a food supply chain. Instead of breaking into every restaurant, an attacker contaminates one ingredient that's supplied to all of them.

> **The lesson:** attackers don't always go after the target directly. Sometimes they go after what the target trusts.

#### Key Details of the Incident

- **The payload.** Version 1.107.0 (all 7 PyPI wheels and the affected Docker images) contained a compiled credential stealer and a remote code execution (RCE) loader. It runs automatically when Python starts, through startup hooks (`.pth` files and `sitecustomize.py`), even if your application never imports `litellm`.
- **Root cause.** The attackers found GitHub CLI OAuth tokens belonging to LiteLLM developers in the logs of an exposed, internet-facing internal LiteLLM deployment. With them, they disabled branch protections, force-pushed a change, and pointed the release pipeline at a lookalike repository (`Berri-AI/litellm` instead of `BerriAI/litellm`) to sign and publish poisoned artifacts.
- **Affected artifacts:**
  - **PyPI:** `litellm==1.107.0` (since removed by PyPI)
  - **Docker Hub / GHCR:** the `v1.107.0`, `latest`, `main-latest` and `main-stable` tags for `ghcr.io/berriai/litellm` (and variants) and `docker.io/litellm/litellm`
  - **Not affected:** enterprise customers using LiteLLM's private enterprise registry
- **Status.** LiteLLM pulled the malicious releases and says the incident is contained. The investigation is ongoing.

#### Immediate Action Required

1. **Don't run `pip install` or start Python in a possibly exposed environment.** The startup hooks can re-trigger the malware. LiteLLM's guidance is to delete the malicious files (`cook.pth`, `cook.py` and `sitecustomize.py`) from site-packages first.
2. **Downgrade and pin.** Pin to `litellm==1.106.2` or another known-clean earlier version, by version number or image digest.
3. **Assume a full breach and rotate secrets.** The malware harvests cloud IAM tokens (AWS, GCP, Azure), Kubernetes service account secrets, database passwords and AI provider API keys. Security researchers, including Wiz and Aikido, urge teams to treat any environment that pulled 1.107.0 as compromised and rotate every credential it could reach.

<a class="nl-source" href="https://docs.litellm.ai/blog/security-incident-oct-21-2026" target="_blank" rel="noopener">Read the full incident report on LiteLLM &rarr;</a>

</div>
</details>

### 4. Railway Says Intruder May Have Accessed Customer Secrets, Urges Credential Rotation

Platform-as-a-Service (PaaS) provider **Railway** on Wednesday disclosed "anomalous activity" related to systems that store customer environment variables.

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

![Railway security incident: the Railway logo over a dark background of leaked environment variables like API keys, database URLs and GitHub tokens, with a hooded hacker](/assets/newsletter/weekly-tech-brew-2026-10-26/railway-security-incident-customer-secrets.png){: .nl-hero}

On October 21–22, 2026, the cloud platform Railway disclosed a major security incident: unauthorized access to the systems that store customer environment variables.

#### What Happened

- **Environment variables compromised.** An unauthorized third party may have accessed encrypted environment variables, and obtained the decrypted contents for a subset of users.
- **Credentials exposed.** The leaked secrets may include API keys, database passwords, cloud credentials and private registry keys.
- **A link to AI providers.** Railway believes the breach is part of a wider series of targeted attacks on platform companies, with the end goal of compromising AI inference providers.
- **Deployments disrupted.** Railway temporarily paused new builds and deployments during the investigation. Builds have since resumed across its Enterprise, Pro, Hobby, Trial and Free plans.

#### What Railway Users Should Do Now

- **Rotate every secret.** Railway urges all users to immediately roll every environment variable, API key and private registry credential stored on the platform.
- **Check your upstream accounts.** Review and revoke any keys that may have been exposed for services such as OpenAI, Anthropic and GitHub. Then check their usage logs for unauthorized requests or unexpected charges.

<a class="nl-source" href="https://thehackernews.com/2026/10/railway-says-intruder-may-have-accessed.html" target="_blank" rel="noopener">Read more on The Hacker News &rarr;</a>

</div>
</details>

### 5. SBI Customer Data Leaked on the Dark Web

The **State Bank of India (SBI)** confirmed a cyber incident after a hacker group named "Siriusim" claimed to have leaked customer data on the dark web.

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

#### Key Details of the Incident

- **Confirmed exposure.** In an exchange filing, SBI confirmed that the personal records of **3,897 customers** were exposed, including names, phone numbers, IDs and loan details.
- **The hackers' claims.** The group "Siriusim" claims access to up to **3.75 lakh (375,000) records** and **2,722 PDF documents**. SBI has not verified the larger number.
- **Detection and response.** SBI received alerts on **October 16, 2026**, from **CERT-In** and the **Defence Cyber Agency**. The bank says the incident has no material impact on its core business operations or financial performance.
- **Official updates.** Updates and guidelines are available on the SBI Cyber Security Portal.

#### Safety Tips for SBI Customers

- **Never share OTPs, PINs or passwords** with anyone claiming to be from the bank.
- **Watch for targeted scam calls.** Fraudsters may use your leaked details or phone number to sound convincing.
- **Check your bank statements regularly** for unauthorized transactions.
- **Report suspicious activity.** Email SBI at [report.phishing@sbi.co.in](mailto:report.phishing@sbi.co.in), call the national cybercrime helpline on **1930**, or file a report at [cybercrime.gov.in](https://cybercrime.gov.in).

<a class="nl-source" href="https://timesofindia.indiatimes.com/business/india-business/hacker-group-claims-access-to-3-8-lakh-sbi-data-entries/articleshow/135076898.cms" target="_blank" rel="noopener">Read more on The Times of India &rarr;</a>

</div>
</details>

### 6. Critical Emergency at Node.js

The **Node.js** project released critical emergency security updates on Wednesday, October 21, 2026, patching **10 security flaws**. Four are rated High severity and affect every actively supported version (Node.js 22.x, 24.x and 26.x).

A public proof-of-concept (PoC) exploit is already out, so update your runtimes now to **22.23.4**, **24.22.1** or **26.12.1**.

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

![Node.js emergency security update: the Node.js logo built from glowing green code, with zlib brotliDecompress calls in the background](/assets/newsletter/weekly-tech-brew-2026-10-26/nodejs-emergency-security-update-brotli.png){: .nl-hero}

#### Key Vulnerabilities Fixed

- **Brotli decoder out-of-bounds write, CVE-2026-111497 (High).** A bug in the bundled Brotli decompression code. An attacker who sends malformed compressed input to a Node.js server can crash it (DoS), leak process memory, or potentially run arbitrary code. The public PoC reached code execution only on a deliberately weakened test build. On standard builds it caused crashes and limited memory reads.
- **TLS hostname verification bypasses (High).** Two separate flaws, CVE-2026-106069 (all three lines) and CVE-2026-105483 (24.x and 26.x), could let a Node.js app open an encrypted connection without properly checking who is on the other end. Attackers could use that to intercept, alter or redirect traffic.
- **eMudhra certificate blocklist.** The updates block the compromised certificate authority keys of **eMudhra** (the story above), so patched versions reject fraudulent TLS certificate chains built on that breach.
- **ZipFile attacker-controlled prefix bytes, CVE-2026-106070 (Low).** Affects Node.js 26.x only, after a failed ZIP header check.

#### Affected Versions and Remediation

| Version | Action required | Safe patch version |
| --- | --- | --- |
| Node.js 26.x (Current) | Upgrade immediately | v26.12.1 |
| Node.js 24.x (LTS) | Upgrade immediately | v24.22.1 |
| Node.js 22.x (LTS) | Upgrade immediately | v22.23.4 |
| Node.js 18.x / 20.x | Migrate | End-of-life: no fix coming. Move to an active LTS line. |

#### Mitigation Steps

1. **Rebuild your container images.** If you deploy with Docker, update your base images and rebuild so your containers pick up the patched runtime.
2. **Patch edge-facing services first.** Start with services that fetch data from external APIs or accept compressed request bodies, since those reach the Brotli decoder.
3. **Lean on your WAF only as a stopgap.** If you can't update right away, make sure your Web Application Firewall rules are current. Providers like Vercel have rolled out rules for known exploit patterns, but they don't cover Brotli responses your app fetches itself. Upgrading is the real fix.

<a class="nl-source" href="https://thehackernews.com/2026/10/nodejs-brotli-decoder-bug-could-allow.html" target="_blank" rel="noopener">Read more on The Hacker News &rarr;</a>

</div>
</details>

### &#9888; PHP2Shell Update: Exploit Attempts Now Number in the Millions

<div class="nl-danger" markdown="1">

<p class="nl-danger-label">&#9888; Active exploitation &middot; Patch or take PHP servers offline</p>

The **PHP2Shell** flaws from story 1 have gone from disclosure to mass exploitation in a matter of hours. Here is where things stand.

#### The Attack Volume Is Exploding

- **Before and after the announcement.** Cloudflare CEO **Matthew Prince** says the company logged thousands of exploit attempts in the 10 hours before disclosure, tens of thousands within 45 minutes of it, and is now seeing "millions."
- **Attackers are adapting.** Cloudflare says attackers are already tweaking their payloads to get around its web application firewall (WAF) rules.

#### Multiple Attackers Are Involved

- **Amazon's warning.** Amazon says "PHP2Shell is now being broadly exploited in the wild."
- **Early exploit code.** It found several working proof-of-concept exploits roughly **12 hours before disclosure**, a sign that more than one group was already on the case.

#### More Than a Million Servers Are Exposed

- **Unpatched at scale.** VulnCheck, VirusTotal and Censys all report that more than **1 million PHP servers** were still running unpatched software on October 21.
- **Censys's count.** About **1.57 million** of the roughly **1.58 million** hosts showing a PHP version were unpatched.
- **VulnCheck's count.** It saw more than **2.6 million** internet-facing PHP hosts, almost all vulnerable, and at least **1 million** on PHP versions that no longer receive official updates.

#### What We Don't Know Yet

- **No confirmed breaches so far.** No successful break-ins have been reported yet.
- **Exploits are still immature.** watchTowr says none of the public exploit code it has reviewed achieves full code execution, and VulnCheck observed at least one failed attempt to plant a web shell.
- **Check your logs anyway.** Amazon recommends investigating suspicious activity on PHP servers going back to at least **October 17**.

#### Governments Pulled Their Sites Offline

Instead of waiting it out, many public bodies switched their websites off until they could patch:

- **Netherlands:** DigiD (the national login for government services), the House of Representatives website and the national cybersecurity centre's site.
- **France:** local government sites, including the Paris police prefecture.
- **UK:** the Edinburgh, Bristol and Oxford council websites.
- **Elsewhere:** Belgium, Finland and Germany also took government sites down, and Australia's cyber agency was briefly affected. **Wikimedia** took several systems offline as a precaution.

The US **NSA** told organizations that can't patch immediately to take their PHP systems offline, warning the flaw could "provide a direct path to the server's file system or database." The UK's **NCSC** gave the same advice and told organizations to check for backdoors.

<a class="nl-source" href="https://www.securityweek.com/" target="_blank" rel="noopener">SecurityWeek, Oct 22 &rarr;</a> &nbsp; <a class="nl-source" href="https://www.theregister.com/" target="_blank" rel="noopener">The Register, Oct 22 &rarr;</a> &nbsp; <a class="nl-source" href="https://www.theguardian.com/" target="_blank" rel="noopener">The Guardian, Oct 21 &rarr;</a>

</div>

<div class="nl-safe" markdown="1">

<p class="nl-safe-label">&#128737; Safety guide &middot; Websites, AI tools, accounts, money</p>

### The PHP Crisis: How to Keep Yourself Safe

**The internet is facing a serious security threat. Here's how to protect your websites, AI tools, accounts, and money.**

The PHP crisis has become one of the biggest internet security scares of the year. Everyone who builds, owns, or uses AI-powered websites should be paying attention.

A dangerous weakness that had been hiding in website software for more than a decade is now being tested by hackers across the internet. Cloudflare has seen millions of attack attempts. Governments have taken websites offline. Even some well-protected services have had to act quickly.

The really frightening part? You could have a perfectly normal-looking website, with everything working as usual, and still have no idea that the software behind it needs an urgent security update.

I wouldn't panic. But I certainly wouldn't ignore this.

There are already ways to protect yourself, and some of the newest AI security tools can make the job surprisingly easy.

#### AI Found Something the Internet Had Missed for 14 Years

PHP is the software running behind millions of websites, including many built with WordPress. It helps websites handle payments, accounts, private information, and other important functions.

Researchers found two serious security holes inside PHP itself. Both were rated **9.2 out of 10** for severity.

Under certain conditions, hackers could use them to run harmful code on a website's server without even logging in. Your website could be at risk despite strong passwords and carefully written code.

What makes this story unusual is how the flaws were discovered. Researchers used powerful AI models, including OpenAI's **GPT-5.6 Sol**, to help uncover problems that had gone unnoticed for years.

The same AI technology can help attackers look for weaknesses faster, too. That is why the response has been so urgent.

**Attempts are not breaches.** Millions of attack attempts have been observed, but that doesn't mean millions of websites were hacked.

**The immediate priority:** find out what's exposed and fix it before someone gets in.

</div>

## Rogue Agents Are on the Prowl

AI agents are now showing up in security incident reports, both when they go off-script on their own and when attackers deliberately use them. Here are this week's rogue agent and AI security stories.

### 1. AI Agents Broke Into Systems Nobody Told Them to Touch

**India's cyber agency says rogue AI agents reached companies' live systems.** On October 15, **CERT-In** said AI agents being tested online got into Indian organizations' systems and read business records, including personal data. None of the affected companies noticed.

The agents got in using passwords and keys that had been left in code and configuration files. The AI companies reported the incidents themselves, and CERT-In didn't name them.

<a class="nl-source" href="https://thehackernews.com/" target="_blank" rel="noopener">The Hacker News, Oct 16 &rarr;</a>

**OpenAI disclosed four more agent incidents, bringing its total to 19.** In one, a test model got around a government website's access controls and downloaded 24 years of hospital bed data. In another, a model made a payment from a crypto wallet nobody had given it. A third pulled down **147,451 rows** of non-public data without telling the testers.

<a class="nl-source" href="https://fortune.com/" target="_blank" rel="noopener">Fortune, Oct 16 &rarr;</a>

**Tencent admitted its test agents probed Alibaba's systems.** Tencent said the rogue agent activity in recent reports came from its tests of other companies' models. It said some agents showed "unintended web-browsing behavior" but found no deliberate targeting. According to Reuters, this looks like the first time a major Chinese company has owned up to rogue agent activity.

<a class="nl-source" href="https://www.pymnts.com/" target="_blank" rel="noopener">PYMNTS, Oct 16 &rarr;</a>

**Meta's Muse agent gave a seller's home address to a stranger.** A Toronto man let Muse sell an item for him on Facebook Marketplace. The agent accepted an offer and shared his address without checking with him first, and the buyer turned up late at night. He had granted "always allow" permissions when he connected the agent.

<a class="nl-source" href="https://fortune.com/" target="_blank" rel="noopener">Fortune, Oct 19 &rarr;</a>

### 2. Is "Rogue" the Right Word for AI Agents?

**Hugging Face CEO Clem Delangue** criticized Netflix's documentary *AI Gone Rogue* for "maximum anthropomorphism" and "full doomer mode." Hugging Face was the target of the OpenAI test agents at the centre of the film.

He said the film left out two things: the agents were poorly contained and monitored, and a closed AI model refused to help Hugging Face defend itself, so his team switched to an open model.

<a class="nl-source" href="https://techcrunch.com/" target="_blank" rel="noopener">TechCrunch, Oct 20 &rarr;</a>

### 3. Attackers Are Using AI Agents on Purpose

**A Chinese-built AI hacking tool was used to breach South Korean banks.** CrowdStrike says an attacker used **ARTEX**, an open-source tool for automated hacking, together with DeepSeek and other models to steal data from South Korean financial firms, including **Shinhan Bank**. The attacker also used Claude Code. ARTEX's developer has since stopped publishing it as open source.

<a class="nl-source" href="https://thehackernews.com/" target="_blank" rel="noopener">The Hacker News, Oct 8 &rarr;</a>

**Microsoft says a Chinese state-aligned group used ARTEX to get in through ConnectWise.** The group, **Storm-0940**, used the tool to try signing in to more than **2,250 Microsoft 365 tenants** (customer environments) at a rate of **2,900 attempts per minute**. In some cases it went from first targeting to privileged access in under three hours.

<a class="nl-source" href="https://thehackernews.com/" target="_blank" rel="noopener">The Hacker News, Oct 22 &rarr;</a>

**The US Army is building AI agents to hack enemy networks.** Documents obtained by The Intercept describe **ECHOTRIBBLE**, an Army Cyber Command program for AI agents that spread through networks like a worm, copy themselves onto new devices and "neutralize" targets with minimal human oversight.

<a class="nl-source" href="https://theintercept.com/" target="_blank" rel="noopener">The Intercept, Oct 19 &rarr;</a>

<h2 id="the-tech-radar" class="nl-icon-heading"><img class="nl-section-icon nl-section-icon--square" src="/assets/newsletter/weekly-tech-brew-2026-10-26/tech-radar-icon.png" alt="The Tech Radar icon: radar sweep badge for the company spotlight section of The Weekly Tech Brew" width="48" height="48"> The Tech Radar</h2>

### This Week on the Radar: Fireworks AI

![Fireworks AI logo: the Fireworks AI inference platform wordmark, featured company in this week's Tech Radar](/assets/newsletter/weekly-tech-brew-2026-10-26/fireworks-ai-logo-tech-radar.png){: .nl-hero}

The AI race is shifting gears. Instead of throwing more compute at ever-larger models, companies are chasing something more strategic: smaller, cheaper, and more controllable AI that they can actually own and operate on their terms.

Enter **Fireworks AI** — a rising force in AI inference infrastructure, backed by NVIDIA and reportedly valued at **$17.5 billion** in July 2026. The play? Make high-performance AI faster, cheaper, and easier to deploy at scale.

<a class="nl-source" href="https://fireworks.ai/" target="_blank" rel="noopener">fireworks.ai &rarr;</a>

As AI costs spiral, enterprises are increasingly turning to open-weight models and inference optimization to escape the economics of frontier AI. Enter Fireworks AI, the NVIDIA-backed inference cloud startup that just crossed **$1 billion in annualized revenue** — 5× last year's figure — while raising **$1.5 billion at a $17.5 billion valuation**. Competing with hyperscalers like AWS and Google Cloud, Fireworks hosts models from DeepSeek, MiniMax, Z.ai, and OpenAI, enabling developers to fine-tune and deploy models for specialized workloads at reportedly 5–10× lower costs than equivalent-quality closed models.

The bigger story is the shift from generalized intelligence to specialized, cost-efficient AI. Fireworks processes **40 trillion tokens daily**, giving enterprises access to scalable inference without locking themselves into a single model provider or infrastructure ecosystem. With more than 20 computing suppliers, partnerships such as Microsoft Foundry, and plans to expand into GPU-backed model training, Fireworks is positioning itself at the intersection of AI sovereignty, inference economics, and cloud infrastructure — a market where owning the intelligence layer matters as much as building the model itself.

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

#### Which Open-Weight Models Does Fireworks AI Serve?

Fireworks' model library covers the open-weight models developers are actually shipping: **GLM-5.3** and **GLM 5.3 Flash** from Z.ai, **DeepSeek V4.1 Flash**, **Kimi K3**, **Muse Spark Open**, **MiniMax M3.1 Flash**, Xiaomi's **MiMo-V2.6-Pro-RL**, and **Ember-1**, the model carrying Fireworks' own logo.

Every model below has a **1M-token context window**, and every priced one supports function calling and runs **serverless**: you pay per token, with no GPUs to rent.

#### Fireworks AI Pricing: Cached vs Uncached Input Tokens

Prices are per million tokens. The column that matters is **cached input**: when a request reuses a prompt prefix Fireworks has already processed, such as a long system prompt or a document, those tokens are billed at a fraction of the normal rate.

| Model | Uncached input | Cached input | Output | Cached saving | Notes |
| --- | --- | --- | --- | --- | --- |
| MiniMax M3.1 Flash | $0.15 | $0.015 | $0.60 | 90% | New · Vision |
| DeepSeek V4.1 Flash 1017 | $0.30 | $0.006 | $1.20 | 98% | New · Tunable · Vision |
| DeepSeek V4.1 Flash | $0.30 | $0.006 | $1.20 | 98% | Tunable · Vision |
| GLM 5.3 Flash | $0.15 | $0.03 | $0.50 | 80% | Tunable · Vision |
| GLM-5.3 | $1.40 | $0.26 | $4.40 | 81% | Tunable |
| Ember-1 | $3.00 | $0.30 | $15.00 | 90% | Vision |
| MiMo-V2.6-Pro-RL | Not listed | Not listed | Not listed | — | New · Vision |

**What stands out:**

- **DeepSeek V4.1 Flash has the steepest cache discount.** Cached input costs $0.006 per million tokens, 50× cheaper than uncached, so agent loops that resend the same context get very cheap.
- **The Flash tier is the budget floor.** MiniMax M3.1 Flash and GLM 5.3 Flash both start at $0.15 per million input tokens.
- **Ember-1 is the premium option.** At $3.00 in and $15.00 out, it's priced like a frontier model, but its 90% cache discount still applies.
- **Output is where the bill grows.** Output tokens cost 3–5× more than uncached input across the lineup, so long generations cost more than long prompts.

#### The Feature I Like Most: FireRouter with Opus for Claude Code

**FireRouter with Opus** (`firerouter/opus`) is the Fireworks feature that matters most to me. You bring your existing Claude plan, and FireRouter makes it go further. **Claude Opus** handles the turns that actually need it, and routine work goes to lower-cost open models, **GLM-5.3** and **GLM-5.3 Flash**.

The router scores **every turn** and is **cache-aware**, so it avoids moving a conversation somewhere that would throw away a warm prompt cache.

![FireRouter with Opus cost savings for Claude Code: FireRouter routes hard turns to Claude Opus and routine turns to GLM-5.3, cutting cost per session from $15.36 to $6.63, a 57% drop](/assets/newsletter/weekly-tech-brew-2026-10-26/firerouter-opus-claude-code-cost-savings.png){: .nl-hero}

**How FireRouter cuts the cost of Claude Code** (Fireworks' own figures):

- **57% cheaper per session:** $6.63, against $15.36 on Opus alone.
- **94.2% prompt cache hit rate,** against 97.8% on Opus, so the cache-aware routing keeps most of the caching discount.
- **98.1% of Opus quality:** 78.7% accuracy, against 80.2% for Opus.
- **At team scale:** a $160,000 Opus bill becomes $68,800, a saving of **$91,200** for the same work.

Most of a coding session isn't frontier-level reasoning. Reading files, running tests and making small edits are routine turns, and paying Opus prices for them is where the money goes. FireRouter keeps Opus for the hard turns and sends the rest to models that cost a fraction as much.

**Three ways to plug it in:**

1. **FireConnect:** if you already use Claude Code, Codex, OpenCode or Copilot, point it at FireRouter and keep your existing harness.
2. **An LLM gateway:** if you already route through a gateway like LiteLLM, send traffic through it and let FireRouter pick the best model for every turn.
3. **Anthropic- and OpenAI-compatible APIs:** use the Fireworks, OpenAI or Anthropic SDKs directly.

#### How Fireworks AI Deploys Models: Serverless, Dedicated GPUs, Training and Batch

Fireworks gives you four ways to use a model. Using **DeepSeek V4.1 Flash 1017** as the example:

##### 1. Serverless: Pay Per Token

Zero setup, no cold starts and generous rate limits. You pick one of two modes:

| Mode | Best for | Uncached input | Cached input | Output |
| --- | --- | --- | --- | --- |
| Standard | General use, balancing performance and price | $0.30/M | $0.006/M | $1.20/M |
| Priority | Workloads that need higher reliability during peak traffic | $0.375/M | $0.0075/M | $1.50/M |

Priority costs **25% more** across the board, which buys you reliability when everyone else is hammering the same model.

##### 2. Dedicated: Your Own GPUs

Deploy the model on dedicated GPUs with high performance, fast autoscaling, minimal cold starts and **no rate limits**. You name the deployment, choose a base model and region, then pick a **deployment shape**: the accelerator, GPU count and precision the model runs on.

| Deployment shape | Hardware | Precision | Listed price |
| --- | --- | --- | --- |
| `deepseek-v4p1-flash-1017-lora-b300-fp4-w4-p1` (recommended) | 4× NVIDIA B300 288GB | FP4 | $60.00 |
| `deepseek-v4p1-flash-1017-full-rdma-b300-fp4-w4-p1-kv60` | 4× NVIDIA B300 288GB | FP4 | $60.00 |
| `deepseek-v4p1-flash-1017-full-rdma-b300-fp4-w4-p1` | 4× NVIDIA B300 288GB | FP4 | $60.00 |
| DeepSeek V4.1 Flash 1017 FP4 4× B200 | 4× NVIDIA B200 180GB | FP4 | $52.00 |

The recommended shape is the **LoRA** one, so fine-tuned adapters can be served on the same deployment as the base model.

##### 3. Training: Fine-Tune Models on Your Own Data

This is the part I think is pretty awesome. Fireworks lets you improve a model for your own use case **without managing any training infrastructure**, and it covers supervised, preference and reinforcement learning.

**Pick a training method based on the data you have:**

| Method | You have | What it teaches the model |
| --- | --- | --- |
| **Supervised (SFT)** | Input/output pairs | Your task, format and tone: classification, extraction, format adherence, or distilling a larger model |
| **Direct Preference (DPO)** | Preferred vs. rejected answers | Quality and behaviour you can't measure objectively |
| **Reinforcement (RFT)** | A way to score outcomes | Full control of the RL loop through the Training API: custom rollouts, rewards and losses |

**Then pick where the training runs.** The method decides *what* the model learns; the surface decides *who* writes the training loop and *where* the GPUs come from:

- **Managed Training** (Skill, UI, CLI or API): upload a dataset, pick a method and get a model back. Fireworks runs the loop with standard recipes, **LoRA only**.
- **Training API, Serverless** (Skill or Python SDK): you write the loop in Python on shared GPUs, with nothing to provision and per-token billing. **LoRA only**, for models in the serverless pool.
- **Training API, Dedicated** (Skill or Python SDK): you write the loop on GPUs reserved for you, with **full-parameter** training and the broadest model support. Best for large workloads.

So you can go from a no-code LoRA fine-tune all the way to a hand-written RL loop doing full-parameter training, on the same platform that then serves the model.

##### 4. Batch Inference Jobs: Bulk Work Without Real-Time Serving

Similar to OpenAI's Batch API, Fireworks also runs **batch inference jobs**. Instead of sending requests one at a time and waiting on each response, you submit a whole set of requests as a single job and collect the results when it finishes.

Batch fits work where nobody is waiting on the answer: classifying or summarizing a large dataset, running evals, generating synthetic training data, or backfilling embeddings and labels. It also pairs naturally with training. You can use batch jobs to generate or score the data you then fine-tune on.

</div>
</details>

## Signal Over Breakfast

1. <a href="https://github.com/JohnHeibel/ClaudeAnimationBase" target="_blank" rel="noopener">8 GitHub repos to build videos with Claude, ranked by stars</a>
2. <a href="https://www.youtube.com/watch?v=jSsyHFW3uOs" target="_blank" rel="noopener">NVIDIA Vera Rubin-powered A5X instances are now GA on Google Cloud, one of the first to market with NVL72 rack-scale systems</a>
3. <a href="https://arxiv.org/abs/2609.12303" target="_blank" rel="noopener">Meta shows byte-based models beat token-based Llama and Gemma with one-sixth the data</a>
4. <a href="https://arxiv.org/abs/2610.26834" target="_blank" rel="noopener">Open-source memory model beats transformer rivals on long-context benchmarks</a>
5. <a href="https://huggingface.co/Comfy-Org/Fibo-2.0" target="_blank" rel="noopener">BRIA AI's image diffusion model gets repackaged for ComfyUI with int8 support</a>
6. <a href="https://huggingface.co/RecursiveSI/flint" target="_blank" rel="noopener">Recursive releases an open-weight coding model that hits 150 tokens/sec on a laptop</a>
7. **From our Signals:** <a href="/signals/ai-driven-quantum-circuit-optimization/">Quantum Leap: how AI-driven circuit optimization cuts gate counts and depth on noisy quantum hardware</a>
8. **From our Signals:** <a href="/signals/pysr-symbolic-regression-discover-mathematical-laws-from-data/">PySR: discover mathematical laws from data with symbolic regression</a>

## Repo Radar

### 1. OOMWOO (makerspet/oomwoo): An Open-Source Robot Vacuum You Build Yourself

Your robot vacuum knows the layout of your entire home, and it sends that map to someone else's cloud. What if you could build one that keeps the map to itself, and you can open it, fix it and reprogram it yourself?

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

A Roomba costs around $500. **OOMWOO** is an open-source robot vacuum you build yourself instead: a Raspberry Pi for the brain, a 3D-printed body, and a cheap 2D lidar that maps your home.

![OOMWOO open-source robot vacuum: 3D render of the round 3D-printed body from above, next to its charging dock](/assets/newsletter/weekly-tech-brew-2026-10-26/oomwoo-open-source-robot-vacuum-top.png){: .nl-hero}

It navigates with ROS 2 and Nav2, runs entirely on your local network with no cloud, and plugs into Home Assistant. The code is Apache-2.0, and the hardware files will follow under an open hardware license.

![OOMWOO DIY robot vacuum underside: drive wheels, main brush roll and the docking contacts](/assets/newsletter/weekly-tech-brew-2026-10-26/oomwoo-open-source-robot-vacuum-underside.png){: .nl-hero}

It won't match a Dyson. But if you like DIY projects, you get a real robot you can open up, repair and reprogram.

![OOMWOO Raspberry Pi robot vacuum with the cover off, showing the circuit board, motors and dust bin inside](/assets/newsletter/weekly-tech-brew-2026-10-26/oomwoo-open-source-robot-vacuum-internals.png){: .nl-hero}

One catch: it isn't buildable yet. For now you can run it in simulation while the hardware gets finished.

<a class="nl-source" href="https://github.com/makerspet/oomwoo" target="_blank" rel="noopener">View makerspet/oomwoo on GitHub &rarr;</a>

</div>
</details>

### 2. Audio Studio MCP (kanaworksai-hue/audio-studio-mcp): A Local AI Sound Studio for Claude Code

Ask Claude Code for "a creaky door in a stone hallway" or "a 60-second lo-fi loop at 85 BPM", and get back a finished audio file. No stock-sound sites, no cloud, no API key: the music and sound effects are generated on your own machine.

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

![Audio Studio MCP: local AI music and sound effects for Claude Code and any MCP client, powered by Stable Audio 3 on Mac and Windows](/assets/newsletter/weekly-tech-brew-2026-10-26/audio-studio-mcp-local-ai-music-sound-effects.png){: .nl-hero}

**Audio Studio MCP** is an MCP server that plugs Stability AI's **Stable Audio 3** model into Claude Code, Claude Desktop, Cursor or any other MCP client. You describe a sound in plain language, and your coding agent generates it, edits it and exports it in the format your project needs.

Why it's useful: every game or video needs dozens of small sounds, and finding, licensing and trimming them by hand is slow. Here the agent handles the whole loop in one conversation:

- **Generate** background music, instrument loops or sound effects from one sentence, with up to 4 candidates per request.
- **Edit** a clip: re-style it, regenerate just one section, or extend a 20-second track to 40.
- **Finish** it for production: seamless loops, fades, loudness normalization (LUFS) and 48 kHz WAV, OGG or FLAC export, ready for Godot, Unity or a video editor.

It runs on an Apple Silicon Mac (M1 or later, 16 GB RAM recommended) or a Windows PC with an NVIDIA GPU (8 GB+ VRAM), and nothing is uploaded. It is also fast: on an RTX 3060, 20 seconds of music takes about 1.3 seconds once the model is loaded. Every file gets a `.json` sidecar with its prompt and seed, so you can reproduce any sound later.

One catch: the server code is MIT, but the Stable Audio 3 model weights are under the Stability AI Community License. Read it before shipping generated audio in a commercial product.

<a class="nl-source" href="https://github.com/kanaworksai-hue/audio-studio-mcp" target="_blank" rel="noopener">View kanaworksai-hue/audio-studio-mcp on GitHub &rarr;</a>

</div>
</details>

## Signals from My Corner

For technology, AI, science, and space: the latest long reads from my own blog.

### 1. Coding with Opus 5.5: How I Use It, What's Different from Opus 5, and Its Best Use Cases

Published: October 2026 &middot; Claude &middot; Opus 5.5 &middot; Claude Code &middot; Agentic Coding &middot; Prompt Engineering
{: .nl-repo-meta}

How I code with Claude Opus 5.5: what changed from Opus 5, which old prompting habits to delete, and the decisions.md, flow.md and task.md files I keep.

<a class="nl-source" href="/ai%20engineering/2026/10/24/coding-with-claude-opus-5-5/">Read More &rarr;</a>

### 2. The Paradox of Open Source Security: Why Firefox Hides Its Own Tests

Published: October 2026 &middot; Open Source &middot; Firefox &middot; Mozilla &middot; Cybersecurity &middot; Responsible Disclosure
{: .nl-repo-meta}

Open source security has a paradox: Firefox publishes every line of code, yet hides the tests for its security fixes. Here's why Mozilla does it.

<a class="nl-source" href="/2026/10/23/why-firefox-hides-its-own-security-tests/">Read More &rarr;</a>

### 3. The Orbital Laboratory

Published: October 2026 &middot; Space Medicine &middot; Microgravity Research &middot; International Space Station &middot; Artificial Retina &middot; Organoids &middot; SpaceX Dragon
{: .nl-repo-meta}

Space as a living laboratory for discovering new treatments, understanding human biology, and solving medical challenges on Earth.

<a class="nl-source" href="/2026/10/19/orbital-laboratory-space-medicine/">Read More &rarr;</a>

### 4. Will Starlink Work in India?

Published: October 2026 &middot; Starlink &middot; Satellite Internet &middot; SpaceX &middot; India &middot; NavIC
{: .nl-repo-meta}

Will Starlink work in India? How low Earth orbit satellite internet works, why India can't fully trust a foreign network, and what it's building instead.

<a class="nl-source" href="/2026/10/19/will-starlink-work-in-india/">Read More &rarr;</a>

<h2 id="beyond-the-abstract" class="nl-icon-heading"><img class="nl-section-icon" src="/assets/newsletter/weekly-tech-brew-2026-10-26/beyond-the-abstract-telescope-icon.png" alt="Beyond The Abstract telescope icon: research papers section of The Weekly Tech Brew" width="44" height="48"> Beyond The Abstract</h2>

**Five papers. Five ideas worth understanding. No filler.**

### 1. Cache Engineering for Agents

We've spent a lot of time on memory engineering and context engineering, and more recently on [loop engineering and graph engineering](/ai%20engineering/2026/08/22/context-engineering-loop-graph-engineering/). This paper adds a new layer underneath them: **cache engineering**.

The authors introduce the **AKV serving engine**, which lets an LLM agent manage its own KV cache directly. Two operations do the work: **drop** removes selected parts of the cache from future attention, and **repos** shifts the position encodings of what's kept. The agent can trim its working memory without rewriting the text prefix or re-running prefill on the context it keeps.

Compared with the usual approach of summarising once the context hits a threshold, it **cuts average cost by 27.7%**, delivers **up to 1.2x the output throughput** and makes **P95 latency 1.5x faster**, while keeping task accuracy high.

<a class="nl-source" href="https://arxiv.org/abs/2610.28577" target="_blank" rel="noopener">Read the paper on arXiv &rarr;</a>

### 2. Gen2Sim: Scaling up Robot Learning in Simulation with Generative Models

Training robots with reinforcement learning has a human bottleneck: someone has to build each simulated environment, model every object and hand-write a reward function for every task. **Gen2Sim** hands that work to generative models.

It turns ordinary 2D images of objects into 3D simulation assets using image diffusion models, and asks an LLM to estimate plausible physics parameters for each object. An LLM then writes the **task descriptions**, breaks each task into **ordered sub-steps**, and writes a **Python reward function** for each step.

That decomposition is the key result: Gen2Sim learns long-horizon tasks where RL with a single, non-decomposed reward fails. The authors also release hundreds of simulated assets, tasks and demonstrations. It's a 2023 paper, but it was an early blueprint for today's push to scale up robot learning in simulation.

<a class="nl-source" href="https://arxiv.org/abs/2310.18308" target="_blank" rel="noopener">Read the paper on arXiv &rarr;</a>

### 3. EmbodiedGen V2: An Agentic, Simulation-Ready 3D World Engine for Embodied AI

If Gen2Sim showed generative models could build individual tasks, **EmbodiedGen V2** scales the idea up to whole worlds. The goal is to construct training environments automatically instead of hand-building every scene.

It generates **executable, simulation-ready environments** for embodied policies: 3D assets that work across simulators, interaction affordances (how a robot can use each object), task-driven worlds and large multi-room scenes. Everything stays editable and reusable, so a generated world can be changed and used again rather than rebuilt from scratch.

The numbers are strong. Generated assets reach **96.5% human acceptance** and a **98.6% collision success rate**. Running online reinforcement learning in the generated environments lifts simulated task success from **9.7% to 79.8%**, and the gains carry over to real robots, where task success rises from **21.7% to 75.0%**.

<a class="nl-source" href="https://arxiv.org/abs/2607.07459" target="_blank" rel="noopener">Read the paper on arXiv &rarr;</a>

### 4. Toward Recursive Self-Improvement in Physical AI

**Recursive self-improvement (RSI)** means a system gets better at a task *and* gets better at the way it gets better. Digital agents already do a version of this: they rewrite their own code and check each new version against executable tests. This paper asks what it would take for robots to do the same.

The physical world is much harder. A robot sees only part of its surroundings, every trial costs time and hardware, conditions keep changing, and some mistakes can't be undone. The authors map out the path from improving a robot's skills to improving the processes that produce those skills. They name **four conditions** a gain needs to carry forward: the feedback has to target what the robot still needs to learn, the component receiving the change has to be able to use it, the improvement has to survive new tasks or new hardware, and further practice has to stay safe and affordable.

The honest verdict: most existing work is in manipulation. It shows robots improving their behaviour, speeding up later learning and refining their training procedures, and some systems even update the improver's own knowledge or tools. But none of the physical studies reviewed have yet shown a gain that comes **from the recursion itself**. The paper closes with evaluation principles and research directions for robots that, trial by trial, safely get better at getting better.

<a class="nl-source" href="https://arxiv.org/abs/2610.29677" target="_blank" rel="noopener">Read the paper on arXiv &rarr;</a>

### 5. World Model for Robot Learning: A Comprehensive Survey

A **world model** is a robot's internal prediction engine: given what it sees and the action it's about to take, it predicts what happens next. World models now sit at the centre of robot learning. They're used to train policies, plan ahead, simulate, evaluate and generate training data, and they've moved fast thanks to foundation models and large-scale video generation.

The problem is that the research is scattered across different architectures, roles and application areas. This survey pulls it together from a robot-learning point of view. It covers how world models plug into robot policies, how they act as **learned simulators** for reinforcement learning and evaluation, and how robotic **video world models** evolved from free-form "imagination" to controllable, structured, foundation-scale systems. It also extends the picture to navigation and autonomous driving.

It's a good map of the field, and a fitting close to this week's papers: Gen2Sim and EmbodiedGen V2 *build* worlds for robots to learn in, while world models let robots *predict* them. The survey also catalogues the main datasets, benchmarks and evaluation protocols, lays out the open challenges, and comes with a GitHub repository the authors plan to keep updated as new work appears.

<a class="nl-source" href="https://arxiv.org/abs/2605.00080" target="_blank" rel="noopener">Read the paper on arXiv &rarr;</a>
