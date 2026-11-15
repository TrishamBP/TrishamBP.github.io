---
layout: post
title: "The Weekly Tech Brew"
subtitle: "by Trisham Patil"
wip: true
date: 2026-11-16
author: Trisham Patil
email_subject: "The Weekly Tech Brew #6: This Week in AI, Tech & World News"
seo_title: "AI News This Week: Model Releases, Tech & World News | The Weekly Tech Brew #6"
description: "The Weekly Tech Brew #6: this week's top AI and tech news, new AI model releases, engineering deep dives and AI research papers, explained for engineers."
keywords: "AI newsletter, AI news this week, weekly tech news, AI model releases, LLM news, AI engineering, AI research papers, world news, The Weekly Tech Brew"
---

## The World Brief

<p class="nl-section-kicker">Global News &middot; Geopolitics &middot; Economy &middot; Technology</p>

### 1. The Boardroom Power Play: Why Jensen Huang Couldn't Survive the Scandal

Jensen Huang's resignation as **NVIDIA CEO** after a major personal and corporate scandal raises a fascinating question: **how much power does a company's board really have?** Why can NVIDIA's board remove its founder, while **Mark Zuckerberg at Meta** and **Larry Page at Google** enjoy far greater protection through their ownership and voting structures?

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

![Dual-class shares chart: Mark Zuckerberg's 13.5% equity carries 61% of Meta's votes and Page and Brin's under-12% stake carries 52.7% of Alphabet's votes, while NVIDIA uses one share, one vote](/assets/newsletter/weekly-tech-brew-2026-11-16/dual-class-shares-founder-voting-power-meta-alphabet-nvidia.png){: .nl-hero}

*Founders of Meta and Alphabet control a majority of shareholder votes with a minority of the equity. NVIDIA has no super-voting class.*

#### What Are Class A and Class B Shares?

Class A and Class B shares are part of a **dual-class stock structure**. It separates a company's **financial ownership** (who gets the profits) from its **voting control** (who makes the decisions).

Most public companies follow a simple **"one share, one vote"** rule. Founders of big tech companies like Meta and Alphabet instead split their stock into different classes before going public. That let them raise billions of dollars from public investors without giving up control of the company.

#### How the Share Classes Differ

| Share Class | Who Owns Them | Voting Power | Financial Value & Dividends |
|---|---|---|---|
| **Class A** | General public & institutional funds (traded on stock exchanges, e.g. GOOGL, META) | 1 vote per share | Equal share of profits and dividends |
| **Class B** | Founders & early insiders only (never traded publicly) | 10 votes per share ("super-voting") | Equal share of profits and dividends |
| **Class C** | Public investors & employees (e.g. Alphabet's GOOG) | 0 votes per share | Equal share of profits and dividends |

*Companies issue Class C shares so they can pay employees in stock or raise funds without issuing new voting shares that would dilute the founders' majority.*

#### Why the Board Cannot Kick Zuckerberg or Brin Out

In a standard company, shareholders elect the **Board of Directors**, and the board has the power to hire or fire the CEO.

That is how **Steve Jobs** was pushed out of Apple in 1985 and **Sam Altman** was temporarily ousted from OpenAI in 2023.

At Meta and Alphabet, that chain of command is locked by pure arithmetic.

**Minority equity, majority votes:**

- **Mark Zuckerberg (Meta):** owns roughly **13.5%** of Meta's total equity, almost entirely in Class B shares. Because each Class B share carries 10 votes, that stake translates into **61% of all voting power**.
- **Sergey Brin & Larry Page (Alphabet):** together the co-founders hold **under 12%** of Alphabet's economic stake, yet their Class B shares give them **52.7% of total voting power** (27.4% for Page and 25.3% for Brin).

**The boardroom checkmate:**

- Under corporate law, shareholders vote on who sits on the board.
- Zuckerberg (61%) and Brin + Page (52.7% combined) hold more than 50% of the votes by themselves, so they **single-handedly decide who is elected to or removed from the board**.
- Even if every independent director turned against the founders, the founders could call a shareholder vote, replace the entire board and appoint directors who support them.
- Giant institutional investors like **BlackRock** or **Vanguard** are just as powerless. Even if every outside shareholder voted together, they would still hold less than half the votes.

#### When Does Their Control End?

Super-voting Class B shares cannot be sold to outsiders as super-voting stock.

Under both Meta's and Alphabet's corporate charters, the moment a founder **sells, transfers or gifts** a Class B share to an outside party, or **passes away**, that share automatically converts 1-for-1 into an ordinary Class A share with just 1 vote.

Unless Zuckerberg or Brin voluntarily step down, or sell enough shares to drop below the 50% voting threshold, they remain effectively untouchable.

</div>
</details>

### 2. When Microsoft Goes Dark: The Global Outage That Took Down Outlook and Teams

One infrastructure failure, millions of disruption reports, and businesses around the world suddenly unable to reach their digital workplaces. **Microsoft's November outage** exposes a critical weakness in **cloud dependency**: when the infrastructure layer fails, the entire productivity ecosystem can come crashing down.

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

![Microsoft 365 outage diagram: a faulty update in the shared caching and M365 Substrate layer takes down Outlook, Teams, SharePoint and the Admin Center at once](/assets/newsletter/weekly-tech-brew-2026-11-16/microsoft-365-outage-outlook-teams-shared-infrastructure-failure.png){: .nl-hero}

*Outlook, Teams, SharePoint and the admin portals all sit behind the same shared backend layers.*

This is a **cascading infrastructure failure in Microsoft 365**, most notably seen in Microsoft's global outage in **November 2024** (tracked under incident IDs **MO941162** and **EX941560**). A single defect in a shared backend layer took down **Outlook, Microsoft Teams, SharePoint and the admin portals** for millions of users worldwide at the same time.

Users see Outlook and Teams as separate apps. Underneath, both are tightly coupled to the **same gateway, identity and data-storage layers**.

![Microsoft 365 network architecture: Office 365 clients connect through the customer WAN and egress security stack to a Microsoft network POP, the Service Front Door and Microsoft data centers](/assets/newsletter/weekly-tech-brew-2026-11-16/microsoft-365-network-architecture-service-front-door.png)

*How Microsoft 365 traffic flows from client devices to Microsoft's data centers.*

As the architecture above shows, traffic from every client device passes through a shared **Service Front Door** and common data center infrastructure before it reaches individual apps. When a core layer in that pipeline fails, every app behind it goes dark together.

#### How One Failure Triggered a Global Blackout

**1. A faulty update in the caching layer**

During the November 2024 incident, an update introduced a defect into a **shared caching tier** serving Exchange Online and Microsoft 365.

Instead of serving fast responses from memory, the affected caching nodes began failing and dropping requests.

**2. Cache stampede (backend overload)**

When the caching tier stopped absorbing traffic, millions of client connections bypassed the cache and hit the core mailbox and routing servers directly.

This sudden surge, known in distributed systems as a **thundering herd** or **cache stampede**, quickly exhausted compute and memory capacity across multiple regions.

**3. Why Teams collapsed alongside Outlook**

Many organisations treat Teams as a fallback when email goes down, assuming the two run independently. Under the hood, Teams depends heavily on **Exchange Online** and the **Microsoft 365 Substrate**:

- **Calendars & meetings:** Teams reads and writes meeting schedules directly from a user's Exchange mailbox.
- **Chats & compliance:** chat history, contact cards and voicemail records are indexed and stored through shared Substrate/Exchange services.

**Result:** once Exchange's caching and routing tier choked, Teams lost calendar sync, message delivery stalled, and connection timeouts spread across desktop and mobile clients.

**4. Control-plane lockout**

The **Microsoft 365 Admin Center** relies on the same shared infrastructure. IT administrators were locked out of service-health dashboards and tenant controls.

Meanwhile Microsoft rolled back the faulty change, restarted the affected caching nodes and throttled background sync traffic over **roughly 24 hours**.

#### The Core Cloud Dependency Vulnerability

Modern SaaS productivity suites reach massive scale by consolidating critical services onto **shared infrastructure**. That creates **high-blast-radius single points of failure**:

| Shared Infrastructure Layer | Role in the Ecosystem | Impact When It Fails |
|---|---|---|
| **Edge Routing (Service Front Door)** | Terminates TLS and routes global traffic to the nearest healthy cluster | Clients cannot reach endpoints at all; apps appear completely offline |
| **Shared Caching & M365 Substrate** | Handles hot mailbox, chat, presence and calendar state at scale | Cascading backend overload knocks out Outlook, Teams and SharePoint at once |
| **Identity Plane (Entra ID)** | Issues OAuth tokens and validates active sessions | Total sign-in lockout across Microsoft apps and third-party SSO tools |

Enterprises standardise almost entirely on a single cloud ecosystem for email, chat, file storage and identity. So a single misconfiguration at the infrastructure layer can immediately halt day-to-day operations across entire organisations.

</div>
</details>

### 3. America Grounded: How a Network Upgrade Disrupted 14,000 Flights

![FAA nationwide ground stop: a passenger watches a departure board at New York LaGuardia airport full of delayed and canceled flights](/assets/newsletter/weekly-tech-brew-2026-11-16/faa-ground-stop-flight-cancellations-departure-board-laguardia.jpg){: .nl-hero}

According to **Transportation Secretary Sean Duffy**, a contractor, **L3Harris**, was doing routine maintenance to replace outdated **copper telecommunications wiring** with **fibre-optic** infrastructure.

During the upgrade:

- New equipment and a router were introduced.
- The system began generating excessive connection attempts.
- The traffic overloaded other routers in the legacy network.
- Radar and communications data became inconsistent across air traffic control facilities.

This affected **all 22 en-route air traffic control centres**. The exact underlying fault, including whether it was equipment failure or contractor error, remains under investigation.

<details class="nl-expand nl-expand--release">
<summary><span class="nl-expand-more">Expand</span><span class="nl-expand-less" hidden>Collapse</span></summary>
<div class="nl-expand-body" markdown="1">

![FAA air traffic control radar console: a controller works at legacy radar and communications equipment in an en-route air traffic control center](/assets/newsletter/weekly-tech-brew-2026-11-16/faa-air-traffic-control-radar-console-legacy-equipment.jpg){: .nl-hero}

*Much of the US air traffic control network still runs on decades-old telecom hardware. (Representative image)*

On **Friday, November 13, 2026**, the US **Federal Aviation Administration (FAA)** issued a rare **nationwide ground stop**. It halted all flight departures across the United States for **4 hours and 21 minutes** (3:54 PM to 8:15 PM EST).

The cause was a major telecommunications failure that disrupted radar and radio communications across all **22 regional Air Route Traffic Control Centers**.

It was only the **third nationwide ground stop in US history**, after the September 11, 2001 attacks and the January 2023 NOTAM computer outage.

#### What Caused the FAA Outage?

According to briefings from Transportation Secretary Sean Duffy, Homeland Security Secretary Markwayne Mullin and preliminary FAA findings, the failure was a **hardware and packet-flooding cascade during infrastructure upgrades**, not a cyberattack.

**1. Routine copper-to-fibre migration**

A contractor was moving FAA telecommunications lines from legacy **1980s-era copper wiring** to modern fibre-optic lines.

**2. Router flooding**

A newly installed router began flooding the private air traffic control network with roughly **1,000 connection attempts every 4 to 5 seconds**.

**3. Legacy hardware collapse**

That surge overwhelmed ageing switches and legacy **Cisco 600-series routers** (manufactured between 2001 and 2006).

The overloaded routers started injecting out-of-sync data packets into the network. That caused static on pilot-controller radio frequencies and made radar screens flash or go blank.

**4. Safety shutdown**

More than **3,500 aircraft** were already airborne when radar and radio instability began at **3:36 PM EST**. The FAA froze all new departures nationwide so controllers would not lose visibility over busy airspace.

Officials explicitly ruled out both a **cyberattack** and the FAA's newly deployed **"SMART" AI traffic-management tool** as causes.

#### Scale of the Disruption

| Metric / Impact Area | Details |
|---|---|
| **Ground Stop Window** | 3:54 PM – 8:15 PM EST on Nov 13 (4 hours, 21 minutes) |
| **Flight Cancellations** | Over 12,000 flights canceled on Friday, plus up to 5,000 more on Saturday as airlines scrambled to reposition aircraft and crews |
| **Delays & Diversions** | More than 10,500 flights delayed and at least 827 diverted; airborne planes were safely guided to land |
| **International Ripple Effect** | At the FAA's request, Eurocontrol temporarily suspended flights departing Europe for the US across 42 member states |
| **Recovery Timeline** | Full US airline schedules were projected to return to normal by the end of Sunday, November 15 |

#### Why This Happened Again: The Structural Issue

Much like single-point-of-failure outages in cloud infrastructure, the incident exposed how fragile the **US National Airspace System's telecom backbone** remains.

Modern IP switches stayed online during Friday's incident. But they are still bridged into **decades-old analog copper circuits** and **20-year-old routers**, so a single misconfigured node during a routine upgrade can cascade across all 22 en-route centres at once.

For more on how airports and airlines handled the aftermath, watch *Airports warn more delays expected after FAA lifts ground stop*, which covers the flight cancellations and recovery timeline after the ground stop.

</div>
</details>
