import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "SnapShift Privacy Policy | Ryder Tetreault",
  description:
    "Privacy Policy for SnapShift, a mobile schedule management app.",
};

export default function SnapShiftPrivacyPolicy() {
  return (
    <main className="relative min-h-screen text-foreground bg-background">
      {/* Diagonal gradient bands */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-full left-[10%] w-[300px] h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(90deg, transparent, rgba(34,197,94,0.05), transparent)",
          }}
        />
        <div
          className="absolute -top-full right-[20%] w-[220px] h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(90deg, transparent, rgba(34,197,94,0.035), transparent)",
          }}
        />
        <div
          className="absolute -top-full left-[30%] w-px h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(180deg, transparent 10%, rgba(34,197,94,0.20) 50%, transparent 90%)",
          }}
        />
        <div
          className="absolute -top-full right-[35%] w-px h-[300%]"
          style={{
            transform: "rotate(-38deg)",
            background:
              "linear-gradient(180deg, transparent 15%, rgba(34,197,94,0.12) 50%, transparent 85%)",
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
            Privacy Policy
          </h1>

          <p className="text-text-muted text-sm">
            Effective Date: April 9, 2026
          </p>
        </FadeIn>

        <div className="h-px w-full bg-border-theme mb-12" />

        {/* Policy sections */}
        <div className="space-y-16">
          <FadeIn delay={0.05} className="space-y-4">
            <h2 className="text-sm text-text-faint tracking-[0.35em]">
              INTRODUCTION
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <p className="text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              SnapShift is a personal schedule management app that lets you
              upload screenshots of work schedules and automatically extracts
              shift information into a unified calendar view. This Privacy Policy
              explains what information the app handles and how.
            </p>
          </FadeIn>

          <FadeIn delay={0.1} className="space-y-4">
            <h2 className="text-sm text-text-faint tracking-[0.35em]">
              INFORMATION WE DO NOT COLLECT
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <p className="text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              SnapShift does not collect, store, or transmit any personal
              information about you, your identity, your location, your
              contacts, or your device. The app does not include analytics,
              advertising, or user tracking of any kind. We do not operate any
              server that stores your data.
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="space-y-4">
            <h2 className="text-sm text-text-faint tracking-[0.35em]">
              INFORMATION STORED ON YOUR DEVICE
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <div className="space-y-4 text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              <p>
                All schedule events you create or import — including shift
                times, event titles, and categories — are stored exclusively on
                your device in local app storage. This data does not leave your
                device, is not synced to any server we control, and is not
                accessible to us or any other party.
              </p>
              <p>
                When you delete the app, all stored schedule data is deleted
                with it.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.2} className="space-y-4">
            <h2 className="text-sm text-text-faint tracking-[0.35em]">
              THIRD-PARTY SERVICES
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <div className="space-y-4 text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              <p>
                SnapShift uses one third-party service in order to function:
              </p>
              <p>
                <span className="font-semibold">
                  OCR.space (text recognition).
                </span>{" "}
                When you upload or take a photo of a schedule, the image is
                transmitted to OCR.space&apos;s servers so their optical
                character recognition system can extract the text from it. The
                image and extracted text are processed by OCR.space according to
                their own privacy policy, which is available on their website at{" "}
                <a
                  href="https://ocr.space"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:text-accent-hover transition-colors"
                >
                  ocr.space
                </a>
                . SnapShift does not retain or share copies of these images on
                any server we control.
              </p>
              <p>
                By uploading a schedule screenshot, you consent to the image
                being processed by OCR.space for the purpose of text extraction.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.25} className="space-y-4">
            <h2 className="text-sm text-text-faint tracking-[0.35em]">
              HOW THE APP USES PHOTOS AND THE CAMERA
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <p className="text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              If you grant SnapShift permission to use your camera or photo
              library, it uses that access exclusively to let you select or
              capture schedule screenshots for upload. The app does not browse,
              read, or transmit any other photos from your library, and it does
              not save photos back to your library.
            </p>
          </FadeIn>

          <FadeIn delay={0.3} className="space-y-4">
            <h2 className="text-sm text-text-faint tracking-[0.35em]">
              CHILDREN&apos;S PRIVACY
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <p className="text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              SnapShift is not directed to children under the age of 13, and we
              do not knowingly collect any information from children under 13. If
              you believe a child has provided information through the app,
              please contact us so we can address it.
            </p>
          </FadeIn>

          <FadeIn delay={0.35} className="space-y-4">
            <h2 className="text-sm text-text-faint tracking-[0.35em]">
              CHANGES TO THIS POLICY
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <p className="text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              We may update this Privacy Policy from time to time. Any changes
              will be posted at this URL with an updated effective date at the
              top of this document. Continued use of the app after a change
              constitutes acceptance of the updated policy.
            </p>
          </FadeIn>

          <FadeIn delay={0.4} className="space-y-4">
            <h2 className="text-sm text-text-faint tracking-[0.35em]">
              CONTACT
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <p className="text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              If you have any questions about this Privacy Policy, you can reach
              the developer at:
            </p>
            <p className="text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              Ryder Tetreault
              <br />
              <a
                href="mailto:rydertetreault@gmail.com"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                rydertetreault@gmail.com
              </a>
            </p>
          </FadeIn>
        </div>

        {/* Footer */}
        <div className="mt-24 pt-8 border-t border-border-theme">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-text-faint hover:text-accent transition-colors"
          >
            <ArrowLeft size={16} />
            Back to all projects
          </Link>
        </div>
      </div>
    </main>
  );
}
