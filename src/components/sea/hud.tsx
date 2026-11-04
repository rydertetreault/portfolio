"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import MotionToggle from "@/components/MotionToggle";
import { seaStore } from "./SeaCanvas";
import HudText from "./HudText";
import { BEATS, STOPS, TRACK_VH, WINDOWS, stopArriveU, type StopId } from "./journey";
import { BEACONS, GEO_ORIGIN } from "./world";
import type { Vec3 } from "./timeline";

const WARM = "#d3b75b";

/* ───────────── hooks ───────────── */

/**
 * Scroll progress, in viewport heights, *as the camera sees it* (the engine's
 * eased value), so cards land when the camera does.
 */
export function useSeaU(): MotionValue<number> {
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

/** Current stop index (from the engine's last rest). */
export function useStop(): number {
  const [stop, setStop] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const e = seaStore.get();
      if (e && e.telemetry.stop !== stop) setStop(e.telemetry.stop);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stop]);
  return stop;
}

/** Scroll to journey position `u` (vh). `smooth` flies the camera there; otherwise it cuts. */
export function jumpTo(u: number, smooth = true): void {
  window.scrollTo({ top: u * window.innerHeight, behavior: smooth ? "smooth" : "instant" });
  if (!smooth) {
    const e = seaStore.get();
    e?.setScroll(window.scrollY);
    e?.snap();
  }
}

/** A stop's first beat, landing just inside its rest so the HUD settles there. */
export function jumpToStop(stop: StopId, smooth = true): void {
  jumpTo(stopArriveU(stop) + 0.06, smooth);
}

const pad = (n: number, w: number) => String(Math.round(Math.abs(n))).padStart(w, "0");

/* ───────────── chrome: corners, telemetry, nav ───────────── */

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const v = pos[0] === "t" ? "top-4 border-t" : "bottom-4 border-b";
  const h = pos[1] === "l" ? "left-4 border-l" : "right-4 border-r";
  return <span className={`absolute h-5 w-5 border-text-faint/60 ${v} ${h}`} />;
}

export function Hud({ u }: { u: MotionValue<number> }) {
  const lat = useRef<HTMLElement>(null);
  const lon = useRef<HTMLElement>(null);
  const altK = useRef<HTMLElement>(null);
  const alt = useRef<HTMLElement>(null);
  const hdg = useRef<HTMLElement>(null);
  const pit = useRef<HTMLElement>(null);
  const spd = useRef<HTMLElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const stop = useStop();

  useEffect(() => {
    let raf = 0;
    const set = (r: React.RefObject<HTMLElement | null>, s: string) => {
      if (r.current && r.current.textContent !== s) r.current.textContent = s;
    };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const e = seaStore.get();
      if (!e) return;
      const t = e.telemetry;
      const la = GEO_ORIGIN.lat - t.pos[2] * GEO_ORIGIN.degPerUnit;
      const lo = GEO_ORIGIN.lon + t.pos[0] * GEO_ORIGIN.degPerUnit;
      set(lat, `${Math.abs(la).toFixed(4)}° ${la >= 0 ? "N" : "S"}`);
      set(lon, `${Math.abs(lo).toFixed(4)}° ${lo >= 0 ? "E" : "W"}`);
      set(altK, t.pos[1] < 0 ? "Depth" : "Alt");
      set(alt, `${Math.abs(t.pos[1] * 120).toFixed(0).padStart(5, "0")} M`);
      set(hdg, `${pad(t.yaw, 3)}°`);
      set(pit, `${t.pitch < 0 ? "-" : "+"}${pad(t.pitch, 2)}°`);
      set(spd, `${pad(t.speed * 9, 3)} KN`);
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, t.u / (TRACK_VH - 1))})`;
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

  // Crosshair shows while travelling between beats.
  const cross = useTransform(u, (v) => {
    for (const w of WINDOWS) {
      if (w.beat === 0) continue;
      const a = w.travelFrom + 0.12;
      const b = w.arrive - 0.06;
      if (v > a && v < b) return Math.min(1, (v - a) / 0.15, (b - v) / 0.15);
    }
    return 0;
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-20 font-mono text-[10px] uppercase tracking-[0.18em] text-text-faint">
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />

      <button
        onClick={() => jumpTo(0)}
        className="pointer-events-auto absolute left-8 top-7 space-y-1 text-left uppercase tracking-[0.18em]"
        aria-label="Back to the start"
      >
        <span className="block text-foreground/80">Ryder Tetreault</span>
        <span className="block">Sea.sys // v1</span>
      </button>

      <div className="pointer-events-auto absolute right-8 top-7 flex items-start gap-5 text-right">
        <nav className="hidden items-center gap-5 sm:flex" aria-label="Pages">
          <Link href="/projects" className="hover:text-accent">
            Projects
          </Link>
          <Link href="/resume" className="hover:text-accent">
            Resume
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <MotionToggle className="text-text-faint hover:text-accent" />
          <ThemeToggle className="text-text-faint hover:text-accent" />
        </div>
        <div className="hidden space-y-1 md:block">
          <div className="flex items-center justify-end gap-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            <span>Live</span>
          </div>
          <span ref={clock}>--:--:-- UTC</span>
        </div>
      </div>

      <dl className="absolute bottom-7 left-8 hidden grid-cols-[auto_auto] gap-x-4 gap-y-1 sm:grid">
        <dt>Lat</dt>
        <dd ref={lat} className="text-foreground/80" />
        <dt>Lon</dt>
        <dd ref={lon} className="text-foreground/80" />
        <dt ref={altK}>Alt</dt>
        <dd ref={alt} className="text-foreground/80" />
        <dt>Hdg</dt>
        <dd ref={hdg} className="text-foreground/80" />
        <dt>Pitch</dt>
        <dd ref={pit} className="text-foreground/80" />
        <dt>Spd</dt>
        <dd ref={spd} className="text-foreground/80" />
      </dl>

      <nav
        aria-label="Journey"
        className="pointer-events-auto absolute bottom-7 left-8 right-8 space-y-1 text-right sm:left-auto sm:w-56"
      >
        {STOPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => jumpToStop(s.id)}
            aria-current={stop === i ? "step" : undefined}
            className={`w-full text-right uppercase tracking-[0.18em] transition-colors ${
              stop === i ? "block text-accent" : "hidden hover:text-foreground sm:block"
            }`}
          >
            {stop === i ? "▸ " : ""}
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
      </motion.div>
    </div>
  );
}

/* ───────────── transit labels ───────────── */

function TransitLabel({ u, from, to, text }: { u: MotionValue<number>; from: number; to: number; text: string }) {
  const f = Math.min(0.1, (to - from) / 3);
  const opacity = useTransform(u, [from, from + f, to - f, to], [0, 1, 1, 0]);
  const [active, setActive] = useState(false);
  useMotionValueEvent(u, "change", (v) => setActive(v > from && v < to));
  return (
    <motion.div
      style={{ opacity }}
      aria-hidden
      className="pointer-events-none fixed left-6 right-6 top-[24vh] z-10 text-center font-mono text-xs uppercase tracking-[0.3em] text-foreground/80"
    >
      <HudText text={text} active={active} />
    </motion.div>
  );
}

export function TransitLabels({ u }: { u: MotionValue<number> }) {
  return (
    <>
      {BEATS.map((b, i) =>
        i > 1 && b.label ? (
          <TransitLabel
            key={b.id}
            u={u}
            from={WINDOWS[i].travelFrom + 0.1}
            to={WINDOWS[i].arrive - 0.04}
            text={b.label}
          />
        ) : null,
      )}
    </>
  );
}

/* ───────────── waypoint marker (CoD objective) ───────────── */

/** Beat whose target the marker should point at: the one being reached, or the next one. */
function targetBeat(u: number): number {
  for (let i = 0; i < BEATS.length; i++) {
    if (!BEATS[i].target) continue;
    if (u < WINDOWS[i].leave - 0.05) return i;
  }
  return -1;
}

export function Waypoint({ names }: { names: Record<string, string> }) {
  const el = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const dist = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let lastBeat = -2;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const e = seaStore.get();
      const box = el.current;
      if (!e || !box) return;
      const t = e.telemetry;
      const map = BEATS[t.beat]?.stop === "map" && t.resting;
      const bi = t.u < 0.35 || map ? -1 : targetBeat(t.u);
      if (bi < 0) {
        box.style.opacity = "0";
        return;
      }
      const beat = BEATS[bi];
      const p = beat.target as Vec3;
      if (bi !== lastBeat && label.current) {
        lastBeat = bi;
        label.current.textContent = `${beat.mark ?? ""} ${names[beat.id] ?? ""}`.trim();
      }
      const c = e.cameraPos;
      const d = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
      if (dist.current) dist.current.textContent = `${Math.round(d * 120)} M`;

      const W = window.innerWidth;
      const H = window.innerHeight;
      const m = 56;
      const s = e.project(p);
      let x: number, y: number, ang: number | null = null;
      if (s && s[0] > m && s[0] < W - m && s[1] > m && s[1] < H - m) {
        x = s[0];
        y = s[1];
      } else {
        // Off-screen: pin to the edge, pointing the way.
        const dir = e.direction(p);
        let dx = dir.ahead ? dir.x : dir.x === 0 ? 1 : dir.x * 1e3;
        let dy = dir.ahead ? -dir.y : Math.abs(dir.y) * 1e3;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        const k = Math.min((W / 2 - m) / Math.max(1e-6, Math.abs(dx)), (H / 2 - m) / Math.max(1e-6, Math.abs(dy)));
        x = W / 2 + dx * k;
        y = H / 2 + dy * k;
        ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      }
      box.style.opacity = "1";
      box.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (arrow.current) {
        arrow.current.style.opacity = ang === null ? "0" : "1";
        arrow.current.style.transform = `translate(-50%, -50%) rotate(${ang ?? 0}deg) translateX(18px)`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [names]);

  return (
    <div
      ref={el}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9] font-mono text-[10px] uppercase tracking-[0.2em] transition-opacity duration-300"
      style={{ opacity: 0, color: WARM }}
    >
      <span className="absolute left-0 top-0 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-current" />
      <span ref={arrow} className="absolute left-0 top-0 block text-[12px]">
        ▶
      </span>
      <div className="absolute left-0 top-3 -translate-x-1/2 whitespace-nowrap text-center">
        <span ref={label} className="block" />
        <span ref={dist} className="block text-foreground/70" />
      </div>
    </div>
  );
}

/* ───────────── the map: landmarks, flight path, scanner ───────────── */

type Landmark = { id: string; label: string; pos: Vec3; color: string; go: () => void };

export function MapOverlay({ u, names }: { u: MotionValue<number>; names: Record<string, string> }) {
  const mapW = WINDOWS[BEATS.findIndex((b) => b.stop === "map")];
  const opacity = useTransform(u, [mapW.arrive - 0.25, mapW.arrive, mapW.leave, mapW.leave + 0.2], [0, 1, 1, 0]);
  const pointerEvents = useTransform(opacity, (o) => (o > 0.6 ? "auto" : "none"));
  const marks = useRef<(HTMLButtonElement | null)[]>([]);
  const path = useRef<SVGPolylineElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const ringLabel = useRef<HTMLSpanElement>(null);

  const beaconColor = (id?: string) => ((BEACONS.find((x) => x.id === id)?.color ?? 1) >= 4 ? WARM : "var(--accent)");
  const stopBeat = (stop: StopId) => BEATS.findIndex((b) => b.stop === stop);
  const goBeat = (i: number) => () => jumpTo(WINDOWS[i].arrive + 0.06);

  const landmarks: Landmark[] = [
    { id: "origin", label: "00 Origin", pos: [0, 0, 0], color: "var(--accent)", go: goBeat(0) },
    { id: "surface", label: "01 The Surface", pos: [2.2, 0, -8], color: "var(--accent)", go: goBeat(stopBeat("surface")) },
    { id: "swell", label: "02 The Swell", pos: [6, 0, -42], color: WARM, go: goBeat(stopBeat("swell")) },
    ...BEATS.flatMap((b, i) =>
      b.stop === "waypoints" && b.target
        ? [
            {
              id: b.id,
              label: `${b.mark} ${names[b.id] ?? ""}`,
              pos: b.target,
              color: beaconColor(b.region),
              go: goBeat(i),
            },
          ]
        : [],
    ),
    { id: "current", label: "04 The Current", pos: [-20, 0, -4], color: "var(--accent)", go: goBeat(stopBeat("current")) },
    { id: "harbor", label: "05 The Harbor", pos: [-6, 0, 14], color: WARM, go: goBeat(stopBeat("harbor")) },
    { id: "deep", label: "07 The Deep", pos: [-16, 0, -36], color: "var(--accent)", go: goBeat(stopBeat("deep")) },
  ];

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const e = seaStore.get();
      if (!e || u.get() < mapW.arrive - 0.4 || u.get() > mapW.leave + 0.3) return;
      landmarks.forEach((m, i) => {
        const el = marks.current[i];
        if (!el) return;
        const p = e.project(m.pos);
        el.style.visibility = p ? "visible" : "hidden";
        if (p) el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)`;
      });
      if (path.current) {
        const pts: string[] = [];
        const end = mapW.travelFrom;
        for (let k = 0; k <= 120; k++) {
          const c = e.cameraAt((k / 120) * end);
          const p = e.project([c.pos[0], 0, c.pos[2]]);
          if (p) pts.push(`${p[0].toFixed(1)},${p[1].toFixed(1)}`);
        }
        path.current.setAttribute("points", pts.join(" "));
      }
    };
    raf = requestAnimationFrame(tick);

    // Scanner reticle on the cursor (fine pointers only).
    const onMove = (ev: PointerEvent) => {
      const r = ring.current;
      if (!r || ev.pointerType !== "mouse") return;
      r.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
      const e = seaStore.get();
      const hit = e?.seaAtScreen(ev.clientX, ev.clientY);
      if (hit && ringLabel.current) {
        const la = GEO_ORIGIN.lat - hit[1] * GEO_ORIGIN.degPerUnit;
        const lo = GEO_ORIGIN.lon + hit[0] * GEO_ORIGIN.degPerUnit;
        ringLabel.current.textContent = `Scan ${Math.abs(la).toFixed(3)}°N ${Math.abs(lo).toFixed(3)}°W`;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u, names]);

  return (
    <motion.div style={{ opacity }} className="pointer-events-none fixed inset-0 z-[12]" aria-hidden>
      <svg className="absolute inset-0 h-full w-full">
        <polyline ref={path} fill="none" stroke="var(--accent)" strokeOpacity={0.6} strokeWidth={1} strokeDasharray="2 6" />
      </svg>
      <div
        ref={ring}
        className="pointer-events-none absolute left-0 top-0 hidden [@media(hover:hover)]:block"
        style={{ transform: "translate(-999px, -999px)" }}
      >
        <div className="absolute h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-foreground/20" />
        <span
          ref={ringLabel}
          className="absolute left-0 top-[262px] -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60"
        />
      </div>
      {landmarks.map((m, i) => (
        <motion.button
          key={m.id}
          ref={(el) => {
            marks.current[i] = el;
          }}
          style={{ pointerEvents }}
          onClick={m.go}
          tabIndex={-1}
          className="group absolute left-0 top-0 cursor-pointer"
        >
          <span
            className="absolute block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border transition-transform group-hover:scale-150"
            style={{ borderColor: m.color }}
          />
          <span
            className="absolute left-3 -top-2 whitespace-nowrap bg-background/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors group-hover:bg-background"
            style={{ color: m.color }}
          >
            {m.label}
          </span>
        </motion.button>
      ))}
    </motion.div>
  );
}
