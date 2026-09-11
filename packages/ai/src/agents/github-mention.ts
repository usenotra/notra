import { GITHUB_MENTION_AGENT_MAX_STEPS } from "@notra/ai/constants/github-mention";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import { assertRouteHasCredits } from "@notra/ai/gateway";
import { createModel } from "@notra/ai/model";
import {
  getGitHubMentionInstructions,
  getGitHubMentionPrompt,
} from "@notra/ai/prompts/github-mention";
import { withGatewayDefaults } from "@notra/ai/provider-options";
import {
  buildGitHubMentionTools,
  type GitHubMentionToolState,
} from "@notra/ai/tools/github-mention";
import type {
  GitHubMentionAgentResult,
  GitHubMentionContext,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";
import { stepCountIs, ToolLoopAgent } from "ai";

export async function runGitHubMentionAgent(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
}): Promise<GitHubMentionAgentResult> {
  await assertRouteHasCredits({
    organizationId: params.context.organizationId,
    modelId: AGENT_DEFAULT_MODEL,
  });

  const state: GitHubMentionToolState = {
    committed: false,
    commitSha: null,
    pullRequestUrl: params.context.pullRequest?.htmlUrl ?? null,
    writeBranch: null,
    writePullNumber: null,
    writePullRequestUrl: null,
  };

  const agent = new ToolLoopAgent({
    model: createModel(params.context.organizationId, AGENT_DEFAULT_MODEL, {
      disableMemory: true,
    }),
    providerOptions: withGatewayDefaults(
      {
        anthropic: {
          thinking: { type: "adaptive" },
        },
      },
      { modelId: AGENT_DEFAULT_MODEL }
    ),
    tools: buildGitHubMentionTools({
      octokit: params.octokit,
      context: params.context,
      state,
    }),
    instructions: getGitHubMentionInstructions(),
    stopWhen: stepCountIs(GITHUB_MENTION_AGENT_MAX_STEPS),
  });

  const result = await agent.generate({
    prompt: getGitHubMentionPrompt({
      commentBody: params.context.comment.body,
      senderLogin: params.context.sender.login,
      owner: params.context.owner,
      repo: params.context.repo,
      issueNumber: params.context.issueNumber,
      pullRequestTitle: params.context.pullRequest?.title ?? null,
      destinationMode: params.context.destination.mode,
      publicationPath: params.context.publication?.path ?? null,
      publicationTitle: params.context.publication?.title ?? null,
      markdown: params.context.publication?.markdown ?? null,
    }),
  });

  return {
    reply: result.text.trim(),
    committed: state.committed,
    commitSha: state.commitSha,
    pullRequestUrl: state.pullRequestUrl,
  };
}
