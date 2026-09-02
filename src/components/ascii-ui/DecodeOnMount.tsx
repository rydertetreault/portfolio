"use client";

import { useEffect } from "react";
import { decodePage } from "./corrupt";

/**
 * Direct loads (no page transition) still get the decode: the page's text starts
 * as symbols and resolves. Skipped when a transition is already choreographing it,
 * and under prefers-reduced-motion.
 */
export default function DecodeOnMount({ ms = 1500 }: { ms?: number }) {
  useEffect(() => {
    if ((window as unknown as { __asciiTransition?: boolean }).__asciiTransition) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const main = document.querySelector("main");
    if (!main) return;
    const id = requestAnimationFrame(() => void decodePage(main, ms));
    return () => cancelAnimationFrame(id);
  }, [ms]);
  return null;
}
