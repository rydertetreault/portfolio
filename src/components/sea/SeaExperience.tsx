"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import SeaCanvas, { seaStore } from "./SeaCanvas";
import HudText from "./HudText";
import { STOPS, TRACK_VH } from "./timeline";
import { GEO_ORIGIN, LANDMARKS, SWELL } from "./world";
import { stopStartU } from "./SeaEngine";

/* ─────────────────────────────────────────────────────────────
 *  Scroll progress, in viewport heights, *as the camera sees it*
 *  (the engine's eased value), so cards land when the camera does.
 * ───────────────────────────────────────────────────────────── */
function useSeaU(): MotionValue<number> {
  const u = useMotionValue(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const e = seaStore.get();
      u.set(e ? e.telemetry.u : window.scrollY / Math.max(1, window.innerHeight));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [u]);
  return u;
}

/** A window of the journey: fades in over [from, from+fade], out over [to-fade, to]. */
function Stop({
  u,
  from,
  to,
  fade = 0.14,
  className = "",
  quiet,
  children,
}: {
  u: MotionValue<number>;
  from: number;
  to: number;
  fade?: number;
  className?: string;
  /** Dim the field behind this panel (0..1). */
  quiet?: number;
  children: (active: boolean) => ReactNode;
}) {
  const range = [from, from + fade, to - fade, to];
  const opacity = useTransform(u, range, [0, 1, 1, 0]);
  const y = useTransform(u, range, [28, 0, 0, -28]);
  const pointerEvents = useTransform(opacity, (o) => (o > 0.5 ? "auto" : "none"));
  const [active, setActive] = useState(() => 0 > from && 0 < to);
  useMotionValueEvent(u, "change", (v) => setActive(v > from + fade * 0.4 && v < to - fade * 0.4));
  return (
    <motion.section
      style={{ opacity, y, pointerEvents }}
      data-sea-quiet={quiet}
      className={`fixed z-10 ${className}`}
    >
      {children(active)}
    </motion.section>
  );
}

/* ───────────── HUD chrome ───────────── */

function pad(n: number, w: number) {
  return String(Math.round(Math.abs(n))).padStart(w, "0");
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const v = pos[0] === "t" ? "top-4 border-t" : "bottom-4 border-b";
  const h = pos[1] === "l" ? "left-4 border-l" : "right-4 border-r";
  return <span className={`absolute h-5 w-5 border-text-faint/60 ${v} ${h}`} />;
}

function Hud({ u }: { u: MotionValue<number> }) {
  const lat = useRef<HTMLSpanElement>(null);
  const lon = useRef<HTMLSpanElement>(null);
  const alt = useRef<HTMLSpanElement>(null);
  const hdg = useRef<HTMLSpanElement>(null);
  const pit = useRef<HTMLSpanElement>(null);
  const spd = useRef<HTMLSpanElement>(null);
  const dist = useRef<HTMLSpanElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [stop, setStop] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const e = seaStore.get();
      if (!e) return;
      const t = e.telemetry;
      const la = GEO_ORIGIN.lat - t.pos[2] * GEO_ORIGIN.degPerUnit;
      const lo = GEO_ORIGIN.lon + t.pos[0] * GEO_ORIGIN.degPerUnit;
      if (lat.current) lat.current.textContent = `${Math.abs(la).toFixed(4)}° ${la >= 0 ? "N" : "S"}`;
      if (lon.current) lon.current.textContent = `${Math.abs(lo).toFixed(4)}° ${lo >= 0 ? "E" : "W"}`;
      if (alt.current) alt.current.textContent = `${(t.pos[1] * 120).toFixed(0).padStart(5, "0")} M`;
      if (hdg.current) hdg.current.textContent = `${pad(t.yaw, 3)}°`;
      if (pit.current) pit.current.textContent = `${t.pitch < 0 ? "-" : "+"}${pad(t.pitch, 2)}°`;
      if (spd.current) spd.current.textContent = `${pad(t.speed * 9, 3)} KN`;
      if (dist.current) {
        const dx = t.pos[0] - SWELL.center[0];
        const dz = t.pos[2] - SWELL.center[1];
        dist.current.textContent = `${(Math.sqrt(dx * dx + dz * dz) * 0.42).toFixed(2)} NM`;
      }
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, t.u / (TRACK_VH - 1))})`;
      if (t.stop !== last) {
        last = t.stop;
        setStop(t.stop);
      }
    };
    raf = requestAnimationFrame(tick);
    const clockTimer = window.setInterval(() => {
      if (clock.current) clock.current.textContent = new Date().toISOString().slice(11, 19) + " UTC";
    }, 500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(clockTimer);
    };
  }, []);

  // Crosshair shows while travelling between stops.
  const cross = useTransform(u, [0.2, 0.4, 1.3, 1.5, 2.6, 2.8, 3.7, 3.9, 4.95, 5.15, 6.0, 6.2], [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 font-mono text-[10px] uppercase tracking-[0.18em] text-text-faint">
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />

      <div className="absolute left-8 top-7 space-y-1">
        <div className="text-foreground/80">Ryder Tetreault</div>
        <div>Sea.sys // prototype</div>
      </div>

      <div className="absolute right-8 top-7 space-y-1 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          <span>Live</span>
        </div>
        <span ref={clock}>--:--:-- UTC</span>
      </div>

      <dl className="absolute bottom-7 left-8 hidden grid-cols-[auto_auto] gap-x-4 gap-y-1 sm:grid">
        <dt>Lat</dt>
        <dd ref={lat} className="text-foreground/80" />
        <dt>Lon</dt>
        <dd ref={lon} className="text-foreground/80" />
        <dt>Alt</dt>
        <dd ref={alt} className="text-foreground/80" />
        <dt>Hdg</dt>
        <dd ref={hdg} className="text-foreground/80" />
        <dt>Pitch</dt>
        <dd ref={pit} className="text-foreground/80" />
        <dt>Spd</dt>
        <dd ref={spd} className="text-foreground/80" />
      </dl>

      <nav className="pointer-events-auto absolute bottom-7 left-8 right-8 space-y-1.5 text-right sm:left-auto sm:w-52">
        {STOPS.map((s) => (
          <button
            key={s.index}
            onClick={() => window.scrollTo({ top: stopStartU(s.index) * window.innerHeight + 2, behavior: "smooth" })}
            className={`w-full text-right uppercase tracking-[0.18em] transition-colors ${stop === s.index ? "block" : "hidden sm:block"} ${
              stop === s.index ? "text-accent" : "hover:text-foreground"
            }`}
          >
            {stop === s.index ? "▸ " : ""}
            {s.code} / {s.name}
          </button>
        ))}
        <div className="mt-3 h-px w-full bg-text-faint/30">
          <div ref={bar} className="h-px w-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
        </div>
      </nav>

      <motion.div style={{ opacity: cross }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-16 w-28">
          <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-foreground/50" />
          <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-foreground/50" />
          <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-foreground/50" />
          <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-foreground/50" />
          <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 bg-foreground/70" />
          <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-y-1/2 bg-foreground/70" />
        </div>
        <div className="mt-2 text-center text-[#d3b75b]">
          Tgt <span ref={dist} />
        </div>
      </motion.div>
    </div>
  );
}

/* ───────────── map overlay (the bigger picture) ───────────── */

function MapOverlay({ u }: { u: MotionValue<number> }) {
  const opacity = useTransform(u, [5.85, 6.15], [0, 1]);
  const marks = useRef<(HTMLDivElement | null)[]>([]);
  const path = useRef<SVGPolylineElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const e = seaStore.get();
      if (!e || u.get() < 5.6) return;
      LANDMARKS.forEach((m, i) => {
        const el = marks.current[i];
        const p = e.project(m.pos);
        if (!el) return;
        if (!p) {
          el.style.visibility = "hidden";
          return;
        }
        el.style.visibility = "visible";
        el.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
      });
      if (path.current) {
        const pts: string[] = [];
        for (let k = 0; k <= 60; k++) {
          const c = e.cameraAt((k / 60) * 4.9);
          const p = e.project([c.pos[0], 0, c.pos[2]]);
          if (p) pts.push(`${p[0].toFixed(1)},${p[1].toFixed(1)}`);
        }
        path.current.setAttribute("points", pts.join(" "));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [u]);

  return (
    <motion.div style={{ opacity }} className="pointer-events-none fixed inset-0 z-10" aria-hidden>
      <svg className="absolute inset-0 h-full w-full">
        <polyline ref={path} fill="none" stroke="var(--accent)" strokeOpacity={0.55} strokeWidth={1} strokeDasharray="2 6" />
      </svg>
      {LANDMARKS.map((m, i) => (
        <div
          key={m.id}
          ref={(el) => {
            marks.current[i] = el;
          }}
          className="absolute left-0 top-0"
        >
          <div className="-translate-x-1/2 -translate-y-1/2">
            <span
              className="block h-2.5 w-2.5 rotate-45 border"
              style={{ borderColor: m.accent === "lime" ? "var(--accent)" : "#d3b75b" }}
            />
          </div>
          <div
            className="ml-3 -mt-1.5 whitespace-nowrap bg-background/70 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.2em]"
            style={{ color: m.accent === "lime" ? "var(--accent)" : "#d3b75b" }}
          >
            {m.label}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/* ───────────── content ───────────── */

function Label({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">{children}</div>;
}

function LocalTime() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () =>
      setT(new Date().toLocaleTimeString("en-US", { hour12: false, timeZone: "America/Chicago" }) + " CT");
    f();
    const id = window.setInterval(f, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <>{t || "--:--:--"}</>;
}

export default function SeaExperience() {
  const u = useSeaU();

  return (
    <main className="relative">
      <SeaCanvas />
      {/* The scroll track: its height *is* the journey. */}
      <div style={{ height: `${TRACK_VH * 100}vh` }} aria-hidden />

      <Hud u={u} />
      <MapOverlay u={u} />

      {/* 00 / ORIGIN */}
      <Stop u={u} from={-0.3} to={0.42} quiet={0.85} className="left-6 right-6 top-1/2 -translate-y-1/2 sm:left-[8vw] sm:right-auto sm:max-w-xl">
        {(a) => (
          <div className="space-y-5">
            <Label>
              <HudText text="00 / Origin" active={a} />
            </Label>
            <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
              <HudText text="Ryder Tetreault" active={a} delay={120} />
            </h1>
            <p className="font-medium text-accent">
              <HudText text="Software Engineer · AI · Cyber Defense" active={a} delay={350} />
            </p>
            <p className="max-w-md text-sm leading-relaxed text-text-faint">
              AI-native software, security-minded engineering. I build products where AI does real work, grounded in
              cybersecurity and infrastructure defense.
            </p>
            <p className="pt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">
              <span className="animate-pulse">[ scroll to deploy ↓ ]</span>
            </p>
          </div>
        )}
      </Stop>

      {/* Insertion log (during the dive) */}
      <Stop u={u} from={0.32} to={1.45} fade={0.1} className="left-6 right-6 top-[30vh] sm:left-[8vw] sm:right-auto">
        {(a) => (
          <div className="space-y-1.5 font-mono text-xs uppercase tracking-[0.2em] text-foreground/80">
            <div>
              <HudText text="> uplink established" active={a} />
            </div>
            <div>
              <HudText text="> target   rydertetreault.dev" active={a} delay={300} />
            </div>
            <div className="text-[#d3b75b]">
              <HudText text="> descending to surface ..." active={a} delay={650} />
            </div>
          </div>
        )}
      </Stop>

      {/* 01 / THE SURFACE */}
      <Stop u={u} from={1.42} to={2.7} quiet={0.9} className="left-6 right-6 top-[16vh] sm:left-[8vw] sm:right-auto sm:top-[22vh] sm:max-w-lg">
        {(a) => (
          <div className="space-y-6">
            <div className="space-y-1.5 font-mono text-xs uppercase tracking-[0.25em]">
              <div className="text-accent">
                <HudText text="Mission 01" active={a} />
              </div>
              <div className="text-2xl normal-case tracking-tight text-foreground sm:text-3xl">
                <HudText text="“The Surface”" active={a} delay={200} />
              </div>
              <div className="text-text-faint">
                Day 1 — <LocalTime />
              </div>
              <div className="text-text-faint">
                <HudText text="Auburn, Alabama" active={a} delay={600} />
              </div>
            </div>
            <p className="text-base leading-relaxed text-foreground/85">
              I build products where AI does real work. Auburn CS grad with a Cyber Defense certificate, now
              designing and engineering the Praxis AI platform. Language models, semantic search, AI-driven
              automation, and the security thinking to ship them safely.
            </p>
          </div>
        )}
      </Stop>

      {/* Transit */}
      <Stop u={u} from={2.7} to={3.85} fade={0.1} className="left-1/2 top-[22vh] -translate-x-1/2">
        {(a) => (
          <div className="text-center font-mono text-xs uppercase tracking-[0.3em] text-foreground/80">
            <HudText text="En route // The Swell" active={a} />
          </div>
        )}
      </Stop>

      {/* 02 / THE SWELL */}
      <Stop u={u} from={3.85} to={5.0} quiet={0.9} className="left-6 right-6 top-[16vh] text-right sm:left-auto sm:right-[8vw] sm:top-[20vh] sm:max-w-lg">
        {(a) => (
          <div className="space-y-6">
            <div className="space-y-1.5 font-mono text-xs uppercase tracking-[0.25em]">
              <div className="text-[#d3b75b]">
                <HudText text="Mission 02" active={a} />
              </div>
              <div className="text-2xl normal-case tracking-tight text-foreground sm:text-3xl">
                <HudText text="“The Swell”" active={a} delay={200} />
              </div>
              <div className="text-text-faint">
                <HudText text="Praxis AI — UI/UX Engineer" active={a} delay={450} />
              </div>
              <div className="text-text-faint">
                <HudText text="Oct 2026 — Present" active={a} delay={650} />
              </div>
            </div>
            <p className="text-base leading-relaxed text-foreground/85">
              Designing and building the Praxis AI platform end to end, from user flows to production front-end,
              including the new interface for Pria, the Digital Twin app. Before that: security audits and
              red-teaming PraxisShield™ as an engineering intern, and the redesigned praxis-ai.com.
            </p>
            <a
              href="https://praxis-ai.com"
              target="_blank"
              rel="noreferrer"
              className="inline-block font-mono text-[11px] uppercase tracking-[0.3em] text-accent hover:text-accent-hover"
            >
              [ open praxis-ai.com ↗ ]
            </a>
          </div>
        )}
      </Stop>

      {/* Pull-up */}
      <Stop u={u} from={5.0} to={6.0} fade={0.1} className="left-1/2 top-[22vh] -translate-x-1/2">
        {(a) => (
          <div className="text-center font-mono text-xs uppercase tracking-[0.3em] text-foreground/80">
            <HudText text="Ascending // Charting the sea" active={a} />
          </div>
        )}
      </Stop>

      {/* 03 / THE MAP */}
      <Stop u={u} from={6.0} to={7.6} quiet={0.75} className="left-6 right-6 top-[12vh] text-center">
        {(a) => (
          <div className="space-y-4">
            <Label>
              <HudText text="03 / The Map" active={a} />
            </Label>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <HudText text="Every stop is a wave in the same sea." active={a} delay={200} />
            </h2>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 pt-2 font-mono text-[11px] uppercase tracking-[0.3em]">
              <a href="https://github.com/rydertetreault" target="_blank" rel="noreferrer" className="text-text-faint hover:text-accent">
                GitHub
              </a>
              <a href="https://www.linkedin.com/in/ryder-tetreault" target="_blank" rel="noreferrer" className="text-text-faint hover:text-accent">
                LinkedIn
              </a>
              <a href="mailto:rydertetreault@gmail.com" className="text-text-faint hover:text-accent">
                Email
              </a>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="uppercase tracking-[0.3em] text-text-faint hover:text-accent">
                ↑ Origin
              </button>
            </div>
          </div>
        )}
      </Stop>
    </main>
  );
}
