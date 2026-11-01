// End-to-end smoke test against the built Jekyll site.
//   1. jekyll build (see README), 2. python -m http.server 4123 -d ../_site
//   3. node tests/e2e/smoke.mjs   (uses the locally installed Chrome)
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:4123";
const OUT = process.env.OUT ?? "tests/e2e/shots";
mkdirSync(OUT, { recursive: true });
const PAGES = [
  "/digital-garden/system-design/",
  "/digital-garden/system-design/uber-api-gateway-first-generation/",
  "/digital-garden/system-design/uber-rtapi-api-gateway-bottleneck/",
  "/digital-garden/system-design/uber-edge-gateway-microservices/",
];
const exe = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
let failures = 0;
const errors = [];
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/favicon.ico")) errors.push(`${r.status()} ${r.url()}`); });
const fail = (msg) => { failures++; console.log("FAIL", msg); };

for (const path of PAGES) {
  errors.length = 0;
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "*{transition:none!important}.ts-in,[data-reveal]{opacity:1!important;transform:none!important}" });
  const hosts = await page.$$("[data-sd-lab]");
  console.log(`\n${path}: ${hosts.length} labs`);
  for (const [i, h] of hosts.entries()) {
    const name = await h.getAttribute("data-sd-lab");
    await h.scrollIntoViewIfNeeded();
    // wait for lazy chunk
    const ok = await h.evaluate(async (el) => {
      for (let k = 0; k < 50; k++) {
        const r = el.shadowRoot;
        if (r && r.querySelector("section, aside, p") && !r.textContent.includes("Loading interactive lab")) return true;
        await new Promise((res) => setTimeout(res, 100));
      }
      return false;
    });
    if (!ok) { fail(`${path} lab ${name} did not mount`); continue; }
    const btn = async (label) => h.evaluate((el, label) => {
      const b = [...el.shadowRoot.querySelectorAll("button")].find((x) => x.getAttribute("aria-label") === label || x.textContent.trim().startsWith(label));
      if (!b) return false; b.click(); return true;
    }, label);
    if (["gen1-dispatch", "gen2-request", "gen3-evolution"].includes(name)) {
      // step forward twice, explain on, step back, play
      for (const l of ["Step forward", "Explain this step"]) if (!(await btn(l))) fail(`${name}: no ${l}`);
      await page.waitForTimeout(1300);
      const step = await h.evaluate((el) => el.shadowRoot.querySelector('[role="toolbar"] span.ml-auto')?.textContent);
      console.log(`  ${name}: after step → ${step}`);
      await btn("Step forward"); await page.waitForTimeout(1200);
      const step2 = await h.evaluate((el) => el.shadowRoot.querySelector('[role="toolbar"] span.ml-auto')?.textContent);
      if (step2 !== "step 2/" + step.split("/")[1]) fail(`${name}: expected step 2, got ${step2}`);
      await btn("Step backward"); await page.waitForTimeout(300);
      const step3 = await h.evaluate((el) => el.shadowRoot.querySelector('[role="toolbar"] span.ml-auto')?.textContent);
      if (!step3.startsWith("step 1/")) fail(`${name}: step back gave ${step3}`);
      // click a node to open inspector
      const opened = await h.evaluate((el) => {
        const all = [...el.shadowRoot.querySelectorAll('svg g[role="button"]')];
        const g = all.find((x) => /RTAPI|dispatch/i.test(x.getAttribute("aria-label"))) ?? all[0];
        if (!g) return false;
        g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return true;
      });
      await page.waitForTimeout(400);
      const panel = await h.evaluate((el) => !!el.shadowRoot.querySelector("aside dl"));
      if (!opened || !panel) fail(`${name}: inspector did not open`);
      if (name === "gen3-evolution") {
        await btn("Fail this service"); await page.waitForTimeout(300);
        const broken = await h.evaluate((el) => el.shadowRoot.textContent.match(/(\d)\/5 user flows broken/)?.[0]);
        console.log(`  gen3: ${broken}`);
        if (!broken) fail("gen3: failure toggle did nothing");
      }
      await btn("Play"); await page.waitForTimeout(1500);
    }
    if (name === "gen2-traffic") {
      await page.waitForTimeout(3000);
      const read = () => h.evaluate((el) => Object.fromEntries([...el.shadowRoot.querySelectorAll(".font-mono.text-lg")].map((m) => [m.previousElementSibling.textContent, m.textContent])));
      console.log("  normal:", JSON.stringify(await read()));
      await btn("New Year's Eve spike"); await page.waitForTimeout(6000);
      const spike = await read();
      console.log("  spike :", JSON.stringify(spike));
      if (parseFloat(spike["Error rate"]) < 10) fail("traffic: spike should produce errors");
      await btn("Spike + scale out ×3"); await page.waitForTimeout(6000);
      const scaled = await read();
      console.log("  scaled:", JSON.stringify(scaled));
      if (parseFloat(scaled["Error rate"]) > 2) fail("traffic: scale-out should clear errors");
    }
    if (name === "quiz") {
      await h.evaluate((el) => el.shadowRoot.querySelectorAll('[role="radio"]')[1].click());
      await page.waitForTimeout(300);
      const fb = await h.evaluate((el) => !!el.shadowRoot.textContent.match(/Correct\.|Not quite\./));
      if (!fb) fail("quiz: no feedback");
    }
    if (name === "gen-compare") {
      await btn("Debug one slow request"); await page.waitForTimeout(500);
    }
    await h.screenshot({ path: `${OUT}/${path.split("/").filter(Boolean).pop()}-${i}-${name}.png` });
  }
  // mermaid + mathjax rendered?
  await page.waitForTimeout(2500);
  const mer = await page.$$eval("pre code.language-mermaid", (x) => x.length);
  const merSvg = await page.$$eval(".mermaid-diagram svg", (x) => x.length);
  console.log(`  mermaid: ${merSvg} rendered, ${mer} unrendered`);
  if (mer) fail(`${path}: ${mer} mermaid blocks failed`);
  const jax = await page.$$eval(".mjx-chtml, .MathJax_CHTML, .MathJax", (x) => x.length);
  const raw = await page.$$eval(".post-content p, .post-content li", (x) => x.filter((e) => /\$[^$]+\$/.test(e.textContent)).length);
  if (raw) fail(`${path}: ${raw} paragraphs with unrendered $math$`);
  const diagrams = await page.$$(".mermaid-diagram");
  for (const [k, d] of diagrams.entries()) { await d.scrollIntoViewIfNeeded(); await d.screenshot({ path: `${OUT}/${path.split("/").filter(Boolean).pop()}-mermaid-${k}.png` }); }
  console.log(`  mathjax elements: ${jax}`);
  if (errors.length) { fail(`${path} console errors:\n   ` + errors.join("\n   ")); }
  await page.screenshot({ path: `${OUT}/${path.split("/").filter(Boolean).pop()}-page.png`, fullPage: false });
}
await browser.close();
console.log(failures ? `\n${failures} failure(s)` : "\nALL OK");
process.exit(failures ? 1 : 0);
