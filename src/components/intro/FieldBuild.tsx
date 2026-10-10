"use client";

import { useEffect, useRef } from "react";
import { asciiFieldStore } from "@/components/ascii-field";
import { isReducedMotion } from "@/lib/motion";

/* ═══════════════════════════════════════════════════════════
   FieldBuild — the waveform background being laid down after the
   intro. A page-coloured cover sits between the field canvas and the
   page content, on the field's own cell grid. A noisy front grows
   out from the centre; each cell it reaches flickers a lime "placing"
   glyph, then the cover opens and the live field shows through.
   ═══════════════════════════════════════════════════════════ */

type Props = { onDone?: () => void };

const BUILD_MS = 1600;   // centre → farthest corner
const PLACE_MS = 200;    // lime glyph before a cell opens
const OPEN_MS = 160;     // cover fade on a cell once placed
const AFTERGLOW_MS = 260;
const GLYPHS = ".:+*=#%01<>/\\|";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
function hash(x: number, y: number, s = 0): number {
  const h = Math.sin(x * 12.9898 + y * 78.233 + s * 43.1) * 43758.5453;
  return h - Math.floor(h);
}
/** Smooth value noise for an organic front edge. */
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, 7), b = hash(xi + 1, yi, 7), c = hash(xi, yi + 1, 7), d = hash(xi + 1, yi + 1, 7);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function cssRgb(v: string, fallback: [number, number, number]): [number, number, number] {
  const m = v.trim().replace("#", "");
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(m)) return fallback;
  const s = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export default function FieldBuild({ onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || isReducedMotion()) { onDoneRef.current?.(); return; }

    const W = window.innerWidth, H = window.innerHeight;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Match the live field's grid so placed glyphs land exactly on its cells.
    // (cellW/cellH are engine internals; fall back to the config's 8px font metrics.)
    const eng = asciiFieldStore.get() as unknown as { cellW?: number; cellH?: number } | null;
    const cw = eng?.cellW && eng.cellW > 0 ? eng.cellW : 4.8;
    const ch = eng?.cellH && eng.cellH > 0 ? eng.cellH : 10;
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);

    const cs = getComputedStyle(document.documentElement);
    const bg = cssRgb(cs.getPropertyValue("--background"), [5, 5, 5]);
    const accent = cssRgb(cs.getPropertyValue("--accent"), [163, 230, 53]);
    const g = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
    const font = `500 ${Math.round(ch / 1.25)}px ${g ? g + ", " : ""}ui-monospace, Menlo, monospace`;

    // Per-cell placement time: distance from centre (aspect-corrected) + noisy edge + grain.
    const at = new Float32Array(cols * rows);
    const cx = W / 2, cy = H / 2;
    const maxD = Math.hypot(cx, cy * 1.6);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) * cw, y = (r + 0.5) * ch;
        const d = Math.hypot(x - cx, (y - cy) * 1.6) / maxD;
        const edge = (vnoise(x / 90, y / 90) - 0.5) * 0.22 + (hash(c, r, 3) - 0.5) * 0.05;
        at[r * cols + c] = clamp01(d + edge) * BUILD_MS;
      }
    }

    // Cover: one pixel per cell, scaled up unsmoothed → crisp cell-aligned blocks.
    const mask = document.createElement("canvas");
    mask.width = cols; mask.height = rows;
    const mctx = mask.getContext("2d")!;
    const img = mctx.createImageData(cols, rows);
    for (let i = 0; i < cols * rows; i++) { img.data[i * 4] = bg[0]; img.data[i * 4 + 1] = bg[1]; img.data[i * 4 + 2] = bg[2]; }

    const glyph = new Uint8Array(cols * rows);
    const nextFlip = new Float32Array(cols * rows);
    const t0 = performance.now();
    let raf = 0, finished = false;
    const end = BUILD_MS + PLACE_MS + OPEN_MS + AFTERGLOW_MS;

    const draw = () => {
      if (finished) return;
      const now = performance.now() - t0;
      if (now >= end) {
        finished = true;
        ctx.clearRect(0, 0, W, H);
        onDoneRef.current?.();
        return;
      }
      raf = requestAnimationFrame(draw);

      for (let i = 0; i < at.length; i++) {
        const open = clamp01((now - at[i]) / OPEN_MS);
        img.data[i * 4 + 3] = Math.round(255 * (1 - open));
      }
      mctx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(mask, 0, 0, cols * cw, rows * ch);

      // The build front: lime glyphs being "placed" just ahead of each cell opening.
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgb(${accent[0]},${accent[1]},${accent[2]})`;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const dt = now - at[i];
          if (dt < -PLACE_MS || dt > AFTERGLOW_MS) continue;
          if (hash(c, r, 9) > 0.55) continue; // sparse: a scaffold, not a solid wall
          const a = dt < 0 ? 1 - (-dt / PLACE_MS) * 0.6 : 1 - dt / AFTERGLOW_MS;
          if (now > nextFlip[i]) { glyph[i] = (Math.random() * GLYPHS.length) | 0; nextFlip[i] = now + 50 + Math.random() * 90; }
          ctx.globalAlpha = 0.85 * a;
          ctx.fillText(GLYPHS[glyph[i]], (c + 0.5) * cw, (r + 0.5) * ch);
        }
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);

    return () => { finished = true; cancelAnimationFrame(raf); };
  }, []);

  // z-0 + DOM order (after the field canvases in the layout, before HomeContent's
  // wrapper) puts it above the field and below the content. Not z-1: while the
  // content wrapper is fading in, its opacity makes it a z-0 stacking context and
  // a z-1 cover would paint over the page.
  return <canvas ref={canvasRef} data-field-build aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}
