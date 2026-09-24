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

export async function startGitHubMentionCheckRun(params: {
  octokit: GitHubMentionOctokit;
  owner: string;
  repo: string;
  headSha: string;
  detailsUrl: string;
}) {
  const { data } = await params.octokit.request(
    "POST /repos/{owner}/{repo}/check-runs",
    {
      owner: params.owner,
      repo: params.repo,
      name: GITHUB_MENTION_CHECK_RUN_NAME,
      head_sha: params.headSha,
      status: "in_progress",
      details_url: params.detailsUrl,
      output: {
        title: GITHUB_MENTION_CHECK_RUN_SUMMARY.in_progress,
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
