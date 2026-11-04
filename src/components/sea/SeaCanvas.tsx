"use client";

import { useEffect, useRef } from "react";
import { SeaEngine } from "./SeaEngine";
import { isReducedMotion, subscribeReducedMotion } from "@/lib/motion";
import { BEATS, WINDOWS } from "./journey";

/* Tiny store: the HUD reads live telemetry from the running engine. */
let current: SeaEngine | null = null;
const subs = new Set<() => void>();
export const seaStore = {
  get: () => current,
  set(e: SeaEngine | null) {
    current = e;
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

function readVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function monoFamily(): string {
  const v = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
  return v ? `${v}, ui-monospace, Menlo, Consolas, monospace` : "ui-monospace, Menlo, Consolas, monospace";
}

/** Full-screen fixed canvas running the sea. Mount once per page. */
export default function SeaCanvas({ quietSelector = "[data-sea-quiet]" }: { quietSelector?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let engine: SeaEngine;
    try {
      engine = new SeaEngine(canvas, {
        fontFamily: monoFamily(),
        reducedMotion: isReducedMotion(),
        quietSelector,
      });
    } catch (err) {
      console.warn("[sea] disabled:", err);
      document.documentElement.dataset.seaFallback = "1";
      return;
    }
    seaStore.set(engine);
    (window as unknown as { __sea?: SeaEngine }).__sea = engine;
    if (process.env.NODE_ENV !== "production") {
      // Dev: beat arrival points for tuning / tests (scrollTo(arrive * innerHeight)).
      (window as unknown as { __seaBeats?: unknown }).__seaBeats = BEATS.map((b, i) => ({ id: b.id, ...WINDOWS[i] }));
    }

    const applyColors = () =>
      engine.setColors(
        readVar("--ascii-lo", "#5c5c5c"),
        readVar("--ascii-hi", "#cfcfcf"),
        parseFloat(readVar("--ascii-gain", "1")),
      );
    applyColors();
    engine.setScroll(window.scrollY);
    engine.start();

    document.fonts?.ready.then(() => engine.setFontFamily(monoFamily())).catch(() => {});

    const onScroll = () => engine.setScroll(window.scrollY);
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        engine.resize();
        engine.setScroll(window.scrollY);
      }, 80);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      engine.setPointer(e.clientX, e.clientY);
    };
    const onLeave = () => engine.clearPointer();
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("a, button, input, textarea, select, [data-no-ripple]")) return;
      engine.ripple(e.clientX, e.clientY, 1);
    };
    const themeObserver = new MutationObserver(applyColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const unsubMotion = subscribeReducedMotion(() => engine.setReducedMotion(isReducedMotion()));

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      themeObserver.disconnect();
      unsubMotion();
      engine.dispose();
      seaStore.set(null);
    };
  }, [quietSelector]);

  return <canvas ref={ref} aria-hidden className="fixed inset-0 h-full w-full pointer-events-none z-0" />;
}
