"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpRight, Check, Copy, Github, Linkedin, Mail } from "lucide-react";
import type { GitHubRepo } from "@/lib/github";
import ProjectsList from "@/components/ProjectsList";
import { EDUCATION, PROFILE } from "@/data/profile";
import { cyber, experience, skills } from "@/app/(ocean)/resume/data";
import { BoxHead } from "./ShadeBox";

const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const label = "font-mono text-[11px] uppercase tracking-[0.22em] text-text-faint";

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-text-muted transition-colors hover:text-accent"
    >
      {children}
      <ArrowUpRight size={12} />
    </a>
  );
}

/* ── /projects ── */

/** The live site's projects list (filter, write-ups, screenshot strip + viewer), in the box. */
export function ProjectsBox({ repos }: { repos: GitHubRepo[] }) {
  return (
    <>
      <BoxHead title="Projects">Things I&apos;ve built, professional work first.</BoxHead>
      <ProjectsList repos={repos} />
    </>
  );
}

/* ── /resume ── */

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-foreground/10 py-8 sm:grid-cols-[9rem_1fr] sm:gap-8">
      <h2 className={label}>{title}</h2>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

export function ResumeBox() {
  const l = PROFILE.links;
  return (
    <>
      <header className="mb-10 space-y-3">
        <h1 className="text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">{PROFILE.name}</h1>
        <p className="text-text-muted">{PROFILE.title}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
          <span className="font-mono text-xs text-text-faint">{PROFILE.location}</span>
          <a href={`mailto:${l.email}`} className="font-mono text-xs text-text-muted transition-colors hover:text-accent">
            {l.email}
          </a>
          <Ext href={l.github}>{host(l.github)}</Ext>
          <Ext href={l.linkedin}>{host(l.linkedin)}</Ext>
        </div>
      </header>

      <Row title="Experience">
        {experience.map((e) => (
          <div key={e.company} className="space-y-4">
            <p className="flex items-baseline justify-between gap-4">
              <span className="text-lg font-semibold tracking-tight">{e.company}</span>
              <span className="font-mono text-[11px] text-text-faint">{e.location}</span>
            </p>
            {e.roles.map((r) => (
              <div key={r.role} className="space-y-2">
                <p className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-accent">{r.role}</span>
                    {r.date.endsWith("Present") && (
                      <span className="rounded-sm border border-accent/45 px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-text-faint">{r.date}</span>
                </p>
                <ul className="space-y-1.5">
                  {r.bullets.map((b) => (
                    <li key={b} className="relative pl-4 text-sm leading-relaxed text-text-muted before:absolute before:left-0 before:top-[0.6em] before:h-[5px] before:w-[5px] before:rounded-full before:bg-accent">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </Row>

      <Row title="Skills">
        <dl className="space-y-3">
          {skills.map((s) => (
            <div key={s.label} className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-4">
              <dt className="text-sm font-medium">{s.label}</dt>
              <dd className="text-sm leading-relaxed text-text-muted">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Row>

      <Row title="Education">
        {EDUCATION.map((e) => (
          <div key={e.title}>
            <p className="flex items-baseline justify-between gap-4">
              <span className="font-semibold">{e.title}</span>
              <span className="font-mono text-[11px] text-text-faint">{e.date}</span>
            </p>
            <p className="mt-0.5 text-sm text-text-muted">{e.detail}</p>
          </div>
        ))}
        <div className="space-y-2">
          <p className="flex items-baseline justify-between gap-4">
            <span className="font-semibold">{cyber.title}</span>
            <span className="font-mono text-[11px] text-text-faint">{cyber.context}</span>
          </p>
          <ul className="space-y-1.5">
            {cyber.bullets.map((b) => (
              <li key={b} className="relative pl-4 text-sm leading-relaxed text-text-muted before:absolute before:left-0 before:top-[0.6em] before:h-[5px] before:w-[5px] before:rounded-full before:bg-accent">
                {b}
              </li>
            ))}
          </ul>
        </div>
      </Row>
    </>
  );
}

/* ── /contact ── */

export function ContactBox() {
  const l = PROFILE.links;
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard?.writeText(l.email).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  const other = [
    { icon: Github, name: "GitHub", href: l.github },
    { icon: Linkedin, name: "LinkedIn", href: l.linkedin },
  ];
  return (
    <>
      <BoxHead title="Get in touch">Open to roles and projects. Email is the fastest way to reach me.</BoxHead>

      <div className="mb-8 -mt-6 space-y-2">
        <p className={label}>Open to</p>
        <ul className="flex flex-wrap gap-2">
          {["AI integration", "Product engineering", "Security"].map((t) => (
            <li key={t} className="rounded-sm border border-accent/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-y border-foreground/10 py-6">
        <a href={`mailto:${l.email}`} className="group inline-flex min-w-0 items-center gap-3 text-xl font-medium tracking-tight transition-colors hover:text-accent sm:text-2xl">
          <Mail size={20} className="shrink-0 text-accent" />
          <span className="truncate">{l.email}</span>
        </a>
        <button
          onClick={copy}
          className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted transition-colors hover:text-accent"
        >
          {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <ul>
        {other.map(({ icon: Icon, name, href }) => (
          <li key={name}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 border-b border-foreground/10 py-5 transition-colors hover:text-accent"
            >
              <Icon size={18} className="text-text-faint transition-colors group-hover:text-accent" />
              <span className="font-medium">{name}</span>
              <span className="truncate font-mono text-xs text-text-faint">{host(href)}</span>
              <ArrowUpRight size={15} className="ml-auto text-text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </li>
        ))}
      </ul>
      <p className={`${label} mt-8`}>{PROFILE.location}</p>
    </>
  );
}
