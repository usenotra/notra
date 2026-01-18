import { type Tool, tool } from "ai";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { createOctokit } from "@/lib/octokit";
import { getTokenForRepository } from "@/lib/services/github-integration";
import { toolDescription } from "../utils/description";

export function createGetPullRequestsTool(): Tool {
  return tool({
    description: toolDescription({
      toolName: "get_pull_requests",
      intro:
        "Gets the full details of a specific pull request from a GitHub repository including title, description, status, author, reviewers, and merge info.",
      whenToUse:
        "When user asks about a specific PR, wants to see PR details, needs to check PR status, or references a pull request by number.",
      usageNotes: `Requires the repository owner, repo name, and PR number.
Returns comprehensive PR data including diff stats, labels, and review state.`,
    }),
    inputSchema: z.object({
      repo: z
        .string()
        .describe("The name of the repository to get the pull requests for"),
      owner: z.string().describe("The owner of the repository"),
      pull_number: z
        .number()
        .describe("The number of the pull request to get the details for"),
    }),
    execute: async ({ repo, owner, pull_number }) => {
      const token = await getTokenForRepository(owner, repo);
      const octokit = createOctokit(token);
      const pullRequest = await octokit.request(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}",
        {
          owner,
          repo,
          pull_number,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );
      return pullRequest.data;
    },
  });
}

export function createGetReleaseByTagTool(): Tool {
  return tool({
    description: toolDescription({
      toolName: "get_release_by_tag",
      intro:
        "Gets release details from a GitHub repository by tag name including release notes, assets, and publish date.",
      whenToUse:
        "When user asks about a specific release version, wants changelog or release notes, or needs to find release assets and downloads.",
      usageNotes: `Use 'latest' as the tag if the user wants the most recent release and doesn't specify a version.
Returns release body (changelog), assets list, author, and timestamps.`,
    }),
    inputSchema: z.object({
      repo: z
        .string()
        .describe("The name of the repository to get the releases for"),
      owner: z.string().describe("The owner of the repository"),
      tag: z
        .string()
        .default("latest")
        .describe(
          "The tag of the release to get the details for. Use 'latest' if you don't know the tag"
        ),
    }),
    execute: async ({ repo, owner, tag }) => {
      const token = await getTokenForRepository(owner, repo);
      const octokit = createOctokit(token);
      const releases = await octokit.request(
        "GET /repos/{owner}/{repo}/releases/tags/{tag}",
        {
          owner,
          repo,
          tag,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );
      return releases.data;
    },
  });
}

export const getISODateFromDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export function createGetCommitsByTimeframeTool(): Tool {
  return tool({
    description: toolDescription({
      toolName: "get_commits_by_timeframe",
      intro:
        "Gets all commits from the default branch within a specified number of days. Returns commit messages, authors, dates, and SHAs.",
      whenToUse:
        "When user asks about recent commits, wants to see what changed in the last week/month, or needs commit history for a time period.",
      usageNotes: `Defaults to 7 days if no timeframe specified.
Use this for activity summaries, changelog generation, or understanding recent changes.`,
    }),
    inputSchema: z.object({
      owner: z.string().describe("The owner of the repository"),
      repo: z.string().describe("The name of the repository"),
      days: z
        .number()
        .default(7)
        .describe("How many days of commit history to retrieve"),
    }),
    execute: async ({ owner, repo, days }) => {
      const token = await getTokenForRepository(owner, repo);
      const octokit = createOctokit(token);
      const since = getISODateFromDaysAgo(days);

      const response = await octokit.request(
        "GET /repos/{owner}/{repo}/commits",
        {
          owner,
          repo,
          since,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      return response.data;
    },
  });
}
