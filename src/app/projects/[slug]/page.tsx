"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Github } from "lucide-react";
import { projects } from "@/data/projects";

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-2xl font-semibold">Project not found</p>
          <Link
            href="/projects"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Back to projects
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-neutral-200 bg-[#0a0a0a]">
      {/* Glow Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[rgba(34,197,94,0.12)] blur-[120px]" />
        <div className="absolute -bottom-52 -right-52 h-[560px] w-[560px] rounded-full bg-[rgba(34,197,94,0.08)] blur-[140px]" />
      </div>

      {/* Grain Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto max-w-3xl px-6 sm:px-10 lg:px-12 py-16 sm:py-20"
      >
        {/* Back link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-emerald-400 transition-colors mb-12"
        >
          <ArrowLeft size={16} />
          All projects
        </Link>

        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4 mb-12"
        >
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
        </motion.div>

        <div className="h-px w-full bg-neutral-800/60 mb-12" />

        {/* Case study sections */}
        <div className="space-y-16">
          <CaseSection
            title="PROBLEM"
            content={project.problem}
            delay={0.15}
          />
          <CaseSection
            title="APPROACH"
            content={project.approach}
            delay={0.2}
          />
          <CaseSection
            title="RESULT"
            content={project.result}
            delay={0.25}
          />
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
      </motion.div>
    </main>
  );
}

function CaseSection({
  title,
  content,
  delay,
}: {
  title: string;
  content: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="space-y-4"
    >
      <h2 className="text-sm text-neutral-500 tracking-[0.35em]">{title}</h2>
      <div className="h-px w-full bg-neutral-800/40" />
      <p className="text-neutral-300 text-base sm:text-lg leading-relaxed max-w-2xl">
        {content}
      </p>
    </motion.div>
  );
}
