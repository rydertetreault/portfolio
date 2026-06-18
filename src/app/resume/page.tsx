import {
  Mail,
  Globe,
  Github,
  MapPin,
  Phone,
  GraduationCap,
  Briefcase,
  FolderOpen,
  Shield,
  Wrench,
} from "lucide-react";

const experience = [
  {
    role: "Software Developer",
    company: "MahaMedia LLC",
    date: "February 2026 - Present",
    location: "Remote",
    bullets: [
      "Designing and developing a podcast analytics dashboard for the Be Here Now Network with interactive data visualizations, plus a companion browser extension for YouTube cross-platform tracking.",
    ],
  },
  {
    role: "Software Development Intern",
    company: "Proxima Aerospace",
    date: "January 2026 - Present",
    location: "Remote",
    bullets: [
      "Developing Python scripts to retrieve and process satellite and astrodynamics data from REST APIs.",
    ],
  },
];

const projects: {
  name: string;
  date: string;
  context: string;
  link?: string;
  href?: string;
  bullets: string[];
}[] = [
  {
    name: "Media Library",
    date: "February 2026 - Present",
    context: "Maha Media · Ram Dass Love Serve Remember Foundation",
    bullets: [
      "Designed and built the frontend for a custom digital media library housing decades of archival audio, video, images, and documents; gallery-style React and TypeScript interface with AI-powered transcription, tagging, and semantic search across the entire archive.",
    ],
  },
  {
    name: "Analytics Dashboard",
    date: "February 2026 - Present",
    context: "Maha Media · Be Here Now Network",
    bullets: [
      "Designed and built the frontend for an internal analytics dashboard unifying Google Analytics 4 site metrics and YouTube channel data into a single reporting platform.",
    ],
  },
  {
    name: "SnapShift",
    date: "2025 - Present",
    context: "Individual Project · iOS",
    link: "App Store",
    href: "https://apps.apple.com/us/app/snapshift-schedule-scanner/id6769178607",
    bullets: [
      "iOS app, published to the App Store, that turns a photo of a work schedule into a calendar using on-device OCR; all data stored locally with no accounts, cloud sync, or backend.",
    ],
  },
  {
    name: "Sports Team Web Application",
    date: "2025 - Present",
    context: "Individual Project",
    link: "bardownski.hockey",
    bullets: [
      "Full-stack sports club site built with Next.js and TypeScript featuring live match results, player stats, roster management, news, and highlight integration.",
    ],
  },
  {
    name: "Jeff Ray Discord Bot",
    date: "Nov 2025 - Dec 2025",
    context: "Individual Project",
    bullets: [
      "Node.js Discord bot with slash commands, secure API token handling, and community features including a judge/oracle system and jail/leaderboard mechanic.",
    ],
  },
];

const cyber = {
  title: "Defense Labs & Projects",
  context: "Auburn University",
  date: "January 2023 - Present",
  bullets: [
    "Performed offensive security techniques including buffer overflow exploitation, XSS attacks, and steganography detection across a series of hands-on lab exercises.",
    "Conducted digital forensics investigations including NTFS disk analysis, file carving via hex analysis, PCAP network traffic inspection, and Windows artifact reconstruction.",
  ],
};

const skills = [
  {
    label: "AI & Integration",
    value:
      "OpenAI API, Anthropic / Claude, Embeddings, Vector Search, Semantic Search, RAG, Whisper / Transcription, Prompt Engineering, Agent Workflows, AI-Augmented Development",
  },
  { label: "Languages", value: "C, C++, Python, Ruby, SQL, JavaScript, TypeScript" },
  { label: "Frameworks & Tools", value: "Node.js, Next.js, React, PHP" },
  { label: "Cloud & Infrastructure", value: "Linux, OpenStack, Ceph, Virtualization, REST APIs" },
  {
    label: "Cybersecurity",
    value: "Digital Forensics, PCAP Analysis, Buffer Overflow, XSS, Steganography, NTFS Analysis",
  },
];

export default function ResumePage() {
  return (
    <main className="relative min-h-screen text-foreground bg-background">
      {/* Diagonal gradient bands (dimmed) */}
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

      <div className="relative mx-auto max-w-3xl px-6 sm:px-10 lg:px-12 pt-28 pb-16 sm:pt-32 sm:pb-20">
        {/* Header */}
        <div className="mb-12 space-y-4">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Ryder Tetreault
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-text-faint" />
              Augusta, GA
            </span>
            <span className="flex items-center gap-1.5">
              <Phone size={14} className="text-text-faint" />
              (706) 627-6492
            </span>
            <a
              href="mailto:rydertetreault@gmail.com"
              className="flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              <Mail size={14} className="text-text-faint" />
              rydertetreault@gmail.com
            </a>
            <a
              href="https://rydertetreault.dev"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              <Globe size={14} className="text-text-faint" />
              rydertetreault.dev
            </a>
            <a
              href="https://github.com/rydertetreault"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              <Github size={14} className="text-text-faint" />
              github.com/rydertetreault
            </a>
          </div>
        </div>

        <div className="space-y-14">
          {/* Education */}
          <ResumeSection icon={<GraduationCap size={16} />} title="Education">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div>
                  <h3 className="text-base font-semibold">
                    Bachelor of Computer Science and Software Engineering
                  </h3>
                  <p className="text-sm text-text-faint">Auburn University</p>
                </div>
                <span className="text-sm text-text-faint shrink-0">December 2025</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div>
                  <h3 className="text-base font-semibold">
                    Certification in Cyber Defense
                  </h3>
                  <p className="text-sm text-text-faint">Auburn University</p>
                </div>
                <span className="text-sm text-text-faint shrink-0">May 2026</span>
              </div>
            </div>
          </ResumeSection>

          {/* Experience */}
          <ResumeSection icon={<Briefcase size={16} />} title="Experience">
            <div className="space-y-8">
              {experience.map((exp) => (
                <div key={exp.company}>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1">
                    <div>
                      <h3 className="text-base font-semibold">{exp.role}</h3>
                      <p className="text-sm text-accent">{exp.company}</p>
                    </div>
                    <div className="text-sm text-text-faint shrink-0 text-right">
                      <p>{exp.date}</p>
                      <p>{exp.location}</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {exp.bullets.map((b, i) => (
                      <li
                        key={i}
                        className="text-sm text-text-muted leading-relaxed pl-4 relative before:absolute before:left-0 before:top-[9px] before:h-1 before:w-1 before:rounded-full before:bg-text-faint"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ResumeSection>

          {/* Projects */}
          <ResumeSection icon={<FolderOpen size={16} />} title="Projects">
            <div className="space-y-8">
              {projects.map((proj) => (
                <div key={proj.name}>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1">
                    <div>
                      <h3 className="text-base font-semibold">{proj.name}</h3>
                      <p className="text-sm text-text-faint">
                        {proj.context}
                        {proj.link && (
                          <>
                            {" · "}
                            <a
                              href={proj.href ?? `https://${proj.link}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:text-accent transition-colors"
                            >
                              {proj.link}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    <span className="text-sm text-text-faint shrink-0">
                      {proj.date}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {proj.bullets.map((b, i) => (
                      <li
                        key={i}
                        className="text-sm text-text-muted leading-relaxed pl-4 relative before:absolute before:left-0 before:top-[9px] before:h-1 before:w-1 before:rounded-full before:bg-text-faint"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ResumeSection>

          {/* Cybersecurity */}
          <ResumeSection icon={<Shield size={16} />} title="Cybersecurity">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1">
                <div>
                  <h3 className="text-base font-semibold">{cyber.title}</h3>
                  <p className="text-sm text-text-faint">{cyber.context}</p>
                </div>
                <span className="text-sm text-text-faint shrink-0">
                  {cyber.date}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {cyber.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="text-sm text-text-muted leading-relaxed pl-4 relative before:absolute before:left-0 before:top-[9px] before:h-1 before:w-1 before:rounded-full before:bg-text-faint"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </ResumeSection>

          {/* Skills */}
          <ResumeSection icon={<Wrench size={16} />} title="Skills">
            <div className="space-y-3">
              {skills.map((s) => (
                <div key={s.label} className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                  <span className="text-sm font-medium text-foreground sm:w-48 shrink-0">
                    {s.label}
                  </span>
                  <span className="text-sm text-text-muted">{s.value}</span>
                </div>
              ))}
            </div>
          </ResumeSection>
        </div>
      </div>
    </main>
  );
}

function ResumeSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="text-accent">{icon}</div>
        <h2 className="text-xs text-text-faint tracking-[0.3em] font-medium uppercase">
          {title}
        </h2>
        <div className="flex-1 h-px bg-border-theme" />
      </div>
      {children}
    </section>
  );
}
