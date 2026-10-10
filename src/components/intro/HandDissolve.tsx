"use client";

import { useEffect, useRef, type RefObject } from "react";

/* ═══════════════════════════════════════════════════════════
   HandDissolve — the scroll-triggered intro, on one canvas.

   The hands erode tip-outward (the <pre>s lose their text cell by
   cell); each lifted glyph drifts away, churns through noise and
   fades out. When the last one is gone `onDone` fires and the
   overview takes over.
   ═══════════════════════════════════════════════════════════ */

export type HandSource = {
  el: RefObject<HTMLPreElement | null>;
  text: string;
  side: -1 | 1;
};

type Props = {
  hands: HandSource[];
  onDone: () => void;
};

/* ── timeline (ms from mount) ─────────────────────────────── */
const PEEL_END = 1400;   // last glyph leaves the hands
const LIFE_MIN = 600;    // drift + fade duration per glyph
const LIFE_MAX = 1100;
const EMPTY_HOLD = 250;  // nothing to dissolve (mobile): brief beat before done

const FLICKER = ".·:;+=*x#%@01<>[]{}/\\|";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function hash(x: number, y: number, s = 0): number {
  const h = Math.sin(x * 12.9898 + y * 78.233 + s * 43.1) * 43758.5453;
  return h - Math.floor(h);
}
type Rgb = [number, number, number];
function hexToRgb(hex: string): Rgb {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
  return [v[0] || 0, v[1] || 0, v[2] || 0];
}
const mix = (a: Rgb, b: Rgb, t: number): string =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;

type Particle = {
  hand: number;
  row: number; col: number;
  x0: number; y0: number;
  vx: number; vy: number;  // drift (px over the particle's life)
  ch: string;
  peelAt: number;
  life: number;
  seed: number;
  nextFlip: number;
  peeled: boolean;
};

type HandGeom = { lines: string[]; cols: number; mask: Uint8Array; dirty: boolean };

export default function HandDissolve({ hands, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  // Hand refs are stable; sample them once on mount so parent re-renders don't restart the dissolve.
  const handsRef = useRef(hands);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const hands = handsRef.current;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    let fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    let accentRgb: Rgb = [163, 230, 53];
    let faintRgb: Rgb = [115, 115, 115];
    let raf = 0, finished = false;
    const t0 = performance.now();

    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (n: string) => cs.getPropertyValue(n).trim();
      if (v("--accent")) accentRgb = hexToRgb(v("--accent"));
      if (v("--text-faint")) faintRgb = hexToRgb(v("--text-faint"));
      const g = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
      fontFamily = `${g ? g + ", " : ""}ui-monospace, Menlo, Consolas, monospace`;
    };
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    readTheme(); resize();
    window.addEventListener("resize", resize);

    /* ── Sample the hands: every inked cell becomes a particle ── */
    const geoms: HandGeom[] = [];
    const particles: Particle[] = [];
    let fontPx = 10;

    hands.forEach((h, hi) => {
      const el = h.el.current;
      const rect = el?.getBoundingClientRect();
      if (!el || !rect || rect.width < 2 || rect.height < 2) { geoms.push({ lines: [], cols: 0, mask: new Uint8Array(0), dirty: false }); return; }
      const lines = h.text.split("\n");
      const cols = Math.max(...lines.map((l) => l.length));
      const cw = rect.width / cols, ch = rect.height / lines.length;
      fontPx = Math.max(6, ch / 1.05);
      geoms.push({ lines, cols, mask: new Uint8Array(cols * lines.length), dirty: false });

      // fingertip: extreme inked column toward the centre of the screen
      let tipC = h.side < 0 ? -1 : Infinity, tipR = 0;
      lines.forEach((l, r) => {
        if (!l.trim()) return;
        if (h.side < 0) { const c = l.trimEnd().length - 1; if (c > tipC) { tipC = c; tipR = r; } }
        else { const c = l.length - l.trimStart().length; if (c < tipC) { tipC = c; tipR = r; } }
      });

      const raw: Array<{ r: number; c: number; ch: string; d: number }> = [];
      let maxD = 1;
      lines.forEach((l, r) => {
        for (let c = 0; c < l.length; c++) {
          if (l[c] === " ") continue;
          const d = Math.hypot((c - tipC) * cw, (r - tipR) * ch);
          if (d > maxD) maxD = d;
          raw.push({ r, c, ch: l[c], d });
        }
      });
      for (const cell of raw) {
        const o = cell.d / maxD; // 0 at the tip → 1 at the wrist
        const jitter = (hash(cell.c, cell.r, 2) - 0.5) * 180;
        // drift: mostly up and slightly outward (away from centre), with spread
        const a = -Math.PI / 2 + (hash(cell.c, cell.r, 3) - 0.5) * 1.6;
        const dist = 30 + hash(cell.c, cell.r, 4) * 90;
        particles.push({
          hand: hi, row: cell.r, col: cell.c,
          x0: rect.left + (cell.c + 0.5) * cw, y0: rect.top + (cell.r + 0.5) * ch,
          vx: Math.cos(a) * dist + -h.side * 20 * hash(cell.c, cell.r, 7),
          vy: Math.sin(a) * dist,
          ch: cell.ch,
          peelAt: Math.max(0, PEEL_END * Math.pow(o, 0.8) + jitter),
          life: LIFE_MIN + hash(cell.c, cell.r, 5) * (LIFE_MAX - LIFE_MIN),
          seed: hash(cell.c, cell.r, 6),
          nextFlip: 0,
          peeled: false,
        });
      }
    });

    const erode = () => {
      geoms.forEach((g, gi) => {
        if (!g.dirty) return;
        g.dirty = false;
        const el = hands[gi]?.el.current;
        if (!el) return;
        el.textContent = g.lines.map((l, r) => {
          let s = "";
          for (let c = 0; c < l.length; c++) s += g.mask[r * g.cols + c] ? " " : l[c];
          return s;
        }).join("\n");
      });
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      onDoneRef.current();
    };

    const draw = () => {
      if (finished) return;
      raf = requestAnimationFrame(draw);
      const now = performance.now() - t0;

      if (particles.length === 0) { if (now >= EMPTY_HOLD) finish(); return; }

      ctx.clearRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `500 ${fontPx}px ${fontFamily}`;

      let alive = 0;
      for (const p of particles) {
        if (now < p.peelAt) { alive++; continue; }
        if (!p.peeled) {
          p.peeled = true;
          const g = geoms[p.hand];
          g.mask[p.row * g.cols + p.col] = 1;
          g.dirty = true;
          p.nextFlip = now;
        }
        const u = (now - p.peelAt) / p.life;
        if (u >= 1) continue;
        alive++;

        if (now > p.nextFlip) { p.ch = FLICKER[(Math.random() * FLICKER.length) | 0]; p.nextFlip = now + 50 + Math.random() * 120; }

        const e = 1 - (1 - u) * (1 - u); // ease-out drift
        const x = p.x0 + p.vx * e + Math.sin(u * Math.PI * 2 + p.seed * 6) * 4;
        const y = p.y0 + p.vy * e;
        const glow = smooth(0, 0.25, u) * (1 - smooth(0.5, 1, u));
        ctx.globalAlpha = 0.75 * (1 - smooth(0.2, 1, u));
        ctx.fillStyle = mix(faintRgb, accentRgb, glow);
        ctx.fillText(p.ch, x, y);
      }
      erode();

      if (alive === 0) { ctx.clearRect(0, 0, W, H); finish(); }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-[22]" />;
}
