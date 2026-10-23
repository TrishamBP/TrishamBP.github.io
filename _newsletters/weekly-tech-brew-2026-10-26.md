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
