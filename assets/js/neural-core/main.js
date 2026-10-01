/* ---------------------------------------------------------------------------
   Neural Compute Core — entry point
   ---------------------------------------------------------------------------
   Boots the homepage 3D hero:
     1. capability checks (WebGL2, reduced motion, small / touch / low-end
        devices) → static fallback when needed
     2. renderer, scene hierarchy (CORE / COMPUTE / MEMORY / NETWORK /
        RETRIEVAL / AGENTS / OBSERVABILITY) and the 18 component groups
     3. interaction: raycast hover, click / tap select, keyboard navigation,
        system map, explore vs system-view mode
     4. one render loop that drives the flows simulation, micro-animations,
        emphasis, camera rig, scroll story, tooltip and HUD

   Loaded from _includes/head.html as <script type="module">; `three` and
   `three/addons/` resolve through the import map to /assets/vendor/three/.
   ------------------------------------------------------------------------ */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { componentsData, MAP_GROUPS, SCENE_GROUPS, storyKeyframes, storyChapters } from "./componentsData.js";
import { buildChassis, buildComponent, makeAccent, makeGlowTexture } from "./modules.js";
import { Flows, createSim } from "./flows.js";
import { CameraRig } from "./camera.js";
import { UI } from "./ui.js";

const root = document.getElementById("neural-core");
if (root) boot();

function boot() {
  const params = new URLSearchParams(location.search);
  const force = params.get("nc"); // "static" | "3d" — testing overrides
  const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 720 || coarse;
  const conn = navigator.connection;
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2 || (conn && conn.saveData);

  measureLayout();
  window.addEventListener("resize", measureLayout, { passive: true });

  if (force === "static") return showStatic("forced");
  if (!hasWebGL2()) return showStatic("webgl");
  if (lowEnd && small && force !== "3d") return showStatic("lowpower");

  try {
    start({ small, coarse, reducedQuery });
  } catch (err) {
    console.warn("[neural-core] falling back to static view:", err);
    showStatic("error");
  }
}

/* Full-bleed width without the 100vw scrollbar overflow, and the sticky
   offset under the site's sticky top nav. */
function measureLayout() {
  const nav = document.querySelector(".topnav");
  root.style.setProperty("--nc-nav", (nav ? nav.offsetHeight : 0) + "px");
  root.style.setProperty("--nc-vw", document.documentElement.clientWidth + "px");
}

function hasWebGL2() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch (e) {
    return false;
  }
}

function showStatic(reason) {
  root.classList.remove("nc-is-live", "nc-story");
  root.classList.add("nc-is-static");
  root.dataset.ncFallback = reason;
}

function start({ small, coarse, reducedQuery }) {
  const viewport = root.querySelector(".nc-viewport");
  let reducedMotion = reducedQuery.matches;
  let motionPaused = reducedMotion;
  /* Render-loop flags, declared first because setup code calls invalidate(). */
  let running = false;
  let raf = 0;
  let dirty = 2;

  /* ------------------------------ renderer ----------------------------- */
  const renderer = new THREE.WebGLRenderer({ antialias: !small, powerPreference: "high-performance", alpha: false });
  const maxDpr = small ? 1.5 : 2;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 1);
  const canvas = renderer.domElement;
  canvas.className = "nc-canvas";
  canvas.setAttribute("aria-hidden", "true");
  viewport.appendChild(canvas);

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stopLoop();
    showStatic("contextlost");
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 24, 52);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.32;
  room.dispose();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);

  scene.add(new THREE.HemisphereLight(0x9aa2b0, 0x050505, 0.22));
  const key = new THREE.DirectionalLight(0xdfe8ff, 1.5);
  key.position.set(6, 10, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4f7dff, 0.55);
  rim.position.set(-8, 4, -10);
  scene.add(rim);
  const coreLight = new THREE.PointLight(0xff8a3c, 0, 9, 1.6);
  coreLight.position.set(0, 2.2, 0);
  scene.add(coreLight);

  /* ------------------------------ hierarchy ---------------------------- */
  const machine = new THREE.Group();
  machine.name = "NEURAL_COMPUTE_CORE";
  scene.add(machine);
  machine.add(buildChassis());
  const sceneGroups = {};
  for (const name of SCENE_GROUPS) {
    const g = new THREE.Group();
    g.name = name;
    machine.add(g);
    sceneGroups[name] = g;
  }

  const glow = makeGlowTexture();
  const proxies = [];
  const box = new THREE.Box3();
  const components = componentsData.map((data, index) => {
    const accent = makeAccent(data.color, 0.9);
    const part = buildComponent(data.id, { accent, glow, quality: { low: small } });
    const holder = new THREE.Group();
    holder.name = data.id;
    holder.add(part.group);

    part.group.updateMatrixWorld(true);
    const bounds = box.setFromObject(part.group).clone();
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());

    const hits = part.proxies || [new THREE.Mesh(new THREE.BoxGeometry(size.x * 1.04, size.y * 1.04, size.z * 1.04), new THREE.MeshBasicMaterial({ visible: false }))];
    if (!part.proxies) hits[0].position.copy(center);
    for (const p of hits) {
      p.userData.index = index;
      holder.add(p);
      proxies.push(p);
    }

    const base = new THREE.Vector3().fromArray(data.position);
    holder.position.copy(base);
    sceneGroups[data.category].add(holder);

    /* Separation direction for explore mode / selection: outward from the
       machine axis; things on the axis lift instead (or stay put). */
    const world = center.clone().add(base);
    const dir = new THREE.Vector3(world.x, 0, world.z);
    if (dir.lengthSq() < 0.5) dir.set(0, world.y > 3 ? 1 : 0, 0);
    else dir.normalize().multiplyScalar(1).setY(0.12);

    return {
      data,
      index,
      part,
      holder,
      accent,
      base,
      dir,
      center,
      size,
      anchor: new THREE.Vector3(center.x, bounds.max.y + 0.15, center.z),
      emph: 1,
      emphTarget: 1,
      activity: 1,
      offset: 0,
      scale: 1,
    };
  });
  const byId = Object.fromEntries(components.map((c) => [c.data.id, c]));
  const parts = Object.fromEntries(components.map((c) => [c.data.id, c.part]));

  /* The spacecraft opens into a hologram while selected (satellite.js). The
     scheduler deck above it lifts clear of the exploded view. */
  const host = byId["llm-inference"];
  const holo = host && host.part.holo;
  /* Positive lifts clear of the exploded view, negative retracts into the
     deck so nothing in front blocks the hologram. */
  const HOLO_LIFT = { "cpu-control": 1.4, prefill: -2.6, decode: -2.6, "model-serving": -1.2 };
  const holoOpen = () => !!holo && selected === host.index && holo.k > 0.3;

  /* Selection / hover outlines: one reusable edge box each. */
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const selectBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xe8ecf5, transparent: true, opacity: 0.55, toneMapped: false }));
  const hoverBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x6fb2ff, transparent: true, opacity: 0.45, toneMapped: false }));
  selectBox.visible = hoverBox.visible = false;
  scene.add(selectBox, hoverBox);

  /* ------------------------------ simulation --------------------------- */
  const sim = createSim();
  const flows = new Flows({ scene, sim, glow, low: small, parts });

  /* ------------------------------ controls ----------------------------- */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 34;
  controls.maxPolarAngle = 86 * (Math.PI / 180);
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.touches = { ONE: -1, TWO: THREE.TOUCH.DOLLY_ROTATE };

  const rig = new CameraRig(camera, controls, { keyframes: storyKeyframes, reducedMotion });
  rig.onReturnToStory = () => deselect(true);

  /* Touch: one finger scrolls the page (pan-y) until the user opts into
     interaction — explore mode or a selected component — when one finger
     orbits. Two fingers always pinch-zoom / rotate. */
  function setTouchInteractive(on) {
    if (!coarse) return;
    controls.touches.ONE = on ? THREE.TOUCH.ROTATE : -1;
    canvas.style.touchAction = on ? "none" : "pan-y";
  }
  setTouchInteractive(false);

  /* Plain wheel scrolls the page (the story is scroll-driven); ctrl/⌘ +
     wheel — which is also what trackpad pinch sends — zooms. Stopping the
     event in the capture phase keeps it away from OrbitControls. */
  viewport.addEventListener(
    "wheel",
    (e) => {
      if (!(e.ctrlKey || e.metaKey)) e.stopPropagation();
    },
    { capture: true, passive: true }
  );

  /* -------------------------------- state ------------------------------ */
  let hovered = -1;
  let selected = -1;
  let kbIndex = -1;
  let activeGroup = null;
  let mode = "system";
  let progress = 0;
  let chapter = storyChapters[0];

  const ui = new UI(root, {
    components,
    mapGroups: MAP_GROUPS,
    handlers: {
      select: (i) => select(i),
      group: (id) => setGroup(activeGroup === id ? null : id),
      mode: (m) => setMode(m),
      zoom: (f) => {
        rig.zoom(f);
        invalidate();
      },
      reset: () => reset(),
      motion: () => setMotionPaused(!motionPaused),
      step: (d) => select((Math.max(selected, 0) + d + components.length) % components.length),
      close: () => deselect(),
      explore: () => {
        finishIntro();
        setMode("explore");
        viewport.focus({ preventScroll: true });
        return true;
      },
    },
  });

  function select(i, { fromPointer = false } = {}) {
    finishIntro();
    const c = components[i];
    if (!c) return;
    selected = i;
    kbIndex = i;
    holo?.set(i === host.index);
    rig.holdFree = true;
    rig.focus(c.data.cameraTarget);
    ui.showInspector(c);
    setTouchInteractive(true);
    if (!fromPointer) ui.hideTooltip();
    invalidate();
  }

  function deselect(silent = false) {
    if (selected < 0 && !activeGroup) return;
    selected = -1;
    holo?.set(false);
    rig.holdFree = false;
    ui.hideInspector();
    if (activeGroup) setGroup(null, true);
    if (!silent) rig.toStory();
    setTouchInteractive(mode === "explore");
    invalidate();
  }

  function setGroup(id, silent = false) {
    activeGroup = id;
    ui.setGroup(id);
    if (id) {
      const g = MAP_GROUPS.find((m) => m.id === id);
      selected = -1;
      holo?.set(false);
      ui.hideInspector();
      rig.holdFree = true;
      rig.focus(g.cameraTarget);
      setTouchInteractive(true);
    } else if (!silent) {
      rig.holdFree = false;
      rig.toStory();
      setTouchInteractive(mode === "explore");
    }
    invalidate();
  }

  function setMode(m) {
    mode = m;
    ui.setMode(m);
    setTouchInteractive(m === "explore" || selected >= 0);
    invalidate();
  }

  function reset() {
    selected = -1;
    holo?.set(false);
    activeGroup = null;
    rig.holdFree = false;
    ui.hideInspector();
    ui.setGroup(null);
    setMode("system");
    rig.drift = 0;
    rig.toStory();
    invalidate();
  }

  function setMotionPaused(p) {
    motionPaused = p;
    ui.setMotionPaused(p);
    invalidate();
  }
  ui.setMotionPaused(motionPaused);

  reducedQuery.addEventListener?.("change", (e) => {
    reducedMotion = e.matches;
    rig.reducedMotion = reducedMotion;
    setMotionPaused(reducedMotion);
    applyStoryLayout();
  });

  /* ------------------------------ pointer ------------------------------ */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pointerDirty = false;
  let pointerInside = false;
  let down = null;
  const hits = [];

  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    hits.length = 0;
    raycaster.intersectObjects(proxies, false, hits);
    return hits.length ? hits[0].object.userData.index : -1;
  }

  /* Grab-to-spin on the open hologram. Capture phase on the viewport so it
     runs before OrbitControls sees the pointerdown. */
  let grab = null;
  viewport.addEventListener(
    "pointerdown",
    (e) => {
      if (e.target !== canvas || e.button > 0 || !holoOpen()) return;
      pick(e.clientX, e.clientY);
      if (!holo.hits(raycaster)) return;
      grab = { x: e.clientX, y: e.clientY, t: performance.now() };
      controls.enabled = false;
      canvas.setPointerCapture?.(e.pointerId);
      canvas.style.cursor = "grabbing";
    },
    { capture: true }
  );
  function endGrab() {
    if (!grab) return;
    grab = null;
    holo.release();
    controls.enabled = true;
    canvas.style.cursor = "grab";
  }
  canvas.addEventListener("pointercancel", endGrab);

  canvas.addEventListener("pointermove", (e) => {
    if (grab) {
      const now = performance.now();
      holo.grab(e.clientX - grab.x, e.clientY - grab.y, now - grab.t);
      grab.x = e.clientX;
      grab.y = e.clientY;
      grab.t = now;
      invalidate();
      return;
    }
    if (e.pointerType === "touch") return;
    ndc.lastX = e.clientX;
    ndc.lastY = e.clientY;
    pointerDirty = true;
    pointerInside = true;
    invalidate();
  });
  canvas.addEventListener("pointerleave", () => {
    pointerInside = false;
    hovered = -1;
    rig.hovering = false;
    canvas.style.cursor = "";
  });
  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener("pointerup", (e) => {
    endGrab();
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 600;
    down = null;
    if (moved > 8 || !quick) return;
    const i = pick(e.clientX, e.clientY);
    if (i >= 0) select(i, { fromPointer: true });
    else if (holoOpen() && holo.hits(raycaster)) return;
    else if (selected >= 0 || activeGroup) deselect();
  });

  /* ------------------------------ keyboard ----------------------------- */
  viewport.addEventListener("keydown", (e) => {
    const n = components.length;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        kbIndex = (kbIndex + 1 + n) % n;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        kbIndex = (kbIndex - 1 + n) % n;
        break;
      case "Enter":
      case " ":
        if (kbIndex >= 0) select(kbIndex);
        break;
      case "Escape":
        if (selected >= 0 || activeGroup) deselect();
        else return;
        break;
      case "e":
      case "E":
        setMode(mode === "explore" ? "system" : "explore");
        break;
      case "r":
      case "R":
        reset();
        break;
      case "+":
      case "=":
        rig.zoom(0.8);
        break;
      case "-":
        rig.zoom(1.25);
        break;
      default:
        return;
    }
    finishIntro();
    e.preventDefault();
    invalidate();
  });
  viewport.addEventListener("blur", () => {
    kbIndex = selected;
  });
  root.querySelector(".nc-inspector").addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      deselect();
      viewport.focus({ preventScroll: true });
    }
  });

  /* ------------------------------- layout ------------------------------ */
  root.classList.remove("nc-is-static");
  root.classList.add("nc-is-live");

  function applyStoryLayout() {
    root.classList.toggle("nc-story", !reducedMotion);
  }
  applyStoryLayout();

  /* Horizontal projection shift (px) that keeps a selected component clear
     of the desktop inspector panel on the right. */
  let viewW = 1;
  let viewH = 1;
  let viewShift = 0;
  /* Portrait screens: lift the machine into the empty upper half. */
  let viewLift = 0;
  function applyViewShift() {
    if (Math.abs(viewShift) < 0.5 && viewLift === 0) camera.clearViewOffset();
    else camera.setViewOffset(viewW, viewH, viewShift, viewLift, viewW, viewH);
    camera.updateProjectionMatrix();
  }

  function resize() {
    const w = viewport.clientWidth || window.innerWidth;
    const h = viewport.clientHeight || window.innerHeight;
    viewW = w;
    viewH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    viewLift = camera.aspect < 0.8 ? Math.round(h * 0.08) : 0;
    applyViewShift();
    rig.setFit(camera.aspect);
    invalidate();
  }
  new ResizeObserver(resize).observe(viewport);
  resize();

  function readProgress() {
    if (!root.classList.contains("nc-story")) return 0;
    const r = root.getBoundingClientRect();
    const span = r.height - viewport.clientHeight;
    if (span <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / span));
  }

  /* -------------------------------- intro ------------------------------ */
  /* black → init → core → GPUs → data flows → camera reveal → name →
     tagline → CTA. Compressed on repeat visits, skipped if the page loads
     scrolled past the top or with reduced motion. */
  progress = readProgress();
  rig.progress = progress;
  let seen = false;
  try {
    seen = sessionStorage.getItem("nc-intro") === "1";
    sessionStorage.setItem("nc-intro", "1");
  } catch (e) {}
  const introSpeed = seen ? 2.6 : 1;
  let introT = 0;
  let introDone = false;
  const introSteps = [
    [0.15, "nc-t-boot"],
    [2.8, "nc-t-name"],
    [3.3, "nc-t-tag"],
    [3.8, "nc-t-cta"],
    [4.2, "nc-t-ui"],
  ];

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    sim.intro.core = sim.intro.gpu = sim.intro.flows = 1;
    for (const [, cls] of introSteps) root.classList.add(cls);
    root.classList.add("nc-t-done");
    rig.endIntro();
  }

  if (reducedMotion || progress > 0.02) {
    if (reducedMotion) flows.preroll(5.6);
    finishIntro();
    rig.storyPose(progress, rig.desiredPos, rig.desiredTarget);
    rig.snap();
  } else {
    sim.intro.core = sim.intro.gpu = sim.intro.flows = 0;
    rig.startIntro(3.4 / introSpeed);
  }

  function updateIntro(dt) {
    if (introDone) return;
    introT += dt * introSpeed;
    const ramp = (a, b) => Math.min(1, Math.max(0, (introT - a) / (b - a)));
    sim.intro.core = ramp(0.4, 1.4);
    sim.intro.gpu = ramp(1.1, 2.3);
    sim.intro.flows = ramp(2.0, 3.0);
    for (const [at, cls] of introSteps) if (introT >= at) root.classList.add(cls);
    if (introT >= 4.4) finishIntro();
  }
  ["pointerdown", "wheel", "touchstart"].forEach((ev) => canvas.addEventListener(ev, finishIntro, { passive: true }));

  /* --------------------------------- loop ------------------------------ */
  let last = 0;
  let simTime = 0;
  let handoff = -1;
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  let slowFrames = 0;
  let frameCount = 0;
  const proj = new THREE.Vector3();

  function invalidate() {
    dirty = 2;
    if (running && !raf) raf = requestAnimationFrame(frame);
  }

  /* Which particle lane a component or map group belongs to (flows.js). */
  const LANE_BY_GROUP = { INFERENCE: "inference", COMPUTE: "inference", MEMORY: "inference", RETRIEVAL: "retrieval", AGENTS: "agents", INFRASTRUCTURE: "infra" };
  const LANE_BY_ID = { "data-pipeline": "retrieval", "distributed-storage": "agents" };
  function focusLane() {
    if (selected >= 0) {
      const d = components[selected].data;
      return LANE_BY_ID[d.id] || LANE_BY_GROUP[d.mapGroup] || null;
    }
    return activeGroup ? LANE_BY_GROUP[activeGroup] || null : null;
  }

  function emphasisTargets() {
    const focus = selected < 0 && !activeGroup && rig.mode !== "free" && chapter.focus;
    for (const c of components) {
      let e = 1;
      if (selected >= 0) e = c.index === selected ? 1.9 : 0.32;
      else if (activeGroup) e = c.data.mapGroup === activeGroup ? 1.5 : 0.35;
      else if (focus) e = focus.includes(c.data.id) ? 1.3 : 0.42;
      if (hovered === c.index && selected !== c.index) e = Math.max(e, 1.6);
      c.emphTarget = e;
    }
  }

  function placeOutline(boxMesh, c) {
    boxMesh.position.copy(c.holder.position).add(c.center);
    boxMesh.scale.copy(c.size).multiplyScalar(1.08 * c.scale);
    boxMesh.visible = true;
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    const rawDt = last ? (now - last) / 1000 : 1 / 60;
    const dt = Math.min(0.05, rawDt);
    last = now;
    const motion = motionPaused ? 0 : 1;
    sim.motion = motion;
    sim.motionPulse = motion;
    simTime += dt * motion;

    /* Scroll story. */
    const p = readProgress();
    if (Math.abs(p - progress) > 1e-4) dirty = 2;
    progress = p;
    rig.progress = p;
    let ch = storyChapters[0];
    for (const c of storyChapters) if (p >= c.from && p < c.to) ch = c;
    chapter = ch;
    ui.setChapter(ch);
    ui.setChapterProgress((p - ch.from) / (ch.to - ch.from));
    root.classList.toggle("nc-scrolled", p > 0.035);
    /* Handoff: over the last stretch the scene recedes into black and the
       ENGINEER / BUILDER title takes over (css: --nc-out). */
    const out = smooth(0.84, 0.97, p);
    if (out !== handoff) {
      handoff = out;
      root.style.setProperty("--nc-out", out.toFixed(3));
      root.classList.toggle("nc-handoff-on", out > 0.02);
    }
    root.classList.toggle("nc-chapter-on", p > 0.06 && out <= 0.02);

    /* The intro runs on wall time (loosely capped) so the name and CTA still
       arrive on schedule when a slow GPU drops frames. */
    updateIntro(Math.min(0.25, rawDt));
    flows.setFocus(focusLane());
    flows.update(dt, motion);

    /* Hover raycast at most once per frame, only after the pointer moved. */
    if (pointerDirty && pointerInside && !down) {
      pointerDirty = false;
      hovered = pick(ndc.lastX, ndc.lastY);
      canvas.style.cursor = hovered >= 0 ? "pointer" : "";
      if (holoOpen()) {
        holo.pick(raycaster);
        if (holo.hits(raycaster)) canvas.style.cursor = "grab";
      }
      rig.hovering = hovered >= 0;
    }
    const shown = document.activeElement === viewport && kbIndex >= 0 && selected < 0 ? kbIndex : hovered;

    sim.holo = holo ? holo.k : 0;
    const holoLift = smooth(0, 0.6, sim.holo);
    emphasisTargets();
    const ea = 1 - Math.exp(-dt * 7);
    const oa = reducedMotion ? 1 : 1 - Math.exp(-dt * 4);
    const exploreOffset = mode === "explore" ? 0.55 : 0;
    for (const c of components) {
      c.emph += (c.emphTarget - c.emph) * ea;
      const off = exploreOffset + (c.index === selected ? 0.35 : 0);
      c.offset += (off - c.offset) * oa;
      const sc = c.index === selected ? 1.035 : 1;
      c.scale += (sc - c.scale) * oa;
      c.holder.position.copy(c.base).addScaledVector(c.dir, c.offset);
      if (HOLO_LIFT[c.data.id]) c.holder.position.y += HOLO_LIFT[c.data.id] * holoLift;
      c.holder.scale.setScalar(c.scale);
      c.selected = c.index === selected;
      c.part.update(dt * motion, simTime, sim, c);
      c.accent.emissiveIntensity = 0.55 * c.emph * c.activity * (0.15 + 0.85 * sim.intro.core);
    }
    coreLight.intensity = (1.2 + sim.coreLevel * 3) * sim.intro.core;

    if (selected >= 0 && !(holo && selected === host.index)) placeOutline(selectBox, components[selected]);
    else selectBox.visible = false;
    if (shown >= 0 && shown !== selected) placeOutline(hoverBox, components[shown]);
    else hoverBox.visible = false;

    const shiftTarget = selected >= 0 && viewW > 760 ? Math.min(210, viewW * 0.15) : 0;
    if (viewShift !== shiftTarget) {
      viewShift += (shiftTarget - viewShift) * oa;
      if (Math.abs(shiftTarget - viewShift) < 0.5) viewShift = shiftTarget;
      applyViewShift();
      dirty = 2;
    }

    const moving = rig.update(dt, now, Math.min(0.25, rawDt));
    /* The scene moved under a still pointer: re-pick next frame. */
    if (moving && pointerInside) pointerDirty = true;

    if (shown >= 0 && shown !== selected) {
      const c = components[shown];
      proj.copy(c.anchor).multiply(c.holder.scale).add(c.holder.position).project(camera);
      if (proj.z < 1) ui.showTooltip(c, (proj.x * 0.5 + 0.5) * viewport.clientWidth, (-proj.y * 0.5 + 0.5) * viewport.clientHeight);
      else ui.hideTooltip();
    } else ui.hideTooltip();

    ui.setHud(sim, sim.decoding ? sim.tokenIndex : sim.phase === "RELEASE" ? sim.tokenIndex : 0);

    /* Fully handed off: the canvas is invisible, so skip the GPU work. */
    const active = handoff < 0.999 && (motion > 0 || moving || dirty > 0 || !introDone);
    if (active) {
      renderer.render(scene, camera);
      if (dirty > 0) dirty--;
    }

    /* Adaptive resolution: step the DPR down if we keep missing ~40 fps. */
    frameCount++;
    if (dt > 1 / 40) slowFrames++;
    if (frameCount >= 120) {
      if (slowFrames > 80 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.25);
        renderer.setPixelRatio(dpr);
        resize();
      }
      frameCount = slowFrames = 0;
    }

    if (!raf && running && (active || (motion > 0 && handoff < 0.999))) raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* Only render while the hero is on screen and the tab is visible. */
  let onScreen = true;
  new IntersectionObserver(
    (entries) => {
      onScreen = entries[0].isIntersecting;
      if (onScreen && !document.hidden) startLoop();
      else stopLoop();
    },
    { rootMargin: "100px" }
  ).observe(root);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLoop();
    else if (onScreen) startLoop();
  });
  window.addEventListener("scroll", () => invalidate(), { passive: true });
  controls.addEventListener("change", () => invalidate());

  startLoop();

  /* Handy for debugging in the console; not used by the page. */
  window.__neuralCore = { scene, camera, rig, sim, components, byId, renderer, select, deselect };
}
