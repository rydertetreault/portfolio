export type Project = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: "Web" | "Tools";
  tech: string[];
  size: "large" | "medium" | "small";
  problem: string;
  approach: string;
  result: string;
  github?: string;
  live?: string;
};

export const projects: Project[] = [
  {
    slug: "portfolio-site",
    title: "Portfolio Website",
    tagline: "Personal site built with Next.js, Tailwind, and Framer Motion.",
    description:
      "A dark-themed, responsive portfolio site with scroll animations, interactive project cards, and a polished dark aesthetic. Designed for performance, clean aesthetics, and recruiter-friendly UX.",
    category: "Web",
    tech: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion"],
    size: "large",
    problem:
      "Needed a personal site that felt polished and distinctive without relying on heavy templates or CMS platforms.",
    approach:
      "Built from scratch with Next.js App Router and Tailwind v4. Used Framer Motion for smooth page transitions and scroll-triggered animations. Designed a custom layout with hero section, numbered content sections, and responsive project cards.",
    result:
      "A fast, fully responsive portfolio with a unique dark aesthetic, smooth animations, and real project detail pages that are shareable and SEO-friendly.",
    github: "https://github.com/rydertetreault/portfolio",
    live: "https://rydertetreault.dev",
  },
  {
    slug: "jrp-bot",
    title: "JRP Bot",
    tagline:
      "A Discord bot that acts as judge, oracle, and community enforcer.",
    description:
      "A Discord bot that serves as judge, oracle, and community manager. Features real sentencing with jail time, an appeals system, leaderboards, and enforcement of community governance rules.",
    category: "Tools",
    tech: ["JavaScript", "Discord.js", "Node.js"],
    size: "large",
    problem:
      "A Discord community needed automated moderation, entertainment, and governance enforcement that felt unique and engaging rather than generic.",
    approach:
      "Built with Discord.js and Node.js. Implemented a custom sentencing system with jail time, appeals processes, and community leaderboards. Added oracle-style question answering and personality-driven interactions.",
    result:
      "An active, engaging community bot that handles moderation, entertainment, and governance in a way that keeps users engaged and the community self-regulating.",
    github: "https://github.com/rydertetreault/JRP-Bot",
  },
];

export const categories = ["All", "Web", "Tools"] as const;
export type Category = (typeof categories)[number];
