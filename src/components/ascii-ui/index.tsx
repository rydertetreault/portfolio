import type { ReactNode } from "react";

/** Four small `+` marks in the corners of a positioned parent — ASCII "bracket" frame. */
export function Corners({ className = "" }: { className?: string }) {
  const base = `pointer-events-none absolute select-none font-mono text-[11px] leading-none text-text-faint ${className}`;
  return (
    <>
      <span aria-hidden className={`${base} left-1.5 top-1`}>+</span>
      <span aria-hidden className={`${base} right-1.5 top-1`}>+</span>
      <span aria-hidden className={`${base} left-1.5 bottom-1`}>+</span>
      <span aria-hidden className={`${base} right-1.5 bottom-1`}>+</span>
    </>
  );
}

/**
 * Frosted panel that sits over the ASCII field. Tagged `data-ascii-quiet` so the
 * field dims behind it; a light tint + hairline border + corner marks do the rest.
 */
export function Panel({
  children,
  className = "",
  quiet = 0.7,
  corners = true,
}: {
  children: ReactNode;
  className?: string;
  /** How strongly the field dims behind this panel (0..1). */
  quiet?: number;
  corners?: boolean;
}) {
  return (
    <div
      data-ascii-quiet={quiet}
      className={`relative border border-border-theme/60 bg-background/45 backdrop-blur-[0.5px] ${className}`}
    >
      {corners && <Corners />}
      {children}
    </div>
  );
}

/** Mono `// 01 TITLE ───` section heading. */
export function SectionLabel({
  n,
  title,
  icon,
  className = "",
}: {
  n?: string;
  title: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {icon && <span className="text-accent">{icon}</span>}
      <h2 className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-text-faint">
        {n && <span className="text-accent">{n}</span>}
        <span className="text-border-theme">{"//"}</span>
        {title}
      </h2>
      <div className="h-px flex-1 bg-border-theme" />
    </div>
  );
}

/** Terminal-style prompt line: `$ command` with a blinking caret. */
export function Prompt({ command, className = "" }: { command: string; className?: string }) {
  return (
    <p className={`font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint ${className}`}>
      <span className="text-accent">$</span> {command}
      <span className="ml-2 inline-block h-3 w-[7px] translate-y-[2px] bg-accent/80 animate-caret" />
    </p>
  );
}
