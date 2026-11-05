import type { ReactNode } from "react";
import { fetchGitHubRepos, type GitHubRepo } from "@/lib/github";
import Ocean from "@/components/ocean/Ocean";
import { FEATURED_PROJECTS } from "@/data/profile";

/** Every page in this group is a lightbox over the same ocean, which never reloads. */
export default async function OceanLayout({ children }: { children: ReactNode }) {
  const repos = await fetchGitHubRepos();
  // One island per featured project, in this order (see components/ocean/route.ts).
  const projects = FEATURED_PROJECTS.map((name) => repos.find((r) => r.name === name))
    .filter((r): r is GitHubRepo => !!r)
    .slice(0, 4);
  return (
    <Ocean projects={projects} all={repos}>
      {children}
    </Ocean>
  );
}
