"use client";

import { useEffect, useState, type RefObject } from "react";
import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   ScanReadout — the terminal that narrates the intro.

   Lines are appended as the stage reports beats; each types in
   over a few frames. The live counter (glyphs collected, then
   scan %) is a span the canvas writes into directly; the scan
   line also carries a thin progress bar whose fill the canvas
   drives through `barRef`.
   ═══════════════════════════════════════════════════════════ */

export type ReadoutLine = {
  key: string;
  label: string;
  value?: string;
  live?: boolean;
  caret?: boolean;
  bar?: boolean;
  /** The verdict: larger, and typed in slowly (label is dropped so it gets the full line). */
  emphasis?: boolean;
  /** Second verdict line, typed in after the first, in the accent colour. */
  value2?: string;
};

function Typed({ text, ms = 220, delay = 0, className = "" }: { text: string; ms?: number; delay?: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const u = Math.max(0, Math.min(1, (now - t0) / ms));
      setN(Math.round(u * text.length));
      if (u < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, ms, delay]);
  return <span className={className}>{text.slice(0, n)}</span>;
}

export default function ScanReadout({
  lines,
  counterRef,
  barRef,
}: {
  lines: ReadoutLine[];
  counterRef: RefObject<HTMLSpanElement | null>;
  barRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
      className="pointer-events-none absolute inset-x-0 bottom-[7vh] z-30 flex justify-center sm:inset-x-auto sm:bottom-auto sm:left-8 sm:top-1/2 sm:-translate-y-1/2 sm:justify-start lg:left-14"
    >
      <div
        data-ascii-quiet
        data-corruption-quiet
        className="min-w-[17rem] font-mono text-[11px] uppercase tracking-[0.28em] text-text-faint"
      >
        <div className="mb-3 flex items-center gap-2 text-[9px] tracking-[0.5em] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
          trace // v2.0
        </div>
        {lines.map((l) => l.emphasis ? (
          <div key={l.key} className="mt-2">
            <div className="flex items-baseline gap-3 leading-8">
              <span className="text-accent">▸</span>
              <Typed
                text={l.value ?? ""}
                ms={Math.max(700, (l.value?.length ?? 0) * 40)}
                className="whitespace-pre text-base tracking-[0.35em] text-foreground sm:text-lg"
              />
            </div>
            {l.value2 && (
              <div className="flex items-baseline gap-3 leading-8">
                <span className="text-accent">▸</span>
                <Typed
                  text={l.value2}
                  ms={Math.max(700, l.value2.length * 45)}
                  delay={Math.max(700, (l.value?.length ?? 0) * 40) + 150}
                  className="whitespace-pre text-base tracking-[0.35em] text-accent sm:text-lg"
                />
                <span className="intro-caret text-accent">_</span>
              </div>
            )}
          </div>
        ) : (
          <div key={l.key} className="flex items-baseline gap-3 leading-7">
            <span className="text-accent">▸</span>
            <Typed text={l.label} className="w-24 shrink-0" />
            {l.bar && (
              <span className="relative block h-px w-28 shrink-0 self-center bg-border-theme">
                <div
                  ref={l.live ? barRef : undefined}
                  className="absolute -inset-y-px left-0 bg-accent"
                  style={{ width: l.live ? "0%" : "100%" }}
                />
              </span>
            )}
            {l.live ? (
              <span ref={counterRef} className="tabular-nums text-foreground" />
            ) : l.value !== undefined ? (
              <Typed text={l.value} ms={260} className="text-foreground" />
            ) : null}
            {l.caret && <span className="intro-caret text-accent">_</span>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
