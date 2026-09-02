"use client";

import { useEffect, useRef, type RefObject } from "react";

/* ═══════════════════════════════════════════════════════════
   FingerStream — glyphs are "pulled off" the two index
   fingertips and drawn into the CTA frame between them.

   · fingertip positions are derived from the rendered hand
     <pre> elements (bounding rect ÷ grid size → cell size),
     so the stream stays locked to the fingers at any viewport
   · each particle is a real character sampled from the hand
     text around the fingertip, starts at the finger's colour,
     accelerates toward the frame edge along a slightly arched
     path, brightens to white, then dissolves as it arrives
   · characters at the fingertip flicker faintly, as if being
     lifted off
   · arriving glyphs are deposited into a churning ASCII halo
     that hugs the CTA text (densest at the two ends where the
     streams land); each arrival flashes the cell it lands on
   ═══════════════════════════════════════════════════════════ */

type Props = {
  leftHand: RefObject<HTMLElement | null>;
  rightHand: RefObject<HTMLElement | null>;
  frame: RefObject<HTMLElement | null>;
  leftText: string;
  rightText: string;
};

type Tip = { col: number; row: number };
type Particle = {
  side: 0 | 1;      // 0 = from left hand, 1 = from right hand
  ch: string;
  t: number;        // 0..1 progress
  dur: number;      // seconds
  arc: number;      // px of vertical bow at mid-path (signed)
  jx: number;       // spawn jitter (cells)
  jy: number;
  spin: number;     // slight rotation at the end
};

function findTip(text: string, side: "left" | "right"): Tip {
  const lines = text.split("\n");
  let best = side === "left" ? -1 : Infinity, row = 0;
  lines.forEach((l, r) => {
    if (!l.trim()) return;
    if (side === "left") {
      const c = l.trimEnd().length - 1;
      if (c > best) { best = c; row = r; }
    } else {
      const c = l.length - l.trimStart().length;
      if (c < best) { best = c; row = r; }
    }
  });
  return { col: best, row };
}

/* Glyphs near the tip (used as the particle pool, so the stream is made of
   the finger's own characters). */
function tipGlyphs(text: string, tip: Tip, radius = 3): string[] {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let r = tip.row - radius; r <= tip.row + radius; r++) {
    const l = lines[r]; if (!l) continue;
    for (let c = tip.col - radius; c <= tip.col + radius; c++) {
      const ch = l[c]; if (ch && ch !== " ") out.push(ch);
    }
  }
  return out.length ? out : ["·", ":", "+", "*", "x", "#"];
}

function easeInCubic(x: number) { return x * x * x; }
function smooth(x: number) { return x * x * (3 - 2 * x); }

export default function FingerStream({ leftHand, rightHand, frame, leftText, rightText }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0, disposed = false;
    const tips = [findTip(leftText, "left"), findTip(rightText, "right")];
    const pools = [tipGlyphs(leftText, tips[0]), tipGlyphs(rightText, tips[1])];
    const cols = [leftText.split("\n")[0].length, rightText.split("\n")[0].length];
    const rows = [leftText.split("\n").length, rightText.split("\n").length];
    const particles: Particle[] = [];
    const flashes: { x: number; y: number; t: number }[] = [];
    let last = performance.now();
    let spawnAcc = 0;
    let fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    let faint = "#737373", fg = "#ededed", accent = "#a3e635";

    const hash = (x: number, y: number, s = 0) => {
      const h = Math.sin(x * 12.9898 + y * 78.233 + s * 43.1) * 43758.5453;
      return h - Math.floor(h);
    };
    const HALO = ".·:;+=*x#";

    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      faint = cs.getPropertyValue("--text-faint").trim() || faint;
      fg = cs.getPropertyValue("--foreground").trim() || fg;
      accent = cs.getPropertyValue("--accent").trim() || accent;
      const g = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
      fontFamily = g ? `${g}, ui-monospace, Menlo, Consolas, monospace` : fontFamily;
    };
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    readTheme(); resize();
    window.addEventListener("resize", resize);
    const obs = new MutationObserver(readTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    /* Geometry for this frame: fingertip points, cell size, frame targets. */
    const geom = () => {
      const l = leftHand.current, r = rightHand.current, f = frame.current;
      if (!l || !r || !f) return null;
      const lr = l.getBoundingClientRect(), rr = r.getBoundingClientRect(), fr = f.getBoundingClientRect();
      if (lr.width < 2 || rr.width < 2) return null; // hands hidden (mobile)
      const cw = [lr.width / cols[0], rr.width / cols[1]];
      const chh = [lr.height / rows[0], rr.height / rows[1]];
      const start = [
        { x: lr.left + (tips[0].col + 0.5) * cw[0], y: lr.top + (tips[0].row + 0.5) * chh[0] },
        { x: rr.left + (tips[1].col + 0.5) * cw[1], y: rr.top + (tips[1].row + 0.5) * chh[1] },
      ];
      const cy = fr.top + fr.height / 2;
      const end = [{ x: fr.left + 6, y: cy }, { x: fr.right - 6, y: cy }];
      return { start, end, cw, chh, fontPx: Math.max(6, chh[0] / 1.05), fr };
    };

    const spawn = (side: 0 | 1) => {
      const pool = pools[side];
      particles.push({
        side,
        ch: pool[(Math.random() * pool.length) | 0],
        t: 0,
        dur: 1.1 + Math.random() * 0.7,
        arc: (Math.random() - 0.5) * 70,
        jx: (Math.random() - 0.5) * 3,
        jy: (Math.random() - 0.5) * 3,
        spin: (Math.random() - 0.5) * 0.6,
      });
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      const g = geom();
      if (!g) return;

      // ~9 glyphs/s per side
      spawnAcc += dt * 14;
      while (spawnAcc >= 1) { spawnAcc -= 1; spawn(0); spawn(1); }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Fingertip flicker: a few cells around each tip shimmer (being lifted off).
      for (let side = 0 as 0 | 1; side <= 1; side = (side + 1) as 0 | 1) {
        const s = g.start[side];
        ctx.font = `${g.fontPx}px ${fontFamily}`;
        for (let k = 0; k < 5; k++) {
          const ph = now / 1000 * (1.6 + k * 0.37) + k * 1.9;
          const a = 0.25 + 0.25 * Math.sin(ph);
          const ox = (Math.sin(ph * 0.7 + k) * 1.5) * g.cw[side];
          const oy = (Math.cos(ph * 0.9 + k * 2) * 1.5) * g.chh[side];
          ctx.globalAlpha = a;
          ctx.fillStyle = fg;
          ctx.fillText(pools[side][(k * 7) % pools[side].length], s.x + ox, s.y + oy);
        }
      }

      /* ─── ASCII halo hugging the CTA: a band of glyph cells around the text
         block, elliptical, densest at the left/right ends. Cells churn slowly;
         arrivals flash them white. ─── */
      {
        const fr = g.fr;
        const cw = g.cw[0], ch = g.chh[0];
        const pad = 2.2;               // band thickness, in cells, outside the block
        const x0 = fr.left - pad * cw, x1 = fr.right + pad * cw;
        const y0 = fr.top - pad * ch, y1 = fr.bottom + pad * ch;
        const cx = (fr.left + fr.right) / 2, cy = (fr.top + fr.bottom) / 2;
        const rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
        const irx = fr.width / 2 + cw * 0.3, iry = fr.height / 2 + ch * 0.2; // keep clear of the text
        const tsec = now / 1000;
        for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t > 0.7) flashes.splice(i, 1); }
        ctx.font = `${g.fontPx}px ${fontFamily}`;
        for (let y = y0; y <= y1; y += ch) {
          for (let x = x0; x <= x1; x += cw) {
            const dx = (x - cx), dy = (y - cy);
            const dOut = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);      // <1 inside outer ellipse
            const dIn = (dx * dx) / (irx * irx) + (dy * dy) / (iry * iry);   // >1 outside the text
            if (dOut > 1 || dIn < 1) continue;
            const col = Math.round(x / cw), row = Math.round(y / ch);
            // density: strongest toward the ends (|cos θ|), fading outward
            const ang = Math.abs(dx) / Math.max(1, Math.hypot(dx, dy * (rx / ry)));
            const edge = 1 - Math.max(0, (dOut - 0.35) / 0.65);
            const dens = (0.22 + 0.78 * ang * ang) * edge;
            if (hash(col, row, 3) > dens) continue;
            const churn = 0.5 + 0.5 * Math.sin(tsec * (0.8 + hash(col, row, 4) * 1.6) + hash(col, row, 5) * 6.28);
            let a = 0.22 + 0.55 * churn * dens;
            let color = dens > 0.55 ? fg : faint;
            for (const f of flashes) {
              const d = Math.hypot(x - f.x, y - f.y);
              if (d < cw * 2.2) { const k = (1 - d / (cw * 2.2)) * (1 - f.t / 0.7); a = Math.max(a, 0.9 * k); if (k > 0.35) color = fg; }
            }
            const gi = Math.min(HALO.length - 1, Math.floor((hash(col, row, 6) * 0.5 + churn * 0.5) * HALO.length));
            ctx.globalAlpha = a;
            ctx.fillStyle = color;
            ctx.fillText(HALO[gi], x, y);
          }
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += dt / p.dur;
        if (p.t >= 1) {
          particles.splice(i, 1);
          const e = g.end[p.side];
          flashes.push({ x: e.x + (Math.random() - 0.5) * 24, y: e.y + (Math.random() - 0.5) * 40, t: 0 });
          continue;
        }
        const s = g.start[p.side], e = g.end[p.side];
        // pulled: slow lift-off, accelerating toward the frame
        const u = easeInCubic(p.t) * 0.45 + p.t * 0.55;
        const x = s.x + p.jx * g.cw[p.side] + (e.x - s.x) * u;
        const y = s.y + p.jy * g.chh[p.side] + (e.y - s.y) * u + p.arc * Math.sin(Math.PI * u);
        // fade in quickly, hold, dissolve on arrival
        const alpha = smooth(Math.min(1, p.t / 0.12)) * (1 - smooth(Math.max(0, (p.t - 0.88) / 0.12)));
        // colour: finger grey → white as it's drawn in; a few go accent
        const mix = smooth(Math.min(1, u * 1.3));
        ctx.globalAlpha = alpha * (0.55 + 0.45 * mix);
        ctx.fillStyle = mix > 0.6 ? (Math.abs(p.arc) > 28 ? accent : fg) : faint;
        ctx.font = `${g.fontPx * (1 - 0.35 * mix)}px ${fontFamily}`;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.spin * mix);
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      obs.disconnect();
    };
  }, [leftHand, rightHand, frame, leftText, rightText]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[25] hidden sm:block"
    />
  );
}
