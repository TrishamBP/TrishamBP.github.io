"""Generate the original SVG card illustrations for /physical-intelligence-lab/.

Writes assets/pil/*.svg (640x360). Palette matches css/pil-lab.css:
canvas #0E1111, panel #151b1b, hair rgba(255,255,255,.12), orange #f0743e,
mint #6fd3b0, white. Run from the repo root:  python scripts/pil_card_art.py
"""
import math
import random
from pathlib import Path

W, H = 640, 360
OUT = Path("assets/pil")
ORANGE, MINT, WHITE = "#f0743e", "#6fd3b0", "#ffffff"


def frame(body: str) -> str:
    grid = "".join(
        f'<line x1="{x}" y1="0" x2="{x}" y2="{H}"/>' for x in range(0, W + 1, 32)
    ) + "".join(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}"/>' for y in range(0, H + 1, 32))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
        f'<rect width="{W}" height="{H}" fill="#121818"/>'
        f'<g stroke="rgba(255,255,255,0.05)" stroke-width="1">{grid}</g>'
        f"{body}</svg>\n"
    )


def floor(y0=230, color="rgba(255,255,255,0.18)"):
    """Perspective floor grid converging on a vanishing point."""
    vx, vy = W / 2, y0 - 70
    lines = []
    for i in range(-10, 11):
        x = W / 2 + i * 70
        lines.append(f'<line x1="{vx + (x - vx) * 0.12:.1f}" y1="{y0}" x2="{x:.1f}" y2="{H}"/>')
    for k in range(6):
        t = (k / 5) ** 1.8
        y = y0 + (H - y0) * t
        lines.append(f'<line x1="0" y1="{y:.1f}" x2="{W}" y2="{y:.1f}"/>')
    return f'<g stroke="{color}" stroke-width="1">{"".join(lines)}</g>'


def world_models():
    # Road-like floor, a few boxes (scene), a predicted trajectory fan.
    b = floor()
    boxes = [(120, 205, 46, 40), (470, 200, 60, 48), (300, 214, 30, 24)]
    for x, y, w, h in boxes:
        b += (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="{WHITE}" stroke-opacity="0.55"/>'
              f'<polyline points="{x},{y} {x+10},{y-10} {x+w+10},{y-10} {x+w},{y}" fill="none" stroke="{WHITE}" stroke-opacity="0.35"/>'
              f'<line x1="{x+w+10}" y1="{y-10}" x2="{x+w+10}" y2="{y+h-10}" stroke="{WHITE}" stroke-opacity="0.35"/>')
    for i, (dx, op) in enumerate([(-90, 0.25), (-40, 0.45), (0, 1), (50, 0.45), (110, 0.25)]):
        col = ORANGE if dx == 0 else MINT
        b += (f'<path d="M320 352 C 320 300, {320 + dx * 0.6} 260, {320 + dx} 222" fill="none" '
              f'stroke="{col}" stroke-opacity="{op}" stroke-width="{3 if dx == 0 else 2}" stroke-dasharray="{"0" if dx == 0 else "6 6"}"/>')
    b += f'<circle cx="320" cy="222" r="5" fill="{ORANGE}"/>'
    b += f'<text x="24" y="40" fill="{MINT}" font-family="Consolas,monospace" font-size="20" letter-spacing="3">t+1 … t+k  PREDICTED</text>'
    return frame(b)


def slam():
    """Pose graph: a looping trajectory of pose triangles, landmarks with
    observation rays, a sparse map, and a dashed loop-closure edge."""
    rnd = random.Random(11)
    # Sparse "map" points along the walls of a room.
    b = ""
    for _ in range(140):
        side = rnd.random()
        if side < 0.25:
            x, y = rnd.uniform(60, 580), rnd.uniform(60, 72)
        elif side < 0.5:
            x, y = rnd.uniform(60, 580), rnd.uniform(300, 312)
        elif side < 0.75:
            x, y = rnd.uniform(60, 72), rnd.uniform(60, 312)
        else:
            x, y = rnd.uniform(568, 580), rnd.uniform(60, 312)
        b += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.5" fill="{WHITE}" fill-opacity="0.45"/>'
    # Trajectory: a rounded loop, sampled into poses.
    poses = []
    for i in range(14):
        a = -math.pi / 2 + i * (2 * math.pi * 0.93) / 13
        x = 320 + 190 * math.cos(a) + rnd.uniform(-6, 6)
        y = 188 + 82 * math.sin(a) + rnd.uniform(-4, 4)
        poses.append((x, y, a + math.pi / 2))
    path = " ".join(f"{x:.1f},{y:.1f}" for x, y, _ in poses)
    b += f'<polyline points="{path}" fill="none" stroke="{MINT}" stroke-width="2" stroke-opacity="0.8"/>'
    # Landmarks and the rays from the poses that observed them.
    landmarks = [(200, 120), (430, 112), (500, 250), (160, 262), (330, 190)]
    for k, (x, y, _) in enumerate(poses):
        lx, ly = min(landmarks, key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)
        b += f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{lx}" y2="{ly}" stroke="{WHITE}" stroke-opacity="0.16"/>'
    for lx, ly in landmarks:
        b += (f'<rect x="{lx - 6}" y="{ly - 6}" width="12" height="12" fill="none" stroke="{ORANGE}" stroke-width="2" '
              f'transform="rotate(45 {lx} {ly})"/>')
    for x, y, h in poses:
        c, s_ = math.cos(h), math.sin(h)
        tip = (x + 12 * c, y + 12 * s_)
        l = (x - 7 * c - 6 * s_, y - 7 * s_ + 6 * c)
        r = (x - 7 * c + 6 * s_, y - 7 * s_ - 6 * c)
        b += (f'<polygon points="{tip[0]:.1f},{tip[1]:.1f} {l[0]:.1f},{l[1]:.1f} {r[0]:.1f},{r[1]:.1f}" '
              f'fill="#121818" stroke="{MINT}" stroke-width="2"/>')
    # Loop closure: last pose back to the first.
    (x0, y0, _), (x1, y1, _) = poses[0], poses[-1]
    b += (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x0:.1f}" y2="{y0:.1f}" stroke="{ORANGE}" '
          f'stroke-width="3" stroke-dasharray="7 6"/>')
    b += f'<text x="24" y="40" fill="{MINT}" font-family="Consolas,monospace" font-size="20" letter-spacing="3">POSE GRAPH</text>'
    b += (f'<text x="616" y="40" fill="{ORANGE}" font-family="Consolas,monospace" font-size="20" letter-spacing="3" '
          f'text-anchor="end">LOOP CLOSURE</text>')
    return frame(b)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in {
        "world-models": world_models,
        "slam": slam,
    }.items():
        (OUT / f"{name}.svg").write_text(fn(), encoding="utf-8")
        print("wrote", OUT / f"{name}.svg")
