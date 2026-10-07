import type { PublicationAncestryValidator } from "@notra/ai/types/content-publication";
import type { GitHubMentionOctokit } from "@notra/ai/types/github-mention";

export function githubAncestryValidator(params: {
  octokit: GitHubMentionOctokit;
  owner: string;
  repo: string;
}): PublicationAncestryValidator {
  return async (base, head) => {
    const { data } = await params.octokit.request(
      "GET /repos/{owner}/{repo}/compare/{basehead}",
      { owner: params.owner, repo: params.repo, basehead: `${base}...${head}` }
    );
    return data.status === "ahead" || data.status === "identical";
  };
}
