import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProjectsGrid from "@/components/ProjectsGrid";

export default function ProjectsPage() {
  return (
    <main className="relative min-h-screen text-neutral-200 bg-[#0a0a0a]">
      {/* Glow Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[rgba(34,197,94,0.12)] blur-[120px]" />
        <div className="absolute -bottom-52 -right-52 h-[560px] w-[560px] rounded-full bg-[rgba(34,197,94,0.08)] blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 sm:px-10 lg:px-12 py-16 sm:py-20">
        {/* Header */}
        <div className="mb-16 space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Projects
          </h1>
          <p className="text-neutral-400 text-lg max-w-xl">
            A collection of things I&apos;ve built — from full-stack apps to
            systems tools and infrastructure experiments.
          </p>
        </div>

        <ProjectsGrid />
      </div>
    </main>
  );
}
