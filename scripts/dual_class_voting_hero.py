"""Hero chart for The Weekly Tech Brew #6 (16 Nov 2026), World Brief story 1.

Equity vs voting power for the founders of Meta and Alphabet (dual-class
stock) next to NVIDIA (one share, one vote). HTML rendered to PNG with
headless Chrome, then cropped.

    python scripts/dual_class_voting_hero.py

Data as supplied by the user on 15 Nov 2026: Zuckerberg ~13.5% equity /
61% votes; Page + Brin under 12% equity / 52.7% votes (27.4% + 25.3%).
"""
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "newsletter" / "weekly-tech-brew-2026-11-16"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

SURFACE = "#fcfcfb"
INK = "#1e1e1e"
MUTED = "#5b6270"
EQUITY = "#a9afba"
VOTES = "#2F5BEA"
LINE = "#D7263D"
FONT = "'Segoe UI', 'Inter', Arial, sans-serif"


def bar(label, value, colour, text):
    return f"""<div class="row"><span class="lab">{label}</span>
<div class="track"><div class="fill" style="width:{value}%;background:{colour}"></div>
<span class="val" style="left:calc({value}% + 10px)">{text}</span></div></div>"""


def company(name, who, rows, note):
    return f"""<div class="co"><div class="name">{name}<span>{who}</span></div>
<div class="bars">{rows}<div class="half"></div></div><p class="cnote">{note}</p></div>"""


HTML = f"""<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;background:#fff;font-family:{FONT};color:{INK}}}
.card{{width:1200px;box-sizing:border-box;padding:44px 56px 30px;background:{SURFACE};border:1px solid #e3e4e8}}
.kick{{font-size:15px;letter-spacing:.16em;color:{MUTED};font-weight:700}}
h1{{font-size:44px;margin:8px 0 6px;line-height:1.1}}
.sub{{font-size:20px;color:{MUTED};margin:0 0 30px}}
.co{{display:grid;grid-template-columns:250px 1fr;column-gap:24px;align-items:center;
     padding:20px 0;border-top:1px solid #e3e4e8}}
.name{{font-size:28px;font-weight:800}} .name span{{display:block;font-size:16px;font-weight:500;color:{MUTED};margin-top:4px}}
.bars{{position:relative}}
.row{{display:grid;grid-template-columns:110px 1fr;align-items:center;margin:8px 0}}
.lab{{font-size:16px;color:{MUTED};font-weight:600}}
.track{{position:relative;height:30px;background:#eceef1;border-radius:4px}}
.fill{{height:100%;border-radius:4px}}
.val{{position:absolute;top:3px;font-size:18px;font-weight:800}}
.half{{position:absolute;top:-6px;bottom:-6px;left:calc(110px + (100% - 110px) * .5);border-left:3px dashed {LINE}}}
.cnote{{grid-column:2;margin:8px 0 0 110px;font-size:16px;color:{MUTED}}}
.cnote b{{color:{INK}}}
.legend{{display:flex;gap:28px;font-size:16px;color:{MUTED};margin-top:18px;padding-top:16px;border-top:1px solid #e3e4e8}}
.sw{{display:inline-block;width:16px;height:16px;border-radius:3px;vertical-align:-2px;margin-right:8px}}
.dash{{display:inline-block;width:22px;border-top:3px dashed {LINE};vertical-align:4px;margin-right:8px}}
</style></head><body><div class="card">
<div class="kick">THE WORLD BRIEF &middot; CORPORATE GOVERNANCE</div>
<h1>Who can fire the founder?</h1>
<p class="sub">Dual-class shares let a minority stake carry a majority of the votes.</p>
{company("Meta", "Mark Zuckerberg",
         bar("Equity", 13.5, EQUITY, "~13.5%") + bar("Votes", 61, VOTES, "61%"),
         "Above 50% of the votes: <b>he picks the board</b>.")}
{company("Alphabet", "Larry Page + Sergey Brin",
         bar("Equity", 12, EQUITY, "under 12%") + bar("Votes", 52.7, VOTES, "52.7%"),
         "Page 27.4% + Brin 25.3%: <b>the founders pick the board</b>.")}
<div class="co"><div class="name">NVIDIA<span>One share, one vote</span></div>
<p class="cnote" style="margin:0;grid-column:2;font-size:19px">No super-voting class. Votes follow equity, so
<b>the board answers to all shareholders</b> and can remove the CEO, founder or not.</p></div>
<div class="legend"><span><i class="sw" style="background:{EQUITY}"></i>Share of company equity</span>
<span><i class="sw" style="background:{VOTES}"></i>Share of shareholder votes</span>
<span><i class="dash"></i>50% of votes: controls board elections</span></div>
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
    bbox = ImageChops.difference(im, Image.new("RGB", im.size, "#ffffff")).getbbox()
    im = im.crop((0, 0, 1200, bbox[3]))
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / name, optimize=True)
    print(name, im.size)


if __name__ == "__main__":
    render(HTML, "dual-class-shares-founder-voting-power-meta-alphabet-nvidia.png", 1000)
