import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Github } from "lucide-react";
import { projects } from "@/data/projects";
import FadeIn from "@/components/FadeIn";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="relative min-h-screen text-neutral-200 bg-[#0a0a0a]">
      {/* Diagonal gradient bands */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
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

      <div className="relative mx-auto max-w-3xl px-6 sm:px-10 lg:px-12 py-16 sm:py-20">
        {/* Back link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-emerald-400 transition-colors mb-12"
        >
          <ArrowLeft size={16} />
          All projects
        </Link>

        {/* Title block */}
        <FadeIn className="space-y-4 mb-12">
          <span className="text-[11px] tracking-[0.25em] text-neutral-500 uppercase">
            {project.category}
          </span>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            {project.title}
          </h1>

          <p className="text-neutral-400 text-lg leading-relaxed max-w-2xl">
            {project.description}
          </p>

          {/* Tech pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {project.tech.map((t) => (
              <span
                key={t}
                className="rounded-full border border-neutral-800 px-3 py-1 text-sm text-neutral-300"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 pt-2">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Github size={16} />
                Source
              </a>
            )}
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <ArrowUpRight size={16} />
                Live
              </a>
            )}
          </div>
        </FadeIn>

        <div className="h-px w-full bg-neutral-800/60 mb-12" />

        {/* Case study sections */}
        <div className="space-y-16">
          <FadeIn delay={0.05} className="space-y-4">
            <h2 className="text-sm text-neutral-500 tracking-[0.35em]">
              PROBLEM
            </h2>
            <div className="h-px w-full bg-neutral-800/40" />
            <p className="text-neutral-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              {project.problem}
            </p>
          </FadeIn>

          <FadeIn delay={0.1} className="space-y-4">
            <h2 className="text-sm text-neutral-500 tracking-[0.35em]">
              APPROACH
            </h2>
            <div className="h-px w-full bg-neutral-800/40" />
            <p className="text-neutral-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              {project.approach}
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="space-y-4">
            <h2 className="text-sm text-neutral-500 tracking-[0.35em]">
              RESULT
            </h2>
            <div className="h-px w-full bg-neutral-800/40" />
            <p className="text-neutral-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              {project.result}
            </p>
          </FadeIn>
        </div>

        {/* Footer */}
        <div className="mt-24 pt-8 border-t border-neutral-800/60">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to all projects
          </Link>
        </div>
      </div>
    </main>
  );
}
