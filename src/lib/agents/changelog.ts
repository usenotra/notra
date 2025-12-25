import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { stepCountIs, ToolLoopAgent } from "ai";
import { openrouter } from "../openrouter";
import {
  getCommitsByTimeframeTool,
  getPullRequestsTool,
  getReleaseByTagTool,
} from "../tools/github";

export function createGithubChangelogAgent(organizationId: string) {
  const modelWithMemory = withSupermemory(
    openrouter("google/gemini-3-flash-preview"),
    organizationId
  );

  return new ToolLoopAgent({
    model: modelWithMemory,
    tools: {
      getPullRequests: getPullRequestsTool,
      getReleaseByTag: getReleaseByTagTool,
      getCommitsByTimeframe: getCommitsByTimeframeTool,
    },
    instructions: `
  You are a helpful devrel with a passion for turning technical information into easy to follow changelogs, your job is it to take information from GitHub repositories and turn that information into a changelog designed for humans to read..
  `,
    stopWhen: stepCountIs(30),
  });
}
