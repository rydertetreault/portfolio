"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { Sparkles, Code2, ShieldCheck, ChevronDown, Search } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Cinematic pinned scroll-story (Omega ClearSpace / DappaSol
   style): one 600vh scroll track pins the viewport; scroll
   position scrubs a continuous "camera" timeline. Each chapter
   is a full-viewport scene the camera pushes through — scale +
   depth + parallax — with oversized typography. A particle
   field reacts to scroll for depth. Ends by releasing into
   the main site.
   ═══════════════════════════════════════════════════════════ */

/* Chapter windows on the 0→1 scrub.
   0 → 0.10 is a HOLD: the hero stays fully visible while the
   user starts scrolling, then the camera pushes through it. */
const C1: [number, number] = [0.2, 0.42]; // AI
const C2: [number, number] = [0.44, 0.64]; // Engineering
const C3: [number, number] = [0.66, 0.9]; // Cyber

const CHAPTERS = [
  { n: "01", title: "AI Integration", icon: Sparkles },
  { n: "02", title: "Engineering", icon: Code2 },
  { n: "03", title: "Cyber Defense", icon: ShieldCheck },
] as const;

/* ─── Scroll-reactive particle field (depth layer) ─── */

function ParticleField({ p }: { p: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const velRef = useRef(0);
  const lastP = useRef(0);

  useMotionValueEvent(p, "change", (v) => {
    velRef.current += (v - lastP.current) * 40;
    lastP.current = v;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0,
      h = 0,
      raf = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    /* particles distributed in pseudo-3D depth */
    const N = 140;
    const parts = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.2 + Math.random() * 0.8, // depth: far → near
      tw: Math.random() * Math.PI * 2,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const vel = velRef.current;
      velRef.current *= 0.92; // decay

      const accent =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent")
          .trim() || "#34d399";

      for (const pt of parts) {
        /* scroll velocity streams particles vertically, near ones faster */
        pt.y -= vel * 0.06 * pt.z;
        if (pt.y > 1.05) pt.y -= 1.1;
        if (pt.y < -0.05) pt.y += 1.1;
        pt.tw += 0.02;

        const r = pt.z * 1.6;
        const alpha = (0.12 + 0.5 * pt.z) * (0.7 + 0.3 * Math.sin(pt.tw));
        /* streak when moving fast */
        const streak = Math.min(Math.abs(vel) * 60 * pt.z, 40);

        ctx.beginPath();
        if (streak > 2) {
          ctx.strokeStyle = accent;
          ctx.globalAlpha = alpha * 0.8;
          ctx.lineWidth = r;
          ctx.moveTo(pt.x * w, pt.y * h);
          ctx.lineTo(pt.x * w, pt.y * h + streak * Math.sign(vel));
          ctx.stroke();
        } else {
          ctx.fillStyle = accent;
          ctx.globalAlpha = alpha;
          ctx.arc(pt.x * w, pt.y * h, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full opacity-60"
      aria-hidden
    />
  );
}

/* ─── Scrub helpers ─── */

/** Camera fly-through: scene approaches (scale up from small),
 *  holds, then passes the camera (scales past 1, fades). */
function useScene(p: MotionValue<number>, [s, e]: [number, number]) {
  const opacity = useTransform(
    p,
    [s - 0.04, s + 0.02, e - 0.02, e + 0.03],
    [0, 1, 1, 0],
  );
  const scale = useTransform(
    p,
    [s - 0.05, s + 0.03, e - 0.02, e + 0.04],
    [0.82, 1, 1.02, 1.18],
  );
  const y = useTransform(p, [s - 0.05, s + 0.03], [60, 0]);
  return { opacity, scale, y };
}

/** In-scene element reveal, scrubbed. */
function Item({
  p,
  at,
  from = 22,
  className = "",
  children,
}: {
  p: MotionValue<number>;
  at: number;
  from?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const opacity = useTransform(p, [at, at + 0.025], [0, 1]);
  const y = useTransform(p, [at, at + 0.025], [from, 0]);
  return (
    <motion.div style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Chapter scaffold: giant numeral + title + visual ─── */

function Chapter({
  p,
  range,
  chapter,
  lead,
  children,
}: {
  p: MotionValue<number>;
  range: [number, number];
  chapter: (typeof CHAPTERS)[number];
  lead: string;
  children: React.ReactNode;
}) {
  const { opacity, scale, y } = useScene(p, range);
  const [s] = range;
  /* giant numeral drifts slower than content = parallax depth */
  const numY = useTransform(p, range, ["10%", "-14%"]);
  const Icon = chapter.icon;

  return (
    <motion.div
      style={{ opacity, scale, y }}
      className="absolute inset-0 flex items-center"
    >
      {/* backdrop numeral */}
      <motion.span
        style={{ y: numY }}
        className="pointer-events-none absolute right-[2%] top-1/2 -translate-y-1/2 select-none font-mono text-[38vw] lg:text-[26vw] font-bold leading-none text-accent opacity-[0.06]"
        aria-hidden
      >
        {chapter.n}
      </motion.span>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-6 px-6 sm:gap-10 sm:px-10 lg:grid-cols-2 lg:gap-20">
        {/* Typography column */}
        <div>
          <Item p={p} at={s} className="mb-3 flex items-center gap-3 sm:mb-4">
            <span className="font-mono text-sm text-accent">{chapter.n}</span>
            <span className="h-px w-10 bg-accent" />
            <Icon size={16} className="text-accent" />
          </Item>
          <Item p={p} at={s + 0.015}>
            <h2 className="text-3xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
              {chapter.title}
            </h2>
          </Item>
          <Item p={p} at={s + 0.035} className="mt-4 max-w-md sm:mt-6">
            <p className="text-sm sm:text-lg text-text-muted leading-relaxed">
              {lead}
            </p>
          </Item>
        </div>

        {/* Visual column */}
        <div className="relative">{children}</div>
      </div>
    </motion.div>
  );
}

/* ─── Chapter visuals ─── */

function AiVisual({ p }: { p: MotionValue<number> }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <Item p={p} at={0.26} className="self-end max-w-[85%]">
        <div className="rounded-2xl rounded-br-md border border-border-theme bg-accent-subtle px-4 py-2.5 text-foreground">
          Find every episode about impermanence
        </div>
      </Item>
      <Item p={p} at={0.29} className="flex items-center gap-2 text-xs text-text-faint">
        <Search size={13} className="text-accent" />
        <span>Embedding query → 12,400 transcript segments…</span>
      </Item>
      {[
        ["Ep. 214 — Letting Go of the Shore", "0.94", 0.32],
        ["Ep. 178 — The River Doesn't Wait", "0.91", 0.345],
      ].map(([title, score, at]) => (
        <Item key={title as string} p={p} at={at as number}>
          <div className="rounded-xl border border-border-theme bg-surface-alt/80 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{title}</p>
              <span className="font-mono text-xs text-accent">{score}</span>
            </div>
          </div>
        </Item>
      ))}
      <Item p={p} at={0.37} className="flex flex-wrap gap-2">
        {["RAG", "Vector search", "Whisper", "Auto-tagging"].map((t) => (
          <span
            key={t}
            className="rounded-full border border-border-theme bg-accent-subtle px-3 py-1 text-xs text-accent"
          >
            {t}
          </span>
        ))}
      </Item>
    </div>
  );
}

function CodeVisual({ p }: { p: MotionValue<number> }) {
  const lines: [number, React.ReactNode][] = [
    [0.46, <><span className="text-fuchsia-400">const</span> embedding = <span className="text-fuchsia-400">await</span> <span className="text-sky-400">embed</span>(query);</>],
    [0.49, <><span className="text-fuchsia-400">const</span> results = <span className="text-fuchsia-400">await</span> <span className="text-sky-400">vectorSearch</span>(embedding, {"{"} topK: <span className="text-amber-400">8</span> {"}"});</>],
    [0.52, <><span className="text-fuchsia-400">return</span> NextResponse.<span className="text-sky-400">json</span>({"{ results }"});</>],
  ];
  return (
    <div>
      <div className="rounded-xl border border-border-theme bg-surface-alt/80 p-5 font-mono text-[13px] leading-8 text-text-muted backdrop-blur">
        {lines.map(([at, node], i) => (
          <Item key={i} p={p} at={at} from={12} className="whitespace-pre-wrap">
            <span className="mr-4 inline-block w-4 select-none text-right text-text-faint">
              {i + 1}
            </span>
            {node}
          </Item>
        ))}
      </div>
      <Item p={p} at={0.56} className="mt-3 flex items-center gap-2 text-xs text-text-faint">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span>
          Build passed · Deployed · <span className="text-accent">rydertetreault.dev</span>
        </span>
      </Item>
    </div>
  );
}

function CyberVisual({ p }: { p: MotionValue<number> }) {
  const rows: [number, string, string][] = [
    [0.71, "$", "./audit --target api.internal"],
    [0.735, "scan", "TLS 1.3 enforced ✓ · CSP, HSTS ✓"],
    [0.76, "warn", "rate limiting missing on /auth"],
    [0.785, "fix", "middleware applied — 429 after 20 req/min"],
    [0.81, "$", "status: hardened ✓"],
  ];
  return (
    <div className="rounded-xl border border-border-theme bg-neutral-950/90 p-5 font-mono text-[13px] leading-8">
      {rows.map(([at, tag, text], i) => (
        <Item key={i} p={p} at={at} from={10} className="flex gap-3">
          <span
            className={
              tag === "$"
                ? "text-accent"
                : tag === "warn"
                  ? "text-amber-400"
                  : tag === "fix"
                    ? "text-sky-400"
                    : "text-neutral-500"
            }
          >
            {tag === "$" ? "$" : `[${tag}]`}
          </span>
          <span className={tag === "$" ? "text-neutral-100" : "text-neutral-400"}>
            {text}
          </span>
        </Item>
      ))}
    </div>
  );
}

/* ─── Main ─── */

export default function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [chapter, setChapter] = useState(-1);

  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  /* Hero: HOLDS fully visible until 0.10, then the camera pushes past it */
  const heroOpacity = useTransform(p, [0.1, 0.17], [1, 0]);
  const heroScale = useTransform(p, [0, 0.1, 0.19], [1, 1, 1.35]);
  const heroBlurT = useTransform(p, [0.1, 0.18], [0, 10]);
  const heroFilter = useTransform(heroBlurT, (b) => `blur(${b}px)`);

  /* Outro */
  const outroOpacity = useTransform(p, [0.91, 0.97], [0, 1]);
  const hintOpacity = useTransform(p, [0.06, 0.11], [1, 0]);
  const progressX = useTransform(p, [0, 1], [0, 1]);

  useMotionValueEvent(p, "change", (v) => {
    const idx = v < C1[0] ? -1 : v < C1[1] + 0.01 ? 0 : v < C2[1] + 0.01 ? 1 : 2;
    setChapter((prev) => (prev === idx ? prev : idx));
  });

  const skip = () => {
    const el = ref.current;
    if (!el) return;
    window.scrollTo({
      top: el.offsetTop + el.offsetHeight,
      behavior: "smooth",
    });
  };

  if (prefersReducedMotion) return null;

  return (
    <div ref={ref} className="relative h-[600vh]">
      {/* h-svh: stable pin height on mobile (browser chrome show/hide) */}
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* depth: particle field */}
        <ParticleField p={p} />

        {/* ── Hero (camera start) ── */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, filter: heroFilter }}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        >
          <h1 className="max-w-3xl text-4xl sm:text-7xl font-semibold tracking-tight leading-[1.05]">
            Software that does <span className="text-accent">real work.</span>
          </h1>
          <p className="mt-6 max-w-md text-base sm:text-lg text-text-muted leading-relaxed">
            AI-native products, grounded in security.
          </p>
        </motion.div>

        {/* ── Chapters (camera flies through each) ── */}
        <Chapter
          p={p}
          range={C1}
          chapter={CHAPTERS[0]}
          lead="Language models, embeddings, and RAG wired into real products — archives that transcribe and tag themselves, search that understands meaning."
        >
          <AiVisual p={p} />
        </Chapter>

        <Chapter
          p={p}
          range={C2}
          chapter={CHAPTERS[1]}
          lead="Full-stack TypeScript, from API route to production deploy. Fast to ship, built to last."
        >
          <CodeVisual p={p} />
        </Chapter>

        <Chapter
          p={p}
          range={C3}
          chapter={CHAPTERS[2]}
          lead="A cyber defense foundation shapes every system I touch — audit, harden, verify."
        >
          <CyberVisual p={p} />
        </Chapter>

        {/* ── Progress bar ── */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border-theme/40">
          <motion.div
            style={{ scaleX: progressX }}
            className="h-full origin-left bg-accent"
          />
        </div>

        {/* ── Chapter markers ── */}
        <div className="absolute bottom-6 left-6 sm:left-10 flex items-center gap-4 font-mono text-xs">
          {CHAPTERS.map((c, i) => (
            <span
              key={c.n}
              className={`transition-colors duration-500 ${
                chapter === i ? "text-accent" : "text-text-faint"
              }`}
            >
              {c.n}
            </span>
          ))}
        </div>

        {/* ── Scroll hint / outro ── */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-text-faint"
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown size={16} className="animate-bounce" />
        </motion.div>

        <motion.div
          style={{ opacity: outroOpacity }}
          className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-text-muted"
        >
          <span className="text-xs uppercase tracking-widest">The full portfolio</span>
          <ChevronDown size={16} className="animate-bounce text-accent" />
        </motion.div>

        <button
          onClick={skip}
          className="absolute bottom-8 right-6 sm:right-10 text-xs text-text-faint transition-colors hover:text-accent"
        >
          Skip intro ↓
        </button>
      </div>
    </div>
  );
}
