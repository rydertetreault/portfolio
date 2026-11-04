"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import OceanCanvas from "./OceanCanvas";
import Directory from "./directory";
import { oceanNav } from "./nav";
import { BEATS, SECTIONS, TRACK, eventsAt, textOpacity } from "./route";
import { AboutText, ContactStop, EducationStop, ExperienceStop, OriginStop, ProjectStop, SkillsText } from "./stops";
import { EXPERIENCES } from "@/data/profile";
import type { GitHubRepo } from "@/lib/github";
import { useTheme } from "@/components/ThemeProvider";

const W = "sm:w-[min(36rem,42vw)]";
const PLACE = {
  left: `left-6 right-6 top-24 sm:right-auto sm:left-[7vw] sm:top-[15vh] ${W}`,
  right: `left-6 right-6 top-24 sm:left-auto sm:right-[7vw] sm:top-[15vh] ${W}`,
  center: "left-6 right-6 top-1/2 -translate-y-1/2 sm:left-1/2 sm:right-auto sm:w-[30rem] sm:-translate-x-1/2",
  split: "inset-x-6 top-20 bottom-6 overflow-y-auto sm:overflow-visible sm:bottom-auto sm:inset-x-[5vw] sm:top-[13vh]",
  origin: "left-6 right-6 top-1/2 -translate-y-1/2 sm:right-auto sm:left-[7vw] sm:w-[36rem]",
};

/**
 * One stop's text: fades in as the camera settles there, out as it leaves. Inert while
 * hidden. The water calms behind every `data-ocean-quiet` element inside it.
 */
function Stop({
  u,
  i,
  place,
  quiet = true,
  children,
}: {
  u: MotionValue<number>;
  i: number;
  place: string;
  quiet?: boolean;
  children: ReactNode;
}) {
  const opacity = useTransform(u, (v) => textOpacity(v, i));
  const y = useTransform(opacity, (o) => (1 - o) * 14);
  const [shown, setShown] = useState(i === 0);
  useMotionValueEvent(opacity, "change", (o) => setShown(o > 0.5));
  return (
    <motion.section
      style={{ opacity, y }}
      data-ocean-stop
      data-ocean-quiet={quiet ? "" : undefined}
      aria-hidden={!shown}
      inert={!shown}
      className={`fixed ${place.includes("z-[") ? "" : "z-10"} ${place} ${shown ? "" : "pointer-events-none"}`}
    >
      {children}
    </motion.section>
  );
}

function goTo(u: number) {
  const reduce = document.documentElement.classList.contains("reduce-motion");
  window.scrollTo({ top: u * window.innerHeight, behavior: reduce ? "auto" : "smooth" });
}

function Header({ u }: { u: MotionValue<number> }) {
  const { theme, toggleTheme } = useTheme();
  const opacity = useTransform(u, (v) => 1 - eventsAt(v).blackout);
  const link = "font-mono text-[11px] uppercase tracking-[0.22em] text-text-muted transition-colors hover:text-accent";
  return (
    <motion.header
      style={{ opacity }}
      className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-[7vw]"
    >
      <button
        onClick={() => goTo(0)}
        className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.22em] text-foreground sm:text-xs sm:tracking-[0.25em]"
      >
        <span className="sm:hidden">RT</span>
        <span className="hidden sm:inline">Ryder Tetreault</span>
      </button>
      <nav className="flex items-center gap-4 sm:gap-6">
        <div className="hidden items-center gap-6 lg:flex">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => goTo(s.u)} className={link}>
              {s.label}
            </button>
          ))}
          <span className="h-3 w-px bg-border-theme" />
        </div>
        <Link href="/projects" scroll={false} className={`${link} normal-case tracking-[0.12em]`}>
          ~/projects
        </Link>
        <Link href="/resume" scroll={false} className={`${link} normal-case tracking-[0.12em]`}>
          ~/resume
        </Link>
        <button onClick={toggleTheme} aria-label="Toggle theme" className="text-text-muted hover:text-accent">
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </nav>
    </motion.header>
  );
}

/** The bottom of the whirlpool: the screen goes black, then the directory. */
function Blackout({ u }: { u: MotionValue<number> }) {
  const black = useTransform(u, (v) => eventsAt(v).blackout);
  const [on, setOn] = useState(false);
  useMotionValueEvent(black, "change", (b) => setOn(b > 0.01));
  if (!on) return null;
  return <motion.div aria-hidden style={{ opacity: black }} className="pointer-events-none fixed inset-0 z-[15] bg-black" />;
}

/**
 * The whole site: one ocean, flown through by scrolling. Every other page of the site
 * (`children`) opens as a waveform lightbox over it, so the ocean never reloads.
 */
export default function Ocean({ projects, children }: { projects: GitHubRepo[]; children: ReactNode }) {
  const camU = useMotionValue(0);
  const pathname = usePathname();

  useEffect(() => {
    oceanNav.depth++;
  }, [pathname]);

  // Deep links: /#experience etc.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const s = SECTIONS.find((x) => x.id === id);
    if (s) window.scrollTo({ top: s.u * window.innerHeight });
  }, []);

  let pi = 0;
  const nProj = BEATS.filter((x) => x.section === "projects").length;
  return (
    <main className="relative text-foreground">
      <OceanCanvas camU={camU} />
      <Header u={camU} />
      {/* The scroll track: the camera flies as this scrolls. */}
      <div aria-hidden style={{ height: `calc(${TRACK} * 100lvh + 100lvh)` }} />
      <Blackout u={camU} />
      {BEATS.map((b, i) => {
        const place = b.id === "origin" ? PLACE.origin : PLACE[b.side];
        let content: ReactNode = null;
        if (b.id === "origin") content = <OriginStop />;
        else if (b.id === "about")
          return (
            <Stop key={b.id} u={camU} i={i} place={place} quiet={false}>
              <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
                <div data-ocean-quiet className="sm:w-[min(34rem,38vw)]">
                  <AboutText />
                </div>
                <div data-ocean-quiet className="sm:w-[min(26rem,30vw)]">
                  <SkillsText />
                </div>
              </div>
            </Stop>
          );
        else if (b.section === "experience") {
          const k = Number(b.id.split("-")[1]);
          content = <ExperienceStop exp={EXPERIENCES[k]} k={k} n={EXPERIENCES.length} />;
        } else if (b.section === "projects") {
          const repo = projects[pi++];
          if (!repo) return null;
          content = <ProjectStop repo={repo} k={pi - 1} n={nProj} />;
        } else if (b.id === "education") content = <EducationStop />;
        else if (b.id === "contact") content = <ContactStop />;
        else if (b.id === "directory")
          return (
            <Stop key={b.id} u={camU} i={i} place="inset-x-4 top-1/2 z-[16] -translate-y-1/2" quiet={false}>
              <Directory />
            </Stop>
          );
        return (
          <Stop key={b.id} u={camU} i={i} place={place}>
            {content}
          </Stop>
        );
      })}
      {children}
    </main>
  );
}
