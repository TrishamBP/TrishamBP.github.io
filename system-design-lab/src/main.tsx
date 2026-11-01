import { createRoot } from "react-dom/client";
import { lazy, StrictMode, Suspense, type ComponentType } from "react";
import css from "./styles.css?inline";

/**
 * Island loader. Markdown pages embed a lab with
 *   <div data-sd-lab="gen2-traffic"></div>
 * Each lab renders inside its own Shadow DOM, so Tailwind (with preflight)
 * cannot touch the Jekyll site and the site's .post-content CSS cannot touch
 * the lab. Labs are lazy chunks: a page only downloads the labs it embeds.
 */
type LabProps = { el: HTMLElement };
const LABS: Record<string, () => Promise<{ default: ComponentType<LabProps> }>> = {
  "gen1-dispatch": () => import("./labs/Gen1Dispatch"),
  "gen2-request": () => import("./labs/Gen2Request"),
  "gen2-traffic": () => import("./labs/Gen2Traffic"),
  "gen3-evolution": () => import("./labs/Gen3Evolution"),
  "gen-compare": () => import("./labs/GenCompare"),
};

// Tailwind v4 registers its internal variables with @property, which is
// ignored inside shadow roots. Hoist those rules into the document once.
function hoistAtProperty() {
  if (document.getElementById("sd-lab-props")) return;
  const rules = css.match(/@property[^{]+\{[^}]*\}/g);
  if (!rules) return;
  const s = document.createElement("style");
  s.id = "sd-lab-props";
  s.textContent = rules.join("\n");
  document.head.appendChild(s);
}

const cache = new Map<string, ComponentType<LabProps>>();
const lazyLab = (name: string) => {
  if (!cache.has(name)) cache.set(name, lazy(LABS[name]));
  return cache.get(name)!;
};

function mount(el: HTMLElement) {
  const name = el.dataset.sdLab ?? "";
  if (el.dataset.sdMounted || !LABS[name]) return;
  el.dataset.sdMounted = "1";
  const root = el.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css;
  const host = document.createElement("div");
  root.append(style, host);
  const Lab = lazyLab(name);
  createRoot(host).render(
    <StrictMode>
      <Suspense fallback={<div style={{ padding: 24, color: "#94a3b8", fontSize: 13 }}>Loading interactive lab…</div>}>
        <Lab el={el} />
      </Suspense>
    </StrictMode>,
  );
}

function boot() {
  hoistAtProperty();
  document.querySelectorAll<HTMLElement>("[data-sd-lab]").forEach(mount);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
