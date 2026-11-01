import { useCallback, useEffect, useRef, useState } from "react";
import type { Step } from "./types";

export type Speed = 0.5 | 1 | 2;
type Mode = "paused" | "playing" | "stepping";

export interface Timeline {
  index: number;
  /** Progress through the current step, 0..1. Packets are drawn from this,
   *  so the animation is a pure function of (index, t): replay, step back
   *  and pause are exact. */
  t: number;
  step: Step;
  count: number;
  playing: boolean;
  finished: boolean;
  speed: Speed;
  play(): void;
  pause(): void;
  toggle(): void;
  reset(): void;
  next(): void;
  prev(): void;
  goTo(i: number): void;
  setSpeed(s: Speed): void;
}

const DEFAULT_MS = 2400;

export function useTimeline(steps: Step[], opts: { autoplay?: boolean } = {}): Timeline {
  const [index, setIndex] = useState(0);
  const [t, setT] = useState(0);
  const [mode, setMode] = useState<Mode>(opts.autoplay ? "playing" : "paused");
  const [speed, setSpeed] = useState<Speed>(1);

  const s = useRef({ index, t, mode, speed });
  s.current = { index, t, mode, speed };

  useEffect(() => {
    if (mode === "paused") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const cur = s.current;
      const dur = steps[cur.index]?.duration ?? DEFAULT_MS;
      let nt = cur.t + (dt * cur.speed) / dur;
      if (nt >= 1) {
        if (cur.mode === "playing" && cur.index < steps.length - 1) {
          setIndex(cur.index + 1);
          nt = 0;
        } else {
          setT(1);
          setMode("paused");
          return;
        }
      }
      setT(nt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, steps]);

  const last = steps.length - 1;
  const finished = index === last && t >= 1;

  const play = useCallback(() => {
    if (s.current.index === last && s.current.t >= 1) {
      setIndex(0);
      setT(0);
    }
    setMode("playing");
  }, [last]);
  const pause = useCallback(() => setMode("paused"), []);
  const toggle = useCallback(() => (s.current.mode === "paused" ? play() : pause()), [play, pause]);
  const reset = useCallback(() => { setMode("paused"); setIndex(0); setT(0); }, []);
  /** Step forward plays the next step once, then pauses on it. */
  const next = useCallback(() => {
    const i = s.current.t >= 1 || s.current.mode !== "paused" ? s.current.index + 1 : s.current.index;
    if (i > last) return;
    if (i !== s.current.index) setIndex(i);
    setT(0);
    setMode("stepping");
  }, [last]);
  /** Step back jumps to the previous step and replays it. */
  const prev = useCallback(() => {
    const i = Math.max(0, s.current.index - 1);
    setIndex(i);
    setT(0);
    setMode("stepping");
  }, []);
  const goTo = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(last, i)));
    setT(0);
    setMode("stepping");
  }, [last]);

  return {
    index, t, step: steps[index], count: steps.length,
    playing: mode !== "paused", finished, speed,
    play, pause, toggle, reset, next, prev, goTo, setSpeed,
  };
}
