"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

type SectionId =
  | "about"
  | "experience"
  | "skills"
  | "education"
  | "learning"
  | "contact";

export default function Home() {
  const sections = useMemo(
    () =>
      [
        { id: "about", label: "ABOUT" },
        { id: "experience", label: "EXPERIENCE" },
        { id: "skills", label: "SKILLS" },
        { id: "education", label: "EDUCATION" },
        { id: "learning", label: "LEARNING" },
        { id: "contact", label: "CONTACT" },
      ] as const,
    []
  );

  const [activeId, setActiveId] = useState<SectionId>("about");

  // Scrollspy (simple)
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
      {/* Glow Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[rgba(34,197,94,0.12)] blur-[120px]" />
        <div className="absolute -bottom-52 -right-52 h-[560px] w-[560px] rounded-full bg-[rgba(34,197,94,0.08)] blur-[140px]" />
      </div>

      {/* Grain Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
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
        className="relative mx-auto max-w-7xl px-8 sm:px-10 lg:px-12 py-20 sm:py-24 lg:py-24"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-16 lg:gap-24 xl:gap-28 items-start">
          {/* LEFT PANEL */}
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="
              space-y-12
              lg:sticky lg:top-20 lg:self-start
              lg:max-h-[calc(100vh-5rem)]
            "
          >
            <div className="space-y-6">
              <div className="h-24 w-24 rounded-full bg-neutral-800 border border-neutral-700" />

              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight">
                  Ryder Tetreault
                </h1>

                <p className="text-neutral-400 text-lg">
                  Computer Science | SWE | Cyber Defense
                </p>

                <p className="text-neutral-500 text-lg leading-loose max-w-sm">
                  
                </p>
              </div>
            </div>

            {/* NAV (no hover glow) */}
            <nav className="space-y-7">
              {sections.map((s) => {
                const isActive = activeId === s.id;

                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={scrollTo(s.id)}
                    className={[
                      "flex items-center gap-4 select-none transition-opacity duration-200",
                      isActive ? "opacity-100" : "opacity-80 hover:opacity-100",
                    ].join(" ")}
                  >
                    <motion.span
                      className="h-px bg-neutral-700"
                      initial={false}
                      animate={{
                        width: isActive ? 72 : 32,
                        opacity: isActive ? 1 : 0.55,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 22,
                      }}
                    />

                    <motion.span
                      className="text-xs tracking-[0.35em]"
                      initial={false}
                      animate={{
                        color: isActive
                          ? "rgb(229 229 229)"
                          : "rgb(115 115 115)",
                        scale: isActive ? 1.12 : 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 22,
                      }}
                      style={{ transformOrigin: "left center" }}
                    >
                      {s.label}
                    </motion.span>
                  </a>
                );
              })}
            </nav>
          </motion.aside>

          {/* RIGHT CONTENT */}
          <div className="space-y-24 sm:space-y-28 lg:space-y-32">
            <Section id="about" title="ABOUT">
              <p className="text-neutral-300 text-lg leading-loose max-w-2xl">
                I’m a Computer Science & Software Engineering student at Auburn
                University graduating in December 2025. My work focuses on
                systems design, distributed infrastructure, and cybersecurity
                engineering, with long-term goals in Systems Engineering and
                Enterprise Architecture.
              </p>
            </Section>

            <Section id="experience" title="EXPERIENCE">
              <TimelineItem
                date="2026 — Present"
                title="Proxima Aerospace"
                subtitle="Software Development Intern"
                desc="Developing Python systems for retrieving and processing satellite and astrodynamics data from REST APIs and supporting distributed data pipelines."
                href="https://proximaaerospace.com"
              />

              <div className="h-12" />

              <TimelineItem
                date="2026 — Present"
                title="Maha Media"
                subtitle="Junior Developer"
                desc="Supporting backend web systems, technical operations, and scalable digital platform infrastructure."
                href="https://mahamedia.us"
              />
            </Section>

            <Section id="skills" title="SKILLS">
              <SkillsGroup
                title="Languages & Frameworks"
                items={[
                  "C",
                  "C++",
                  "Python",
                  "Ruby",
                  "SQL",
                  "JavaScript",
                  "React",
                  "Node.js",
                ]}
              />
              <div className="h-10" />
              <SkillsGroup
                title="Infrastructure"
                items={[
                  "Linux",
                  "Virtualization",
                  "Cloud Infrastructure",
                  "Distributed Systems",
                  "OpenStack",
                  "Ceph",
                ]}
              />
              <div className="h-10" />
              <SkillsGroup
                title="Cybersecurity"
                items={[
                  "Digital Forensics",
                  "Network Traffic Analysis",
                  "NTFS Analysis",
                  "Steganography",
                  "Buffer Overflow",
                  "Threat Detection",
                ]}
              />
              <div className="h-10" />
              <SkillsGroup
                title="Tooling"
                items={["Git", "Wireshark", "Autopsy", "Nmap", "Burp Suite"]}
              />
            </Section>

            <Section id="education" title="EDUCATION">
              <EduItem
                date="Dec 2025"
                title="Auburn University"
                subtitle="B.S. Computer Science & Software Engineering"
                desc="Graduated with a degree in Computer Science & Software Engineering."
              />

              <div className="h-12" />

              <EduItem
                date="May 2026"
                title="Auburn University"
                subtitle="Cyber Defense Certificate"
                desc="Completed Auburn’s Cyber Defense certificate program."
              />
            </Section>

            <Section id="learning" title="LEARNING">
              <p className="text-neutral-300 text-lg leading-loose max-w-2xl">
                Currently preparing for the CompTIA Security+ certification and
                continuing advanced coursework in Cyber Defense.
              </p>
              <div className="h-6" />
              <p className="text-neutral-300 text-lg leading-loose max-w-2xl">
                Focused on strengthening knowledge in enterprise security
                architecture, network security, threat detection, and risk
                management.
              </p>
            </Section>

            <Section id="contact" title="CONTACT">
              <p className="text-neutral-300 text-lg leading-loose">
                LinkedIn:{" "}
                <a
                  href="https://www.linkedin.com/in/ryder-tetreault"
                  className="text-emerald-400 hover:text-emerald-300 transition"
                >
                  linkedin.com/in/ryder-tetreault
                </a>
                <br />
                Email:{" "}
                <a
                  href="mailto:rydertetreault@gmail.com"
                  className="text-emerald-400 hover:text-emerald-300 transition"
                >
                  rydertetreault@gmail.com
                </a>
              </p>
            </Section>

            <div className="h-[30vh]" />

            <p className="text-xs text-neutral-600">
              Built by Ryder Tetreault with React & Tailwind.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

/* ---------------- Components ---------------- */

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
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="space-y-10"
    >
      <div className="space-y-3">
        <h2 className="text-sm text-neutral-500 tracking-[0.35em]">{title}</h2>
        <div className="h-px w-full bg-neutral-800/60" />
      </div>

      {children}
    </motion.section>
  );
}

/**
 * Experience item (back to the Tim-style hover line only)
 * - No dot / no pulse
 * - Single vertical line that brightens on hover
 */
function TimelineItem({
  date,
  title,
  subtitle,
  desc,
  href,
}: {
  date: string;
  title: string;
  subtitle: string;
  desc: string;
  href: string;
}) {
  return (
    <div className="relative pl-8 group">
      <div className="absolute left-0 top-0 h-full w-px bg-neutral-800 group-hover:bg-emerald-400/60 transition-colors duration-300" />

      <div className="grid grid-cols-[160px_1fr] gap-10">
        <p className="text-sm text-neutral-500">{date}</p>

        <div className="space-y-3">
          <p className="text-xl font-semibold">{title}</p>
          <p className="text-sm text-neutral-500">{subtitle}</p>

          <p className="text-neutral-300 text-lg leading-loose max-w-2xl">
            {desc}
          </p>

          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition"
          >
            Visit <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}

/** Education item (same hover line behavior as experience) */
function EduItem({
  date,
  title,
  subtitle,
  desc,
}: {
  date: string;
  title: string;
  subtitle: string;
  desc: string;
}) {
  return (
    <div className="relative pl-8 group">
      <div className="absolute left-0 top-0 h-full w-px bg-neutral-800 group-hover:bg-emerald-400/60 transition-colors duration-300" />

      <div className="grid grid-cols-[160px_1fr] gap-10">
        <p className="text-sm text-neutral-500">{date}</p>

        <div className="space-y-3">
          <p className="text-xl font-semibold">{title}</p>
          <p className="text-sm text-neutral-500">{subtitle}</p>
          <p className="text-neutral-300 text-lg leading-loose max-w-2xl">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}

function SkillsGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-5">
      <p className="text-xs tracking-[0.35em] text-neutral-500 uppercase">
        {title}
      </p>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-neutral-800 bg-transparent px-3 py-1 text-sm text-neutral-200"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}