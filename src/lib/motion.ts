/**
 * Site-wide "no motion" preference.
 *
 * The `reduce-motion` class on <html> is the single source of truth (same pattern
 * as the theme): the inline script in layout.tsx sets it before first paint from
 * the stored choice, falling back to the OS `prefers-reduced-motion` setting.
 * Everything that animates checks `isReducedMotion()` (imperative code) or
 * `useReducedMotionPref()` (React), so the nav toggle and the OS setting are
 * honoured in exactly the same way.
 */
import { useSyncExternalStore } from "react";

import { MOTION_STORAGE_KEY, REDUCE_MOTION_CLASS } from "./motion-script";

export { MOTION_STORAGE_KEY, REDUCE_MOTION_CLASS };

type StoredMotion = "reduce" | "full" | null;

function storedMotion(): StoredMotion {
  try {
    const m = localStorage.getItem(MOTION_STORAGE_KEY);
    return m === "reduce" || m === "full" ? m : null;
  } catch {
    return null;
  }
}

function systemReduce(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function effectiveReduce(): boolean {
  const s = storedMotion();
  return s ? s === "reduce" : systemReduce();
}

function applyClass(reduce: boolean) {
  const root = document.documentElement;
  if (root.classList.contains(REDUCE_MOTION_CLASS) === reduce) return;
  root.classList.toggle(REDUCE_MOTION_CLASS, reduce);
}

/** Current effective preference (client only; false on the server). */
export function isReducedMotion(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains(REDUCE_MOTION_CLASS);
}

/** Explicitly turn motion off (true) or on (false), and remember the choice. */
export function setReducedMotion(reduce: boolean): void {
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, reduce ? "reduce" : "full");
  } catch {}
  applyClass(reduce);
}

/**
 * Notify on preference changes (toggle or OS setting). Also keeps the class in
 * sync with the OS while the visitor hasn't made an explicit choice, and repairs
 * it if React ever regenerates <html>.
 */
export function subscribeReducedMotion(onChange: () => void): () => void {
  let last = isReducedMotion();
  const mo = new MutationObserver(() => {
    const now = isReducedMotion();
    if (now !== last) {
      last = now;
      onChange();
    }
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onOs = () => applyClass(effectiveReduce());
  mq.addEventListener("change", onOs);
  applyClass(effectiveReduce());
  return () => {
    mo.disconnect();
    mq.removeEventListener("change", onOs);
  };
}

/** React hook: true when motion should be suppressed. */
export function useReducedMotionPref(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, isReducedMotion, () => false);
}
