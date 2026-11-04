"use client";

import Link from "next/link";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { ArrowUp, ArrowUpRight, Github, Linkedin, Mail } from "lucide-react";
import { PROFILE } from "@/data/profile";
import { eventsAt } from "./route";

const ENTRIES = [
  { href: "/contact", title: "Contact", note: "Email, GitHub, LinkedIn and where I'm based.", color: "#a3e635" },
  { href: "/projects", title: "Projects", note: "Everything I've built, professional and personal.", color: "#fb923c" },
  { href: "/resume", title: "Resume", note: "The one-page version, ready to print.", color: "#facc15" },
];

const hover = (k: number) => window.dispatchEvent(new CustomEvent("ocean:box", { detail: k }));

/**
 * The bottom of the maelstrom. The boxes themselves are drawn by the ocean: the swirling
 * field gathers into their outlines and settles behind them (shaders.ts FORM_FS, located
 * via `data-ocean-box`). This places them and fades the text in once they've formed.
 */
export default function Directory({ u }: { u: MotionValue<number> }) {
  const form = useTransform(u, (v) => eventsAt(v).form);
  const text = useTransform(form, [0.65, 1], [0, 1]);
  const lift = useTransform(text, (t) => (1 - t) * 10);
  const l = PROFILE.links;
  const foot = "inline-flex items-center gap-2 transition-colors hover:text-neutral-100";
  return (
    <div className="mx-auto w-full max-w-6xl text-neutral-200">
      <motion.header style={{ opacity: text, y: lift }} className="mb-10 text-center sm:mb-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">Directory</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-100 sm:text-5xl">{PROFILE.name}</h2>
      </motion.header>

      <nav className="grid gap-5 sm:grid-cols-3 sm:gap-8">
        {ENTRIES.map((e, k) => (
          <Link
            key={e.href}
            href={e.href}
            scroll={false}
            data-ocean-box
            onMouseEnter={() => hover(k)}
            onMouseLeave={() => hover(-1)}
            onFocus={() => hover(k)}
            onBlur={() => hover(-1)}
            className="group relative block min-h-[11rem] p-7 outline-none sm:min-h-[16rem] sm:p-9"
          >
            <motion.div style={{ opacity: text, y: lift }} className="flex h-full flex-col">
              <span className="font-mono text-[11px] tracking-[0.3em]" style={{ color: e.color }}>
                {String(k + 1).padStart(2, "0")}
              </span>
              <span className="mt-auto block pt-10 text-3xl font-semibold tracking-tight text-neutral-100 sm:text-4xl">
                {e.title}
              </span>
              <span className="mt-3 block min-h-[2.75rem] text-sm leading-relaxed text-neutral-400 transition-colors group-hover:text-neutral-200">
                {e.note}
              </span>
              <ArrowUpRight
                size={20}
                className="absolute right-7 top-7 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:right-9 sm:top-9"
                style={{ color: e.color }}
              />
            </motion.div>
          </Link>
        ))}
      </nav>

      <motion.footer
        style={{ opacity: text }}
        className="mt-10 flex flex-col items-center justify-between gap-5 border-t border-neutral-800 pt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500 sm:mt-14 sm:flex-row"
      >
        <div className="flex flex-wrap justify-center gap-x-7 gap-y-3">
          <a href={`mailto:${l.email}`} className={`${foot} normal-case tracking-[0.08em]`}>
            <Mail size={13} /> {l.email}
          </a>
          <a href={l.github} target="_blank" rel="noopener noreferrer" className={foot}>
            <Github size={13} /> GitHub
          </a>
          <a href={l.linkedin} target="_blank" rel="noopener noreferrer" className={foot}>
            <Linkedin size={13} /> LinkedIn
          </a>
        </div>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={foot}>
          <ArrowUp size={13} /> Back to the surface
        </button>
      </motion.footer>
    </div>
  );
}
