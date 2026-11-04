import type { Metadata } from "next";
import { fetchGitHubRepos } from "@/lib/github";
import ProjectsList from "@/components/ProjectsList";
import WaveBox, { ScrollToHash } from "@/components/ocean/WaveBox";

export const metadata: Metadata = { title: "Projects | Ryder Tetreault" };

export default async function ProjectsPage() {
  const repos = await fetchGitHubRepos();

  return (
    <WaveBox path="~/projects">
      <ScrollToHash />
      <div className="mx-auto max-w-5xl py-4">
        <header className="mb-10 space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">
            <span className="text-accent">$</span> ls ~/projects
          </p>
          <h1 className="text-5xl font-semibold tracking-[-0.03em] sm:text-6xl">Projects</h1>
          <p className="max-w-xl text-lg text-text-muted">A collection of things I&apos;ve built.</p>
          <p className="font-mono text-[11px] tracking-[0.25em] text-text-faint">
            {repos.length} REPOS <span className="mx-2 text-border-theme">/</span> PROFESSIONAL FIRST, BY ACTIVITY{" "}
            <span className="mx-2 text-border-theme">/</span> GITHUB API
          </p>
        </header>

        <ProjectsList repos={repos} />
      </div>
    </WaveBox>
  );
}
