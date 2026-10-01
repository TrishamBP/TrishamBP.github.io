/* ---------------------------------------------------------------------------
   Neural Compute Core — DOM overlay
   ---------------------------------------------------------------------------
   Inspector panel, system map, view controls, hover tooltip, chapter captions
   and the telemetry HUD. Everything is generated from componentsData so the
   scene and the UI can never disagree. All writes go through textContent,
   and per-frame writes only happen when a value actually changes.
   ------------------------------------------------------------------------ */

export class UI {
  constructor(root, { components, mapGroups, handlers }) {
    this.root = root;
    this.components = components;
    this.handlers = handlers;
    const q = (s) => root.querySelector(s);
    this.el = {
      viewport: q(".nc-viewport"),
      inspector: q(".nc-inspector"),
      eyebrow: q(".nc-inspector-eyebrow"),
      name: q(".nc-inspector-name"),
      desc: q(".nc-inspector-desc"),
      chips: q(".nc-chips"),
      facts: q(".nc-facts"),
      tooltip: q(".nc-tooltip"),
      tipName: q(".nc-tooltip b"),
      tipSub: q(".nc-tooltip span"),
      chapter: q(".nc-chapter"),
      chIndex: q(".nc-chapter-index"),
      chTitle: q(".nc-chapter-title"),
      chBody: q(".nc-chapter-body"),
      chBar: q(".nc-chapter-progress i"),
      groups: q(".nc-map-groups"),
      list: q(".nc-map-list"),
      hudPhase: q('[data-nc-hud="phase"]'),
      hudKv: q('[data-nc-hud="kv"]'),
      hudTokens: q('[data-nc-hud="tokens"]'),
      motion: q("[data-nc-motion]"),
    };
    this.cache = {};
    this.tipVisible = false;
    this.buildMap(mapGroups);
    this.bind();
  }

  buildMap(mapGroups) {
    const { groups, list } = this.el;
    this.groupButtons = new Map();
    this.entryButtons = [];
    for (const g of mapGroups) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nc-ctl nc-group";
      b.dataset.group = g.id;
      b.setAttribute("aria-pressed", "false");
      b.textContent = g.label;
      groups.appendChild(b);
      this.groupButtons.set(g.id, b);
    }
    this.components.forEach((c, i) => {
      const li = document.createElement("li");
      li.dataset.group = c.data.mapGroup;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nc-entry";
      b.dataset.index = String(i);
      b.textContent = c.data.name;
      li.appendChild(b);
      list.appendChild(li);
      this.entryButtons.push(b);
    });
  }

  bind() {
    const h = this.handlers;
    const root = this.root;
    root.addEventListener("click", (e) => {
      const t = e.target.closest("button, a");
      if (!t || !root.contains(t)) return;
      if (t.dataset.group) h.group(t.dataset.group);
      else if (t.dataset.index) h.select(Number(t.dataset.index));
      else if (t.dataset.ncMode) h.mode(t.dataset.ncMode);
      else if (t.dataset.ncZoom) h.zoom(t.dataset.ncZoom === "in" ? 0.8 : 1.25);
      else if (t.hasAttribute("data-nc-reset")) h.reset();
      else if (t.hasAttribute("data-nc-motion")) h.motion();
      else if (t.dataset.ncStep) h.step(Number(t.dataset.ncStep));
      else if (t.hasAttribute("data-nc-close")) h.close();
      else if (t.hasAttribute("data-nc-explore")) {
        if (h.explore()) e.preventDefault();
      }
    });
  }

  showInspector(c) {
    const d = c.data;
    const el = this.el;
    el.eyebrow.textContent = d.category.toLowerCase() === d.mapGroup.toLowerCase() ? d.category : `${d.category} · ${d.mapGroup}`;
    el.name.textContent = d.name;
    el.desc.textContent = d.description;
    el.chips.textContent = "";
    for (const t of d.technologies) {
      const li = document.createElement("li");
      li.textContent = t;
      el.chips.appendChild(li);
    }
    el.facts.textContent = "";
    for (const [k, v] of Object.entries(d.metadata)) {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      el.facts.append(dt, dd);
    }
    el.inspector.hidden = false;
    this.root.classList.add("nc-has-selection");
    this.entryButtons.forEach((b, i) => b.setAttribute("aria-current", i === c.index ? "true" : "false"));
  }

  hideInspector() {
    this.el.inspector.hidden = true;
    this.root.classList.remove("nc-has-selection");
    this.entryButtons.forEach((b) => b.setAttribute("aria-current", "false"));
  }

  setGroup(id) {
    for (const [gid, b] of this.groupButtons) b.setAttribute("aria-pressed", gid === id ? "true" : "false");
    this.root.classList.toggle("nc-has-group", !!id);
    for (const b of this.entryButtons) {
      const li = b.parentElement;
      li.hidden = !!id && li.dataset.group !== id;
    }
  }

  setMode(mode) {
    this.root.querySelectorAll("[data-nc-mode]").forEach((b) => b.setAttribute("aria-checked", b.dataset.ncMode === mode ? "true" : "false"));
    this.root.classList.toggle("nc-explore-mode", mode === "explore");
  }

  setMotionPaused(paused) {
    this.el.motion.setAttribute("aria-pressed", paused ? "true" : "false");
    this.el.motion.textContent = paused ? "Resume motion" : "Pause motion";
  }

  showTooltip(c, x, y) {
    const el = this.el;
    if (this.cache.tip !== c.index) {
      this.cache.tip = c.index;
      el.tipName.textContent = c.data.name;
      el.tipSub.textContent = c.data.mapGroup;
    }
    /* Keep the label inside the viewport even when the anchor is near an edge. */
    const vw = el.viewport.clientWidth;
    const vh = el.viewport.clientHeight;
    const tx = Math.min(Math.max(x + 14, 8), vw - el.tooltip.offsetWidth - 8);
    const ty = Math.min(Math.max(y - 18, 8), vh - el.tooltip.offsetHeight - 8);
    el.tooltip.style.transform = `translate3d(${Math.round(tx)}px, ${Math.round(ty)}px, 0)`;
    if (!this.tipVisible) {
      el.tooltip.classList.add("is-visible");
      this.tipVisible = true;
    }
  }

  hideTooltip() {
    if (!this.tipVisible) return;
    this.el.tooltip.classList.remove("is-visible");
    this.tipVisible = false;
  }

  setChapter(ch) {
    if (this.cache.chapter === ch) return;
    this.cache.chapter = ch;
    const el = this.el;
    el.chIndex.textContent = `${ch.index} / 04`;
    el.chTitle.textContent = ch.title;
    el.chBody.textContent = ch.body;
  }

  setChapterProgress(k) {
    const v = Math.round(k * 100);
    if (this.cache.chBar === v) return;
    this.cache.chBar = v;
    this.el.chBar.style.transform = `scaleX(${v / 100})`;
  }

  setHud(sim, tokens) {
    const el = this.el;
    const used = Math.round(sim.kvFill * sim.kv.count);
    if (this.cache.phase !== sim.phase) el.hudPhase.textContent = this.cache.phase = sim.phase;
    if (this.cache.kv !== used) {
      this.cache.kv = used;
      el.hudKv.textContent = `${used}/${sim.kv.count} blocks`;
    }
    if (this.cache.tokens !== tokens) el.hudTokens.textContent = String((this.cache.tokens = tokens));
  }
}
