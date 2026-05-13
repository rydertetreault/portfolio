"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const sectionItems = [
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "contact", label: "Contact" },
];

export default function NavBar() {
  const pathname = usePathname();
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
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl transition-all duration-500 ${
        scrolled
          ? "bg-surface border-b border-border-theme shadow-lg shadow-[var(--shadow-color)]"
          : "bg-surface"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-8 flex items-center justify-end h-16 pt-[env(safe-area-inset-top)]">
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {isHome ? (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className={`text-sm transition-colors duration-300 cursor-pointer ${
                !activeSection
                  ? "text-accent"
                  : "text-text-faint hover:text-foreground"
              }`}
            >
              Overview
            </button>
          ) : (
            <Link
              href="/"
              className="text-sm text-text-faint hover:text-foreground transition-colors duration-300"
            >
              Overview
            </Link>
          )}
          {sectionItems.map((item) =>
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
                href={`/#${item.id}`}
                className="text-sm text-text-faint hover:text-foreground transition-colors duration-300"
              >
                {item.label}
              </Link>
            )
          )}
          <Link
            href="/projects"
            className={`text-sm transition-colors duration-300 ${
              isProjects
                ? "text-accent"
                : "text-text-faint hover:text-foreground"
            }`}
          >
            Projects
          </Link>
          <Link
            href="/resume"
            className={`text-sm transition-colors duration-300 ${
              isResume
                ? "text-accent"
                : "text-text-faint hover:text-foreground"
            }`}
          >
            Resume
          </Link>
          <ThemeToggle className="text-text-faint hover:text-accent" />
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
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`block w-full text-left py-3 text-sm transition-colors cursor-pointer ${
                  !activeSection
                    ? "text-accent"
                    : "text-text-muted hover:text-accent"
                }`}
              >
                Overview
              </button>
            ) : (
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left py-3 text-sm text-text-muted hover:text-accent transition-colors"
              >
                Overview
              </Link>
            )}
            {sectionItems.map((item) =>
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
                  href={`/#${item.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-left py-3 text-sm text-text-muted hover:text-accent transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
            <Link
              href="/projects"
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
              href="/resume"
              onClick={() => setMobileMenuOpen(false)}
              className={`block w-full text-left py-3 text-sm transition-colors ${
                isResume
                  ? "text-accent"
                  : "text-text-muted hover:text-accent"
              }`}
            >
              Resume
            </Link>
            <div className="py-3">
              <ThemeToggle className="text-text-muted hover:text-accent" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
