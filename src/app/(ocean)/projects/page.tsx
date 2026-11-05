import type { Metadata } from "next";
import { fetchGitHubRepos } from "@/lib/github";
import ShadeBox from "@/components/ocean/ShadeBox";
import { ProjectsBox } from "@/components/ocean/boxes";

export const metadata: Metadata = { title: "Projects | Ryder Tetreault" };

export default async function ProjectsPage() {
  const repos = await fetchGitHubRepos();
  return (
    <ShadeBox path="~/projects">
      <ProjectsBox repos={repos} />
    </ShadeBox>
  );
}
