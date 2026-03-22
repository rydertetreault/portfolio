import { fetchGitHubRepos } from "@/lib/github";
import HomeContent from "@/components/HomeContent";

export default async function Home() {
  const repos = await fetchGitHubRepos();
  return <HomeContent repos={repos} />;
}
