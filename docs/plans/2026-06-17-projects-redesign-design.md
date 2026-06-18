# Projects Section Redesign Design

## Goal

Update the `/projects` page to (1) replace the language filter with a Personal/Professional category filter, (2) add two new entries — a Maha Media "Media Library" project for the Ram Dass Love Serve Remember Foundation, and the published SnapShift iOS app — and (3) make every project card expandable to reveal a longer description and screenshot gallery.

The homepage `FeaturedProjectCard` strip is **not** changing in this pass.

## Approach

Treat the existing `GitHubRepo` shape as the wire format for all projects (GitHub-sourced + manual). Extend it with optional fields the override/manual paths can populate (category, long description, screenshots, App Store URL, private flag). Filter pills become category-driven. Cards gain a collapsed/expanded state animated with Framer Motion (already in the dep tree).

No separate detail pages. No cover-image preview header. The card header stays as-is (dot-grid + icon + name + language band).

## Data Model

Extend `GitHubRepo` in `src/lib/github.ts`:

```ts
export type ProjectCategory = "Personal" | "Professional";

export type GitHubRepo = {
  // …existing fields…

  /** Category filter: defaults to "Personal" when not set */
  category?: ProjectCategory;

  /** Optional long-form description shown when card is expanded */
  longDescription?: string;

  /** Optional subtitle shown under the title (e.g. client name) */
  subtitle?: string;

  /** Screenshot paths under /public; rendered as small cards in the expanded section */
  screenshots?: string[];

  /** App Store URL — adds an "App Store" action button */
  appStore?: string;

  /** When true, hide the GitHub button and show a "Private" badge instead */
  private?: boolean;
};
```

**Default category:** `Personal`. A small `categoryOverrides: Record<string, ProjectCategory>` map in `github.ts` flags the professional repos. The manual projects set `category` directly on the object.

**Current category assignments:**

| Project | Source | Category |
|---|---|---|
| `media-library` (new) | `manualProjects` | Professional |
| `analytics-api` (existing) | `manualProjects` | Professional |
| Everything else | GitHub API | Personal (default) |

## New Project Entries

### Media Library — Ram Dass Love Serve Remember Foundation

Added to `manualProjects` in `src/lib/github.ts`.

```ts
{
  name: "media-library",
  subtitle: "Ram Dass Love Serve Remember Foundation",
  description:
    "A custom digital media library giving a non-profit's team a single home for decades of archival audio, video, images, and documents — with AI-powered transcription, tagging, and semantic search.",
  longDescription: `[full client blurb — see below]`,
  category: "Professional",
  language: "TypeScript",
  topics: ["react", "typescript", "ui-ux", "ai", "archival", "media"],
  screenshots: ["/projects/media-library/cover.png"],
  private: true,
  html_url: "",
  homepage: null,
  stargazers_count: 0,
  forks_count: 0,
  fork: false,
  created_at: "2026-01-01T00:00:00Z",
  pushed_at: "2026-06-17T00:00:00Z",
}
```

**Long description (verbatim from client blurb, lightly edited):**

> A custom digital media library built for the Ram Dass Love Serve Remember Foundation to give their team a single home for decades of archival audio, video, images, and documents.
>
> Users can browse and search the entire archive from a clean, gallery-style interface — filtering by type, collection, rights, or any custom tag the team cares about. Opening an asset reveals a rich detail view with a built-in player, auto-generated transcripts, thumbnails, and editable metadata. Behind the scenes, AI quietly handles the slow work: transcribing recordings, suggesting tags, extracting key topics and people, and making everything semantically searchable so staff can find a specific quote or moment in seconds rather than hours.
>
> Admins get tools for managing users and teams, configuring metadata fields, tracking rights, organizing collections, and generating share links for collaborators outside the organization.
>
> **My role:** Frontend developer and UI/UX designer — I designed the interface and built out most of the client-side experience.

### SnapShift (extend existing override)

```ts
SnapShift: {
  description:
    "An iOS app that turns a photo of your work schedule into a calendar using on-device OCR. All data stays on your device.",
  longDescription: `[full blurb — see below]`,
  category: "Personal",
  topics: ["ios", "swift", "ocr", "schedule", "mobile"],
  appStore:
    "https://apps.apple.com/us/app/snapshift-schedule-scanner/id6769178607",
  screenshots: [
    "/projects/snapshift/01.png",
    "/projects/snapshift/02.png",
    "/projects/snapshift/03.png",
    "/projects/snapshift/04.png",
    "/projects/snapshift/05.png",
  ],
}
```

**Long description:**

> SnapShift is an iOS app I designed, built, and shipped to the App Store. Take or upload a photo of your work schedule and it extracts your shifts using on-device OCR, then drops them straight into a clean calendar view.
>
> No accounts, no cloud sync, no analytics — every event is stored locally on your device. The app is built around the idea that something as personal as your weekly schedule shouldn't require signing up for anything or handing your data to a server.

(Existing Privacy Policy and Support sub-pages remain unchanged and continue to be linked from the action row.)

## Card Redesign

Visual structure stays close to the current `RepoCard`. The changes are additive.

### Collapsed state (default)

Identical to today, with one new affordance: an "Expand" chevron button at the bottom-right of the content area, and the whole card cursor: pointer for click-to-expand.

### Expanded state

When `expanded === true`, the card reveals a new section below the existing content using a Framer Motion `AnimatePresence` + height/opacity transition:

1. **Long description** — rendered as paragraphs. Multi-paragraph supported (`\n\n` → separate `<p>`s).
2. **Screenshots gallery** — small thumbnail cards listed below the description.
   - Phone screenshots (portrait aspect 9:19.5) → row of small device-shaped cards, ~120px wide, scrollable horizontally on mobile, wrapping grid on desktop (up to 5 per row).
   - Desktop screenshots (landscape) → wider cards, 1–2 per row.
   - Aspect detection: if `screenshot dimensions > 1.0 wide` → landscape treatment, else portrait. Implemented via a simple `aspect` prop per card.
   - Hover: subtle border-accent + scale(1.02).
   - Clicking opens a lightbox (a fullscreen `<dialog>`-style overlay with the image centered, backdrop-blur, and click-outside / Escape / × to close). Lightbox supports left/right arrow navigation through the gallery.
3. **Privacy note for Media Library:** when `private === true` and screenshots have sensitive content, a small caption `"Interface only — content blurred or redacted for client privacy."` shows above the gallery. (For Media Library, the supplied screenshot is interface-only, but the caption signals intent.)

### Action row

Existing buttons (GitHub, Live Site) stay. New additions:

- **App Store button** (when `appStore` is set): black pill with Apple SVG icon + "App Store" label. Uses Lucide's `Apple` icon.
- **Private badge** (when `private === true`): replaces the GitHub button. Read-only pill: `<Lock size={13}/> Private repo`. No hover state.

### Expand affordance

- Bottom of content area: a small icon button row right-aligned, containing a Lucide `ChevronDown` that rotates 180° when expanded.
- Whole card body is also clickable to toggle expand, *except* when clicking on action buttons / screenshot thumbnails / topic tags (use `e.stopPropagation()` on those).
- Keyboard: card is `role="button"` `tabIndex={0}`, `Enter`/`Space` toggles.

### Tilt behavior

3D tilt + spotlight remains on collapsed cards. When expanded, tilt is disabled (cards are now content-heavy and tilting feels gratuitous) — the `handleMouseMove` early-returns if `expanded`.

## Filter Redesign

The pill row above the grid changes from `[All, TypeScript, JavaScript, Python, …]` to `[All, Personal, Professional]`.

```tsx
const categories = ["All", "Personal", "Professional"] as const;
const filtered =
  active === "All" ? repos : repos.filter((r) => (r.category ?? "Personal") === active);
```

Pill styling is unchanged. The counts could optionally be appended (`Personal (8)`) but skipping for v1.

## Asset Layout

```
public/projects/
├── media-library/
│   └── cover.png        ← from medialibrary.png (1910×914)
└── snapshift/
    ├── 01.png           ← snap1.png (1170×2532)
    ├── 02.png
    ├── 03.png
    ├── 04.png
    └── 05.png
```

Source files (`medialibrary.png`, `snap1-5.png`) in repo root are moved (not copied) during implementation.

## Animation Details

Powered by `framer-motion` (already installed).

- **Expansion:** `AnimatePresence` + `motion.div` with `initial={{ height: 0, opacity: 0 }}` → `animate={{ height: "auto", opacity: 1 }}` → `exit={{ height: 0, opacity: 0 }}`. Duration ~0.35s, ease "easeOut".
- **Chevron rotation:** `motion.span animate={{ rotate: expanded ? 180 : 0 }}`, duration 0.25s.
- **Lightbox:** fade backdrop (`opacity 0→1`), spring-in image (`scale 0.96→1`). Exit reverses.

## Accessibility

- Cards: `role="button"`, `aria-expanded`, `tabIndex={0}`, keyboard toggle.
- Lightbox: focus trap via simple `useEffect` listening for `Tab`; closes on `Escape`; restores focus to triggering thumbnail.
- Screenshots: `alt` text generated as `"{ProjectName} screenshot {n}"`.
- App Store / GitHub / Private badge buttons have explicit `aria-label`s.

## Out of Scope

- Updating the homepage `FeaturedProjectCard` — explicitly deferred.
- Cover thumbnails on collapsed cards — explicitly out per user direction.
- Removing the now-unused `src/data/projects.ts` — leave for now; no harm.
- Per-project detail pages (`/projects/<slug>`) — not needed; expandable cards replace this need.

## Colors / Tokens Reference

All existing CSS custom properties (`bg-surface-alt`, `border-border-theme`, `text-accent`, etc.) are reused. No new tokens introduced.
