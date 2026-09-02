export const experience = [
  {
    role: "Engineering Intern",
    company: "Praxis AI",
    date: "June 2026 - Present",
    location: "Remote",
    bullets: [
      "Contributing to UI/UX front-end, platform integrity, and AI infrastructure initiatives, reporting to the VP of Engineering.",
      "Conducting security and functionality audits of the Praxis AI platform across integrations, data flows, and system architecture.",
      "Helping develop and test PraxisShield™, an AI security framework, including agentic security research and using AI agents to red-team internal systems.",
      "Working on Praxis AI agents and performing professional services as a Forward Deployed Engineer (FDE).",
    ],
  },
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
    date: "January 2026 - March 2026",
    location: "Remote",
    bullets: [
      "Developing Python scripts to retrieve and process satellite and astrodynamics data from REST APIs.",
    ],
  },
];

export const projects: {
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

export const cyber = {
  title: "Defense Labs & Projects",
  context: "Auburn University",
  date: "January 2023 - Present",
  bullets: [
    "Performed offensive security techniques including buffer overflow exploitation, XSS attacks, and steganography detection across a series of hands-on lab exercises.",
    "Conducted digital forensics investigations including NTFS disk analysis, file carving via hex analysis, PCAP network traffic inspection, and Windows artifact reconstruction.",
  ],
};

export const skills = [
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
