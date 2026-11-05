"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { OceanEngine, type Quiet } from "./OceanEngine";
import { BEATS, TRACK, WINDOWS, eventsAt } from "./route";
import { ACCENTS, isleCentre } from "./world";
import { oceanView } from "./nav";
import { useReducedMotionPref } from "@/lib/motion";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * The ocean canvas: fixed behind the page. Scroll drives the camera; the camera's
 * smoothed position is published to `camU` so the text follows the flight, not the wheel.
 * Elements tagged `data-ocean-quiet` keep the water calm behind them (scaled by their opacity).
 */
export default function OceanCanvas({ camU, chains }: { camU: MotionValue<number>; chains: number[] }) {
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

    oceanView.project = (p) => engine.project(p);
    oceanView.events = () => engine.ev;
    oceanView.eye = () => engine.cam?.pos ?? null;
    oceanView.probe = (xz) => engine.probe(xz);
    oceanView.heights = () => engine.probeHeights;
    engine.onFrame = (u) => {
      camU.set(u);
      oceanView.frame.forEach((f) => f());
    };
    const hi = (e: Event) => {
      engine.isleHi = (e as CustomEvent<number>).detail;
    };
    window.addEventListener("ocean:isle", hi);
    const focus = (e: Event) => {
      const k = (e as CustomEvent<number>).detail;
      engine.setFocus(k < 0 ? null : k);
    };
    window.addEventListener("ocean:focus", focus);
    const all = (e: Event) => engine.setAll((e as CustomEvent<boolean>).detail);
    window.addEventListener("ocean:all", all);
    oceanView.isles = () => ({ centre: (k) => isleCentre(k, engine.chainN), rise: engine.isleRise, all: engine.allAmt });
    // Jump to a stop (Back to the surface, the header name): a cut, not a flight back along the route.
    const jump = (e: Event) => {
      const u = (e as CustomEvent<number>).detail ?? 0;
      engine.jumpTo(u);
      window.scrollTo({ top: u * window.innerHeight, behavior: "auto" });
    };
    window.addEventListener("ocean:jump", jump);
    engine.quietSource = () => {
      const out: Quiet[] = [];
      document.querySelectorAll<HTMLElement>("[data-ocean-quiet]").forEach((el) => {
        // The element's own effective opacity (every ancestor's, multiplied), so text that is
        // hidden inside a visible stop doesn't leave a dark patch behind.
        let a = parseFloat(el.dataset.oceanQuiet || "1") || 1;
        for (let n: HTMLElement | null = el; n && n !== document.body && a >= 0.02; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.visibility === "hidden" || cs.display === "none") a = 0;
          a *= parseFloat(cs.opacity);
        }
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
      window.removeEventListener("ocean:isle", hi);
      window.removeEventListener("ocean:focus", focus);
      window.removeEventListener("ocean:all", all);
      oceanView.isles = null;
      window.removeEventListener("ocean:jump", jump);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", vis);
      oceanView.project = null;
      oceanView.events = null;
      oceanView.eye = null;
      oceanView.probe = null;
      oceanView.heights = null;
      engine.dispose();
      engineRef.current = null;
    };
  }, [camU]);

  useEffect(() => {
    engineRef.current?.setReducedMotion(reduced);
  }, [reduced]);

  const [pro, per] = chains;
  useEffect(() => {
    if (engineRef.current) engineRef.current.chainN = [pro, per];
  }, [pro, per]);

  return <canvas ref={ref} aria-hidden className="fixed inset-0 h-full w-full" style={{ zIndex: 0 }} />;
}
