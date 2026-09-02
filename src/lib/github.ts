export type ProjectCategory = "Personal" | "Professional";

export type GitHubRepo = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  created_at: string;
  pushed_at: string;
  // --- Local enrichment fields ---
  category?: ProjectCategory;
  longDescription?: string;
  subtitle?: string;
  screenshots?: string[];
  appStore?: string;
  private?: boolean;
};

const GITHUB_USERNAME = "rydertetreault";

/** Local overrides for GitHub repo fields (keyed by repo name) */
const repoOverrides: Record<string, Partial<GitHubRepo>> = {
  "fantasy-draft-assistant": {
    description:
      "A live ESPN fantasy-football draft operator that watches the draft board, ranks available players from real projections and ADP, and recommends picks under the 90-second clock.",
    longDescription:
      "Fantasy Draft Assistant runs alongside a live ESPN draft. It observes the board as picks come in, re-ranks the remaining players from ESPN projections and average draft position, and surfaces a recommendation before the 90-second timer runs out. With an explicit, session-bound grant it can also submit the pick itself.\n\nIt is built fail-closed: only exact allowlisted teams can ever be acted on, and stale state, an unknown identity, or a missing confirmation halts the operator rather than guessing.",
  },
  "bardownski-website": {
    longDescription:
      "Bardownski is a full-stack site for a hockey club, built with Next.js and TypeScript. It tracks the season end to end: live match results, player statistics, roster management, records, news, highlight integration, and a media gallery.\n\nThe goal was a single place the team and its supporters could follow a season as it happens, with content the club can maintain itself.",
    description:
      "A hockey team website with match results, player stats, roster management, game highlights, records, news, and a media gallery. Built for tracking seasons and showcasing the team.",
  },
  SnapShift: {
    description:
      "An iOS app that turns a photo of your work schedule into a calendar using on-device OCR. All data stays on your device.",
    longDescription:
      "SnapShift is an iOS app I designed, built, and shipped to the App Store. Take or upload a photo of your work schedule and it extracts your shifts using on-device OCR, then drops them straight into a clean calendar view.\n\nNo accounts, no cloud sync, no analytics. Every event is stored locally on your device. The app is built around the idea that something as personal as your weekly schedule shouldn't require signing up for anything or handing your data to a server.",
    topics: ["ios", "swift", "ocr", "schedule", "mobile"],
    homepage: null,
    appStore:
      "https://apps.apple.com/us/app/snapshift-schedule-scanner/id6769178607",
    screenshots: [
      "/projects/snapshift/01.png",
      "/projects/snapshift/02.png",
      "/projects/snapshift/03.png",
      "/projects/snapshift/04.png",
      "/projects/snapshift/05.png",
    ],
  },
  "JRP-Bot": {
    description:
      "A Discord bot that acts as judge, oracle, and community enforcer, with real sentencing, jail time, an appeals system, and personality-driven interactions.",
    longDescription:
      "A Discord community I'm part of needed automated moderation, entertainment, and governance enforcement that felt unique and engaging rather than generic.\n\nBuilt with Discord.js and Node.js. Implemented a custom sentencing system with jail time, appeals processes, and community leaderboards. Added oracle-style question answering and personality-driven interactions.\n\nThe result is an active, engaging community bot that handles moderation, entertainment, and governance in a way that keeps users engaged and the community self-regulating.",
    screenshots: ["/projects/jrp-bot/01.png"],
  },
};

/** Categorize specific GitHub repos. Defaults to "Personal" when not listed. */
const categoryOverrides: Record<string, ProjectCategory> = {
  // (empty for now. All current GitHub repos default to Personal.
  // Add entries here later if any GH-sourced repo should be Professional.)
};

/** Non-GitHub projects to include alongside repos */
const manualProjects: GitHubRepo[] = [
  {
    name: "media-library",
    subtitle: "Maha Media · Ram Dass Love Serve Remember Foundation",
    description:
      "A custom digital media library giving a non-profit's team a single home for decades of archival audio, video, images, and documents, with AI-powered transcription, tagging, and semantic search.",
    longDescription:
      "A custom digital media library built for the Ram Dass Love Serve Remember Foundation to give their team a single home for decades of archival audio, video, images, and documents.\n\nUsers can browse and search the entire archive from a clean, gallery-style interface, filtering by type, collection, rights, or any custom tag the team cares about. Opening an asset reveals a rich detail view with a built-in player, auto-generated transcripts, thumbnails, and editable metadata. Behind the scenes, AI quietly handles the slow work: transcribing recordings, suggesting tags, extracting key topics and people, and making everything semantically searchable so staff can find a specific quote or moment in seconds rather than hours.\n\nAdmins get tools for managing users and teams, configuring metadata fields, tracking rights, organizing collections, and generating share links for collaborators outside the organization.\n\nMy role: Frontend developer and UI/UX designer. I designed the interface and built out most of the client-side experience.",
    category: "Professional",
    language: "TypeScript",
    topics: ["react", "typescript", "ui/ux", "ai", "archival", "media"],
    screenshots: ["/projects/media-library/cover.png"],
    private: true,
    html_url: "",
    homepage: null,
    stargazers_count: 0,
    forks_count: 0,
    fork: false,
    created_at: "2026-01-01T00:00:00Z",
    pushed_at: "2026-06-17T00:00:00Z",
  },
  {
    name: "analytics-api",
    subtitle: "Maha Media · Be Here Now Network",
    description:
      "Frontend design for the Be Here Now Network's internal analytics dashboard. Built the UI for visualizing Google Analytics 4 site metrics and YouTube channel analytics in a unified reporting platform.",
    longDescription:
      "An internal analytics dashboard I designed and built the frontend for at Maha Media for the Be Here Now Network. It pulls Google Analytics 4 site metrics together with YouTube channel analytics into a single, unified reporting platform so the team can see content performance, audience trends, and traffic in one place.\n\nMy role: Frontend developer. I designed the dashboard layout, built the data visualization components, and shaped how site and channel data are presented side by side.\n\nNumbers in the screenshots below are blurred to protect client data.",
    category: "Professional",
    screenshots: [
      "/projects/analytics-api/01.png",
      "/projects/analytics-api/02.png",
    ],
    private: true,
    html_url: "",
    homepage: null,
    language: "TypeScript",
    topics: ["analytics", "google analytics", "youtube", "dashboard", "maha media"],
    stargazers_count: 0,
    forks_count: 0,
    fork: false,
    created_at: "2026-01-01T00:00:00Z",
    pushed_at: "2026-03-22T00:00:00Z",
  },
];

export type GitHubStats = {
  totalRepos: number;
  totalCommits: number;
};

export async function fetchGitHubStats(): Promise<GitHubStats> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // Fetch repos for count
  const reposRes = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`,
    { headers, next: { revalidate: 3600 } }
  );

  if (!reposRes.ok) {
    return { totalRepos: 0, totalCommits: 0 };
  }

  const repos: GitHubRepo[] = await reposRes.json();
  const ownedRepos = repos.filter((r) => !r.fork);

  // Fetch commit counts in parallel (contributor stats for each repo)
  const commitCounts = await Promise.all(
    ownedRepos.map(async (repo) => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/contributors?per_page=1&anon=true`,
          { headers, next: { revalidate: 3600 } }
        );
        if (!res.ok) return 0;
        const contributors = await res.json();
        if (!Array.isArray(contributors)) return 0;
        const me = contributors.find(
          (c: { login?: string }) =>
            c.login?.toLowerCase() === GITHUB_USERNAME.toLowerCase()
        );
        return me?.contributions ?? 0;
      } catch {
        return 0;
      }
    })
  );

  return {
    totalRepos: ownedRepos.length,
    totalCommits: commitCounts.reduce((sum, c) => sum + c, 0),
  };
}

/** Strip markdown down to plain paragraphs and keep the README's intro (before the first `##`). */
function readmeExcerpt(md: string): string | null {
  const intro = md.split(/\n##\s/)[0];
  if (/bootstrapped with|create-next-app|create-react-app/i.test(intro)) return null;
  const text = intro
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*#.*$/gm, "")
    .replace(/^\s*>\s?.*$/gm, "")
    .replace(/^\s*\|.*$/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/[ \t]+/g, " ");
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter((p) => p.length > 40);
  if (paras.length === 0) return null;
  const out = paras.slice(0, 2).join("\n\n");
  return out.length >= 80 ? out.slice(0, 700) : null;
}

async function fetchReadmeExcerpt(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${name}/readme`, {
      headers: { Accept: "application/vnd.github.raw" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return readmeExcerpt(await res.text());
  } catch {
    return null;
  }
}

const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

/** Every project gets a "more" section: override → README intro → details from repo metadata. */
function detailsFallback(repo: GitHubRepo): string {
  const parts: string[] = [];
  if (repo.description) parts.push(repo.description);
  const meta: string[] = [];
  if (repo.language) meta.push(`Written primarily in ${repo.language}.`);
  meta.push(
    `Started ${MONTH.format(new Date(repo.created_at))}, last updated ${MONTH.format(new Date(repo.pushed_at))}.`,
  );
  if (repo.topics.length) meta.push(`Topics: ${repo.topics.join(", ")}.`);
  parts.push(meta.join(" "));
  return parts.join("\n\n");
}

export async function fetchGitHubRepos(): Promise<GitHubRepo[]> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=pushed&per_page=100`;
  let res = await fetch(url, { headers, next: { revalidate: 3600 } });

  // A revoked/expired token gets a 401; public repos don't need auth, so retry without it
  // rather than dropping every personal project from the site.
  if ((res.status === 401 || res.status === 403) && headers.Authorization) {
    console.warn("GitHub token rejected (" + res.status + "); retrying unauthenticated");
    res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
  }

  if (!res.ok) {
    console.error("Failed to fetch GitHub repos:", res.status);
    return [...manualProjects];
  }

  const repos: GitHubRepo[] = await res.json();

  const filtered = repos
    .filter((repo) => !repo.fork)
    .filter((repo) => !["portfolio", "rydertetreault"].includes(repo.name.toLowerCase()))
    .map((repo) => ({
      ...repo,
      ...repoOverrides[repo.name],
      category:
        categoryOverrides[repo.name] ??
        repoOverrides[repo.name]?.category ??
        "Personal",
    }));

  // Fill in long descriptions for anything the overrides don't cover.
  await Promise.all(
    filtered.map(async (repo) => {
      if (repo.longDescription) return;
      repo.longDescription = (await fetchReadmeExcerpt(repo.name)) ?? detailsFallback(repo);
    }),
  );

  return [...filtered, ...manualProjects].sort(
    (a, b) =>
      new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
  );
}
