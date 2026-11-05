import { useEffect } from "react";
import { BEATS, TRACK, WINDOWS } from "./route";

/**
 * Where a glide can come to rest: every stop you read (its arrival), and the end of a long hold
 * that plays something while you're there (the islands rising in 04). The black at the bottom
 * of the dive (hold 0) is never one: glides carry on through it.
 */
const REST: number[] = (() => {
  const r = new Set<number>([0]);
  BEATS.forEach((b, i) => {
    if (b.hold <= 0) return;
    r.add(WINDOWS[i].arrive);
    if (b.hold >= 2) r.add(WINDOWS[i].leave);
  });
  return [...r].sort((a, b) => a - b);
})();

/** Auto-scroll only from Education (05) on; before it the route follows normal scrolling. */
const FROM = WINDOWS[BEATS.findIndex((b) => b.id === "education")].arrive;

/** Wheel travel (px) that counts as a deliberate scroll (trackpads send tiny deltas). */
const WHEEL_COMMIT = 24;
/** Scroll idle (ms) before a part-way scroll (keys, touch, scrollbar) is finished. */
const IDLE = 120;
/** A wheel gap (ms) that ends a gesture: until then, momentum after a glide is absorbed. */
const GESTURE_GAP = 220;
/** Glide duration per viewport height of scroll, and its bounds (ms). */
const MS_PER_VH = 650;
const MIN_MS = 650;
const MAX_MS = 2600;
/** Glides through the whirlpool dive (the helix down the funnel) go slower: ms per vh, no cap. */
const DIVE_MS_PER_VH = 1000;
const DIVE = WINDOWS[BEATS.findIndex((b) => b.id === "dive")];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Gentler ease for the dive: peaks at ~1.6x average speed instead of 3x. */
const easeSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const EPS = 0.02;

/** The rest point after (dir 1) or before (dir -1) u, or null past either end. */
function nextRest(u: number, dir: number): number | null {
  if (dir > 0) return REST.find((r) => r > u + EPS) ?? null;
  for (let i = REST.length - 1; i >= 0; i--) if (REST[i] < u - EPS) return REST[i];
  return null;
}

/** An element under the pointer that will scroll itself in that direction (a long description). */
function scrollsItself(t: EventTarget | null, dy: number): boolean {
  for (let el = t instanceof Element ? t : null; el && el !== document.documentElement; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
      if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
    }
  }
  return false;
}

/**
 * The route moves stop to stop: one deliberate wheel scroll flies to the next stop (or back to
 * the last), and the camera's flight plays out on its own. Momentum from the same gesture is
 * absorbed so one flick is one stop. Keys, touch and the scrollbar scroll natively; when they
 * stop part-way between stops, the flight is finished in the direction they were going.
 * Past the last stop (the deep) the page scrolls freely.
 */
export function useGlide(): void {
  useEffect(() => {
    const html = document.documentElement;
    let raf = 0;
    let idle = 0;
    let gliding = 0; // direction of the glide in progress, 0 = none
    let gesture = 0; // direction of the wheel gesture that is still being absorbed
    let gestureEnd = 0;
    let acc = 0;
    let accAt = 0;
    let dir = 1;
    let lastY = window.scrollY;
    let pointerDown = false;
    let blockedAt = 0;

    const locked = () => {
      const l = html.style.overflow === "hidden";
      if (l) blockedAt = performance.now();
      return l;
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      gliding = 0;
    };

    const glideTo = (u: number) => {
      stop();
      const from = window.scrollY;
      const to = Math.min(TRACK, u) * window.innerHeight;
      const dist = to - from;
      if (Math.abs(dist) < 2) return;
      if (html.classList.contains("reduce-motion")) {
        window.scrollTo({ top: to, behavior: "auto" });
        return;
      }
      const vh = Math.abs(dist) / window.innerHeight;
      const a = Math.min(from, to) / window.innerHeight;
      const b = Math.max(from, to) / window.innerHeight;
      // The helix part of the flight is paced by DIVE_MS_PER_VH, the rest at the normal rate.
      const inDive = Math.max(0, Math.min(b, DIVE.arrive) - Math.max(a, DIVE.start));
      const dive = inDive > 0;
      const ms = dive
        ? inDive * DIVE_MS_PER_VH + (vh - inDive) * MS_PER_VH
        : Math.min(MAX_MS, Math.max(MIN_MS, vh * MS_PER_VH));
      const curve = dive ? easeSine : ease;
      const t0 = performance.now();
      gliding = Math.sign(dist);
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        window.scrollTo({ top: from + dist * curve(t), behavior: "auto" });
        if (t < 1) raf = requestAnimationFrame(step);
        else gliding = 0;
      };
      raf = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.deltaY === 0) return;
      const now = performance.now();
      if (locked() || now - blockedAt < 500) return;
      const d = Math.sign(e.deltaY);
      // A glide always plays out: swallow everything (any direction) until it lands, and its momentum after.
      if (gliding) {
        e.preventDefault();
        gesture = d;
        gestureEnd = now;
        return;
      }
      // Still the gesture that started a glide (or its momentum): swallow it.
      if (gesture === d && now - gestureEnd < GESTURE_GAP) {
        e.preventDefault();
        gestureEnd = now;
        return;
      }
      gesture = 0;
      if (scrollsItself(e.target, e.deltaY)) return;
      const u = window.scrollY / window.innerHeight;
      const target = nextRest(u, d);
      if (target === null) {
        stop();
        return; // past the last stop: free scrolling
      }
      if (u < FROM - EPS || target < FROM - EPS) return; // before Education: normal scrolling
      e.preventDefault();
      if (gliding === d) return;
      // Add up small deltas until it's clearly a scroll, not a twitch.
      if (now - accAt > GESTURE_GAP || Math.sign(acc) !== d) acc = 0;
      acc += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      accAt = now;
      if (Math.abs(acc) < WHEEL_COMMIT) return;
      acc = 0;
      gesture = d;
      gestureEnd = now;
      glideTo(target);
    };

    const settle = () => {
      if (gliding || pointerDown || locked()) return;
      const u = window.scrollY / window.innerHeight;
      if (REST.some((r) => Math.abs(r - u) < EPS)) return;
      if (u < FROM) return; // before Education: normal scrolling
      const target = nextRest(u, dir);
      if (target !== null && u < REST[REST.length - 1]) glideTo(target);
    };

    const onScroll = () => {
      const y = window.scrollY;
      if (y !== lastY && !gliding) dir = Math.sign(y - lastY);
      lastY = y;
      window.clearTimeout(idle);
      if (!gliding) idle = window.setTimeout(settle, IDLE);
    };
    // Touch, keys and clicks don't interrupt a glide either.
    const onTouchMove = (e: TouchEvent) => {
      if (gliding) e.preventDefault();
    };
    const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
    const onKey = (e: KeyboardEvent) => {
      if (gliding && SCROLL_KEYS.has(e.key)) e.preventDefault();
    };
    const onDown = () => {
      pointerDown = true;
    };
    const onUp = () => {
      pointerDown = false;
      window.clearTimeout(idle);
      idle = window.setTimeout(settle, IDLE);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      stop();
      window.clearTimeout(idle);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);
}
