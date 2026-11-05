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
import { CHAIN, CHAINS, ISLANDS, ISLE, isleColor } from "./world";

const hover = (k: number) => window.dispatchEvent(new CustomEvent("ocean:isle", { detail: k }));
const focus = (k: number) => window.dispatchEvent(new CustomEvent("ocean:focus", { detail: k }));
const setAll = (on: boolean) => window.dispatchEvent(new CustomEvent("ocean:all", { detail: on }));

/** Every project, split into the two chains (Professional, Personal), at most CHAIN.max each. */
export function splitChains(all: GitHubRepo[]): GitHubRepo[][] {
  return CHAINS.map((c) => all.filter((r) => (r.category ?? "Personal") === c.label).slice(0, CHAIN.max));
}
/** Global island index of project i in chain `row`. */
const chainK = (row: number, i: number) => ISLANDS.length + row * CHAIN.max + i;

/** Island k's centre and radius on screen (CSS px), or null if it isn't visible. */
function islandOnScreen(k: number): { x: number; y: number; r: number } | null {
  const project = oceanView.project;
  const isles = oceanView.isles?.();
  if (!project || !isles) return null;
  const c = isles.centre(k);
  const a = project([c[0], ISLE.height * 0.35, c[1]]);
  const b = project([c[0] + ISLE.r, 0, c[1]]);
  if (!a || !b) return null;
  return { x: a[0], y: a[1], r: Math.hypot(b[0] - a[0], b[1] - a[1]) };
}

/** The close-up: the island on the left, its project's full details on the right. */
function ProjectView({
  repo,
  color,
  label,
  back,
  onClose,
  onImage,
  onAll,
}: {
  repo: GitHubRepo;
  color: number;
  /** Where it is, e.g. "Projects · 2 of 4". */
  label: string;
  back: string;
  onClose: () => void;
  onImage: (i: number) => void;
  /** Open All projects (only from the featured chain). */
  onAll?: () => void;
}) {
  const c = accent(color);
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
        <Kicker n="04" color={color}>
          {label}
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
          {onAll && (
            <button
              onClick={onAll}
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-foreground underline decoration-accent/60 underline-offset-[6px] transition-colors hover:text-accent"
            >
              All projects
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 pt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-text-faint transition-colors hover:text-foreground"
        >
          <ArrowLeft size={13} /> {back} <span className="normal-case tracking-normal opacity-60">(Esc)</span>
        </button>
      </div>
    </motion.section>
  );
}

/**
 * Projects: one column under each island, in the island's colour. Each appears as its island
 * forms; positions come from the ocean's camera every frame, so they stay under their islands.
 *
 * "All projects" takes the camera off to the right and up, over two more chains (Professional in
 * front, Personal behind), each island labelled; any island opens the same close-up.
 */
export default function ProjectIsles({
  u,
  projects,
  chains,
}: {
  u: MotionValue<number>;
  projects: GitHubRepo[];
  chains: GitHubRepo[][];
}) {
  const cols = useRef<(HTMLDivElement | null)[]>([]);
  const tags = useRef<(HTMLDivElement | null)[]>([]);
  const heads = useRef<(HTMLDivElement | null)[]>([]);
  const backRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(-1);
  const openRef = useRef(-1);
  const [all, setAllState] = useState(false);
  const allRef = useRef(false);
  const [image, setImage] = useState<number | null>(null);
  const imageRef = useRef(false);
  useEffect(() => {
    imageRef.current = image !== null;
  }, [image]);

  const nFeat = Math.min(projects.length, ISLANDS.length);
  /** Island k's project and colour. */
  const at = (k: number): { repo: GitHubRepo; label: string } | null => {
    if (k < ISLANDS.length) return projects[k] ? { repo: projects[k], label: `Projects · ${k + 1} of ${nFeat}` } : null;
    const j = k - ISLANDS.length;
    const row = Math.floor(j / CHAIN.max);
    const i = j % CHAIN.max;
    const repo = chains[row]?.[i];
    return repo ? { repo, label: `${CHAINS[row].label} · ${i + 1} of ${chains[row].length}` } : null;
  };
  /** The islands you can pick right now. */
  const pickable = () =>
    allRef.current
      ? chains.flatMap((c, row) => c.map((_, i) => chainK(row, i)))
      : projects.slice(0, ISLANDS.length).map((_, k) => k);

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
  const openAll = (on: boolean) => {
    if (openRef.current >= 0) close();
    setAll(on);
  };

  // The button in the stop (and the close-up's link) send ocean:all; follow it here too.
  useEffect(() => {
    const on = (e: Event) => {
      allRef.current = (e as CustomEvent<boolean>).detail;
      setAllState(allRef.current);
    };
    window.addEventListener("ocean:all", on);
    return () => window.removeEventListener("ocean:all", on);
  }, []);

  // Off the route (a close-up or All projects): no scrolling it; Esc, a scroll or a click on open
  // water steps back (close-up → where you came from, All projects → the featured chain).
  const away = open >= 0 || all;
  useEffect(() => {
    const html = document.documentElement;
    if (!away) return;
    html.style.overflow = "hidden";
    // The stop's own text ("Featured work") steps aside.
    const stops = Array.from(document.querySelectorAll<HTMLElement>("section[data-ocean-stop]"));
    stops.forEach((el) => (el.style.visibility = "hidden"));
    const back = () => {
      if (imageRef.current) return;
      if (openRef.current >= 0) close();
      else if (allRef.current) setAll(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && back();
    window.addEventListener("keydown", key);
    window.addEventListener("wheel", back, { passive: true });
    return () => {
      html.style.overflow = "";
      stops.forEach((el) => (el.style.visibility = ""));
      window.removeEventListener("keydown", key);
      window.removeEventListener("wheel", back);
    };
  }, [away]);

  // Hovering / clicking an island in the water.
  useEffect(() => {
    const pick = (x: number, y: number) => {
      const rise = oceanView.isles?.().rise;
      if (!rise) return -1;
      if (!allRef.current && rise[ISLANDS.length - 1] < 0.9 && openRef.current < 0) return -1;
      let best = -1;
      let bestD = Infinity;
      pickable().forEach((k) => {
        if (rise[k] < 0.9) return;
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
    const interactive = (t: EventTarget | null) =>
      !!(t as Element | null)?.closest?.("a, button, [data-ocean-col], header, [role=dialog]");
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
    // pickable / show read refs and props that are stable for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u, chains, projects]);

  useEffect(() => {
    const i = beatIndex("projects");
    const place = (el: HTMLElement | null, o: number, p: [number, number, number] | null, tx: string) => {
      if (!el) return;
      el.style.opacity = String(o);
      el.style.visibility = o < 0.01 || !p ? "hidden" : "visible";
      el.inert = o < 0.5;
      if (p) el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) ${tx}`;
    };
    const draw = () => {
      const project = oceanView.project;
      const isles = oceanView.isles?.();
      if (!project || !isles) return;
      const v = u.get();
      const closeUp = openRef.current >= 0 ? 0 : 1;
      // Out with the stop once you leave it, and while you're over the other chains.
      const fade = (v > WINDOWS[i].leave ? textOpacity(v, i) : 1) * (1 - Math.min(1, isles.all * 2.5));
      ISLANDS.forEach((isle, k) => {
        // In once its island is mostly formed.
        const o = Math.min(1, Math.max(0, (isleRise(v, k) - 0.55) / 0.45)) * fade * closeUp;
        place(cols.current[k], o, project([isle.c[0], 0, isle.c[1] + ISLE.r * 1.35]), "translateX(-50%)");
      });
      // All projects: a small label under each island, a heading left of each chain.
      chains.forEach((c, row) => {
        c.forEach((_, i) => {
          const k = chainK(row, i);
          const ctr = isles.centre(k);
          const o = Math.min(1, Math.max(0, (isles.rise[k] - 0.6) / 0.4)) * closeUp * (allRef.current ? 1 : 0);
          place(tags.current[k], o, project([ctr[0], 0, ctr[1] + ISLE.r * 1.2]), "translateX(-50%)");
        });
        if (!c.length) return;
        const first = isles.centre(chainK(row, 0));
        const o = Math.min(1, Math.max(0, (isles.rise[chainK(row, 0)] - 0.3) / 0.5)) * closeUp * (allRef.current ? 1 : 0);
        place(heads.current[row], o, project([first[0] - ISLE.r * 1.6, 0, first[1]]), "translate(-100%, -50%)");
      });
      if (backRef.current) {
        const o = allRef.current ? Math.min(1, Math.max(0, (isles.all - 0.6) / 0.4)) * closeUp : 0;
        backRef.current.style.opacity = String(o);
        backRef.current.style.visibility = o < 0.01 ? "hidden" : "visible";
      }
    };
    oceanView.frame.add(draw);
    return () => {
      oceanView.frame.delete(draw);
    };
  }, [u, chains]);

  const cur = open >= 0 ? at(open) : null;
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
      {chains.map((c, row) => (
        <div
          key={CHAINS[row].label}
          ref={(d) => {
            heads.current[row] = d;
          }}
          className="absolute left-0 top-0 whitespace-nowrap pr-2 text-right"
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <div data-ocean-quiet>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: accent(CHAINS[row].color) }}>
              {CHAINS[row].label}
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint">
              {c.length} {c.length === 1 ? "project" : "projects"}
            </p>
          </div>
        </div>
      ))}
      {chains.map((c, row) =>
        c.map((repo, i) => {
          const k = chainK(row, i);
          return (
            <div
              key={`${row}-${repo.name}`}
              ref={(d) => {
                tags.current[k] = d;
              }}
              data-ocean-col
              className="pointer-events-auto absolute left-0 top-0 w-[11rem] transition-opacity duration-300 will-change-transform"
              style={{ opacity: 0, visibility: "hidden" }}
              onMouseEnter={() => hover(k)}
              onMouseLeave={() => hover(-1)}
            >
              <button data-ocean-quiet onClick={() => show(k)} className="group block w-full text-center">
                <span
                  className="block text-[15px] font-semibold tracking-tight transition-opacity group-hover:opacity-80"
                  style={{ color: accent(isleColor(k)) }}
                >
                  {formatRepoName(repo.name)}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
                  {[repo.language, new Date(repo.created_at).getFullYear()].filter(Boolean).join(" · ")}
                </span>
              </button>
            </div>
          );
        }),
      )}
      <button
        ref={backRef}
        onClick={() => openAll(false)}
        className="pointer-events-auto fixed left-6 top-24 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-text-faint transition-colors hover:text-foreground sm:left-[7vw] sm:top-[14vh]"
        style={{ opacity: 0, visibility: "hidden" }}
      >
        <ArrowLeft size={13} /> Featured work <span className="normal-case tracking-normal opacity-60">(Esc)</span>
      </button>
      <div className="pointer-events-auto">
        <AnimatePresence>
          {cur && (
            <ProjectView
              repo={cur.repo}
              color={isleColor(open)}
              label={cur.label}
              back={all ? "Back to all projects" : "Back to the chain"}
              onClose={close}
              onImage={setImage}
              onAll={all ? undefined : () => openAll(true)}
            />
          )}
        </AnimatePresence>
        {cur?.repo.screenshots && (
          <Lightbox
            images={cur.repo.screenshots}
            index={image}
            onClose={() => setImage(null)}
            onIndexChange={setImage}
            alt={formatRepoName(cur.repo.name)}
          />
        )}
      </div>
    </div>
  );
}
