"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
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
} from "lucide-react";

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

type SectionId =
  | "about"
  | "skills"
  | "experience"
  | "education"
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
    date: "2026 — Present",
    company: "Proxima Aerospace",
    role: "Software Engineering Intern",
    description:
      "Developing Python systems for retrieving and processing satellite and astrodynamics data from REST APIs. Supporting distributed data pipelines for mission-critical operations.",
    url: "https://proximaaerospace.com",
  },
  {
    date: "2026 — Present",
    company: "Maha Media",
    role: "Software Developer",
    description:
      "Supporting backend web systems, technical operations, and scalable digital platform infrastructure for media and content delivery.",
    url: "https://mahamedia.us",
  },
];

/* ═══════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════ */

export default function Home() {
  const sections = useMemo(
    () =>
      [
        { id: "about", label: "ABOUT" },
        { id: "skills", label: "SKILLS" },
        { id: "experience", label: "EXPERIENCE" },
        { id: "education", label: "EDUCATION" },
        { id: "contact", label: "CONTACT" },
      ] as const,
    []
  );

  const [activeId, setActiveId] = useState<SectionId>("about");

  useEffect(() => {
    const ids = sections.map((s) => s.id) as SectionId[];

    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 6;

      if (nearBottom) {
        setActiveId("contact");
        return;
      }

      const triggerY = window.innerHeight * 0.28;
      let current: SectionId = "about";

      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= triggerY) current = id;
      }

      setActiveId(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const scrollTo = (id: SectionId) => (e: React.MouseEvent) => {
    e.preventDefault();
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="relative min-h-screen text-neutral-200 bg-[#0a0a0a]">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[rgba(34,197,94,0.10)] blur-[120px]" />
        <div className="absolute -bottom-52 -right-52 h-[560px] w-[560px] rounded-full bg-[rgba(34,197,94,0.06)] blur-[140px]" />
      </div>

      {/* Grain texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E)",
        }}
      />

      {/* Page load fade-in */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-24"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-12 lg:gap-20 xl:gap-28 items-start">
          {/* ═══ LEFT PANEL (sticky on desktop) ═══ */}
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="space-y-10 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)]"
          >
            {/* Profile + Name */}
            <div className="space-y-6">
              <div className="h-24 w-24 rounded-full overflow-hidden border border-neutral-700 bg-neutral-800">
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
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
                  Ryder Tetreault
                </h1>
                <p className="text-emerald-400/80 text-base font-medium">
                  Software Engineer · Cyber Defense
                </p>
                <p className="text-neutral-500 text-sm leading-relaxed max-w-xs">
                  Building secure, scalable systems and software with a focus on
                  cybersecurity engineering and infrastructure defense.
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:block space-y-6">
              {sections.map((s) => {
                const isActive = activeId === s.id;

                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={scrollTo(s.id)}
                    className={[
                      "flex items-center gap-4 select-none transition-opacity duration-200",
                      isActive ? "opacity-100" : "opacity-60 hover:opacity-100",
                    ].join(" ")}
                  >
                    <motion.span
                      className="h-px bg-neutral-500"
                      initial={false}
                      animate={{
                        width: isActive ? 64 : 28,
                        opacity: isActive ? 1 : 0.5,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 22,
                      }}
                    />

                    <motion.span
                      className="text-xs tracking-[0.3em] font-medium"
                      initial={false}
                      animate={{
                        color: isActive
                          ? "rgb(229 229 229)"
                          : "rgb(115 115 115)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 22,
                      }}
                    >
                      {s.label}
                    </motion.span>
                  </a>
                );
              })}
            </nav>

            {/* Social links */}
            <div className="flex items-center gap-5 pt-2">
              <a
                href="https://github.com/rydertetreault"
                target="_blank"
                rel="noreferrer"
                className="text-neutral-500 hover:text-emerald-400 transition-colors"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="https://www.linkedin.com/in/ryder-tetreault"
                target="_blank"
                rel="noreferrer"
                className="text-neutral-500 hover:text-emerald-400 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="mailto:rydertetreault@gmail.com"
                className="text-neutral-500 hover:text-emerald-400 transition-colors"
                aria-label="Email"
              >
                <Mail size={18} />
              </a>
            </div>
          </motion.aside>

          {/* ═══ RIGHT PANEL (scrollable content) ═══ */}
          <div className="space-y-24 sm:space-y-28 lg:space-y-32">
            {/* ─── ABOUT ─── */}
            <Section id="about" title="ABOUT">
              <p className="text-neutral-300 text-lg leading-relaxed max-w-2xl">
                I&apos;m a Computer Science & Software Engineering graduate from
                Auburn University. My work focuses on systems design, distributed
                infrastructure, and cybersecurity engineering — with long-term goals
                in Systems Engineering and Enterprise Architecture.
              </p>
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

            {/* ─── EXPERIENCE ─── */}
            <Section id="experience" title="EXPERIENCE">
              <div className="space-y-0">
                {experiences.map((exp) => (
                  <ExperienceCard key={exp.company} experience={exp} />
                ))}
              </div>
            </Section>

            {/* ─── EDUCATION & CERTIFICATIONS ─── */}
            <Section id="education" title="EDUCATION & CERTIFICATIONS">
              <div className="space-y-5">
                <div className="rounded-2xl border border-neutral-800/60 bg-neutral-950/40 p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Dec 2025</p>
                      <h3 className="text-lg font-semibold">
                        Auburn University
                      </h3>
                      <p className="text-neutral-400 text-sm mt-1">
                        B.S. Computer Science & Software Engineering
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="rounded-2xl border border-neutral-800/60 bg-neutral-950/40 p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                        <Award size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-semibold">
                            CompTIA Security+
                          </h3>
                          <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            In Progress
                          </span>
                        </div>
                        <p className="text-neutral-500 text-sm">
                          Preparing for certification exam
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-800/60 bg-neutral-950/40 p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-semibold">
                            Cyber Defense Certificate
                          </h3>
                          <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            In Progress
                          </span>
                        </div>
                        <p className="text-neutral-500 text-sm">
                          Auburn University · Expected May 2026
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* ─── CONTACT ─── */}
            <Section id="contact" title="CONTACT">
              <p className="text-neutral-400 text-lg mb-8 max-w-lg leading-relaxed">
                Interested in working together or just want to connect? Feel
                free to reach out.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                <a
                  href="https://github.com/rydertetreault"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 border border-neutral-800 hover:border-emerald-500/40 bg-neutral-950/40 hover:bg-emerald-500/5 px-5 py-3 rounded-xl transition-all duration-300 group"
                >
                  <Github
                    size={16}
                    className="text-neutral-500 group-hover:text-emerald-400 transition-colors"
                  />
                  <span className="text-sm">GitHub</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/ryder-tetreault"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 border border-neutral-800 hover:border-emerald-500/40 bg-neutral-950/40 hover:bg-emerald-500/5 px-5 py-3 rounded-xl transition-all duration-300 group"
                >
                  <Linkedin
                    size={16}
                    className="text-neutral-500 group-hover:text-emerald-400 transition-colors"
                  />
                  <span className="text-sm">LinkedIn</span>
                </a>
                <a
                  href="mailto:rydertetreault@gmail.com"
                  className="inline-flex items-center gap-3 border border-neutral-800 hover:border-emerald-500/40 bg-neutral-950/40 hover:bg-emerald-500/5 px-5 py-3 rounded-xl transition-all duration-300 group"
                >
                  <Mail
                    size={16}
                    className="text-neutral-500 group-hover:text-emerald-400 transition-colors"
                  />
                  <span className="text-sm">rydertetreault@gmail.com</span>
                </a>
              </div>
            </Section>

            {/* Spacer + footer */}
            <div className="h-[20vh]" />

            <footer className="border-t border-neutral-800/40 pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-neutral-600">
                &copy; 2026 Ryder Tetreault. Built with Next.js & Tailwind CSS.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/rydertetreault"
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-600 hover:text-neutral-400 transition-colors"
                  aria-label="GitHub"
                >
                  <Github size={14} />
                </a>
                <a
                  href="https://www.linkedin.com/in/ryder-tetreault"
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-600 hover:text-neutral-400 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={14} />
                </a>
              </div>
            </footer>
          </div>
        </div>
      </motion.div>
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
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="space-y-8"
    >
      <div className="space-y-3">
        <h2 className="text-xs text-neutral-500 tracking-[0.3em] font-medium">
          {title}
        </h2>
        <div className="h-px w-full bg-neutral-800/60" />
      </div>
      {children}
    </motion.section>
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
    <div className="rounded-2xl border border-neutral-800/60 bg-neutral-950/40 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
          {icon}
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-1.5 text-sm text-neutral-300 hover:border-emerald-500/30 hover:text-emerald-300 transition-colors duration-300 cursor-default"
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
    <div className="group relative pl-8 border-l-2 border-neutral-800 hover:border-emerald-500/50 transition-colors duration-500 py-8 first:pt-0 last:pb-0">
      <div className="absolute left-[-5px] top-8 first:top-0 w-2 h-2 rounded-full bg-neutral-700 group-hover:bg-emerald-400 transition-colors duration-300 ring-4 ring-[#0a0a0a]" />
      <p className="text-sm text-neutral-500 mb-2">{experience.date}</p>
      <h3 className="text-xl font-semibold mb-1">{experience.company}</h3>
      <p className="text-emerald-400/80 text-sm mb-3">{experience.role}</p>
      <p className="text-neutral-400 text-sm leading-relaxed max-w-lg">
        {experience.description}
      </p>
      <a
        href={experience.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-emerald-400 transition-colors mt-3"
      >
        Visit <ExternalLink size={12} />
      </a>
    </div>
  );
}
