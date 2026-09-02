"use client";

import { useEffect, useRef, useState, type ElementType } from "react";

/**
 * Text that "decodes" on mount: every character cycles through ASCII ramp glyphs
 * and resolves left → right. Server-renders the final text (no layout shift);
 * respects prefers-reduced-motion.
 */
const GLYPHS = " .:-=+*#%@/\\|<>^_";

export default function AsciiReveal({
  text,
  as: Tag = "span",
  className = "",
  delay = 0,
  duration = 900,
  replayKey,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  /** ms before decoding starts */
  delay?: number;
  /** ms for the full resolve */
  duration?: number;
  /** change to replay the effect */
  replayKey?: string | number;
}) {
  const [display, setDisplay] = useState(text);
  const raf = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chars = Array.from(text);
    const n = chars.length;
    let start = 0;
    const seed = Array.from({ length: n }, () => Math.random());

    const tick = (now: number) => {
      if (reduce || n === 0) {
        setDisplay(text);
        return;
      }
      if (!start) start = now;
      const t = (now - start - delay) / duration;
      if (t < 0) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      let out = "";
      let done = true;
      for (let i = 0; i < n; i++) {
        const c = chars[i];
        if (c === " " || c === "\n") {
          out += c;
          continue;
        }
        // Each character resolves at a staggered time with some per-char randomness.
        const resolveAt = (i / n) * 0.75 + seed[i] * 0.25;
        if (t >= resolveAt) {
          out += c;
        } else {
          done = false;
          out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)] || c;
        }
      }
      setDisplay(out);
      if (!done) raf.current = requestAnimationFrame(tick);
      else setDisplay(text);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [text, delay, duration, replayKey]);

  return (
    <Tag className={className} aria-label={text}>
      <span aria-hidden className="whitespace-pre-wrap">
        {display}
      </span>
    </Tag>
  );
}
