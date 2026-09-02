import { buildLines } from "./source";
import ResumeEditor from "./ResumeEditor";
import "@/components/ascii-ui/terminal.css";
import "./resume-code.css";

export default function ResumePage() {
  const lines = buildLines();
  return (
    <main data-ascii-decode className="relative z-10 min-h-screen text-foreground">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-8 lg:px-10 pt-24 pb-20 sm:pt-28">
        <ResumeEditor lines={lines} />
      </div>
    </main>
  );
}
