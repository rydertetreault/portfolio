"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import OceanCanvas from "./OceanCanvas";
import { BEATS, SECTIONS, TRACK, textOpacity } from "./route";
import {
  AboutStop,
  ContactStop,
  EducationStop,
  ExperienceStop,
  OriginStop,
  ProjectStop,
  SkillsStop,
} from "./stops";
import { EXPERIENCES } from "@/data/profile";
import type { GitHubRepo } from "@/lib/github";
import { useTheme } from "@/components/ThemeProvider";

const PLACE = {
  left: "left-6 right-6 top-24 sm:right-auto sm:left-[7vw] sm:top-[15vh] sm:w-[min(36rem,42vw)]",
  right: "left-6 right-6 top-24 sm:left-auto sm:right-[7vw] sm:top-[15vh] sm:w-[min(36rem,42vw)]",
  center: "left-6 right-6 top-1/2 -translate-y-1/2 sm:left-1/2 sm:right-auto sm:w-[30rem] sm:-translate-x-1/2",
  origin: "left-6 right-6 top-1/2 -translate-y-1/2 sm:right-auto sm:left-[7vw] sm:w-[36rem]",
};

/** One stop's text: fades in as the camera settles there, out as it leaves. Inert while hidden. */
function Stop({ u, i, place, children }: { u: MotionValue<number>; i: number; place: string; children: ReactNode }) {
  const opacity = useTransform(u, (v) => textOpacity(v, i));
  const y = useTransform(opacity, (o) => (1 - o) * 14);
  const [shown, setShown] = useState(i === 0);
  useMotionValueEvent(opacity, "change", (o) => setShown(o > 0.5));
  return (
    <motion.section
      style={{ opacity, y }}
      data-ocean-quiet
      aria-hidden={!shown}
      inert={!shown}
      className={`fixed z-10 ${place} ${shown ? "" : "pointer-events-none"}`}
    >
      {children}
    </motion.section>
  );
}

function goTo(u: number) {
  const reduce = document.documentElement.classList.contains("reduce-motion");
  window.scrollTo({ top: u * window.innerHeight, behavior: reduce ? "auto" : "smooth" });
}

function Header() {
  const { theme, toggleTheme } = useTheme();
  const link = "font-mono text-[11px] uppercase tracking-[0.22em] text-text-muted transition-colors hover:text-accent";
  return (
    <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-[7vw]">
      <button onClick={() => goTo(0)} className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.22em] text-foreground sm:text-xs sm:tracking-[0.25em]">
        Ryder Tetreault
      </button>
      <nav className="flex items-center gap-4 sm:gap-6">
        <div className="hidden items-center gap-6 lg:flex">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => goTo(s.u)} className={link}>
              {s.label}
            </button>
          ))}
        </div>
        <Link href="/projects" className={`${link} lg:hidden`}>
          Projects
        </Link>
        <Link href="/resume" className={link}>
          Resume
        </Link>
        <button onClick={toggleTheme} aria-label="Toggle theme" className="text-text-muted hover:text-accent">
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </nav>
    </header>
  );
}

export default function Ocean({ projects }: { projects: GitHubRepo[] }) {
  const camU = useMotionValue(0);

  // Deep links: /#experience etc.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const s = SECTIONS.find((x) => x.id === id);
    if (s) window.scrollTo({ top: s.u * window.innerHeight });
  }, []);

  let pi = 0;
  return (
    <main className="relative text-foreground">
      <OceanCanvas camU={camU} />
      <Header />
      {/* The scroll track: the camera flies as this scrolls. */}
      <div aria-hidden style={{ height: `calc(${TRACK} * 100lvh + 100lvh)` }} />
      {BEATS.map((b, i) => {
        const place = b.id === "origin" ? PLACE.origin : PLACE[b.side];
        let content: ReactNode = null;
        if (b.id === "origin") content = <OriginStop />;
        else if (b.id === "about") content = <AboutStop />;
        else if (b.section === "experience") {
          const k = Number(b.id.split("-")[1]);
          content = <ExperienceStop exp={EXPERIENCES[k]} k={k} n={EXPERIENCES.length} />;
        } else if (b.section === "projects") {
          const repo = projects[pi++];
          if (!repo) return null;
          content = <ProjectStop repo={repo} k={pi - 1} n={BEATS.filter((x) => x.section === "projects").length} />;
        } else if (b.id === "skills") content = <SkillsStop />;
        else if (b.id === "education") content = <EducationStop />;
        else if (b.id === "contact") content = <ContactStop />;
        return (
          <Stop key={b.id} u={camU} i={i} place={place}>
            {content}
          </Stop>
        );
      })}
    </main>
  );
}
