---
layout: default
title: Physical Systems
seo_title: "Physical Systems — Propulsion, Thermal Management & Embodied Intelligence"
description: "Physical Systems by Trisham Patil: engineering notes on propulsion, aerospace thermal management, fluid dynamics and embodied intelligence in physical machines."
keywords: "physical systems, propulsion, aerospace thermal management, fluid dynamics, embodied intelligence, hypersonic cooling, jet engines, robotics, Trisham Patil"
permalink: /physical-systems/
---

{%- comment -%}
  Physical Systems skin (css/physical-systems.css + assets/js/physical-systems.js):
  the canvas below is a fixed full-screen backdrop, an original scene drawn
  in code: cyan wireframe turbines on a blueprint floor (propulsion) crossed
  by orange flow streamlines and violet planes (fluid dynamics / embodied
  intelligence). No images or text are used in it.
{%- endcomment -%}
<canvas class="ps-canvas" aria-hidden="true"></canvas>

<section class="content-section ps-section" aria-labelledby="ps-heading">
  <p class="ps-eyebrow"><span class="ps-dot" aria-hidden="true"></span>Propulsion &middot; Thermal Systems &middot; Embodied Intelligence</p>
  <h1 id="ps-heading" class="section-title">Physical Systems</h1>
  <p class="research-intro">
    Engineering notes on the machines AI is starting to move into: jet and rocket propulsion,
    aerospace thermal management, fluid dynamics, and embodied intelligence in physical systems.
  </p>

  <div class="ps-tracks" aria-label="Topics">
    <article class="ps-track ps-track--blue">
      <h2>Propulsion &amp; Thermal Protection</h2>
      <p>Hypersonic combustors, film and regenerative cooling, and the heat budgets of high-speed flight.</p>
    </article>
    <article class="ps-track ps-track--orange">
      <h2>Fluid Dynamics &amp; Heat Transfer</h2>
      <p>Microchannels, heat exchangers and conjugate heat transfer, from radar modules to fuel systems.</p>
    </article>
    <article class="ps-track ps-track--violet">
      <h2>Embodied Intelligence</h2>
      <p>Where learning systems meet actuators, sensors and real-world physics.</p>
    </article>
  </div>
</section>

<script src="{{ '/assets/js/physical-systems.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>
