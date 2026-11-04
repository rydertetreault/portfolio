"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import SeaCanvas, { seaStore } from "./SeaCanvas";
import { ArchivePanel, DossierPanel } from "./dossier";
import { archiveDetour, archiveOverview, waypointDetour, type DetourTarget } from "./detours";
import { Hud, MapOverlay, TransitLabels, Waypoint, jumpTo, jumpToStop, useSeaU } from "./hud";
import {
  AboutCard,
  ContactCard,
  EducationCard,
  ExperienceCard,
  HeroCard,
  InsertionLog,
  MapCard,
  NowCard,
  ProjectCard,
} from "./cards";
import { BEATS, TRACK_VH, WINDOWS, beatIndex, stopForHash } from "./journey";
import { BEACONS } from "./world";
import { EXPERIENCES } from "@/data/profile";
import type { GitHubRepo } from "@/lib/github";
import { formatRepoName } from "@/lib/utils";

/**
 * A content panel bound to a window of the journey: fades in as the camera
 * arrives, out as it leaves. Inactive panels are inert (no focus, hidden from
 * assistive tech), so the reading order follows the journey.
 */
function Panel({
  u,
  from,
  to,
  fade = 0.16,
  className = "",
  quiet,
  label,
  children,
}: {
  u: MotionValue<number>;
  from: number;
  to: number;
  fade?: number;
  className?: string;
  quiet?: number;
  label?: string;
  children: (active: boolean) => ReactNode;
}) {
  const range = [from, from + fade, to - fade, to];
  const opacity = useTransform(u, range, [0, 1, 1, 0]);
  const y = useTransform(u, range, [28, 0, 0, -28]);
  const [active, setActive] = useState(() => from < 0 && to > 0);
  const [shown, setShown] = useState(() => from < 0 && to > 0);
  useMotionValueEvent(u, "change", (v) => {
    setActive(v > from + fade * 0.4 && v < to - fade * 0.4);
    setShown(v > from + fade * 0.25 && v < to - fade * 0.25);
  });
  return (
    <motion.section
      style={{ opacity, y }}
      data-sea-quiet={quiet}
      aria-label={label}
      aria-hidden={!shown}
      inert={!shown}
      className={`fixed z-10 ${shown ? "pointer-events-auto" : "pointer-events-none"} ${className}`}
    >
      {children(active)}
    </motion.section>
  );
}

/** Beat window → panel range (appears as the camera settles, leaves as it departs). */
function win(id: string) {
  const w = WINDOWS[beatIndex(id)];
  return { from: w.arrive - 0.12, to: w.leave + 0.12 };
}

const LEFT = "left-6 right-6 sm:left-[7vw] sm:right-auto sm:max-w-xl";
const RIGHT = "left-6 right-6 sm:left-auto sm:right-[7vw] sm:max-w-xl";
/** Long cards scroll inside on short screens instead of being cut off. */
const SCROLL = "max-h-[64vh] overflow-y-auto sm:max-h-[72vh] [scrollbar-width:thin]";

/** A side trip off the journey: a project's dossier, or the archive of everything. */
type View = { kind: "repo"; repo: GitHubRepo } | { kind: "archive" } | null;

export default function SeaExperience({ projects, archive }: { projects: GitHubRepo[]; archive: GitHubRepo[] }) {
  const u = useSeaU();
  const [view, setView] = useState<View>(null);
  const opener = useRef<HTMLElement | null>(null);

  // Where a view lives in the sea: waypoint projects get a cove beside their beacon,
  // everything else is in the archive waters.
  const detourFor = useCallback(
    (v: View): DetourTarget | null => {
      if (!v) return null;
      if (v.kind === "archive") return archiveOverview();
      const k = projects.findIndex((p) => p.name === v.repo.name);
      if (k >= 0) return waypointDetour(k);
      return archiveDetour(Math.max(0, archive.findIndex((p) => p.name === v.repo.name)));
    },
    [projects, archive],
  );

  /** Open / change / close the side trip. `push` records it in history so Back returns to course. */
  const go = useCallback(
    (v: View, push = true) => {
      if (v && !view) opener.current = document.activeElement as HTMLElement | null;
      setView(v);
      const d = detourFor(v);
      seaStore.get()?.setDetour(d?.shot ?? null, d?.focus);
      const hash = !v ? "" : v.kind === "archive" ? "#archive" : `#dossier/${v.repo.name}`;
      if (push && typeof window !== "undefined" && window.location.hash !== hash) {
        const url = window.location.pathname + window.location.search + hash;
        if (v && !view) history.pushState({ seaView: true }, "", url);
        else history.replaceState(history.state, "", url);
      }
      if (!v) window.setTimeout(() => opener.current?.focus({ preventScroll: true }), 0);
    },
    [view, detourFor],
  );
  const close = useCallback(() => {
    if (history.state?.seaView) history.back(); // popstate closes it
    else go(null);
  }, [go]);
  const open = useCallback((repo: GitHubRepo) => go({ kind: "repo", repo }), [go]);

  // While detoured: the page can't scroll (the journey is paused where you left it).
  useEffect(() => {
    if (!view) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[aria-label="Screenshot viewer"]')) close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      el.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [view, close]);

  // Deep links: /#experience, /#projects, … land on that stop; /#dossier/<repo>, /#archive open a detour.
  useEffect(() => {
    const viewForHash = (): View | undefined => {
      const h = window.location.hash.replace(/^#/, "");
      if (h === "archive") return { kind: "archive" };
      if (h.startsWith("dossier/")) {
        const name = decodeURIComponent(h.slice(8));
        const repo = archive.find((r) => r.name === name) ?? projects.find((r) => r.name === name);
        return repo ? { kind: "repo", repo } : undefined;
      }
      return undefined;
    };
    const route = (smooth: boolean) => {
      const v = viewForHash();
      if (v) return go(v, false);
      if (view) go(null, false);
      const stop = stopForHash(window.location.hash);
      if (stop) jumpToStop(stop, smooth);
    };
    if (window.location.hash) {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      requestAnimationFrame(() => {
        // Wait for the engine so the detour has a camera to move.
        const tryRoute = (n: number) => (seaStore.get() || n > 30 ? route(false) : requestAnimationFrame(() => tryRoute(n + 1)));
        tryRoute(0);
      });
    }
    const onHash = () => route(true);
    const onPop = () => route(true);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onPop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const recent = useMemo(() => archive.filter((r) => !r.private).slice(0, 4), [archive]);
  const detoured = view !== null;

  const projBeats = BEATS.map((b, i) => ({ b, i })).filter(({ b }) => b.stop === "waypoints");
  const names = useMemo(() => {
    const n: Record<string, string> = { education: "The Harbor", deep: "The Deep" };
    projBeats.forEach(({ b }, k) => {
      if (projects[k]) n[b.id] = formatRepoName(projects[k].name);
    });
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const about = WINDOWS[beatIndex("about")];

  return (
    <main className="relative">
      <SeaCanvas />
      {/* The scroll track: its height *is* the journey. */}
      <div style={{ height: `${TRACK_VH * 100}vh` }} aria-hidden />

      <Hud u={u} onArchive={() => go({ kind: "archive" })} />

      {/* Side trips: the dossier / archive opens over the sea once the camera has flown out. */}
      <AnimatePresence>
        {view && (
          <motion.aside
            key={view.kind === "repo" ? view.repo.name : "archive"}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 0.55, duration: 0.5 } }}
            exit={{ opacity: 0, x: 30, transition: { duration: 0.25 } }}
            data-sea-quiet={0.92}
            className="fixed left-6 right-6 top-[12vh] z-30 sm:left-auto sm:right-[6vw] sm:w-[min(46rem,52vw)]"
          >
            {view.kind === "archive" ? (
              <ArchivePanel repos={archive} onOpen={(r) => go({ kind: "repo", repo: r })} onClose={close} />
            ) : (
              (() => {
                const k = projects.findIndex((p) => p.name === view.repo.name);
                const list = k >= 0 ? projects : archive;
                const i = list.findIndex((p) => p.name === view.repo.name);
                const warm = k >= 0 ? (BEACONS.find((x) => x.id === projBeats[k]?.b.region)?.color ?? 1) >= 4 : i % 2 === 1;
                return (
                  <DossierPanel
                    repo={view.repo}
                    code={k >= 0 ? `03.${k + 1}` : `A.${String(i + 1).padStart(2, "0")}`}
                    warm={warm}
                    onClose={close}
                    canStep={list.length > 1}
                    onStep={(dir) => go({ kind: "repo", repo: list[(i + dir + list.length) % list.length] })}
                  />
                );
              })()
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* The journey itself: paused and hidden while on a side trip. */}
      <div
        inert={detoured}
        aria-hidden={detoured || undefined}
        className="transition-opacity duration-500"
        style={{ opacity: detoured ? 0 : 1 }}
      >
      <Waypoint names={names} />
      <MapOverlay u={u} names={names} />
      <TransitLabels u={u} />

      {/* 00 / Origin */}
      <Panel u={u} from={-0.3} to={0.42} quiet={0.85} label="Introduction" className={`${LEFT} top-1/2 -translate-y-1/2`}>
        {(a) => <HeroCard active={a} />}
      </Panel>

      {/* Insertion log (during the dive) */}
      <Panel u={u} from={0.32} to={about.arrive - 0.1} fade={0.1} className="left-6 right-6 top-[30vh] sm:left-[7vw] sm:right-auto">
        {(a) => <InsertionLog active={a} />}
      </Panel>

      {/* 01 / The Surface */}
      <Panel u={u} {...win("about")} quiet={0.9} label="About" className={`${LEFT} top-[14vh] sm:top-[18vh] ${SCROLL}`}>
        {(a) => <AboutCard active={a} />}
      </Panel>

      {/* 02 / The Swell */}
      {EXPERIENCES.map((exp, i) => (
        <Panel
          key={exp.company}
          u={u}
          {...win(`exp-${i}`)}
          quiet={0.9}
          label={`Experience: ${exp.company}`}
          className={`${i % 2 ? RIGHT : LEFT} top-[14vh] sm:top-[18vh] ${SCROLL}`}
        >
          {(a) => <ExperienceCard exp={exp} index={i} total={EXPERIENCES.length} active={a} />}
        </Panel>
      ))}

      {/* 03 / Waypoints */}
      {projBeats.map(({ b }, k) => {
        const repo = projects[k];
        if (!repo) return null;
        // Card on the side away from the beacon (the shot puts the beacon right of centre on even beats).
        const side = k % 2 ? RIGHT : LEFT;
        const warm = (BEACONS.find((x) => x.id === b.region)?.color ?? 1) >= 4;
        return (
          <Panel
            key={b.id}
            u={u}
            {...win(b.id)}
            quiet={0.9}
            label={`Project: ${formatRepoName(repo.name)}`}
            className={`${side} top-[12vh] sm:top-[14vh] ${SCROLL}`}
          >
            {(a) => (
              <ProjectCard repo={repo} index={k} total={projBeats.length} active={a} warm={warm} onDossier={() => open(repo)} />
            )}
          </Panel>
        );
      })}

      {/* 04 / The Current */}
      <Panel u={u} {...win("skills")} quiet={0.9} label="The Current" className={`left-6 right-6 top-[14vh] sm:left-[7vw] sm:right-[7vw] sm:max-w-4xl ${SCROLL}`}>
        {(a) => <NowCard active={a} recent={recent} onOpen={open} />}
      </Panel>

      {/* 05 / The Harbor */}
      <Panel u={u} {...win("education")} quiet={0.9} label="Education" className={`${RIGHT} top-[20vh] sm:max-w-md`}>
        {(a) => <EducationCard active={a} />}
      </Panel>

      {/* 06 / The Map */}
      <Panel
        u={u}
        {...win("map")}
        quiet={0.7}
        label="Map"
        className="bottom-[10vh] left-6 right-6 sm:bottom-auto sm:left-8 sm:right-auto sm:top-[20vh] sm:w-60"
      >
        {(a) => <MapCard active={a} />}
      </Panel>

      {/* 07 / The Deep */}
      <Panel
        u={u}
        from={WINDOWS[beatIndex("deep")].arrive - 0.12}
        to={TRACK_VH + 1}
        quiet={0.9}
        label="Contact"
        className={`${LEFT} top-[22vh] sm:max-w-2xl`}
      >
        {(a) => <ContactCard active={a} onSurface={() => jumpTo(0)} />}
      </Panel>
      </div>
    </main>
  );
}
