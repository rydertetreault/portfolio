# Contact Section Redesign — Slim Timeline Cards

## Overview

Replace the current plain-text contact section with styled timeline cards that mirror the education section's visual language but with a slimmer, more compact look.

## Component: `ContactItem`

A new component similar to `EduItem` with the following structure:

```
| timeline line |  [Icon]    Platform Name          [Copy] [Open] |
|               |            handle/address                       |
```

### Props

- `icon`: Lucide icon component (`Linkedin`, `Mail`, `Github`)
- `name`: Platform display name (string)
- `handle`: Display text for the handle/address (string)
- `href`: Full URL or mailto link (string)
- `copyText`: Text to copy to clipboard (string)

### Layout

- **Left:** Vertical 1px line (`bg-neutral-800`, `group-hover:bg-emerald-400/60`, `transition-colors duration-300`) — same as `EduItem`
- **Left column (160px on lg):** Lucide icon at 24px, `text-neutral-500` with `group-hover:text-emerald-400` transition
- **Right column:**
  - Platform name: `text-lg font-semibold`
  - Handle/address: `text-sm text-neutral-500`
- **Action buttons (top-right of content area):**
  - Copy icon button: copies `copyText` to clipboard
  - External link / arrow icon button: opens `href` in new tab
  - Both: `text-neutral-500 hover:text-emerald-400 transition`
- **Padding:** `pl-8` (same as `EduItem`)
- **Spacing between cards:** `h-8` (slimmer than education's `h-12`)

### Copy Feedback

On click, the copy icon switches to a `Check` icon for ~1.5 seconds, then reverts. Uses React `useState` with a `setTimeout`.

### Responsive Behavior

- **Desktop (lg+):** 2-column grid `grid-cols-[160px_1fr]` with `gap-10`
- **Mobile:** Single column with `gap-6`, icon above text

## Cards

| Platform | Icon       | Name       | Handle                              | Link                                              |
|----------|------------|------------|-------------------------------------|----------------------------------------------------|
| LinkedIn | `Linkedin` | LinkedIn   | linkedin.com/in/ryder-tetreault     | https://www.linkedin.com/in/ryder-tetreault        |
| Email    | `Mail`     | Email      | rydertetreault@gmail.com            | mailto:rydertetreault@gmail.com                     |
| GitHub   | `Github`   | GitHub     | github.com/rydertetreault           | https://github.com/rydertetreault                   |

## Color Palette (matches existing site)

- Text: `text-neutral-200`, `text-neutral-300`, `text-neutral-500`
- Accent: `text-emerald-400`, `hover:text-emerald-300`
- Borders/lines: `bg-neutral-800`, `bg-emerald-400/60`

## Tech

- Next.js + React 19 (existing stack)
- Tailwind CSS v4 utility classes (no CSS modules)
- Lucide React icons (already installed)
- Framer Motion for section-level animation (already handled by `Section` wrapper)
