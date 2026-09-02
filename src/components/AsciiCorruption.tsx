"use client";

import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════
   AsciiCorruption — dim "data corruption" behind the intro.

   A sparse grid of cells across the whole viewport. At any moment
   only a small fraction are alive: a cell wakes, flickers through a
   handful of ramp glyphs (the corruption), holds, then decays back
   to nothing. Most are faint grey; a few resolve in the accent
   colour, and the odd one goes white for a frame ("bit flip").

   Wide spacing + low alpha keep it as texture, not content. Cells
   under the hands / CTA are skipped (quiet zones) so nothing
   competes with the foreground.
   ═══════════════════════════════════════════════════════════ */

const RAMP = ".·:;+=*x#%@";
const GLITCH = "01#%&$/\\|<>[]{}=+*";
const CELL = 46;            // css px between cells (spacing)
const JITTER = 0.55;        // random offset within the cell (fraction of CELL)
const ALIVE = 0.10;         // fraction of cells alive at a time
const ACCENT_CHANCE = 0.14; // fraction of alive cells in the accent colour
const WHITE_CHANCE = 0.05;  // fraction of flickers that flash white

/* Control bus so the intro can pull the live glyphs into the convergence and
   pause spawning while that plays. */
type Taken = { x: number; y: number; ch: string; accent: boolean };
let ctl: { take: () => Taken[]; setPaused: (p: boolean) => void } | null = null;
export const corruptionBus = {
  take(): Taken[] { return ctl ? ctl.take() : []; },
  setPaused(p: boolean) { ctl?.setPaused(p); },
};

type Cell = {
  x: number; y: number;
  born: number;   // ms
  life: number;   // ms
  accent: boolean;
  ch: string;
  nextFlip: number;
};

export default function AsciiCorruption({
  quietSelector = "[data-corruption-quiet]",
  className = "",
}: { quietSelector?: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, cols = 0, rows = 0;
    let slots: { x: number; y: number }[] = [];
    let alive: Cell[] = [];
    let quiet: DOMRect[] = [];
    let font = "12px ui-monospace, Menlo, Consolas, monospace";
    let faint = "#737373", accent = "#34d399", fg = "#ededed";
    let raf = 0, disposed = false, quietTimer = 0;

    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      faint = cs.getPropertyValue("--text-faint").trim() || faint;
      accent = cs.getPropertyValue("--accent").trim() || accent;
      fg = cs.getPropertyValue("--foreground").trim() || fg;
      const g = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
      font = `500 12px ${g ? g + ", " : ""}ui-monospace, Menlo, Consolas, monospace`;
    };

    const resize = () => {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1;
      slots = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        // deterministic jitter per slot so the layout doesn't look like a grid
        const h1 = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453, h2 = Math.sin(c * 39.346 + r * 11.135) * 43758.5453;
        const j1 = h1 - Math.floor(h1), j2 = h2 - Math.floor(h2);
        slots.push({ x: (c + 0.5 + (j1 - 0.5) * JITTER) * CELL, y: (r + 0.5 + (j2 - 0.5) * JITTER) * CELL });
      }
      alive = [];
    };

    const readQuiet = () => {
      const r0 = canvas.getBoundingClientRect();
      quiet = Array.from(document.querySelectorAll<HTMLElement>(quietSelector)).map((el) => {
        const r = el.getBoundingClientRect();
        return new DOMRect(r.left - r0.left - 24, r.top - r0.top - 24, r.width + 48, r.height + 48);
      });
    };
    const inQuiet = (x: number, y: number) => {
      for (const q of quiet) if (x >= q.x && x <= q.x + q.width && y >= q.y && y <= q.y + q.height) return true;
      return false;
    };

    let paused = false;
    ctl = {
      take: () => {
        const r = canvas.getBoundingClientRect();
        const out = alive.map((c) => ({ x: c.x + r.left, y: c.y + r.top, ch: c.ch, accent: c.accent }));
        alive = [];
        return out;
      },
      setPaused: (p) => { paused = p; },
    };

    readTheme(); resize(); readQuiet();
    const onResize = () => { resize(); readQuiet(); };
    window.addEventListener("resize", onResize);
    const obs = new MutationObserver(readTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    // quiet zones can move (entrance animations) → re-read for a while, then occasionally
    const quietTick = () => { readQuiet(); quietTimer = window.setTimeout(quietTick, 600); };
    quietTimer = window.setTimeout(quietTick, 150);

    const glyph = () => {
      const set = Math.random() < 0.7 ? RAMP : GLITCH;
      return set[(Math.random() * set.length) | 0];
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (disposed) return;
      ctx.clearRect(0, 0, W, H);

      // spawn toward target population
      const target = paused ? 0 : Math.round(slots.length * ALIVE);
      let tries = 0;
      while (alive.length < target && tries++ < 20) {
        const s = slots[(Math.random() * slots.length) | 0];
        if (inQuiet(s.x, s.y)) continue;
        alive.push({
          x: s.x, y: s.y, born: now,
          life: 900 + Math.random() * 2600,
          accent: Math.random() < ACCENT_CHANCE,
          ch: glyph(), nextFlip: now + 40 + Math.random() * 120,
        });
      }

      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = alive.length - 1; i >= 0; i--) {
        const c = alive[i];
        const age = now - c.born;
        if (age > c.life) { alive.splice(i, 1); continue; }
        const t = age / c.life;
        // envelope: quick in, flicker-hold, slow out
        const env = t < 0.12 ? t / 0.12 : t > 0.55 ? 1 - (t - 0.55) / 0.45 : 1;
        // corruption: flip glyph rapidly while young, rarely once settled
        if (now > c.nextFlip) {
          c.ch = glyph();
          c.nextFlip = now + (t < 0.3 ? 50 + Math.random() * 90 : 300 + Math.random() * 900);
        }
        let color = c.accent ? accent : faint;
        let alpha = (c.accent ? 0.42 : 0.22) * env;
        if (t < 0.3 && Math.random() < WHITE_CHANCE) { color = fg; alpha = 0.7 * env; }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillText(c.ch, c.x, c.y);
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      ctl = null;
      cancelAnimationFrame(raf);
      window.clearTimeout(quietTimer);
      window.removeEventListener("resize", onResize);
      obs.disconnect();
    };
  }, [quietSelector]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
