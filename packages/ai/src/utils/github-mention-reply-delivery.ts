import {
  GITHUB_MENTION_COMMENT_MAX_LENGTH,
  GITHUB_MENTION_LOG_EVENTS,
} from "@notra/ai/constants/github-mention";
import type {
  GitHubMentionChangedFile,
  GitHubMentionContext,
  GitHubMentionOctokit,
  GitHubMentionProposal,
} from "@notra/ai/types/github-mention";
import { logGitHubMentionEvent } from "@notra/ai/utils/github-mention-log";
import {
  buildGitHubMentionProposalFallbackReply,
  buildGitHubMentionProposalReply,
  findGitHubMentionReplyAnchor,
} from "@notra/ai/utils/github-mention-reply";
import {
  fitGitHubMentionSuggestionsToRange,
  formatGitHubMentionSuggestionBlock,
} from "@notra/ai/utils/github-mention-suggestion";
import {
  postGitHubIssueComment,
  postGitHubReviewComment,
  postGitHubSuggestionReview,
  replyToGitHubReviewThread,
} from "@notra/ai/utils/github-pr-comments";

export function clipGitHubComment(body: string) {
  if (body.length <= GITHUB_MENTION_COMMENT_MAX_LENGTH) {
    return body;
  }
  return body.slice(0, GITHUB_MENTION_COMMENT_MAX_LENGTH);
}

/**
 * Replies where the conversation is: inside the review thread the mention came
 * from, or, after a commit, anchored to the changed lines under "Files changed".
 * Anything GitHub refuses falls back to a regular comment.
 */
export async function postGitHubMentionReply(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
  body: string;
  commitSha: string | null;
  changedFiles: readonly GitHubMentionChangedFile[];
}) {
  const { octokit, context, body } = params;
  const pullNumber = context.pullRequest?.number;
  try {
    if (context.comment.review && pullNumber) {
      return await replyToGitHubReviewThread({
        octokit,
        owner: context.owner,
        repo: context.repo,
        pullNumber,
        rootCommentId: context.comment.review.rootCommentId,
        body,
      });
    }
    const anchor = params.commitSha
      ? findGitHubMentionReplyAnchor(
          params.changedFiles,
          context.publication?.path ?? null
        )
      : null;
    if (anchor && params.commitSha && pullNumber) {
      return await postGitHubReviewComment({
        octokit,
        owner: context.owner,
        repo: context.repo,
        pullNumber,
        commitSha: params.commitSha,
        path: anchor.path,
        startLine: anchor.startLine,
        line: anchor.line,
        body,
      });
    }
  } catch (error) {
    logGitHubMentionEvent(
      GITHUB_MENTION_LOG_EVENTS.ignored,
      {
        deliveryId: context.deliveryId,
        reason: "inline_reply_failed",
        error: error instanceof Error ? error.message : String(error),
      },
      "warn"
    );
  }
  return await postGitHubIssueComment({
    octokit,
    owner: context.owner,
    repo: context.repo,
    issueNumber: context.issueNumber,
    body,
  });
}

function fitProposalToReviewThread(
  context: GitHubMentionContext,
  proposals: readonly GitHubMentionProposal[]
) {
  const review = context.comment.review;
  const [proposal] = proposals;
  if (
    !(review?.line && proposal) ||
    proposals.length > 1 ||
    proposal.path !== review.path ||
    proposal.commitSha !== review.commitSha
  ) {
    return null;
  }
  const commentedLine = review.diffHunk?.split("\n").at(-1)?.slice(1);
  if (commentedLine !== proposal.previous.split("\n")[review.line - 1]) {
    return null;
  }
  return fitGitHubMentionSuggestionsToRange({
    suggestions: proposal.suggestions,
    previous: proposal.previous,
    range: { startLine: review.startLine ?? review.line, line: review.line },
  });
}

/** Posts proposals as suggestions, falling back to a plain diff. */
export async function postGitHubMentionProposal(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
  text: string;
  proposals: readonly GitHubMentionProposal[];
}) {
  const { octokit, context, text, proposals } = params;
  const pullNumber = context.pullRequest?.number;
  const commitSha = proposals[0]?.commitSha;
  try {
    const inline = fitProposalToReviewThread(context, proposals);
    const body = clipGitHubComment(
      buildGitHubMentionProposalReply({ text, proposals, inline })
    );
    if (inline && context.comment.review && pullNumber) {
      await replyToGitHubReviewThread({
        octokit,
        owner: context.owner,
        repo: context.repo,
        pullNumber,
        rootCommentId: context.comment.review.rootCommentId,
        body,
      });
      return body;
    }
    if (pullNumber && commitSha) {
      await postGitHubSuggestionReview({
        octokit,
        owner: context.owner,
        repo: context.repo,
        pullNumber,
        commitSha,
        body,
        comments: proposals.flatMap((proposal) =>
          proposal.suggestions.map((suggestion) => ({
            path: suggestion.path,
            startLine: suggestion.startLine,
            line: suggestion.line,
            body: formatGitHubMentionSuggestionBlock(suggestion.replacement),
          }))
        ),
      });
      return body;
    }
  } catch (error) {
    logGitHubMentionEvent(
      GITHUB_MENTION_LOG_EVENTS.ignored,
      {
        deliveryId: context.deliveryId,
        reason: "suggestion_failed",
        error: error instanceof Error ? error.message : String(error),
      },
      "warn"
    );
  }
  const body = clipGitHubComment(
    buildGitHubMentionProposalFallbackReply({ text, proposals })
  );
  await postGitHubMentionReply({
    octokit,
    context,
    body,
    commitSha: null,
    changedFiles: [],
  });
  return body;
}
