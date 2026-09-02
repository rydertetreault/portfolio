"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Github,
  Linkedin,
  Mail,
  ExternalLink,
  Lock,
  Shield,
  Code2,
  Sparkles,
  BookOpen,
  GraduationCap,
  ArrowRight,
  Star,
  Calendar,
  FileText,
} from "lucide-react";
import type { GitHubRepo } from "@/lib/github";
import { formatRepoName, formatDateRange } from "@/lib/utils";
import AppleIcon from "@/components/icons/AppleIcon";
import { revealSection } from "@/components/ascii-ui/corrupt";


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

const aiSkills = [
  "OpenAI API",
  "Anthropic / Claude",
  "Embeddings",
  "Vector Search",
  "Semantic Search",
  "RAG",
  "Whisper / Transcription",
  "Prompt Engineering",
  "Agent Workflows",
  "AI-Augmented Development",
];

const engineeringSkills = [
  "TypeScript",
  "JavaScript",
  "Python",
  "React",
  "Next.js",
  "Node.js",
  "SQL",
  "REST APIs",
  "Docker",
  "AWS",
  "Linux",
  "Git",
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
    date: "Jun 2026 - Present",
    company: "Praxis AI",
    role: "Engineering Intern",
    description:
      "Contributing to UI/UX front-end, platform integrity, and AI infrastructure initiatives. Conducting security and functionality audits across integrations and data flows, helping develop and red-team PraxisShield™ (AI security framework), and supporting Praxis AI agents as a Forward Deployed Engineer (FDE).",
    url: "https://praxis-ai.com",
  },
  {
    date: "Feb 2026 - Present",
    company: "Maha Media",
    role: "Software Developer",
    description:
      "Supporting backend web systems, technical operations, and scalable digital platform infrastructure for media and content delivery.",
    url: "https://mahamedia.us",
  },
  {
    date: "Jan 2026 - Mar 2026",
    company: "Proxima Aerospace",
    role: "Software Engineering Intern",
    description:
      "Developing Python systems for retrieving and processing satellite and astrodynamics data from REST APIs. Supporting distributed data pipelines for mission-critical operations.",
    url: "https://proximaaerospace.com",
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

      // Notify NavBar of inner-div scroll position and active section
      window.dispatchEvent(
        new CustomEvent("portfolio-scroll", {
          detail: { scrollTop: container.scrollTop, activeId: current },
        })
      );
    };

    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [sections]);

  /* Deep links (/#experience etc. from other pages): jump straight past the pinned
     intro and scroll the inner panel to the section, instead of landing on the top
     of the homepage. Also handles hash changes while already on the page. */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const ids = new Set<string>(sections.map((s) => s.id));

    const goTo = (id: string, smooth: boolean) => {
      if (!id || !ids.has(id)) return false;
      const target = document.getElementById(id);
      const main = container.closest("main");
      if (!target || !main) return false;
      // 1. Skip the intro: put the (h-screen) main at the top of the viewport.
      //    (offsetTop ignores in-flight entrance transforms, so retries don't jitter.)
      const mainTop = (main as HTMLElement).offsetTop;
      if (Math.abs(window.scrollY - mainTop) > 2) window.scrollTo({ top: mainTop, behavior: "instant" });
      // 2. Scroll the inner panel so the section sits just below the fixed nav.
      const navH = document.querySelector("nav")?.getBoundingClientRect().height ?? 64;
      const offset = target.getBoundingClientRect().top - container.getBoundingClientRect().top - navH - 32;
      if (Math.abs(offset) > 3) {
        container.scrollTo({ top: container.scrollTop + offset, behavior: smooth ? "smooth" : "instant" });
      }
      return true;
    };
    const goToHash = (smooth: boolean) =>
      goTo(decodeURIComponent(window.location.hash.replace(/^#/, "")), smooth);

    // Section load-in: blocks appear one at a time, decoding out of corruption,
    // some glitching. The field itself is left alone (no row-tear, no shockwave).
    // The deep-link guard (html.ascii-deeplink, set by NavBar) keeps the field visible
    // while the intro shell is still flagged; release it only once that flag is gone,
    // otherwise the field snaps to 0 and fades back in (a "fade to black").
    const releaseDeepLink = () => {
      const t0 = performance.now();
      const tick = () => {
        if (!document.body.hasAttribute("data-intro-active") || performance.now() - t0 > 3000) {
          document.documentElement.classList.remove("ascii-deeplink");
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    };
    const loadIn = (id: string) => {
      const target = document.getElementById(id);
      if (!target) return;
      releaseDeepLink();
      void revealSection(target);
    };
    // On-page: wait for the smooth scroll to land before loading the section in,
    // otherwise the blocks decode while still off-screen.
    const loadInWhenSettled = (id: string) => {
      const target = document.getElementById(id);
      if (!target) return;
      const navH = document.querySelector("nav")?.getBoundingClientRect().height ?? 64;
      const wanted = navH + 32;
      let last = Number.NaN;
      let stable = 0;
      const t0 = performance.now();
      const tick = () => {
        const top = target.getBoundingClientRect().top;
        const arrived = Math.abs(top - wanted) < 6;
        stable = Math.abs(top - last) < 1 ? stable + 1 : 0;
        last = top;
        if (arrived || stable >= 3 || performance.now() - t0 > 1200) loadIn(id);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    // On arrival via deep link: layout can still settle (fonts, intro sizing) → retry briefly.
    if (window.location.hash) {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      let tries = 0;
      let started = false;
      const attempt = () => {
        const ok = goToHash(false);
        if (ok && !started) {
          // Hide + load in immediately on the first successful scroll; later
          // attempts only re-correct the scroll position as layout settles.
          started = true;
          loadIn(decodeURIComponent(window.location.hash.slice(1)));
        }
        if (++tries < 4) setTimeout(attempt, 120);
      };
      requestAnimationFrame(attempt);
    }

    const onHashChange = () => {
      if (goToHash(true)) loadInWhenSettled(decodeURIComponent(window.location.hash.slice(1)));
    };
    // On-page tab clicks (NavBar) dispatch this instead of touching the hash.
    const onGoto = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (goTo(id, true)) loadInWhenSettled(id);
    };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("portfolio-goto", onGoto);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("portfolio-goto", onGoto);
    };
  }, [sections]);

  const FEATURED_NAMES = [
    "media-library",
    "analytics-api",
    "SnapShift",
    "bardownski-website",
  ] as const;
  const featuredRepos = FEATURED_NAMES
    .map((name) => repos.find((r) => r.name === name))
    .filter((r): r is GitHubRepo => !!r);

  return (
    <main className="relative z-10 h-screen text-foreground overflow-hidden animate-fade-in">
      <div className="relative h-full flex flex-col lg:flex-row max-w-7xl mx-auto">
        {/* ═══ LEFT PANEL (fixed, never scrolls) ═══ */}
        <aside
          data-ascii-quiet="0.7"
          className="relative hidden lg:flex flex-col justify-center shrink-0 w-[420px] xl:w-[460px] h-full px-12 xl:px-16 bg-background/45 backdrop-blur-[0.5px] border-r border-border-theme/40"
        >
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
                  Software Engineer · AI · Cyber Defense
                </p>
                <p className="text-text-faint text-sm leading-relaxed max-w-xs">
                  AI-native software, security-minded engineering. I build
                  products where AI does real work, grounded in cybersecurity
                  and infrastructure defense.
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
          data-ascii-quiet="0.7"
          className="relative flex-1 h-full overflow-y-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-24 bg-background/45 backdrop-blur-[0.5px]"
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
                Software Engineer · AI · Cyber Defense
              </p>
              <p className="text-text-faint text-sm leading-relaxed max-w-xs">
                AI-native software, security-minded engineering. I build
                products where AI does real work, grounded in cybersecurity
                and infrastructure defense.
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
                Auburn University with a Cyber Defense certificate, focused on
                integrating AI into the products I build. Most of my recent work
                has been bringing language models, semantic search, and AI-driven
                automation into real applications, from media archives that
                transcribe and tag themselves to analytics platforms that surface
                insight instead of just metrics. I treat AI as a first-class part
                of the toolchain: a collaborator I use daily to design and ship,
                and a layer I integrate into systems so they get smarter as
                they&apos;re used. My cybersecurity background grounds how I
                design and reason about every system I touch.
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <SkillColumn
                  icon={<Sparkles size={18} />}
                  title="AI Integration"
                  skills={aiSkills}
                />
                <SkillColumn
                  icon={<Code2 size={18} />}
                  title="Engineering"
                  skills={engineeringSkills}
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

                <div className="rounded-2xl border border-border-theme bg-surface-alt p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-accent-subtle text-accent shrink-0">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <p className="text-sm text-text-faint mb-1">May 2026</p>
                      <h3 className="text-lg font-semibold">Cyber Defense Certificate</h3>
                      <p className="text-text-muted text-sm mt-1">
                        Auburn University
                      </p>
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
                &copy; 2025 Ryder Tetreault. Built with Next.js & Tailwind CSS.
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
    <section id={id} className="space-y-8 scroll-mt-24">
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
  // Pick the link target: App Store > Live Site (homepage) > nothing if private.
  let href: string | null = null;
  let LinkIcon: React.ComponentType<{ size?: number; className?: string }> | null = null;

  if (repo.appStore) {
    href = repo.appStore;
    LinkIcon = AppleIcon;
  } else if (!repo.private && repo.homepage) {
    href = repo.homepage;
    LinkIcon = ExternalLink;
  }

  const inner = (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-3">
          {repo.language && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: "#a3e635" }}
            />
          )}
          <h3 className="text-base font-semibold group-hover:text-accent-hover transition-colors truncate">
            {formatRepoName(repo.name)}
          </h3>
        </div>
        {repo.subtitle && (
          <p className="text-text-faint text-xs">
            {repo.subtitle}
          </p>
        )}
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
      {LinkIcon ? (
        <LinkIcon
          size={16}
          className="text-text-faint group-hover:text-accent transition-colors shrink-0 mt-1"
        />
      ) : repo.private ? (
        <Lock
          size={16}
          className="text-text-faint shrink-0 mt-1"
        />
      ) : null}
    </div>
  );

  const className = `group block rounded-2xl border border-border-theme bg-surface-alt p-6 transition-all duration-300 ${href ? "hover:border-accent" : "cursor-default"}`;

  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}
