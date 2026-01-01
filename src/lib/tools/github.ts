import { type Tool, tool } from "ai";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { createOctokit } from "@/lib/octokit";
import { getTokenForRepository } from "@/lib/services/github-integration";

export function createGetPullRequestsTool(): Tool {
  return tool({
    description: "Get the details of a pull request for a repository",
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
    description: "Get the details of a release for a repository",
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
    description:
      "Get all commits from the default branch within the past x days",
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
