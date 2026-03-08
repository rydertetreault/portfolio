"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Github } from "lucide-react";
import { projects, categories, type Category, type Project } from "@/data/projects";

export default function ProjectsPage() {
  const [active, setActive] = useState<Category>("All");

  const filtered =
    active === "All"
      ? projects
      : projects.filter((p) => p.category === active);

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
        className="relative mx-auto max-w-6xl px-6 sm:px-10 lg:px-12 py-16 sm:py-20"
      >
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

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={[
                "rounded-full border px-4 py-1.5 text-sm transition-all duration-300 cursor-pointer",
                active === cat
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300"
                  : "border-neutral-800 bg-transparent text-neutral-400 hover:border-neutral-600 hover:text-neutral-200",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Bento Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:auto-rows-fr">
          <AnimatePresence mode="popLayout">
            {filtered.map((project, i) => (
              <BentoCard key={project.slug} project={project} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </main>
  );
}

/* -------- Bento Card with 3D Tilt -------- */

function BentoCard({ project, index }: { project: Project; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  React.useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouch || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      x: (y - 0.5) * -14,
      y: (x - 0.5) * 14,
    });
  };

  const resetTilt = () => {
    setTilt({ x: 0, y: 0 });
    setHovering(false);
  };

  const colSpan =
    project.size === "large"
      ? "md:col-span-2"
      : project.size === "medium"
        ? "lg:col-span-1"
        : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      className={colSpan}
    >
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={resetTilt}
        style={{
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: hovering
            ? "transform 0.1s ease-out"
            : "transform 0.4s ease-out",
        }}
        className="relative h-full rounded-2xl border border-neutral-800/80 bg-neutral-950/50 backdrop-blur-sm overflow-hidden group"
      >
        {/* Spotlight glare */}
        {hovering && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07] transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${(tilt.y / 14 + 0.5) * 100}% ${(-tilt.x / 14 + 0.5) * 100}%, rgba(255,255,255,0.8), transparent 60%)`,
            }}
          />
        )}

        <Link
          href={`/projects/${project.slug}`}
          className="block p-6 sm:p-8 h-full"
        >
          <div className="flex flex-col justify-between h-full gap-6">
            <div className="space-y-4">
              {/* Category badge */}
              <span className="inline-block text-[11px] tracking-[0.25em] text-neutral-500 uppercase">
                {project.category}
              </span>

              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight group-hover:text-emerald-300 transition-colors duration-300">
                {project.title}
              </h2>

              <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
                {project.tagline}
              </p>
            </div>

            <div className="space-y-4">
              {/* Tech pills */}
              <div className="flex flex-wrap gap-2">
                {project.tech.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-neutral-800 px-2.5 py-0.5 text-xs text-neutral-400"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Links */}
              <div className="flex items-center gap-3">
                {project.github && (
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(project.github, "_blank");
                    }}
                    className="text-neutral-500 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Github size={16} />
                  </span>
                )}
                {project.live && (
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(project.live, "_blank");
                    }}
                    className="text-neutral-500 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <ArrowUpRight size={16} />
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
