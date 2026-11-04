"use client";

import Link from "next/link";
import { WaveFrame } from "./WaveBox";

const ENTRIES = [
  { href: "/contact", perm: "drwxr-xr-x", name: "contact/", note: "how to reach me" },
  { href: "/projects", perm: "drwxr-xr-x", name: "projects/", note: "everything I've built" },
  { href: "/resume", perm: "-rw-r--r--", name: "resume", note: "one page, printable" },
];

/**
 * The bottom of the whirlpool: everything has gone black and a directory listing
 * points the way out. Always light-on-black, whatever the theme.
 */
export default function Directory() {
  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden border border-neutral-800 bg-black px-8 py-16 font-mono text-[14px] sm:text-[15px] text-neutral-300 sm:px-14 sm:py-16">
      <WaveFrame band={4} dark />
      <div className="relative space-y-1 bg-black">
        <p>
          <span className="text-[#a3e635]">ryder@ocean</span>:<span className="text-[#fb923c]">~</span>$ ls -l
        </p>
        {ENTRIES.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            scroll={false}
            className="group flex gap-4 py-1 transition-colors hover:text-white"
          >
            <span className="hidden text-neutral-600 sm:inline">{e.perm}</span>
            <span className="w-28 text-[#a3e635] group-hover:underline">{e.name}</span>
            <span className="text-neutral-500">{e.note}</span>
          </Link>
        ))}
        <p className="pt-2">
          <span className="text-[#a3e635]">ryder@ocean</span>:<span className="text-[#fb923c]">~</span>${" "}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-neutral-500 transition-colors hover:text-white"
          >
            cd / <span className="text-neutral-600"># back to the surface</span>
          </button>
          <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-neutral-300" />
        </p>
      </div>
    </div>
  );
}
