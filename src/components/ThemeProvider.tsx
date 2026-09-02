"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/** Stored choice (explicit toggle) or null when following the OS preference. */
function storedTheme(): Theme | null {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  const other = theme === "dark" ? "light" : "dark";
  if (root.classList.contains(theme) && !root.classList.contains(other)) return;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

// The <html> class is the single source of truth for the theme; React state is
// derived from it (so toggles, the mount-time repair below and any external
// change all flow through the same path).
function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}
function getSnapshot(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}
function getServerSnapshot(): Theme {
  return "dark";
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    // The inline script in layout.tsx sets the class before first paint, but if
    // React ever has to regenerate <html> (root hydration error) every attribute
    // on it is dropped. Re-derive the theme here and put the class back, rather
    // than trusting whatever happens to be on the element.
    applyThemeClass(storedTheme() ?? systemTheme());

    // Follow OS changes live while no explicit choice has been made.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!storedTheme()) applyThemeClass(systemTheme());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleTheme = () => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    applyThemeClass(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}

    document.documentElement.classList.add("theme-transitioning");
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 300);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
