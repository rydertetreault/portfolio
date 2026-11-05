/**
 * The "classic" site: the live (pre-ocean) homepage, projects and resume as plain
 * pages under /classic, for visitors who skip the ocean animation.
 *
 * Shared components (NavBar, HomeContent, …) keep their live hrefs ("/projects",
 * "/#about") and map them through `classicHref()` only when rendered inside
 * /classic (see `useSiteHref`), so the ocean's use of them is unaffected.
 *
 * Pure functions only: safe to import from server components.
 */

export const CLASSIC_BASE = "/classic";

/** True for "/classic" and anything under it (expects a normalised pathname). */
export function isClassicPath(pathname: string): boolean {
  return pathname === CLASSIC_BASE || pathname.startsWith(`${CLASSIC_BASE}/`);
}

/** The live equivalent of a classic path: "/classic" → "/", "/classic/resume" → "/resume". */
export function stripClassic(pathname: string): string {
  if (!isClassicPath(pathname)) return pathname;
  return pathname.slice(CLASSIC_BASE.length) || "/";
}

/** Live routes that have a classic twin: home, projects, a project page, resume. */
function hasClassicTwin(path: string): boolean {
  return (
    path === "/" ||
    path === "/projects" ||
    path === "/resume" ||
    // /projects/[slug]; deeper paths (the SnapShift legal pages) are shared, not ported.
    /^\/projects\/[^/]+$/.test(path)
  );
}

/**
 * Map a live internal href onto the classic site:
 *   "/" → "/classic", "/#about" → "/classic#about", "/projects" → "/classic/projects",
 *   "/projects/x" → "/classic/projects/x", "/resume" → "/classic/resume".
 * External, mailto:, hash-only and routes without a classic twin pass through unchanged.
 */
export function classicHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const split = href.search(/[?#]/);
  const path = (split === -1 ? href : href.slice(0, split)).replace(/(.)\/+$/, "$1") || "/";
  const suffix = split === -1 ? "" : href.slice(split);
  if (isClassicPath(path) || !hasClassicTwin(path)) return href;
  return (path === "/" ? CLASSIC_BASE : CLASSIC_BASE + path) + suffix;
}
