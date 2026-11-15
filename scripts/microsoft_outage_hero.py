"""Hero chart for The Weekly Tech Brew #6 (16 Nov 2026), World Brief story 2.

Blast-radius diagram of the Microsoft 365 outage: one failing shared layer
(caching / M365 Substrate) takes Outlook, Teams, SharePoint and the Admin
Center down together. HTML rendered to PNG with headless Chrome, then cropped.

    python scripts/microsoft_outage_hero.py

Content as supplied by the user on 15 Nov 2026.
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
OK = "#2F5BEA"
FAIL = "#D7263D"
FONT = "'Segoe UI', 'Inter', Arial, sans-serif"

APPS = ["Outlook", "Teams", "SharePoint", "Admin Center"]

app_boxes = "".join(f'<div class="app"><b>{a}</b><span>DOWN</span></div>' for a in APPS)

HTML = f"""<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;background:#fff;font-family:{FONT};color:{INK}}}
.card{{width:1200px;box-sizing:border-box;padding:44px 56px 30px;background:{SURFACE};border:1px solid #e3e4e8}}
.kick{{font-size:15px;letter-spacing:.16em;color:{MUTED};font-weight:700}}
h1{{font-size:44px;margin:8px 0 6px;line-height:1.1}}
.sub{{font-size:20px;color:{MUTED};margin:0 0 28px}}
.stack{{display:flex;flex-direction:column;align-items:center;gap:0}}
.layer{{width:860px;box-sizing:border-box;border:2px solid {OK};border-radius:8px;padding:14px 22px;
        display:flex;justify-content:space-between;align-items:center;background:#fff}}
.layer b{{font-size:22px}} .layer span{{font-size:16px;color:{MUTED}}}
.layer.fail{{border:3px solid {FAIL};background:#fdecee}}
.layer.fail span{{color:{FAIL};font-weight:800;letter-spacing:.06em}}
.arrow{{height:30px;border-left:3px solid {OK};position:relative}}
.arrow.red{{border-left:3px dashed {FAIL}}}
.herd{{font-size:16px;color:{FAIL};font-weight:700;margin:-2px 0 6px}}
.apps{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;width:860px}}
.app{{border:2px dashed {FAIL};border-radius:8px;padding:14px 10px;text-align:center;background:#fff}}
.app b{{display:block;font-size:21px;color:{MUTED}}}
.app span{{display:block;margin-top:4px;font-size:15px;font-weight:800;letter-spacing:.12em;color:{FAIL}}}
.legend{{display:flex;gap:28px;font-size:16px;color:{MUTED};margin-top:24px;padding-top:16px;border-top:1px solid #e3e4e8}}
.sw{{display:inline-block;width:16px;height:16px;border-radius:3px;vertical-align:-2px;margin-right:8px}}
</style></head><body><div class="card">
<div class="kick">THE WORLD BRIEF &middot; CLOUD INFRASTRUCTURE</div>
<h1>One shared layer fails. Every app goes dark.</h1>
<p class="sub">Outlook and Teams look separate, but they sit on the same backend.</p>
<div class="stack">
  <div class="layer"><b>Millions of client devices</b><span>desktop &middot; web &middot; mobile</span></div>
  <div class="arrow"></div>
  <div class="layer"><b>Service Front Door</b><span>edge routing &middot; TLS</span></div>
  <div class="arrow"></div>
  <div class="layer fail"><b>Shared caching &amp; M365 Substrate</b><span>FAULTY UPDATE</span></div>
  <div class="arrow red"></div>
  <div class="herd">Cache stampede: requests flood the backend servers</div>
  <div class="apps">{app_boxes}</div>
</div>
<div class="legend"><span><i class="sw" style="background:{OK}"></i>Healthy shared layer</span>
<span><i class="sw" style="background:{FAIL}"></i>Failed layer and the apps behind it</span></div>
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
    render(HTML, "microsoft-365-outage-outlook-teams-shared-infrastructure-failure.png", 1000)
