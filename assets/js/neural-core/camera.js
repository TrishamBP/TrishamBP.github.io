/* ---------------------------------------------------------------------------
   Neural Compute Core — camera rig
   ---------------------------------------------------------------------------
   One rig, four modes:

     intro   scripted dolly from far away to the hero 3/4 view
     story   pose comes from the scroll progress (keyframes in
             componentsData.storyKeyframes) plus a slow auto-orbit drift on
             the opening and closing chapters
     focus   gliding to a component's / map group's `cameraTarget`; once it
             arrives, OrbitControls take over around that target
     free    the user is orbiting / zooming / panning with OrbitControls

   Non-free modes never write the camera directly from a tween: they set a
   desired pose and the camera critically damps toward it every frame, so
   any transition can be interrupted by another one without a jump.
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const DEG = Math.PI / 180;
const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export class CameraRig {
  constructor(camera, controls, { keyframes, reducedMotion }) {
    this.camera = camera;
    this.controls = controls;
    this.keyframes = keyframes;
    this.reducedMotion = reducedMotion;
    this.mode = "story";
    this.fit = 1;
    this.progress = 0;
    this.drift = 0;
    this.lastInteraction = -Infinity;
    this.freeSince = 0;
    this.freeProgress = 0;
    this.hovering = false;
    this.holdFree = false;
    this.desiredPos = new THREE.Vector3();
    this.desiredTarget = new THREE.Vector3();
    this.target = new THREE.Vector3(0, 1.9, 0);
    this.introFrom = { target: new THREE.Vector3(0, 2.4, 0), az: 78, el: 34, dist: 36 };
    this.introT = 0;
    this.introDuration = 3.4;
    this._t = new THREE.Vector3();
    this._a = new THREE.Vector3();
    this.onFocusArrive = null;
    this.onReturnToStory = null;

    controls.addEventListener("start", () => this.userStart());
    controls.addEventListener("end", () => (this.lastInteraction = performance.now()));
  }

  /* Write a spherical pose (degrees) into out vectors. */
  spherical(target, az, el, dist, outPos, outTarget) {
    const d = dist * this.fit;
    const ca = Math.cos(el * DEG);
    outTarget.copy(target);
    outPos.set(target.x + d * ca * Math.sin(az * DEG), target.y + d * Math.sin(el * DEG), target.z + d * ca * Math.cos(az * DEG));
  }

  storyPose(p, outPos, outTarget) {
    const kf = this.keyframes;
    let i = 0;
    while (i < kf.length - 2 && p > kf[i + 1].p) i++;
    const a = kf[i];
    const b = kf[i + 1];
    const k = smoother(clamp01((p - a.p) / Math.max(1e-6, b.p - a.p)));
    this._t.set(a.target[0] + (b.target[0] - a.target[0]) * k, a.target[1] + (b.target[1] - a.target[1]) * k, a.target[2] + (b.target[2] - a.target[2]) * k);
    /* Auto-orbit drift only contributes on the opening and closing chapters. */
    const w = 1 - smoother(clamp01((p - 0.1) / 0.1)) + smoother(clamp01((p - 0.84) / 0.08));
    const az = a.az + (b.az - a.az) * k + this.drift * Math.min(1, w);
    const el = a.el + (b.el - a.el) * k;
    const dist = a.dist + (b.dist - a.dist) * k;
    this.spherical(this._t, az, el, dist, outPos, outTarget);
  }

  setFit(aspect) {
    /* Portrait screens need the camera further away to fit the machine. */
    this.fit = aspect < 1.3 ? Math.pow(1.3 / aspect, 0.82) : 1;
    this.controls.maxDistance = 34 * this.fit;
  }

  startIntro(duration) {
    this.mode = "intro";
    this.introT = 0;
    this.introDuration = duration;
    this.spherical(this.introFrom.target, this.introFrom.az, this.introFrom.el, this.introFrom.dist, this.camera.position, this.target);
    this.camera.lookAt(this.target);
    this.controls.enabled = false;
  }

  endIntro() {
    if (this.mode !== "intro") return;
    this.mode = "story";
    this.controls.enabled = true;
  }

  userStart() {
    this.lastInteraction = performance.now();
    if (this.mode === "intro") this.endIntro();
    if (this.mode !== "free") {
      this.controls.target.copy(this.target);
      this.mode = "free";
      this.freeProgress = this.progress;
    }
  }

  focus(pose) {
    this.mode = "focus";
    this.controls.enabled = false;
    this.desiredTarget.fromArray(pose.target);
    this.desiredPos.fromArray(pose.position);
    /* Keep the authored direction, scale the distance for narrow screens. */
    this._a.subVectors(this.desiredPos, this.desiredTarget).multiplyScalar(this.fit);
    this.desiredPos.copy(this.desiredTarget).add(this._a);
    this.freeProgress = this.progress;
    this.lastInteraction = performance.now();
    if (this.reducedMotion) this.snap();
  }

  toStory() {
    if (this.mode === "free") this.target.copy(this.controls.target);
    this.mode = "story";
    this.controls.enabled = true;
    if (this.reducedMotion) {
      this.storyPose(this.progress, this.desiredPos, this.desiredTarget);
      this.snap();
    }
  }

  snap() {
    this.camera.position.copy(this.desiredPos);
    this.target.copy(this.desiredTarget);
    this.camera.lookAt(this.target);
    this.controls.target.copy(this.target);
  }

  zoom(factor) {
    if (this.mode !== "free") this.userStart();
    const c = this.controls;
    this._a.subVectors(this.camera.position, c.target);
    const len = THREE.MathUtils.clamp(this._a.length() * factor, c.minDistance, c.maxDistance);
    this._a.setLength(len);
    this.camera.position.copy(c.target).add(this._a);
    this.lastInteraction = performance.now();
  }

  isSettling() {
    return this.mode === "intro" || this.mode === "focus" || this.camera.position.distanceToSquared(this.desiredPos) > 1e-4;
  }

  /* Returns true while the camera is still moving (used for on-demand
     rendering when motion is paused). */
  update(dt, now, wallDt = dt) {
    const camera = this.camera;

    if (this.mode === "intro") {
      this.introT += wallDt;
      const k = easeInOutCubic(clamp01(this.introT / this.introDuration));
      this.storyPose(this.progress, this.desiredPos, this.desiredTarget);
      const f = this.introFrom;
      this.spherical(f.target, f.az, f.el, f.dist, this._a, this._t);
      camera.position.lerpVectors(this._a, this.desiredPos, k);
      this.target.lerpVectors(this._t, this.desiredTarget, k);
      camera.lookAt(this.target);
      this.controls.target.copy(this.target);
      if (k >= 1) this.endIntro();
      return true;
    }

    if (this.mode === "free") {
      this.controls.update(dt);
      this.target.copy(this.controls.target);
      /* Scrolling hands the camera back to the story. */
      if (Math.abs(this.progress - this.freeProgress) > 0.02 || (now - this.lastInteraction > 14000 && !this.holdFree)) {
        if (this.onReturnToStory) this.onReturnToStory();
        this.toStory();
      }
      return false;
    }

    if (this.mode === "story") {
      const paused = this.hovering || now - this.lastInteraction < 6000 || this.reducedMotion;
      if (!paused) this.drift = (this.drift + dt * 3.2) % 360;
      this.storyPose(this.progress, this.desiredPos, this.desiredTarget);
    }

    if (this.mode === "focus" && Math.abs(this.progress - this.freeProgress) > 0.035) {
      if (this.onReturnToStory) this.onReturnToStory();
      this.toStory();
      this.storyPose(this.progress, this.desiredPos, this.desiredTarget);
    }

    const rate = this.mode === "focus" ? 3.4 : 4.2;
    const a = this.reducedMotion ? 1 : 1 - Math.exp(-rate * dt);
    camera.position.lerp(this.desiredPos, a);
    this.target.lerp(this.desiredTarget, a);
    camera.lookAt(this.target);
    this.controls.target.copy(this.target);

    if (this.mode === "focus" && camera.position.distanceToSquared(this.desiredPos) < 0.0025) {
      /* Arrived: hand control to OrbitControls around the component. */
      this.mode = "free";
      this.controls.enabled = true;
      this.freeProgress = this.progress;
      this.lastInteraction = now;
      if (this.onFocusArrive) this.onFocusArrive();
    }
    return camera.position.distanceToSquared(this.desiredPos) > 1e-4;
  }
}
