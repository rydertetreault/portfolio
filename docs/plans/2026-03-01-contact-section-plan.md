# Contact Section Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the plain-text contact section with slim timeline cards (icon + name + handle + copy/link buttons) that match the education section's visual style.

**Architecture:** Add a `ContactItem` component to `src/app/page.tsx` alongside the existing `EduItem`/`TimelineItem` components. Import Lucide icons for each platform. Replace the contact section's `<p>` content with three `ContactItem` instances. Copy-to-clipboard uses `navigator.clipboard` with a brief check-icon feedback state.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Lucide React, Framer Motion (existing Section wrapper handles animation)

---

### Task 1: Add Lucide icon imports

**Files:**
- Modify: `src/app/page.tsx:1-5` (imports section)

**Step 1: Add Lucide import**

Add the following import after the existing imports at line 5:

```tsx
import { Linkedin, Mail, Github, Copy, Check, ArrowUpRight } from "lucide-react";
```

The full imports block should read:

```tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Linkedin, Mail, Github, Copy, Check, ArrowUpRight } from "lucide-react";
```

**Step 2: Verify no lint/build errors**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npx next lint`
Expected: No new errors (unused import warnings are OK at this stage)

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(contact): add Lucide icon imports for contact cards"
```

---

### Task 2: Create the ContactItem component

**Files:**
- Modify: `src/app/page.tsx` (add component after `EduItem`, before `SkillsGroup` — around line 469)

**Step 1: Add the ContactItem component**

Insert the following component after the closing `}` of `EduItem` (line 469) and before `SkillsGroup` (line 471):

```tsx
function ContactItem({
  icon: Icon,
  name,
  handle,
  href,
  copyText,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  name: string;
  handle: string;
  href: string;
  copyText: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative pl-8 group">
      <div className="absolute left-0 top-0 h-full w-px bg-neutral-800 group-hover:bg-emerald-400/60 transition-colors duration-300" />

      <div className="grid gap-6 lg:grid-cols-[160px_1fr] lg:gap-10">
        <div className="text-neutral-500 group-hover:text-emerald-400 transition-colors duration-300">
          <Icon size={24} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold">{name}</p>
            <p className="text-sm text-neutral-500">{handle}</p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCopy}
              className="text-neutral-500 hover:text-emerald-400 transition-colors cursor-pointer"
              aria-label={`Copy ${name}`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-neutral-500 hover:text-emerald-400 transition-colors"
              aria-label={`Open ${name}`}
            >
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify no build errors**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npx next lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(contact): add ContactItem component"
```

---

### Task 3: Replace contact section content

**Files:**
- Modify: `src/app/page.tsx:329-347` (contact section)

**Step 1: Replace the contact section**

Replace the current contact section content (lines 329-347):

```tsx
<Section id="contact" title="CONTACT">
  <p className="text-neutral-300 text-base sm:text-lg leading-relaxed">
    LinkedIn:{" "}
    <a
      href="https://www.linkedin.com/in/ryder-tetreault"
      className="text-emerald-400 hover:text-emerald-300 transition"
    >
      linkedin.com/in/ryder-tetreault
    </a>
    <br />
    Email:{" "}
    <a
      href="mailto:rydertetreault@gmail.com"
      className="text-emerald-400 hover:text-emerald-300 transition"
    >
      rydertetreault@gmail.com
    </a>
  </p>
</Section>
```

With:

```tsx
<Section id="contact" title="CONTACT">
  <ContactItem
    icon={Linkedin}
    name="LinkedIn"
    handle="linkedin.com/in/ryder-tetreault"
    href="https://www.linkedin.com/in/ryder-tetreault"
    copyText="https://www.linkedin.com/in/ryder-tetreault"
  />

  <div className="h-8" />

  <ContactItem
    icon={Mail}
    name="Email"
    handle="rydertetreault@gmail.com"
    href="mailto:rydertetreault@gmail.com"
    copyText="rydertetreault@gmail.com"
  />

  <div className="h-8" />

  <ContactItem
    icon={Github}
    name="GitHub"
    handle="github.com/rydertetreault"
    href="https://github.com/rydertetreault"
    copyText="https://github.com/rydertetreault"
  />
</Section>
```

**Step 2: Run the dev server and visually verify**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npx next dev`

Check at `http://localhost:3000`:
- Three contact cards visible with timeline lines on the left
- Each card shows icon, platform name, handle text
- Copy button copies to clipboard, shows check icon briefly
- Arrow button opens link in new tab
- Timeline line glows emerald on hover
- Icon changes to emerald on hover
- Responsive: stacks properly on mobile

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(contact): replace plain-text contact with slim timeline cards"
```

---

### Task 4: Final verification

**Step 1: Full build check**

Run: `cd "/mnt/c/Users/Ryder Tetreault/Websites/rydertetreault-dev" && npx next build`
Expected: Build succeeds with no errors

**Step 2: Visual review**

Start dev server and verify:
- Contact section matches education section's visual style but is slimmer
- All three cards render correctly
- Copy and link interactions work
- Mobile layout stacks cleanly
- No regressions in other sections