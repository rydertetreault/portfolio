"use client";

import Link from "next/link";
import { ArrowUp, ArrowUpRight, FileText } from "lucide-react";
import { jumpTo } from "./jump";
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import CompanyLogo from "@/components/CompanyLogo";
import AuburnMark from "@/components/icons/AuburnMark";
import { EDUCATION, EXPERIENCES, PROFILE, SKILLS, type Experience } from "@/data/profile";
import { SWELL } from "./world";
import { SECTIONS } from "./route";

/* ── shared type ── */

/** Accent n (1..3): the colour shared by a stop's item in the water and its text. */
export const accent = (n: number) => `var(--ocean-a${n})`;

/** Each stop's name on the route (the ocean), beside what it is (the site). */
export const NAMES = {
  "00": "The surface",
  "01": "The dive",
  "02": "The swell",
  "03": "The currents",
  "04": "The islands",
  "05": "The horizon",
  "06": "The deep",
} as const;

/** `03 / THE CURRENTS · Skills`: the stop's ocean name, then `children` (what it is). */
export function Kicker({ n, children, color = 1 }: { n: keyof typeof NAMES; children?: ReactNode; color?: number }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">
      <span style={{ color: accent(color) }}>{n}</span>
      <span className="mx-2 opacity-50">/</span>
      <span className="text-text-muted">{NAMES[n]}</span>
      {children && (
        <>
          <span className="mx-2 opacity-50">·</span>
          {children}
        </>
      )}
    </p>
  );
}

export function Out({ href, children }: { href: string; children: ReactNode }) {
  const internal = href.startsWith("/");
  const cls =
    "inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-foreground underline decoration-accent/60 underline-offset-[6px] transition-colors hover:text-accent";
  return internal ? (
    <Link href={href} scroll={false} className={cls}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
      <ArrowUpRight size={13} />
    </a>
  );
}

const host = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");

/* ── stops ── */

export function OriginStop() {
  return (
    <div className="space-y-6">
      <Kicker n="00">Origin</Kicker>
      <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.03em] sm:text-7xl">
        Ryder
        <br />
        Tetreault
      </h1>
      <p className="text-lg text-accent sm:text-xl">{PROFILE.title}</p>
      <p className="max-w-md leading-relaxed text-text-muted">{PROFILE.tagline}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 font-mono text-[11px] uppercase tracking-[0.3em]">
        <span className="text-text-faint">Scroll to dive in ↓</span>
        {/* The same content as a plain page, like the live site: no flight, no WebGL. */}
        <Link
          href="/classic"
          className="border-b border-text-faint/40 pb-0.5 text-text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Skip the animation →
        </Link>
      </div>
    </div>
  );
}

/** About, beside the three currents: the text on one side, a group of skills per current on the other. */
export function AboutText() {
  return (
    <div className="space-y-5">
      <Kicker n="01">About</Kicker>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Building where AI does real work.</h2>
      <p className="leading-relaxed text-text-muted sm:text-[16px]">{PROFILE.about}</p>
      <ul className="space-y-2 border-l border-foreground/15 pl-4">
        {PROFILE.focus.map(([k, v], i) => (
          <li key={k} className="text-[15px] leading-snug">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: accent(i + 1) }}>
              {k}
            </span>
            <span className="mx-2 text-text-faint">·</span>
            <span className="text-text-muted">{v}</span>
          </li>
        ))}
      </ul>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-faint">{PROFILE.location}</p>
    </div>
  );
}

export function SkillsHead() {
  return (
    <div className="space-y-3">
      <Kicker n="03">Skills</Kicker>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Core competencies</h2>
      <p className="max-w-sm leading-relaxed text-text-muted">
        Three currents, one toolkit: {SKILLS.reduce((n, g) => n + g.items.length, 0)} skills across AI, engineering and
        security, each pouring in from its own lane.
      </p>
    </div>
  );
}

/** A short bullet list, each point on an accent dot. */
export function Points({ items, color, className = "" }: { items: string[]; color: string; className?: string }) {
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-[15px] leading-snug text-text-muted">
          <span aria-hidden className="mt-[0.5em] h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: color }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** A small mono tag (Current, Promoted, Degree...). */
export function Tag({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-sm border px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{ color, borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}
    >
      {children}
    </span>
  );
}

export function ExperienceStop({ exp, k, n }: { exp: Experience; k: number; n: number }) {
  const c = accent(SWELL.colors[k]);
  return (
    <div className="space-y-6">
      <Kicker n="02" color={SWELL.colors[k]}>
        Experience · {k + 1} of {n}
      </Kicker>
      <div className="flex items-center gap-4">
        {exp.logo ? (
          <CompanyLogo src={exp.logo} alt={exp.company} className="h-11 w-11 rounded-lg" />
        ) : (
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-semibold"
            style={{ color: c, borderColor: `color-mix(in srgb, ${c} 50%, transparent)` }}
          >
            {exp.company
              .split(" ")
              .map((w) => w[0])
              .join("")}
          </span>
        )}
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{exp.company}</h2>
          <p className="mt-1.5 font-mono text-xs uppercase tracking-[0.18em] text-text-faint">
            {exp.date}
            <span className="mx-2 opacity-50">/</span>
            {exp.location}
            {exp.roles.length > 1 && (
              <>
                <span className="mx-2 opacity-50">/</span>
                {exp.roles.length} roles
              </>
            )}
          </p>
        </div>
      </div>
      {/* The roles on a rail, newest first: a filled node for the current role, a hollow one for past roles. */}
      <ol className="relative space-y-5">
        <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px" style={{ background: `color-mix(in srgb, ${c} 35%, transparent)` }} />
        {exp.roles.map((r, j) => {
          const current = r.date.endsWith("Present");
          return (
            <li key={r.role} className="relative pl-8">
              <span
                aria-hidden
                className="absolute left-0 top-[0.45em] h-[11px] w-[11px] rounded-full border"
                style={{ borderColor: c, background: current ? c : "var(--background)" }}
              />
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[17px] font-medium" style={{ color: c }}>
                  {r.role}
                </span>
                {current && <Tag color={c}>Current</Tag>}
                {j > 0 && <Tag color="var(--text-faint)">Promoted ↑</Tag>}
              </p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint">{r.date}</p>
              <Points items={r.points} color={c} className="mt-2.5" />
            </li>
          );
        })}
      </ol>
      <Out href={exp.url}>{host(exp.url)}</Out>
    </div>
  );
}

export function ProjectsHead() {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="space-y-3">
        <Kicker n="04">Projects</Kicker>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Featured work</h2>
      </div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("ocean:all", { detail: true }))}
        className="pointer-events-auto inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-foreground underline decoration-accent/60 underline-offset-[6px] transition-colors hover:text-accent"
      >
        All projects →
      </button>
    </div>
  );
}

/**
 * 05, beside the ASCII sunset: each credential on the horizon line, the sun (☼) marking the
 * latest; the school's mark in one colour.
 */
export function EducationStop() {
  const c = accent(2);
  const latest = EDUCATION.length - 1;
  return (
    <div className="space-y-7">
      <Kicker n="05" color={2}>
        Education
      </Kicker>
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Where the foundation was laid.</h2>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-faint">
          {EDUCATION[0].school}
          <span className="mx-2 opacity-50">/</span>
          {EDUCATION.length} credentials
        </p>
      </div>
      <ol className="space-y-6">
        {EDUCATION.map((e, i) => (
          <li key={e.title} className="space-y-3">
            {/* the horizon: a rule with the date on it, the sun on the latest */}
            <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: c }}>
              <span aria-hidden>{i === latest ? "☼" : "·"}</span>
              <span>{e.date}</span>
              <span aria-hidden className="h-px flex-1" style={{ background: `linear-gradient(to right, color-mix(in srgb, ${c} 55%, transparent), transparent)` }} />
            </p>
            <div className="flex gap-4">
              {e.mark === "auburn" && <AuburnMark className="mt-1 h-auto w-12 shrink-0 self-start text-foreground" />}
              <div className="min-w-0 space-y-1">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xl font-semibold tracking-tight sm:text-2xl">{e.title}</span>
                  <Tag color={c}>{e.kind}</Tag>
                </p>
                <p className="text-text-muted">{e.detail}</p>
                <Points items={e.points} color={c} className="pt-1.5" />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <Out href="/resume">
        <FileText size={13} /> Resume
      </Out>
    </div>
  );
}

/* ── 06: the deep ── */

/** The route, top to bottom, as a depth gauge: every stop on the way down, and where you are. */
const GAUGE: { n: string; label: string; note: string; id: string | null }[] = [
  { n: "00", label: NAMES["00"], note: "Where the dive started", id: null },
  { n: "01", label: NAMES["01"], note: "About · who I am, what I build", id: "about" },
  { n: "02", label: NAMES["02"], note: `Experience · ${EXPERIENCES.map((e) => e.company).join(" · ")}`, id: "experience" },
  { n: "03", label: NAMES["03"], note: "Skills · core competencies", id: "skills" },
  { n: "04", label: NAMES["04"], note: "Projects · featured work", id: "projects" },
  { n: "05", label: NAMES["05"], note: `Education · ${EDUCATION[0].title}`, id: "education" },
];

/** Gentle bob, like something floating (still under reduce-motion). */
function Float({ i, children, className = "" }: { i: number; children: ReactNode; className?: string }) {
  const [still] = useState(() => typeof document === "undefined" || document.documentElement.classList.contains("reduce-motion"));
  return (
    <motion.div
      data-ocean-quiet
      animate={still ? undefined : { y: [0, -9, 0] }}
      transition={{ duration: 6 + i * 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.9 }}
      className={`pointer-events-auto ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** One of 06's ways on: a tile on a soft shadow that opens its lightbox. */
function Card({ i, href, path, title, note, items }: { i: number; href: string; path: string; title: string; note: string; items: string[] }) {
  const shade = "color-mix(in srgb, var(--background) 82%, transparent)";
  return (
    <Float i={i} className="w-full lg:w-56">
      <Link
        href={href}
        scroll={false}
        className="group block p-5 transition-transform duration-300 hover:-translate-y-1"
        style={{ background: shade, boxShadow: `0 0 48px 24px ${shade}` }}
      >
        <p className="flex items-center justify-between font-mono text-[11px] tracking-[0.12em] text-text-faint">
          <span>
            <span style={{ color: accent(i + 1) }}>●</span> {path}
          </span>
          <ArrowUpRight size={15} className="transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
        </p>
        <h3 className="mt-4 text-xl font-semibold tracking-tight transition-colors group-hover:text-accent">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{note}</p>
        <ul className="mt-3 space-y-1 border-t border-foreground/10 pt-3 font-mono text-[11px] tracking-[0.04em] text-text-faint">
          {items.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full" style={{ background: accent(i + 1) }} />
              {t}
            </li>
          ))}
        </ul>
      </Link>
    </Float>
  );
}

/** 06, under the sea: the bottom of the route, laid out as a guide back to everything else. */
export function DeepStop() {
  const at = (id: string | null) => (id ? (SECTIONS.find((s) => s.id === id)?.u ?? 0) : 0);
  return (
    <div className="flex h-full flex-col gap-10 overflow-y-auto pb-6 lg:block lg:overflow-visible lg:pb-0">
      {/* where you are, and the way back up */}
      <div className="pointer-events-auto space-y-8 lg:absolute lg:left-0 lg:top-0 lg:w-[min(30rem,36vw)]">
        <div data-ocean-quiet className="space-y-4">
          <Kicker n="06">Contact</Kicker>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">You&apos;ve reached the bottom.</h2>
          <p className="leading-relaxed text-text-muted sm:text-[16px]">
            That&apos;s the whole route. Head back up to any stop, or go on to the rest of the site.
          </p>
        </div>

        <nav data-ocean-quiet aria-label="The route" className="relative">
          <span className="absolute bottom-[18px] left-[5px] top-[18px] w-px bg-foreground/25" />
          <ul className="space-y-1">
            {GAUGE.map((g) => (
              <li key={g.n}>
                <button
                  onClick={() => jumpTo(at(g.id))}
                  className="group relative flex w-full items-baseline gap-4 py-1.5 pl-7 text-left"
                >
                  <span className="absolute left-0 top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full border border-foreground/40 bg-background transition-colors group-hover:border-accent group-hover:bg-accent" />
                  <span className="w-6 shrink-0 font-mono text-[11px] text-text-faint">{g.n}</span>
                  <span className="shrink-0 font-mono text-xs uppercase tracking-[0.18em] text-foreground transition-colors group-hover:text-accent">
                    {g.label}
                  </span>
                  <span className="hidden truncate text-sm text-text-faint sm:inline">{g.note}</span>
                  <ArrowUp size={13} className="ml-auto shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </li>
            ))}
            <li className="relative flex items-baseline gap-4 py-1.5 pl-7">
              <span className="absolute left-0 top-1/2 flex h-[11px] w-[11px] -translate-y-1/2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-[11px] w-[11px] rounded-full bg-accent" />
              </span>
              <span className="w-6 shrink-0 font-mono text-[11px] text-accent">06</span>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent">{NAMES["06"]}</span>
              <span className="text-sm text-text-faint">You are here</span>
            </li>
          </ul>
        </nav>
      </div>

      {/* The same content as a plain page (no flight, no WebGL), bobbing at the bottom. */}
      <Float i={3} className="self-center lg:absolute lg:bottom-4 lg:left-0">
        <Link
          href="/classic"
          className="group inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.3em] text-white transition-opacity hover:opacity-70"
        >
          View the full site
          <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </Float>

      {/* the rest of the site, floating */}
      <div className="flex flex-col gap-8 lg:absolute lg:bottom-4 lg:right-6 lg:flex-row lg:gap-10">
        <Card i={0} href="/projects" path="~/projects" title="Projects" note="Everything I've built, professional work first." items={["Write-ups and screenshots", "Live sites and App Store", "Source where public"]} />
        <Card i={1} href="/resume" path="~/resume" title="Resume" note="Roles, skills and education on one page." items={["Experience and promotions", "Skills by area", "Education and labs"]} />
        <Card i={2} href="/contact" path="~/contact" title="Contact" note="Email, GitHub and LinkedIn. Email is fastest." items={["Email, one-click copy", "GitHub", "LinkedIn"]} />
      </div>
    </div>
  );
}

export { EXPERIENCES };
