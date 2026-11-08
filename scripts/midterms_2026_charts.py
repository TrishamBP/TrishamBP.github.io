"""US Midterms 2026 result charts for The Weekly Tech Brew #5 (9 Nov 2026).

Redraws the AP-projected Senate, House and Governor results as original
charts (seat hemicycles + state tile maps) instead of reusing map screenshots.
Each card is HTML/SVG rendered to PNG with headless Chrome, then cropped.

    python scripts/midterms_2026_charts.py

Data: AP projections as supplied by the user on 9 Nov 2026 (Senate 54-44,
House 254-162, Governors 28-20). "Leads" = race not yet called.
Colours validated with the dataviz validator on #fcfcfb (ΔE 36.5 normal,
27.3 protan): DEM #2F5BEA, GOP #D7263D.
"""
import math
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "newsletter" / "weekly-tech-brew-2026-11-09"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

SURFACE = "#fcfcfb"
INK = "#1e1e1e"
MUTED = "#5b6270"
DEM = "#2F5BEA"
GOP = "#D7263D"
NONE_FILL = "#eceef1"     # no race this cycle
PENDING = "#b9bec8"       # seat not yet called

# statebins-style tile grid (col, row)
TILES = {
    "AK": (0, 0), "ME": (11, 0),
    "WI": (6, 1), "VT": (10, 1), "NH": (11, 1),
    "WA": (1, 2), "ID": (2, 2), "MT": (3, 2), "ND": (4, 2), "MN": (5, 2), "IL": (6, 2), "MI": (7, 2),
    "NY": (9, 2), "MA": (10, 2),
    "OR": (1, 3), "NV": (2, 3), "WY": (3, 3), "SD": (4, 3), "IA": (5, 3), "IN": (6, 3), "OH": (7, 3),
    "PA": (8, 3), "NJ": (9, 3), "CT": (10, 3), "RI": (11, 3),
    "CA": (1, 4), "UT": (2, 4), "CO": (3, 4), "NE": (4, 4), "MO": (5, 4), "KY": (6, 4), "WV": (7, 4),
    "VA": (8, 4), "MD": (9, 4), "DE": (10, 4),
    "AZ": (2, 5), "NM": (3, 5), "KS": (4, 5), "AR": (5, 5), "TN": (6, 5), "NC": (7, 5), "SC": (8, 5),
    "OK": (4, 6), "LA": (5, 6), "MS": (6, 6), "AL": (7, 6), "GA": (8, 6),
    "HI": (0, 7), "TX": (4, 7), "FL": (9, 7),
}

# Race outcomes read off the AP result maps the user supplied.
SENATE = {
    "D": "OR CO NM TX KS MN IA IL MI OH GA SC NC VA ME NH MA RI NJ DE".split(),
    "DL": "AK MS".split(),
    "R": "ID MT WY SD NE OK AR LA KY TN WV AL FL".split(),
}
GOVERNOR = {
    "D": "OR CA NV AZ CO NM TX MN WI IA IL MI OH PA NY GA ME MA RI CT MD HI".split(),
    "DL": "KS AK".split(),
    "R": "ID WY SD NE OK AR TN AL SC FL VT NH".split(),
}

FONT = "'Segoe UI', 'Inter', Arial, sans-serif"
MONO = "Consolas, 'Cascadia Mono', monospace"

DEFS = f"""<defs>
  <pattern id="hatch-d" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="7" height="7" fill="#ffffff"/><rect width="3" height="7" fill="#c3d0fa"/></pattern>
  <pattern id="hatch-p" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="6" fill="#e3e6eb"/><rect width="2.5" height="6" fill="{PENDING}"/></pattern>
</defs>"""


def hemicycle(groups, width, rows):
    """Parliament chart. groups = [(count, fill)], ordered left -> right.
    Dot size follows the row spacing, so dots never overlap."""
    total = sum(n for n, _ in groups)
    pad = 12
    r_out = width / 2 - pad
    r_in = r_out * 0.4
    step = (r_out - r_in) / (rows - 1)
    radii = [r_in + step * i for i in range(rows)]
    per_row = [round(total * r / sum(radii)) for r in radii]
    per_row[-1] += total - sum(per_row)
    arc_step = min(math.pi * r / (n - 1) for r, n in zip(radii, per_row))
    dot_r = 0.42 * min(step, arc_step)
    seats = []
    for r, n in zip(radii, per_row):
        for k in range(n):
            seats.append((math.pi * (1 - k / (n - 1)), r))
    seats.sort(key=lambda s: (-s[0], s[1]))      # sweep left -> right, so parties form wedges
    fills = [f for n, f in groups for _ in range(n)]
    cx, cy = width / 2, r_out + pad
    circles = "".join(
        f'<circle cx="{cx + r * math.cos(a):.1f}" cy="{cy - r * math.sin(a):.1f}" r="{dot_r:.2f}" fill="{f}"/>'
        for (a, r), f in zip(seats, fills)
    )
    h = cy + pad
    return f'<svg width="{width}" height="{h:.0f}" viewBox="0 0 {width} {h:.0f}">{DEFS}{circles}</svg>'


def tile_map(result, size=50, gap=4):
    fill_for = {}
    for key, fill in (("D", DEM), ("DL", "url(#hatch-d)"), ("R", GOP)):
        for st in result[key]:
            fill_for[st] = fill
    cols = 1 + max(c for c, _ in TILES.values())
    rows = 1 + max(r for _, r in TILES.values())
    w, h = cols * (size + gap), rows * (size + gap)
    cells = []
    for st, (c, r) in TILES.items():
        x, y = c * (size + gap), r * (size + gap)
        fill = fill_for.get(st, NONE_FILL)
        colour = "#ffffff" if st in result["D"] + result["R"] else ("#1d3fb0" if fill.startswith("url") else "#9aa1ad")
        weight = 700 if st in fill_for else 500
        stroke = f' stroke="{DEM}" stroke-width="3"' if fill.startswith("url") else ""
        cells.append(
            f'<rect x="{x}" y="{y}" width="{size}" height="{size}" rx="5" fill="{fill}"{stroke}/>'
            f'<text x="{x + size / 2}" y="{y + size / 2 + 5}" text-anchor="middle" '
            f'font-family="{MONO}" font-size="14" font-weight="{weight}" fill="{colour}"'
            + f'>{st}</text>'
        )
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}">{DEFS}{"".join(cells)}</svg>'


def swatch(fill, label, extra=""):
    return (f'<span class="key"><svg width="16" height="16">{DEFS}<rect width="16" height="16" rx="3" '
            f'fill="{fill}"{extra}/></svg>{label}</span>')


def seat_bar(d, r, total, majority):
    pend = total - d - r
    pct = lambda n: 100 * n / total
    return f"""
    <div class="bar">
      <div style="width:{pct(d):.3f}%;background:{DEM}"></div>
      <div style="width:{pct(pend):.3f}%;background:repeating-linear-gradient(45deg,{PENDING} 0 3px,#e3e6eb 3px 6px)"></div>
      <div style="width:{pct(r):.3f}%;background:{GOP}"></div>
      {'' if not majority else f'<i style="left:{pct(majority):.3f}%"></i>'}
    </div>"""


CSS = f"""
* {{ box-sizing: border-box; margin: 0; }}
body {{ background: #ffffff; }}
.card {{ width: 1200px; padding: 44px 52px 34px; background: {SURFACE}; color: {INK}; font-family: {FONT};
        border-top: 10px solid {INK}; }}
.kicker {{ font: 600 15px {MONO}; letter-spacing: .16em; text-transform: uppercase; color: {MUTED}; }}
h1 {{ font-size: 40px; line-height: 1.1; margin: 8px 0 22px; letter-spacing: -.01em; }}
.score {{ display: flex; justify-content: space-between; align-items: flex-end; }}
.score .n {{ font-size: 76px; font-weight: 800; line-height: .9; letter-spacing: -.03em; }}
.score .p {{ font: 700 17px {MONO}; letter-spacing: .1em; color: {INK}; margin-left: 10px; }}
.score .mid {{ font: 15px {MONO}; color: {MUTED}; text-align: center; padding-bottom: 6px; }}
.score .r {{ text-align: right; }}
.chip {{ display: inline-block; width: 14px; height: 14px; border-radius: 3px; margin-right: 8px; vertical-align: -1px; }}
.bar {{ position: relative; display: flex; gap: 2px; height: 22px; margin: 16px 0 8px; }}
.bar div {{ height: 100%; }}
.bar div:first-child {{ border-radius: 4px 0 0 4px; }}
.bar div:nth-child(3) {{ border-radius: 0 4px 4px 0; }}
.bar i {{ position: absolute; top: -8px; bottom: -8px; width: 2px; margin-left: -1px; background: {INK}; }}
.sub {{ display: flex; justify-content: space-between; font: 15px {FONT}; color: {MUTED}; }}
.sub b {{ color: {INK}; }}
.body {{ display: flex; gap: 40px; align-items: center; justify-content: space-between; margin-top: 30px; }}
.legend {{ display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 22px; font: 15px {FONT}; color: {INK}; }}
.key {{ display: inline-flex; align-items: center; gap: 8px; }}
.note {{ font: 15px/1.5 {FONT}; color: {MUTED}; max-width: 440px; }}
.note b {{ color: {INK}; }}
.big {{ font-size: 54px; font-weight: 800; line-height: 1; letter-spacing: -.02em; }}
.foot {{ margin-top: 26px; padding-top: 14px; border-top: 1px solid #d9dce2; display: flex;
        justify-content: space-between; font: 13px {MONO}; color: {MUTED}; letter-spacing: .04em; }}
"""


def card(kicker, title, d, r, total, majority, mid_label, sub_left, sub_right, body, legend):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="card" id="card">
  <div class="kicker">{kicker}</div>
  <h1>{title}</h1>
  <div class="score">
    <div><span class="n" style="color:{DEM}">{d}</span><span class="p">DEM</span></div>
    <div class="mid">{mid_label}</div>
    <div class="r"><span class="p" style="margin:0 10px 0 0">GOP</span><span class="n" style="color:{GOP}">{r}</span></div>
  </div>
  {seat_bar(d, r, total, majority)}
  <div class="sub"><span>{sub_left}</span><span>{sub_right}</span></div>
  <div class="body">{body}</div>
  <div class="legend">{legend}</div>
  <div class="foot"><span>SOURCE: ASSOCIATED PRESS PROJECTIONS, 9 NOV 2026</span><span>THE WEEKLY TECH BREW #5</span></div>
</div></body></html>"""


def render(html, name, height):
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "card.html"
        src.write_text(html, encoding="utf-8")
        shot = Path(tmp) / "shot.png"
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        f"--user-data-dir={Path(tmp) / 'prof'}", "--force-device-scale-factor=1",
                        f"--window-size=1200,{height}", f"--screenshot={shot}", src.as_uri()],
                       check=True, capture_output=True)
        im = Image.open(shot).convert("RGB")
    # crop the white page margin below the card
    bbox = ImageChops.difference(im, Image.new("RGB", im.size, "#ffffff")).getbbox()
    im = im.crop((0, 0, 1200, bbox[3]))
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / name, optimize=True)
    print(name, im.size)


LEGEND_COMMON = (swatch(DEM, "Democrat won") + swatch(GOP, "Republican won")
                 + swatch("url(#hatch-d)", "Democrat leading, not yet called", f' stroke="{DEM}" stroke-width="2"'))


def senate():
    body = (f'<div>{hemicycle([(54, DEM), (2, "url(#hatch-p)"), (44, GOP)], 470, 6)}'
            f'<p class="note" style="margin-top:14px"><b>100 seats</b>, one dot each. '
            f'<b>Two independents</b> who caucus with the Democrats are counted in the 54. '
            f'Grey: 2 races still being counted.</p></div>'
            f'{tile_map(SENATE)}')
    legend = LEGEND_COMMON + swatch(NONE_FILL, "No Senate race this cycle")
    render(card("US Midterm Elections 2026 &middot; Senate", "Democrats take the US Senate",
                54, 44, 100, 51, "51 seats for a majority", "<b>+7</b> seats gained", "<b>&minus;7</b> seats lost",
                body, legend), "us-midterms-2026-senate-results-democrats-54-seats.png", 1100)


def house():
    body = (f'{hemicycle([(254, DEM), (19, "url(#hatch-p)"), (162, GOP)], 640, 12)}'
            f'<div class="note"><div class="big" style="color:{DEM}">+42</div>'
            f'<p style="margin:6px 0 22px">House seats flipped to the Democrats, giving them a '
            f'<b>36-seat cushion</b> over the 218 needed to control the chamber.</p>'
            f'<div class="big" style="color:{MUTED}">19</div>'
            f'<p style="margin-top:6px">seats still being counted or heading to a runoff.</p></div>')
    legend = (swatch(DEM, "Democrat") + swatch(GOP, "Republican")
              + swatch("url(#hatch-p)", "Not yet called"))
    render(card("US Midterm Elections 2026 &middot; House of Representatives",
                "Democrats win the House by a landslide", 254, 162, 435, 218, "218 seats for a majority",
                "<b>+42</b> seats gained", "<b>&minus;42</b> seats lost", body, legend),
           "us-midterms-2026-house-results-democrats-254-seats.png", 1000)


def governors():
    body = (f'<div class="note"><div class="big" style="color:{DEM}">+5</div>'
            f'<p style="margin:6px 0 22px">governorships gained by the Democrats, including '
            f'<b>Texas</b> and <b>Georgia</b>, where they had not won the governor\'s mansion in decades.</p>'
            f'<p>The 28&ndash;20 count covers all 50 governors, including states with no race this year. '
            f'Kansas and Alaska are still being counted.</p></div>'
            f'{tile_map(GOVERNOR)}')
    legend = LEGEND_COMMON + swatch(NONE_FILL, "No governor race this cycle")
    render(card("US Midterm Elections 2026 &middot; Governors", "Democrats now hold 28 governorships",
                28, 20, 50, None, "50 governors", "<b>+5</b> seats gained", "<b>&minus;5</b> seats lost",
                body, legend), "us-midterms-2026-governor-results-democrats-28-states.png", 1100)


if __name__ == "__main__":
    senate()
    house()
    governors()
