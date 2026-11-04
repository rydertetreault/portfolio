"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { isReducedMotion } from "@/lib/motion";
import { oceanNav } from "./nav";

const RAMP = " .:-=+*#";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * A band of the live ASCII plasma around the edges of a box, with the homepage's
 * lime / orange accent runs. Grows in from the edges on mount.
 */
export function WaveFrame({ band = 5, dark = false }: { band?: number; dark?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const mono = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "ui-monospace";
    const fs = 11;
    let cw = 6.6;
    const ch = fs * 1.25;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let reachMax = band;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${fs}px ${mono}, ui-monospace, monospace`;
      cw = ctx.measureText("M").width || fs * 0.6;
      cols = Math.ceil(r.width / cw);
      rows = Math.ceil(r.height / ch);
      reachMax = r.width < 640 ? Math.min(band, 3) : band;
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    const lo = dark ? "#5c5c5c" : cssVar("--ascii-lo");
    const hi = dark ? "#cfcfcf" : cssVar("--ascii-hi");
    const acc = [cssVar("--ocean-a1"), cssVar("--ocean-a2")];
    const t0 = performance.now();
    const still = isReducedMotion();
    let raf = 0;

    const draw = (now: number) => {
      const t = still ? 0 : (now - t0) / 1000;
      const grow = still ? 1 : Math.min(1, (now - t0) / 700);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const reach = reachMax * (1 - (1 - grow) * (1 - grow));
      const ph = t * 0.45;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const e = Math.min(c / 2, (cols - 1 - c) / 2, r, rows - 1 - r);
          if (e >= reach) continue;
          // The live plasma (sum of sines), at a cell scale that reads as bands.
          const x = c * 0.11 - t * 0.12;
          const y = r * 0.3;
          let v = Math.sin(x + ph) + Math.sin(y + 0.7 * ph) + Math.sin(0.5 * (x + y + ph));
          v += Math.sin(Math.sqrt(x * x + y * y + 1) + ph);
          v += 0.5 * Math.sin(2 * x + Math.sin(y + 0.5 * ph) * 0.66);
          v += 0.5 * Math.sin(2 * y + Math.sin(x + 0.6 * ph) * 0.66);
          v = 0.5 + 0.5 * v * 0.37;
          const fade = 1 - e / reachMax;
          const b = Math.round(Math.min(1, Math.max(0, v)) * 7);
          if (b < 1) continue;
          let a = Math.pow(b / 7, 0.75) * 0.75 * fade;
          let color = a > 0.45 ? hi : lo;
          // Accent runs: short segments that light up for a few seconds.
          const seg = Math.floor((c + hash(r, 7) * 30) / 9);
          const cyc = t / 5 + hash(seg, r) * 9;
          if (b >= 4 && hash(seg + Math.floor(cyc) * 3.1, r) < 0.08) {
            const p = cyc - Math.floor(cyc);
            const env = Math.min(1, p * 8) * (p < 0.4 ? 1 : Math.max(0, 1 - (p - 0.4) * 6));
            if (env > 0.05) {
              color = acc[hash(seg, r + 1) < 0.7 ? 0 : 1];
              a = Math.max(a, 0.9 * env);
            }
          }
          ctx.globalAlpha = a;
          ctx.fillStyle = color;
          ctx.fillText(RAMP[b], c * cw + cw / 2, r * ch + ch / 2);
        }
      }
      ctx.globalAlpha = 1;
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [band, dark]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

/** Close a lightbox: back to where you came from in the ocean, else to the surface. */
export function useCloseBox() {
  const router = useRouter();
  return () => (oceanNav.depth > 1 ? router.back() : router.push("/", { scroll: false }));
}

/**
 * A waveform-styled lightbox over the ocean. Each page of the site (projects, a project,
 * the resume, contact) opens in one; the ocean keeps moving behind it.
 */
export default function WaveBox({ path, children }: { path: string; children: ReactNode }) {
  const close = useCloseBox();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center sm:p-6" role="dialog" aria-modal aria-label={path}>
      <motion.div
        className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onClick={close}
      />
      <motion.div
        ref={panel}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-full w-full overflow-hidden bg-background outline-none sm:h-[min(88vh,62rem)] sm:w-[min(74rem,100%)] sm:border sm:border-border-theme/60 sm:shadow-2xl"
      >
        <WaveFrame />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-5 sm:px-10">
          <p className="rounded-sm bg-background px-2 py-1 font-mono text-[11px] uppercase tracking-[0.25em] text-text-faint">
            <span className="text-accent">~</span>
            {path.replace(/^~/, "")}
          </p>
          <button
            onClick={close}
            aria-label="Close"
            className="rounded-sm bg-background p-1.5 text-text-muted transition-colors hover:text-accent"
          >
            <X size={18} />
          </button>
        </div>
        <div className="absolute inset-x-3 bottom-8 top-16 overflow-y-auto bg-background px-4 [scrollbar-width:thin] sm:inset-x-10 sm:bottom-14 sm:top-20 sm:px-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/** Inside a lightbox: scroll to `#id` from the URL (e.g. a project's row) once mounted. */
export function ScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" }), 450);
    return () => clearTimeout(t);
  }, []);
  return null;
}
