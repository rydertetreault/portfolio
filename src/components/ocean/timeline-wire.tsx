"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { EXPERIENCES } from "@/data/profile";
import { oceanView } from "./nav";
import { EXP_BACK, EXP_X, EXP_YAW, beatIndex, spanOpacity, textOpacity } from "./route";
import { accent } from "./stops";
import { SWELL, swellAt } from "./world";

/* ── the time axis: the same months on every crest, earliest start → now ── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const today = new Date();
const NOW = today.getFullYear() * 12 + today.getMonth() + today.getDate() / 31;
/** "Jun 2026" → months since year 0; anything else ("Present") → now. */
function month(s: string): number {
  const m = s.trim().match(/^([A-Za-z]{3})\w*\s+(\d{4})$/);
  return m ? Number(m[2]) * 12 + MONTHS.indexOf(m[1][0].toUpperCase() + m[1].slice(1, 3).toLowerCase()) : NOW;
}
function span(date: string): [number, number] {
  const [a, b = "Present"] = date.split(/\s+-\s+/);
  const end = month(b);
  return [month(a), end === NOW ? NOW : end + 1];
}
const SPANS = EXPERIENCES.map((e) => span(e.date));
const T0 = Math.floor(Math.min(...SPANS.map((s) => s[0])));
const T1 = NOW;
const TICKS = Array.from({ length: Math.floor(T1) - T0 + 1 }, (_, j) => T0 + j);

/** Every crest's axis spans the same x (stacked, so the spine runs straight back over the
 * swell), inside the left half of all three stops' views (the text is on the right). */
const CENTRES = EXP_X.map((x, k) => x + EXP_BACK * Math.sin((EXP_YAW[k] * Math.PI) / 180));
const AXIS: [number, number] = [Math.max(...CENTRES) - 4.6, Math.min(...CENTRES) - 0.7];
const AX = (k: number): [number, number] => (void k, AXIS);
const tx = (k: number, m: number) => AX(k)[0] + ((m - T0) / (T1 - T0)) * (AX(k)[1] - AX(k)[0]);
/** Where crest k's top is at x (the crest line wanders a little; mirrors the shader). */
const crestZ = (k: number, x: number) => SWELL.crests[k] + 0.7 * Math.sin(x * 0.13 + k * 1.7);
const LIFT = 0.2;

const label = (m: number) => (m >= NOW - 0.01 ? "Present" : `${MONTHS[Math.floor(m) % 12]} ${Math.floor(m / 12)}`);

/**
 * Experience: a timeline riding the swell. Each company's crest carries the same month axis
 * (earliest start → present) along its top; that company's span is drawn in the crest's
 * colour with its dates. Hidden wherever water stands in front of it.
 */
export default function TimelineWire({ u }: { u: MotionValue<number> }) {
  const root = useRef<HTMLDivElement>(null);
  const base = useRef<(SVGPathElement | null)[]>([]);
  const hot = useRef<(SVGPathElement | null)[]>([]);
  const ticks = useRef<(SVGPathElement | null)[]>([]);
  const spine = useRef<SVGPathElement>(null);
  const faint = useRef<SVGPathElement>(null);
  const pts = useRef<Float32Array | null>(null);
  const groups = useRef<(SVGGElement | null)[]>([]);
  const ends = useRef<(HTMLDivElement | null)[]>([]);
  const months = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const e0 = beatIndex("exp-0");

    const draw = () => {
      const el = root.current;
      const project = oceanView.project;
      const ev = oceanView.events?.();
      const eye = oceanView.eye?.();
      if (!el || !project || !ev || !eye) return;
      const v = u.get();
      const show = spanOpacity(v, e0, e0 + 2) * ev.swell;
      el.style.opacity = String(show);
      el.style.visibility = show < 0.01 ? "hidden" : "visible";
      if (show < 0.01) {
        oceanView.probe?.(null);
        return;
      }

      // The crests as drawn this frame (formed as far as they are), so the line sits on them.
      const surface = (x: number, z: number) => swellAt(x, z, ev.crestBuild) * ev.swell;
      const smoothSurface = (x: number, z: number) => swellAt(x, z, ev.crestBuild, true) * ev.swell;
      const at = (k: number, m: number): [number, number, number] => {
        const x = tx(k, m);
        const z = crestZ(k, x);
        return [x, surface(x, z) + LIFT, z];
      };
      // Is water between the eye and p?
      const hidden = (p: [number, number, number]) => {
        for (let t = 0.1; t < 0.82; t += 0.04) {
          const q = [eye[0] + (p[0] - eye[0]) * t, eye[1] + (p[1] - eye[1]) * t, eye[2] + (p[2] - eye[2]) * t];
          if (q[1] < surface(q[0], q[2]) + 0.12) return true;
        }
        return false;
      };
      const line = (k: number, m0: number, m1: number) => {
        let d = "";
        let pen = false;
        const n = Math.max(2, Math.ceil((m1 - m0) * 6));
        for (let j = 0; j <= n; j++) {
          const p = at(k, m0 + ((m1 - m0) * j) / n);
          const s = project(p);
          if (s && !hidden(p)) {
            d += `${pen ? "L" : "M"}${s[0].toFixed(1)},${s[1].toFixed(1)}`;
            pen = true;
          } else pen = false;
        }
        return d;
      };

      // The spine: from each timeline's start, over the trough, to the next one's start,
      // riding the water's surface.
      // Follows the waves' curvature (a smooth version of the swell, so the crests' sharp tops
      // don't kink it). Stretches behind water are drawn faintly rather than cut, so it always
      // connects without crossing the dates on the crest in front.
      let sd = "";
      let hd = "";
      // Sample points (world xz) along each link, every frame the same: their live water heights
      // come back from the GPU (one frame behind), so the line moves with the waves.
      const N = 120;
      const links = EXPERIENCES.length - 1;
      if (!pts.current || pts.current.length !== links * (N + 1) * 2) pts.current = new Float32Array(links * (N + 1) * 2);
      const xz = pts.current;
      const live = oceanView.heights?.();
      const ok = !!live && live.length === links * (N + 1);
      for (let k = 0; k < links; k++) {
        const a = at(k, T0 - 0.6);
        const b = at(k + 1, T0 - 0.6);
        let prev: [number, number] | null = null;
        for (let j = 0; j <= N; j++) {
          const t = j / N;
          const x = a[0] + (b[0] - a[0]) * t;
          const z = a[2] + (b[2] - a[2]) * t;
          const idx = k * (N + 1) + j;
          xz[idx * 2] = x;
          xz[idx * 2 + 1] = z;
          // The live water, with the crests' sharp tops swapped for rounded ones (no kinks).
          const water = ok ? live![idx] - surface(x, z) + smoothSurface(x, z) : smoothSurface(x, z);
          const p: [number, number, number] = [x, water + LIFT, z];
          const s = project(p);
          if (!s) {
            prev = null;
            continue;
          }
          const pt: [number, number] = [s[0], s[1]];
          if (prev) {
            const seg = `M${prev[0].toFixed(1)},${prev[1].toFixed(1)}L${pt[0].toFixed(1)},${pt[1].toFixed(1)}`;
            if (hidden(p)) hd += seg;
            else sd += seg;
          }
          prev = pt;
        }
      }
      oceanView.probe?.(xz);
      faint.current?.setAttribute("d", hd);
      spine.current?.setAttribute("d", sd);

      EXPERIENCES.forEach((_, k) => {
        const on = textOpacity(v, e0 + k);
        groups.current[k]?.setAttribute("opacity", String(0.15 + 0.85 * on));
        base.current[k]?.setAttribute("d", line(k, T0, T1));
        hot.current[k]?.setAttribute("d", line(k, SPANS[k][0], SPANS[k][1]));
        // Month ticks, and month initials under them on the crest you're at.
        let td = "";
        TICKS.forEach((m, j) => {
          const p = at(k, m);
          const s = project(p);
          const lab = months.current[k * TICKS.length + j];
          const ok = s && !hidden(p);
          if (ok && s) td += `M${s[0].toFixed(1)},${(s[1] - 4).toFixed(1)}L${s[0].toFixed(1)},${(s[1] + 4).toFixed(1)}`;
          if (lab) {
            lab.style.opacity = ok ? String(on) : "0";
            if (ok && s) lab.style.transform = `translate(${s[0].toFixed(1)}px, ${(s[1] + 8).toFixed(1)}px)`;
          }
        });
        ticks.current[k]?.setAttribute("d", td);
        // The span's dates, at its two ends.
        SPANS[k].forEach((m, j) => {
          const lab = ends.current[k * 2 + j];
          if (!lab) return;
          const p = at(k, m);
          const s = project(p);
          const ok = s && !hidden(p);
          lab.style.opacity = ok ? String(on) : "0";
          if (ok && s) lab.style.transform = `translate(${s[0].toFixed(1)}px, ${(s[1] - 10).toFixed(1)}px)`;
        });
      });
    };

    oceanView.frame.add(draw);
    return () => {
      oceanView.frame.delete(draw);
      oceanView.probe?.(null);
    };
  }, [u]);

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-[5]" style={{ opacity: 0 }}>
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <path ref={faint} fill="none" stroke="var(--foreground)" strokeOpacity={0.16} strokeWidth={1.5} strokeLinecap="round" />
        <path ref={spine} fill="none" stroke="var(--foreground)" strokeOpacity={0.7} strokeWidth={1.5} strokeLinecap="round" />
        {EXPERIENCES.map((e, k) => (
          <g
            key={e.company}
            ref={(g) => {
              groups.current[k] = g;
            }}
          >
            <path ref={(p) => void (base.current[k] = p)} fill="none" stroke="var(--text-faint)" strokeWidth={1} />
            <path ref={(p) => void (ticks.current[k] = p)} fill="none" stroke="var(--text-faint)" strokeWidth={1} />
            <path
              ref={(p) => void (hot.current[k] = p)}
              fill="none"
              stroke={accent(SWELL.colors[k])}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
      {EXPERIENCES.map((e, k) =>
        SPANS[k].map((m, j) => (
          <div
            key={`${e.company}-${j}`}
            ref={(d) => {
              ends.current[k * 2 + j] = d;
            }}
            className="absolute left-0 top-0 will-change-transform"
          >
            <span
              data-ocean-quiet="0.6"
              className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em]"
              style={{ color: accent(SWELL.colors[k]) }}
            >
              {label(j === 1 && m < NOW - 0.01 ? m - 1 : m)}
            </span>
          </div>
        )),
      )}
      {EXPERIENCES.map((e, k) =>
        TICKS.map((m, j) => (
          <div
            key={`${e.company}-m${j}`}
            ref={(d) => {
              months.current[k * TICKS.length + j] = d;
            }}
            className="absolute left-0 top-0 will-change-transform"
          >
            <span className="absolute -translate-x-1/2 font-mono text-[10px] text-text-faint">{MONTHS[m % 12][0]}</span>
          </div>
        )),
      )}
    </div>
  );
}
