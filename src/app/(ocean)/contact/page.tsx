import type { Metadata } from "next";
import WaveBox from "@/components/ocean/WaveBox";
import { ContactDetails } from "@/components/ocean/stops";

export const metadata: Metadata = { title: "Contact | Ryder Tetreault" };

export default function ContactPage() {
  return (
    <WaveBox path="~/contact">
      <ContactDetails />
    </WaveBox>
  );
}
