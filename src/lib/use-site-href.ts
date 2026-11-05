import { usePathname } from "next/navigation";
import { normalizePathname } from "./utils";
import { classicHref, isClassicPath } from "./classic";

const identity = (href: string) => href;

/**
 * Returns a mapper for internal hrefs written as live routes ("/projects", "/#about"):
 * inside the classic site (/classic/…) they point at the classic twins, everywhere
 * else they are returned unchanged. Client-only (reads the pathname).
 */
export function useSiteHref(): (href: string) => string {
  const classic = isClassicPath(normalizePathname(usePathname()));
  return classic ? classicHref : identity;
}
