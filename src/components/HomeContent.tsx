"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Github,
  Linkedin,
  Mail,
  ExternalLink,
  Shield,
  Code2,
  Award,
  BookOpen,
  GraduationCap,
  ArrowRight,
  Star,
  Calendar,
  FileText,
} from "lucide-react";
import type { GitHubRepo } from "@/lib/github";


/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

type SectionId =
  | "about"
  | "experience"
  | "projects"
  | "skills"
  | "education"
  | "resume"
  | "contact";

const softwareSkills = [
  "Python",
  "Java",
  "C",
  "C++",
  "SQL",
  "JavaScript",
  "React",
  "Node.js",
  "Docker",
  "AWS",
  "Linux",
  "Git",
  "REST APIs",
  "Distributed Systems",
];

const cyberSkills = [
  "Wireshark",
  "Nmap",
  "Kali Linux",
  "Burp Suite",
  "Network Forensics",
  "System Hardening",
  "Incident Response",
  "Digital Forensics",
  "Threat Detection",
  "NTFS Analysis",
];

const experiences = [
  {
    date: "2026 - Present",
    company: "Proxima Aerospace",
    role: "Software Engineering Intern",
    description:
      "Developing Python systems for retrieving and processing satellite and astrodynamics data from REST APIs. Supporting distributed data pipelines for mission-critical operations.",
    url: "https://proximaaerospace.com",
  },
  {
    date: "2026 - Present",
    company: "Maha Media",
    role: "Software Developer",
    description:
      "Supporting backend web systems, technical operations, and scalable digital platform infrastructure for media and content delivery.",
    url: "https://mahamedia.us",
  },
];

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Go: "#00ADD8",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
};

function formatRepoName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateRange(created: string, pushed: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  const start = fmt(created);
  const end = fmt(pushed);
  return start === end ? start : `${start} - ${end}`;
}

/* ═══════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════ */

export default function HomeContent({ repos }: { repos: GitHubRepo[] }) {
  const sections = useMemo(
    () =>
      [
        { id: "about", label: "ABOUT" },
        { id: "experience", label: "EXPERIENCE" },
        { id: "projects", label: "PROJECTS" },
        { id: "skills", label: "SKILLS" },
        { id: "education", label: "EDUCATION" },
        { id: "resume", label: "RESUME" },
        { id: "contact", label: "CONTACT" },
      ] as const,
    []
  );

  const [activeId, setActiveId] = useState<SectionId>("about");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const ids = sections.map((s) => s.id) as SectionId[];

    const onScroll = () => {
      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 6;

      if (nearBottom) {
        setActiveId("contact");
        return;
      }

      const triggerY = container.clientHeight * 0.28;
      let current: SectionId = "about";

      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
        if (top <= triggerY) current = id;
      }

      setActiveId(current);
    };

    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [sections]);

  const featuredRepos = repos.slice(0, 4);

  return (
    <main className="relative h-screen text-foreground bg-background overflow-hidden animate-fade-in">
      {/* Diagonal gradient bands */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-50">
        <div
          className="absolute -top-full left-[10%] w-[300px] h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(90deg, transparent, rgba(34,197,94,0.05), transparent)",
          }}
        />
        <div
          className="absolute -top-full right-[20%] w-[220px] h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(90deg, transparent, rgba(34,197,94,0.035), transparent)",
          }}
        />
        <div
          className="absolute -top-full left-[30%] w-px h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(180deg, transparent 10%, rgba(34,197,94,0.20) 50%, transparent 90%)",
          }}
        />
        <div
          className="absolute -top-full right-[35%] w-px h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(180deg, transparent 15%, rgba(34,197,94,0.12) 50%, transparent 85%)",
          }}
        />
      </div>

      <div className="relative h-full flex flex-col lg:flex-row max-w-7xl mx-auto">
        {/* ═══ LEFT PANEL (fixed, never scrolls) ═══ */}
        <aside className="relative hidden lg:flex flex-col justify-center shrink-0 w-[420px] xl:w-[460px] h-full px-12 xl:px-16">
          <div className="space-y-10">
            {/* Profile + Name */}
            <div className="space-y-6">
              <div className="h-24 w-24 rounded-full overflow-hidden border border-border-theme bg-surface-alt">
                <Image
                  src="/profile.jpg"
                  alt="Ryder Tetreault"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl xl:text-5xl font-semibold tracking-tight">
                  Ryder Tetreault
                </h1>
                <p className="text-accent text-base font-medium">
                  Software Engineer · Cyber Defense
                </p>
                <p className="text-text-faint text-sm leading-relaxed max-w-xs">
                  Building secure, scalable systems and software with a focus on
                  cybersecurity engineering and infrastructure defense.
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-6">
              {sections.map((s) => {
                const isActive = activeId === s.id;

                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document
                        .getElementById(s.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={[
                      "flex items-center gap-4 select-none transition-opacity duration-200",
                      isActive ? "opacity-100" : "opacity-60 hover:opacity-100",
                    ].join(" ")}
                  >
                    <span
                      className="h-px bg-text-faint transition-all duration-300"
                      style={{
                        width: isActive ? 64 : 28,
                        opacity: isActive ? 1 : 0.5,
                      }}
                    />
                    <span
                      className="text-xs tracking-[0.3em] font-medium transition-colors duration-300"
                      style={{
                        color: isActive
                          ? "var(--foreground)"
                          : "var(--text-faint)",
                      }}
                    >
                      {s.label}
                    </span>
                  </a>
                );
              })}
            </nav>

            {/* Social links */}
            <div className="flex items-center gap-5">
              <a
                href="https://github.com/rydertetreault"
                target="_blank"
                rel="noreferrer"
                className="text-text-faint hover:text-accent transition-colors"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="https://www.linkedin.com/in/ryder-tetreault"
                target="_blank"
                rel="noreferrer"
                className="text-text-faint hover:text-accent transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="mailto:rydertetreault@gmail.com"
                className="text-text-faint hover:text-accent transition-colors"
                aria-label="Email"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>
        </aside>

        {/* ═══ RIGHT PANEL (only this scrolls) ═══ */}
        <div
          ref={scrollRef}
          className="relative flex-1 h-full overflow-y-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-24"
        >
          {/* Mobile header (shown only on small screens) */}
          <div className="lg:hidden mb-16 space-y-6">
            <div className="h-20 w-20 rounded-full overflow-hidden border border-border-theme bg-surface-alt">
              <Image
                src="/profile.jpg"
                alt="Ryder Tetreault"
                width={80}
                height={80}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Ryder Tetreault
              </h1>
              <p className="text-accent text-base font-medium">
                Software Engineer · Cyber Defense
              </p>
              <p className="text-text-faint text-sm leading-relaxed max-w-xs">
                Building secure, scalable systems and software with a focus on
                cybersecurity engineering and infrastructure defense.
              </p>
            </div>
            <div className="flex items-center gap-5">
              <a href="https://github.com/rydertetreault" target="_blank" rel="noreferrer" className="text-text-faint hover:text-accent transition-colors" aria-label="GitHub"><Github size={18} /></a>
              <a href="https://www.linkedin.com/in/ryder-tetreault" target="_blank" rel="noreferrer" className="text-text-faint hover:text-accent transition-colors" aria-label="LinkedIn"><Linkedin size={18} /></a>
              <a href="mailto:rydertetreault@gmail.com" className="text-text-faint hover:text-accent transition-colors" aria-label="Email"><Mail size={18} /></a>
            </div>
          </div>

          <div className="max-w-2xl space-y-24 sm:space-y-28 lg:space-y-32">
            {/* ─── ABOUT ─── */}
            <Section id="about" title="ABOUT">
              <p className="text-foreground text-lg leading-relaxed">
                I&apos;m a Computer Science & Software Engineering graduate from
                Auburn University. My work focuses on systems design, distributed
                infrastructure, and cybersecurity engineering with long-term goals
                in Systems Engineering and Enterprise Architecture.
              </p>
            </Section>

            {/* ─── EXPERIENCE ─── */}
            <Section id="experience" title="EXPERIENCE">
              <div className="space-y-0">
                {experiences.map((exp) => (
                  <ExperienceCard key={exp.company} experience={exp} />
                ))}
              </div>
            </Section>

            {/* ─── PROJECTS ─── */}
            <Section id="projects" title="PROJECTS">
              <div className="space-y-5">
                {featuredRepos.map((repo) => (
                  <FeaturedProjectCard key={repo.name} repo={repo} />
                ))}
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors mt-6 group"
              >
                View all projects
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </Section>

            {/* ─── SKILLS ─── */}
            <Section id="skills" title="SKILLS">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SkillColumn
                  icon={<Code2 size={18} />}
                  title="Software Engineering"
                  skills={softwareSkills}
                />
                <SkillColumn
                  icon={<Shield size={18} />}
                  title="Cybersecurity"
                  skills={cyberSkills}
                />
              </div>
            </Section>


            {/* ─── EDUCATION & CERTIFICATIONS ─── */}
            <Section id="education" title="EDUCATION & CERTIFICATIONS">
              <div className="space-y-5">
                <div className="rounded-2xl border border-border-theme bg-surface-alt p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-accent-subtle text-accent shrink-0">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <p className="text-sm text-text-faint mb-1">Dec 2025</p>
                      <h3 className="text-lg font-semibold">Auburn University</h3>
                      <p className="text-text-muted text-sm mt-1">
                        B.S. Computer Science & Software Engineering
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="rounded-2xl border border-border-theme bg-surface-alt p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-accent-subtle text-accent shrink-0">
                        <Award size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-semibold">CompTIA Security+</h3>
                          <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            In Progress
                          </span>
                        </div>
                        <p className="text-text-faint text-sm">Preparing for certification exam</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border-theme bg-surface-alt p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-accent-subtle text-accent shrink-0">
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-semibold">Cyber Defense Certificate</h3>
                          <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            In Progress
                          </span>
                        </div>
                        <p className="text-text-faint text-sm">Auburn University · Expected May 2026</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* ─── RESUME ─── */}
            <Section id="resume" title="RESUME">
              <p className="text-text-muted text-base leading-relaxed mb-4">
                A full breakdown of my experience, projects, certifications, and
                technical skills.
              </p>
              <Link
                href="/resume"
                className="inline-flex items-center gap-3 border border-border-theme hover:border-accent bg-surface-alt hover:bg-accent-subtle px-5 py-3 rounded-xl transition-all duration-300 group"
              >
                <FileText size={16} className="text-text-faint group-hover:text-accent transition-colors" />
                <span className="text-sm">View full resume</span>
                <ArrowRight size={14} className="text-text-faint group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </Link>
            </Section>

            {/* ─── CONTACT ─── */}
            <Section id="contact" title="CONTACT">
              <p className="text-text-muted text-lg mb-8 max-w-lg leading-relaxed">
                Interested in working together or just want to connect? Feel
                free to reach out.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                <a
                  href="https://github.com/rydertetreault"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 border border-border-theme hover:border-accent bg-surface-alt hover:bg-accent-subtle px-5 py-3 rounded-xl transition-all duration-300 group"
                >
                  <Github size={16} className="text-text-faint group-hover:text-accent transition-colors" />
                  <span className="text-sm">GitHub</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/ryder-tetreault"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 border border-border-theme hover:border-accent bg-surface-alt hover:bg-accent-subtle px-5 py-3 rounded-xl transition-all duration-300 group"
                >
                  <Linkedin size={16} className="text-text-faint group-hover:text-accent transition-colors" />
                  <span className="text-sm">LinkedIn</span>
                </a>
                <a
                  href="mailto:rydertetreault@gmail.com"
                  className="inline-flex items-center gap-3 border border-border-theme hover:border-accent bg-surface-alt hover:bg-accent-subtle px-5 py-3 rounded-xl transition-all duration-300 group"
                >
                  <Mail size={16} className="text-text-faint group-hover:text-accent transition-colors" />
                  <span className="text-sm">rydertetreault@gmail.com</span>
                </a>
              </div>
            </Section>

            {/* Spacer + footer */}
            <div className="h-[15vh]" />

            <footer className="border-t border-border-theme pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-text-faint">
                &copy; 2026 Ryder Tetreault. Built with Next.js & Tailwind CSS.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://github.com/rydertetreault" target="_blank" rel="noreferrer" className="text-text-faint hover:text-text-muted transition-colors" aria-label="GitHub"><Github size={14} /></a>
                <a href="https://www.linkedin.com/in/ryder-tetreault" target="_blank" rel="noreferrer" className="text-text-faint hover:text-text-muted transition-colors" aria-label="LinkedIn"><Linkedin size={14} /></a>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════ */

function Section({
  id,
  title,
  children,
}: {
  id: SectionId;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-xs text-text-faint tracking-[0.3em] font-medium">
          {title}
        </h2>
        <div className="h-px w-full bg-border-theme" />
      </div>
      {children}
    </section>
  );
}

function SkillColumn({
  icon,
  title,
  skills,
}: {
  icon: React.ReactNode;
  title: string;
  skills: string[];
}) {
  return (
    <div className="rounded-2xl border border-border-theme bg-surface-alt p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-accent-subtle text-accent">
          {icon}
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="rounded-lg border border-border-theme bg-surface-alt px-3 py-1.5 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-colors duration-300 cursor-default"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

function ExperienceCard({
  experience,
}: {
  experience: (typeof experiences)[number];
}) {
  return (
    <div className="group relative pl-8 border-l-2 border-border-theme hover:border-accent transition-colors duration-500 py-8 first:pt-0 last:pb-0">
      <div className="absolute left-[-5px] top-8 first:top-0 w-2 h-2 rounded-full bg-text-faint group-hover:bg-accent transition-colors duration-300 ring-4 ring-background" />
      <p className="text-sm text-text-faint mb-2">{experience.date}</p>
      <h3 className="text-xl font-semibold mb-1">{experience.company}</h3>
      <p className="text-accent text-sm mb-3">{experience.role}</p>
      <p className="text-text-muted text-sm leading-relaxed max-w-lg">
        {experience.description}
      </p>
      <a
        href={experience.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-text-faint hover:text-accent transition-colors mt-3"
      >
        Visit <ExternalLink size={12} />
      </a>
    </div>
  );
}

function FeaturedProjectCard({ repo }: { repo: GitHubRepo }) {
  const langColor = repo.language
    ? languageColors[repo.language] || "#8b8b8b"
    : "#22c55e";

  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-2xl border border-border-theme bg-surface-alt p-6 hover:border-accent transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-3">
            {repo.language && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: langColor }}
              />
            )}
            <h3 className="text-base font-semibold group-hover:text-accent-hover transition-colors truncate">
              {formatRepoName(repo.name)}
            </h3>
          </div>
          {repo.description && (
            <p className="text-text-faint text-sm leading-relaxed">
              {repo.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-text-faint pt-1">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDateRange(repo.created_at, repo.pushed_at)}
            </span>
            {repo.stargazers_count > 0 && (
              <span className="flex items-center gap-1">
                <Star size={12} />
                {repo.stargazers_count}
              </span>
            )}
          </div>
        </div>
        <Github
          size={16}
          className="text-text-faint group-hover:text-accent transition-colors shrink-0 mt-1"
        />
      </div>
    </a>
  );
}
