import { fetchGitHubRepos, type GitHubRepo } from "@/lib/github";
import SeaExperience from "@/components/sea/SeaExperience";
import { FEATURED_PROJECTS } from "@/data/profile";

export default async function Home() {
  const repos = await fetchGitHubRepos();
  // Waypoint order on the journey (see components/sea/journey.ts).
  const projects = FEATURED_PROJECTS.map((name) => repos.find((r) => r.name === name)).filter(
    (r): r is GitHubRepo => !!r,
  );
  return <SeaExperience projects={projects} archive={repos} />;
}
