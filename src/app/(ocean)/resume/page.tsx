import type { Metadata } from "next";
import WaveBox from "@/components/ocean/WaveBox";
import { buildLines } from "./source";
import ResumeEditor from "./ResumeEditor";
import "@/components/ascii-ui/terminal.css";
import "./resume-code.css";

export const metadata: Metadata = { title: "Resume | Ryder Tetreault" };

export default function ResumePage() {
  const lines = buildLines();
  return (
    <WaveBox path="~/resume">
      <div className="py-4">
        <ResumeEditor lines={lines} />
      </div>
    </WaveBox>
  );
}
