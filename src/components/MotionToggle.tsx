"use client";

import { Pause, Play } from "lucide-react";
import { setReducedMotion, useReducedMotionPref } from "@/lib/motion";

/** Nav button: turn all site animation off / back on (remembered per visitor). */
export default function MotionToggle({ className = "" }: { className?: string }) {
  const reduce = useReducedMotionPref();
  const label = reduce ? "Turn motion on" : "Turn motion off";

  return (
    <button
      onClick={() => setReducedMotion(!reduce)}
      className={`transition-colors cursor-pointer ${className}`}
      aria-label={label}
      aria-pressed={reduce}
      title={label}
    >
      {reduce ? <Play size={15} /> : <Pause size={15} />}
    </button>
  );
}
