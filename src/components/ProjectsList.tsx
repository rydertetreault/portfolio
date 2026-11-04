"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ChevronLeft, ChevronRight, Github, Lock, Star } from "lucide-react";
import type { GitHubRepo, ProjectCategory } from "@/lib/github";
import { formatRepoName, formatDateRange, formatTopic } from "@/lib/utils";
import Lightbox from "@/components/Lightbox";
import CompanyLogo from "@/components/CompanyLogo";
import AppleIcon from "@/components/icons/AppleIcon";

/**
 * Text-first projects ledger. Everything is real text so the page can be
 * corrupted / decoded wholesale by the ASCII transition; no cards, no images
 * until a row's screenshots are toggled open.
 */

const categories: readonly (ProjectCategory | "All")[] = ["All", "Personal", "Professional"] as const;

const RULE = "─".repeat(120);

const categoryRank = (r: GitHubRepo) => ((r.category ?? "Personal") === "Professional" ? 0 : 1);

/** Repos pinned to the top of their category in the "All" view, in this order. */
const PINNED = ["SnapShift", "bardownski-website"];
const pinRank = (r: GitHubRepo) => {
  const i = PINNED.indexOf(r.name);
  return i === -1 ? PINNED.length : i;
};

export default function ProjectsList({ repos }: { repos: GitHubRepo[] }) {
  const [active, setActive] = useState<ProjectCategory | "All">("All");
  // "All" groups Professional work ahead of Personal, with PINNED repos leading
  // their group; the sort is stable, so everything else keeps the incoming
  // most-recent-activity order.
  // Deep links from the journey (/projects#Pria): land on that row once the page
  // (decode-in, transitions) has settled, and flash it so it's easy to spot.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const timers = [250, 700, 1300].map((ms, i) =>
      window.setTimeout(() => {
        const el = document.getElementById(id);
        if (!el) return;
        if (Math.abs(el.getBoundingClientRect().top - 112) > 8) el.scrollIntoView({ block: "start" });
        if (i === 0) {
          el.classList.add("ring-1", "ring-accent/60");
          window.setTimeout(() => el.classList.remove("ring-1", "ring-accent/60"), 2200);
        }
      }, ms),
    );
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const filtered =
    active === "All"
      ? [...repos].sort((a, b) => categoryRank(a) - categoryRank(b) || pinRank(a) - pinRank(b))
      : repos.filter((r) => (r.category ?? "Personal") === active);

  return (
    <div className="font-mono text-[13px] leading-relaxed">
      {/* Filter line */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.25em] text-text-faint">
        <span>
          <span className="text-accent">$</span> filter
        </span>
        {categories.map((cat) => {
          const on = active === cat;
          return (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              aria-pressed={on}
              className={`cursor-pointer transition-colors ${on ? "text-accent" : "text-text-muted hover:text-foreground"}`}
            >
              [{on ? "x" : " "}] {cat}
            </button>
          );
        })}
        <span className="ml-auto text-text-faint">
          {filtered.length} / {repos.length}
        </span>
      </div>

      <p aria-hidden className="mt-4 overflow-hidden whitespace-nowrap text-border-theme select-none">
        {RULE}
      </p>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-text-faint">no projects match.</p>
      ) : (
        <ol>
          {filtered.map((repo, i) => (
            <Row key={repo.name} repo={repo} n={i + 1} />
          ))}
        </ol>
      )}

      <p aria-hidden className="mt-2 overflow-hidden whitespace-nowrap text-border-theme select-none">
        {RULE}
      </p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-text-faint">
        EOF <span className="mx-2 text-border-theme">/</span> {repos.length} entries
      </p>
    </div>
  );
}

function Row({ repo, n }: { repo: GitHubRepo; n: number }) {
  const [shots, setShots] = useState(false);
  const [more, setMore] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const name = formatRepoName(repo.name);
  const link = (cls = "") =>
    `inline-flex items-center gap-1.5 text-text-muted transition-colors hover:text-accent ${cls}`;
  // Expandable toggles: lime underline so they read as controls, not just links.
  const toggle =
    "inline-flex cursor-pointer items-center gap-1.5 text-text-muted underline decoration-accent decoration-[1.5px] underline-offset-[5px] transition-colors hover:text-accent";

  return (
    <li id={repo.name} className="group scroll-mt-28 border-b border-border-theme/50 py-7 last:border-b-0 sm:py-8">
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-[3.5rem_1fr]">
        {/* index */}
        <span className="text-accent/90 sm:pt-1">{String(n).padStart(2, "0")}</span>

        <div className="min-w-0 space-y-3">
          {/* title line */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {repo.logo && (
              <CompanyLogo src={repo.logo.src} alt={repo.logo.alt} className="h-6 w-6 self-center sm:h-7 sm:w-7" />
            )}
            <h2 className="font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{name}</h2>
            <span className="text-[11px] uppercase tracking-[0.2em] text-text-faint">
              {formatDateRange(repo.created_at, repo.pushed_at)}
              {repo.language && (
                <>
                  <span className="mx-2 text-border-theme">/</span>
                  {repo.language}
                </>
              )}
              {repo.category && (
                <>
                  <span className="mx-2 text-border-theme">/</span>
                  {repo.category}
                </>
              )}
              {repo.stargazers_count > 0 && (
                <>
                  <span className="mx-2 text-border-theme">/</span>
                  <Star size={10} className="-mt-0.5 inline" /> {repo.stargazers_count}
                </>
              )}
            </span>
          </div>

          {repo.subtitle && <p className="text-text-faint">{repo.subtitle}</p>}

          {repo.description && (
            <p className="max-w-3xl font-sans text-[15px] leading-relaxed text-text-muted">{repo.description}</p>
          )}

          {more && repo.longDescription && (
            <div className="max-w-3xl space-y-3 border-l border-accent/40 pl-4 font-sans text-[15px] leading-relaxed text-text-muted">
              {repo.longDescription.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {repo.topics.length > 0 && (
            <p className="text-text-faint">
              <span className="text-border-theme">#</span>{" "}
              {repo.topics.map((t) => formatTopic(t).toLowerCase()).join("  ")}
            </p>
          )}

          {/* actions line */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
            {repo.private ? (
              <span className="inline-flex items-center gap-1.5 text-text-faint">
                <Lock size={12} /> private source
              </span>
            ) : (
              repo.html_url && (
                <a href={repo.html_url} target="_blank" rel="noreferrer" className={link()}>
                  <Github size={12} /> source
                </a>
              )
            )}
            {repo.appStore && (
              <a href={repo.appStore} target="_blank" rel="noreferrer" className={link()}>
                <AppleIcon size={12} /> app store
              </a>
            )}
            {repo.homepage && (
              <a href={repo.homepage} target="_blank" rel="noreferrer" className={link()}>
                <ArrowUpRight size={12} /> live
              </a>
            )}
            {repo.name === "SnapShift" && (
              <>
                <Link href="/projects/snapshift/privacy-policy" className={link()}>
                  privacy
                </Link>
                <Link href="/projects/snapshift/support" className={link()}>
                  support
                </Link>
              </>
            )}
            {repo.longDescription && (
              <button onClick={() => setMore((v) => !v)} className={toggle}>
                [{more ? "-" : "+"}] {more ? "less" : "more"}
              </button>
            )}
            {repo.screenshots && repo.screenshots.length > 0 && (
              <button onClick={() => setShots((v) => !v)} className={toggle}>
                [{shots ? "-" : "+"}] {repo.screenshots.length} screenshot{repo.screenshots.length > 1 ? "s" : ""}
              </button>
            )}
          </div>

          {/* screenshots strip (opt-in) */}
          {shots && repo.screenshots && (
            <ScreenshotStrip images={repo.screenshots} name={name} onOpen={setLightbox} />
          )}
        </div>
      </div>

      {repo.screenshots && (
        <Lightbox
          images={repo.screenshots}
          alt={name}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={(i) => setLightbox(i)}
        />
      )}
    </li>
  );
}

/**
 * Horizontally scrolling thumbnail strip with explicit prev/next controls, so
 * screenshots past the edge are discoverable without a horizontal scroll wheel.
 * Arrows only appear when there is more to see in that direction.
 */
function ScreenshotStrip({
  images,
  name,
  onOpen,
}: {
  images: string[];
  name: string;
  onOpen: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [range, setRange] = useState<[number, number]>([1, images.length]);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 });
    // Which thumbnails are (mostly) in view, for the "3-5 / 7" counter.
    const box = el.getBoundingClientRect();
    const seen = [...el.children]
      .map((c, i) => ({ r: c.getBoundingClientRect(), i }))
      .filter(({ r }) => r.left >= box.left - r.width / 2 && r.right <= box.right + r.width / 2)
      .map(({ i }) => i + 1);
    if (seen.length) setRange([seen[0], seen[seen.length - 1]]);
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 cursor-pointer items-center justify-center border border-border-theme bg-background/90 text-foreground backdrop-blur-sm transition-colors hover:border-accent hover:text-accent";

  return (
    <div className="space-y-2 pt-2">
      <div className="relative">
        <div
          ref={ref}
          onScroll={measure}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
        >
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => onOpen(i)}
              className="relative h-40 w-64 shrink-0 snap-start cursor-zoom-in overflow-hidden border border-border-theme/60 bg-background/40 transition-colors hover:border-accent"
              aria-label={`Open screenshot ${i + 1} of ${images.length} for ${name}`}
            >
              <Image src={src} alt="" fill sizes="256px" className="object-cover object-top" />
            </button>
          ))}
        </div>

        {/* edge fades hint that the strip continues */}
        {edges.left && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
        )}
        {edges.right && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
        )}
        {edges.left && (
          <button onClick={() => page(-1)} className={`${arrow} left-2`} aria-label="Previous screenshots">
            <ChevronLeft size={18} />
          </button>
        )}
        {edges.right && (
          <button onClick={() => page(1)} className={`${arrow} right-2`} aria-label="More screenshots">
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {(edges.left || edges.right) && (
        <p className="text-[11px] uppercase tracking-[0.2em] text-text-faint">
          {range[0] === range[1] ? range[0] : `${range[0]}–${range[1]}`} / {images.length}
          <span className="mx-2 text-border-theme">/</span>
          click a screenshot to enlarge
        </p>
      )}
    </div>
  );
}
