"use client";

import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════
   CursorGlyphStream — a comet tail of ASCII glyphs that
   streams off the mouse as it moves across the homepage.

   · one fixed, pointer-events-none 2D canvas above the page
   · a tightly-eased "head" tracks the real cursor (a few ms of
     lag, just enough to round off corners); glyphs are spawned
     along the head's path every frame, so the tail is a smooth
     curve even when the mouse moves in jerky straight segments
   · the spawn point weaves side-to-side across the direction of
     travel (a slow ribbon), and every glyph carries a curl that
     bends its drift into an arc instead of a straight streak
   · glyphs snap to text rows (line height) but slide freely in x,
     which keeps the "typed text" feel without stair-stepping
   · each character scrambles while alive and decays down the
     density ramp (@ # * + : .) as it fades out
   · colours: mostly the site lime (--accent / --accent-hover),
     with the theme foreground grey and a few of the intro reel's
     hues mixed in; re-read on theme change
   · mouse only (no touch / coarse pointers), off under
     prefers-reduced-motion, rAF loop sleeps when nothing is alive
   ═══════════════════════════════════════════════════════════ */

const RAMP = "@#%*+=:-.";          // decay ramp, dense → faint
const GLYPHS = "@#%&*+=<>/\\|^~:;$01[]{}";
const FONT_PX = 12;
const LINE_H = 1.2;
const MAX_PARTICLES = 480;
const SPAWN_EVERY_PX = 5;         // one glyph per N px of head travel
const LIFE_MIN = 0.5;
const LIFE_MAX = 1.2;
const HEAD_FOLLOW = 26;           // head follow rate (1/s); ~40ms lag, rounds corners without trailing
const WEAVE_AMPLITUDE = 14;       // px of ribbon sway across the travel direction
const WEAVE_WAVELENGTH = 90;      // px of travel per weave cycle
const CURL_MAX = 3.2;             // rad/s, how hard a glyph's drift bends

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  curl: number;     // rad/s rotation applied to (vx, vy)
  age: number;
  life: number;
  ch: string;
  color: string;
  scrambleAt: number;
  scrambleEvery: number;
};

type Palette = { accent: string; accentHover: string; fg: string; extra: string[] };

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
  return {
    accent: v("--accent", "#a3e635"),
    accentHover: v("--accent-hover", "#bef264"),
    fg: v("--text-muted", "#a3a3a3"),
    extra: ["#d8fb74", "#cdcf5f", "#bad366", "#d3b75b", "#62a74a"],
  };
}

function pickColor(p: Palette): string {
  const r = Math.random();
  if (r < 0.5) return p.accent;
  if (r < 0.65) return p.accentHover;
  if (r < 0.87) return p.fg;
  return p.extra[(Math.random() * p.extra.length) | 0];
}

function resolveMonoFamily(): string {
  const v = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
  const base = "ui-monospace, Menlo, Consolas, 'Liberation Mono', monospace";
  return v ? `${v}, ${base}` : base;
}

export default function CursorGlyphStream({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Mouse only: the effect is meaningless (and wasteful) on touch screens.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let palette = readPalette();
    const font = `${FONT_PX}px ${resolveMonoFamily()}`;
    let cellW = FONT_PX * 0.6;
    const cellH = FONT_PX * LINE_H;
    let dpr = 1;
    let w = 0;
    let h = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = font;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      cellW = ctx.measureText("M").width || cellW;
    };
    resize();
    window.addEventListener("resize", resize);

    // Theme swap: refresh the palette so new glyphs pick up the new colours.
    const mo = new MutationObserver(() => { palette = readPalette(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const particles: Particle[] = [];
    let last: { x: number; y: number; t: number } | null = null;
    let carry = 0; // sub-spawn distance carried between events
    let raf = 0;
    let running = false;
    let prevFrame = 0;

    const spawn = (x: number, y: number, vx: number, vy: number, side: number) => {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      // Small scatter (biased to the ribbon's current side) so the tail has body.
      const sx = (Math.random() - 0.5 + side * 0.35) * cellW * 1.4;
      const sy = (Math.random() - 0.5) * cellH * 0.9;
      // Inherit a slice of head velocity (so it streams), plus lazy drift.
      const inherit = 0.1 + Math.random() * 0.1;
      const curlDir = Math.random() < 0.5 ? -1 : 1;
      particles.push({
        x: x + sx,
        y: y + sy,
        vx: -vx * inherit + (Math.random() - 0.5) * 30,
        vy: -vy * inherit + (Math.random() - 0.5) * 30 + 14,
        curl: curlDir * (0.6 + Math.random() * CURL_MAX),
        age: 0,
        life: LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN),
        ch: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        color: pickColor(palette),
        scrambleAt: 0,
        scrambleEvery: 0.05 + Math.random() * 0.09,
      });
    };

    // Tightly-eased head that tracks the cursor: rounds off the corners of the
    // raw pointer path without visibly lagging behind it.
    const head = { x: 0, y: 0, vx: 0, vy: 0, live: false };
    let travelled = 0; // total head travel, drives the ribbon weave

    const stepHead = (dt: number) => {
      if (!last || !head.live || dt <= 0) return;
      const k = 1 - Math.exp(-HEAD_FOLLOW * dt);
      const px = head.x;
      const py = head.y;
      head.x += (last.x - head.x) * k;
      head.y += (last.y - head.y) * k;
      const dx = head.x - px;
      const dy = head.y - py;
      head.vx = dx / dt;
      head.vy = dy / dt;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.05) return;
      // Unit normal to the direction of travel, for the ribbon sway.
      const nx = -dy / dist;
      const ny = dx / dist;
      carry += dist;
      while (carry >= SPAWN_EVERY_PX) {
        carry -= SPAWN_EVERY_PX;
        const f = 1 - carry / dist;
        travelled += SPAWN_EVERY_PX;
        const phase = (travelled / WEAVE_WAVELENGTH) * Math.PI * 2;
        const sway = Math.sin(phase);
        const off = sway * WEAVE_AMPLITUDE;
        spawn(px + dx * f + nx * off, py + dy * f + ny * off, head.vx, head.vy, sway);
      }
    };

    const frame = (now: number) => {
      const dt = Math.min((now - prevFrame) / 1000 || 0, 0.05);
      prevFrame = now;
      ctx.clearRect(0, 0, w, h);
      stepHead(dt);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        if (p.age >= p.life) { particles.splice(i, 1); continue; }
        const t = p.age / p.life;
        // Bend the drift into an arc, then ease out: streak → curl → settle.
        const a = p.curl * dt;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const rvx = p.vx * ca - p.vy * sa;
        const rvy = p.vx * sa + p.vy * ca;
        const damp = 1 - Math.min(dt * 3.2, 1);
        p.vx = rvx * damp;
        p.vy = rvy * damp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.scrambleAt += dt;
        if (p.scrambleAt >= p.scrambleEvery) {
          p.scrambleAt = 0;
          // Early life: random glyph churn. Late life: walk down the decay ramp.
          p.ch = t < 0.55
            ? GLYPHS[(Math.random() * GLYPHS.length) | 0]
            : RAMP[Math.min(RAMP.length - 1, ((t - 0.55) / 0.45 * RAMP.length) | 0)];
        }
        const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.95;
        ctx.fillStyle = p.color;
        // Snap to text rows only; x slides freely so curves don't stair-step.
        ctx.fillText(p.ch, p.x, Math.round(p.y / cellH) * cellH);
      }
      ctx.globalAlpha = 1;

      const headBusy = head.live && last !== null &&
        Math.hypot(last.x - head.x, last.y - head.y) > 0.5;
      if (particles.length > 0 || headBusy) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
      }
    };

    const ensureRunning = () => {
      if (running) return;
      running = true;
      prevFrame = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const x = e.clientX;
      const y = e.clientY;
      if (!last || !head.live) {
        // First contact (or re-entry): start the head at the cursor so it
        // doesn't streak in from wherever it was.
        head.x = x; head.y = y; head.vx = 0; head.vy = 0; head.live = true;
        carry = 0;
      }
      last = { x, y, t: performance.now() };
      ensureRunning();
    };

    const onLeave = () => { last = null; head.live = false; carry = 0; };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[60] h-full w-full ${className}`}
    />
  );
}
