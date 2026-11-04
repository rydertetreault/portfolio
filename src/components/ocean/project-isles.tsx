"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import type { GitHubRepo } from "@/lib/github";
import { formatRepoName } from "@/lib/utils";
import Lightbox from "@/components/Lightbox";
import { oceanView } from "./nav";
import { WINDOWS, beatIndex, isleRise, textOpacity } from "./route";
import { Kicker, Out, accent } from "./stops";
import { ISLANDS, ISLE } from "./world";

const hover = (k: number) => window.dispatchEvent(new CustomEvent("ocean:isle", { detail: k }));
const focus = (k: number) => window.dispatchEvent(new CustomEvent("ocean:focus", { detail: k }));

/** Island k's centre and radius on screen (CSS px), or null if it isn't visible. */
function islandOnScreen(k: number): { x: number; y: number; r: number } | null {
  const project = oceanView.project;
  if (!project) return null;
  const c = ISLANDS[k].c;
  const a = project([c[0], ISLE.height * 0.35, c[1]]);
  const b = project([c[0] + ISLE.r, 0, c[1]]);
  if (!a || !b) return null;
  return { x: a[0], y: a[1], r: Math.hypot(b[0] - a[0], b[1] - a[1]) };
}

/** The close-up: the island on the left, its project's full details on the right. */
function ProjectView({
  repo,
  k,
  n,
  onClose,
  onImage,
}: {
  repo: GitHubRepo;
  k: number;
  n: number;
  onClose: () => void;
  onImage: (i: number) => void;
}) {
  const c = accent(ISLANDS[k].color);
  const shots = repo.screenshots ?? [];
  return (
    <motion.section
      key={repo.name}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.5 } }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
      aria-label={formatRepoName(repo.name)}
      className="fixed left-6 right-6 top-24 z-20 sm:left-auto sm:right-[7vw] sm:top-[14vh] sm:w-[min(32rem,40vw)]"
    >
      <div data-ocean-quiet className="space-y-5">
        <Kicker n="04" color={ISLANDS[k].color}>
          Projects · {k + 1} of {n}
        </Kicker>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{formatRepoName(repo.name)}</h2>
          {repo.subtitle && (
            <p className="mt-1 text-[17px]" style={{ color: c }}>
              {repo.subtitle}
            </p>
          )}
        </div>
        <p className="max-h-[34vh] overflow-y-auto pr-1 text-[15px] leading-relaxed text-text-muted [scrollbar-width:thin]">
          {repo.longDescription ?? repo.description ?? ""}
        </p>
        {shots.length > 0 && (
          <div className="flex gap-3">
            {shots.slice(0, 3).map((src, i) => (
              <button
                key={src}
                onClick={() => onImage(i)}
                aria-label={`Screenshot ${i + 1} of ${shots.length}`}
                className="group relative aspect-[16/10] w-1/3 overflow-hidden border border-border-theme/60 transition-colors hover:border-foreground/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />
                {i === 2 && shots.length > 3 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/70 font-mono text-xs text-foreground">
                    +{shots.length - 3}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-faint">
          {[repo.language, repo.private ? "private" : null, new Date(repo.created_at).getFullYear()]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {repo.homepage && <Out href={repo.homepage}>Live site</Out>}
          {!repo.private && <Out href={repo.html_url}>Source</Out>}
          {repo.private && (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-text-faint">
              <Lock size={12} /> Private repo
            </span>
          )}
          <Out href="/projects">All projects</Out>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 pt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-text-faint transition-colors hover:text-foreground"
        >
          <ArrowLeft size={13} /> Back to the chain <span className="normal-case tracking-normal opacity-60">(Esc)</span>
        </button>
      </div>
    </motion.section>
  );
}

/**
 * Projects: one column under each island, in the island's colour. Each appears as its island
 * forms; positions come from the ocean's camera every frame, so they stay under their islands.
 */
export default function ProjectIsles({ u, projects }: { u: MotionValue<number>; projects: GitHubRepo[] }) {
  const cols = useRef<(HTMLDivElement | null)[]>([]);
  const [open, setOpen] = useState(-1);
  const openRef = useRef(-1);
  const [image, setImage] = useState<number | null>(null);
  const imageRef = useRef(false);
  useEffect(() => {
    imageRef.current = image !== null;
  }, [image]);

  const show = (k: number) => {
    openRef.current = k;
    setOpen(k);
    focus(k);
    hover(k);
  };
  const close = () => {
    openRef.current = -1;
    setOpen(-1);
    focus(-1);
    hover(-1);
  };

  // While a close-up is open: no scrolling the route; Esc, a scroll or a click on open water returns.
  useEffect(() => {
    const html = document.documentElement;
    if (open < 0) return;
    html.style.overflow = "hidden";
    // The stop's own text ("Featured work") steps aside for the close-up.
    const stops = Array.from(document.querySelectorAll<HTMLElement>("section[data-ocean-stop]"));
    stops.forEach((el) => (el.style.visibility = "hidden"));
    const key = (e: KeyboardEvent) => e.key === "Escape" && !imageRef.current && close();
    const wheel = () => !imageRef.current && close();
    window.addEventListener("keydown", key);
    window.addEventListener("wheel", wheel, { passive: true });
    return () => {
      html.style.overflow = "";
      stops.forEach((el) => (el.style.visibility = ""));
      window.removeEventListener("keydown", key);
      window.removeEventListener("wheel", wheel);
    };
     
  }, [open]);

  // Hovering / clicking an island in the water.
  useEffect(() => {
    const pick = (x: number, y: number) => {
      if (isleRise(u.get(), ISLANDS.length - 1) < 0.9 && openRef.current < 0) return -1;
      let best = -1;
      let bestD = Infinity;
      ISLANDS.forEach((_, k) => {
        if (isleRise(u.get(), k) < 0.9) return;
        const s = islandOnScreen(k);
        if (!s) return;
        const d = Math.hypot(x - s.x, (y - s.y) * 1.4) / s.r;
        if (d < 1.1 && d < bestD) {
          bestD = d;
          best = k;
        }
      });
      return best;
    };
    const interactive = (t: EventTarget | null) => !!(t as Element | null)?.closest?.("a, button, [data-ocean-col], header, [role=dialog]");
    let hovered = -1;
    const move = (e: PointerEvent) => {
      if (openRef.current >= 0 || interactive(e.target)) return;
      const k = pick(e.clientX, e.clientY);
      if (k !== hovered) {
        hovered = k;
        hover(k);
        document.body.style.cursor = k >= 0 ? "pointer" : "";
      }
    };
    const click = (e: MouseEvent) => {
      if (interactive(e.target) || imageRef.current) return;
      if (openRef.current >= 0) {
        // In a close-up: clicking the water (not the details) goes back.
        if (!(e.target as Element).closest("section")) close();
        return;
      }
      const k = pick(e.clientX, e.clientY);
      if (k >= 0) show(k);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("click", click);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("click", click);
      document.body.style.cursor = "";
    };
     
  }, [u]);

  useEffect(() => {
    const i = beatIndex("projects");
    const draw = () => {
      const project = oceanView.project;
      if (!project) return;
      const v = u.get();
      // Out with the stop once you leave it.
      const fade = v > WINDOWS[i].leave ? textOpacity(v, i) : 1;
      ISLANDS.forEach((isle, k) => {
        const col = cols.current[k];
        if (!col) return;
        // In once its island is mostly formed.
        const o = Math.min(1, Math.max(0, (isleRise(v, k) - 0.55) / 0.45)) * fade * (openRef.current >= 0 ? 0 : 1);
        col.style.opacity = String(o);
        col.style.visibility = o < 0.01 ? "hidden" : "visible";
        col.inert = o < 0.5;
        const s = project([isle.c[0], 0, isle.c[1] + ISLE.r * 1.35]);
        if (s) col.style.transform = `translate(${s[0].toFixed(1)}px, ${(s[1] + 8).toFixed(1)}px) translateX(-50%)`;
      });
    };
    oceanView.frame.add(draw);
    return () => {
      oceanView.frame.delete(draw);
    };
  }, [u]);

  return (
    <div data-ocean-stop className="pointer-events-none fixed inset-0 z-10">
      {projects.slice(0, ISLANDS.length).map((repo, k) => {
        const c = accent(ISLANDS[k].color);
        return (
          <div
            key={repo.name}
            ref={(d) => {
              cols.current[k] = d;
            }}
            data-ocean-col
            className="pointer-events-auto absolute left-0 top-0 w-[min(17rem,22vw)] transition-opacity duration-300 will-change-transform"
            style={{ opacity: 0, visibility: "hidden" }}
            onMouseEnter={() => hover(k)}
            onMouseLeave={() => hover(-1)}
            onFocus={() => hover(k)}
            onBlur={() => hover(-1)}
          >
            <article data-ocean-quiet className="space-y-2.5 text-center">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  <button onClick={() => show(k)} className="transition-colors hover:text-accent">
                    {formatRepoName(repo.name)}
                  </button>
                </h3>
                {repo.subtitle && (
                  <p className="mt-0.5 text-[14px]" style={{ color: c }}>
                    {repo.subtitle}
                  </p>
                )}
              </div>
              <p className="line-clamp-3 text-[14px] leading-relaxed text-text-muted">
                {repo.description ?? repo.longDescription ?? ""}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint">
                {[repo.language, repo.private ? "private" : null, new Date(repo.created_at).getFullYear()]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                <button
                  onClick={() => show(k)}
                  className="font-mono text-xs uppercase tracking-[0.18em] text-foreground underline decoration-accent/60 underline-offset-[6px] transition-colors hover:text-accent"
                >
                  Details
                </button>
                {repo.homepage && <Out href={repo.homepage}>Live</Out>}
                {!repo.private && !repo.homepage && <Out href={repo.html_url}>Source</Out>}
                {repo.private && !repo.homepage && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-text-faint">
                    <Lock size={12} /> Private
                  </span>
                )}
              </div>
            </article>
          </div>
        );
      })}
      <div className="pointer-events-auto">
        <AnimatePresence>
          {open >= 0 && projects[open] && (
            <ProjectView
              repo={projects[open]}
              k={open}
              n={Math.min(projects.length, ISLANDS.length)}
              onClose={close}
              onImage={setImage}
            />
          )}
        </AnimatePresence>
        {open >= 0 && projects[open]?.screenshots && (
          <Lightbox
            images={projects[open].screenshots!}
            index={image}
            onClose={() => setImage(null)}
            onIndexChange={setImage}
            alt={formatRepoName(projects[open].name)}
          />
        )}
      </div>
    </div>
  );
}
