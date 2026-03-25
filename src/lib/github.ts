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
};

const GITHUB_USERNAME = "rydertetreault";

/** Local overrides for GitHub repo fields (keyed by repo name) */
const repoOverrides: Record<string, Partial<GitHubRepo>> = {
  "bardownski-website": {
    description:
      "A hockey team website with match results, player stats, roster management, game highlights, records, news, and a media gallery. Built for tracking seasons and showcasing the team.",
  },
};

/** Non-GitHub projects to include alongside repos */
const manualProjects: GitHubRepo[] = [
  {
    name: "analytics-api",
    description:
      "Frontend design for the Be Here Now Network's internal analytics dashboard. Built the UI for visualizing Google Analytics 4 site metrics and YouTube channel analytics in a unified reporting platform.",
    html_url: "",
    homepage: null,
    language: "TypeScript",
    topics: ["analytics", "google-analytics", "youtube", "dashboard", "maha-media"],
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

export async function fetchGitHubRepos(): Promise<GitHubRepo[]> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=pushed&per_page=100`,
    {
      headers,
      next: { revalidate: 3600 },
    }
  );

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
    }));

  return [...filtered, ...manualProjects].sort(
    (a, b) =>
      new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
  );
}
