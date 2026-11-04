"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import SeaCanvas from "./SeaCanvas";
import CursorGlyphStream from "@/components/CursorGlyphStream";
import { Hud, MapOverlay, TransitLabels, Waypoint, jumpTo, jumpToStop, useSeaU } from "./hud";
import {
  AboutCard,
  ContactCard,
  EducationCard,
  ExperienceCard,
  HeroCard,
  InsertionLog,
  MapCard,
  ProjectCard,
  SkillsCard,
} from "./cards";
import { BEATS, TRACK_VH, WINDOWS, beatIndex, stopForHash } from "./journey";
import { BEACONS } from "./world";
import { EXPERIENCES } from "@/data/profile";
import type { GitHubRepo } from "@/lib/github";
import { formatRepoName } from "@/lib/utils";

/**
 * A content panel bound to a window of the journey: fades in as the camera
 * arrives, out as it leaves. Inactive panels are inert (no focus, hidden from
 * assistive tech), so the reading order follows the journey.
 */
function Panel({
  u,
  from,
  to,
  fade = 0.16,
  className = "",
  quiet,
  label,
  children,
}: {
  u: MotionValue<number>;
  from: number;
  to: number;
  fade?: number;
  className?: string;
  quiet?: number;
  label?: string;
  children: (active: boolean) => ReactNode;
}) {
  const range = [from, from + fade, to - fade, to];
  const opacity = useTransform(u, range, [0, 1, 1, 0]);
  const y = useTransform(u, range, [28, 0, 0, -28]);
  const [active, setActive] = useState(() => from < 0 && to > 0);
  const [shown, setShown] = useState(() => from < 0 && to > 0);
  useMotionValueEvent(u, "change", (v) => {
    setActive(v > from + fade * 0.4 && v < to - fade * 0.4);
    setShown(v > from + fade * 0.25 && v < to - fade * 0.25);
  });
  return (
    <motion.section
      style={{ opacity, y }}
      data-sea-quiet={quiet}
      aria-label={label}
      aria-hidden={!shown}
      inert={!shown}
      className={`fixed z-10 ${shown ? "pointer-events-auto" : "pointer-events-none"} ${className}`}
    >
      {children(active)}
    </motion.section>
  );
}

/** Beat window → panel range (appears as the camera settles, leaves as it departs). */
function win(id: string) {
  const w = WINDOWS[beatIndex(id)];
  return { from: w.arrive - 0.12, to: w.leave + 0.12 };
}

const LEFT = "left-6 right-6 sm:left-[7vw] sm:right-auto sm:max-w-xl";
const RIGHT = "left-6 right-6 sm:left-auto sm:right-[7vw] sm:max-w-xl";
/** Long cards scroll inside on short screens instead of being cut off. */
const SCROLL = "max-h-[64vh] overflow-y-auto sm:max-h-[72vh] [scrollbar-width:thin]";

export default function SeaExperience({ projects }: { projects: GitHubRepo[] }) {
  const u = useSeaU();

  // Hero-only cursor glyph stream (as on the previous homepage's landing screen).
  const [heroOn, setHeroOn] = useState(true);
  useMotionValueEvent(u, "change", (v) => setHeroOn(v < 0.5));
  const heroFade = useTransform(u, [0, 0.35], [1, 0]);

  // Deep links: /#experience, /#projects, … land on that stop.
  useEffect(() => {
    const go = (smooth: boolean) => {
      const stop = stopForHash(window.location.hash);
      if (stop) jumpToStop(stop, smooth);
    };
    if (window.location.hash) {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      requestAnimationFrame(() => go(false));
    }
    const onHash = () => go(true);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const projBeats = BEATS.map((b, i) => ({ b, i })).filter(({ b }) => b.stop === "waypoints");
  const names = useMemo(() => {
    const n: Record<string, string> = { education: "The Harbor", deep: "The Deep" };
    projBeats.forEach(({ b }, k) => {
      if (projects[k]) n[b.id] = formatRepoName(projects[k].name);
    });
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const about = WINDOWS[beatIndex("about")];

  return (
    <main className="relative">
      <SeaCanvas />
      {/* The scroll track: its height *is* the journey. */}
      <div style={{ height: `${TRACK_VH * 100}vh` }} aria-hidden />

      {heroOn && (
        <motion.div style={{ opacity: heroFade }} aria-hidden>
          <CursorGlyphStream />
        </motion.div>
      )}

      <Hud u={u} />
      <Waypoint names={names} />
      <MapOverlay u={u} names={names} />
      <TransitLabels u={u} />

      {/* 00 / Origin */}
      <Panel u={u} from={-0.3} to={0.42} quiet={0.85} label="Introduction" className={`${LEFT} top-1/2 -translate-y-1/2`}>
        {(a) => <HeroCard active={a} />}
      </Panel>

      {/* Insertion log (during the dive) */}
      <Panel u={u} from={0.32} to={about.arrive - 0.1} fade={0.1} className="left-6 right-6 top-[30vh] sm:left-[7vw] sm:right-auto">
        {(a) => <InsertionLog active={a} />}
      </Panel>

      {/* 01 / The Surface */}
      <Panel u={u} {...win("about")} quiet={0.9} label="About" className={`${LEFT} top-[14vh] sm:top-[18vh] ${SCROLL}`}>
        {(a) => <AboutCard active={a} />}
      </Panel>

      {/* 02 / The Swell */}
      {EXPERIENCES.map((exp, i) => (
        <Panel
          key={exp.company}
          u={u}
          {...win(`exp-${i}`)}
          quiet={0.9}
          label={`Experience: ${exp.company}`}
          className={`${i % 2 ? RIGHT : LEFT} top-[14vh] sm:top-[18vh] ${SCROLL}`}
        >
          {(a) => <ExperienceCard exp={exp} index={i} total={EXPERIENCES.length} active={a} />}
        </Panel>
      ))}

      {/* 03 / Waypoints */}
      {projBeats.map(({ b }, k) => {
        const repo = projects[k];
        if (!repo) return null;
        // Card on the side away from the beacon (the shot puts the beacon right of centre on even beats).
        const side = k % 2 ? RIGHT : LEFT;
        const warm = (BEACONS.find((x) => x.id === b.region)?.color ?? 1) >= 4;
        return (
          <Panel
            key={b.id}
            u={u}
            {...win(b.id)}
            quiet={0.9}
            label={`Project: ${formatRepoName(repo.name)}`}
            className={`${side} top-[12vh] sm:top-[14vh] ${SCROLL}`}
          >
            {(a) => <ProjectCard repo={repo} index={k} total={projBeats.length} active={a} warm={warm} />}
          </Panel>
        );
      })}

      {/* 04 / The Current */}
      <Panel u={u} {...win("skills")} quiet={0.9} label="Skills" className={`left-6 right-6 top-[14vh] sm:left-[7vw] sm:right-[7vw] sm:max-w-4xl ${SCROLL}`}>
        {(a) => <SkillsCard active={a} />}
      </Panel>

      {/* 05 / The Harbor */}
      <Panel u={u} {...win("education")} quiet={0.9} label="Education" className={`${RIGHT} top-[20vh] sm:max-w-md`}>
        {(a) => <EducationCard active={a} />}
      </Panel>

      {/* 06 / The Map */}
      <Panel
        u={u}
        {...win("map")}
        quiet={0.7}
        label="Map"
        className="bottom-[16vh] left-1/2 w-[min(88vw,40rem)] -translate-x-1/2 sm:bottom-[12vh]"
      >
        {(a) => <MapCard active={a} />}
      </Panel>

      {/* 07 / The Deep */}
      <Panel
        u={u}
        from={WINDOWS[beatIndex("deep")].arrive - 0.12}
        to={TRACK_VH + 1}
        quiet={0.9}
        label="Contact"
        className={`${LEFT} top-[22vh] sm:max-w-2xl`}
      >
        {(a) => <ContactCard active={a} onSurface={() => jumpTo(0)} />}
      </Panel>
    </main>
  );
}
