import type { Tool } from "ai";
import { createMarkdownTools } from "@/lib/ai/tools/edit-markdown";
import {
  createGetCommitsByTimeframeTool,
  createGetPullRequestsTool,
  createGetReleaseByTagTool,
} from "@/lib/ai/tools/github";
import { getSkillByName, listAvailableSkills } from "@/lib/ai/tools/skills";
import type { RepoContext, ToolSet, ValidatedIntegration } from "./types";

interface BuildToolSetParams {
  currentMarkdown: string;
  onMarkdownUpdate?: (markdown: string) => void;
  validatedIntegrations: ValidatedIntegration[];
}

export function buildToolSet(params: BuildToolSetParams): ToolSet {
  const { currentMarkdown, onMarkdownUpdate, validatedIntegrations } = params;

  const { getMarkdown, editMarkdown } = createMarkdownTools({
    currentMarkdown,
    onUpdate: onMarkdownUpdate ?? (() => {}),
  });

  const tools: Record<string, Tool> = {
    getMarkdown,
    editMarkdown,
    listAvailableSkills: listAvailableSkills(),
    getSkillByName: getSkillByName(),
  };

  const descriptions: string[] = [
    "**Markdown Editing**: View and edit the document using getMarkdown and editMarkdown",
    "**Skills**: Access knowledge and writing guidelines using listAvailableSkills and getSkillByName",
  ];

  const hasGitHub = validatedIntegrations.some(
    (i) => i.type === "github" && i.repositories.length > 0
  );

  if (hasGitHub) {
    tools.getPullRequests = createGetPullRequestsTool();
    tools.getReleaseByTag = createGetReleaseByTagTool();
    tools.getCommitsByTimeframe = createGetCommitsByTimeframeTool();

    const repos = getGitHubRepoList(validatedIntegrations);
    descriptions.push(
      `**GitHub Integration**: Fetch PRs, releases, and commits from: ${repos}`
    );
  }

  return { tools, descriptions };
}

function getGitHubRepoList(integrations: ValidatedIntegration[]): string {
  const repos: string[] = [];
  for (const integration of integrations) {
    if (integration.type === "github") {
      for (const repo of integration.repositories) {
        repos.push(`${repo.owner}/${repo.repo}`);
      }
    }
  }
  return repos.join(", ");
}

export function getRepoContextFromIntegrations(
  integrations: ValidatedIntegration[]
): RepoContext[] {
  const repos: RepoContext[] = [];
  for (const integration of integrations) {
    if (integration.type === "github") {
      for (const repo of integration.repositories) {
        repos.push({ owner: repo.owner, repo: repo.repo });
      }
    }
  }
  return repos;
}
