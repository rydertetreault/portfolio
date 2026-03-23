# Light/Dark Theme Toggle — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add light/dark mode with OS detection, localStorage persistence, and a toggle button in the nav and sidebar.

**Architecture:** CSS custom properties on `:root.dark` / `:root.light` control all theme colors. An inline `<script>` prevents FOUC. A React context (`ThemeProvider`) manages state and exposes `toggleTheme`. Hardcoded neutral Tailwind classes are replaced with variable-based equivalents.

**Tech Stack:** Next.js 16, Tailwind CSS v4, React 19, lucide-react (Sun/Moon icons)

**Design doc:** `docs/plans/2026-03-23-theme-toggle-design.md`

---

### Task 1: Define CSS custom properties for both themes

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Replace the `:root` block and `@theme inline` with dual-theme variables**

Replace the existing `:root` and `@theme inline` blocks (lines 3-12) with:

```css
:root,
:root.light {
  --background: #f5f5f5;
  --foreground: #171717;
  --surface: rgba(245, 245, 245, 0.95);
  --surface-alt: rgba(255, 255, 255, 0.60);
  --border: rgba(212, 212, 212, 0.60);
  --text-primary: #ededed;
  --text-muted: #525252;
  --text-faint: #737373;
  --accent: #059669;
  --accent-hover: #047857;
  --accent-subtle: rgba(5, 150, 105, 0.10);
  --scrollbar-track: #f5f5f5;
  --scrollbar-thumb: #d4d4d4;
  --scrollbar-thumb-hover: #a3a3a3;
  --shadow-color: rgba(0, 0, 0, 0.08);
  --gradient-accent-opacity: 0.08;
  --dot-grid-opacity: 0.06;
}

:root.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
  --surface: rgba(10, 10, 10, 0.95);
  --surface-alt: rgba(5, 5, 5, 0.40);
  --border: rgba(38, 38, 38, 0.60);
  --text-primary: #ededed;
  --text-muted: #a3a3a3;
  --text-faint: #737373;
  --accent: #34d399;
  --accent-hover: #6ee7b7;
  --accent-subtle: rgba(52, 211, 153, 0.10);
  --scrollbar-track: #0a0a0a;
  --scrollbar-thumb: #262626;
  --scrollbar-thumb-hover: #404040;
  --shadow-color: rgba(0, 0, 0, 0.20);
  --gradient-accent-opacity: 0.05;
  --dot-grid-opacity: 0.04;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-alt: var(--surface-alt);
  --color-border-theme: var(--border);
  --color-text-muted: var(--text-muted);
  --color-text-faint: var(--text-faint);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-subtle: var(--accent-subtle);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

**Step 2: Update scrollbar styles to use variables**

Replace the hardcoded scrollbar colors:

```css
::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
```

**Step 3: Update selection styles to use variables**

```css
::selection {
  background: var(--accent-subtle);
  color: var(--foreground);
}
```

**Step 4: Add theme transition class**

Add at the end of the file:

```css
.theme-transitioning,
.theme-transitioning * {
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease !important;
}
```

**Step 5: Verify** — Run `npm run dev` and confirm the site loads without CSS errors. It should look the same as before (dark mode is default via the FOUC script added in Task 2).

---

### Task 2: Create ThemeProvider component

**Files:**
- Create: `src/components/ThemeProvider.tsx`

**Step 1: Write the ThemeProvider**

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

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

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Read the class that the inline script already set
    const current = document.documentElement.classList.contains("light")
      ? "light"
      : "dark";
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    localStorage.setItem("theme", next);

    // Smooth transition
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
```

---

### Task 3: Create ThemeToggle component

**Files:**
- Create: `src/components/ThemeToggle.tsx`

**Step 1: Write the ThemeToggle**

```tsx
"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) {
    return <div className={`w-[18px] h-[18px] ${className}`} />;
  }

  return (
    <button
      onClick={toggleTheme}
      className={`transition-colors cursor-pointer ${className}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
```

---

### Task 4: Update layout.tsx — FOUC script + ThemeProvider

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Add the inline FOUC-prevention script and ThemeProvider wrapper**

Add import at top:
```tsx
import ThemeProvider from "@/components/ThemeProvider";
```

Add `suppressHydrationWarning` to `<html>` (needed because the inline script modifies the class before React hydrates).

Add a `<script>` inside `<head>` (before `<body>`) that detects theme.

Wrap body children in `<ThemeProvider>`.

Final layout should look like:

```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.classList.add(t)}else{document.documentElement.classList.add(window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light")}}catch(e){document.documentElement.classList.add("dark")}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Analytics />
          <NavBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Step 2: Verify** — Run `npm run dev`. The site should load in dark mode (matching OS or localStorage). No flash. No console errors.

---

### Task 5: Update NavBar with theme toggle and variable-based colors

**Files:**
- Modify: `src/components/NavBar.tsx`

**Step 1: Add ThemeToggle import**

```tsx
import ThemeToggle from "@/components/ThemeToggle";
```

**Step 2: Replace hardcoded colors**

Apply these replacements throughout the file:

| Find | Replace with |
|------|-------------|
| `bg-[#0a0a0a]/80` | `bg-surface` |
| `bg-[#0a0a0a]/60` | `bg-surface` |
| `bg-[#0a0a0a]/95` | `bg-surface` |
| `border-neutral-800/40` | `border-border-theme` |
| `text-neutral-500` (nav links) | `text-text-faint` |
| `text-neutral-200` (hover) | `text-foreground` |
| `text-neutral-400` (mobile links) | `text-text-muted` |
| `text-emerald-400` (active) | `text-accent` |
| `hover:text-emerald-400` | `hover:text-accent` |

**Step 3: Add ThemeToggle to desktop nav**

After the Resume link in the desktop nav, add:

```tsx
<ThemeToggle className="text-text-faint hover:text-accent" />
```

**Step 4: Add ThemeToggle to mobile area**

Before the hamburger button, add:

```tsx
<ThemeToggle className="text-text-muted hover:text-accent" />
```

**Step 5: Verify** — Toggle should appear in nav. Clicking it switches themes with a 300ms fade.

---

### Task 6: Update HomeContent with variable-based colors and sidebar toggle

**Files:**
- Modify: `src/components/HomeContent.tsx`

**Step 1: Add ThemeToggle import**

```tsx
import ThemeToggle from "@/components/ThemeToggle";
```

**Step 2: Replace hardcoded colors throughout the file**

Key replacements:

| Find | Replace with |
|------|-------------|
| `bg-[#0a0a0a]` | `bg-background` |
| `text-neutral-200` (on `<main>`) | `text-foreground` |
| `bg-neutral-950/40` | `bg-surface-alt` |
| `border-neutral-800/60` | `border-border-theme` |
| `bg-neutral-800` (profile border bg) | `bg-surface-alt` |
| `border-neutral-700` (profile border) | `border-border-theme` |
| `text-emerald-400/80` | `text-accent` |
| `text-neutral-500` (description, labels) | `text-text-faint` |
| `text-neutral-400` (body text) | `text-text-muted` |
| `text-neutral-300` (about text) | `text-foreground` |
| `text-neutral-600` (footer) | `text-text-faint` |
| `bg-neutral-800/60` → section divider | `bg-border-theme` |
| `ring-[#0a0a0a]` (timeline dot) | `ring-background` |
| `bg-neutral-700` (timeline dot) | `bg-text-faint` |
| `border-neutral-800` (timeline, skill tags, contact buttons) | `border-border-theme` |
| `bg-neutral-900/50` (skill tags) | `bg-surface-alt` |
| `bg-emerald-500/10` | `bg-accent-subtle` |
| `text-emerald-400` (icons, accents) | `text-accent` |
| `hover:text-emerald-400` | `hover:text-accent` |
| `hover:border-emerald-500/40` | `hover:border-accent` |
| `hover:bg-emerald-500/5` | `hover:bg-accent-subtle` |
| `hover:text-emerald-300` | `hover:text-accent-hover` |
| `hover:border-emerald-500/30` | `hover:border-accent` |
| `border-neutral-800/40` (footer) | `border-border-theme` |
| `shadow-black/20` | `shadow-[var(--shadow-color)]` |
| `bg-amber-500/10` | keep as-is (amber badge is theme-independent) |
| `text-amber-400` / `border-amber-500/20` | keep as-is |

**Step 3: Add ThemeToggle to sidebar social links**

In the social links `<div>` in the left panel (after the Mail icon link), add:

```tsx
<ThemeToggle className="text-text-faint hover:text-accent" />
```

Also add the same toggle in the mobile header social links section.

**Step 4: Update inline styles**

The sidebar nav uses inline `style` for colors:
- `color: isActive ? "rgb(229 229 229)" : "rgb(115 115 115)"` → `color: isActive ? "var(--foreground)" : "var(--text-faint)"`
- `bg-neutral-500` on the nav line → `bg-text-faint`

**Step 5: Verify** — Toggle appears in sidebar. All sections render correctly in both themes.

---

### Task 7: Update HeroSection with variable-based colors

**Files:**
- Modify: `src/components/HeroSection.tsx`

**Step 1: Replace hardcoded colors**

| Find | Replace with |
|------|-------------|
| `via-[#0a0a0a]` | `via-background` |
| `from-emerald-950/20` | keep (emerald tint works in both) |
| `to-cyan-950/15` | keep |
| `border-neutral-800` | `border-border-theme` |
| `text-neutral-400` | `text-text-muted` |
| `text-neutral-600` | `text-text-faint` |
| `text-emerald-400/90` | `text-accent` |
| `border-neutral-700` | `border-border-theme` |
| `hover:border-neutral-500` | `hover:border-text-faint` |
| `text-neutral-200` | `text-foreground` |

**Step 2: Adjust gradient orb opacity for light mode**

The orbs use classes like `bg-emerald-500/[0.07]`. These are subtle enough to work in both modes. Keep as-is but consider using `opacity-[var(--gradient-accent-opacity)]` on the parent if they look too faint in light mode during visual testing.

**Step 3: Update dot grid opacity**

The dot grid uses `opacity-[0.04]`. Keep for now — the variable `--dot-grid-opacity` is available if tuning is needed.

**Step 4: Verify** — Hero section renders correctly in both themes.

---

### Task 8: Update ProjectsGrid with variable-based colors

**Files:**
- Modify: `src/components/ProjectsGrid.tsx`

**Step 1: Replace hardcoded colors**

| Find | Replace with |
|------|-------------|
| `border-neutral-800` | `border-border-theme` |
| `bg-neutral-950/50` | `bg-surface-alt` |
| `bg-neutral-900/80` | `bg-surface-alt` |
| `bg-neutral-900/60` | `bg-surface-alt` |
| `border-neutral-800/80` | `border-border-theme` |
| `text-neutral-400` | `text-text-muted` |
| `text-neutral-500` | `text-text-faint` |
| `text-neutral-300` | `text-foreground` |
| `text-neutral-700` / `text-neutral-600` (icons) | `text-text-faint` |
| `text-emerald-300` (hover) | `text-accent-hover` |
| `text-emerald-400/60` | `text-accent` |
| `bg-emerald-400/10` (active filter) | `bg-accent-subtle` |
| `text-emerald-300` (active filter) | `text-accent` |
| `border-emerald-400/60` (active filter) | `border-accent` |
| `hover:border-emerald-400/50` | `hover:border-accent` |
| `hover:text-emerald-300` | `hover:text-accent-hover` |
| `hover:border-neutral-600` | `hover:border-text-faint` |
| `hover:text-neutral-200` | `hover:text-foreground` |
| `via-neutral-700/50` (accent line) | `via-border-theme` |

**Step 2: Verify** — Projects page renders correctly in both themes. Filter buttons, cards, tilt effects all work.

---

### Task 9: Update resume/page.tsx with variable-based colors

**Files:**
- Modify: `src/app/resume/page.tsx`

**Step 1: Replace hardcoded colors**

| Find | Replace with |
|------|-------------|
| `bg-[#0a0a0a]` | `bg-background` |
| `text-neutral-200` (on `<main>`) | `text-foreground` |
| `text-neutral-400` | `text-text-muted` |
| `text-neutral-500` | `text-text-faint` |
| `text-neutral-600` | `text-text-faint` |
| `text-neutral-300` (skill labels) | `text-foreground` |
| `text-emerald-400/70` | `text-accent` |
| `text-emerald-400` | `text-accent` |
| `hover:text-emerald-400` | `hover:text-accent` |
| `bg-neutral-800/60` → section divider | `bg-border-theme` |
| `bg-neutral-700` (bullet dots) | `bg-text-faint` |

**Step 2: Verify** — Resume page renders correctly in both themes.

---

### Task 10: Update projects/page.tsx with variable-based colors

**Files:**
- Modify: `src/app/projects/page.tsx`

**Step 1: Replace hardcoded colors**

| Find | Replace with |
|------|-------------|
| `bg-[#0a0a0a]` | `bg-background` |
| `text-neutral-200` | `text-foreground` |
| `text-neutral-400` | `text-text-muted` |

**Step 2: Verify** — Projects listing page renders correctly in both themes.

---

### Task 11: Update projects/[slug]/page.tsx with variable-based colors

**Files:**
- Modify: `src/app/projects/[slug]/page.tsx`

**Step 1: Replace hardcoded colors**

| Find | Replace with |
|------|-------------|
| `bg-[#0a0a0a]` | `bg-background` |
| `text-neutral-200` | `text-foreground` |
| `text-neutral-500` | `text-text-faint` |
| `text-neutral-400` | `text-text-muted` |
| `text-neutral-300` | `text-foreground` |
| `border-neutral-800` | `border-border-theme` |
| `bg-neutral-800/60` | `bg-border-theme` |
| `bg-neutral-800/40` | `bg-border-theme` |
| `text-emerald-400` | `text-accent` |
| `text-emerald-300` | `text-accent-hover` |
| `hover:text-emerald-400` | `hover:text-accent` |
| `border-neutral-800/60` (footer) | `border-border-theme` |

**Step 2: Verify** — Project detail pages render correctly in both themes.

---

### Task 12: Visual QA and polish

**Step 1:** Run `npm run dev` and test every page in both themes:
- Home page (hero + scrollable content)
- Projects listing
- Individual project detail
- Resume page

**Step 2:** Check for any remaining hardcoded colors that look wrong in light mode. Fix as needed.

**Step 3:** Test toggle persistence:
- Toggle to light mode → refresh → should stay light
- Clear localStorage → refresh → should follow OS preference

**Step 4:** Test mobile:
- Toggle button visible and functional
- Mobile menu colors correct
- No horizontal overflow

**Step 5:** Run `npm run build` to confirm no build errors.
