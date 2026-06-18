"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Github,
  Star,
  GitFork,
  Calendar,
  Globe,
  Terminal,
  Bot,
  Cpu,
  Code2,
  Database,
  Shield,
  Gamepad2,
  Smartphone,
  ScrollText,
  LifeBuoy,
  ChevronDown,
  Lock,
} from "lucide-react";
import type { GitHubRepo, ProjectCategory } from "@/lib/github";
import { formatRepoName, formatDateRange } from "@/lib/utils";
import Lightbox from "@/components/Lightbox";
import AppleIcon from "@/components/icons/AppleIcon";

function getProjectIcon(repo: GitHubRepo) {
  const topics = repo.topics.map((t) => t.toLowerCase());
  const name = repo.name.toLowerCase();
  const lang = repo.language?.toLowerCase() ?? "";

  // Check topics/name first for specific matches
  if (topics.some((t) => ["bot", "discord", "chatbot", "automation"].includes(t)) || name.includes("bot"))
    return Bot;
  if (topics.some((t) => ["security", "cybersecurity", "infosec", "cyber"].includes(t)))
    return Shield;
  if (topics.some((t) => ["game", "gamedev", "unity", "godot"].includes(t)))
    return Gamepad2;
  if (topics.some((t) => ["mobile", "ios", "android", "react-native", "flutter"].includes(t)))
    return Smartphone;
  if (topics.some((t) => ["database", "sql", "postgres", "mongodb", "data"].includes(t)))
    return Database;
  if (topics.some((t) => ["web", "website", "frontend", "react", "nextjs", "portfolio"].includes(t)) || name.includes("portfolio") || name.includes("website"))
    return Globe;
  if (topics.some((t) => ["cli", "terminal", "shell", "bash", "devops"].includes(t)))
    return Terminal;

  // Fall back to language
  if (["typescript", "javascript", "html", "css"].includes(lang)) return Globe;
  if (["python", "shell", "bash"].includes(lang)) return Terminal;
  if (["c", "c++", "rust", "go", "assembly"].includes(lang)) return Cpu;
  if (["java", "kotlin"].includes(lang)) return Code2;
  if (["swift"].includes(lang)) return Smartphone;

  return Code2;
}

const categories: readonly (ProjectCategory | "All")[] = [
  "All",
  "Personal",
  "Professional",
] as const;

export default function ProjectsGrid({ repos }: { repos: GitHubRepo[] }) {
  const [active, setActive] = useState<ProjectCategory | "All">("All");
  const [mounted, setMounted] = useState(false);
  const [expandedName, setExpandedName] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const filtered =
    active === "All"
      ? repos
      : repos.filter((r) => (r.category ?? "Personal") === active);

  return (
    <>
      {/* Category Filters */}
      <div className="flex flex-wrap gap-3 mb-12">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActive(cat);
              setExpandedName(null);
            }}
            className={[
              "rounded-full border px-4 py-1.5 text-sm transition-all duration-300 cursor-pointer",
              active === cat
                ? "border-accent bg-accent-subtle text-accent"
                : "border-border-theme bg-transparent text-text-muted hover:border-text-faint hover:text-foreground",
            ].join(" ")}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-text-faint text-center py-20">No projects found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {filtered.map((repo, i) => (
            <div
              key={repo.name}
              className={expandedName === repo.name ? "md:col-span-2" : ""}
            >
              <RepoCard
                repo={repo}
                index={i}
                mounted={mounted}
                expanded={expandedName === repo.name}
                onToggle={() =>
                  setExpandedName((prev) =>
                    prev === repo.name ? null : repo.name
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function RepoCard({
  repo,
  index,
  mounted,
  expanded,
  onToggle,
}: {
  repo: GitHubRepo;
  index: number;
  mounted: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouch || !ref.current || expanded) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (y - 0.5) * -10, y: (x - 0.5) * 10 });
  };

  const resetTilt = () => {
    setTilt({ x: 0, y: 0 });
    setHovering(false);
  };

  const Icon = getProjectIcon(repo);

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        mounted
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-5 scale-[0.97]"
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={resetTilt}
        style={{
          transform: expanded
            ? "none"
            : `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: hovering
            ? "transform 0.1s ease-out"
            : "transform 0.4s ease-out",
        }}
        className="relative rounded-2xl border border-border-theme bg-surface-alt overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* Spotlight glare */}
        {hovering && !expanded && (
          <div
            className="pointer-events-none absolute inset-0 z-10 opacity-[0.06] transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${(tilt.y / 10 + 0.5) * 100}% ${(-tilt.x / 10 + 0.5) * 100}%, rgba(255,255,255,0.8), transparent 60%)`,
            }}
          />
        )}

        {/* Preview Area */}
        <div className="relative h-40 overflow-hidden bg-surface-alt">
          {/* Dot grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          {/* Accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-theme to-transparent" />

          {/* Icon */}
          <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
            <Icon
              size={48}
              strokeWidth={1}
              className="text-text-faint group-hover:text-text-muted transition-colors duration-300"
            />
          </div>

          {/* Language + name overlay */}
          <div className="relative h-full flex flex-col justify-end p-6 sm:p-8">
            {repo.language && (
              <span className="text-[11px] tracking-[0.2em] text-text-faint uppercase mb-2">
                {repo.language}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight group-hover:text-accent-hover transition-colors duration-300">
              {formatRepoName(repo.name)}
            </h2>
            {repo.subtitle && (
              <p className="text-xs sm:text-sm text-text-faint mt-1.5">
                {repo.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 pt-5 space-y-5">
          {repo.description && (
            <p className="text-text-muted text-sm sm:text-base leading-relaxed">
              {repo.description}
            </p>
          )}

          {/* Time + Stats */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-faint">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              {formatDateRange(repo.created_at, repo.pushed_at)}
            </span>
            {repo.stargazers_count > 0 && (
              <span className="flex items-center gap-1">
                <Star size={13} />
                {repo.stargazers_count}
              </span>
            )}
            {repo.forks_count > 0 && (
              <span className="flex items-center gap-1">
                <GitFork size={13} />
                {repo.forks_count}
              </span>
            )}
          </div>

          {/* Topics */}
          {repo.topics.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {repo.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-border-theme px-2.5 py-0.5 text-xs text-text-muted"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Action Links */}
          <div
            className="flex flex-wrap items-center gap-3 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            {repo.private ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-text-muted">
                <Lock size={14} />
                Private repo
              </span>
            ) : (
              repo.html_url && (
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-all duration-200"
                >
                  <Github size={15} />
                  GitHub
                </a>
              )
            )}

            {repo.appStore && (
              <a
                href={repo.appStore}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-all duration-200"
              >
                <AppleIcon size={15} />
                App Store
              </a>
            )}

            {repo.homepage && (
              <a
                href={repo.homepage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-all duration-200"
              >
                <ArrowUpRight size={15} />
                Live Site
              </a>
            )}

            {repo.name === "SnapShift" && (
              <>
                <Link
                  href="/projects/snapshift/privacy-policy"
                  className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-all duration-200"
                >
                  <ScrollText size={15} />
                  Privacy Policy
                </Link>
                <Link
                  href="/projects/snapshift/support"
                  className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-all duration-200"
                >
                  <LifeBuoy size={15} />
                  Support
                </Link>
              </>
            )}
          </div>

          {/* Expand chevron */}
          {repo.longDescription && (
            <div className="flex justify-end pt-1">
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-text-faint group-hover:text-text-muted transition-colors"
                aria-hidden="true"
              >
                <ChevronDown size={18} />
              </motion.span>
            </div>
          )}
        </div>

        {/* Expanded content */}
        <AnimatePresence initial={false}>
          {expanded && repo.longDescription && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="overflow-hidden border-t border-border-theme"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-3 text-text-muted text-sm sm:text-base leading-relaxed">
                  {repo.longDescription.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {repo.screenshots && repo.screenshots.length > 0 && (
                  <ScreenshotGallery
                    screenshots={repo.screenshots}
                    projectName={formatRepoName(repo.name)}
                    isPrivate={!!repo.private}
                    onOpen={(i) => setLightboxIndex(i)}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {repo.screenshots && (
        <Lightbox
          images={repo.screenshots}
          index={lightboxIndex}
          alt={formatRepoName(repo.name)}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={(i) => setLightboxIndex(i)}
        />
      )}
    </div>
  );
}

function ScreenshotGallery({
  screenshots,
  projectName,
  isPrivate,
  onOpen,
}: {
  screenshots: string[];
  projectName: string;
  isPrivate: boolean;
  onOpen: (i: number) => void;
}) {
  // Heuristic: phone screenshots live under /snapshift/ (portrait).
  // Otherwise assume landscape.
  const isPortrait = (src: string) =>
    /\/snapshift\//i.test(src) || /phone|mobile/i.test(src);

  const firstPortrait = isPortrait(screenshots[0]);

  return (
    <div className="space-y-3">
      {isPrivate && (
        <p className="text-xs text-text-faint italic">
          Interface only — client content redacted for privacy.
        </p>
      )}
      <div
        className={
          firstPortrait
            ? "flex flex-wrap gap-4"
            : "grid grid-cols-1 sm:grid-cols-2 gap-4"
        }
      >
        {screenshots.map((src, i) => {
          const portrait = isPortrait(src);
          return (
            <button
              key={src}
              onClick={(e) => {
                e.stopPropagation();
                onOpen(i);
              }}
              className={[
                "group/shot relative overflow-hidden rounded-xl border border-border-theme bg-surface-alt",
                "hover:border-accent transition-all duration-200 cursor-zoom-in",
                portrait ? "w-[120px] sm:w-[140px]" : "w-full",
              ].join(" ")}
              aria-label={`Open ${projectName} screenshot ${i + 1}`}
            >
              <div className={portrait ? "aspect-[9/19.5]" : "aspect-[16/9]"}>
                <Image
                  src={src}
                  alt={`${projectName} screenshot ${i + 1}`}
                  width={portrait ? 280 : 1600}
                  height={portrait ? 600 : 900}
                  className="h-full w-full object-cover group-hover/shot:scale-[1.02] transition-transform duration-300"
                  unoptimized
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
