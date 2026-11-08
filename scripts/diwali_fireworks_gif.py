"""Animated Diwali fireworks GIF for The Weekly Tech Brew #5 Diwali Edition email.

Gmail strips CSS animation and scripts, so the email's festive motion is a GIF:
gold "Happy Diwali" + "शुभ दीपावली", a row of flickering diyas, and crackers
bursting across a night sky in the issue's gold / saffron / rose / cyan palette.

    python scripts/diwali_fireworks_gif.py

- Seamless loop: every burst is evaluated analytically at time t (mod LOOP), so
  the last frame flows straight back into the first.
- 2x supersampled, glow = blurred copy of the spark layer added back.
- Pillow here has no raqm, so it can't shape Devanagari: the Hindi line is
  rendered once by headless Chrome and used as a mask.
"""
import math
import random
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "newsletter" / "weekly-tech-brew-2026-11-09" / "diwali-fireworks-happy-diwali.gif"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FONTS = Path(r"C:\Windows\Fonts")

W, H, SS = 800, 400, 2
SW, SH = W * SS, H * SS
FRAMES, MS = 54, 70                 # 3.78 s loop
LOOP = FRAMES * MS / 1000
GRAV = 260.0 * SS                    # px/s^2 at supersampled scale

GOLD, SAFFRON, MARIGOLD, ROSE, CREAM, CYAN, RED, LIME = (
    (255, 201, 74), (255, 138, 31), (255, 176, 0), (255, 79, 154),
    (255, 243, 196), (127, 231, 255), (255, 90, 60), (185, 255, 107))
COLOURS = [GOLD, SAFFRON, ROSE, CYAN, MARIGOLD, LIME, RED, CREAM]


def font(name, size, index=0):
    return ImageFont.truetype(str(FONTS / name), size * SS, index=index)


def make_bursts(seed=7):
    rnd = random.Random(seed)
    # (launch time, burst x, burst y) spread over the loop, avoiding the title band in the middle
    spots = [(0.13, 0.20), (0.86, 0.22), (0.50, 0.13), (0.30, 0.28), (0.72, 0.12),
             (0.10, 0.42), (0.90, 0.40), (0.36, 0.12), (0.64, 0.30), (0.20, 0.10),
             (0.80, 0.08), (0.55, 0.22)]
    bursts = []
    for i, (fx, fy) in enumerate(spots):
        kind = ["peony", "ring", "willow", "peony", "crackle", "peony",
                "ring", "willow", "peony", "crackle", "peony", "ring"][i]
        n = {"peony": 90, "ring": 64, "willow": 90, "crackle": 80}[kind]
        speed = {"peony": 300, "ring": 300, "willow": 230, "crackle": 270}[kind] * SS
        tilt = rnd.uniform(0.45, 0.9)
        parts = []
        for k in range(n):
            if kind == "ring":
                a, s = 2 * math.pi * k / n, speed
                vx, vy = math.cos(a) * s, math.sin(a) * s * tilt
            else:
                a, s = rnd.uniform(0, 2 * math.pi), speed * math.sqrt(rnd.random()) * rnd.uniform(0.85, 1.1)
                vx, vy = math.cos(a) * s, math.sin(a) * s
            parts.append((vx, vy, rnd.uniform(0.75, 1.0)))
        bursts.append(dict(
            t0=LOOP * i / len(spots), x=fx * SW, y=fy * SH, kind=kind, parts=parts,
            col=COLOURS[i % len(COLOURS)], alt=COLOURS[(i + 3) % len(COLOURS)],
            rise=0.4, life=2.3 if kind == "willow" else 1.9,
            sx=fx * SW + rnd.uniform(-60, 60) * SS))
    return bursts


def spark_pos(b, vx, vy, tau, drag):
    # exponential drag on velocity, gravity on top; closed form so frames are independent
    k = (1 - math.exp(-drag * tau)) / drag
    g = GRAV * (1.4 if b["kind"] == "willow" else 1.0) * 0.5 * tau * tau * 0.3
    return b["x"] + vx * k, b["y"] + vy * k + g


def draw_bursts(d, t, bursts):
    for b in bursts:
        local = (t - b["t0"]) % LOOP
        # rocket climb
        if local < b["rise"]:
            p = local / b["rise"]
            e = 1 - (1 - p) ** 2
            x = b["sx"] + (b["x"] - b["sx"]) * e
            y = SH + 10 * SS + (b["y"] - SH - 10 * SS) * e
            x2 = b["sx"] + (b["x"] - b["sx"]) * max(0, e - 0.12)
            y2 = SH + 10 * SS + (b["y"] - SH - 10 * SS) * max(0, e - 0.12)
            d.line([(x2, y2), (x, y)], fill=MARIGOLD, width=3 * SS)
            continue
        tau = local - b["rise"]
        if tau > b["life"]:
            continue
        fade = max(0.0, 1 - tau / b["life"]) ** 1.3
        if tau < 0.08:  # small white-hot core at the moment of the burst
            r = 9 * SS
            d.ellipse([b["x"] - r, b["y"] - r, b["x"] + r, b["y"] + r], fill=CREAM)
        drag = 2.2 if b["kind"] != "willow" else 1.5
        for i, (vx, vy, w) in enumerate(b["parts"]):
            if b["kind"] == "crackle" and tau > 0.6 and (i + int(tau * 30)) % 3:
                continue  # strobing crackle
            col = b["alt"] if (b["kind"] == "peony" and i % 4 == 0) else b["col"]
            if b["kind"] == "willow":
                col = GOLD if i % 3 else MARIGOLD
            x1, y1 = spark_pos(b, vx, vy, tau, drag)
            x0, y0 = spark_pos(b, vx, vy, max(0, tau - 0.07), drag)
            c = tuple(int(ch * fade * w) for ch in col)
            d.line([(x0, y0), (x1, y1)], fill=c, width=max(1, int(2.4 * SS * (0.5 + 0.5 * fade))))


def sky():
    img = Image.new("RGB", (SW, SH))
    px = img.load()
    for y in range(SH):
        f = y / SH
        row = (int(1 + 24 * f ** 2.2), int(1 + 9 * f ** 2.2), int(4 + 2 * f))
        for x in range(SW):
            px[x, y] = row
    # warm horizon glow behind the diyas
    glow = Image.new("L", (SW, SH), 0)
    ImageDraw.Draw(glow).ellipse([SW * 0.15, SH * 0.72, SW * 0.85, SH * 1.25], fill=150)
    glow = glow.filter(ImageFilter.GaussianBlur(70 * SS))
    warm = Image.new("RGB", (SW, SH), (120, 50, 6))
    return Image.composite(warm, img, glow)


def hindi_mask():
    """'शुभ दीपावली' shaped by Chrome, returned as an L mask."""
    html = ("<html><body style='margin:0;background:#000'><div style=\"font:700 64px 'Nirmala UI';"
            "color:#fff;padding:10px 20px;display:inline-block\">शुभ दीपावली</div></body></html>")
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "h.html"
        src.write_text(html, encoding="utf-8")
        shot = Path(tmp) / "h.png"
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        f"--user-data-dir={Path(tmp) / 'p'}", "--force-device-scale-factor=1",
                        "--window-size=900,200", f"--screenshot={shot}", src.as_uri()],
                       check=True, capture_output=True)
        m = Image.open(shot).convert("L")
    return m.crop(m.getbbox())


def static_layer():
    """Title block + diya bowls, drawn once (RGBA, supersampled)."""
    layer = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = SW // 2

    hm = hindi_mask()
    scale = (44 * SS) / hm.height
    hm = hm.resize((int(hm.width * scale), int(hm.height * scale)), Image.LANCZOS)
    layer.paste(Image.new("RGBA", hm.size, GOLD + (255,)), (cx - hm.width // 2, int(SH * 0.27)), hm)

    title = font("seguibl.ttf", 74)
    ty = int(SH * 0.50)
    # soft shadow glow under the title
    shadow = Image.new("L", (SW, SH), 0)
    ImageDraw.Draw(shadow).text((cx, ty), "Happy Diwali", font=title, fill=200, anchor="mm")
    shadow = shadow.filter(ImageFilter.GaussianBlur(14 * SS))
    layer.paste(Image.new("RGBA", (SW, SH), SAFFRON + (150,)), (0, 0), shadow)
    # vertical gold gradient fill through the text mask
    tmask = Image.new("L", (SW, SH), 0)
    ImageDraw.Draw(tmask).text((cx, ty), "Happy Diwali", font=title, fill=255, anchor="mm")
    grad = Image.new("RGBA", (SW, SH))
    gd = ImageDraw.Draw(grad)
    top, bot = ty - 45 * SS, ty + 40 * SS
    for y in range(SH):
        f = min(1, max(0, (y - top) / (bot - top)))
        c = tuple(int(a + (b - a) * f) for a, b in zip(CREAM, SAFFRON))
        gd.line([(0, y), (SW, y)], fill=c + (255,))
    layer.paste(grad, (0, 0), tmask)

    sub = font("consola.ttf", 15)
    d.text((cx, int(SH * 0.635)), "THE WEEKLY TECH BREW  \u00b7  DIWALI EDITION", font=sub,
           fill=(232, 205, 160, 255), anchor="mm")

    # diya bowls
    for x in diya_xs():
        y = int(SH * 0.86)
        w, h = 46 * SS, 20 * SS
        d.pieslice([x - w // 2, y - h, x + w // 2, y + h], 0, 180, fill=(196, 92, 30, 255))
        d.ellipse([x - w // 2, y - 4 * SS, x + w // 2, y + 4 * SS], fill=(243, 163, 90, 255))
    return layer


def diya_xs():
    n = 7
    return [int(SW * (0.2 + 0.6 * i / (n - 1))) for i in range(n)]


def draw_flames(d, t):
    for i, x in enumerate(diya_xs()):
        y = int(SH * 0.86) - 3 * SS
        ph = 2 * math.pi * (t / LOOP) * (3 + i % 3) + i * 1.7   # integer cycles per loop: seamless
        s = 1 + 0.12 * math.sin(ph) + 0.06 * math.sin(2.3 * ph)
        sway = 2.2 * SS * math.sin(ph * 0.5 + i)
        fh, fw = 26 * SS * s, 11 * SS
        d.ellipse([x - fw * 1.9 + sway, y - fh * 1.25, x + fw * 1.9 + sway, y + 4 * SS],
                  fill=(60, 26, 4))  # faint halo (blurred later)
        d.polygon([(x - fw / 2, y), (x + sway, y - fh), (x + fw / 2, y)], fill=SAFFRON)
        d.ellipse([x - fw / 2, y - fh * 0.45, x + fw / 2, y + 2 * SS], fill=MARIGOLD)
        d.ellipse([x - fw / 4, y - fh * 0.3, x + fw / 4, y], fill=CREAM)


def frame(i, base, overlay, bursts):
    t = i * MS / 1000
    light = Image.new("RGB", (SW, SH))
    d = ImageDraw.Draw(light)
    draw_bursts(d, t, bursts)
    draw_flames(d, t)
    glow = light.filter(ImageFilter.GaussianBlur(9 * SS))
    img = ImageChops.add(base, ImageChops.add(light, glow))
    img = img.convert("RGBA")
    img.alpha_composite(overlay)
    return img.convert("RGB").resize((W, H), Image.LANCZOS)


def main():
    base, overlay, bursts = sky(), static_layer(), make_bursts()
    imgs = [frame(i, base, overlay, bursts) for i in range(FRAMES)]
    # shared palette: sample several frames + flat swatches so thin sparks keep their hue
    sample = Image.new("RGB", (W, H * 4))
    for k, idx in enumerate((5, 18, 31, 44)):
        sample.paste(imgs[idx], (0, k * H))
    sw = ImageDraw.Draw(sample)
    for k, c in enumerate(COLOURS):
        sw.rectangle([k * 60, 0, k * 60 + 59, 59], fill=c)
    pal = sample.quantize(colors=96, method=Image.Quantize.MEDIANCUT)
    frames = [im.quantize(palette=pal, dither=Image.Dither.NONE) for im in imgs]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=MS, loop=0, optimize=True, disposal=1)
    print(f"wrote {OUT.relative_to(ROOT)} ({len(frames)} frames, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
