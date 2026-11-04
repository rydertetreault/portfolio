"use client";

import { useEffect, useRef } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { EXPERIENCES } from "@/data/profile";
import { accent } from "./stops";
import { oceanView } from "./nav";
import { NOW_M, NOW_X, SWELL, TENURE, TIME, swellAt, timeX } from "./world";
import { beatIndex, eventsAt, spanOpacity, textOpacity } from "./route";
import type { Vec3 } from "./timeline";

const MONTHS = "JFMAMJJASOND";

/** Where a label sits in the world (re-evaluated each frame: the swell rises and falls). */
type Pin = { at: (swell: number) => Vec3; el: HTMLElement | null };

/** Top of crest k at x. */
const crestZ = (k: number, x: number) => SWELL.crests[k] + 0.7 * Math.sin(x * 0.13 + k * 1.7);
/** The month rule lies on the water just in front of crest k. */
const RULE = 2.2;

/**
 * The Experience timeline, written on the water: time runs west → east along the swell, each
 * crest stands over its company's months (the engine draws that), and these labels ride on it:
 * each company's name over its crest, the months along the front of the crest you're at, and now.
 */
export default function Timeline({ u }: { u: MotionValue<number> }) {
  const e0 = beatIndex("exp-0");
  const opacity = useTransform(u, (v) => spanOpacity(v, e0, e0 + 2));
  const pins = useRef<Pin[]>([]);
  pins.current = [];
  const pin = (at: Pin["at"]) => {
    const p: Pin = { at, el: null };
    pins.current.push(p);
    return (el: HTMLElement | null) => {
      p.el = el;
    };
  };

  useEffect(() => {
    const place = () => {
      const project = oceanView.project;
      const sw = eventsAt(u.get()).swell;
      for (const p of pins.current) {
        if (!p.el) continue;
        const s = sw > 0.01 && project ? project(p.at(sw)) : null;
        if (!s) {
          p.el.style.visibility = "hidden";
          continue;
        }
        p.el.style.visibility = "";
        p.el.style.transform = `translate3d(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
    };
    oceanView.frame.add(place);
    return () => {
      oceanView.frame.delete(place);
    };
  }, [u]);

  const months = Array.from({ length: Math.ceil(TIME.m1 - TIME.m0) }, (_, j) => TIME.m0 + j).filter((m) => m <= NOW_M);
  const label = "absolute left-0 top-0 whitespace-nowrap will-change-transform";

  return (
    <motion.div
      style={{ opacity }}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9] hidden overflow-hidden font-mono sm:block"
    >
      {EXPERIENCES.map((e, k) => {
        const t = TENURE[k];
        const mid = (t.x0 + t.x1) / 2;
        const c = accent(SWELL.colors[k]);
        return (
          <Crest key={e.company} u={u} k={k}>
            {/* The company, floating over its crest. */}
            <span
              ref={pin((sw) => [mid, swellAt(mid, crestZ(k, mid)) * sw + 0.75, crestZ(k, mid)])}
              className={`${label} text-[13px] font-medium tracking-[0.08em]`}
              style={{ color: c }}
            >
              {e.company}
            </span>
            {/* Promotions: the notch in the crest, named. */}
            {t.promos.map((x, j) => (
              <span
                key={x}
                ref={pin((sw) => [x, swellAt(x, crestZ(k, x)) * sw + 0.3, crestZ(k, x)])}
                className={`${label} text-[10px] uppercase tracking-[0.14em] text-text-faint`}
              >
                ↑ {e.roles[j].role}
              </span>
            ))}
          </Crest>
        );
      })}
      {/* The months along the front of the crest you're at; it moves with you from crest to crest. */}
      {EXPERIENCES.map((e, k) => (
        <Rule key={e.company} u={u} k={k}>
          {months.map((m) => {
            const x = timeX(m + 0.5);
            const z = crestZ(k, x) + RULE;
            return (
              <span
                key={m}
                ref={pin((sw) => [x, swellAt(x, z) * sw + 0.25, z])}
                className={`${label} text-[10px] tracking-[0.12em] text-text-faint`}
              >
                {MONTHS[m % 12]}
                {m % 12 === 0 || m === TIME.m0 ? <span className="ml-1 opacity-70">{Math.floor(m / 12)}</span> : null}
              </span>
            );
          })}
          <span
            ref={pin((sw) => {
              const z = crestZ(k, NOW_X) + RULE * 0.4;
              return [NOW_X, swellAt(NOW_X, z) * sw + 1.6, z];
            })}
            className={`${label} text-[10px] uppercase tracking-[0.2em] text-foreground`}
          >
            now ▾
          </span>
        </Rule>
      ))}
    </motion.div>
  );
}

/** A crest's labels: bright while you're at it, dim otherwise. */
function Crest({ u, k, children }: { u: MotionValue<number>; k: number; children: React.ReactNode }) {
  const i = beatIndex(`exp-${k}`);
  const opacity = useTransform(u, (v) => 0.35 + 0.65 * textOpacity(v, i));
  return <motion.div style={{ opacity }}>{children}</motion.div>;
}

/** The month rule in front of crest k: only while you're at it. */
function Rule({ u, k, children }: { u: MotionValue<number>; k: number; children: React.ReactNode }) {
  const i = beatIndex(`exp-${k}`);
  const opacity = useTransform(u, (v) => textOpacity(v, i));
  return <motion.div style={{ opacity }}>{children}</motion.div>;
}
