import { fetchGitHubRepos } from "@/lib/github";
import ProjectsGrid from "@/components/ProjectsGrid";

export default async function ProjectsPage() {
  const repos = await fetchGitHubRepos();

  return (
    <main className="relative min-h-screen text-neutral-200 bg-[#0a0a0a]">
      {/* Diagonal gradient bands (dimmed) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-50">
        <div
          className="absolute -top-full left-[10%] w-[300px] h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(90deg, transparent, rgba(34,197,94,0.05), transparent)",
          }}
        />
        <div
          className="absolute -top-full right-[20%] w-[220px] h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(90deg, transparent, rgba(34,197,94,0.035), transparent)",
          }}
        />
        <div
          className="absolute -top-full left-[30%] w-px h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(180deg, transparent 10%, rgba(34,197,94,0.20) 50%, transparent 90%)",
          }}
        />
        <div
          className="absolute -top-full right-[35%] w-px h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(180deg, transparent 15%, rgba(34,197,94,0.12) 50%, transparent 85%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 sm:px-10 lg:px-12 pt-28 pb-16 sm:pt-32 sm:pb-20">
        {/* Header */}
        <div className="mb-16 space-y-4">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Projects
          </h1>
          <p className="text-neutral-400 text-lg max-w-xl">
            A collection of things I&apos;ve built.
          </p>
        </div>

        <ProjectsGrid repos={repos} />
      </div>
    </main>
  );
}
