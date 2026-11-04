"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { OceanEngine, type Quiet } from "./OceanEngine";
import { BEATS, TRACK, WINDOWS, eventsAt } from "./route";
import { ACCENTS } from "./world";
import { useReducedMotionPref } from "@/lib/motion";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * The ocean canvas: fixed behind the page. Scroll drives the camera; the camera's
 * smoothed position is published to `camU` so the text follows the flight, not the wheel.
 * Elements tagged `data-ocean-quiet` keep the water calm behind them (scaled by their opacity).
 */
export default function OceanCanvas({ camU }: { camU: MotionValue<number> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OceanEngine | null>(null);
  const reduced = useReducedMotionPref();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let engine: OceanEngine;
    try {
      engine = new OceanEngine(canvas);
    } catch (e) {
      console.warn("[ocean]", e);
      canvas.style.display = "none";
      return;
    }
    engineRef.current = engine;
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __ocean: engine, __route: { BEATS, WINDOWS, eventsAt } });

    const theme = () =>
      engine.setColors(cssVar("--background"), cssVar("--ascii-lo"), cssVar("--ascii-hi"), parseFloat(cssVar("--ascii-gain")) || 1, ACCENTS.map(cssVar));
    theme();
    const mo = new MutationObserver(theme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const mono = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
    engine.setFont(mono ? `${mono}, ui-monospace, monospace` : "ui-monospace, monospace");
    document.fonts?.ready.then(() => engine.setFont(mono ? `${mono}, ui-monospace, monospace` : "ui-monospace, monospace"));

    const scroll = () => engine.setScroll(Math.min(TRACK, window.scrollY / window.innerHeight));
    scroll();
    engine.snap();
    window.addEventListener("scroll", scroll, { passive: true });
    const onResize = () => {
      engine.resize();
      scroll();
    };
    window.addEventListener("resize", onResize);

    engine.onFrame = (u) => camU.set(u);
    engine.quietSource = () => {
      const out: Quiet[] = [];
      document.querySelectorAll<HTMLElement>("[data-ocean-quiet]").forEach((el) => {
        const stop = el.closest<HTMLElement>("[data-ocean-stop]");
        const a =
          parseFloat(getComputedStyle(stop ?? el).opacity) * (parseFloat(el.dataset.oceanQuiet || "1") || 1);
        if (a < 0.02) return;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight || r.width === 0) return;
        out.push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom, a });
      });
      return out;
    };

    const vis = () => (document.hidden ? engine.stop() : engine.start());
    document.addEventListener("visibilitychange", vis);
    engine.start();

    return () => {
      mo.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", vis);
      engine.dispose();
      engineRef.current = null;
    };
  }, [camU]);

  useEffect(() => {
    engineRef.current?.setReducedMotion(reduced);
  }, [reduced]);

  return <canvas ref={ref} aria-hidden className="fixed inset-0 h-full w-full" style={{ zIndex: 0 }} />;
}
