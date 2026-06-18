# Projects Section Redesign Implementation Plan

> **For Claude:** Implement this plan task-by-task. After each task, verify with the listed checks before moving on.

**Goal:** Redesign `/projects` with category filters (Personal/Professional), expandable cards with long descriptions and screenshot galleries, and two new projects (Media Library + SnapShift published iOS app).

**Architecture:** Extend `GitHubRepo` type with optional fields populated by overrides/manual projects. Filter switches from language to category. `RepoCard` gains expanded state powered by Framer Motion. New `Lightbox` component for full-size screenshots.

**Tech Stack:** Next.js 16 App Router, Framer Motion 12 (already installed), Tailwind v4, lucide-react.

---

### Task 1: Move screenshot assets into `public/projects/`

**Files:**
- Move: `medialibrary.png` → `public/projects/media-library/cover.png`
- Move: `snap1.png` … `snap5.png` → `public/projects/snapshift/01.png` … `05.png`

**Step 1: Create directories and move files**

```bash
mkdir -p public/projects/media-library public/projects/snapshift
mv medialibrary.png public/projects/media-library/cover.png
mv snap1.png public/projects/snapshift/01.png
mv snap2.png public/projects/snapshift/02.png
mv snap3.png public/projects/snapshift/03.png
mv snap4.png public/projects/snapshift/04.png
mv snap5.png public/projects/snapshift/05.png
```

**Step 2: Verify**

```bash
ls -la public/projects/media-library public/projects/snapshift
# Repo root should no longer contain medialibrary.png or snap*.png
ls medialibrary.png snap*.png 2>&1 | grep -q "No such" && echo "OK: source files moved"
```

---

### Task 2: Extend the project type and override data

**Files:**
- Modify: `src/lib/github.ts`

**Step 1: Extend `GitHubRepo` type**

In `src/lib/github.ts`, replace the existing `GitHubRepo` type definition with:

```ts
export type ProjectCategory = "Personal" | "Professional";

export type GitHubRepo = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  created_at: string;
  pushed_at: string;
  // --- Local enrichment fields ---
  category?: ProjectCategory;
  longDescription?: string;
  subtitle?: string;
  screenshots?: string[];
  appStore?: string;
  private?: boolean;
};
```

**Step 2: Add a `categoryOverrides` map**

Just below `repoOverrides`, add:

```ts
/** Categorize specific GitHub repos. Defaults to "Personal" when not listed. */
const categoryOverrides: Record<string, ProjectCategory> = {
  // (empty for now — all current GitHub repos default to Personal.
  // Add entries here later if any GH-sourced repo should be Professional.)
};
```

**Step 3: Extend the SnapShift override**

Replace the existing `SnapShift` entry in `repoOverrides` with:

```ts
SnapShift: {
  description:
    "An iOS app that turns a photo of your work schedule into a calendar using on-device OCR. All data stays on your device.",
  longDescription:
    "SnapShift is an iOS app I designed, built, and shipped to the App Store. Take or upload a photo of your work schedule and it extracts your shifts using on-device OCR, then drops them straight into a clean calendar view.\n\nNo accounts, no cloud sync, no analytics — every event is stored locally on your device. The app is built around the idea that something as personal as your weekly schedule shouldn't require signing up for anything or handing your data to a server.",
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
},
```

**Step 4: Add Media Library to `manualProjects`**

Prepend (so it appears first when ties are broken by date) a new entry to `manualProjects`:

```ts
{
  name: "media-library",
  subtitle: "Ram Dass Love Serve Remember Foundation",
  description:
    "A custom digital media library giving a non-profit's team a single home for decades of archival audio, video, images, and documents — with AI-powered transcription, tagging, and semantic search.",
  longDescription:
    "A custom digital media library built for the Ram Dass Love Serve Remember Foundation to give their team a single home for decades of archival audio, video, images, and documents.\n\nUsers can browse and search the entire archive from a clean, gallery-style interface — filtering by type, collection, rights, or any custom tag the team cares about. Opening an asset reveals a rich detail view with a built-in player, auto-generated transcripts, thumbnails, and editable metadata. Behind the scenes, AI quietly handles the slow work: transcribing recordings, suggesting tags, extracting key topics and people, and making everything semantically searchable so staff can find a specific quote or moment in seconds rather than hours.\n\nAdmins get tools for managing users and teams, configuring metadata fields, tracking rights, organizing collections, and generating share links for collaborators outside the organization.\n\nMy role: Frontend developer and UI/UX designer — I designed the interface and built out most of the client-side experience.",
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
},
```

**Step 5: Mark `analytics-api` as Professional**

Edit the existing `analytics-api` object in `manualProjects` and add:

```ts
category: "Professional",
```

**Step 6: Apply `categoryOverrides` to GitHub-sourced repos**

In `fetchGitHubRepos()`, update the `.map((repo) => ...)` step to also apply the category override:

```ts
.map((repo) => ({
  ...repo,
  ...repoOverrides[repo.name],
  category: categoryOverrides[repo.name] ?? repoOverrides[repo.name]?.category ?? "Personal",
}))
```

**Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expect: zero errors.

---

### Task 3: Create the `Lightbox` component

**Files:**
- Create: `src/components/Lightbox.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
  alt,
}: {
  images: string[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  alt: string;
}) {
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
      if (e.key === "ArrowLeft")
        onIndexChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onClose, onIndexChange]);

  return (
    <AnimatePresence>
      {index !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-10"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot viewer"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 rounded-full p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={22} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange((index - 1 + images.length) % images.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Previous"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange((index + 1) % images.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Next"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          <motion.div
            key={index}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-h-full max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[index]}
              alt={`${alt} ${index + 1}`}
              width={1600}
              height={1600}
              className="max-h-[88vh] w-auto rounded-xl shadow-2xl object-contain"
              unoptimized
            />
          </motion.div>

          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-xs tracking-wider">
              {index + 1} / {images.length}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

---

### Task 4: Add Apple icon helper

The `lucide-react` library does not include a usable Apple logo. Add a small inline SVG component for the App Store button.

**Files:**
- Create: `src/components/icons/AppleIcon.tsx`

**Step 1: Create**

```tsx
export default function AppleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.365 1.43c0 1.14-.467 2.235-1.236 3.02-.83.847-2.18 1.5-3.31 1.41-.135-1.11.4-2.25 1.18-3.03.83-.85 2.27-1.475 3.366-1.4zM20.5 17.46c-.61 1.41-.9 2.04-1.69 3.29-1.1 1.74-2.65 3.91-4.57 3.93-1.71.02-2.15-1.11-4.47-1.1-2.32.01-2.8 1.12-4.51 1.1-1.92-.02-3.39-1.98-4.49-3.72C-.85 16.79-1.34 11.31.97 8.4c1.64-2.07 4.23-3.28 6.66-3.28 2.47 0 4.02 1.35 6.06 1.35 1.97 0 3.17-1.35 6.03-1.35 2.16 0 4.45 1.18 6.08 3.22-5.34 2.93-4.47 10.56-5.3 9.12z" />
    </svg>
  );
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

---

### Task 5: Redesign `ProjectsGrid.tsx`

**Files:**
- Modify: `src/components/ProjectsGrid.tsx`

**Step 1: Update filter from language to category**

Replace the `languages` array and `filtered` derivation with:

```ts
const categories = ["All", "Personal", "Professional"] as const;

const filtered =
  active === "All"
    ? repos
    : repos.filter((r) => (r.category ?? "Personal") === active);
```

Rename the iteration variable in the pill `.map()` from `lang` → `cat`. Update the `key={lang}` and `{lang}` references accordingly.

**Step 2: Update card grid to track expansion state**

Add to the top of `ProjectsGrid`:

```ts
const [expandedName, setExpandedName] = useState<string | null>(null);
```

Pass these to each `RepoCard`:

```tsx
<RepoCard
  key={repo.name}
  repo={repo}
  index={i}
  mounted={mounted}
  expanded={expandedName === repo.name}
  onToggle={() =>
    setExpandedName((prev) => (prev === repo.name ? null : repo.name))
  }
/>
```

(Single-expansion model: opening one card closes the others. This keeps the page tidy.)

**Step 3: Expand the grid container to allow expanded cards to span both columns**

Change the grid items so an expanded card spans full width:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
  {filtered.map((repo, i) => (
    <div
      key={repo.name}
      className={expandedName === repo.name ? "md:col-span-2" : ""}
    >
      <RepoCard … />
    </div>
  ))}
</div>
```

(Note: this means the wrapper div from `RepoCard` moves up a level. Keep the entrance animation on the inner card.)

---

### Task 6: Rebuild `RepoCard` with expansion + screenshots + new action buttons

**Files:**
- Modify: `src/components/ProjectsGrid.tsx` (the `RepoCard` function)

**Step 1: Update the `RepoCard` props signature**

```tsx
function RepoCard({
  repo,
  index,
  mounted,
  expanded,
  onToggle,
}: {
  repo: GitHubRepo;
  index: number;
  mounted: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
```

**Step 2: Add lightbox state**

Near the top of the component:

```tsx
const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
```

**Step 3: Disable tilt when expanded**

Update `handleMouseMove`:

```tsx
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  if (isTouch || !ref.current || expanded) return;
  // …rest unchanged
};
```

**Step 4: Update imports at top of file**

Add to the existing lucide-react import:

```ts
import { …existing…, ChevronDown, Lock } from "lucide-react";
```

Also add:

```ts
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Lightbox from "@/components/Lightbox";
import AppleIcon from "@/components/icons/AppleIcon";
```

**Step 5: Display the subtitle in the card header**

In the header section (where `<h2>` for the title is), add right under the title:

```tsx
{repo.subtitle && (
  <p className="text-xs sm:text-sm text-text-faint mt-1.5">
    {repo.subtitle}
  </p>
)}
```

**Step 6: Update the action row**

Replace the existing action row block with:

```tsx
<div
  className="flex flex-wrap items-center gap-3 pt-1"
  onClick={(e) => e.stopPropagation()}
>
  {repo.private ? (
    <span className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-text-muted">
      <Lock size={14} />
      Private repo
    </span>
  ) : (
    repo.html_url && (
      <a
        href={repo.html_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-all duration-200"
      >
        <Github size={15} />
        GitHub
      </a>
    )
  )}

  {repo.appStore && (
    <a
      href={repo.appStore}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-all duration-200"
    >
      <AppleIcon size={15} />
      App Store
    </a>
  )}

  {repo.homepage && (
    <a
      href={repo.homepage}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-all duration-200"
    >
      <ArrowUpRight size={15} />
      Live Site
    </a>
  )}

  {repo.name === "SnapShift" && (
    <>
      <Link
        href="/projects/snapshift/privacy-policy"
        className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-all duration-200"
      >
        <ScrollText size={15} />
        Privacy Policy
      </Link>
      <Link
        href="/projects/snapshift/support"
        className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-alt px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent-hover transition-all duration-200"
      >
        <LifeBuoy size={15} />
        Support
      </Link>
    </>
  )}
</div>
```

**Step 7: Wrap the inner card with keyboard / click toggling**

Modify the outer interactive div (the one with `onMouseMove`) to add:

```tsx
<div
  ref={ref}
  role="button"
  tabIndex={0}
  aria-expanded={expanded}
  onClick={onToggle}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }}
  onMouseMove={handleMouseMove}
  …
  className="… cursor-pointer"
>
```

**Step 8: Add the expand chevron at the bottom of the content area**

Right after the existing action row, add:

```tsx
<div className="flex justify-end pt-2">
  <motion.span
    animate={{ rotate: expanded ? 180 : 0 }}
    transition={{ duration: 0.25 }}
    className="text-text-faint group-hover:text-text-muted transition-colors"
  >
    <ChevronDown size={18} />
  </motion.span>
</div>
```

**Step 9: Add the expanded content block**

Immediately after the content `<div className="p-6 sm:p-8 pt-5 space-y-5">…</div>`, add (still inside the inner card):

```tsx
<AnimatePresence initial={false}>
  {expanded && repo.longDescription && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="overflow-hidden border-t border-border-theme"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 sm:p-8 space-y-6">
        <div className="space-y-3 text-text-muted text-sm sm:text-base leading-relaxed">
          {repo.longDescription.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {repo.screenshots && repo.screenshots.length > 0 && (
          <ScreenshotGallery
            screenshots={repo.screenshots}
            projectName={formatRepoName(repo.name)}
            isPrivate={!!repo.private}
            onOpen={(i) => setLightboxIndex(i)}
          />
        )}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

**Step 10: Add the lightbox at the end of the component, before the closing wrapper div**

```tsx
{repo.screenshots && (
  <Lightbox
    images={repo.screenshots}
    index={lightboxIndex}
    alt={formatRepoName(repo.name)}
    onClose={() => setLightboxIndex(null)}
    onIndexChange={(i) => setLightboxIndex(i)}
  />
)}
```

---

### Task 7: Create the `ScreenshotGallery` subcomponent

Add this as a new function inside `ProjectsGrid.tsx` (below `RepoCard`).

```tsx
function ScreenshotGallery({
  screenshots,
  projectName,
  isPrivate,
  onOpen,
}: {
  screenshots: string[];
  projectName: string;
  isPrivate: boolean;
  onOpen: (i: number) => void;
}) {
  // Use a simple heuristic: if the file path looks like a phone screenshot
  // (e.g. snapshift/*) treat it as portrait. Otherwise landscape.
  const isPortrait = (src: string) =>
    /\/snapshift\//i.test(src) || /phone|mobile/i.test(src);

  return (
    <div className="space-y-3">
      {isPrivate && (
        <p className="text-xs text-text-faint italic">
          Interface only — client content redacted for privacy.
        </p>
      )}
      <div
        className={
          isPortrait(screenshots[0])
            ? "flex flex-wrap gap-4"
            : "grid grid-cols-1 sm:grid-cols-2 gap-4"
        }
      >
        {screenshots.map((src, i) => {
          const portrait = isPortrait(src);
          return (
            <button
              key={src}
              onClick={(e) => {
                e.stopPropagation();
                onOpen(i);
              }}
              className={[
                "group/shot relative overflow-hidden rounded-xl border border-border-theme bg-surface-alt",
                "hover:border-accent transition-all duration-200 cursor-zoom-in",
                portrait ? "w-[120px] sm:w-[140px]" : "w-full",
              ].join(" ")}
              aria-label={`Open ${projectName} screenshot ${i + 1}`}
            >
              <div
                className={
                  portrait ? "aspect-[9/19.5]" : "aspect-[16/9]"
                }
              >
                <Image
                  src={src}
                  alt={`${projectName} screenshot ${i + 1}`}
                  width={portrait ? 280 : 1600}
                  height={portrait ? 600 : 900}
                  className="h-full w-full object-cover group-hover/shot:scale-[1.02] transition-transform duration-300"
                  unoptimized
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Task 8: Run typecheck and lint

```bash
npx tsc --noEmit
npm run lint
```

Fix any errors. Common gotchas to watch for:
- Unused imports left over (e.g. the removed language helper)
- Missing `key` props
- Make sure `formatRepoName` still imported

---

### Task 9: Smoke test the UI

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Manual checks**

Visit `http://localhost:3000/projects` and verify:

- [ ] Filter pills show `All`, `Personal`, `Professional`
- [ ] Default tab `All` shows every repo + Media Library + analytics-api
- [ ] `Professional` tab shows only Media Library and analytics-api
- [ ] `Personal` tab shows GitHub repos (incl. SnapShift) and excludes Media Library / analytics-api
- [ ] Clicking a card expands it; clicking again collapses it
- [ ] Clicking a different card collapses the previous one
- [ ] Expanded card spans both columns on desktop
- [ ] SnapShift card shows: long description, 5 phone screenshot thumbnails (portrait), App Store button, GitHub button, Privacy Policy + Support links
- [ ] Media Library card shows: subtitle "Ram Dass Love Serve Remember Foundation", long description with role line, 1 landscape screenshot, "Private repo" pill, privacy caption above screenshot, NO GitHub button
- [ ] Clicking a screenshot opens lightbox
- [ ] Lightbox: Escape closes, arrow keys navigate (only relevant with multiple), X closes, click-outside closes
- [ ] Keyboard: Tab to a card, Enter/Space toggles expansion
- [ ] 3D tilt still works on collapsed cards; disabled on expanded
- [ ] Action buttons / topic tags don't trigger expand toggle when clicked
- [ ] Page still renders correctly in light + dark theme

**Step 3: Mobile checks**

Resize to ~390px wide and verify:
- [ ] Pills wrap correctly
- [ ] Cards stack single column
- [ ] Expanded card content readable, screenshots strip wraps
- [ ] Lightbox usable on small screen

---

### Task 10: Commit

```bash
git add -A
git status   # sanity-check the diff
git commit -m "feat: redesign projects page with category filters, expandable cards, and screenshot galleries

- Replace language filter with Personal/Professional category filter
- Add Media Library project (Ram Dass Love Serve Remember Foundation)
- Surface SnapShift App Store link and 5 iOS screenshots
- Expandable cards reveal long-form description + screenshot gallery
- New Lightbox component for full-size screenshot viewing
- Add Private repo pill, App Store action, Apple icon component"
```

---

## Rollback

If anything goes sideways:

```bash
git restore --staged --worktree src/lib/github.ts src/components/ProjectsGrid.tsx
rm -rf src/components/Lightbox.tsx src/components/icons public/projects
```

(Screenshots originally in repo root can be restored from git history.)
