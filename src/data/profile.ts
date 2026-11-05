/**
 * Profile content shared by the site (the ocean homepage reads it; edit here).
 * Mirrors the copy on the previous homepage (components/HomeContent.tsx).
 */

export const PROFILE = {
  name: "Ryder Tetreault",
  title: "Software Engineer · AI · Cyber Defense",
  tagline:
    "AI-native software, security-minded engineering. I build products where AI does real work, grounded in cybersecurity and infrastructure defense.",
  location: "Augusta, GA",
  about:
    "I'm a Computer Science & Software Engineering graduate from Auburn University with a Cyber Defense certificate, focused on integrating AI into the products I build. Most of my recent work has been bringing language models, semantic search, and AI-driven automation into real applications, from media archives that transcribe and tag themselves to analytics platforms that surface insight instead of just metrics. I treat AI as a first-class part of the toolchain: a collaborator I use daily to design and ship, and a layer I integrate into systems so they get smarter as they're used. My cybersecurity background grounds how I design and reason about every system I touch.",
  /** About's quick read: label, then what it means. */
  focus: [
    ["AI integration", "language models, semantic search, automation"],
    ["Security-minded", "Cyber Defense certificate, audits, red-teaming"],
    ["Full stack", "TypeScript, Python, React / Next.js, Node"],
  ] as [string, string][],
  links: {
    github: "https://github.com/rydertetreault",
    linkedin: "https://www.linkedin.com/in/ryder-tetreault",
    email: "rydertetreault@gmail.com",
  },
};

/** `points`: the short bullets shown on the homepage; `description`: the one-paragraph version (classic page). */
export type Role = { role: string; date: string; description: string; points: string[] };

/** One company; `roles` is newest first. More than one role = promotion. */
/** `logo`: a square image in public/logos; without one the stop shows the company's initials. */
export type Experience = { company: string; date: string; url: string; location: string; logo?: string; roles: Role[] };

export const EXPERIENCES: Experience[] = [
  {
    company: "Praxis AI",
    location: "Remote",
    date: "Jun 2026 - Present",
    url: "https://praxis-ai.com",
    logo: "/logos/praxis-ai.png",
    roles: [
      {
        role: "UI/UX Engineer",
        date: "Oct 2026 - Present",
        description:
          "Designing and building the user experience of the Praxis AI platform, from user flows and interface design through production front-end, including designing and building the new interface for Pria, the Digital Twin app. Also supporting broader software engineering across the product.",
        points: [
          "Designing the Praxis AI platform UX, from user flows to production front-end",
          "Sole designer and builder of the new Pria interface, the Digital Twin app",
          "Usability, accessibility and visual consistency across the product",
          "Broader engineering across the platform, including agent features",
        ],
      },
      {
        role: "Engineering Intern",
        date: "Jun 2026 - Oct 2026",
        description:
          "Conducted security and functionality audits across integrations and data flows, helped develop and red-team PraxisShield™ (AI security framework), supported Praxis AI agents as a Forward Deployed Engineer (FDE), and solely designed and built the redesigned praxis-ai.com. Promoted to full time.",
        points: [
          "Security and functionality audits across integrations and data flows",
          "Helped develop and red-team PraxisShield™, an AI security framework",
          "Forward Deployed Engineer (FDE) on Praxis AI agents",
          "Solely designed and built the redesigned praxis-ai.com",
        ],
      },
    ],
  },
  {
    company: "Maha Media",
    location: "Remote",
    date: "Feb 2026 - Present",
    url: "https://mahamedia.us",
    roles: [
      {
        role: "Software Developer",
        date: "Feb 2026 - Present",
        description:
          "Supporting backend web systems, technical operations, and scalable digital platform infrastructure for media and content delivery.",
        points: [
          "Backend web systems and technical operations",
          "Scalable platform infrastructure for media and content delivery",
          "Podcast analytics dashboard for the Be Here Now Network",
        ],
      },
    ],
  },
  {
    company: "Proxima Aerospace",
    location: "Remote",
    date: "Jan 2026 - Mar 2026",
    url: "https://proximaaerospace.com",
    logo: "/logos/proxima.png",
    roles: [
      {
        role: "Software Engineering Intern",
        date: "Jan 2026 - Mar 2026",
        description:
          "Developing Python systems for retrieving and processing satellite and astrodynamics data from REST APIs. Supporting distributed data pipelines for mission-critical operations.",
        points: [
          "Python systems that retrieve and process satellite and astrodynamics data from REST APIs",
          "Distributed data pipelines for mission-critical operations",
        ],
      },
    ],
  },
];

/** `blurb`: one line on what the group is for (03, under its current). */
export const SKILLS: { title: string; blurb: string; items: string[] }[] = [
  {
    title: "AI Integration",
    blurb: "Language models wired into real products",
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
    blurb: "Full stack, typed, shipped to production",
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
    blurb: "Offense, forensics and hardening",
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

export type Education = {
  date: string;
  title: string;
  detail: string;
  /** What it is, as a tag (Degree / Certificate). */
  kind: string;
  school: string;
  /** The school's mark, drawn in one colour (components/icons). */
  mark?: "auburn";
  points: string[];
};

export const EDUCATION: Education[] = [
  {
    date: "Dec 2025",
    title: "Auburn University",
    detail: "B.S. Computer Science & Software Engineering",
    kind: "Degree",
    school: "Auburn, AL",
    mark: "auburn",
    points: ["Graduated December 2025", "Went on to the Cyber Defense certificate"],
  },
  {
    date: "May 2026",
    title: "Cyber Defense Certificate",
    detail: "Auburn University",
    kind: "Certificate",
    school: "Auburn, AL",
    mark: "auburn",
    points: [
      "Offensive labs: buffer overflows, XSS, steganography detection",
      "Forensics: NTFS disk analysis, file carving, PCAP and Windows artifacts",
    ],
  },
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
