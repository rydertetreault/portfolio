import type { Metadata } from "next";
import { buildLines } from "@/app/(ocean)/resume/source";
import ResumeEditor from "@/app/(ocean)/resume/ResumeEditor";
import "@/components/ascii-ui/terminal.css";
import "@/app/(ocean)/resume/resume-code.css";

export const metadata: Metadata = { title: "Resume | Ryder Tetreault" };

/** The live site's resume page, as a full page (the ocean shows it as a lightbox). */
export default function ClassicResumePage() {
  const lines = buildLines();
  return (
    <main data-ascii-decode className="relative z-10 min-h-screen text-foreground">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-8 lg:px-10 pt-24 pb-20 sm:pt-28">
        <ResumeEditor lines={lines} />
      </div>
    </main>
  );
}
