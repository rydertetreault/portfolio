import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "SnapShift Support | Ryder Tetreault",
  description:
    "Support and contact for SnapShift, a mobile app that turns a photo of your work schedule into a calendar.",
};

type Faq = {
  question: string;
  answer: React.ReactNode;
};

const faqs: Faq[] = [
  {
    question: "The OCR didn't pick up all my shifts. What should I do?",
    answer: (
      <>
        OCR works best with clear, well-lit photos taken straight-on. Try
        retaking the photo with better lighting, less glare, and the schedule
        filling most of the frame. Screenshots usually work better than photos
        when possible.
      </>
    ),
  },
  {
    question: "Where is my data stored?",
    answer: (
      <>
        All your events are stored on your device. SnapShift does not have an
        account system, does not sync to the cloud, and does not back up your
        data anywhere. If you delete the app or reset your device, your data
        goes with it.
      </>
    ),
  },
  {
    question: "Does SnapShift work offline?",
    answer: (
      <>
        Mostly yes. Viewing, creating, editing, and deleting events all work
        offline. The only feature that needs an internet connection is the OCR
        step. Your schedule image is sent to an OCR service to extract text,
        then the result comes back to your device.
      </>
    ),
  },
  {
    question: "Can I back up or sync my schedule between devices?",
    answer: (
      <>
        Not in the current version. SnapShift is intentionally on-device only.
        Backup and sync may come in a future update.
      </>
    ),
  },
  {
    question: "How do I delete an event?",
    answer: (
      <>
        Tap any event to open it, then use the delete option. You can also edit
        any field of an existing event from the same screen.
      </>
    ),
  },
  {
    question: "How do I report a bug or request a feature?",
    answer: (
      <>
        Email{" "}
        <a
          href="mailto:rydertetreault@gmail.com"
          className="text-accent hover:text-accent-hover transition-colors"
        >
          rydertetreault@gmail.com
        </a>{" "}
        with a short description. Screenshots help a lot.
      </>
    ),
  },
];

export default function SnapShiftSupport() {
  return (
    <main className="relative min-h-screen text-foreground bg-background">
      {/* Diagonal gradient bands */}
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
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-text-faint hover:text-accent transition-colors mb-12"
        >
          <ArrowLeft size={16} />
          All projects
        </Link>

        {/* Header */}
        <FadeIn className="space-y-4 mb-12">
          <span className="text-[11px] tracking-[0.25em] text-text-faint uppercase">
            SnapShift
          </span>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Support
          </h1>

          <p className="text-text-muted text-base sm:text-lg">
            Snap a photo of your work schedule and turn it into a calendar.
          </p>
        </FadeIn>

        <div className="h-px w-full bg-border-theme mb-12" />

        {/* Contact */}
        <FadeIn delay={0.05} className="space-y-4 mb-16">
          <h2 className="text-sm text-text-faint tracking-[0.35em]">
            GET IN TOUCH
          </h2>
          <div className="h-px w-full bg-border-theme" />
          <div className="space-y-3 text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
            <p>
              <a
                href="mailto:rydertetreault@gmail.com"
                className="text-accent hover:text-accent-hover transition-colors font-medium"
              >
                rydertetreault@gmail.com
              </a>
            </p>
            <p className="text-text-muted text-sm sm:text-base">
              I read every email. For bug reports, please include your iOS
              version and the device you&apos;re on.
            </p>
          </div>
        </FadeIn>

        {/* Tip the developer */}
        <FadeIn delay={0.08} className="space-y-4 mb-16">
          <h2 className="text-sm text-text-faint tracking-[0.35em]">
            TIP THE DEVELOPER
          </h2>
          <div className="h-px w-full bg-border-theme" />
          <div className="space-y-3 text-foreground text-base sm:text-lg leading-relaxed max-w-2xl pt-3">
            <p>
              SnapShift is free and will stay free. If it&apos;s saving you
              time, a small tip helps cover server costs and continued
              development.
            </p>
            <Link
              href="/projects/snapshift/tip"
              className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors font-medium"
            >
              Send a tip →
            </Link>
          </div>
        </FadeIn>

        {/* FAQ */}
        <FadeIn delay={0.1} className="space-y-4">
          <h2 className="text-sm text-text-faint tracking-[0.35em]">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <div className="h-px w-full bg-border-theme" />
          <div className="divide-y divide-border-theme">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group py-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-4 text-foreground text-base sm:text-lg font-medium list-none">
                  <span>{faq.question}</span>
                  <span
                    aria-hidden
                    className="text-text-faint text-xl leading-none mt-0.5 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="pt-3 text-text-muted text-base leading-relaxed max-w-2xl">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </FadeIn>

        {/* Footer */}
        <div className="mt-24 pt-8 border-t border-border-theme flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-text-faint hover:text-accent transition-colors"
          >
            <ArrowLeft size={16} />
            Back to all projects
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
