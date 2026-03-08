"use client";

import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Github,
  Linkedin,
  Mail,
  ExternalLink,
  Shield,
  Code2,
  ChevronDown,
  Menu,
  X,
  Award,
  BookOpen,
  GraduationCap,
} from "lucide-react";

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

const navItems = [
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "contact", label: "Contact" },
];

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
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, 80]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);

      const ids = navItems.map((n) => n.id);
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.3) {
          current = id;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] text-neutral-200 overflow-x-hidden">
      {/* ─── NAVIGATION ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-neutral-800/40 shadow-lg shadow-black/20"
            : ""
        }`}
      >
        <div className="mx-auto max-w-6xl px-6 sm:px-8 flex items-center justify-between h-16 pt-[env(safe-area-inset-top)]">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-lg font-semibold tracking-tight hover:text-emerald-400 transition-colors cursor-pointer"
          >
            RT
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`text-sm transition-colors duration-300 cursor-pointer ${
                  activeSection === item.id
                    ? "text-emerald-400"
                    : "text-neutral-500 hover:text-neutral-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden border-t border-neutral-800/40 bg-[#0a0a0a]/95 backdrop-blur-2xl overflow-hidden"
            >
              <div className="px-6 py-4 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`block w-full text-left py-3 text-sm transition-colors cursor-pointer ${
                      activeSection === item.id
                        ? "text-emerald-400"
                        : "text-neutral-400 hover:text-emerald-400"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated gradient mesh */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-[#0a0a0a] to-cyan-950/15" />
          <div className="hero-orb-1 absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.07] blur-[100px]" />
          <div className="hero-orb-2 absolute bottom-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.05] blur-[80px]" />
          <div className="hero-orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
        </div>

        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Grain texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E)",
          }}
        />

        {/* Hero content with parallax */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 text-center px-6 max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 border border-neutral-800 rounded-full px-4 py-1.5 mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-neutral-400 tracking-wide">
                Available for opportunities
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
          >
            Ryder Tetreault
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-emerald-400/90 text-lg sm:text-xl font-medium tracking-wide mb-6"
          >
            Software Engineer · Cyber Defense
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-neutral-400 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed"
          >
            I build secure, scalable systems and software — with a focus on
            cybersecurity engineering and infrastructure defense.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => scrollTo("skills")}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-7 py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 cursor-pointer w-full sm:w-auto justify-center"
            >
              Learn More <ChevronDown size={16} />
            </button>
            <button
              onClick={() => scrollTo("contact")}
              className="inline-flex items-center gap-2 border border-neutral-700 hover:border-neutral-500 text-neutral-200 px-7 py-3 rounded-xl transition-all duration-300 cursor-pointer w-full sm:w-auto justify-center"
            >
              Contact
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown size={20} className="text-neutral-600" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── CONTENT SECTIONS ─── */}
      <div className="relative">
        {/* Top separator */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-800/50 to-transparent" />

        {/* Grain overlay for content */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E)",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6 sm:px-8 py-24 sm:py-32 space-y-32 sm:space-y-40">
          {/* ─── SKILLS ─── */}
          <SectionWrapper id="skills" number="01" title="Skills & Technologies">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkillColumn
                icon={<Code2 size={20} />}
                title="Software Engineering"
                skills={softwareSkills}
                delay={0}
              />
              <SkillColumn
                icon={<Shield size={20} />}
                title="Cybersecurity"
                skills={cyberSkills}
                delay={0.1}
              />
            </div>
          </SectionWrapper>

          {/* ─── EXPERIENCE ─── */}
          <SectionWrapper id="experience" number="02" title="Experience">
            <div className="space-y-0">
              {experiences.map((exp, i) => (
                <ExperienceCard key={exp.company} experience={exp} index={i} />
              ))}
            </div>
          </SectionWrapper>

          {/* ─── EDUCATION & CERTIFICATIONS ─── */}
          <SectionWrapper
            id="education"
            number="03"
            title="Education & Certifications"
          >
            <div className="space-y-6">
              {/* Degree */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="rounded-2xl border border-neutral-800/60 bg-neutral-950/40 p-6 sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Dec 2025</p>
                    <h3 className="text-lg font-semibold">Auburn University</h3>
                    <p className="text-neutral-400 text-sm mt-1">
                      B.S. Computer Science & Software Engineering
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Certifications row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="rounded-2xl border border-neutral-800/60 bg-neutral-950/40 p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                      <Award size={20} />
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
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="rounded-2xl border border-neutral-800/60 bg-neutral-950/40 p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                      <BookOpen size={20} />
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
                </motion.div>
              </div>
            </div>
          </SectionWrapper>

          {/* ─── CONTACT ─── */}
          <SectionWrapper id="contact" number="04" title="Get in Touch">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-neutral-400 text-lg mb-8 max-w-lg leading-relaxed"
            >
              Interested in working together or just want to connect? Feel free
              to reach out.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex flex-col sm:flex-row flex-wrap gap-4"
            >
              <a
                href="https://github.com/rydertetreault"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 border border-neutral-800 hover:border-emerald-500/40 bg-neutral-950/40 hover:bg-emerald-500/5 px-5 py-3.5 rounded-xl transition-all duration-300 group"
              >
                <Github
                  size={18}
                  className="text-neutral-500 group-hover:text-emerald-400 transition-colors"
                />
                <span className="text-sm">GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/ryder-tetreault"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 border border-neutral-800 hover:border-emerald-500/40 bg-neutral-950/40 hover:bg-emerald-500/5 px-5 py-3.5 rounded-xl transition-all duration-300 group"
              >
                <Linkedin
                  size={18}
                  className="text-neutral-500 group-hover:text-emerald-400 transition-colors"
                />
                <span className="text-sm">LinkedIn</span>
              </a>
              <a
                href="mailto:rydertetreault@gmail.com"
                className="inline-flex items-center gap-3 border border-neutral-800 hover:border-emerald-500/40 bg-neutral-950/40 hover:bg-emerald-500/5 px-5 py-3.5 rounded-xl transition-all duration-300 group"
              >
                <Mail
                  size={18}
                  className="text-neutral-500 group-hover:text-emerald-400 transition-colors"
                />
                <span className="text-sm">rydertetreault@gmail.com</span>
              </a>
            </motion.div>
          </SectionWrapper>
        </div>

        {/* ─── FOOTER ─── */}
        <footer className="relative border-t border-neutral-800/40 py-8">
          <div className="mx-auto max-w-5xl px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
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
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════ */

function SectionWrapper({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="scroll-mt-24"
    >
      <div className="flex items-center gap-4 mb-10">
        <span className="text-emerald-400/70 text-sm font-mono">{number}</span>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {title}
        </h2>
        <div className="flex-1 h-px bg-neutral-800/50" />
      </div>
      {children}
    </motion.section>
  );
}

function SkillColumn({
  icon,
  title,
  skills,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  skills: string[];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="rounded-2xl border border-neutral-800/60 bg-neutral-950/40 p-6 sm:p-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {skills.map((skill, i) => (
          <motion.span
            key={skill}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: delay + i * 0.03 }}
            className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-1.5 text-sm text-neutral-300 hover:border-emerald-500/30 hover:text-emerald-300 transition-colors duration-300 cursor-default"
          >
            {skill}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

function ExperienceCard({
  experience,
  index,
}: {
  experience: (typeof experiences)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative pl-8 border-l-2 border-neutral-800 hover:border-emerald-500/50 transition-colors duration-500 py-8 first:pt-0 last:pb-0"
    >
      {/* Dot on timeline */}
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
    </motion.div>
  );
}
