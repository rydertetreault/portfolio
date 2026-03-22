"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";

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
    const onScroll = () => {
      setScrolled(window.scrollY > 60);

      if (isHome) {
        let current = "";
        for (const { id } of sectionItems) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.3) {
            current = id;
          }
        }
        setActiveSection(current);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    if (!isHome) setScrolled(true);
  }, [isHome]);

  const handleSectionClick = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl transition-all duration-500 ${
        scrolled
          ? "bg-[#0a0a0a]/80 border-b border-neutral-800/40 shadow-lg shadow-black/20"
          : "bg-[#0a0a0a]/60"
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
                  ? "text-emerald-400"
                  : "text-neutral-500 hover:text-neutral-200"
              }`}
            >
              Overview
            </button>
          ) : (
            <Link
              href="/"
              className="text-sm text-neutral-500 hover:text-neutral-200 transition-colors duration-300"
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
                    ? "text-emerald-400"
                    : "text-neutral-500 hover:text-neutral-200"
                }`}
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.id}
                href={`/#${item.id}`}
                className="text-sm text-neutral-500 hover:text-neutral-200 transition-colors duration-300"
              >
                {item.label}
              </Link>
            )
          )}
          <Link
            href="/projects"
            className={`text-sm transition-colors duration-300 ${
              isProjects
                ? "text-emerald-400"
                : "text-neutral-500 hover:text-neutral-200"
            }`}
          >
            Projects
          </Link>
          <Link
            href="/resume"
            className={`text-sm transition-colors duration-300 ${
              isResume
                ? "text-emerald-400"
                : "text-neutral-500 hover:text-neutral-200"
            }`}
          >
            Resume
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div
        className={`md:hidden border-t border-neutral-800/40 bg-[#0a0a0a]/95 backdrop-blur-2xl grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
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
                    ? "text-emerald-400"
                    : "text-neutral-400 hover:text-emerald-400"
                }`}
              >
                Overview
              </button>
            ) : (
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left py-3 text-sm text-neutral-400 hover:text-emerald-400 transition-colors"
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
                      ? "text-emerald-400"
                      : "text-neutral-400 hover:text-emerald-400"
                  }`}
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.id}
                  href={`/#${item.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-left py-3 text-sm text-neutral-400 hover:text-emerald-400 transition-colors"
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
                  ? "text-emerald-400"
                  : "text-neutral-400 hover:text-emerald-400"
              }`}
            >
              Projects
            </Link>
            <Link
              href="/resume"
              onClick={() => setMobileMenuOpen(false)}
              className={`block w-full text-left py-3 text-sm transition-colors ${
                isResume
                  ? "text-emerald-400"
                  : "text-neutral-400 hover:text-emerald-400"
              }`}
            >
              Resume
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
