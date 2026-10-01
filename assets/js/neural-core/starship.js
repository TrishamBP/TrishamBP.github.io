/* ---------------------------------------------------------------------------
   Neural Compute Core — starship (the CPU control plane)
   ---------------------------------------------------------------------------
   A Constitution-class refit hovering over the inference spacecraft: lathed
   saucer with panel lines, lit windows and a bridge dome, a swept neck, a
   secondary hull with a glowing blue deflector dish, and two warp nacelles
   on pylons with red bussard collectors and blue grilles.

   The scheduler heartbeat pulses through the deflector, grilles and a faint
   beam down to the spacecraft it keeps fed.

   Local frame: bow points along +x (yawed toward the camera), y up,
   starboard = +z. y = 0 is the secondary hull's axis.
   ------------------------------------------------------------------------ */

import * as THREE from "three";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();

function lathe(profile, segs) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

/* Lathe profile given along +y, turned to run along +x. */
function hullAlongX(profile, segs) {
  return lathe(profile, segs).rotateZ(-Math.PI / 2);
}

/* Box strut spanning a → b with cross-section w × t. */
function strut(mat, a, b, w, t) {
  _d.subVectors(b, a);
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  m.scale.set(w, _d.length(), t);
  m.quaternion.setFromUnitVectors(_up, _d.normalize());
  m.position.addVectors(a, b).multiplyScalar(0.5);
  return m;
}

function glowSprite(map, color, sx, sy) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })
  );
  s.scale.set(sx, sy, 1);
  return s;
}

/* Saucer skin: u wraps around, v runs underside → bridge. Panel grid,
   rim window rows (also the emissive map) and the registry on top. */
function saucerTextures(profileLen) {
  const W = 2048;
  const H = 512;
  const vy = (i) => (1 - i / (profileLen - 1)) * H;
  const map = document.createElement("canvas");
  const win = document.createElement("canvas");
  map.width = win.width = W;
  map.height = win.height = H;
  const g = map.getContext("2d");
  const w = win.getContext("2d");
  g.fillStyle = "#a9b0ba";
  g.fillRect(0, 0, W, H);
  /* Top surface a touch lighter, underside darker. */
  g.fillStyle = "#c3c9d1";
  g.fillRect(0, 0, W, vy(6));
  g.fillStyle = "#858c96";
  g.fillRect(0, vy(4), W, H - vy(4));
  g.strokeStyle = "#6d747e";
  g.globalAlpha = 0.55;
  g.lineWidth = 2;
  for (let i = 0; i < 48; i++) {
    const x = (i / 48) * W;
    g.beginPath();
    g.moveTo(x, vy(10));
    g.lineTo(x, vy(6));
    g.moveTo(x, vy(4));
    g.lineTo(x, vy(1));
    g.stroke();
  }
  for (const i of [1.6, 2.5, 3.3, 6.6, 7.4, 8.3, 9.2]) {
    g.beginPath();
    g.moveTo(0, vy(i));
    g.lineTo(W, vy(i));
    g.stroke();
  }
  g.globalAlpha = 1;
  w.fillStyle = "#000";
  w.fillRect(0, 0, W, H);
  /* Window rows around the rim (two decks) and a ring on the upper hull. */
  for (const [row, step, on] of [[4.6, 9, 0.75], [5.4, 11, 0.6], [7.9, 14, 0.45]]) {
    const y = vy(row);
    for (let x = 4; x < W; x += step) {
      const h = Math.sin(x * 12.9898 + row * 78.233) * 43758.5453;
      if (h - Math.floor(h) < on) {
        w.fillStyle = "#ffe9c4";
        w.fillRect(x, y - 2, 4, 4);
      }
    }
  }
  g.fillStyle = "#565d68";
  g.font = "700 30px ui-monospace, Menlo, Consolas, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const x of [W * 0.25, W * 0.75]) g.fillText("NCC-1701-A", x, vy(7.0));
  const mk = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: mk(map), windows: mk(win) };
}

export function buildStarship(ctx) {
  const low = ctx.quality.low;
  const SEG = low ? 40 : 72;
  const g = new THREE.Group();
  const ship = new THREE.Group();
  ship.rotation.y = -24 * DEG;
  g.add(ship);
  const hullGroup = new THREE.Group();
  hullGroup.position.x = 0.2;
  ship.add(hullGroup);
  const H = (o) => (hullGroup.add(o), o);

  const SAUCER = [
    [0, -0.1], [0.12, -0.1], [0.3, -0.075], [0.6, -0.042], [0.82, -0.014], [0.86, 0], [0.84, 0.015],
    [0.62, 0.04], [0.34, 0.068], [0.17, 0.096], [0.1, 0.122], [0, 0.135],
  ];
  const tex = saucerTextures(SAUCER.length);
  const skin = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.map,
    emissiveMap: tex.windows,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
    metalness: 0.5,
    roughness: 0.42,
  });
  const hull = new THREE.MeshStandardMaterial({ color: 0xa3aab4, metalness: 0.55, roughness: 0.4 });
  const hullDark = new THREE.MeshStandardMaterial({ color: 0x4a5059, metalness: 0.7, roughness: 0.4 });
  const blue = new THREE.MeshBasicMaterial({ color: 0x3a9cff, toneMapped: false });
  const grille = new THREE.MeshBasicMaterial({ color: 0x4aa8ff, toneMapped: false });
  const bussard = new THREE.MeshBasicMaterial({ color: 0xff3a1e, toneMapped: false });
  const impulse = new THREE.MeshBasicMaterial({ color: 0xff5a2a, toneMapped: false });

  /* -------------------------------- saucer ----------------------------- */
  const SX = 0.42;
  const SY = 0.44;
  const saucer = new THREE.Mesh(lathe(SAUCER, SEG), skin);
  saucer.position.set(SX, SY, 0);
  H(saucer);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.861, 0.006, 4, SEG), ctx.accent);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(SX, SY, 0);
  H(rim);
  const bridge = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 8, 0, TAU, 0, Math.PI / 2), hull);
  bridge.position.set(SX, SY + 0.13, 0);
  H(bridge);
  const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 8, 0, TAU, Math.PI / 2, Math.PI / 2), hullDark);
  sensor.position.set(SX, SY - 0.1, 0);
  H(sensor);
  /* Impulse deck at the saucer's aft edge. */
  H(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.26), hullDark)).position.set(SX - 0.6, SY + 0.035, 0);
  H(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.22), impulse)).position.set(SX - 0.656, SY + 0.035, 0);

  /* --------------------------- neck + engineering ---------------------- */
  H(strut(hull, new THREE.Vector3(SX - 0.12, SY - 0.05, 0), new THREE.Vector3(-0.42, 0.05, 0), 0.07, 0.1));
  H(strut(hull, new THREE.Vector3(SX - 0.3, SY - 0.03, 0), new THREE.Vector3(-0.66, 0.08, 0), 0.05, 0.08));
  const secondary = new THREE.Mesh(
    hullAlongX([[0.0, -0.78], [0.07, -0.76], [0.13, -0.66], [0.16, -0.42], [0.165, -0.05], [0.155, 0.25], [0.13, 0.48], [0.11, 0.56]], SEG),
    hull
  );
  secondary.position.x = -0.48;
  H(secondary);
  /* Shuttlebay doors and a seam ring. */
  H(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.09), hullDark)).position.set(-1.25, 0.02, 0);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.166, 0.006, 4, SEG), hullDark);
  seam.rotation.y = Math.PI / 2;
  seam.position.x = -0.5;
  H(seam);
  /* Navigational deflector: housing ring, dish and glow. */
  const DX = 0.08;
  const housing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 8, 40), hullDark);
  housing.rotation.y = Math.PI / 2;
  housing.position.x = DX;
  H(housing);
  const dish = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40), blue);
  dish.rotation.y = Math.PI / 2;
  dish.position.x = DX + 0.004;
  H(dish);
  const dishGlow = glowSprite(ctx.glow, 0x4aa8ff, 0.7, 0.7);
  dishGlow.position.x = DX + 0.06;
  H(dishGlow);

  /* ------------------------------- nacelles ---------------------------- */
  const NY = 0.6;
  const NZ = 0.5;
  const nacGeo = hullAlongX([[0.0, -0.66], [0.04, -0.64], [0.062, -0.56], [0.07, -0.3], [0.07, 0.44], [0.062, 0.54], [0.05, 0.58]], SEG / 2);
  const glows = [];
  for (const s of [1, -1]) {
    const z = s * NZ;
    const nac = new THREE.Mesh(nacGeo, hull);
    nac.position.set(-1.08, NY, z);
    H(nac);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.052, 20, 10), bussard);
    cap.scale.x = 1.35;
    cap.position.set(-1.08 + 0.6, NY, z);
    H(cap);
    const bg = glowSprite(ctx.glow, 0xff4a24, 0.34, 0.34);
    bg.position.set(-1.08 + 0.64, NY, z);
    H(bg);
    /* Warp grille on the inboard face, plus a cap stripe on top. */
    H(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.012), grille)).position.set(-1.12, NY, z - s * 0.066);
    H(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.012, 0.05), hullDark)).position.set(-1.12, NY + 0.068, z);
    const gg = glowSprite(ctx.glow, 0x4aa8ff, 1.3, 0.32);
    gg.position.set(-1.12, NY, z - s * 0.08);
    H(gg);
    glows.push(bg, gg);
    /* Swept pylon from the engineering hull up to the nacelle. */
    H(strut(hull, new THREE.Vector3(-0.92, 0.08, s * 0.05), new THREE.Vector3(-1.12, NY - 0.05, z), 0.13, 0.025));
  }

  /* --------------------------- navigation lights ----------------------- */
  const nav = [
    [0xff2a2a, SX, SY, -0.86],
    [0x2aff6a, SX, SY, 0.86],
    [0xffffff, -1.74, NY, NZ],
    [0xffffff, -1.74, NY, -NZ],
  ].map(([color, x, y, z]) => {
    const s = glowSprite(ctx.glow, color, 0.13, 0.13);
    s.position.set(x, y, z);
    H(s);
    return s;
  });

  /* ----------------------- heartbeat beam to the core ------------------ */
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x4aa8ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const BEAM_L = 0.62;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.24, BEAM_L, 32, 1, true), beamMat);
  beam.position.y = -0.12 - BEAM_L / 2;
  g.add(beam);

  const proxy = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.85, 1.75), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.set(-0.15, 0.3, 0);
  proxy.rotation.y = ship.rotation.y;

  return {
    group: g,
    proxies: [proxy],
    update(dt, t, sim, c) {
      /* Double-beat heartbeat: the scheduler tick. */
      const ph = (t % 1.3) / 1.3;
      const hb = Math.exp(-((ph - 0.05) ** 2) / 0.0012) + 0.6 * Math.exp(-((ph - 0.2) ** 2) / 0.0012);
      const intro = sim.intro.core;
      const k = (0.45 + hb * 0.7 * sim.motionPulse) * intro * c.emph;
      blue.color.setHex(0x3a9cff).multiplyScalar(0.55 + k);
      dishGlow.material.opacity = 0.35 + 0.45 * k;
      const warp = (0.5 + sim.coreLevel * 0.6 + 0.12 * Math.sin(t * 5)) * intro * c.emph;
      grille.color.setHex(0x4aa8ff).multiplyScalar(0.45 + warp * 0.8);
      bussard.color.setHex(0xff3a1e).multiplyScalar(0.6 + 0.25 * Math.sin(t * 2.7) + warp * 0.3);
      for (const s of glows) s.material.opacity = 0.25 + 0.35 * warp;
      impulse.color.setHex(0xff5a2a).multiplyScalar(0.5 + 0.5 * sim.coreLevel);
      skin.emissiveIntensity = 0.55 + 0.35 * intro;
      const blink = ph < 0.08 ? 1 : 0.15;
      for (let i = 0; i < nav.length; i++) nav[i].material.opacity = (i < 2 ? 0.75 : blink) * intro;
      /* The beam fades out when the core opens into its hologram. */
      beamMat.opacity = (0.05 + hb * 0.18 * sim.motionPulse) * intro * (1 - (sim.holo || 0));
      /* Gentle station-keeping drift. */
      ship.position.y = Math.sin(t * 0.7) * 0.025 * sim.motion;
      ship.rotation.x = Math.sin(t * 0.45) * 0.02 * sim.motion;
      c.activity = 0.5 + hb * 0.8 * sim.motionPulse;
    },
  };
}
