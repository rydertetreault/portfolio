# Link Preview & Icon Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh favicon/icon set and OG preview image with emerald-on-dark branding and full platform coverage.

**Architecture:** SVG source icon with a Node.js script to generate PNG/ICO variants. Dynamic OG image via Next.js `ImageResponse`. Web manifest for PWA/Android support. All wired through Next.js file-based metadata conventions.

**Tech Stack:** Next.js 16 file-based metadata, `next/og` ImageResponse, `sharp` + `to-ico` for icon generation.

---

### Task 1: Create the SVG Icon Source

**Files:**
- Create: `src/app/icon.svg`

**Step 1: Create the SVG file**

Create `src/app/icon.svg` with the `<RT/>` monogram design:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#0a0a0a"/>
  <!-- Dimmed brackets -->
  <text x="256" y="295" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="200" fill="#065f46">&lt;  /&gt;</text>
  <!-- RT monogram -->
  <text x="256" y="295" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="200" fill="#34d399">RT</text>
</svg>
```

Note: The brackets `< />` are rendered first (behind), then `RT` on top. The brackets are offset wider so they peek out from behind the RT. Adjust letter-spacing and x-offsets visually until the brackets frame the letters nicely.

**Step 2: Verify the SVG renders correctly**

Open `src/app/icon.svg` in a browser to visually verify:
- Dark rounded-square background
- Emerald "RT" centered
- Dimmed green brackets visible behind/around the RT

**Step 3: Commit**

```bash
git add src/app/icon.svg
git commit -m "feat: add RT monogram SVG icon source"
```

---

### Task 2: Create Icon Generation Script

**Files:**
- Create: `scripts/generate-icons.mjs`

**Step 1: Install dev dependencies**

```bash
npm install --save-dev sharp to-ico
```

**Step 2: Create the generation script**

Create `scripts/generate-icons.mjs`:

```js
import sharp from 'sharp';
import toIco from 'to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const svgPath = join(root, 'src/app/icon.svg');
const svg = readFileSync(svgPath);

async function generate() {
  // Generate PNGs at all needed sizes
  const sizes = [
    { size: 16, output: null },           // for ICO only
    { size: 32, output: null },           // for ICO only
    { size: 180, output: 'src/app/apple-icon.png' },
    { size: 192, output: 'public/icon-192.png' },
    { size: 512, output: 'public/icon-512.png' },
  ];

  const pngBuffers = {};

  for (const { size, output } of sizes) {
    const buf = await sharp(svg).resize(size, size).png().toBuffer();
    pngBuffers[size] = buf;
    if (output) {
      writeFileSync(join(root, output), buf);
      console.log(`Created ${output} (${size}x${size})`);
    }
  }

  // Generate favicon.ico (16x16 + 32x32)
  const ico = await toIco([pngBuffers[16], pngBuffers[32]]);
  writeFileSync(join(root, 'src/app/favicon.ico'), ico);
  console.log('Created src/app/favicon.ico (16x16 + 32x32)');
}

generate().catch(console.error);
```

**Step 3: Commit**

```bash
git add scripts/generate-icons.mjs package.json package-lock.json
git commit -m "feat: add icon generation script with sharp and to-ico"
```

---

### Task 3: Generate All Icon Files

**Files:**
- Create: `src/app/favicon.ico` (replaces existing)
- Create: `src/app/apple-icon.png`
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`

**Step 1: Run the generation script**

```bash
node scripts/generate-icons.mjs
```

Expected output:
```
Created src/app/apple-icon.png (180x180)
Created public/icon-192.png (192x192)
Created public/icon-512.png (512x512)
Created src/app/favicon.ico (16x16 + 32x32)
```

**Step 2: Visually verify the generated icons**

Open each PNG in an image viewer to check they look correct at their respective sizes. Pay special attention to `favicon.ico` — at 16x16 the brackets may be too small; if so, go back to Task 1 and create a simplified SVG variant without brackets for small sizes, or adjust the script to use a different SVG for 16x16/32x32.

**Step 3: Commit**

```bash
git add src/app/favicon.ico src/app/apple-icon.png public/icon-192.png public/icon-512.png
git commit -m "feat: generate icon set from SVG source"
```

---

### Task 4: Create Dynamic OG Image

**Files:**
- Create: `src/app/opengraph-image.tsx`

**Step 1: Create the OG image route**

Create `src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Ryder Tetreault | Software Engineer & Cyber Defense';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #062e1f 100%)',
          position: 'relative',
        }}
      >
        {/* Name */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#ededed',
            letterSpacing: '-0.02em',
          }}
        >
          Ryder Tetreault
        </div>

        {/* Divider line */}
        <div
          style={{
            width: 60,
            height: 3,
            backgroundColor: '#34d399',
            marginTop: 24,
            marginBottom: 24,
            borderRadius: 2,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#a3a3a3',
            fontWeight: 400,
          }}
        >
          Software Engineer & Cyber Defense
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 40,
            fontSize: 18,
            color: '#525252',
          }}
        >
          rydertetreault.dev
        </div>
      </div>
    ),
    { ...size }
  );
}
```

**Step 2: Verify the OG image renders**

```bash
npm run dev
```

Visit `http://localhost:3000/opengraph-image` in a browser. Verify:
- Diagonal gradient background (dark to deep emerald)
- "Ryder Tetreault" large and centered in white
- Emerald divider line below the name
- "Software Engineer & Cyber Defense" in muted gray
- "rydertetreault.dev" in bottom-right corner, faint

**Step 3: Commit**

```bash
git add src/app/opengraph-image.tsx
git commit -m "feat: add dynamic OG image with emerald gradient design"
```

---

### Task 5: Create Twitter Image

**Files:**
- Create: `src/app/twitter-image.tsx`

**Step 1: Create the twitter image route**

Create `src/app/twitter-image.tsx` that re-exports the OG image:

```tsx
export { default, alt, size, contentType, runtime } from './opengraph-image';
```

**Step 2: Verify**

Visit `http://localhost:3000/twitter-image` — should render the same image as the OG image.

**Step 3: Commit**

```bash
git add src/app/twitter-image.tsx
git commit -m "feat: add twitter image re-exporting OG image"
```

---

### Task 6: Create Web Manifest

**Files:**
- Create: `public/site.webmanifest`

**Step 1: Create the manifest file**

Create `public/site.webmanifest`:

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

**Step 2: Commit**

```bash
git add public/site.webmanifest
git commit -m "feat: add web manifest for PWA icon support"
```

---

### Task 7: Update Layout Metadata

**Files:**
- Modify: `src/app/layout.tsx:25-62`

**Step 1: Update the metadata export**

Replace the `metadata` export in `src/app/layout.tsx`. Remove `openGraph.images` and `twitter.images` (Next.js auto-detects `opengraph-image.tsx` and `twitter-image.tsx`). Add `manifest`. Keep everything else.

```tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://rydertetreault.dev"),
  title: "Ryder Tetreault | Software Engineer & Cyber Defense",
  description:
    "Software engineer and cybersecurity specialist building secure, scalable systems. Auburn University CS graduate focused on systems engineering and infrastructure defense.",
  keywords: [
    "Ryder Tetreault",
    "software engineer",
    "cybersecurity",
    "cyber defense",
    "Auburn University",
    "full stack developer",
    "portfolio",
  ],
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Ryder Tetreault | Software Engineer & Cyber Defense",
    description:
      "Software engineer and cybersecurity specialist building secure, scalable systems.",
    url: "https://rydertetreault.dev",
    siteName: "Ryder Tetreault",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ryder Tetreault | Software Engineer & Cyber Defense",
    description:
      "Software engineer and cybersecurity specialist building secure, scalable systems.",
  },
};
```

**Step 2: Verify the metadata renders correctly**

```bash
npm run dev
```

Visit `http://localhost:3000` and inspect the `<head>`:
- `<link rel="icon" href="/icon.svg" type="image/svg+xml">`
- `<link rel="apple-touch-icon" href="/apple-icon.png">`
- `<link rel="manifest" href="/site.webmanifest">`
- `<meta property="og:image" ...>` pointing to the dynamic route
- `<meta name="twitter:image" ...>` pointing to the dynamic route
- No more hardcoded `/og.png` references

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: update metadata for dynamic OG/twitter images and web manifest"
```

---

### Task 8: Cleanup & Final Verification

**Files:**
- Delete: `public/og.png`

**Step 1: Delete the old static OG image**

```bash
rm public/og.png
```

**Step 2: Run a full build to verify everything works**

```bash
npm run build
```

Verify no build errors. Check the build output mentions the opengraph-image and twitter-image routes.

**Step 3: Start production server and verify**

```bash
npm run start
```

Test the following:
1. Visit `http://localhost:3000` — favicon should show the new RT icon in the browser tab
2. Visit `http://localhost:3000/opengraph-image` — should render the OG preview image
3. Visit `http://localhost:3000/twitter-image` — should render the same image
4. Inspect page source `<head>` — all meta tags should be correct
5. Visit `http://localhost:3000/site.webmanifest` — should return valid JSON

**Step 4: Commit cleanup**

```bash
git rm public/og.png
git add .
git commit -m "chore: remove old static OG image"
```

---

### Post-Deployment Verification

After deploying to Vercel, test link previews on:
- **Discord:** Paste `https://rydertetreault.dev` in a channel
- **Slack:** Same
- **iMessage:** Text the link to yourself
- **Twitter/X:** Use [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- **LinkedIn:** Use [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- **Facebook:** Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

If any platform shows a cached old preview, use that platform's debugger tool to force a re-scrape.
