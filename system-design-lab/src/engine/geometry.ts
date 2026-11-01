import type { DNode } from "./types";

export interface Pt { x: number; y: number }

export const size = (n: DNode) => {
  if (n.shape === "circle") return { w: n.w ?? 64, h: n.h ?? n.w ?? 64 };
  return { w: n.w ?? 132, h: n.h ?? 54 };
};

/** Point where the ray from the node centre towards `to` leaves the node. */
export function borderPoint(n: DNode, to: Pt): Pt {
  const { w, h } = size(n);
  const dx = to.x - n.x, dy = to.y - n.y;
  if (dx === 0 && dy === 0) return { x: n.x, y: n.y };
  if (n.shape === "circle") {
    const r = w / 2, len = Math.hypot(dx, dy);
    return { x: n.x + (dx / len) * r, y: n.y + (dy / len) * r };
  }
  const sx = (w / 2) / Math.abs(dx || 1e-9), sy = (h / 2) / Math.abs(dy || 1e-9);
  const s = Math.min(sx, sy);
  return { x: n.x + dx * s, y: n.y + dy * s };
}

export interface EdgeGeom { p0: Pt; c: Pt; p2: Pt; d: string; mid: Pt }

export function edgeGeom(a: DNode, b: DNode, curve = 0): EdgeGeom {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len; // left normal
  const mid0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const c = { x: mid0.x + nx * curve * len, y: mid0.y + ny * curve * len };
  const p0 = borderPoint(a, curve ? c : b);
  const p2 = borderPoint(b, curve ? c : a);
  const d = `M${p0.x},${p0.y} Q${c.x},${c.y} ${p2.x},${p2.y}`;
  return { p0, c, p2, d, mid: bezier(p0, c, p2, 0.5) };
}

export function bezier(p0: Pt, c: Pt, p2: Pt, u: number): Pt {
  const v = 1 - u;
  return {
    x: v * v * p0.x + 2 * v * u * c.x + u * u * p2.x,
    y: v * v * p0.y + 2 * v * u * c.y + u * u * p2.y,
  };
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
