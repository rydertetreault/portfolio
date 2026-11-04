"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, Github, Linkedin, Lock, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { EDUCATION, EXPERIENCES, PROFILE, SKILLS, type Experience } from "@/data/profile";
import type { GitHubRepo } from "@/lib/github";
import { formatRepoName } from "@/lib/utils";

/* ── shared type ── */

export function Kicker({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">
      <span className="text-accent">{n}</span>
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
    <Link href={href} className={cls}>
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

export function AboutStop() {
  return (
    <div className="space-y-5">
      <Kicker n="01">About</Kicker>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Building where AI does real work.</h2>
      <p className="leading-relaxed text-text-muted sm:text-[17px]">{PROFILE.about}</p>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-faint">{PROFILE.location}</p>
    </div>
  );
}

export function ExperienceStop({ exp, k, n }: { exp: Experience; k: number; n: number }) {
  return (
    <div className="space-y-5">
      <Kicker n="02">
        Experience · {k + 1} of {n}
      </Kicker>
      <div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{exp.company}</h2>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-text-faint">{exp.date}</p>
      </div>
      <div className="space-y-5">
        {exp.roles.map((r) => (
          <div key={r.role} className="space-y-1.5">
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 text-[17px] font-medium">
              <span className="text-accent">{r.role}</span>
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
      <Kicker n="03">
        Projects · {k + 1} of {n}
      </Kicker>
      <div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{formatRepoName(repo.name)}</h2>
        {repo.subtitle && <p className="mt-1 text-[17px] text-accent">{repo.subtitle}</p>}
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

export function SkillsStop() {
  return (
    <div className="space-y-6">
      <Kicker n="04">Skills</Kicker>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Three currents.</h2>
      <div className="space-y-5">
        {SKILLS.map((g) => (
          <div key={g.title} className="space-y-1.5">
            <p className="text-[17px] font-medium text-accent">{g.title}</p>
            <p className="leading-relaxed text-text-muted">{g.items.join(" · ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EducationStop() {
  return (
    <div className="space-y-6">
      <Kicker n="05">Education</Kicker>
      <div className="space-y-5">
        {EDUCATION.map((e) => (
          <div key={e.title}>
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{e.title}</p>
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
  const l = PROFILE.links;
  return (
    <div className="space-y-6 text-center">
      <Kicker n="06">Contact</Kicker>
      <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Let&apos;s talk.</h2>
      <a
        href={`mailto:${l.email}`}
        className="block text-lg text-foreground underline decoration-accent/60 underline-offset-[6px] hover:text-accent sm:text-xl"
      >
        {l.email}
      </a>
      <div className="flex justify-center gap-6 text-text-muted">
        <a href={l.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-accent">
          <Github size={20} />
        </a>
        <a href={l.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-accent">
          <Linkedin size={20} />
        </a>
        <a href={`mailto:${l.email}`} aria-label="Email" className="hover:text-accent">
          <Mail size={20} />
        </a>
        <Link href="/resume" aria-label="Resume" className="hover:text-accent">
          <FileText size={20} />
        </Link>
      </div>
    </div>
  );
}

export { EXPERIENCES };
