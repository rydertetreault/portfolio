"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LEFT_HAND, RIGHT_HAND } from "./hand-ascii";
import CursorGlyphStream from "./CursorGlyphStream";
import FingerStream from "./FingerStream";
import LiveDecode from "./LiveDecode";
import AsciiCorruption, { corruptionBus } from "./AsciiCorruption";
import IntroStage, { type IntroEvent } from "./intro/IntroStage";
import ScanReadout, { type ReadoutLine } from "./intro/ScanReadout";
import ThemeToggle from "./ThemeToggle";
import { loadFaceData, type FaceData } from "./intro/face-data";

/* ═══════════════════════════════════════════════════════════
   AsciiFace — homepage + intro overlay.

   idle   (the homepage) two ASCII hands framing a "scroll to trace"
          cue; glyphs trickle off the fingertips; the cursor leaves
          a glyph trail.
   trace  (the intro, on scroll) the trickle becomes a flood: every
          glyph is pulled off both hands and forms the face in the
          middle; the face is scanned and identified; the overview
          takes over. See intro/IntroStage.tsx for the beat itself.
   done   overlay fades; HomeContent (the overview) fades in.
   ═══════════════════════════════════════════════════════════ */

type Phase = "idle" | "trace" | "done";

type AsciiFaceProps = {
  /** Fires the moment the intro transitions to "done" (starts the overlay fade-out). */
  onIntroDone?: () => void;
};

export default function AsciiFace({ onIntroDone }: AsciiFaceProps = {}) {
  const prefersReduce = useReducedMotion();
  const [face, setFace] = useState<FaceData | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [mounted, setMounted] = useState(true);
  const [handsGone, setHandsGone] = useState(false);
  const [lines, setLines] = useState<ReadoutLine[]>([]);

  const leftHandRef = useRef<HTMLPreElement>(null);
  const rightHandRef = useRef<HTMLPreElement>(null);
  const ctaFrameRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  /* ── Preload face.bin silently on mount (during idle) ── */
  useEffect(() => {
    let alive = true;
    loadFaceData()
      .then((d) => { if (alive) setFace(d); })
      .catch((e) => console.error("[AsciiFace]", e));
    return () => { alive = false; };
  }, []);

  /* ── Trigger: any scroll/touch/key input while idle starts the trace ── */
  useEffect(() => {
    if (phase !== "idle") return;
    const start = () => {
      setPhase("trace");
      const handsVisible = (leftHandRef.current?.getBoundingClientRect().width ?? 0) > 1;
      setLines([
        { key: "src", label: "source", value: handsVisible ? "hands.l / hands.r" : "field" },
        { key: "collect", label: "collecting", live: true, caret: true },
      ]);
    };
    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener("wheel", start, opts);
    window.addEventListener("touchmove", start, opts);
    window.addEventListener("touchstart", start, opts);
    window.addEventListener("keydown", start);
    window.addEventListener("scroll", start, opts);
    return () => {
      window.removeEventListener("wheel", start);
      window.removeEventListener("touchmove", start);
      window.removeEventListener("touchstart", start);
      window.removeEventListener("keydown", start);
      window.removeEventListener("scroll", start);
    };
  }, [phase]);

  /* ── Trace: calm the background corruption while the face forms ── */
  useEffect(() => {
    if (phase !== "trace") return;
    corruptionBus.setPaused(true);
    return () => corruptionBus.setPaused(false);
  }, [phase]);

  /* ── Beats reported by the stage → readout lines ── */
  const onEvent = useCallback((e: IntroEvent) => {
    const drop = (ls: ReadoutLine[]) => ls.map((l) => ({ ...l, caret: false }));
    switch (e) {
      case "assembled":
        setHandsGone(true);
        setLines((ls) => [...drop(ls).map((l) => (l.key === "collect" ? { ...l, live: false, value: "complete" } : l)),
          { key: "subject", label: "subject", value: "formed" }]);
        break;
      case "sweep":
        setLines((ls) => [...drop(ls), { key: "scan", label: "scanning", live: true, bar: true, caret: true }]);
        break;
      case "landmarks":
        // the scan line stays live (bar keeps filling) until the match
        setLines((ls) => [...drop(ls), { key: "lm", label: "landmarks", value: "14 / 14" }]);
        break;
      case "match":
        setLines((ls) => [...drop(ls).map((l) => (l.key === "scan" ? { ...l, live: false, value: "100%" } : l)),
          { key: "match", label: "match", value: "99.7%" },
          { key: "id", label: "result", value: "subject identified", value2: "ryder tetreault", emphasis: true }]);
        break;
      case "release":
        setLines((ls) => [...ls, { key: "open", label: "opening", value: "overview" }]);
        setPhase("done");
        break;
      case "finished":
        break;
    }
  }, []);

  /* ── Done: tell the shell, then unmount after the fade ── */
  useEffect(() => {
    if (phase !== "done") return;
    onIntroDone?.();
    const id = window.setTimeout(() => setMounted(false), 700);
    return () => window.clearTimeout(id);
  }, [phase, onIntroDone]);

  /* ── Lock body scroll while the overlay is up ── */
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  const skip = () => setPhase("done");

  if (prefersReduce || !mounted) return null;

  const showIdle = phase === "idle";
  const showHands = !handsGone && phase !== "done";
  const showTrace = phase === "trace" || phase === "done";

  return (
    <AnimatePresence>
      <motion.div
        key="intro-overlay"
        aria-hidden={phase === "done"}
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === "done" ? 0 : 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
        className="fixed inset-0 z-[100] overflow-hidden"
      >
        {/* Dim ASCII "corruption" texture across the whole viewport. Full on the
            homepage; eased back once the trace starts so the face is clean. */}
        <motion.div
          key="corruption"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: showIdle ? 1 : 0.35 }}
          transition={{ duration: showIdle ? 1.2 : 1.6, ease: [0.4, 0.0, 0.2, 1] }}
          className="pointer-events-none absolute inset-0 z-[2]"
        >
          <AsciiCorruption />
        </motion.div>

        {/* Scrim behind the face while it forms / is scanned */}
        <AnimatePresence>
          {showTrace && (
            <motion.div
              key="scrim"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: [0.4, 0.0, 0.2, 1] }}
              className="pointer-events-none absolute inset-0 z-[5]"
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 34% 44% at 50% 50%, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 45%, rgba(0,0,0,0.28) 75%, transparent 92%)",
                }}
              />
              <div data-ascii-quiet className="absolute left-1/2 top-1/2 h-[48vmin] w-[36vmin] -translate-x-1/2 -translate-y-1/2" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── The hands. Mounted through idle AND the trace: the stage erodes
            their text cell by cell as the glyphs are pulled off. ── */}
        <AnimatePresence>
          {showHands && (
            <>
              <motion.pre
                key="hand-left"
                ref={leftHandRef}
                data-corruption-quiet
                aria-hidden
                initial={{ opacity: 0, x: -60 }}
                animate={{ opacity: 0.75, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.6, ease: [0.4, 0.0, 0.2, 1] },
                  x: { duration: 0.9, ease: [0.65, 0.0, 0.35, 1] },
                }}
                className="pointer-events-none absolute left-0 top-[46%] z-20 m-0 hidden -translate-y-1/2 select-none whitespace-pre font-mono leading-[1.05] text-text-faint sm:block"
                style={{ fontSize: "clamp(6px, 0.72vw, 12px)", textShadow: "0 0 6px rgba(52,211,153,0.15)" }}
              >
                {LEFT_HAND}
              </motion.pre>
              <motion.pre
                key="hand-right"
                ref={rightHandRef}
                data-corruption-quiet
                aria-hidden
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 0.75, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.6, ease: [0.4, 0.0, 0.2, 1] },
                  x: { duration: 0.9, ease: [0.65, 0.0, 0.35, 1] },
                }}
                className="pointer-events-none absolute right-0 top-[46%] z-20 m-0 hidden -translate-y-1/2 select-none whitespace-pre font-mono leading-[1.05] text-text-faint sm:block"
                style={{ fontSize: "clamp(6px, 0.72vw, 12px)", textShadow: "0 0 6px rgba(52,211,153,0.15)" }}
              >
                {RIGHT_HAND}
              </motion.pre>
            </>
          )}
        </AnimatePresence>

        {/* ── Idle (homepage): cursor trail, fingertip trickle, CTA ── */}
        <AnimatePresence>
          {showIdle && (
            <>
              <motion.div
                key="cursor-stream"
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="pointer-events-none absolute inset-0 z-[35]"
              >
                <CursorGlyphStream />
              </motion.div>

              {/* Glyphs pulled off the two index fingertips into the CTA. Fades
                  (rather than cuts) so its in-flight glyphs hand over to the flood. */}
              <motion.div
                key="finger-stream"
                aria-hidden
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="pointer-events-none absolute inset-0 z-[25]"
              >
                <FingerStream
                  leftHand={leftHandRef}
                  rightHand={rightHandRef}
                  frame={ctaFrameRef}
                  leftText={LEFT_HAND}
                  rightText={RIGHT_HAND}
                />
              </motion.div>

              <motion.div
                key="idle-cta"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
                className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
              >
                <div
                  ref={ctaFrameRef}
                  data-ascii-quiet
                  data-corruption-quiet
                  className="relative flex flex-col items-center gap-3 px-10 py-5 text-center"
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.5em] text-accent">
                    ▸ signal // standby ◂
                  </span>
                  <LiveDecode
                    text="AWAITING INPUT"
                    className="whitespace-pre font-mono text-base font-semibold uppercase tracking-[0.5em] text-foreground sm:text-lg"
                  />
                  <span className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-text-faint">
                    <span className="animate-bounce text-sm leading-none text-foreground/80">▾</span>
                    scroll to trace
                  </span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Trace: the flood, the face, the scan ── */}
        {showTrace && (
          <IntroStage
            face={face}
            hands={[
              { el: leftHandRef, text: LEFT_HAND, side: -1 },
              { el: rightHandRef, text: RIGHT_HAND, side: 1 },
            ]}
            counterRef={counterRef}
            barRef={barRef}
            onEvent={onEvent}
          />
        )}
        <AnimatePresence>
          {showTrace && phase !== "done" && (
            <ScanReadout key="readout" lines={lines} counterRef={counterRef} barRef={barRef} />
          )}
        </AnimatePresence>

        {/* Theme toggle: the site nav is hidden while the intro is up, so
            expose light/dark switching directly on the overlay. */}
        {phase !== "done" && (
          <ThemeToggle className="absolute top-6 right-6 z-40 text-text-faint hover:text-accent sm:right-10" />
        )}

        {/* Skip */}
        {phase !== "done" && (
          <button
            onClick={skip}
            className="absolute bottom-8 right-6 z-40 cursor-pointer font-mono text-xs uppercase tracking-widest text-text-faint transition-colors hover:text-accent sm:right-10"
          >
            Skip ↓
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
