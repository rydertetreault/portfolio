import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Heart, Info } from "lucide-react";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Tip the developer | SnapShift",
  description:
    "Support SnapShift's development. SnapShift is built and maintained by one person, Ryder Tetreault. Tips go directly toward continued development and server costs.",
};

type TipOption = {
  label: string;
  handle: string;
  href: string;
  // Subtle visual accent per option.
  tint: string;
  // Optional note shown beneath the handle (e.g. Venmo phone confirmation).
  note?: string;
};

const tipOptions: TipOption[] = [
  {
    label: "Venmo",
    handle: "@rydertetreault",
    href: "https://venmo.com/u/rydertetreault",
    tint: "rgba(0, 132, 255, 0.10)",
    note: "Venmo may ask for the last 4 digits of my phone number to confirm. They are 6492.",
  },
  {
    label: "Cash App",
    handle: "$rydertetreault",
    href: "https://cash.app/$rydertetreault",
    tint: "rgba(0, 217, 86, 0.10)",
  },
];

export default function SnapShiftTip() {
  return (
    <main className="relative min-h-screen text-foreground bg-background">
      {/* Diagonal gradient bands — match the support page styling */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-full left-[10%] w-[300px] h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(90deg, transparent, rgba(163,230,53,0.05), transparent)",
          }}
        />
        <div
          className="absolute -top-full right-[20%] w-[220px] h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(90deg, transparent, rgba(163,230,53,0.035), transparent)",
          }}
        />
        <div
          className="absolute -top-full left-[30%] w-px h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(180deg, transparent 10%, rgba(163,230,53,0.20) 50%, transparent 90%)",
          }}
        />
        <div
          className="absolute -top-full right-[35%] w-px h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(180deg, transparent 15%, rgba(163,230,53,0.12) 50%, transparent 85%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 sm:px-10 lg:px-12 py-16 sm:py-20">
        {/* Back link */}
        <Link
          href="/projects/snapshift/support"
          className="inline-flex items-center gap-2 text-sm text-text-faint hover:text-accent transition-colors mb-12"
        >
          <ArrowLeft size={16} />
          Back to support
        </Link>

        {/* Header */}
        <FadeIn className="space-y-4 mb-12">
          <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] text-text-faint uppercase">
            SnapShift
            <Heart
              size={12}
              className="text-accent fill-accent/40"
              aria-hidden
            />
          </span>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Tip the developer
          </h1>

          <p className="text-text-muted text-base sm:text-lg max-w-2xl">
            SnapShift is built and maintained by one person. If it&apos;s saving
            you time every week, a small tip is a huge encouragement, and it
            goes directly toward continued development and server costs.
          </p>
        </FadeIn>

        <div className="h-px w-full bg-border-theme mb-12" />

        {/* Tip options */}
        <FadeIn delay={0.05} className="space-y-4 mb-16">
          <h2 className="text-sm text-text-faint tracking-[0.35em]">
            CHOOSE A METHOD
          </h2>
          <div className="h-px w-full bg-border-theme" />

          <div className="grid gap-4 sm:grid-cols-2 pt-4">
            {tipOptions.map((opt) => (
              <a
                key={opt.label}
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-2xl border border-border-theme bg-surface p-6 transition-all hover:border-accent hover:shadow-lg"
                style={{ boxShadow: `0 1px 0 ${opt.tint} inset` }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `radial-gradient(ellipse at top right, ${opt.tint}, transparent 70%)`,
                  }}
                />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs tracking-[0.2em] text-text-faint uppercase mb-2">
                      {opt.label}
                    </div>
                    <div className="text-2xl font-semibold tracking-tight">
                      {opt.handle}
                    </div>
                  </div>
                  <ExternalLink
                    size={18}
                    className="text-text-faint group-hover:text-accent transition-colors flex-shrink-0 mt-1"
                  />
                </div>
                <div className="relative mt-4 text-sm text-text-muted">
                  Opens {opt.label} {opt.label === "Venmo" ? "" : "in"} a new
                  tab.
                </div>
                {opt.note && (
                  <div
                    className="relative mt-4 flex items-start gap-2 rounded-lg border border-black/10 bg-black/[0.04] px-3 py-2 text-sm text-foreground dark:border-white/15 dark:bg-white/5"
                    role="note"
                  >
                    <Info
                      size={16}
                      className="text-text-muted flex-shrink-0 mt-0.5"
                      aria-hidden
                    />
                    <span>
                      Venmo may ask for the last 4 digits of my phone number to
                      confirm. They are{" "}
                      <strong className="font-semibold text-foreground">
                        6492
                      </strong>
                      .
                    </span>
                  </div>
                )}
              </a>
            ))}
          </div>

          <p className="text-text-faint text-sm pt-6 max-w-2xl">
            Any amount is appreciated. Even a one-time $1 covers a real chunk
            of monthly hosting. Tips are not required and never unlock features.
            SnapShift will always be free.
          </p>
        </FadeIn>

        {/* Other ways to support */}
        <FadeIn delay={0.1} className="space-y-4 mb-16">
          <h2 className="text-sm text-text-faint tracking-[0.35em]">
            FREE WAYS TO SUPPORT
          </h2>
          <div className="h-px w-full bg-border-theme" />
          <ul className="space-y-3 pt-4 text-foreground text-base leading-relaxed max-w-2xl">
            <li className="flex gap-3">
              <span className="text-accent">→</span>
              <span>
                <strong>Leave a review</strong> on the App Store. It&apos;s the
                #1 thing that helps other people find SnapShift.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent">→</span>
              <span>
                <strong>Share it</strong> with a coworker who keeps screenshots
                of their schedule on their phone.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent">→</span>
              <span>
                <strong>Report bugs or request features</strong> at{" "}
                <a
                  href="mailto:rydertetreault@gmail.com"
                  className="text-accent hover:text-accent-hover transition-colors"
                >
                  rydertetreault@gmail.com
                </a>
                . Real user feedback shapes the roadmap.
              </span>
            </li>
          </ul>
        </FadeIn>

        {/* Footer */}
        <div className="mt-24 pt-8 border-t border-border-theme flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/projects/snapshift/support"
            className="inline-flex items-center gap-2 text-sm text-text-faint hover:text-accent transition-colors"
          >
            <ArrowLeft size={16} />
            Back to support
          </Link>
          <div className="flex items-center gap-4 text-sm text-text-faint">
            <Link
              href="/projects/snapshift/privacy-policy"
              className="hover:text-accent transition-colors"
            >
              Privacy policy
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
