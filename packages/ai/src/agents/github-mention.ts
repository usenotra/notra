import { GITHUB_MENTION_AGENT_MAX_STEPS } from "@notra/ai/constants/github-mention";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import { assertRouteHasCredits } from "@notra/ai/gateway";
import { createModel } from "@notra/ai/model";
import {
  getGitHubMentionInstructions,
  getGitHubMentionPrompt,
} from "@notra/ai/prompts/github-mention";
import { withRouterDefaults } from "@notra/ai/provider-options";
import {
  buildGitHubMentionTools,
  type GitHubMentionToolState,
} from "@notra/ai/tools/github-mention";
import type {
  GitHubMentionAgentResult,
  GitHubMentionContext,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";
import { buildGitHubMentionThread } from "@notra/ai/utils/github-mention";
import {
  readPublishedFile,
  resolveEditableMarkdown,
} from "@notra/ai/utils/github-mention-published-file";
import {
  listGitHubIssueComments,
  listGitHubReviewComments,
} from "@notra/ai/utils/github-pr-commit";
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
    publishedFile: await readPublishedFile(params),
  };
  const editable = resolveEditableMarkdown({
    postMarkdown: params.context.publication?.markdown ?? null,
    publishedFile: state.publishedFile,
    recordedHeadSha: params.context.publication?.headSha ?? null,
    pullRequestHeadSha: params.context.pullRequest?.headSha ?? null,
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
    }),
    instructions: getGitHubMentionInstructions(),
    stopWhen: stepCountIs(GITHUB_MENTION_AGENT_MAX_STEPS),
  });

  // Thread context is best effort: the mention still works without it. Notra's
  // own replies often sit in review threads, so both comment kinds are merged.
  const location = {
    octokit: params.octokit,
    owner: params.context.owner,
    repo: params.context.repo,
  };
  const [issueComments, reviewComments] = await Promise.all([
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
  ]);

  const prompt = getGitHubMentionPrompt({
    commentBody: params.context.comment.body,
    senderLogin: params.context.sender.login,
    owner: params.context.owner,
    repo: params.context.repo,
    issueNumber: params.context.issueNumber,
    pullRequestTitle: params.context.pullRequest?.title ?? null,
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
  try {
    const result = await agent.generate({ prompt });
    reply = result.text.trim();
  } catch (error) {
    if (!state.committed) {
      throw error;
    }
  }

  return {
    reply,
    committed: state.committed,
    commitSha: state.commitSha,
    pullRequestUrl: state.pullRequestUrl,
  };
}
