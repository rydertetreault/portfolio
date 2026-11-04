"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Github, Linkedin, Mail, FileText, Lock } from "lucide-react";
import CompanyLogo from "@/components/CompanyLogo";
import AppleIcon from "@/components/icons/AppleIcon";
import Lightbox from "@/components/Lightbox";
import HudText from "./HudText";
import { EDUCATION, PROFILE, SKILLS, type Experience } from "@/data/profile";
import type { GitHubRepo } from "@/lib/github";
import { formatDateRange, formatRepoName } from "@/lib/utils";

const WARM = "#d3b75b";

/* ───────────── shared bits ───────────── */

/** Mono kicker line ("MISSION 02 · THE SWELL"). */
export function Kicker({ children, warm }: { children: ReactNode; warm?: boolean }) {
  return (
    <div
      className="font-mono text-[11px] uppercase tracking-[0.3em]"
      style={{ color: warm ? WARM : "var(--accent)" }}
    >
      {children}
    </div>
  );
}

/** CoD-style corner brackets around a block. */
export function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  const c = "pointer-events-none absolute h-3 w-3 border-text-faint/50";
  return (
    <div className={`relative ${className}`}>
      <span className={`${c} -left-4 -top-4 border-l border-t`} />
      <span className={`${c} -right-4 -top-4 border-r border-t`} />
      <span className={`${c} -bottom-4 -left-4 border-b border-l`} />
      <span className={`${c} -bottom-4 -right-4 border-b border-r`} />
      {children}
    </div>
  );
}

const linkCls =
  "inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-text-muted transition-colors hover:text-accent";

function LocalTime() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString("en-US", { hour12: false, timeZone: "America/Chicago" }) + " CT");
    f();
    const id = window.setInterval(f, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <>{t || "--:--:--"}</>;
}

/* ───────────── 00 origin ───────────── */

export function HeroCard({ active }: { active: boolean }) {
  return (
    <div className="space-y-5">
      <Kicker>
        <HudText text="00 / Origin" active={active} />
      </Kicker>
      <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
        <HudText text={PROFILE.name} active={active} delay={120} />
      </h1>
      <p className="font-medium text-accent">
        <HudText text={PROFILE.title} active={active} delay={350} />
      </p>
      <p className="max-w-md text-sm leading-relaxed text-text-faint">{PROFILE.tagline}</p>
      <p className="pt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">
        <span className="animate-pulse">[ scroll to deploy ↓ ]</span>
      </p>
    </div>
  );
}

/** Insertion log during the dive. */
export function InsertionLog({ active }: { active: boolean }) {
  return (
    <div className="space-y-1.5 font-mono text-xs uppercase tracking-[0.2em] text-foreground/80">
      <div>
        <HudText text="> uplink established" active={active} />
      </div>
      <div>
        <HudText text="> target   rydertetreault.dev" active={active} delay={300} />
      </div>
      <div style={{ color: WARM }}>
        <HudText text="> descending to surface ..." active={active} delay={650} />
      </div>
    </div>
  );
}

/* ───────────── 01 the surface ───────────── */

export function AboutCard({ active }: { active: boolean }) {
  return (
    <Frame className="space-y-6">
      <div className="space-y-1.5 font-mono text-xs uppercase tracking-[0.25em]">
        <Kicker>
          <HudText text="Mission 01" active={active} />
        </Kicker>
        <h2 className="text-2xl normal-case tracking-tight text-foreground sm:text-3xl">
          <HudText text="“The Surface”" active={active} delay={200} />
        </h2>
        <div className="text-text-faint">
          Day 1 — <LocalTime />
        </div>
        <div className="text-text-faint">
          <HudText text={PROFILE.location} active={active} delay={600} />
        </div>
      </div>
      <p className="text-[15px] leading-relaxed text-foreground/85">{PROFILE.about}</p>
    </Frame>
  );
}

/* ───────────── 02 the swell ───────────── */

export function ExperienceCard({
  exp,
  index,
  total,
  active,
}: {
  exp: Experience;
  index: number;
  total: number;
  active: boolean;
}) {
  return (
    <Frame className="space-y-5">
      <div className="space-y-1.5 font-mono text-xs uppercase tracking-[0.25em]">
        <Kicker warm>
          <HudText text={`Mission 02 · The Swell · ${index + 1}/${total}`} active={active} />
        </Kicker>
        <h2 className="text-2xl normal-case tracking-tight text-foreground sm:text-3xl">
          <HudText text={exp.company} active={active} delay={180} />
        </h2>
        <div className="text-text-faint">
          <HudText text={exp.date} active={active} delay={380} />
        </div>
      </div>
      <ol className="space-y-4">
        {exp.roles.map((r, i) => (
          <li key={r.role} className="relative border-l border-text-faint/30 pl-5">
            <span
              aria-hidden
              className={`absolute -left-[4px] top-[7px] h-[7px] w-[7px] rounded-full ${
                i === 0 ? "bg-accent" : "bg-text-faint"
              }`}
            />
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h3 className="text-base font-semibold text-accent">{r.role}</h3>
              {exp.roles.length > 1 && <span className="text-xs text-text-faint">{r.date}</span>}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">{r.description}</p>
          </li>
        ))}
      </ol>
      <a href={exp.url} target="_blank" rel="noreferrer" className={linkCls}>
        [ visit {exp.url.replace(/^https?:\/\//, "")} <ArrowUpRight size={12} /> ]
      </a>
    </Frame>
  );
}

/* ───────────── 03 waypoints ───────────── */

export function ProjectCard({
  repo,
  index,
  total,
  active,
  warm,
}: {
  repo: GitHubRepo;
  index: number;
  total: number;
  active: boolean;
  warm: boolean;
}) {
  const [shot, setShot] = useState<number | null>(null);
  const name = formatRepoName(repo.name);
  const shots = repo.screenshots ?? [];
  const live = repo.appStore ?? repo.homepage ?? null;
  return (
    <Frame className="space-y-4">
      <Kicker warm={warm}>
        <HudText
          text={`Waypoint 03.${index + 1} / ${String(total).padStart(2, "0")} · ${repo.category ?? "Personal"}`}
          active={active}
        />
      </Kicker>
      <div className="flex items-center gap-3">
        {repo.logo && <CompanyLogo src={repo.logo.src} alt={repo.logo.alt} className="h-7 w-7" />}
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <HudText text={name} active={active} delay={150} />
        </h2>
      </div>
      {repo.subtitle && <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">{repo.subtitle}</p>}
      {repo.description && <p className="text-sm leading-relaxed text-foreground/85">{repo.description}</p>}

      {shots.length > 0 && (
        <button
          onClick={() => setShot(0)}
          className="group relative block w-full max-w-sm overflow-hidden border border-border-theme/70 text-left"
          aria-label={`Open ${name} screenshots`}
        >
          <Image
            src={shots[0]}
            alt={`${name} screenshot`}
            width={640}
            height={400}
            className="aspect-[16/10] h-auto w-full object-cover object-top opacity-80 transition-opacity group-hover:opacity-100"
          />
          <span className="absolute bottom-0 left-0 right-0 flex justify-between bg-background/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-text-faint">
            <span>Intel feed</span>
            <span className="text-accent">
              {shots.length} frame{shots.length > 1 ? "s" : ""} ▸
            </span>
          </span>
        </button>
      )}

      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-faint">
        {formatDateRange(repo.created_at, repo.pushed_at)}
        {repo.language && <> · {repo.language}</>}
        {repo.private && (
          <span className="ml-2 inline-flex items-center gap-1">
            · <Lock size={10} /> private
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {live && (
          <a href={live} target="_blank" rel="noreferrer" className={linkCls}>
            [ {repo.appStore ? <AppleIcon size={12} /> : null}
            {repo.appStore ? "app store" : "open site"} <ArrowUpRight size={12} /> ]
          </a>
        )}
        {repo.html_url && !repo.private && (
          <a href={repo.html_url} target="_blank" rel="noreferrer" className={linkCls}>
            [ <Github size={12} /> source ]
          </a>
        )}
        <Link href={`/projects#${repo.name}`} className={linkCls}>
          [ full dossier → ]
        </Link>
      </div>

      {shots.length > 0 && (
        <Lightbox images={shots} alt={name} index={shot} onClose={() => setShot(null)} onIndexChange={setShot} />
      )}
    </Frame>
  );
}

/* ───────────── 04 the current ───────────── */

export function SkillsCard({ active }: { active: boolean }) {
  return (
    <Frame className="space-y-6">
      <div className="space-y-1.5">
        <Kicker>
          <HudText text="Mission 04 · Caught in the current" active={active} />
        </Kicker>
        <h2 className="text-2xl tracking-tight sm:text-3xl">
          <HudText text="The Current" active={active} delay={180} />
        </h2>
        <p className="text-sm text-text-faint">What I work with, every day.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {SKILLS.map((g, gi) => (
          <div key={g.title} className="space-y-3">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
              <HudText text={g.title} active={active} delay={300 + gi * 150} />
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {g.items.map((s) => (
                <li
                  key={s}
                  className="border border-border-theme/70 bg-background/40 px-2 py-1 font-mono text-[11px] text-foreground/85 transition-colors hover:border-accent hover:text-accent"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ───────────── 05 the harbor ───────────── */

export function EducationCard({ active }: { active: boolean }) {
  return (
    <Frame className="space-y-6">
      <div className="space-y-1.5">
        <Kicker warm>
          <HudText text="Mission 05 · Home port" active={active} />
        </Kicker>
        <h2 className="text-2xl tracking-tight sm:text-3xl">
          <HudText text="The Harbor" active={active} delay={180} />
        </h2>
        <p className="text-sm text-text-faint">Where the journey started.</p>
      </div>
      <ul className="space-y-5">
        {EDUCATION.map((e, i) => (
          <li key={e.title} className="relative border-l border-text-faint/30 pl-5">
            <span aria-hidden className="absolute -left-[4px] top-[7px] h-[7px] w-[7px] rounded-full bg-accent" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-text-faint">
              <HudText text={e.date} active={active} delay={350 + i * 200} />
            </p>
            <h3 className="text-lg font-semibold">{e.title}</h3>
            <p className="text-sm text-text-muted">{e.detail}</p>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/* ───────────── 06 the map ───────────── */

export function MapCard({ active }: { active: boolean }) {
  return (
    <div className="space-y-3 text-center">
      <Kicker>
        <HudText text="06 / The Map" active={active} />
      </Kicker>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        <HudText text="Every stop is a wave in the same sea." active={active} delay={200} />
      </h2>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-text-faint">
        <span className="hidden [@media(hover:hover)]:inline">Move to scan the water · </span>Select a waypoint to travel
      </p>
    </div>
  );
}

/* ───────────── 07 the deep ───────────── */

export function ContactCard({ active, onSurface }: { active: boolean; onSurface: () => void }) {
  const btn =
    "inline-flex items-center gap-3 border border-border-theme bg-background/40 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/85 transition-colors hover:border-accent hover:text-accent";
  return (
    <Frame className="space-y-7">
      <div className="space-y-1.5">
        <Kicker>
          <HudText text="07 / The Deep" active={active} />
        </Kicker>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <HudText text="Signal received." active={active} delay={200} />
        </h2>
        <p className="max-w-md text-base leading-relaxed text-text-muted">
          Interested in working together or just want to connect? Feel free to reach out.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a href={`mailto:${PROFILE.links.email}`} className={btn}>
          <Mail size={14} /> {PROFILE.links.email}
        </a>
        <a href={PROFILE.links.linkedin} target="_blank" rel="noreferrer" className={btn}>
          <Linkedin size={14} /> LinkedIn
        </a>
        <a href={PROFILE.links.github} target="_blank" rel="noreferrer" className={btn}>
          <Github size={14} /> GitHub
        </a>
        <Link href="/resume" className={btn}>
          <FileText size={14} /> Full resume
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-theme/50 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-text-faint">
        <span>© {new Date().getFullYear()} Ryder Tetreault</span>
        <button onClick={onSurface} className="uppercase tracking-[0.2em] hover:text-accent">
          ↑ Surface (back to origin)
        </button>
      </div>
    </Frame>
  );
}
