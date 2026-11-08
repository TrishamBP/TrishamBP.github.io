"""Images for "Battle of the Always-On Agents" in The Weekly Tech Brew #5 (9 Nov 2026).

    python scripts/agent_battle_2026_images.py

Original HTML cards rendered to PNG with headless Chrome (no logos or launch
art reused): a four-way "versus" hero and a launch timeline.
Contender colours = dataviz default categorical slots 1-4 in fixed order
(Dots, Muse, Duet, Grok Bot). Aqua/yellow are < 3:1 on the surface, so every
mark is direct-labelled in ink and colour is never the only cue.
Facts come from the source issue the user supplied (Ray Fu, 2 Nov 2026).
"""
import subprocess
import tempfile
from datetime import date
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "newsletter" / "weekly-tech-brew-2026-11-09"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

SURFACE, INK, MUTED, RULE = "#fcfcfb", "#1e1e1e", "#5b6270", "#d9dce2"
FONT = "'Segoe UI', Arial, sans-serif"
MONO = "Consolas, 'Cascadia Mono', monospace"

AGENTS = [
    # name, maker, colour, best for, price headline, price note, access
    ("Dots", "OpenAI", "#2a78d6", "Work inside ChatGPT, Slack &amp; Teams",
     "$100", "/mo via ChatGPT Pro", "Not in EEA, UK, CH at launch"),
    ("Muse", "Meta", "#eb6834", "Everyday errands: shopping, bookings, email",
     "Free", "tier &middot; paid from $20/mo", "US &amp; Canada"),
    ("Duet", "Anthropic", "#1baf7a", "Asks before it acts",
     "$0", "extra in preview &middot; needs Claude Pro/Max", "US only &middot; waitlist"),
    ("Grok Bot", "xAI &middot; built by Cursor", "#eda100", "Developers: code, CRM, invoices",
     "$20", "/mo with Cursor &middot; or SuperGrok $30", "Widest device reach"),
]

LAUNCHES = [  # date, agent index, label
    (date(2026, 8, 11), 3, "Beta opens"),
    (date(2026, 9, 8), 1, "US adults"),
    (date(2026, 9, 29), 0, "DevDay"),
    (date(2026, 10, 21), 2, "Research preview"),
]

BASE_CSS = f"""
* {{ box-sizing: border-box; margin: 0; }}
body {{ background: #fff; }}
.card {{ width: 1200px; padding: 44px 52px 34px; background: {SURFACE}; color: {INK};
        font-family: {FONT}; border-top: 10px solid {INK}; }}
.kicker {{ font: 600 15px {MONO}; letter-spacing: .16em; text-transform: uppercase; color: {MUTED}; }}
h1 {{ font-size: 46px; line-height: 1.05; margin: 10px 0 8px; letter-spacing: -.015em; }}
.lede {{ font-size: 19px; color: {MUTED}; margin-bottom: 30px; }}
.foot {{ margin-top: 28px; padding-top: 14px; border-top: 1px solid {RULE}; display: flex;
        justify-content: space-between; font: 13px {MONO}; color: {MUTED}; letter-spacing: .04em; }}
"""


def hero():
    cells = []
    for i, (name, maker, col, best, price, note, access) in enumerate(AGENTS):
        cells.append(f"""
        <div class="agent">
          <div class="bar" style="background:{col}"></div>
          <div class="maker">{maker}</div>
          <div class="name">{name}</div>
          <div class="best">{best}</div>
          <div class="price">{price}<span>{note}</span></div>
          <div class="access">{access}</div>
        </div>""")
        if i < len(AGENTS) - 1:
            cells.append('<div class="vs">VS</div>')
    css = BASE_CSS + f"""
    .row {{ display: flex; align-items: stretch; gap: 0; }}
    .agent {{ flex: 1; background: #fff; border: 2px solid {INK}; box-shadow: 5px 5px 0 {INK};
             padding: 0 18px 18px; display: flex; flex-direction: column; }}
    .bar {{ height: 12px; margin: 0 -18px 16px; }}
    .maker {{ font: 600 13px {MONO}; letter-spacing: .1em; text-transform: uppercase; color: {MUTED}; }}
    .name {{ font-size: 38px; font-weight: 800; letter-spacing: -.02em; margin: 4px 0 10px; }}
    .best {{ font-size: 16px; line-height: 1.35; min-height: 44px; }}
    .price {{ margin-top: auto; padding-top: 18px; font-size: 40px; font-weight: 800; line-height: 1; }}
    .price span {{ display: block; margin-top: 6px; font: 400 14px {FONT}; color: {MUTED}; }}
    .access {{ margin-top: 14px; padding-top: 10px; border-top: 1px solid {RULE};
              font: 13px {MONO}; color: {INK}; }}
    .vs {{ align-self: center; width: 34px; text-align: center; font: 800 14px {MONO}; color: {MUTED}; }}
    """
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>
    <div class="card">
      <div class="kicker">AI Agents &middot; OpenAI &middot; Meta &middot; Anthropic &middot; xAI</div>
      <h1>Battle of the Always-On Agents</h1>
      <p class="lede">Four labs, one idea: an AI that keeps working after you close the app. Four very different deals.</p>
      <div class="row">{''.join(cells)}</div>
      <div class="foot"><span>ENTRY PRICES &amp; ACCESS AS OF 2 NOV 2026</span><span>THE WEEKLY TECH BREW #5</span></div>
    </div></body></html>"""
    render(html, "always-on-ai-agents-dots-muse-duet-grok-bot-comparison.png", 900)


def timeline():
    start, end = date(2026, 8, 1), date(2026, 10, 31)
    span = (end - start).days
    x0, x1 = 40, 1056          # plot x-range inside the 1096px-wide svg
    xs = lambda d: x0 + (x1 - x0) * (d - start).days / span
    axis_y = 150
    marks = []
    # month ticks
    for m, label in ((8, "AUG"), (9, "SEP"), (10, "OCT")):
        x = xs(date(2026, m, 1))
        marks.append(f'<line x1="{x:.1f}" y1="{axis_y - 6}" x2="{x:.1f}" y2="{axis_y + 6}" stroke="{MUTED}" stroke-width="1.5"/>'
                     f'<text x="{x + 6:.1f}" y="{axis_y + 26}" font-family="{MONO}" font-size="13" fill="{MUTED}">{label} 2026</text>')
    for k, (d, idx, label) in enumerate(LAUNCHES):
        name, maker, col = AGENTS[idx][0], AGENTS[idx][1], AGENTS[idx][2]
        x = xs(d)
        up = k % 2 == 0
        ty = axis_y - 92 if up else axis_y + 64
        marks.append(
            f'<line x1="{x:.1f}" y1="{axis_y}" x2="{x:.1f}" y2="{ty + (36 if up else -20):.1f}" stroke="{col}" stroke-width="2"/>'
            f'<circle cx="{x:.1f}" cy="{axis_y}" r="9" fill="{col}" stroke="{SURFACE}" stroke-width="3"/>'
            f'<text x="{x:.1f}" y="{ty}" text-anchor="middle" font-family="{FONT}" font-size="24" font-weight="800" fill="{INK}">{name}</text>'
            f'<text x="{x:.1f}" y="{ty + 22}" text-anchor="middle" font-family="{MONO}" font-size="13" fill="{MUTED}">'
            f'{d.strftime("%d %b").lstrip("0").upper()} &middot; {label.upper()}</text>')
    a, b = xs(LAUNCHES[0][0]), xs(LAUNCHES[-1][0])
    by = axis_y + 150
    bracket = (f'<path d="M{a:.1f},{by - 10} V{by} H{b:.1f} V{by - 10}" fill="none" stroke="{INK}" stroke-width="2"/>'
               f'<text x="{(a + b) / 2:.1f}" y="{by + 28}" text-anchor="middle" font-family="{FONT}" font-size="20" '
               f'font-weight="700" fill="{INK}">10 weeks, 4 launches</text>')
    svg = (f'<svg width="1096" height="{by + 44}" viewBox="0 0 1096 {by + 44}">'
           f'<line x1="{x0}" y1="{axis_y}" x2="{x1}" y2="{axis_y}" stroke="{INK}" stroke-width="2"/>'
           f'{"".join(marks)}{bracket}</svg>')
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{BASE_CSS}</style></head><body>
    <div class="card">
      <div class="kicker">Always-On AI Agents &middot; Launch Timeline</div>
      <h1>Same product, four labs, ten weeks</h1>
      <p class="lede">From Grok Bot's beta in August to Claude Duet in late October, every big lab shipped an agent that works while you're away.</p>
      {svg}
      <div class="foot"><span>LAUNCH DATES AS REPORTED, AUG&ndash;OCT 2026</span><span>THE WEEKLY TECH BREW #5</span></div>
    </div></body></html>"""
    render(html, "always-on-ai-agents-launch-timeline-2026.png", 800)


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
    bbox = ImageChops.difference(im, Image.new("RGB", im.size, "#ffffff")).getbbox()
    im = im.crop((0, 0, 1200, bbox[3]))
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / name, optimize=True)
    print(name, im.size)


if __name__ == "__main__":
    hero()
    timeline()
