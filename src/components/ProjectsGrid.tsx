"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Github } from "lucide-react";
import {
  projects,
  categories,
  type Category,
  type Project,
} from "@/data/projects";

export default function ProjectsGrid() {
  const [active, setActive] = useState<Category>("All");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const filtered =
    active === "All"
      ? projects
      : projects.filter((p) => p.category === active);

  return (
    <>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:auto-rows-fr">
        {filtered.map((project, i) => (
          <BentoCard
            key={project.slug}
            project={project}
            index={i}
            mounted={mounted}
          />
        ))}
      </div>
    </>
  );
}

function BentoCard({
  project,
  index,
  mounted,
}: {
  project: Project;
  index: number;
  mounted: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouch || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (y - 0.5) * -14, y: (x - 0.5) * 14 });
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
    <div
      className={`${colSpan} transition-all duration-500 ease-out ${
        mounted
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-5 scale-[0.97]"
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
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
        className="relative h-full rounded-2xl border border-neutral-800/80 bg-neutral-950/50 overflow-hidden group"
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
    </div>
  );
}
