"use client";

import { useEffect, useRef } from "react";
import { isReducedMotion } from "@/lib/motion";

const NOISE = "!<>-_\\/[]{}=+*^?#%@:;";

/**
 * Text that decodes from glyph noise each time `active` turns on (CoD-style
 * mission-card typing). The real text is always rendered (SSR / SEO / no-JS);
 * the animation writes straight to the DOM node, so it never re-renders React.
 */
export default function HudText({
  text,
  active,
  delay = 0,
  duration,
  className,
}: {
  text: string;
  active: boolean;
  /** ms before this line starts decoding. */
  delay?: number;
  /** ms for the whole line (default scales with length). */
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    if (isReducedMotion()) {
      el.textContent = text;
      return;
    }
    const dur = duration ?? Math.min(1100, 260 + text.length * 22);
    const n = text.length;
    const reveal = Array.from(
      { length: n },
      (_, i) => delay + (i / Math.max(1, n)) * dur * 0.7 + Math.random() * dur * 0.3,
    );
    const t0 = performance.now();
    el.textContent = text.replace(/\S/g, " ");
    let raf = 0;
    const tick = () => {
      const t = performance.now() - t0;
      let s = "";
      let done = true;
      for (let i = 0; i < n; i++) {
        const ch = text[i];
        if (ch === " " || t >= reveal[i]) s += ch;
        else {
          done = false;
          s += t >= reveal[i] - 160 ? NOISE[(Math.random() * NOISE.length) | 0] : " ";
        }
      }
      el.textContent = s;
      if (!done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [active, text, delay, duration]);

  return (
    <span className={className} aria-label={text}>
      <span ref={ref} aria-hidden className="whitespace-pre-wrap">
        {text}
      </span>
    </span>
  );
}
