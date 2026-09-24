import { GITHUB_API_VERSION_HEADER } from "@notra/ai/constants/autonomy-poll";
import {
  GITHUB_MENTION_CHECK_RUN_NAME,
  GITHUB_MENTION_CHECK_RUN_SUMMARY,
} from "@notra/ai/constants/github-mention";
import type {
  GitHubMentionCheckRunConclusion,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";

const GITHUB_API_VERSION_HEADERS = {
  "X-GitHub-Api-Version": GITHUB_API_VERSION_HEADER,
} as const;

/** In progress without a conclusion; already completed with one. */
export async function createGitHubMentionCheckRun(params: {
  octokit: GitHubMentionOctokit;
  owner: string;
  repo: string;
  headSha: string;
  detailsUrl: string;
  conclusion?: GitHubMentionCheckRunConclusion;
}) {
  const { data } = await params.octokit.request(
    "POST /repos/{owner}/{repo}/check-runs",
    {
      owner: params.owner,
      repo: params.repo,
      name: GITHUB_MENTION_CHECK_RUN_NAME,
      head_sha: params.headSha,
      details_url: params.detailsUrl,
      ...(params.conclusion
        ? { status: "completed" as const, conclusion: params.conclusion }
        : { status: "in_progress" as const }),
      output: {
        title:
          GITHUB_MENTION_CHECK_RUN_SUMMARY[params.conclusion ?? "in_progress"],
        summary: params.detailsUrl,
      },
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return { id: data.id };
}

export async function completeGitHubMentionCheckRun(params: {
  octokit: GitHubMentionOctokit;
  owner: string;
  repo: string;
  checkRunId: number;
  conclusion: GitHubMentionCheckRunConclusion;
  detailsUrl: string;
}) {
  await params.octokit.request(
    "PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}",
    {
      owner: params.owner,
      repo: params.repo,
      check_run_id: params.checkRunId,
      status: "completed",
      conclusion: params.conclusion,
      output: {
        title: GITHUB_MENTION_CHECK_RUN_SUMMARY[params.conclusion],
        summary: params.detailsUrl,
      },
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
}
