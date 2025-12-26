import { GITHUB_URL_PATTERNS } from "@/constants/regex";
import type { GitHubRepoInfo } from "@/types/integrations";

export function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  const trimmed = url.trim();

  for (const pattern of GITHUB_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const owner = match[1];
      const repo = match[2];
      return {
        owner,
        repo,
        fullUrl: `https://github.com/${owner}/${repo}`,
      };
    }
  }

  return null;
}
