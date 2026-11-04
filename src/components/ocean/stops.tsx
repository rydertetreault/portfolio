"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, Github, Linkedin, Lock, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { EDUCATION, EXPERIENCES, PROFILE, SKILLS, type Experience } from "@/data/profile";
import { CURRENTS, EDDIES, SWELL } from "./world";
import type { GitHubRepo } from "@/lib/github";
import { formatRepoName } from "@/lib/utils";

/* ── shared type ── */

/** Accent n (1..3): the colour shared by a stop's item in the water and its text. */
export const accent = (n: number) => `var(--ocean-a${n})`;

/** A short run of the item's glyphs, in its colour: the visual link to the water. */
function Mark({ n, glyph = "≈" }: { n: number; glyph?: string }) {
  return (
    <span aria-hidden className="mr-2 font-mono tracking-[0.1em]" style={{ color: accent(n) }}>
      {glyph.repeat(3)}
    </span>
  );
}

export function Kicker({ n, children, color = 1 }: { n: string; children: ReactNode; color?: number }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">
      <span style={{ color: accent(color) }}>{n}</span>
      <span className="mx-2 opacity-50">/</span>
      {children}
    </p>
  );
}

function Out({ href, children }: { href: string; children: ReactNode }) {
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
      <p className="pt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">Scroll to dive in ↓</p>
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
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-faint">{PROFILE.location}</p>
    </div>
  );
}

export function SkillsText() {
  return (
    <div className="space-y-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">Three currents</p>
      {SKILLS.map((g, i) => (
        <div key={g.title} className="space-y-1">
          <p className="text-[17px] font-medium" style={{ color: accent(CURRENTS.colors[i]) }}>
            <Mark n={CURRENTS.colors[i]} />
            {g.title}
          </p>
          <p className="text-[15px] leading-relaxed text-text-muted">{g.items.join(" · ")}</p>
        </div>
      ))}
    </div>
  );
}

export function ExperienceStop({ exp, k, n }: { exp: Experience; k: number; n: number }) {
  return (
    <div className="space-y-5">
      <Kicker n="02" color={SWELL.colors[k]}>
        Experience · {k + 1} of {n}
      </Kicker>
      <div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <Mark n={SWELL.colors[k]} glyph="~" />
          {exp.company}
        </h2>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-text-faint">{exp.date}</p>
      </div>
      <div className="space-y-5">
        {exp.roles.map((r) => (
          <div key={r.role} className="space-y-1.5">
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 text-[17px] font-medium">
              <span style={{ color: accent(SWELL.colors[k]) }}>{r.role}</span>
              {exp.roles.length > 1 && <span className="font-mono text-xs text-text-faint">{r.date}</span>}
            </p>
            <p className="leading-relaxed text-text-muted">{r.description}</p>
          </div>
        ))}
      </div>
      <Out href={exp.url}>{host(exp.url)}</Out>
    </div>
  );
}

export function ProjectStop({ repo, k, n }: { repo: GitHubRepo; k: number; n: number }) {
  const desc = repo.longDescription ?? repo.description ?? "";
  return (
    <div className="space-y-5">
      <Kicker n="03" color={EDDIES[k].color}>
        Projects · {k + 1} of {n}
      </Kicker>
      <div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <Mark n={EDDIES[k].color} glyph="@" />
          {formatRepoName(repo.name)}
        </h2>
        {repo.subtitle && (
          <p className="mt-1 text-[17px]" style={{ color: accent(EDDIES[k].color) }}>
            {repo.subtitle}
          </p>
        )}
      </div>
      <p className="line-clamp-6 leading-relaxed text-text-muted">{desc}</p>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-faint">
        {[repo.language, repo.private ? "private" : null, new Date(repo.created_at).getFullYear()]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Out href={`/projects#${repo.name}`}>Details</Out>
        {repo.homepage && <Out href={repo.homepage}>{host(repo.homepage)}</Out>}
        {!repo.private && !repo.homepage && <Out href={repo.html_url}>Source</Out>}
        {repo.private && !repo.homepage && (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-text-faint">
            <Lock size={12} /> Private repo
          </span>
        )}
      </div>
      {k === n - 1 && (
        <div className="pt-2">
          <Out href="/projects">All projects →</Out>
        </div>
      )}
    </div>
  );
}

export function EducationStop() {
  return (
    <div className="space-y-6">
      <Kicker n="04" color={2}>
        Education
      </Kicker>
      <p className="max-w-md leading-relaxed text-text-muted">Calm water, a clear horizon: where it all started.</p>
      <div className="space-y-5">
        {EDUCATION.map((e) => (
          <div key={e.title}>
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
              <Mark n={2} glyph="*" />
              {e.title}
            </p>
            <p className="mt-1 text-text-muted">{e.detail}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-text-faint">{e.date}</p>
          </div>
        ))}
      </div>
      <Out href="/resume">
        <FileText size={13} /> Resume
      </Out>
    </div>
  );
}

export function ContactStop() {
  return (
    <div className="space-y-4 text-center">
      <Kicker n="05">Contact</Kicker>
      <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Let&apos;s <span style={{ color: accent(1) }}>talk</span>.
      </h2>
      <p className="text-text-muted">Scroll into the whirlpool ↓</p>
    </div>
  );
}

/** The /contact lightbox. */
export function ContactDetails() {
  const l = PROFILE.links;
  const row = "group flex items-center gap-4 border-b border-border-theme/50 py-5 transition-colors hover:text-accent";
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      <div className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">
          <span className="text-accent">$</span> cat ~/contact
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Let&apos;s talk.</h1>
        <p className="max-w-lg leading-relaxed text-text-muted">
          Open to roles and projects in AI integration, product engineering and security. Email is the fastest way to reach
          me.
        </p>
      </div>
      <div className="text-lg">
        <a href={`mailto:${l.email}`} className={row}>
          <Mail size={18} className="text-accent" /> {l.email}
        </a>
        <a href={l.github} target="_blank" rel="noopener noreferrer" className={row}>
          <Github size={18} className="text-accent" /> github.com/rydertetreault <ArrowUpRight size={14} />
        </a>
        <a href={l.linkedin} target="_blank" rel="noopener noreferrer" className={row}>
          <Linkedin size={18} className="text-accent" /> linkedin.com/in/ryder-tetreault <ArrowUpRight size={14} />
        </a>
        <Link href="/resume" scroll={false} className={row}>
          <FileText size={18} className="text-accent" /> Resume
        </Link>
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-faint">{PROFILE.location}</p>
    </div>
  );
}

export { EXPERIENCES };
