"use client";

import { useEffect, useState } from "react";

/* Text that is continuously "reconstituted" from ASCII glyphs: on mount every
   character starts as a ramp glyph and resolves left→right; afterwards a letter
   or two at a time flips to a glyph and back, so the word never fully settles. */
const RAMP = ".·:;+=*x#%@";

export default function LiveDecode({
  text,
  className = "",
  resolveMs = 1100,
  churn = 0.9, // average flips per second after resolve
}: {
  text: string;
  className?: string;
  resolveMs?: number;
  churn?: number;
}) {
  const [shown, setShown] = useState<string[]>(() => text.split(""));

  useEffect(() => {
    const chars = text.split("");
    const n = chars.length;
    const glyph = () => RAMP[(Math.random() * RAMP.length) | 0];
    let raf = 0;
    let timer = 0;
    let disposed = false;
    const t0 = performance.now();

    // Phase 1: resolve left→right with a scrambling head.
    const tick = (now: number) => {
      if (disposed) return;
      const u = Math.min(1, (now - t0) / resolveMs);
      const head = u * (n + 3);
      setShown(chars.map((c, i) => (c === " " ? " " : i < head - 3 ? c : i < head ? glyph() : glyph())));
      if (u < 1) raf = requestAnimationFrame(tick);
      else { setShown(chars); schedule(); }
    };

    // Phase 2: random single-letter flips.
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (disposed) return;
        const idx: number[] = [];
        while (idx.length < (Math.random() < 0.3 ? 2 : 1)) {
          const i = (Math.random() * n) | 0;
          if (chars[i] !== " " && !idx.includes(i)) idx.push(i);
        }
        let step = 0;
        const flip = () => {
          if (disposed) return;
          step++;
          setShown(chars.map((c, i) => (idx.includes(i) && step < 4 ? glyph() : c)));
          if (step < 4) timer = window.setTimeout(flip, 45);
          else schedule();
        };
        flip();
      }, (1000 / churn) * (0.5 + Math.random()));
    };

    raf = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [text, resolveMs, churn]);

  return (
    <span className={className} aria-label={text}>
      {shown.map((c, i) => (
        <span key={i} className={c !== text[i] ? "text-accent" : undefined}>
          {c}
        </span>
      ))}
    </span>
  );
}
