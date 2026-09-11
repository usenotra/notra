import { GITHUB_URL_PATTERNS } from "@notra/schemas/constants/dashboard/github";

import type { GitHubRepoInfo } from "@/types/integrations";

const GITHUB_OWNER_REGEX = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const GITHUB_REPO_REGEX = /^[a-z\d._-]{1,100}$/i;

function isValidGitHubPath(owner: string, repo: string) {
  return GITHUB_OWNER_REGEX.test(owner) && GITHUB_REPO_REGEX.test(repo);
}

export function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  const trimmed = url.trim();

  for (const pattern of GITHUB_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const owner = match[1];
      const repo = match[2];
      if (!(owner && repo)) {
        continue;
      }
      if (!isValidGitHubPath(owner, repo)) {
        continue;
      }
      return {
        owner,
        repo,
        fullUrl: `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(
          repo
        )}`,
      };
    }
  }

  return null;
}
