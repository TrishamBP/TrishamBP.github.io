"""Animated GIF for the 26 Oct 2026 newsletter email: the clocks fall back.

UK: Sun 25 Oct 2026, 02:00 BST -> 01:00 GMT.
US: Sun 1 Nov 2026, 02:00 EDT -> 01:00 EST.

The London clock rewinds first, then New York. Rendered at 2x and downscaled
for anti-aliasing; shown at 536px wide in the email (1072px source = retina).

    python scripts/dst_clocks_fall_back_gif.py
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/newsletter/weekly-tech-brew-2026-10-26/daylight-saving-time-ends-uk-usa-clocks-fall-back.gif"
PAPER, PANEL, INK, SOFT, GREEN, MAGENTA = "#e5e5e5", "#dedede", "#1e1e1e", "#5c5c5c", "#028a4b", "#b8399a"
W, H, S = 1072, 444, 2  # output size, supersample factor
FONTS = Path("C:/Windows/Fonts")


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size * S)


MONO, MONO_B, SANS_B = (lambda s: font("consola.ttf", s)), (lambda s: font("consolab.ttf", s)), (lambda s: font("arialbd.ttf", s))

CLOCKS = [
    dict(cx=268, city="LONDON", country="United Kingdom", date="SUN 25 OCT 2026", before="BST", after="GMT"),
    dict(cx=804, city="NEW YORK", country="United States", date="SUN 1 NOV 2026", before="EDT", after="EST"),
]
CY, R = 236, 90


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * t)


def clock_track():
    """Per-frame ((minutes, state) UK, (minutes, state) US, duration_ms).
    Minutes count from 00:00; state is "before", "rewind" or "after"."""
    frames = []
    hold = lambda uk, us, ms: frames.append((uk, us, ms))
    hold((118, "before"), (118, "before"), 700)
    hold((119, "before"), (119, "before"), 700)
    hold((120, "before"), (119, "before"), 500)  # London hits 02:00
    for i in range(1, 19):  # London rewinds an hour
        hold((120 - 60 * ease(i / 18), "rewind"), (119, "before"), 55)
    hold((60, "after"), (119, "before"), 1100)
    hold((60, "after"), (120, "before"), 500)  # New York hits 02:00
    for i in range(1, 19):
        hold((60, "after"), (120 - 60 * ease(i / 18), "rewind"), 55)
    hold((60, "after"), (60, "after"), 3200)
    return frames


def text(d, xy, s, f, fill, anchor="mm"):
    d.text((xy[0] * S, xy[1] * S), s, font=f, fill=fill, anchor=anchor)


def hand(d, cx, angle_deg, length, width, fill):
    a = math.radians(angle_deg - 90)
    x, y = cx + length * math.cos(a), CY + length * math.sin(a)
    d.line([(cx * S, CY * S), (x * S, y * S)], fill=fill, width=width * S)
    r = width / 2
    d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=fill)


def draw_clock(d, c, minutes, state):
    cx = c["cx"]
    rewinding, done = state == "rewind", state == "after"
    # face
    d.ellipse([(cx - R - 6) * S, (CY - R - 6) * S, (cx + R + 6) * S, (CY + R + 6) * S], fill=INK)
    d.ellipse([(cx - R) * S, (CY - R) * S, (cx + R) * S, (CY + R) * S], fill="#fefefe")
    for i in range(60):
        a = math.radians(i * 6 - 90)
        r0 = R - (14 if i % 5 == 0 else 7)
        d.line([((cx + r0 * math.cos(a)) * S, (CY + r0 * math.sin(a)) * S),
                ((cx + (R - 4) * math.cos(a)) * S, (CY + (R - 4) * math.sin(a)) * S)],
               fill=INK if i % 5 == 0 else "#9a9a9a", width=(4 if i % 5 == 0 else 2) * S)
    # the lost hour, swept in magenta while rewinding
    if rewinding:
        sweep = (minutes - 60) * 6
        d.pieslice([(cx - R + 18) * S, (CY - R + 18) * S, (cx + R - 18) * S, (CY + R - 18) * S],
                   -90, -90 + sweep, fill="#f1d3ea")
    hand(d, cx, (minutes / 60) * 30, 50, 8, INK)
    hand(d, cx, (minutes % 60) * 6, 74, 5, MAGENTA if rewinding else INK)
    d.ellipse([(cx - 8) * S, (CY - 8) * S, (cx + 8) * S, (CY + 8) * S], fill=GREEN)
    # labels
    text(d, (cx, 72), c["city"], SANS_B(40), INK)
    text(d, (cx, 110), f'{c["country"]} · {c["date"]}', MONO_B(22), SOFT)
    m = round(minutes)
    zone = c["after"] if done else c["before"]
    readout = f"{m // 60:02d}:{m % 60:02d} {zone}"
    bx0, bx1, by0, by1 = cx - 120, cx + 120, 346, 392
    d.rectangle([bx0 * S, by0 * S, bx1 * S, by1 * S], fill=GREEN if done else INK)
    text(d, (cx, 369), readout, MONO_B(30), "#fefefe")
    if rewinding:
        text(d, (cx + R + 22, CY - R + 8), "-1h", MONO_B(30), MAGENTA)
    if done:
        text(d, (cx, 415), "+1 HOUR OF SLEEP", MONO_B(22), GREEN)


def frame(uk, us):
    img = Image.new("RGB", (W * S, H * S), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W * S, 46 * S], fill=INK)
    text(d, (W / 2, 23), "DAYLIGHT SAVING TIME ENDS · CLOCKS FALL BACK 1 HOUR", MONO_B(24), "#fefefe")
    d.line([(W / 2 * S, 66 * S), (W / 2 * S, 426 * S)], fill="#b5b5b5", width=2 * S)
    for c, (minutes, state) in zip(CLOCKS, (uk, us)):
        draw_clock(d, c, minutes, state)
    d.rectangle([0, 0, W * S - 1, H * S - 1], outline=INK, width=4 * S)
    return img.resize((W, H), Image.LANCZOS)


def main():
    track = clock_track()
    # one shared palette keeps colours steady across frames
    imgs = [frame(uk, us) for uk, us, _ in track]
    sample = Image.new("RGB", (W, H * 2))
    sample.paste(imgs[12], (0, 0))  # mid-rewind: magenta sweep
    sample.paste(imgs[-1], (0, H))  # finished: green readouts
    swatch = ImageDraw.Draw(sample)  # big flat patches so median cut keeps the thin magenta hand
    for i, colour in enumerate((MAGENTA, GREEN, "#f1d3ea", INK)):
        swatch.rectangle([i * 120, 0, i * 120 + 119, 119], fill=colour)
    pal = sample.quantize(colors=64, method=Image.Quantize.MEDIANCUT)
    frames = [im.quantize(palette=pal, dither=Image.Dither.NONE) for im in imgs]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=[ms for *_, ms in track],
                   loop=0, optimize=True, disposal=1)
    print(f"wrote {OUT.relative_to(ROOT)} ({len(frames)} frames, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
