import { fetchGitHubRepos } from "@/lib/github";
import HomeShell from "@/components/HomeShell";

export default async function Home() {
  const repos = await fetchGitHubRepos();
  return (
    <>
      {/* Client shell coordinates the auto-play intro (hands → face scan)
          with the real homepage. The intro provides its own bottom-30%
          ASCII pattern derived from hand.jpg; no ambient waveform. */}
      <HomeShell repos={repos} />
    </>
  );
}
