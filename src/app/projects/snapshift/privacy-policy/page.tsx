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
            Privacy Policy
          </h1>

          <p className="text-text-muted text-sm">
            Effective Date: May 18, 2026
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
              database that retains your schedule data.
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="space-y-4">
            <h2 className="text-sm text-text-faint tracking-[0.35em]">
              INFORMATION STORED ON YOUR DEVICE
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <div className="space-y-4 text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              <p>
                All schedule events you create or import (including shift
                times, event titles, and categories) are stored exclusively on
                your device in local app storage. This data does not leave your
                device, is not synced to any server we control, and is not
                accessible to us or any other party.
              </p>
              <p>
                If you grant SnapShift access to your iPhone Calendar, events
                read from your selected calendars are likewise stored only on
                your device. They are never transmitted off the device.
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
                SnapShift uses three third-party services to provide its core
                features:
              </p>
              <p>
                <span className="font-semibold">
                  OCR.space (text recognition).
                </span>{" "}
                When you upload or take a photo of a schedule, the image is
                first sent to OCR.space&apos;s servers so their optical
                character recognition system can extract the text from it. The
                image and extracted text are processed by OCR.space according to
                their own privacy policy, available at{" "}
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
                <span className="font-semibold">
                  Google Gemini API (AI-assisted reading).
                </span>{" "}
                If our local parser cannot recognize a schedule&apos;s format,
                the image is forwarded to Google&apos;s Gemini API for reading.
                We send only the image and a short prompt. The image is not
                retained by SnapShift after the response is returned.
                Google&apos;s data handling for Gemini API requests is governed
                by their published policies.
              </p>
              <p>
                <span className="font-semibold">
                  Resend (optional screenshot reports).
                </span>{" "}
                When parsing fails entirely, you can tap &quot;Send screenshot
                to improve&quot; to email the image to the developer for review.
                We use Resend to deliver these emails. Reports are retained only
                as long as needed for triage, then deleted.
              </p>
              <p>
                By using these features, you consent to the corresponding image
                transmissions for the purpose of text extraction.
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

          <FadeIn delay={0.275} className="space-y-4">
            <h2 className="text-sm text-text-faint tracking-[0.35em]">
              IPHONE CALENDAR ACCESS
            </h2>
            <div className="h-px w-full bg-border-theme" />
            <div className="space-y-4 text-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
              <p>
                If you grant SnapShift access to your iPhone Calendar in
                Settings, the app reads events from the calendars you select.
                These events stay on your device and are never sent anywhere.
              </p>
              <p>
                If you also enable &quot;Save SnapShift events to iPhone
                Calendar,&quot; SnapShift creates a dedicated calendar named
                &quot;SnapShift&quot; in the iPhone Calendar app and writes
                shifts and events there. You can delete that calendar at any
                time from the iPhone Calendar app to remove all SnapShift
                entries, or revoke calendar access entirely from iPhone Settings
                under SnapShift.
              </p>
            </div>
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
