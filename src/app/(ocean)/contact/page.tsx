import type { Metadata } from "next";
import ShadeBox from "@/components/ocean/ShadeBox";
import { ContactBox } from "@/components/ocean/boxes";

export const metadata: Metadata = { title: "Contact | Ryder Tetreault" };

export default function ContactPage() {
  return (
    <ShadeBox path="~/contact">
      <ContactBox />
    </ShadeBox>
  );
}
