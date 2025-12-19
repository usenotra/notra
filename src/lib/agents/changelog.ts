import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { openrouter } from "../openrouter";
import {
  getCommitsByTimeframeTool,
  getPullRequestsTool,
  getReleaseByTagTool,
} from "../tools/github";

export const githubChangelogAgent = new Agent({
  model: openrouter("google/gemini-3-flash-preview"),
  tools: {
    getPullRequests: getPullRequestsTool,
    getReleaseByTag: getReleaseByTagTool,
    getCommitsByTimeframe: getCommitsByTimeframeTool,
  },
  system: `
  You are a helpful devrel with a passion for turning technical information into easy to follow changelogs, your job is it to take information from GitHub repositories and turn that information into a changelog designed for humans to read..
  `,
  stopWhen: stepCountIs(30),
});
