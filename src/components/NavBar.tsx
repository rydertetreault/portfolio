"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Waves, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import MotionToggle from "@/components/MotionToggle";
import { normalizePathname } from "@/lib/utils";
import { classicHref, isClassicPath, stripClassic } from "@/lib/classic";
import "@/components/ascii-ui/deeplink.css";

const sectionItems = [
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
  { id: "contact", label: "Contact" },
];

// The classic site keeps the live site's tabs (Projects is already a page link there).
const classicSectionItems = [
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "contact", label: "Contact" },
];

const sameHref = (href: string) => href;

export default function NavBar() {
  // Normalised: Vercel prerenders "/" as "/index" on the server, "/" in the browser.
  const fullPath = normalizePathname(usePathname());
  // The classic site (/classic/...) is the live site without the ocean: same nav, every
  // link kept inside /classic. Below, `pathname` is the live equivalent ("/classic" → "/").
  const classic = isClassicPath(fullPath);
  const pathname = stripClassic(fullPath);
  const siteHref = classic ? classicHref : sameHref;
  const tabs = classic ? classicSectionItems : sectionItems;
  const isHome = pathname === "/";
  const isProjects = pathname.startsWith("/projects");
  const isResume = pathname.startsWith("/resume");

  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isHome) {
      // Home page scrolls inside an inner div, not window.
      // HomeContent dispatches 'portfolio-scroll' so we can track it here.
      const onInnerScroll = (e: Event) => {
        const { scrollTop, activeId } = (e as CustomEvent<{ scrollTop: number; activeId: string }>).detail;
        setScrolled(scrollTop > 60);
        setActiveSection(activeId ?? "");
      };
      window.addEventListener("portfolio-scroll", onInnerScroll);
      return () => window.removeEventListener("portfolio-scroll", onInnerScroll);
    } else {
      // Non-home pages scroll normally on window.
      const onScroll = () => setScrolled(window.scrollY > 60);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }
  }, [isHome]);


  const handleSectionClick = (id: string) => {
    setMobileMenuOpen(false);
    // HomeContent scrolls the inner panel and runs the section load-in effect.
    window.dispatchEvent(new CustomEvent("portfolio-goto", { detail: { id } }));
  };

  // Cross-page section links: flag the arrival so the homepage intro can't flash
  // before it is skipped (see ascii-ui/deeplink.css). HomeContent clears the flag.
  const markDeepLink = () => {
    setMobileMenuOpen(false);
    document.documentElement.classList.add("ascii-deeplink");
    window.setTimeout(() => document.documentElement.classList.remove("ascii-deeplink"), 4000);
  };

  // Ocean pages (the homepage and its lightboxes) bring their own header; the classic
  // equivalents (/classic, /classic/projects, …) show this nav.
  const isOcean =
    !classic &&
    (isHome || isResume || pathname === "/contact" || (isProjects && !pathname.startsWith("/projects/snapshift")));
  if (isOcean) return null;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-surface backdrop-blur-2xl border-b transition-[border-color,box-shadow] duration-500 ${
        scrolled
          ? "border-border-theme shadow-lg shadow-[var(--shadow-color)]"
          : "border-transparent shadow-none"
      }`}
    >
      <div
        className={`mx-auto max-w-6xl px-6 sm:px-8 flex items-center h-16 pt-[env(safe-area-inset-top)] ${
          classic ? "justify-between" : "justify-end"
        }`}
      >
        {/* Classic site: the way back to the animated (ocean) homepage */}
        {classic && (
          <Link
            href="/"
            title="Back to the animated version"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-text-faint hover:text-accent transition-colors duration-300"
          >
            <Waves size={14} aria-hidden />
            Ocean view
          </Link>
        )}
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {isHome ? (
            <button
              onClick={() => handleSectionClick("about")}
              className={`text-sm transition-colors duration-300 cursor-pointer ${
                !activeSection || activeSection === "about"
                  ? "text-accent"
                  : "text-text-faint hover:text-foreground"
              }`}
            >
              Overview
            </button>
          ) : (
            <Link
              onClick={markDeepLink}
                href={siteHref("/#about")}
              className="text-sm text-text-faint hover:text-foreground transition-colors duration-300"
            >
              Overview
            </Link>
          )}
          {tabs.map((item) =>
            isHome ? (
              <button
                key={item.id}
                onClick={() => handleSectionClick(item.id)}
                className={`text-sm transition-colors duration-300 cursor-pointer ${
                  activeSection === item.id
                    ? "text-accent"
                    : "text-text-faint hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.id}
                href={siteHref(`/#${item.id}`)}
                className="text-sm text-text-faint hover:text-foreground transition-colors duration-300"
              >
                {item.label}
              </Link>
            )
          )}
          <Link
            href={siteHref("/projects")}
            className={`text-sm transition-colors duration-300 ${
              isProjects
                ? "text-accent"
                : "text-text-faint hover:text-foreground"
            }`}
          >
            Projects
          </Link>
          <Link
            href={siteHref("/resume")}
            className={`text-sm transition-colors duration-300 ${
              isResume
                ? "text-accent"
                : "text-text-faint hover:text-foreground"
            }`}
          >
            Resume
          </Link>
          <div className="flex items-center gap-4">
            <MotionToggle className="text-text-faint hover:text-accent" />
            <ThemeToggle className="text-text-faint hover:text-accent" />
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-text-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div
        className={`md:hidden border-t border-border-theme bg-surface backdrop-blur-2xl grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          mobileMenuOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 py-4 space-y-1">
            {isHome ? (
              <button
                onClick={() => handleSectionClick("about")}
                className={`block w-full text-left py-3 text-sm transition-colors cursor-pointer ${
                  !activeSection || activeSection === "about"
                    ? "text-accent"
                    : "text-text-muted hover:text-accent"
                }`}
              >
                Overview
              </button>
            ) : (
              <Link
                href={siteHref("/#about")}
                onClick={markDeepLink}
                className="block w-full text-left py-3 text-sm text-text-muted hover:text-accent transition-colors"
              >
                Overview
              </Link>
            )}
            {tabs.map((item) =>
              isHome ? (
                <button
                  key={item.id}
                  onClick={() => handleSectionClick(item.id)}
                  className={`block w-full text-left py-3 text-sm transition-colors cursor-pointer ${
                    activeSection === item.id
                      ? "text-accent"
                      : "text-text-muted hover:text-accent"
                  }`}
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.id}
                  href={siteHref(`/#${item.id}`)}
                  onClick={markDeepLink}
                  className="block w-full text-left py-3 text-sm text-text-muted hover:text-accent transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
            <Link
              href={siteHref("/projects")}
              onClick={() => setMobileMenuOpen(false)}
              className={`block w-full text-left py-3 text-sm transition-colors ${
                isProjects
                  ? "text-accent"
                  : "text-text-muted hover:text-accent"
              }`}
            >
              Projects
            </Link>
            <Link
              href={siteHref("/resume")}
              onClick={() => setMobileMenuOpen(false)}
              className={`block w-full text-left py-3 text-sm transition-colors ${
                isResume
                  ? "text-accent"
                  : "text-text-muted hover:text-accent"
              }`}
            >
              Resume
            </Link>
            <div className="py-3 flex items-center gap-6">
              <MotionToggle className="text-text-muted hover:text-accent" />
              <ThemeToggle className="text-text-muted hover:text-accent" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
