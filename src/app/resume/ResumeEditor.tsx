"use client";

import { useEffect, useState } from "react";
import TerminalPrint from "@/components/ascii-ui/TerminalPrint";
import type { CodeLine, Tok } from "./source";
import { experience, projects, cyber, skills } from "./data";

/**
 * Editor window with two views, like VS Code's Markdown preview:
 *   • source  — resume.ts, typed out character by character
 *   • preview — the rendered, readable résumé (Ctrl/Cmd+Shift+V)
 * The source view stays mounted while previewing so its typing state persists.
 */
export default function ResumeEditor({ lines }: { lines: CodeLine[] }) {
  const [view, setView] = useState<"source" | "preview">("source");

  const visible = lines;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        setView((v) => (v === "source" ? "preview" : "source"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const preview = view === "preview";

  return (
    <div data-ascii-quiet="0.96" className="term-window font-mono text-[12px]">
      {/* ── title bar / tabs ── */}
      <div className="term-bar">
        <div className="term-dots" aria-hidden>
          <span /><span /><span />
        </div>
        <button
          type="button"
          onClick={() => setView("source")}
          className={`term-tab cursor-pointer ${preview ? "opacity-60 hover:opacity-100" : ""}`}
          aria-pressed={!preview}
        >
          <span className="text-accent">TS</span>
          <span>resume.ts</span>
          {!preview && <span className="text-text-faint">●</span>}
        </button>
        <button
          type="button"
          onClick={() => setView("preview")}
          className={`term-tab -ml-px cursor-pointer ${preview ? "" : "opacity-60 hover:opacity-100"}`}
          aria-pressed={preview}
        >
          <span className="text-accent">MD</span>
          <span>preview resume.md</span>
          {preview && <span className="text-text-faint">●</span>}
        </button>
        <button
          type="button"
          onClick={() => setView((v) => (v === "source" ? "preview" : "source"))}
          className="ml-auto hidden items-center gap-2 text-text-faint transition-colors hover:text-accent sm:inline-flex cursor-pointer"
          title="Toggle preview (Ctrl+Shift+V)"
        >
          <span>{preview ? "open source" : "open preview"}</span>
          <kbd className="rounded-sm border border-border-theme px-1.5 py-0.5 text-[10px] tracking-wider">⌃⇧V</kbd>
        </button>
      </div>

      {/* ── source ── */}
      <div className={`px-5 py-6 sm:px-8 sm:py-8 ${preview ? "hidden" : ""}`}>
        <TerminalPrint
          charsPerSecond={1200}
          linePauseMs={16}
          typeLines={12}
          streamLinesPerSecond={40}
          maxDurationMs={1150}
          className="tp-transcript -mx-5 pl-14 pr-5 font-mono text-[13px] leading-7 text-foreground/90 sm:-mx-8 sm:pl-16 sm:pr-8 sm:text-[13.5px]"
        >
          {visible.map((l, i) => (
            <div key={i} data-line {...(l.progress ? { "data-progress": true } : {})}>
              {Array.from({ length: l.depth }, (_, g) => (
                <span key={g} className="tp-guide" aria-hidden />
              ))}
              <span className="tp-code">
                {l.toks.length === 0 ? "\u00a0" : l.toks.map((t, j) => <Token key={j} tok={t} />)}
                {l.progress && (
                  <>
                    <span data-progress-dots className="tok-comment">............</span>{" "}
                    <span data-progress-ok className="text-accent">ok</span>
                  </>
                )}
              </span>
            </div>
          ))}
          <div data-line>
            <span className="tp-code">
              <span className="text-accent">$</span>
              <span className="ml-2 inline-block h-3.5 w-[8px] translate-y-[2px] bg-accent/90 animate-caret" />
            </span>
          </div>
        </TerminalPrint>
      </div>

      {/* ── preview (rendered markdown) ── */}
      {preview && <Preview />}

      {/* ── status bar ── */}
      <div className="term-status text-[11px] uppercase tracking-[0.18em]">
        {preview ? (
          <span>
            <span className="text-accent">●</span> markdown preview
          </span>
        ) : (
          <span className="tp-status">
            <span className="text-accent">●</span>
            <span className="tp-status-ready"> ready</span>
            <span className="tp-status-typing"> typing… click to skip</span>
          </span>
        )}
        <span>{preview ? "resume.md" : `${visible.length + 1} lines`}</span>
        <span>{preview ? "rendered" : "typescript"}</span>
        <span>utf-8</span>
        <span className="ml-auto normal-case tracking-normal">
          <span className="text-accent">$</span> ryder --open resume
        </span>
      </div>
    </div>
  );
}

function Token({ tok }: { tok: Tok }) {
  const cls = tok.t === "plain" ? "" : `tok-${tok.t}`;
  if (tok.href) {
    const ext = /^https?:/.test(tok.href);
    return (
      <a
        href={tok.href}
        {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}
        className={`${cls} underline decoration-current/30 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent`}
      >
        {tok.v}
      </a>
    );
  }
  return <span className={cls}>{tok.v}</span>;
}

/* ─── rendered preview, styled like VS Code's markdown preview ─── */

function Preview() {
  return (
    <article className="md-preview px-6 py-8 sm:px-12 sm:py-10">
      <h1>Ryder Tetreault</h1>
      <p className="md-lead">Software Developer · Augusta, GA</p>
      <p className="md-contact">
        <a href="tel:+17066276492">(706) 627-6492</a>
        <span>·</span>
        <a href="mailto:rydertetreault@gmail.com">rydertetreault@gmail.com</a>
        <span>·</span>
        <a href="https://rydertetreault.dev" target="_blank" rel="noreferrer">rydertetreault.dev</a>
        <span>·</span>
        <a href="https://github.com/rydertetreault" target="_blank" rel="noreferrer">github.com/rydertetreault</a>
      </p>

      <h2>Education</h2>
      <ul>
        <li>
          <strong>Bachelor of Computer Science and Software Engineering</strong> — Auburn University
          <em>December 2025</em>
        </li>
        <li>
          <strong>Certification in Cyber Defense</strong> — Auburn University
          <em>May 2026</em>
        </li>
      </ul>

      <h2>Experience</h2>
      {experience.map((e) => (
        <section key={e.company}>
          <h3>
            {e.role} <span className="md-at">@ {e.company}</span>
            <em>
              {e.date} · {e.location}
            </em>
          </h3>
          <ul>
            {e.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      ))}

      <h2>Projects</h2>
      {projects.map((p) => (
        <section key={p.name}>
          <h3>
            {p.name}
            {p.link && (
              <>
                {" "}
                <a href={p.href ?? `https://${p.link}`} target="_blank" rel="noreferrer" className="md-at">
                  ↗ {p.link}
                </a>
              </>
            )}
            <em>{p.date}</em>
          </h3>
          <p className="md-context">{p.context}</p>
          <ul>
            {p.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      ))}

      <h2>Cybersecurity</h2>
      <section>
        <h3>
          {cyber.title} <span className="md-at">@ {cyber.context}</span>
          <em>{cyber.date}</em>
        </h3>
        <ul>
          {cyber.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </section>

      <h2>Skills</h2>
      <table>
        <tbody>
          {skills.map((s) => (
            <tr key={s.label}>
              <th>{s.label}</th>
              <td>{s.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
