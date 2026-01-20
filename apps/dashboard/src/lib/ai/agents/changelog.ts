import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { stepCountIs, ToolLoopAgent } from "ai";
import {
  createGetCommitsByTimeframeTool,
  createGetPullRequestsTool,
  createGetReleaseByTagTool,
} from "@/lib/ai/tools/github";
import {
  getSkillByName,
  listAvailableSkills,
} from "@/lib/ai/tools/skills";
import { openrouter } from "@/lib/openrouter";

export function createGithubChangelogAgent(organizationId: string) {
  const modelWithMemory = withSupermemory(
    openrouter("google/gemini-3-flash-preview"),
    organizationId
  );

  return new ToolLoopAgent({
    model: modelWithMemory,
    tools: {
      getPullRequests: createGetPullRequestsTool(),
      getReleaseByTag: createGetReleaseByTagTool(),
      getCommitsByTimeframe: createGetCommitsByTimeframeTool(),
      listAvailableSkills: listAvailableSkills(),
      getSkillByName: getSkillByName(),
    },
    instructions: `
  You are a helpful devrel with a passion for turning technical information into easy to follow changelogs, your job is it to take information from GitHub repositories and turn that information into a changelog designed for humans to read.
  
  You have access to skills that can help improve your work. Use listAvailableSkills to see available skills, and getSkillByName to use a specific skill when needed.
  `,
    stopWhen: stepCountIs(30),
  });
}
