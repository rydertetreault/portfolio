/**
 * Profile content shared by the site (the ocean homepage reads it; edit here).
 * Mirrors the copy on the previous homepage (components/HomeContent.tsx).
 */

export const PROFILE = {
  name: "Ryder Tetreault",
  title: "Software Engineer · AI · Cyber Defense",
  tagline:
    "AI-native software, security-minded engineering. I build products where AI does real work, grounded in cybersecurity and infrastructure defense.",
  location: "Auburn, Alabama",
  about:
    "I'm a Computer Science & Software Engineering graduate from Auburn University with a Cyber Defense certificate, focused on integrating AI into the products I build. Most of my recent work has been bringing language models, semantic search, and AI-driven automation into real applications, from media archives that transcribe and tag themselves to analytics platforms that surface insight instead of just metrics. I treat AI as a first-class part of the toolchain: a collaborator I use daily to design and ship, and a layer I integrate into systems so they get smarter as they're used. My cybersecurity background grounds how I design and reason about every system I touch.",
  links: {
    github: "https://github.com/rydertetreault",
    linkedin: "https://www.linkedin.com/in/ryder-tetreault",
    email: "rydertetreault@gmail.com",
  },
};

export type Role = { role: string; date: string; description: string };

/** One company; `roles` is newest first. More than one role = promotion. */
export type Experience = { company: string; date: string; url: string; roles: Role[] };

export const EXPERIENCES: Experience[] = [
  {
    company: "Praxis AI",
    date: "Jun 2026 - Present",
    url: "https://praxis-ai.com",
    roles: [
      {
        role: "UI/UX Engineer",
        date: "Oct 2026 - Present",
        description:
          "Designing and building the user experience of the Praxis AI platform, from user flows and interface design through production front-end, including designing and building the new interface for Pria, the Digital Twin app. Also supporting broader software engineering across the product.",
      },
      {
        role: "Engineering Intern",
        date: "Jun 2026 - Oct 2026",
        description:
          "Conducted security and functionality audits across integrations and data flows, helped develop and red-team PraxisShield™ (AI security framework), supported Praxis AI agents as a Forward Deployed Engineer (FDE), and solely designed and built the redesigned praxis-ai.com. Promoted to full time.",
      },
    ],
  },
  {
    company: "Maha Media",
    date: "Feb 2026 - Present",
    url: "https://mahamedia.us",
    roles: [
      {
        role: "Software Developer",
        date: "Feb 2026 - Present",
        description:
          "Supporting backend web systems, technical operations, and scalable digital platform infrastructure for media and content delivery.",
      },
    ],
  },
  {
    company: "Proxima Aerospace",
    date: "Jan 2026 - Mar 2026",
    url: "https://proximaaerospace.com",
    roles: [
      {
        role: "Software Engineering Intern",
        date: "Jan 2026 - Mar 2026",
        description:
          "Developing Python systems for retrieving and processing satellite and astrodynamics data from REST APIs. Supporting distributed data pipelines for mission-critical operations.",
      },
    ],
  },
];

export const SKILLS: { title: string; items: string[] }[] = [
  {
    title: "AI Integration",
    items: [
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
    ],
  },
  {
    title: "Engineering",
    items: [
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
    ],
  },
  {
    title: "Cybersecurity",
    items: [
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
    ],
  },
];

export const EDUCATION: { date: string; title: string; detail: string }[] = [
  { date: "Dec 2025", title: "Auburn University", detail: "B.S. Computer Science & Software Engineering" },
  { date: "May 2026", title: "Cyber Defense Certificate", detail: "Auburn University" },
];

/** Featured projects, in route order; the first 4 get an eddy on the homepage (GitHub repo / manual project names). */
export const FEATURED_PROJECTS = [
  "Praxis-AI-Website",
  "Pria",
  "media-library",
  "analytics-api",
  "SnapShift",
  "bardownski-website",
] as const;
