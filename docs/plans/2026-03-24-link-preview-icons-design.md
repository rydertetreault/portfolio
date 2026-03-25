# Link Preview & Icon Refresh Design

## Goal

Refresh the favicon/icon set and OG preview image for rydertetreault.dev, improving both visuals and platform coverage (Discord, Slack, iMessage, Twitter/X, LinkedIn, Facebook, Android, iOS, all modern browsers).

## Approach

Next.js `ImageResponse` for the OG image + SVG-based favicon with generated PNG sizes. Everything lives in code for easy iteration.

## Favicon & Icon Set

**Design:**
- Rounded square shape
- Background: solid dark `#0a0a0a`
- Foreground: "RT" monogram in emerald `#34d399`, clean sans-serif
- Subtle angled brackets `<RT/>` with dimmed brackets (`#065f46`) — at 16x16 fallback to just "RT"

**Files:**

| File | Size | Purpose |
|------|------|---------|
| `favicon.ico` | 16x16 + 32x32 | Browser tab |
| `icon.svg` | scalable | Modern browsers |
| `apple-touch-icon.png` | 180x180 | iOS home screen / iMessage |
| `icon-192.png` | 192x192 | Android / PWA |
| `icon-512.png` | 512x512 | Android splash / PWA |
| `site.webmanifest` | — | PWA manifest linking icons |

**Placement:** SVG source in `src/app/icon.svg`, PNGs in `public/`, manifest in `public/`.

## OG Preview Image

**Design (1200x630):**
- Background: diagonal gradient from `#0a0a0a` (top-left) to `#062e1f` (bottom-right)
- "Ryder Tetreault" — large, white (`#ededed`), Geist Sans
- "Software Engineer & Cyber Defense" — smaller, muted (`#a3a3a3`), below name
- Thin emerald (`#34d399`) horizontal line between name and title, ~60px wide
- Bottom corner: `rydertetreault.dev` in faint text (`#525252`)

**Implementation:** `src/app/opengraph-image.tsx` using Next.js `ImageResponse`. Also `src/app/twitter-image.tsx` re-exporting the same image.

## Platform Coverage & Metadata Updates

**Changes to `layout.tsx`:**
- Remove hardcoded `openGraph.images` and `twitter.images` (Next.js auto-detects the `opengraph-image.tsx` and `twitter-image.tsx` files)
- Add `manifest: '/site.webmanifest'`
- Keep all other metadata as-is

**`site.webmanifest`:**
```json
{
  "name": "Ryder Tetreault",
  "short_name": "RT",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#0a0a0a",
  "background_color": "#0a0a0a",
  "display": "standalone"
}
```

**Cleanup:** Delete `public/og.png` after the dynamic OG image is confirmed working.

## Colors Reference

| Token | Value | Usage |
|-------|-------|-------|
| Dark background | `#0a0a0a` | Icon bg, OG gradient start |
| Emerald accent | `#34d399` | RT text, divider line |
| Dimmed emerald | `#065f46` | Brackets in icon |
| Deep emerald | `#062e1f` | OG gradient end |
| Light text | `#ededed` | Name on OG |
| Muted text | `#a3a3a3` | Subtitle on OG |
| Faint text | `#525252` | URL on OG |
