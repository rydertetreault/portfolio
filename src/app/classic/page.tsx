import type { Metadata } from "next";
import { fetchGitHubRepos } from "@/lib/github";
import HomeShell from "@/components/HomeShell";

export const metadata: Metadata = { title: "Ryder Tetreault | Classic view" };

/**
 * The classic homepage: the live site's overview without the ocean and without the
 * hands intro (for visitors who skip the animation). The persistent ASCII field from
 * the root layout runs behind it, as on the live site.
 */
export default async function ClassicHome() {
  const repos = await fetchGitHubRepos();
  return <HomeShell repos={repos} skipIntro />;
}
