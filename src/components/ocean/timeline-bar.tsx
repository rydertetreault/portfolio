"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { EXPERIENCES } from "@/data/profile";
import { accent } from "./stops";
import { SWELL } from "./world";
import { beatIndex, spanOpacity, textOpacity } from "./route";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Jun 2026" → months since year 0; "Present" → now. */
function month(s: string, now: number): number {
  const m = s.trim().match(/^([A-Za-z]{3})\w*\s+(\d{4})$/);
  if (!m) return now;
  return Number(m[2]) * 12 + MONTHS.indexOf(m[1].slice(0, 1).toUpperCase() + m[1].slice(1, 3).toLowerCase());
}

function span(date: string, now: number): [number, number] {
  const [a, b = "Present"] = date.split(/\s+-\s+/);
  return [month(a, now), month(b, now) + 1];
}

/** One bar per company, in its crest's colour; the company you're at lights up. */
function Row({ u, k, x0, x1, t0, t1, now }: { u: MotionValue<number>; k: number; x0: number; x1: number; t0: number; t1: number; now: number }) {
  const e = EXPERIENCES[k];
  const i = beatIndex(`exp-${k}`);
  const on = useTransform(u, (v) => 0.3 + 0.7 * textOpacity(v, i));
  const pct = (m: number) => `${((m - t0) / (t1 - t0)) * 100}%`;
  const c = accent(SWELL.colors[k]);
  return (
    <motion.div style={{ opacity: on }} className="grid grid-cols-[9rem_1fr] items-center gap-4">
      <span className="truncate text-right text-sm font-medium" style={{ color: c }}>
        {e.company}
      </span>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border-theme/60" />
        <div
          className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full"
          style={{ left: pct(x0), width: `calc(${pct(x1)} - ${pct(x0)})`, background: c }}
        />
        {/* Promotions: a tick where each later role starts. */}
        {e.roles.slice(0, -1).map((r) => {
          const m = span(r.date, now)[0];
          return (
            <span
              key={r.role}
              title={r.role}
              className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-foreground"
              style={{ left: pct(m) }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

/** Shown across the three Experience stops, bottom left (the text is on the right). */
export default function Timeline({ u }: { u: MotionValue<number> }) {
  const e0 = beatIndex("exp-0");
  const opacity = useTransform(u, (v) => spanOpacity(v, e0, e0 + 2));
  const d = new Date();
  const now = d.getFullYear() * 12 + d.getMonth();
  const spans = EXPERIENCES.map((e) => span(e.date, now));
  const t0 = Math.min(...spans.map((s) => s[0]));
  const t1 = Math.max(...spans.map((s) => s[1]));
  const ticks = Array.from({ length: t1 - t0 }, (_, j) => t0 + j);
  return (
    <motion.div
      style={{ opacity }}
      data-ocean-quiet
      aria-hidden
      className="pointer-events-none fixed bottom-[7vh] left-[7vw] z-10 hidden w-[min(40rem,42vw)] space-y-2 sm:block"
    >
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">Timeline</p>
      {EXPERIENCES.map((_, k) => (
        <Row key={k} u={u} k={k} x0={spans[k][0]} x1={spans[k][1]} t0={t0} t1={t1} now={now} />
      ))}
      <div className="grid grid-cols-[9rem_1fr] gap-4 pt-1">
        <span />
        <div className="relative h-4 font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint">
          {ticks.map((m) => (
            <span
              key={m}
              className="absolute -translate-x-1/2"
              style={{ left: `${((m + 0.5 - t0) / (t1 - t0)) * 100}%` }}
            >
              {MONTHS[m % 12].slice(0, 1)}
            </span>
          ))}
          <span className="absolute right-0 top-4 text-[10px]">{Math.floor((t1 - 1) / 12)}</span>
        </div>
      </div>
    </motion.div>
  );
}
