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
