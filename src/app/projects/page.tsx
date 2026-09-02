import { fetchGitHubRepos } from "@/lib/github";
import ProjectsList from "@/components/ProjectsList";
import DecodeOnMount from "@/components/ascii-ui/DecodeOnMount";

export default async function ProjectsPage() {
  const repos = await fetchGitHubRepos();

  return (
    <main data-ascii-decode className="relative z-10 min-h-screen text-foreground">
      {/* Text-first page: the whole thing decodes out of symbols on arrival */}
      <DecodeOnMount />
      <div
        data-ascii-quiet="0.85"
        className="relative mx-auto max-w-5xl px-6 sm:px-10 lg:px-12 pt-28 pb-16 sm:pt-32 sm:pb-20"
      >
        <header className="mb-10 space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">
            <span className="text-accent">$</span> ls ~/projects
          </p>
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-[-0.03em]">Projects</h1>
          <p className="max-w-xl text-lg text-text-muted">A collection of things I&apos;ve built.</p>
          <p className="font-mono text-[11px] tracking-[0.25em] text-text-faint">
            {repos.length} REPOS <span className="mx-2 text-border-theme">/</span> SORTED BY ACTIVITY{" "}
            <span className="mx-2 text-border-theme">/</span> GITHUB API
          </p>
        </header>

        <ProjectsList repos={repos} />
      </div>
    </main>
  );
}
