"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import AsciiFace from "./AsciiFace";
import FieldBuild from "./intro/FieldBuild";
import HomeContent from "./HomeContent";
import type { GitHubRepo } from "@/lib/github";
import { useReducedMotionPref } from "@/lib/motion";

/**
 * Client-side shell that coordinates the auto-playing ASCII intro overlay with
 * the real homepage content underneath.
 *
 * - HomeContent is kept mounted from the start (so its data is hydrated) but
 *   rendered at opacity 0 while the intro is on-screen — this stops the site
 *   from bleeding through the (transparent) overlay while still letting the
 *   ASCII background field render behind everything.
 * - The moment AsciiFace enters its "done" phase it fires onIntroDone; we flip
 *   the flag and HomeContent fades in over 500ms while the overlay fades out
 *   over 600ms, so the crossover feels seamless.
 */
export default function HomeShell({ repos }: { repos: GitHubRepo[] }) {
  const [introDone, setIntroDone] = useState(false);
  // Deep links to a section (/#experience from another page) skip the intro entirely
  // and land on the section; HomeContent handles the actual scrolling.
  const [skipIntro, setSkipIntro] = useState(false);
  useEffect(() => {
    if (!/^#(about|experience|projects|skills|education|resume|contact)$/.test(window.location.hash)) return;
    const id = requestAnimationFrame(() => setSkipIntro(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // No-motion mode skips the intro too (AsciiFace renders nothing under it).
  const reduceMotion = useReducedMotionPref();
  const noIntro = skipIntro || reduceMotion;
  // Once skipped for no-motion, turning motion back on must not replay the intro
  // over the page the visitor is already reading.
  useEffect(() => {
    if (!reduceMotion) return;
    const id = requestAnimationFrame(() => setSkipIntro(true));
    return () => cancelAnimationFrame(id);
  }, [reduceMotion]);
  const showContent = introDone || noIntro;

  // Hide the site-wide ASCII background field while the intro (hands screen)
  // is up; it fades back in behind the overview once the intro finishes.
  // Layout effect so it applies before first paint (no flash of the field).
  const introActive = !noIntro && !introDone;
  useLayoutEffect(() => {
    if (!introActive) return;
    document.body.setAttribute("data-intro-active", "");
    return () => document.body.removeAttribute("data-intro-active");
  }, [introActive]);

  // After the hands dissolve, the waveform background is built in cell by cell.
  // Runs once: "idle" → "running" → "done" (AsciiFace may re-fire onIntroDone).
  const [build, setBuild] = useState<"idle" | "running" | "done">("idle");
  const onIntroDone = useCallback(() => {
    setIntroDone(true);
    setBuild((b) => (b === "idle" ? "running" : b));
  }, []);
  const onBuilt = useCallback(() => setBuild("done"), []);

  return (
    <>
      {!noIntro && <AsciiFace onIntroDone={onIntroDone} />}
      {build === "running" && !noIntro && <FieldBuild onDone={onBuilt} />}
      <div
        data-home-content
        aria-hidden={!showContent}
        style={{
          opacity: showContent ? 1 : 0,
          transition: introDone ? "opacity 500ms ease" : "none",
          pointerEvents: showContent ? "auto" : "none",
        }}
      >
        <HomeContent repos={repos} />
      </div>
    </>
  );
}
