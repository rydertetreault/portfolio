/**
 * Shared formatting utilities used across components.
 */

export function formatRepoName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Month + year for a repo timestamp. Pinned to UTC so the server (Vercel runs in
 * UTC) and the visitor's browser (any timezone) always produce the same string;
 * a mismatch here is a hydration error, and React 19 recovers from a root-level
 * hydration error by regenerating <html>, which drops the theme class.
 */
export function formatDateRange(created: string, _pushed: string): string {
  return new Date(created).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTopic(topic: string): string {
  return topic.replace(/[-_]/g, " ");
}

/**
 * Normalise a `usePathname()` value so server and client agree on the route.
 *
 * When Vercel prerenders / revalidates the root route, Next reports the pathname
 * as "/index" during SSR while the browser sees "/". Anything that branches on
 * `pathname === "/"` then renders a different tree on each side, which fails
 * hydration at the root. Trailing slashes are stripped for the same reason.
 */
export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  let p = pathname;
  if (p === "/index" || p === "/index/") return "/";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}
