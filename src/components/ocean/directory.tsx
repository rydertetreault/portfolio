"use client";

import Link from "next/link";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, ArrowUp, Github, Linkedin, Mail } from "lucide-react";
import { PROFILE } from "@/data/profile";
import { eventsAt } from "./route";

const ENTRIES = [
  { href: "/contact", name: "contact", note: "Email, GitHub, LinkedIn, and where I'm based", color: "#a3e635" },
  { href: "/projects", name: "projects", note: "Everything I've built, professional and personal", color: "#fb923c" },
  { href: "/resume", name: "resume", note: "The one-page version, ready to print", color: "#facc15" },
];

/** Fade + lift in over [a, b] of the directory's `form` (0..1 once the dive lands). */
function useReveal(form: MotionValue<number>, a: number, b: number) {
  const opacity = useTransform(form, [a, b], [0, 1]);
  const y = useTransform(opacity, (t) => (1 - t) * 18);
  return { opacity, y };
}

function Entry({ form, k, e }: { form: MotionValue<number>; k: number; e: (typeof ENTRIES)[number] }) {
  const style = useReveal(form, 0.55 + 0.12 * k, 0.8 + 0.1 * k);
  return (
    <motion.li style={style} className="border-b border-white/10">
      <Link
        href={e.href}
        scroll={false}
        style={{ ["--c" as string]: e.color }}
        className="group relative grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 py-6 outline-none sm:grid-cols-[4rem_1fr_auto] sm:gap-x-8 sm:py-8"
      >
        {/* Accent rule that sweeps in on hover / focus. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-gradient-to-r from-[color:var(--c)]/[0.09] to-transparent transition-transform duration-500 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
        />
        <span className="relative font-mono text-xs tracking-[0.25em]" style={{ color: e.color }}>
          {String(k + 1).padStart(2, "0")}
        </span>
        <span className="relative flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
          <span className="font-mono text-4xl tracking-tight text-neutral-100 transition-[color,transform] duration-300 group-hover:translate-x-2 group-hover:text-[color:var(--c)] group-focus-visible:translate-x-2 group-focus-visible:text-[color:var(--c)] sm:text-6xl">
            <span className="text-neutral-600 transition-colors group-hover:text-[color:var(--c)]/60">~/</span>
            {e.name}
          </span>
          <span className="text-sm text-neutral-500 transition-colors group-hover:text-neutral-300 sm:max-w-[20rem] sm:text-right">
            {e.note}
          </span>
        </span>
        <ArrowRight
          size={22}
          className="relative text-neutral-600 transition-[color,transform] duration-300 group-hover:translate-x-1 group-hover:text-[color:var(--c)] group-focus-visible:text-[color:var(--c)]"
        />
      </Link>
    </motion.li>
  );
}

/**
 * The bottom of the maelstrom: where you land after the dive. A shell prompt listing the
 * rest of the site, over the still-turning field (drawn by the ocean behind it).
 */
export default function Directory({ u }: { u: MotionValue<number> }) {
  const form = useTransform(u, (v) => eventsAt(v).form);
  const head = useReveal(form, 0.4, 0.7);
  const foot = useReveal(form, 0.85, 1);
  const l = PROFILE.links;
  const link = "inline-flex items-center gap-2 transition-colors hover:text-neutral-100";
  return (
    <div className="mx-auto w-full max-w-5xl text-neutral-200">
      <motion.header style={head} className="mb-8 sm:mb-12">
        <p className="font-mono text-xs text-neutral-500 sm:text-sm">
          <span className="text-[#a3e635]">ryder@tetreault</span>
          <span className="text-neutral-600">:</span>
          <span className="text-[#facc15]">~</span>
          <span className="text-neutral-600">$</span> ls
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-100 sm:text-5xl">{PROFILE.name}</h2>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
          {PROFILE.title} · {PROFILE.location}
        </p>
      </motion.header>

      <nav aria-label="Directory">
        <ul className="border-t border-white/10">
          {ENTRIES.map((e, k) => (
            <Entry key={e.href} form={form} k={k} e={e} />
          ))}
        </ul>
      </nav>

      <motion.footer
        style={foot}
        className="mt-8 flex flex-col items-start justify-between gap-5 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500 sm:mt-12 sm:flex-row sm:items-center"
      >
        <div className="flex flex-wrap gap-x-7 gap-y-3">
          <a href={`mailto:${l.email}`} className={`${link} normal-case tracking-[0.08em]`}>
            <Mail size={13} /> {l.email}
          </a>
          <a href={l.github} target="_blank" rel="noopener noreferrer" className={link}>
            <Github size={13} /> GitHub
          </a>
          <a href={l.linkedin} target="_blank" rel="noopener noreferrer" className={link}>
            <Linkedin size={13} /> LinkedIn
          </a>
        </div>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={link}>
          <ArrowUp size={13} /> Back to the surface
        </button>
      </motion.footer>
    </div>
  );
}
