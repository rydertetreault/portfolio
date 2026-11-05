"use client";

import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useCloseBox } from "./WaveBox";

/**
 * A plain lightbox over the ocean: no frame, just a soft shadow (deepest in the middle, the
 * ocean still moving at the edges) and one centred column. Used by /projects, /resume, /contact.
 */
export default function ShadeBox({ path, children }: { path: string; children: ReactNode }) {
  const close = useCloseBox();

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    // Esc closes a screenshot viewer first, then the box.
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && !document.querySelector('[aria-label="Screenshot viewer"]') && close();
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bg = (p: number) => `color-mix(in srgb, var(--background) ${p}%, transparent)`;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal aria-label={path}>
      {/* The stops' own text steps out of the way while a box is open. */}
      <style>{"[data-ocean-stop]{visibility:hidden}"}</style>
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 110% at 50% 50%, ${bg(100)} 0%, ${bg(97)} 55%, ${bg(85)} 80%, ${bg(64)} 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      />
      <motion.div
        className="absolute inset-0 overflow-y-auto [scrollbar-width:thin]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="mx-auto w-full max-w-4xl px-6 pb-24 pt-8 sm:pt-12">
          <div
            className="sticky top-0 z-10 -mx-6 mb-10 flex items-center justify-between px-6 py-4 backdrop-blur-sm sm:mb-14"
            style={{ background: bg(88) }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-text-faint">
              <span className="text-accent">~</span>
              {path.replace(/^~/, "")}
            </p>
            <button
              onClick={close}
              aria-label="Close"
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted transition-colors hover:text-accent"
            >
              <span className="hidden sm:inline">Esc</span>
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/** The title block every box opens with. */
export function BoxHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-12 space-y-3">
      <h1 className="text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">{title}</h1>
      {children && <p className="max-w-xl leading-relaxed text-text-muted">{children}</p>}
    </header>
  );
}
