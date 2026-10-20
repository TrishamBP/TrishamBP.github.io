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

## Signal Over Breakfast

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
