/** Edges point caller -> callee. If a callee fails, every caller that
 *  (transitively) depends on it is degraded: the blast radius. */
export function blastRadius(edges: { from: string; to: string }[], failed: Iterable<string>): Set<string> {
  const callers = new Map<string, string[]>();
  for (const e of edges) {
    if (!callers.has(e.to)) callers.set(e.to, []);
    callers.get(e.to)!.push(e.from);
  }
  const hit = new Set<string>();
  const stack = [...failed];
  const down = new Set(stack);
  while (stack.length) {
    const n = stack.pop()!;
    for (const c of callers.get(n) ?? []) {
      if (!hit.has(c) && !down.has(c)) { hit.add(c); stack.push(c); }
    }
  }
  return hit;
}
