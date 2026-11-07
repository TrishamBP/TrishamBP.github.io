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


def perception_4d():
    rnd = random.Random(4)
    b = ""
    # Three time-slices of a point cloud, offset in depth.
    for s, (ox, op) in enumerate([(-120, 0.25), (-60, 0.5), (0, 1.0)]):
        pts = []
        for _ in range(160):
            a = rnd.uniform(0, 2 * math.pi)
            r = rnd.uniform(20, 130)
            x = 330 + ox + r * math.cos(a) * 1.6
            y = 200 + r * math.sin(a) * 0.45 + s * 4
            col = MINT if rnd.random() > 0.15 else ORANGE
            pts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.6" fill="{col}" fill-opacity="{op}"/>')
        b += "".join(pts)
    # Tracked object box with motion vector.
    b += (f'<rect x="372" y="150" width="70" height="56" fill="none" stroke="{ORANGE}" stroke-width="2"/>'
          f'<line x1="250" y1="180" x2="368" y2="178" stroke="{ORANGE}" stroke-width="2" stroke-dasharray="5 5"/>'
          f'<polygon points="368,172 380,178 368,184" fill="{ORANGE}"/>')
    b += f'<text x="24" y="40" fill="{MINT}" font-family="Consolas,monospace" font-size="20" letter-spacing="3">X Y Z + T</text>'
    return frame(b)


def vla_models():
    b = ""
    # Input token rows on the left, action tokens on the right, a model block between.
    for x in range(40, 200, 30):
        b += f'<rect x="{x}" y="90" width="22" height="22" fill="{MINT}" fill-opacity="0.75"/>'
        b += f'<rect x="{x}" y="170" width="22" height="22" fill="none" stroke="{WHITE}" stroke-opacity="0.8"/>'
    b += f'<rect x="250" y="70" width="140" height="150" fill="#182020" stroke="{WHITE}" stroke-opacity="0.5"/>'
    for y in range(90, 210, 18):
        b += f'<line x1="266" y1="{y}" x2="374" y2="{y}" stroke="{WHITE}" stroke-opacity="0.18"/>'
    b += f'<text x="320" y="152" fill="{WHITE}" font-family="Consolas,monospace" font-size="22" text-anchor="middle" letter-spacing="4">VLA</text>'
    for y in (101, 181):
        b += f'<line x1="200" y1="{y}" x2="248" y2="{y}" stroke="{WHITE}" stroke-opacity="0.4"/>'
    for i, x in enumerate(range(430, 610, 30)):
        h = 18 + 22 * abs(math.sin(i * 1.3))
        b += f'<rect x="{x}" y="{170 - h}" width="22" height="{h:.1f}" fill="{ORANGE}" fill-opacity="{0.55 + 0.07 * i}"/>'
    b += f'<line x1="392" y1="145" x2="428" y2="145" stroke="{ORANGE}" stroke-width="2"/>'
    b += (f'<text x="40" y="78" fill="{MINT}" font-family="Consolas,monospace" font-size="18" letter-spacing="3">SEE</text>'
          f'<text x="40" y="160" fill="{WHITE}" font-family="Consolas,monospace" font-size="18" letter-spacing="3" fill-opacity="0.8">SAY</text>'
          f'<text x="430" y="195" fill="{ORANGE}" font-family="Consolas,monospace" font-size="18" letter-spacing="3">ACT</text>')
    b += floor(285, "rgba(255,255,255,0.08)")
    return frame(b)


def robot_manipulation():
    b = floor(250)
    # Two-link arm with a parallel gripper over a cube.
    base, j1, j2 = (210, 300), (270, 150), (410, 140)
    b += f'<rect x="180" y="300" width="60" height="18" fill="#1b2323" stroke="{WHITE}" stroke-opacity="0.6"/>'
    b += (f'<polyline points="{base[0]},{base[1]} {j1[0]},{j1[1]} {j2[0]},{j2[1]}" fill="none" '
          f'stroke="{WHITE}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9"/>')
    for (x, y) in (base, j1, j2):
        b += f'<circle cx="{x}" cy="{y}" r="9" fill="#121818" stroke="{ORANGE}" stroke-width="3"/>'
    b += (f'<line x1="410" y1="140" x2="410" y2="190" stroke="{WHITE}" stroke-width="6"/>'
          f'<path d="M388 190 H432 M392 190 V218 M428 190 V218" fill="none" stroke="{WHITE}" stroke-width="5"/>')
    b += (f'<rect x="396" y="222" width="28" height="28" fill="{MINT}" fill-opacity="0.85"/>'
          f'<path d="M370 268 A 50 14 0 0 0 450 268" fill="none" stroke="{MINT}" stroke-opacity="0.5" stroke-dasharray="4 5"/>')
    b += f'<text x="24" y="40" fill="{MINT}" font-family="Consolas,monospace" font-size="20" letter-spacing="3">GRASP · PLACE · USE</text>'
    return frame(b)


def sim_to_real():
    b = f'<line x1="320" y1="40" x2="320" y2="330" stroke="{WHITE}" stroke-opacity="0.35" stroke-dasharray="4 6"/>'

    def bot(cx, solid):
        st = f'stroke="{MINT if not solid else WHITE}" fill="{"#1c2525" if solid else "none"}" stroke-width="2"'
        return (f'<rect x="{cx-40}" y="120" width="80" height="70" {st}/>'
                f'<rect x="{cx-26}" y="80" width="52" height="34" {st}/>'
                f'<circle cx="{cx-10}" cy="97" r="4" fill="{ORANGE}"/><circle cx="{cx+10}" cy="97" r="4" fill="{ORANGE}"/>'
                f'<line x1="{cx-20}" y1="190" x2="{cx-28}" y2="260" stroke="{MINT if not solid else WHITE}" stroke-width="6"/>'
                f'<line x1="{cx+20}" y1="190" x2="{cx+28}" y2="260" stroke="{MINT if not solid else WHITE}" stroke-width="6"/>')

    # Wireframe sim side gets a randomized triangle mesh floor.
    rnd = random.Random(7)
    for _ in range(26):
        x, y = rnd.uniform(20, 300), rnd.uniform(270, 340)
        b += f'<polygon points="{x:.0f},{y:.0f} {x+22:.0f},{y-8:.0f} {x+12:.0f},{y+12:.0f}" fill="none" stroke="{MINT}" stroke-opacity="0.3"/>'
    b += f'<rect x="340" y="268" width="280" height="70" fill="#182020"/>'
    b += bot(170, False) + bot(470, True)
    b += (f'<path d="M230 60 C 290 30, 350 30, 410 60" fill="none" stroke="{ORANGE}" stroke-width="2"/>'
          f'<polygon points="404,52 416,63 401,66" fill="{ORANGE}"/>')
    b += (f'<text x="24" y="40" fill="{MINT}" font-family="Consolas,monospace" font-size="20" letter-spacing="3">SIM</text>'
          f'<text x="616" y="40" fill="{WHITE}" font-family="Consolas,monospace" font-size="20" letter-spacing="3" text-anchor="end">REAL</text>')
    return frame(b)


def locomotion():
    # Uneven terrain + a stick-figure biped in three gait phases.
    pts = " ".join(f"{x},{300 + 14 * math.sin(x / 45) + 6 * math.sin(x / 13):.1f}" for x in range(0, W + 1, 8))
    b = f'<polyline points="{pts}" fill="none" stroke="{WHITE}" stroke-opacity="0.6" stroke-width="2"/>'
    for i, (cx, op) in enumerate([(170, 0.3), (320, 0.6), (470, 1.0)]):
        col = ORANGE if i == 2 else MINT
        ph = i * 1.1
        hip = (cx, 205)
        b += f'<g stroke="{col}" stroke-opacity="{op}" stroke-width="5" stroke-linecap="round" fill="none">'
        b += f'<line x1="{cx}" y1="130" x2="{cx}" y2="205"/>'
        b += f'<circle cx="{cx}" cy="112" r="14"/>'
        for side in (-1, 1):
            a = 0.45 * math.sin(ph) * side
            kx, ky = hip[0] + 45 * math.sin(a), hip[1] + 45 * math.cos(a)
            fx, fy = kx + 45 * math.sin(a - 0.25 * side), ky + 45 * math.cos(a - 0.25 * side)
            b += f'<polyline points="{hip[0]},{hip[1]} {kx:.1f},{ky:.1f} {fx:.1f},{fy:.1f}"/>'
            b += f'<polyline points="{cx},{145} {cx + 30 * side * math.cos(ph):.1f},{185}"/>'
        b += "</g>"
    b += f'<text x="24" y="40" fill="{MINT}" font-family="Consolas,monospace" font-size="20" letter-spacing="3">BALANCE · STEP · RECOVER</text>'
    return frame(b)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in {
        "world-models": world_models,
        "4d-perception": perception_4d,
        "vla-models": vla_models,
        "robot-manipulation": robot_manipulation,
        "sim-to-real": sim_to_real,
        "locomotion": locomotion,
    }.items():
        (OUT / f"{name}.svg").write_text(fn(), encoding="utf-8")
        print("wrote", OUT / f"{name}.svg")
