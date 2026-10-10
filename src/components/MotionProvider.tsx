"use client";

import { MotionConfig } from "framer-motion";
import { useReducedMotionPref } from "@/lib/motion";

/** Applies the site motion preference to every framer-motion animation. */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotionPref();
  return <MotionConfig reducedMotion={reduce ? "always" : "never"}>{children}</MotionConfig>;
}
