"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { ChevronDown } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   AsciiPortrait — the site opens on a monochrome ASCII portrait
   of the site owner (sampled from /profile.jpg at runtime),
   with sparse NEON accents on select regions — an eye band of
   neon yellow, a mouth band of neon magenta, plus scattered
   glitch pips throughout. Directly inspired by the referenced
   Instagram reel aesthetic (mostly B/W, ~2% vivid color).

   Scroll drives a three-act reveal:
     1. SCAN  — a chromatic (yellow / magenta split) scan bar
                sweeps top→bottom; cells above resolve into the
                portrait, cells below shimmer as noise.
     2. HOLD  — portrait sits with subtle twinkle; mono HUD
                annotations fade in around it.
     3. DISSOLVE — cells decay into noise, hash-staggered,
                then vanish, releasing into the site.

   Rendered on a single <canvas> using the same monospace font
   and glyph vocabulary as the background ASCII field.
   ═══════════════════════════════════════════════════════════ */

/* ─── Portrait sampling ─── */

const PORTRAIT_URL = "/profile.jpg";
const RAMP = " .·:;+=*x#%@"; // 12 levels, dark → light
const NOISE_RAMP = ".·:;+*x".split("");

/* ─── Neon accent palette (from the reference reel) ─── */

const NEON_YELLOW = "#fdff4d";
const NEON_MAGENTA = "#ff3fd6";
const NEON_GREEN = "#34d399"; // matches site accent

/**
 * Given a cell (col, row) within a (cols × rows) portrait and its stable hash,
 * return a neon accent color if the cell should be colored, else null.
 *
 * Zones (normalized 0..1) — tuned for this specific portrait's face position:
 *   Eye band     — y in [0.22, 0.32], nearly full width  → yellow
 *   Mouth band   — y in [0.40, 0.48], centered 45%       → magenta
 *   Random pips  — ~1% cells anywhere                    → green
 */
function accentColor(
  c: number,
  r: number,
  cols: number,
  rows: number,
  h: number,
): string | null {
  const x = c / (cols - 1);
  const y = r / (rows - 1);

  // Eye band — yellow, ~65% coverage of cells inside the band
  if (y >= 0.22 && y <= 0.32 && x >= 0.14 && x <= 0.86 && h < 0.65) {
    return NEON_YELLOW;
  }
  // Mouth band — magenta, ~55% coverage
  if (y >= 0.4 && y <= 0.48 && x >= 0.27 && x <= 0.72 && h < 0.55) {
    return NEON_MAGENTA;
  }
  // Sparse random glitch pips — green, ~1.2% coverage overall
  if (h > 0.988) return NEON_GREEN;

  return null;
}

type Pixel = { c: number; luma: number };
type Sample = { cols: number; rows: number; pixels: Pixel[] };

async function loadPortrait(cols: number, rows: number): Promise<Sample> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  const loaded = new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("portrait load failed"));
  });
  img.src = PORTRAIT_URL;
  await loaded;

  const off = document.createElement("canvas");
  off.width = cols;
  off.height = rows;
  const ctx = off.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.drawImage(img, 0, 0, cols, rows);
  const data = ctx.getImageData(0, 0, cols, rows).data;

  const pixels: Pixel[] = new Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const cIdx = Math.round((luma / 255) * (RAMP.length - 1));
    pixels[i] = { c: cIdx, luma };
  }
  return { cols, rows, pixels };
}

/* ─── Small helpers ─── */

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Deterministic 0..1 hash. */
function hash(x: number, y: number, salt = 0): number {
  const h = Math.sin(x * 12.9898 + y * 78.233 + salt * 43.1) * 43758.5453;
  return h - Math.floor(h);
}

/* ─── Timing on the pinned track [0..1] ─── */

const PRE_END = 0.05;
const SCAN_START = 0.05;
const SCAN_END = 0.34;
const HOLD_END = 0.62;
const DISSOLVE_END = 0.9;
const OUTRO_START = 0.9;

/* ═══════════════════════════════════════════════════════════
   Canvas renderer
   ═══════════════════════════════════════════════════════════ */

function PortraitCanvas({
  sample,
  progress,
}: {
  sample: Sample | null;
  progress: MotionValue<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sample) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    let cellW = 6;
    let cellH = 10;
    let fontPx = 10;
    let fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    let accent = "#34d399";
    let faint = "#737373";
    const startedAt = performance.now();
    let raf = 0;
    let disposed = false;

    const resolveFont = () => {
      const g = getComputedStyle(document.body)
        .getPropertyValue("--font-geist-mono")
        .trim();
      const base = "ui-monospace, Menlo, Consolas, monospace";
      fontFamily = g ? `${g}, ${base}` : base;
    };
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      accent = cs.getPropertyValue("--accent").trim() || accent;
      faint = cs.getPropertyValue("--text-faint").trim() || faint;
    };

    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      if (W < 2 || H < 2) return;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // Fit the portrait inside the canvas with padding for HUD
      const padH = Math.min(140, H * 0.16);
      const padW = Math.min(60, W * 0.05);
      const availW = W - padW * 2;
      const availH = H - padH * 2;
      // pick cell size so full grid fits both dimensions
      const byW = availW / sample.cols;
      const byH = availH / (sample.rows * 1.7);
      cellW = Math.max(3, Math.floor(Math.min(byW, byH)));
      cellH = Math.round(cellW * 1.7);
      fontPx = Math.max(4, Math.round(cellW * 1.55));
    };

    resolveFont();
    readColors();
    resize();

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 100);
    };
    window.addEventListener("resize", onResize);
    const themeObs = new MutationObserver(readColors);
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (disposed) return;
        resolveFont();
      });
    }

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (disposed) return;

      const p = Math.max(0, Math.min(1, progress.get()));
      ctx.clearRect(0, 0, W, H);
      if (p <= PRE_END - 0.005 || p >= 1) return;

      const now = (performance.now() - startedAt) / 1000;
      const scan = smoothstep(SCAN_START, SCAN_END, p); // 0..1
      const dissolve = smoothstep(HOLD_END, DISSOLVE_END, p); // 0..1
      const envelope =
        smoothstep(SCAN_START, SCAN_START + 0.01, p) *
        (1 - smoothstep(DISSOLVE_END, DISSOLVE_END + 0.03, p));
      if (envelope <= 0.005) return;

      const { cols, rows, pixels } = sample;
      const gridW = cellW * cols;
      const gridH = cellH * rows;
      const originX = Math.round((W - gridW) / 2);
      const originY = Math.round((H - gridH) / 2);

      ctx.font = `${fontPx}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const noiseTick = Math.floor(now * 8);

      /* ─── Cell pass ─── */
      for (let r = 0; r < rows; r++) {
        const rowNorm = r / (rows - 1);
        const cy = originY + (r + 0.5) * cellH;

        for (let c = 0; c < cols; c++) {
          const pix = pixels[r * cols + c];
          const cx = originX + (c + 0.5) * cellW;
          const h = hash(c, r, 1);

          let glyph: string;
          let color: string;
          let alpha: number;

          const fullyScanned = scan >= 0.995;
          const cellDissolved = dissolve > 0.02 && h < dissolve;

          if (cellDissolved) {
            // Dissolving: fade + convert to noise, then drop out
            const local = Math.max(0, Math.min(1, (dissolve - h) * 3));
            if (local > 0.85) continue;
            glyph =
              NOISE_RAMP[
                Math.floor(hash(c, r, noiseTick) * NOISE_RAMP.length)
              ] || ".";
            color = faint;
            alpha = (1 - local) * 0.45 * envelope;
          } else if (fullyScanned || rowNorm < scan - 0.005) {
            // Revealed portrait cell — B/W by default, sparse neon accent per zones
            glyph = RAMP[pix.c];
            if (glyph === " ") continue;
            const tw = 0.88 + 0.12 * Math.sin(now * 2 + h * 6);
            const accent = accentColor(c, r, cols, rows, h);
            if (accent) {
              // Neon accent cells — extra pop from a subtle twinkle
              color = accent;
              alpha = tw * envelope;
            } else {
              // Grayscale: brighter cells → brighter shade
              const shade = Math.round(155 + (pix.luma / 255) * 90); // 155..245
              color = `rgb(${shade},${shade},${shade})`;
              alpha = tw * envelope;
            }
          } else if (rowNorm < scan + 0.018) {
            // Hot scan bar — dense neon yellow block
            glyph = "█";
            color = NEON_YELLOW;
            alpha = envelope;
          } else {
            // Not yet scanned — noise fill, denser near the scan line
            const dist = rowNorm - scan;
            if (dist > 0.28) continue;
            const near = 1 - Math.min(1, dist / 0.28);
            // Sparser toward the bottom
            if (hash(c, r, noiseTick) > 0.35 + 0.55 * (1 - near)) continue;
            glyph =
              NOISE_RAMP[
                Math.floor(hash(c, r, noiseTick + 3) * NOISE_RAMP.length)
              ] || ".";
            color = faint;
            alpha = (0.28 + 0.42 * near) * envelope;
          }

          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          ctx.fillText(glyph, cx, cy);
        }
      }

      /* ─── Chromatic scan bar accent: yellow/magenta channel offsets ─── */
      if (scan > 0.001 && scan < 0.999) {
        const scanRow = scan * (rows - 1);
        const y = originY + (scanRow + 0.5) * cellH;
        const off = Math.max(1, Math.round(cellW * 0.4));
        ctx.font = `${fontPx}px ${fontFamily}`;

        // Magenta channel — offset left
        ctx.globalAlpha = 0.7 * envelope;
        ctx.fillStyle = NEON_MAGENTA;
        for (let c = 0; c < cols; c += 1) {
          ctx.fillText("▄", originX + (c + 0.5) * cellW - off, y);
        }
        // Yellow channel — offset right
        ctx.fillStyle = NEON_YELLOW;
        for (let c = 0; c < cols; c += 1) {
          ctx.fillText("▄", originX + (c + 0.5) * cellW + off, y);
        }
        // Bright white core on top for max pop
        ctx.globalAlpha = envelope;
        ctx.fillStyle = "rgb(255,255,255)";
        for (let c = 0; c < cols; c += 1) {
          ctx.fillText("▄", originX + (c + 0.5) * cellW, y);
        }
      }

      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      themeObs.disconnect();
    };
  }, [sample, progress]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full"
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════ */

export default function AsciiPortrait() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduce = useReducedMotion();
  const [sample, setSample] = useState<Sample | null>(null);
  const scanRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let alive = true;
    // Pick sampling resolution based on viewport
    const wide = typeof window !== "undefined" && window.innerWidth >= 700;
    const cols = wide ? 100 : 70;
    const rows = Math.round(cols * 0.55);
    loadPortrait(cols, rows)
      .then((s) => {
        if (alive) setSample(s);
      })
      .catch((e) => console.error("[AsciiPortrait]", e));
    return () => {
      alive = false;
    };
  }, []);

  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  /* ── Preamble ── */
  const preOpacity = useTransform(
    p,
    [0, 0.005, PRE_END - 0.005, PRE_END + 0.01],
    [1, 1, 1, 0],
  );

  /* ── HUD annotations (during hold) ── */
  const hudOpacity = useTransform(
    p,
    [SCAN_END - 0.06, SCAN_END, HOLD_END - 0.02, DISSOLVE_END - 0.05],
    [0, 1, 1, 0],
  );

  /* ── Outro cue ── */
  const outroOpacity = useTransform(p, [OUTRO_START, 0.97], [0, 1]);

  /* ── Progress bar ── */
  const progressX = useTransform(p, [0, 1], [0, 1]);

  /* ── Live HUD readouts (write to refs — no re-renders) ── */
  useMotionValueEvent(p, "change", (v) => {
    if (scanRef.current) {
      const scan = smoothstep(SCAN_START, SCAN_END, v);
      scanRef.current.textContent = `${String(Math.round(scan * 100)).padStart(3, "0")}%`;
    }
    if (stateRef.current) {
      let s = "STANDBY";
      if (v >= OUTRO_START) s = "COMPLETE";
      else if (v >= HOLD_END) s = "DISSOLVING";
      else if (v >= SCAN_END) s = "LOCKED";
      else if (v >= SCAN_START) s = "SCANNING";
      stateRef.current.textContent = s;
    }
  });

  const skip = () => {
    const el = ref.current;
    if (!el) return;
    window.scrollTo({ top: el.offsetTop + el.offsetHeight, behavior: "smooth" });
  };

  /* Kick the ASCII-field quiet-zone measurement after mount */
  useEffect(() => {
    const id = window.setTimeout(
      () => window.dispatchEvent(new Event("scroll")),
      60,
    );
    return () => window.clearTimeout(id);
  }, []);

  if (prefersReduce) return null;

  return (
    <div ref={ref} className="relative h-[500vh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* ── Preamble ── */}
        <motion.div
          style={{ opacity: preOpacity }}
          className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center font-mono text-xs uppercase tracking-[0.35em] text-text-faint"
        >
          <div
            data-ascii-quiet
            className="flex items-center gap-3 rounded-full border border-border-theme bg-surface-alt/70 px-5 py-2 backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
            <span className="text-accent">▸</span>
            <span>initializing subject</span>
            <span className="text-accent">◂</span>
          </div>
          <div
            data-ascii-quiet
            className="mt-8 max-w-md text-[10px] leading-relaxed text-text-faint/80"
          >
            scroll to scan
          </div>
        </motion.div>

        {/* ── Portrait canvas ── */}
        <PortraitCanvas sample={sample} progress={p} />

        {/* ── HUD annotations ── */}
        <motion.div
          style={{ opacity: hudOpacity }}
          className="pointer-events-none absolute inset-0 z-20"
        >
          {/* Top-left: subject */}
          <div
            data-ascii-quiet
            className="absolute left-6 top-20 sm:left-10 sm:top-24 font-mono text-[11px] uppercase tracking-widest text-text-faint"
          >
            <div className="flex items-center gap-2 text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
              SUBJECT
            </div>
            <div className="mt-1.5 text-lg font-semibold normal-case tracking-tight text-foreground">
              Ryder Tetreault
            </div>
            <div className="mt-0.5">AI · Cyber Defense</div>
          </div>

          {/* Top-right: scan status */}
          <div
            data-ascii-quiet
            className="absolute right-6 top-20 sm:right-10 sm:top-24 text-right font-mono text-[11px] uppercase tracking-widest text-text-faint"
          >
            <div className="flex items-center justify-end gap-2 text-accent">
              STATUS · <span ref={stateRef}>STANDBY</span>
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
            </div>
            <div className="mt-1.5">
              SCAN · <span ref={scanRef}>000%</span>
            </div>
            <div>34.72°N · 86.62°W</div>
            <div className="mt-0.5">CH.001 · IDENTITY</div>
          </div>

          {/* Bottom-center: tagline */}
          <div className="absolute inset-x-0 bottom-24 flex justify-center px-6">
            <div
              data-ascii-quiet
              className="rounded-full border border-border-theme bg-surface-alt/70 px-5 py-2 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-text-muted backdrop-blur-md"
            >
              <span className="text-accent">Signal, from noise.</span>
              <span className="mx-3 text-text-faint">/</span>
              AI-native systems, grounded in security
            </div>
          </div>
        </motion.div>

        {/* ── Outro cue ── */}
        <motion.div
          style={{ opacity: outroOpacity }}
          className="pointer-events-none absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1 text-text-muted"
        >
          <span className="font-mono text-xs uppercase tracking-widest">
            The full portfolio
          </span>
          <ChevronDown size={16} className="animate-bounce text-accent" />
        </motion.div>

        {/* ── Progress bar ── */}
        <div className="absolute bottom-0 left-0 right-0 z-30 h-0.5 bg-border-theme/40">
          <motion.div
            style={{ scaleX: progressX }}
            className="h-full origin-left bg-accent"
          />
        </div>

        {/* ── Skip ── */}
        <button
          onClick={skip}
          className="absolute bottom-8 right-6 z-30 cursor-pointer font-mono text-xs text-text-faint transition-colors hover:text-accent sm:right-10"
        >
          Skip intro ↓
        </button>
      </div>
    </div>
  );
}
