import { createGitHubMentionUsageCollector } from "@notra/ai/billing/github-mention-billing";
import { GITHUB_MENTION_AGENT_MAX_STEPS } from "@notra/ai/constants/github-mention";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import { assertRouteHasCredits } from "@notra/ai/gateway";
import { createModel } from "@notra/ai/model";
import {
  getGitHubMentionInstructions,
  getGitHubMentionPrompt,
} from "@notra/ai/prompts/github-mention";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { buildGitHubMentionTools } from "@notra/ai/tools/github-mention";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { PublicationRepairScheduler } from "@notra/ai/types/content-publication";
import type {
  GitHubMentionAgentResult,
  GitHubMentionContext,
  GitHubMentionOctokit,
  GitHubMentionToolState,
} from "@notra/ai/types/github-mention";
import {
  buildGitHubMentionThread,
  parseGitHubMentionAgentReply,
} from "@notra/ai/utils/github-mention";
import {
  readPublishedFile,
  resolveEditableMarkdown,
} from "@notra/ai/utils/github-mention-published-file";
import { loadGitHubMentionVoice } from "@notra/ai/utils/github-mention-voice";
import {
  listGitHubIssueComments,
  listGitHubReviewComments,
} from "@notra/ai/utils/github-pr-comments";
import { summarizeRouteUsage } from "@notra/ai/utils/route-usage";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
import { stepCountIs, ToolLoopAgent } from "ai";

export async function runGitHubMentionAgent(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
  onUsage?: (usage: AgentTokenUsage) => void;
  scheduleRepair?: PublicationRepairScheduler;
}): Promise<GitHubMentionAgentResult> {
  await assertRouteHasCredits({
    organizationId: params.context.organizationId,
    modelId: AGENT_DEFAULT_MODEL,
  });

  const usage = createGitHubMentionUsageCollector();
  const reportUsage = (value: AgentTokenUsage) => {
    usage.add(value);
    params.onUsage?.(value);
  };
  const state: GitHubMentionToolState = {
    committed: false,
    commitSha: null,
    pullRequestUrl: params.context.pullRequest?.htmlUrl ?? null,
    writeBranch: null,
    writePullNumber: null,
    writePullRequestUrl: null,
    publishedFile: await readPublishedFile(params),
    proposals: [],
    permissionDenied: false,
    onUsage: reportUsage,
  };
  const editable = resolveEditableMarkdown({
    postMarkdown: params.context.publication?.markdown ?? null,
    publishedFile: state.publishedFile,
    recordedHeadSha: params.context.publication?.headSha ?? null,
    pullRequestHeadSha: params.context.publication
      ? (params.context.pullRequest?.headSha ?? null)
      : null,
  });

  const agent = new ToolLoopAgent({
    model: createModel(params.context.organizationId, AGENT_DEFAULT_MODEL, {
      disableMemory: true,
    }),
    providerOptions: withRouterDefaults(
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
      scheduleRepair: params.scheduleRepair,
    }),
    instructions: getGitHubMentionInstructions(),
    stopWhen: [
      stepCountIs(GITHUB_MENTION_AGENT_MAX_STEPS),
      () => state.permissionDenied,
    ],
  });

  // Thread and voice context are best effort: the mention still works without
  // them. Notra's own replies often sit in review threads, so both comment
  // kinds are merged.
  const location = {
    octokit: params.octokit,
    owner: params.context.owner,
    repo: params.context.repo,
  };
  const [issueComments, reviewComments, voice] = await Promise.all([
    listGitHubIssueComments({
      ...location,
      issueNumber: params.context.issueNumber,
    }).catch(() => []),
    params.context.pullRequest
      ? listGitHubReviewComments({
          ...location,
          pullNumber: params.context.pullRequest.number,
        }).catch(() => [])
      : [],
    loadGitHubMentionVoice({
      organizationId: params.context.organizationId,
      postId: params.context.publication?.postId ?? null,
    }).catch(() => null),
  ]);

  const prompt = getGitHubMentionPrompt({
    commentBody: params.context.comment.body,
    senderLogin: params.context.sender.login,
    owner: params.context.owner,
    repo: params.context.repo,
    issueNumber: params.context.issueNumber,
    pullRequestTitle: params.context.pullRequest?.title ?? null,
    pullRequestBody: params.context.pullRequest?.body ?? null,
    contentType: params.context.publication?.contentType ?? null,
    voice,
    destinationMode: params.context.destination.mode,
    publicationPath: params.context.publication?.path ?? null,
    publicationTitle: params.context.publication?.title ?? null,
    markdown: editable.markdown,
    markdownFromPullRequest: editable.fromPullRequest,
    thread: buildGitHubMentionThread({
      comments: [...issueComments, ...reviewComments],
      current: {
        id: params.context.comment.id,
        kind: params.context.comment.review ? "review" : "issue",
        threadRootId: params.context.comment.review?.rootCommentId,
      },
    }),
    review: params.context.comment.review,
  });

  // A run that dies after its commit still reports the commit. Throwing here
  // would mark the mention as failed and let a redelivery commit it again.
  let reply = "";
  let declined = false;
  try {
    const result = await agent.generate({
      prompt,
      onStepEnd: async (step) => {
        const routeUsage = await summarizeRouteUsage(
          [step],
          AGENT_DEFAULT_MODEL
        );
        reportUsage({
          ...toAgentTokenUsage(step.usage),
          modelId: AGENT_DEFAULT_MODEL,
          maxPromptTokens: routeUsage.maxPromptTokens,
          tokenCostUsd: routeUsage.tokenCostUsd,
          route: routeUsage.route,
          raw: step.usage,
        });
      },
    });
    ({ declined, reply } = parseGitHubMentionAgentReply(result.text.trim()));
  } catch (error) {
    if (!state.committed) {
      throw error;
    }
  }

  return {
    reply,
    declined,
    committed: state.committed,
    commitSha: state.commitSha,
    pullRequestUrl: state.pullRequestUrl,
    // A commit moved the head, so suggestions made before it point nowhere.
    proposals: state.committed ? [] : state.proposals,
    permissionDenied: state.permissionDenied,
    usage: usage.get(),
  };
}
