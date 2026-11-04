import { fetchGitHubRepos, type GitHubRepo } from "@/lib/github";
import Ocean from "@/components/ocean/Ocean";
import { FEATURED_PROJECTS } from "@/data/profile";

export default async function Home() {
  const repos = await fetchGitHubRepos();
  // One eddy per featured project, in this order (see components/ocean/route.ts).
  const projects = FEATURED_PROJECTS.map((name) => repos.find((r) => r.name === name))
    .filter((r): r is GitHubRepo => !!r)
    .slice(0, 4);
  return <Ocean projects={projects} />;
}
