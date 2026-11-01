// Ranks queries with the real assets/js/garden-search.js against _site/digital-garden/search.json.
// Usage (after a build): node scripts/garden_search_test.js . "what is a closure" "lambda"
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
let src = fs.readFileSync(path.join(root, "assets/js/garden-search.js"), "utf8");
const end = src.lastIndexOf("})();");
src = src.slice(0, end) + "globalThis.__dg = { search: search, snippet: snippet, state: state, decode: decodeEntities };\n" + src.slice(end);

const stub = { hidden: true, addEventListener() {}, getAttribute() { return ""; } };
globalThis.document = { querySelectorAll: () => [stub], addEventListener() {} };
globalThis.window = {};
eval(src);

const dg = globalThis.__dg;
const rows = JSON.parse(fs.readFileSync(path.join(root, "_site/digital-garden/search.json"), "utf8"));
dg.state.index = rows.map((e) => { e.t = dg.decode(e.t); e.s = dg.decode(e.s); e.p = dg.decode(e.p); return ({ e, s: e.s.toLowerCase(), p: (e.p + " " + e.g).toLowerCase(), k: e.k.toLowerCase(), t: e.t.toLowerCase() }); });
dg.state.scope = "The Rust Sandbox";

const strip = (h) => h.replace(/<\/?mark>/g, "").replace(/&hellip;/g, "…").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const queries = process.argv.slice(3);
for (const q of queries) {
  const res = dg.search(q);
  console.log(`\n### "${q}"  (${res.length} results)`);
  res.slice(0, 3).forEach((r, i) => {
    const e = r.row.e;
    console.log(`  ${i + 1}. [${Math.round(r.score)}] ${e.g} > ${e.n ? "Note " + e.n + " " : ""}${e.p} > ${e.s || "Overview"}`);
    if (i === 0) console.log(`     ${strip(dg.snippet(e.t, r.query)).slice(0, 230)}`);
    console.log(`     -> ${e.u}`);
  });
}
