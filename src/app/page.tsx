import { fetchGitHubRepos } from "@/lib/github";
import HomeContent from "@/components/HomeContent";
import ScrollStory from "@/components/ScrollStory";

export default async function Home() {
  const repos = await fetchGitHubRepos();
  return (
    <>
      {/* Pinned scroll-scrubbed intro timeline — ends by releasing into the site */}
      <ScrollStory />
      <HomeContent repos={repos} />
    </>
  );
}
