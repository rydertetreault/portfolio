"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import AsciiFace from "./AsciiFace";
import HomeContent from "./HomeContent";
import type { GitHubRepo } from "@/lib/github";

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
  const showContent = introDone || skipIntro;

  // Hide the site-wide ASCII background field while the intro (hands screen)
  // is up; it fades back in behind the overview once the intro finishes.
  // Layout effect so it applies before first paint (no flash of the field).
  const introActive = !skipIntro && !introDone;
  useLayoutEffect(() => {
    if (!introActive) return;
    document.body.setAttribute("data-intro-active", "");
    return () => document.body.removeAttribute("data-intro-active");
  }, [introActive]);

  return (
    <>
      {!skipIntro && <AsciiFace onIntroDone={() => setIntroDone(true)} />}
      <div
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
