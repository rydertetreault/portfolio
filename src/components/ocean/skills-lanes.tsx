"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { SKILLS } from "@/data/profile";
import { oceanView } from "./nav";
import { beatIndex, textOpacity } from "./route";
import { accent } from "./stops";
import { CURRENTS, laneX } from "./world";

/**
 * Skills: each group's text is centred where its current ends, so the current pours into it.
 * Positions come from the ocean's camera every frame, so each column stays under its lane at
 * any screen size.
 */
export default function SkillsLanes({ u }: { u: MotionValue<number> }) {
  const root = useRef<HTMLDivElement>(null);
  const cols = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const i = beatIndex("skills");
    const draw = () => {
      const el = root.current;
      const project = oceanView.project;
      if (!el || !project) return;
      const o = textOpacity(u.get(), i);
      el.style.opacity = String(o);
      el.style.visibility = o < 0.01 ? "hidden" : "visible";
      el.inert = o < 0.5;
      if (o < 0.01) return;
      SKILLS.forEach((_, k) => {
        const col = cols.current[k];
        const s = project([laneX(k), 0, CURRENTS.z1]);
        if (col && s) col.style.transform = `translate(${s[0].toFixed(1)}px, ${(s[1] + 14).toFixed(1)}px) translateX(-50%)`;
      });
    };
    oceanView.frame.add(draw);
    return () => {
      oceanView.frame.delete(draw);
    };
  }, [u]);

  return (
    <div ref={root} data-ocean-stop className="pointer-events-none fixed inset-0 z-10" style={{ opacity: 0 }}>
      {SKILLS.map((g, k) => (
        <div
          key={g.title}
          ref={(d) => {
            cols.current[k] = d;
          }}
          className="absolute left-0 top-0 w-[min(19rem,27vw)] will-change-transform"
        >
          <div data-ocean-quiet="0.6" className="space-y-2 text-center">
            <p className="text-lg font-medium" style={{ color: accent(CURRENTS.colors[k]) }}>
              {g.title}
            </p>
            <p className="text-[14px] leading-relaxed text-text-muted">
              {g.items.map((it, j) => (
                <span key={it}>
                  <span className="whitespace-nowrap">
                    {it}
                    {j < g.items.length - 1 && <span className="text-text-faint"> ·</span>}
                  </span>{" "}
                </span>
              ))}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
