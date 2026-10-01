// Temporary headless-Chrome harness for the Neural Compute Core hero.
// usage: node cdp.mjs <url> <width> <height> <outPrefix> [extraChromeFlags...]
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, W, H, out, ...flags] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const prof = mkdtempSync(join(tmpdir(), "ncprof-"));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`,
  "--hide-scrollbars", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--window-size=${W},${H}`, ...flags, "about:blank",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const pg = list.find((t) => t.type === "page");
    if (pg) { ws = new WebSocket(pg.webSocketDebuggerUrl); break; }
  } catch {}
  await sleep(250);
}
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
const logs = [];
ws.addEventListener("message", (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === "Runtime.consoleAPICalled") logs.push(`[${d.params.type}] ` + d.params.args.map((a) => a.value ?? a.description).join(" "));
  if (d.method === "Runtime.exceptionThrown") logs.push("[EXCEPTION] " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
  if (d.method === "Log.entryAdded") logs.push(`[log:${d.params.entry.level}] ${d.params.entry.text} ${d.params.entry.url || ""}`);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${out}-${name}.png`, Buffer.from(r.result.data, "base64"));
};

await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
if (process.env.MOBILE) await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 2, mobile: true });
if (process.env.TOUCH) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Page.navigate", { url });
await sleep(+(process.env.WAIT || 6500));
const state = () => ev(`(() => { const r = document.getElementById('neural-core'); const n = window.__neuralCore; return JSON.stringify({ cls: r && r.className, fb: r && r.dataset.ncFallback, h: r && r.offsetHeight, nc: !!n, cam: n && n.rig && n.rig.mode, sel: n && n.state && n.state.selected, y: scrollY }); })()`);
console.log("STATE0", await state());
await shot("0-hero");

const script = process.env.SCRIPT;
if (script) {
  for (const step of script.split(";;")) {
    const [kind, arg, wait] = step.split("|");
    if (kind === "eval") console.log("EVAL", arg.slice(0, 60), "=>", await ev(arg));
    if (kind === "shot") await shot(arg);
    if (kind === "scroll") await ev(`(() => { const r = document.getElementById('neural-core'); scrollTo(0, r.offsetTop + (r.offsetHeight - innerHeight) * ${arg}); })()`);
    if (kind === "click") { const [x, y] = arg.split(",").map(Number); for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); }
    if (kind === "move") { const [x, y] = arg.split(",").map(Number); await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); }
    if (kind === "key") { await send("Input.dispatchKeyEvent", { type: "keyDown", key: arg, code: arg, windowsVirtualKeyCode: { ArrowRight: 39, Enter: 13, Escape: 27 }[arg] || arg.charCodeAt(0) }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: arg, code: arg }); }
    await sleep(+(wait || 1500));
    if (kind !== "eval") console.log("STATE", kind, arg, await state());
  }
}
console.log("LOGS\n" + (logs.join("\n") || "(none)"));
ws.close(); chrome.kill(); process.exit(0);
