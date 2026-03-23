# Light/Dark Theme Toggle — Design

## Summary

Add light mode and dark mode support to the portfolio site. The theme defaults to the visitor's OS preference (`prefers-color-scheme`), can be manually toggled, and persists across visits via `localStorage`.

## Approach

**CSS custom properties + class strategy.** A `.dark` or `.light` class on `<html>` controls which set of CSS variables is active. No external dependencies — uses the existing CSS variable system and Tailwind v4's `@theme inline`.

## Theme Detection & Persistence

1. An inline `<script>` in `<head>` (via `layout.tsx`) runs before first paint:
   - Reads `localStorage.getItem("theme")`
   - Falls back to `window.matchMedia("(prefers-color-scheme: dark)")`
   - Sets `<html class="dark">` or `<html class="light">`
   - Prevents flash of wrong theme (FOUC)
2. `localStorage` stores the user's manual choice. If no choice is stored, the system preference is used on each visit.

## Color Palette

### Dark Mode (current, unchanged)

| Token             | Value                      | Usage                     |
|-------------------|----------------------------|---------------------------|
| `--background`    | `#0a0a0a`                  | Page background           |
| `--foreground`    | `#ededed`                  | Primary text              |
| `--surface`       | `rgba(10,10,10,0.95)`      | Nav backdrop, overlays    |
| `--surface-alt`   | `rgba(5,5,5,0.40)`         | Card fills                |
| `--border`        | `rgba(38,38,38,0.60)`      | Card/section borders      |
| `--text-muted`    | `#a3a3a3`                  | Secondary text            |
| `--text-faint`    | `#737373`                  | Tertiary text             |
| `--scrollbar-track` | `#0a0a0a`                | Scrollbar track           |
| `--scrollbar-thumb` | `#262626`                | Scrollbar thumb           |

### Light Mode (new, cool gray)

| Token             | Value                      | Usage                     |
|-------------------|----------------------------|---------------------------|
| `--background`    | `#f5f5f5`                  | Page background           |
| `--foreground`    | `#171717`                  | Primary text              |
| `--surface`       | `rgba(245,245,245,0.95)`   | Nav backdrop, overlays    |
| `--surface-alt`   | `rgba(255,255,255,0.60)`   | Card fills                |
| `--border`        | `rgba(212,212,212,0.60)`   | Card/section borders      |
| `--text-muted`    | `#525252`                  | Secondary text            |
| `--text-faint`    | `#737373`                  | Tertiary text             |
| `--scrollbar-track` | `#f5f5f5`                | Scrollbar track           |
| `--scrollbar-thumb` | `#d4d4d4`                | Scrollbar thumb           |

### Shared

- Emerald accent stays the same in both modes.
- Light mode may use slightly darker emerald shades (e.g. `emerald-600`) for text contrast, controlled via `--accent` / `--accent-hover` variables.

## Component Changes

### New Files

- **`ThemeProvider.tsx`** — Client component. React context exposing `{ theme, toggleTheme }`. Manages `<html>` class, `localStorage`, and the transition class.
- **`ThemeToggle.tsx`** — Client component. Sun/moon icon button using lucide-react. Consumes `ThemeProvider` context.

### Modified Files

- **`globals.css`** — Define all CSS custom properties under `:root.light` and `:root.dark`. Scrollbar, selection, and base styles reference variables.
- **`layout.tsx`** — Add inline `<script>` for FOUC prevention. Wrap children in `ThemeProvider`.
- **`NavBar.tsx`** — Replace hardcoded neutral colors with variable-based classes. Add `ThemeToggle` to desktop nav links and next to mobile hamburger.
- **`HomeContent.tsx`** — Replace `bg-[#0a0a0a]`, `bg-neutral-950/40`, `border-neutral-800/60`, `text-neutral-{N}`, `ring-[#0a0a0a]` with variable-based equivalents. Add `ThemeToggle` to sidebar social links row.
- **`HeroSection.tsx`** — Replace `via-[#0a0a0a]`, `border-neutral-800`, `text-neutral-{N}` with variables. Gradient orbs stay (emerald tints work in both modes).
- **`ProjectsGrid.tsx`** — Replace `bg-neutral-950/50`, `border-neutral-800/80`, `bg-neutral-900/80`, `bg-neutral-900/60` with variables.
- **`resume/page.tsx`** — Replace `bg-[#0a0a0a]` and neutral colors with variables.
- **`projects/page.tsx`** — Same as above.

## Toggle Placement

- **Desktop sidebar** (`HomeContent.tsx`): In the social links row alongside GitHub/LinkedIn/Mail icons.
- **Desktop nav** (`NavBar.tsx`): At the end of the nav links row.
- **Mobile** (`NavBar.tsx`): To the left of the hamburger menu button, always visible.

## Toggle Icon

- Dark mode active → show `Sun` icon (click to go light)
- Light mode active → show `Moon` icon (click to go dark)
- Icons from `lucide-react` (already installed)

## Transition

- On toggle, a temporary CSS class is added to `<html>` that applies `transition: background-color 300ms, color 300ms, border-color 300ms` to `*`.
- Removed after 300ms via `setTimeout` to avoid interfering with hover/scroll animations.
