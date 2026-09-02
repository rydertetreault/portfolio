"use client";

import { useEffect, useRef, type RefObject } from "react";
import { FACE_RAMP, faceCellRgb, faceGlyph, layoutFace, type FaceData } from "./face-data";

/* ═══════════════════════════════════════════════════════════
   IntroStage — the scroll-triggered intro, on one canvas.

   DRAIN     the stream that was trickling off the fingertips on
             the homepage becomes a flood: every glyph of both
             hands is lifted off, tip-outward (the <pre>s erode
             cell by cell), and flies through the fingertip on a
             curved path into the middle of the screen…
   ASSEMBLE  …where each one lands on a cell of the face, flashes
             lime, and settles into the face's own glyph + colour.
             Surplus glyphs are absorbed by cells already lit.
   SCAN      the face video plays; a lime scan line sweeps down
             over it, dropping landmark markers as it passes.
   MATCH     hold on the identified subject.
   RELEASE   the face dissolves to noise while the overview fades in.

   Beats are reported to the parent through `onEvent` so the DOM
   readout can narrate them; live numbers are written straight
   into `counterRef` to avoid React churn at 60fps.
   ═══════════════════════════════════════════════════════════ */

export type IntroEvent = "assembled" | "sweep" | "landmarks" | "match" | "release" | "finished";

export type HandSource = {
  el: RefObject<HTMLPreElement | null>;
  text: string;
  side: -1 | 1;
};

type Props = {
  face: FaceData | null;
  hands: HandSource[];
  counterRef: RefObject<HTMLSpanElement | null>;
  /** Fill element of the scan progress bar: the stage drives its width (0–100%). */
  barRef: RefObject<HTMLDivElement | null>;
  onEvent: (e: IntroEvent) => void;
};

/* ── timeline (ms from mount) ─────────────────────────────── */
const PEEL_END = 3000;      // last glyph leaves the hands
const FLIGHT_MIN = 900;
const FLIGHT_MAX = 1500;
const ASSEMBLE_HOLD = 500;  // pause on the fully formed face before the scan
const SWEEP_MS = 1800;      // scan line, top → bottom of the face
const MESH_MS = 450;        // landmark settle after the sweep
const MATCH_DELAY = 350;    // "match" beat after the mesh
const MATCH_HOLD = 2400;    // hold on the identified face (verdict lines take ~1.6s to type)
const RELEASE_MS = 900;     // dissolve
const LAND_FLASH = 380;     // lime flash on landing
const LANDMARK_COUNT = 14;

const FLICKER = ".·:;+=*x#%@01<>[]{}/\\|";
const NOISE = ".·:;+*x";

/* ── helpers ──────────────────────────────────────────────── */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInCubic = (u: number) => u * u * u;
function hash(x: number, y: number, s = 0): number {
  const h = Math.sin(x * 12.9898 + y * 78.233 + s * 43.1) * 43758.5453;
  return h - Math.floor(h);
}
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
  return [v[0] || 0, v[1] || 0, v[2] || 0];
}
type Rgb = [number, number, number];
const rgbStr = (c: Rgb): string => `rgb(${c[0]},${c[1]},${c[2]})`;
const mix = (a: Rgb, b: Rgb, t: number): string =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;

type Particle = {
  hand: number;          // index into hands, -1 = synthetic (mobile)
  row: number; col: number;
  x0: number; y0: number;   // start (hand cell)
  cx: number; cy: number;   // bezier control (through the fingertip)
  ch: string;
  peelAt: number;
  dur: number;
  target: number;        // face cell index
  primary: boolean;      // first glyph to reach its cell (lights it); else absorbed
  peeled: boolean;
  landed: boolean;
  wobble: number;
  seed: number;
  nextFlip: number;
};

type HandGeom = {
  rect: DOMRect;
  lines: string[];
  cols: number;
  cw: number; ch: number;
  tip: { col: number; row: number; x: number; y: number };
  mask: Uint8Array;      // 1 = lifted
  dirty: boolean;
};

export default function IntroStage({ face, hands, counterRef, barRef, onEvent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceRef = useRef<FaceData | null>(face);
  faceRef.current = face;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    let fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    let accentRgb: Rgb = [163, 230, 53];
    let fgRgb: Rgb = [237, 237, 237];
    let faintRgb: Rgb = [115, 115, 115];
    let raf = 0, disposed = false;
    const t0 = performance.now();
    const emitted = new Set<IntroEvent>();
    const emit = (e: IntroEvent) => { if (!emitted.has(e)) { emitted.add(e); onEventRef.current(e); } };

    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (n: string) => cs.getPropertyValue(n).trim();
      if (v("--accent")) accentRgb = hexToRgb(v("--accent"));
      if (v("--foreground")) fgRgb = hexToRgb(v("--foreground"));
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
    const themeObs = new MutationObserver(readTheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    /* ── Sample the hands: every inked cell becomes a particle ── */
    const geoms: HandGeom[] = [];
    const particles: Particle[] = [];
    let handFontPx = 10;
    const centre = { x: W / 2, y: H / 2 };

    hands.forEach((h, hi) => {
      const el = h.el.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return; // hidden (mobile)
      const lines = h.text.split("\n");
      const cols = Math.max(...lines.map((l) => l.length));
      const cw = rect.width / cols, ch = rect.height / lines.length;
      handFontPx = Math.max(6, ch / 1.05);
      // fingertip: extreme inked column toward the centre of the screen
      let tipC = h.side < 0 ? -1 : Infinity, tipR = 0;
      lines.forEach((l, r) => {
        if (!l.trim()) return;
        if (h.side < 0) { const c = l.trimEnd().length - 1; if (c > tipC) { tipC = c; tipR = r; } }
        else { const c = l.length - l.trimStart().length; if (c < tipC) { tipC = c; tipR = r; } }
      });
      const tip = { col: tipC, row: tipR, x: rect.left + (tipC + 0.5) * cw, y: rect.top + (tipR + 0.5) * ch };
      const g: HandGeom = { rect, lines, cols, cw, ch, tip, mask: new Uint8Array(cols * lines.length), dirty: false };
      geoms.push(g);

      let maxD = 1;
      const raw: Array<{ r: number; c: number; ch: string; d: number }> = [];
      lines.forEach((l, r) => {
        for (let c = 0; c < l.length; c++) {
          const chr = l[c];
          if (chr === " ") continue;
          const d = Math.hypot((c - tipC) * cw, (r - tipR) * ch);
          if (d > maxD) maxD = d;
          raw.push({ r, c, ch: chr, d });
        }
      });
      for (const cell of raw) {
        const o = cell.d / maxD;                       // 0 at the tip → 1 at the wrist
        const jitter = (hash(cell.c, cell.r, 2) - 0.5) * 260;
        const peelAt = Math.max(0, PEEL_END * Math.pow(o, 0.8) + jitter);
        const x0 = rect.left + (cell.c + 0.5) * cw, y0 = rect.top + (cell.r + 0.5) * ch;
        // control point: the fingertip, pulled toward the centre and fanned out
        // sideways so the stream has body instead of being a 1px firehose
        const fan = (hash(cell.c, cell.r, 3) - 0.5) * 120;
        const cx = tip.x + (centre.x - tip.x) * 0.25;
        const cy = tip.y + (centre.y - tip.y) * 0.25 + fan;
        particles.push({
          hand: hi, row: cell.r, col: cell.c, x0, y0, cx, cy, ch: cell.ch, peelAt,
          dur: FLIGHT_MIN + hash(cell.c, cell.r, 4) * (FLIGHT_MAX - FLIGHT_MIN),
          target: -1, primary: false, peeled: false, landed: false,
          wobble: (hash(cell.c, cell.r, 5) - 0.5) * 2, seed: hash(cell.c, cell.r, 6), nextFlip: 0,
        });
      }
    });

    // Mobile / no hands on screen: pour glyphs in from both edges instead.
    if (particles.length === 0) {
      const n = 1900;
      for (let i = 0; i < n; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const h1 = hash(i, 1, 9), h2 = hash(i, 2, 9);
        const x0 = side < 0 ? -20 - h1 * 60 : W + 20 + h1 * 60;
        const y0 = H * (0.15 + h2 * 0.7);
        particles.push({
          hand: -1, row: 0, col: i, x0, y0,
          cx: x0 + (centre.x - x0) * 0.3, cy: y0 + (centre.y - y0) * 0.3 + (hash(i, 3, 9) - 0.5) * 160,
          ch: FLICKER[(h1 * FLICKER.length) | 0], peelAt: PEEL_END * Math.pow(i / n, 0.8),
          dur: FLIGHT_MIN + h2 * (FLIGHT_MAX - FLIGHT_MIN),
          target: -1, primary: false, peeled: false, landed: false,
          wobble: (hash(i, 4, 9) - 0.5) * 2, seed: hash(i, 5, 9), nextFlip: 0,
        });
      }
    }
    const total = particles.length;

    /* ── Face bookkeeping (assigned once face.bin is available) ── */
    let lay: ReturnType<typeof layoutFace> | null = null;
    let assigned = false;
    let litCount = 0;
    let faceCellCount = 0;                       // cells that need a glyph
    let landedAt: Float32Array | null = null;    // per face cell: ms when it lit, -1 = dark
    let accentMap = new Map<number, { r: number; g: number; b: number }>();
    let landmarks: number[] = [];                // face cell indices

    const assign = (f: FaceData) => {
      lay = layoutFace(W, H, f.cols, f.rows);
      const frame0 = f.frames[0];
      accentMap = new Map();
      for (const a of frame0.accents) accentMap.set(a.i, a);
      landedAt = new Float32Array(f.cols * f.rows).fill(-1);

      // Face cells, brightest first (with jitter) so the structure appears before the fill.
      const cells: Array<{ i: number; k: number }> = [];
      for (let i = 0; i < frame0.luma.length; i++) {
        if (faceGlyph(frame0.luma[i]) === "") continue;
        cells.push({ i, k: frame0.luma[i] + hash(i, 0, 12) * 110 });
      }
      cells.sort((a, b) => b.k - a.k);
      faceCellCount = cells.length;

      // Particles in arrival order → cells in priority order. Surplus is absorbed.
      const order = particles.map((_, i) => i).sort((a, b) => (particles[a].peelAt + particles[a].dur) - (particles[b].peelAt + particles[b].dur));
      order.forEach((pi, k) => {
        const p = particles[pi];
        if (k < cells.length) { p.target = cells[k].i; p.primary = true; }
        else { p.target = cells[(hash(k, 1, 13) * cells.length) | 0].i; p.primary = false; }
      });

      // Landmarks: the brightest cell in each bucket of a grid over the face's core.
      const bx = 4, by = 5;
      const c0 = Math.floor(f.cols * 0.22), c1 = Math.ceil(f.cols * 0.78);
      const r0 = Math.floor(f.rows * 0.18), r1 = Math.ceil(f.rows * 0.82);
      const picks: Array<{ i: number; l: number }> = [];
      for (let yb = 0; yb < by; yb++) for (let xb = 0; xb < bx; xb++) {
        let best = -1, bl = -1;
        const cs = c0 + Math.floor(((c1 - c0) * xb) / bx), ce = c0 + Math.floor(((c1 - c0) * (xb + 1)) / bx);
        const rs = r0 + Math.floor(((r1 - r0) * yb) / by), re = r0 + Math.floor(((r1 - r0) * (yb + 1)) / by);
        for (let r = rs; r < re; r++) for (let c = cs; c < ce; c++) {
          const i = r * f.cols + c;
          const l = frame0.luma[i] + hash(c, r, 14) * 30;
          if (l > bl) { bl = l; best = i; }
        }
        if (best >= 0 && frame0.luma[best] > 60) picks.push({ i: best, l: bl });
      }
      picks.sort((a, b) => b.l - a.l);
      landmarks = picks.slice(0, LANDMARK_COUNT).map((p) => p.i);
      assigned = true;
    };

    /* ── Erode the hand <pre>s: lifted cells become spaces ── */
    const erode = () => {
      geoms.forEach((g, gi) => {
        if (!g.dirty) return;
        g.dirty = false;
        const el = hands[gi]?.el.current;
        if (!el) return;
        const out = g.lines.map((l, r) => {
          let s = "";
          for (let c = 0; c < l.length; c++) s += g.mask[r * g.cols + c] ? " " : l[c];
          return s;
        });
        el.textContent = out.join("\n");
      });
    };

    /* ── Beat clock ── */
    let assembledAt = -1;   // ms (stage clock) when the face was complete
    let everyoneLanded = false;
    let held = 0;           // time spent waiting on face.bin
    let lastNow = 0;
    let counterText = "";

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (disposed) return;
      const nowAbs = performance.now();
      if (lastNow === 0) lastNow = nowAbs;
      const dt = nowAbs - lastNow;
      lastNow = nowAbs;
      const f = faceRef.current;
      if (f && !assigned) assign(f);
      // If face.bin hasn't arrived, stall the clock so nothing tries to land early.
      if (!assigned) held += dt;
      const now = nowAbs - t0 - held;

      ctx.clearRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const scanStart = assembledAt >= 0 ? assembledAt + ASSEMBLE_HOLD : Infinity;
      const sweepT = clamp01((now - scanStart) / SWEEP_MS);
      const meshT = clamp01((now - scanStart - SWEEP_MS) / MESH_MS);
      const matchAt = scanStart + SWEEP_MS + MESH_MS + MATCH_DELAY;
      const releaseAt = matchAt + MATCH_HOLD;
      const releaseT = clamp01((now - releaseAt) / RELEASE_MS);
      const envelope = 1 - smooth(0.75, 1, releaseT);

      if (now >= scanStart) emit("sweep");
      if (now >= scanStart + SWEEP_MS) emit("landmarks");
      if (now >= matchAt) emit("match");
      if (now >= releaseAt) emit("release");
      if (releaseT >= 1) { emit("finished"); return; }

      /* ── Face ── */
      let frame = f && assigned ? f.frames[0] : null;
      if (f && assigned && now >= scanStart) {
        // video plays at native rate from the start of the scan
        const fi = Math.floor(((now - scanStart) / 1000) * f.fps);
        frame = f.frames[Math.min(f.frames.length - 1, fi)];
      }
      let sweepRow = -Infinity;
      if (f && lay && frame && landedAt) {
        const { cellW, cellH, fontPx, originX, originY } = lay;
        ctx.font = `${fontPx}px ${fontFamily}`;
        const noiseTick = Math.floor(now / 110);
        sweepRow = sweepT > 0 ? -2 + sweepT * (f.rows + 4) : -Infinity;
        const sweeping = sweepT > 0 && sweepT < 1;
        for (let r = 0; r < f.rows; r++) {
          const y = originY + (r + 0.5) * cellH;
          for (let c = 0; c < f.cols; c++) {
            const i = r * f.cols + c;
            const at = landedAt[i];
            // Before assembly only lit cells exist; afterwards the video may
            // move glyphs into cells that never received a particle.
            if (at < 0 && !everyoneLanded) continue;
            const l = frame.luma[i];
            let glyph = faceGlyph(l);
            const h = hash(c, r, 1);

            // release: cells drop out to noise and fade
            if (releaseT > 0 && h < releaseT) {
              const local = clamp01((releaseT - h) * 3);
              if (local > 0.85) continue;
              ctx.globalAlpha = (1 - local) * 0.45;
              ctx.fillStyle = rgbStr(faintRgb);
              ctx.fillText(NOISE[(hash(c, r, noiseTick) * NOISE.length) | 0], originX + (c + 0.5) * cellW, y);
              continue;
            }
            if (glyph === "") {
              // the video moved a glyph away from this cell: keep a faint dot so the face doesn't pop
              if (l < 8) continue;
              glyph = FACE_RAMP[1];
            }
            const real = faceCellRgb(l, accentMap.get(i));
            const flash = at >= 0 ? 1 - smooth(0, LAND_FLASH, now - at) : 0;
            let color = flash > 0 ? mix(real, accentRgb, flash) : rgbStr(real);
            let alpha = 1;
            if (sweeping || sweepT >= 1) {
              const d = r - sweepRow;                  // <0: already scanned, >0: not yet
              if (Math.abs(d) < 1.6 && sweeping) {
                color = mix(real, accentRgb, 0.9);
                alpha = 1;
                glyph = FACE_RAMP[Math.min(FACE_RAMP.length - 1, FACE_RAMP.indexOf(glyph) + 2)];
              } else if (d < 0) {
                const tint = 0.35 * Math.exp(d / 9) * (sweeping ? 1 : 0);
                color = mix(real, accentRgb, tint);
              }
            }
            const tw = 0.95 + 0.05 * Math.sin(now / 500 + h * 6);
            ctx.globalAlpha = alpha * tw * envelope;
            ctx.fillStyle = color;
            ctx.fillText(glyph, originX + (c + 0.5) * cellW, y);
          }
        }

        /* scan line itself: thin lime rule with a soft glow, across the face width */
        if (sweeping) {
          const y = originY + (sweepRow + 0.5) * cellH;
          const x0 = originX - cellW * 3, x1 = originX + cellW * (f.cols + 3);
          const [ar, ag, ab] = accentRgb;
          const grad = ctx.createLinearGradient(0, y - cellH * 3, 0, y + cellH * 1.5);
          grad.addColorStop(0, `rgba(${ar},${ag},${ab},0)`);
          grad.addColorStop(0.85, `rgba(${ar},${ag},${ab},0.10)`);
          grad.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
          ctx.globalAlpha = 1;
          ctx.fillStyle = grad;
          ctx.fillRect(x0, y - cellH * 3, x1 - x0, cellH * 4.5);
          ctx.fillStyle = `rgba(${ar},${ag},${ab},0.9)`;
          ctx.fillRect(x0, y - 0.5, x1 - x0, 1);
          // end caps
          ctx.fillRect(x0 - 6, y - 3, 6, 6);
          ctx.fillRect(x1, y - 3, 6, 6);
        }

        /* landmarks: lime markers that appear as the sweep passes them */
        if (sweepT > 0 && landmarks.length) {
          const [ar, ag, ab] = accentRgb;
          const pt = (i: number) => ({ x: originX + ((i % f.cols) + 0.5) * cellW, y: originY + (Math.floor(i / f.cols) + 0.5) * cellH });
          ctx.font = `${Math.max(10, fontPx * 1.6)}px ${fontFamily}`;
          landmarks.forEach((i, k) => {
            const row = Math.floor(i / f.cols);
            if (row > sweepRow) return;
            const p = pt(i);
            const age = clamp01((sweepRow - row) / 6);
            const pulse = 0.7 + 0.3 * Math.sin(now / 180 + k);
            ctx.globalAlpha = (0.5 + 0.5 * age) * pulse * envelope;
            ctx.fillStyle = `rgb(${ar},${ag},${ab})`;
            ctx.fillText("+", p.x, p.y);
          });
          ctx.font = `${fontPx}px ${fontFamily}`;
        }
      }

      /* ── Particles (drain + flight + landing) ── */
      if (!everyoneLanded) {
        ctx.font = `500 ${handFontPx}px ${fontFamily}`;
        let allLanded = assigned;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (p.landed) continue;
          if (now < p.peelAt) { allLanded = false; continue; }
          if (!p.peeled) {
            p.peeled = true;
            if (p.hand >= 0) { const g = geoms[p.hand]; g.mask[p.row * g.cols + p.col] = 1; g.dirty = true; }
            p.nextFlip = now;
          }
          const u = clamp01((now - p.peelAt) / p.dur);
          if (!assigned || !lay || !f) { allLanded = false; }
          if (u >= 1 && assigned && lay && f && landedAt) {
            p.landed = true;
            if (landedAt[p.target] < 0) { landedAt[p.target] = now; litCount++; }
            else { landedAt[p.target] = Math.max(landedAt[p.target], now - LAND_FLASH * 0.6); } // absorbed: brief re-flash
            continue;
          }
          allLanded = false;

          // glyph churn in flight
          if (now > p.nextFlip) { p.ch = FLICKER[(Math.random() * FLICKER.length) | 0]; p.nextFlip = now + 60 + Math.random() * 140; }

          // path: quadratic bezier hand cell → fingertip → face cell, with a wobble
          let tx = centre.x, ty = centre.y;
          if (lay && f && p.target >= 0) {
            tx = lay.originX + ((p.target % f.cols) + 0.5) * lay.cellW;
            ty = lay.originY + (Math.floor(p.target / f.cols) + 0.5) * lay.cellH;
          }
          // slow lift, fast middle, soft landing
          const e = 0.35 * easeInCubic(u) + 0.65 * smooth(0, 1, u);
          const om = 1 - e;
          let x = om * om * p.x0 + 2 * om * e * p.cx + e * e * tx;
          let y = om * om * p.y0 + 2 * om * e * p.cy + e * e * ty;
          const w = Math.sin(u * Math.PI * 2 + p.seed * 6) * 10 * p.wobble * Math.sin(u * Math.PI);
          x += w; y += w * 0.6;

          const lit = smooth(0, 0.3, u);
          const settle = smooth(0.85, 1, u);
          // faint (hand grey) → lime as it's pulled in; a few go white; lime on approach
          const color = settle > 0 || (p.seed >= 0.1 && lit >= 1)
            ? rgbStr(accentRgb)
            : p.seed < 0.1 && lit > 0.6 ? rgbStr(fgRgb) : mix(faintRgb, accentRgb, lit);
          const size = handFontPx + ((lay ? lay.fontPx : handFontPx) - handFontPx) * settle;
          if (size !== handFontPx) ctx.font = `500 ${size}px ${fontFamily}`;
          ctx.globalAlpha = 0.5 + 0.5 * lit;
          ctx.fillStyle = color;
          ctx.fillText(p.ch, x, y);
          if (size !== handFontPx) ctx.font = `500 ${handFontPx}px ${fontFamily}`;
        }
        erode();

        // Fill any face cell no primary particle reached (safety: never leave holes).
        if (allLanded && assigned && landedAt && litCount < faceCellCount) {
          for (let i = 0; i < landedAt.length; i++) if (landedAt[i] < 0 && f && faceGlyph(f.frames[0].luma[i]) !== "") landedAt[i] = now;
          litCount = faceCellCount;
        }
        if (allLanded && assigned && assembledAt < 0) { assembledAt = now; everyoneLanded = true; emit("assembled"); }

        const peeledN = particles.reduce((n, p) => n + (p.peeled ? 1 : 0), 0);
        const txt = allLanded ? `${total} / ${total}` : `${peeledN} / ${total}`;
        if (txt !== counterText && counterRef.current) { counterRef.current.textContent = txt; counterText = txt; }
      } else if (now >= scanStart && now < matchAt + 50) {
        // scan progress: sweep 0→80, landmark settle →92, match →100
        const p = clamp01(sweepT * 0.8 + meshT * 0.12 + clamp01((now - scanStart - SWEEP_MS - MESH_MS) / MATCH_DELAY) * 0.08);
        const txt = `${Math.round(p * 100)}%`;
        if (txt !== counterText && counterRef.current) { counterRef.current.textContent = txt; counterText = txt; }
        if (barRef.current) barRef.current.style.width = `${(p * 100).toFixed(1)}%`;
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      themeObs.disconnect();
    };
    // Mount-once by design: the whole beat runs off one clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-[28] h-full w-full" />;
}
