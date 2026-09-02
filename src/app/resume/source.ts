import { experience, projects, cyber, skills } from "./data";

/* ─────────────────────────────────────────────────────────────
   The résumé is rendered as a typed object literal — the "source"
   the terminal executes — with syntax highlighting and indent guides.
   ───────────────────────────────────────────────────────────── */

export type Tok = {
  t: "kw" | "type" | "fn" | "str" | "prop" | "prop2" | "punc" | "comment" | "num" | "plain" | "section" | "rule";
  v: string;
  href?: string;
};
export type CodeLine = {
  depth: number;
  toks: Tok[];
  progress?: boolean;
  /** This line opens a foldable region (its id + item count). */
  foldStart?: { id: string; count: number };
  /** This line belongs to a foldable region (hidden when folded). */
  foldOf?: string;
  /** This line closes a foldable region (hidden when folded). */
  foldEnd?: string;
};

let foldSeq = 0;

const kw = (v: string): Tok => ({ t: "kw", v });
const ty = (v: string): Tok => ({ t: "type", v });
const fn = (v: string): Tok => ({ t: "fn", v });
const str = (v: string, href?: string): Tok => ({ t: "str", v: `"${v}"`, href });
/** Top-level section keys are blue; nested keys stay quiet grey so the values read first. */
const prop = (v: string, depth: number): Tok => ({
  t: depth <= 1 ? "prop" : "prop2",
  v: /^[A-Za-z_$][\w$]*$/.test(v) ? v : `"${v}"`, // quote keys that aren't identifiers
});
const punc = (v: string): Tok => ({ t: "punc", v });
const comment = (v: string): Tok => ({ t: "comment", v });
const plain = (v: string): Tok => ({ t: "plain", v });
const SP: Tok = plain(" ");

type Val = string | number | Val[] | { [k: string]: Val } | { __link: string; text: string };

function isLink(v: Val): v is { __link: string; text: string } {
  return typeof v === "object" && v !== null && !Array.isArray(v) && "__link" in v;
}

/** Max characters per line before something is split across lines. */
const WIDTH = 124;
const tokLen = (toks: Tok[]) => toks.reduce((n, t) => n + t.v.length, 0);

/** Tokens for a value on a single line, or null if it can't (or shouldn't) be inlined. */
function inlineToks(value: Val, depth: number, budget: number): Tok[] | null {
  let toks: Tok[];
  if (typeof value === "string") toks = [str(value)];
  else if (typeof value === "number") toks = [{ t: "num", v: String(value) }];
  else if (isLink(value)) toks = [str(value.text, value.__link)];
  else if (Array.isArray(value)) {
    toks = [punc("["), SP];
    for (const [i, item] of value.entries()) {
      const it = inlineToks(item, depth, budget);
      if (!it || typeof item === "object" && !isLink(item)) return null; // arrays of objects never inline
      toks.push(...it);
      if (i < value.length - 1) toks.push(punc(","), SP);
    }
    toks.push(SP, punc("]"));
  } else {
    toks = [punc("{"), SP];
    const entries = Object.entries(value);
    for (const [i, [k, v]] of entries.entries()) {
      const it = inlineToks(v, depth + 1, budget);
      if (!it || Array.isArray(v)) return null; // objects with array fields get the multi-line form
      toks.push(prop(k, depth + 1), punc(":"), SP, ...it);
      if (i < entries.length - 1) toks.push(punc(","), SP);
    }
    toks.push(SP, punc("}"));
  }
  return tokLen(toks) <= budget ? toks : null;
}

/**
 * Pretty-print a value as highlighted code lines. Short values are kept on one
 * line; objects put their scalar fields on the opening line and only long
 * arrays (highlights) get one item per line.
 */
function emit(lines: CodeLine[], value: Val, depth: number, prefix: Tok[], suffix: Tok[]): void {
  const budget = WIDTH - depth * 2 - tokLen(prefix) - tokLen(suffix);
  const inl = inlineToks(value, depth, budget);
  if (inl) {
    lines.push({ depth, toks: [...prefix, ...inl, ...suffix] });
    return;
  }
  if (typeof value === "string" || typeof value === "number" || isLink(value)) {
    // Too long to fit the budget: still one line (it wraps in the editor).
    const t = typeof value === "string" ? str(value) : typeof value === "number" ? { t: "num" as const, v: String(value) } : str(value.text, value.__link);
    lines.push({ depth, toks: [...prefix, t, ...suffix] });
  } else if (Array.isArray(value)) {
    // Long arrays of prose (highlights) are foldable, like an editor's code folding.
    const prose = value.every((v) => typeof v === "string") && value.reduce((n, v) => n + (v as string).length, 0) > 120;
    const id = prose ? `fold-${foldSeq++}` : undefined;
    lines.push({ depth, toks: [...prefix, punc("[")], ...(id ? { foldStart: { id, count: value.length } } : {}) });
    const start = lines.length;
    for (const item of value) emit(lines, item, depth + 1, [], [punc(",")]);
    if (id) for (let i = start; i < lines.length; i++) lines[i].foldOf = id;
    lines.push({ depth, toks: [punc("]"), ...suffix], ...(id ? { foldEnd: id } : {}) });
  } else {
    const entries = Object.entries(value);
    const scalars = entries.filter(([, v]) => !Array.isArray(v) && (typeof v !== "object" || isLink(v)));
    const rest = entries.filter(([k]) => !scalars.some(([sk]) => sk === k));
    // Opening line carries the scalar fields if they fit.
    const head: Tok[] = [...prefix, punc("{")];
    const inlineScalars: Tok[] = [];
    for (const [i, [k, v]] of scalars.entries()) {
      inlineScalars.push(SP, prop(k, depth + 1), punc(":"), SP, ...(inlineToks(v, depth + 1, Infinity) ?? [str(String(v))]), punc(","));
      if (i === scalars.length - 1) inlineScalars.pop();
    }
    if (scalars.length && tokLen(head) + tokLen(inlineScalars) + 1 <= WIDTH - depth * 2) {
      lines.push({ depth, toks: [...head, ...inlineScalars, punc(",")] });
    } else {
      lines.push({ depth, toks: head });
      for (const [k, v] of scalars) emit(lines, v, depth + 1, [prop(k, depth + 1), punc(":"), SP], [punc(",")]);
    }
    for (const [k, v] of rest) emit(lines, v, depth + 1, [prop(k, depth + 1), punc(":"), SP], [punc(",")]);
    lines.push({ depth, toks: [punc("}"), ...suffix] });
  }
}

export function buildLines(): CodeLine[] {
  foldSeq = 0;
  const lines: CodeLine[] = [];
  lines.push({ depth: 0, toks: [comment("// $ ryder --open resume")] });
  lines.push({ depth: 0, toks: [comment("// > resolving profile ............ ok")] });
  lines.push({ depth: 0, toks: [comment("// > rendering /resume ")], progress: true });
  lines.push({ depth: 0, toks: [] });
  lines.push({ depth: 0, toks: [kw("import"), SP, punc("{"), SP, ty("Resume"), SP, punc("}"), SP, kw("from"), SP, str("@/lib/types"), punc(";")] });
  lines.push({ depth: 0, toks: [] });
  lines.push({ depth: 0, toks: [kw("export"), SP, kw("const"), SP, plain("resume"), punc(":"), SP, ty("Resume"), SP, punc("="), SP, punc("{")] });

  const data: { [k: string]: Val } = {
    name: "Ryder Tetreault",
    title: "Software Developer",
    location: "Augusta, GA",
    contact: {
      phone: { __link: "tel:+17066276492", text: "(706) 627-6492" },
      email: { __link: "mailto:rydertetreault@gmail.com", text: "rydertetreault@gmail.com" },
      web: { __link: "https://rydertetreault.dev", text: "rydertetreault.dev" },
      github: { __link: "https://github.com/rydertetreault", text: "github.com/rydertetreault" },
    },
    education: [
      { degree: "Bachelor of Computer Science and Software Engineering", school: "Auburn University", date: "December 2025" },
      { degree: "Certification in Cyber Defense", school: "Auburn University", date: "May 2026" },
    ],
    experience: experience.map((e) => ({
      role: e.role,
      company: e.company,
      date: e.date,
      location: e.location,
      highlights: e.bullets,
    })),
    projects: projects.map((p) => ({
      name: p.name,
      date: p.date,
      context: p.context,
      ...(p.link ? { link: { __link: p.href ?? `https://${p.link}`, text: p.link } } : {}),
      highlights: p.bullets,
    })),
    cybersecurity: { title: cyber.title, context: cyber.context, date: cyber.date, highlights: cyber.bullets },
    skills: Object.fromEntries(skills.map((s) => [s.label, s.value.split(", ")])),
  };
  // Commented-out dividers split the file into sections.
  const divider = (n: string, title: string) => {
    const label = `${n} · ${title.toUpperCase()}`;
    lines.push({ depth: 1, toks: [] });
    lines.push({
      depth: 1,
      toks: [comment("// "), { t: "rule", v: "─── " }, { t: "section", v: label }, { t: "rule", v: " " + "─".repeat(Math.max(8, 60 - label.length)) }],
    });
  };
  const sections: [string, string, string[]][] = [
    ["00", "identity", ["name", "title", "location", "contact"]],
    ["01", "education", ["education"]],
    ["02", "experience", ["experience"]],
    ["03", "projects", ["projects"]],
    ["04", "cybersecurity", ["cybersecurity"]],
    ["05", "skills", ["skills"]],
  ];
  for (const [n, title, keys] of sections) {
    divider(n, title);
    for (const k of keys) emit(lines, data[k], 1, [prop(k, 1), punc(":"), SP], [punc(",")]);
  }
  lines.push({ depth: 0, toks: [punc("}"), punc(";")] });
  lines.push({ depth: 0, toks: [] });
  lines.push({ depth: 0, toks: [kw("export"), SP, kw("default"), SP, kw("function"), SP, fn("main"), punc("()"), punc(":"), SP, ty("void"), SP, punc("{")] });
  lines.push({ depth: 1, toks: [fn("render"), punc("("), plain("resume"), punc(")"), punc(";")] });
  lines.push({ depth: 0, toks: [punc("}")] });
  return lines;
}
