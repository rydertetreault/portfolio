import type { Metadata } from "next";
import ShadeBox from "@/components/ocean/ShadeBox";
import { ResumeBox } from "@/components/ocean/boxes";

export const metadata: Metadata = { title: "Resume | Ryder Tetreault" };

export default function ResumePage() {
  return (
    <ShadeBox path="~/resume">
      <ResumeBox />
    </ShadeBox>
  );
}
