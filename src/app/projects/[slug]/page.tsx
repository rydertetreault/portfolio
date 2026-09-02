import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Github } from "lucide-react";
import { projects } from "@/data/projects";
import FadeIn from "@/components/FadeIn";
import AsciiReveal from "@/components/ascii-ui/AsciiReveal";
import { Panel, Prompt } from "@/components/ascii-ui";

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
    <main className="relative z-10 min-h-screen text-foreground">
      <div className="relative mx-auto max-w-3xl px-6 sm:px-10 lg:px-12 pt-28 pb-16 sm:pt-32 sm:pb-20">
        {/* Back link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-text-faint hover:text-accent transition-colors mb-10"
        >
          <ArrowLeft size={14} />
          cd ..
        </Link>

        {/* Title block */}
        <FadeIn className="space-y-4 mb-12">
          <Prompt command={`cat ~/projects/${project.slug}`} />
          <span className="block font-mono text-[11px] tracking-[0.25em] text-text-faint uppercase">
            <span className="text-accent">{">"}</span> {project.category}
          </span>

          <AsciiReveal
            as="h1"
            text={project.title}
            className="block text-4xl sm:text-5xl font-semibold tracking-[-0.03em]"
          />

          <p className="text-text-muted text-lg leading-relaxed max-w-2xl">
            {project.description}
          </p>

          {/* Tech pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {project.tech.map((t) => (
              <span
                key={t}
                className="border border-border-theme/60 bg-background/40 px-2.5 py-1 font-mono text-xs tracking-wider text-foreground"
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
                className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
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
                className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                <ArrowUpRight size={16} />
                Live
              </a>
            )}
          </div>
        </FadeIn>

        <div className="h-px w-full bg-border-theme mb-12" />

        {/* Case study sections */}
        <Panel className="rounded-md px-6 py-10 sm:px-10 sm:py-12 space-y-16" quiet={0.75}>
          <FadeIn delay={0.05} className="space-y-4">
            <h2 className="flex items-center gap-3 font-mono text-xs text-text-faint tracking-[0.3em]">
              <span className="text-accent">01</span>
              <span className="text-border-theme">{"//"}</span>
              PROBLEM
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <p className="text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              {project.problem}
            </p>
          </FadeIn>

          <FadeIn delay={0.1} className="space-y-4">
            <h2 className="flex items-center gap-3 font-mono text-xs text-text-faint tracking-[0.3em]">
              <span className="text-accent">02</span>
              <span className="text-border-theme">{"//"}</span>
              APPROACH
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <p className="text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              {project.approach}
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="space-y-4">
            <h2 className="flex items-center gap-3 font-mono text-xs text-text-faint tracking-[0.3em]">
              <span className="text-accent">03</span>
              <span className="text-border-theme">{"//"}</span>
              RESULT
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <p className="text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              {project.result}
            </p>
          </FadeIn>
        </Panel>

        {/* Footer */}
        <div className="mt-24 pt-8 border-t border-border-theme">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-text-faint hover:text-accent transition-colors"
          >
            <ArrowLeft size={16} />
            Back to all projects
          </Link>
        </div>
      </div>
    </main>
  );
}
