"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, Github, Lock, Star } from "lucide-react";
import CompanyLogo from "@/components/CompanyLogo";
import AppleIcon from "@/components/icons/AppleIcon";
import Lightbox from "@/components/Lightbox";
import HudText from "./HudText";
import { Kicker } from "./cards";
import type { GitHubRepo } from "@/lib/github";
import { formatDateRange, formatRepoName, formatTopic } from "@/lib/utils";

/*
 * Detour panels: what opens over the sea when the camera leaves the journey
 * (see detours.ts). Both are dialogs: Esc / the return button close them, focus
 * moves in on open and back to the opener on close (handled by the caller).
 */

const linkCls =
  "inline-flex items-center gap-1.5 border border-border-theme bg-background/40 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/85 transition-colors hover:border-accent hover:text-accent";

function ReturnButton({ onClose, label = "Return to course" }: { onClose: () => void; label?: string }) {
  return (
    <button
      onClick={onClose}
      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-text-faint transition-colors hover:text-accent"
    >
      <ArrowLeft size={13} /> {label} <span className="text-text-faint/60">[esc]</span>
    </button>
  );
}

function useAutoFocus(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) ref.current?.focus({ preventScroll: true });
  }, [active]);
  return ref;
}

/** A project's full dossier (replaces the old /projects/... page on the homepage). */
export function DossierPanel({
  repo,
  code,
  warm,
  onClose,
  onStep,
  canStep,
}: {
  repo: GitHubRepo;
  /** "03.2" for a waypoint, "A.07" in the archive. */
  code: string;
  warm: boolean;
  onClose: () => void;
  onStep?: (dir: -1 | 1) => void;
  canStep: boolean;
}) {
  const [shot, setShot] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  // Remounted per repo (keyed by the caller), so this replays the decode for each dossier.
  useEffect(() => {
    const t = window.setTimeout(() => setActive(true), 350);
    return () => window.clearTimeout(t);
  }, []);
  const box = useAutoFocus(true);
  const name = formatRepoName(repo.name);
  const shots = repo.screenshots ?? [];
  const live = repo.appStore ?? repo.homepage ?? null;
  const paras = (repo.longDescription ?? repo.description ?? "").split(/\n{2,}/).filter(Boolean);

  return (
    <div
      ref={box}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} dossier`}
      className="max-h-[78vh] space-y-6 overflow-y-auto pr-2 outline-none [scrollbar-width:thin]"
    >
      <ReturnButton onClose={onClose} />
      <div className="space-y-3">
        <Kicker warm={warm}>
          <HudText text={`Dossier ${code} · ${repo.category ?? "Personal"}`} active={active} />
        </Kicker>
        <div className="flex items-center gap-3">
          {repo.logo && <CompanyLogo src={repo.logo.src} alt={repo.logo.alt} className="h-8 w-8" />}
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <HudText text={name} active={active} delay={120} />
          </h2>
        </div>
        {repo.subtitle && <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-faint">{repo.subtitle}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.2em] text-text-faint">
          <span>{formatDateRange(repo.created_at, repo.pushed_at)}</span>
          {repo.language && <span>· {repo.language}</span>}
          {repo.stargazers_count > 0 && (
            <span className="inline-flex items-center gap-1">
              · <Star size={10} /> {repo.stargazers_count}
            </span>
          )}
          {repo.private && (
            <span className="inline-flex items-center gap-1">
              · <Lock size={10} /> private
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 text-[15px] leading-relaxed text-foreground/85">
        {paras.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {shots.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-text-faint">
            Intel feed · {shots.length} frame{shots.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shots.map((src, i) => (
              <button
                key={src}
                onClick={() => setShot(i)}
                className="group relative overflow-hidden border border-border-theme/70"
                aria-label={`Open screenshot ${i + 1} of ${shots.length}`}
              >
                <Image
                  src={src}
                  alt={`${name} screenshot ${i + 1}`}
                  width={360}
                  height={225}
                  className="aspect-[16/10] h-auto w-full object-cover object-top opacity-75 transition-opacity group-hover:opacity-100"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {repo.topics?.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {repo.topics.map((t) => (
            <li key={t} className="border border-border-theme/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-text-faint">
              {formatTopic(t)}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        {live && (
          <a href={live} target="_blank" rel="noreferrer" className={linkCls}>
            {repo.appStore ? <AppleIcon size={12} /> : null}
            {repo.appStore ? "App Store" : "Open site"} <ArrowUpRight size={12} />
          </a>
        )}
        {repo.html_url && !repo.private && (
          <a href={repo.html_url} target="_blank" rel="noreferrer" className={linkCls}>
            <Github size={12} /> Source
          </a>
        )}
      </div>

      {canStep && onStep && (
        <div className="flex justify-between border-t border-border-theme/50 pt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-text-faint">
          <button onClick={() => onStep(-1)} className="inline-flex items-center gap-2 hover:text-accent">
            <ArrowLeft size={12} /> Previous
          </button>
          <button onClick={() => onStep(1)} className="inline-flex items-center gap-2 hover:text-accent">
            Next <ArrowRight size={12} />
          </button>
        </div>
      )}

      {shots.length > 0 && (
        <Lightbox images={shots} alt={name} index={shot} onClose={() => setShot(null)} onIndexChange={setShot} />
      )}
    </div>
  );
}

/** The archive: every project, as a manifest you can open dossiers from. */
export function ArchivePanel({
  repos,
  onOpen,
  onClose,
}: {
  repos: GitHubRepo[];
  onOpen: (repo: GitHubRepo) => void;
  onClose: () => void;
}) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setActive(true), 350);
    return () => window.clearTimeout(t);
  }, []);
  const box = useAutoFocus(true);
  const [filter, setFilter] = useState<"All" | "Professional" | "Personal">("All");
  const list = repos.filter((r) => filter === "All" || (r.category ?? "Personal") === filter);
  return (
    <div
      ref={box}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Project archive"
      className="max-h-[78vh] space-y-5 overflow-y-auto pr-2 outline-none [scrollbar-width:thin]"
    >
      <ReturnButton onClose={onClose} />
      <div className="space-y-2">
        <Kicker warm>
          <HudText text={`The Archive · ${repos.length} signals on record`} active={active} />
        </Kicker>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <HudText text="Everything I've built" active={active} delay={150} />
        </h2>
      </div>
      <div className="flex gap-4 font-mono text-[11px] uppercase tracking-[0.25em]" role="group" aria-label="Filter">
        {(["All", "Professional", "Personal"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={filter === f ? "text-accent" : "text-text-faint hover:text-foreground"}
          >
            {filter === f ? "▸ " : ""}
            {f}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-border-theme/40 border-y border-border-theme/40">
        {list.map((r) => (
          <li key={r.name}>
            <button onClick={() => onOpen(r)} className="group flex w-full items-start justify-between gap-4 py-3 text-left">
              <span className="min-w-0 space-y-1">
                <span className="block text-base font-medium transition-colors group-hover:text-accent">{formatRepoName(r.name)}</span>
                {r.description && <span className="line-clamp-2 block text-sm text-text-muted">{r.description}</span>}
              </span>
              <span className="shrink-0 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-text-faint">
                <span className="block">{r.category ?? "Personal"}</span>
                <span className="block">{r.language ?? ""}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
