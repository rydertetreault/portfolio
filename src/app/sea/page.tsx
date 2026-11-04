import type { Metadata } from "next";
import SeaExperience from "@/components/sea/SeaExperience";

export const metadata: Metadata = {
  title: "Ryder Tetreault | The Sea (prototype)",
  robots: { index: false, follow: false },
};

export default function SeaPage() {
  return <SeaExperience />;
}
