import {
  GITHUB_MENTION_ACTIVE_CONTENT_BLOCKED_MESSAGE,
  GITHUB_MENTION_FILE_CONTENT_MAX_BYTES,
  GITHUB_MENTION_SUGGESTION,
} from "@notra/ai/constants/github-mention";
import type { PublicationRepairScheduler } from "@notra/ai/types/content-publication";
import type {
  GitHubMentionContext,
  GitHubMentionFileChange,
  GitHubMentionOctokit,
  GitHubMentionToolState,
} from "@notra/ai/types/github-mention";
import { findOpenContentPublicationForPost } from "@notra/ai/utils/content-publication";
import { reviewGitHubMentionChange } from "@notra/ai/utils/github-mention-change-review";
import { partitionGitHubMentionPaths } from "@notra/ai/utils/github-mention-path-policy";
import { isGitHubPermissionError } from "@notra/ai/utils/github-mention-permissions";
import { carryOverImageTargets } from "@notra/ai/utils/github-mention-published-file";
import { runGitHubMentionSandbox } from "@notra/ai/utils/github-mention-sandbox";
import {
  buildGitHubMentionSuggestions,
  commentableLinesFromPatch,
  isGitHubMentionSuggestionCommentable,
} from "@notra/ai/utils/github-mention-suggestion";
import {
  ensureFollowUpPullRequest,
  resolveGitHubMentionWriteTarget,
} from "@notra/ai/utils/github-mention-write-target";
import {
  commitFilesToPullRequest,
  getGitHubPullRequestFilePatch,
  getPullRequestHead,
  getRepositoryFileContents,
} from "@notra/ai/utils/github-pr-commit";
import { updatePostRecord } from "@notra/ai/utils/post-service";
import {
  syncPublishedPostAfterCommit,
  updatePublishedContentAndCommit,
} from "@notra/ai/utils/update-published-content";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { type Tool, type ToolExecutionOptions, tool } from "ai";
import { and, eq } from "drizzle-orm";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

async function recordWrite(
  params: {
    octokit: GitHubMentionOctokit;
    context: GitHubMentionContext;
    state: GitHubMentionToolState;
  },
  commitSha: string,
  target: { branch: string; pullRequestUrl: string }
) {
  // The commit already landed, so mark it before anything else can throw: a
  // run that wrote must never look retryable.
  params.state.committed = true;
  params.state.commitSha = commitSha;
  if (params.context.destination.mode === "new_pull_request") {
    params.state.pullRequestUrl = null;
  }
  const followUp = await ensureFollowUpPullRequest({
    octokit: params.octokit,
    context: params.context,
    state: params.state,
    branch: target.branch,
  });
  params.state.pullRequestUrl = followUp?.htmlUrl ?? target.pullRequestUrl;
}

/**
 * The model may call several write tools in one step. Each commit moves the
 * branch head, so overlapping writes fail GitHub's expectedHeadOid check.
 * Running them one after another lets each resolve the head the previous left.
 */
function createWriteQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}

/**
 * A missing App permission fails the same way on every attempt. Instead of
 * letting the model retry, the run is flagged and ends with a fixed reply.
 */
function stopOnPermissionError(
  tools: Record<string, Tool>,
  state: GitHubMentionToolState
): Record<string, Tool> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, mentionTool]) => [
      name,
      {
        ...mentionTool,
        execute: async (
          input: unknown,
          options: ToolExecutionOptions<unknown>
        ) => {
          try {
            return await mentionTool.execute?.(input, options);
          } catch (error) {
            if (!isGitHubPermissionError(error)) {
              throw error;
            }
            state.permissionDenied = true;
            return {
              error:
                "GitHub refused this call: the configured credential lacks the permission. Do not retry.",
            };
          }
        },
      },
    ])
  );
}

export function buildGitHubMentionTools(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
  state: GitHubMentionToolState;
  scheduleRepair?: PublicationRepairScheduler;
}): Record<string, Tool> {
  const { octokit, context, state } = params;
  const replyOnly = context.destination.mode === "reply_only";

  const readTools: Record<string, Tool> = {
    viewPublishedPost: tool({
      description:
        "Reads the Notra post linked to this pull request, or a post by id in this organization.",
      inputSchema: z.object({
        postId: z
          .string()
          .optional()
          .describe("Optional post id. Defaults to the linked publication."),
      }),
      execute: async ({ postId }) => {
        const resolvedPostId = postId ?? context.publication?.postId;
        if (!resolvedPostId) {
          return {
            error: "No published Notra post is linked to this pull request.",
          };
        }
        const post = await db.query.posts.findFirst({
          where: and(
            eq(posts.id, resolvedPostId),
            eq(posts.organizationId, context.organizationId)
          ),
          columns: {
            id: true,
            title: true,
            slug: true,
            markdown: true,
            contentType: true,
            status: true,
          },
        });
        if (!post) {
          return { error: "Post not found" };
        }
        return post;
      },
    }),
  };

  if (replyOnly) {
    return stopOnPermissionError(readTools, state);
  }

  const inWriteOrder = createWriteQueue();

  const tools: Record<string, Tool> = {
    ...readTools,
    getPullRequestFile: tool({
      description: "Reads a file from the mention pull request head branch.",
      inputSchema: z.object({
        path: z.string().describe("Repository-relative file path"),
      }),
      execute: async ({ path }) => {
        const pullNumber = context.pullRequest?.number;
        if (!pullNumber) {
          return { error: "No pull request is available to read from." };
        }
        const head = await getPullRequestHead({
          octokit,
          owner: context.owner,
          repo: context.repo,
          pullNumber,
        });
        const contents = await getRepositoryFileContents({
          octokit,
          owner: context.owner,
          repo: context.repo,
          path,
          // After a write the branch that was written is ahead of the pull
          // request head, also on a follow-up branch.
          ref: state.commitSha ?? head.headSha,
        });
        if (
          Buffer.byteLength(contents, "utf8") >
          GITHUB_MENTION_FILE_CONTENT_MAX_BYTES
        ) {
          return { error: "File is too large to load into the mention agent." };
        }
        return { path, contents };
      },
    }),
    ...(context.destination.mode === "same_pull_request"
      ? {
          suggestContentChange: tool({
            description:
              "Proposes an edit without committing: the reviewer sees it as a GitHub suggestion on the changed lines and applies it with one click. Pass the full new contents of the file. Only works for a content file that is part of this pull request.",
            inputSchema: z.object({
              path: z
                .string()
                .optional()
                .describe(
                  "Repository-relative file path. Defaults to the published file."
                ),
              contents: z
                .string()
                .describe("The whole file as it should read afterwards"),
            }),
            execute: ({ path, contents }) =>
              inWriteOrder(async () => {
                const pullNumber = context.destination.pullRequestNumber;
                const targetPath = path ?? context.publication?.path;
                if (!(pullNumber && targetPath)) {
                  return {
                    error:
                      "No published file is linked to this pull request. Pass the path of the file to suggest a change for.",
                  };
                }
                const { blocked } = partitionGitHubMentionPaths([targetPath]);
                if (blocked.length > 0) {
                  return {
                    error:
                      "Nothing was suggested. Mentions only edit content files; tell the commenter this needs a regular commit.",
                    blocked,
                  };
                }
                const head = await getPullRequestHead({
                  octokit,
                  owner: context.owner,
                  repo: context.repo,
                  pullNumber,
                });
                const location = {
                  octokit,
                  owner: context.owner,
                  repo: context.repo,
                };
                const [previous, patch] = await Promise.all([
                  getRepositoryFileContents({
                    ...location,
                    path: targetPath,
                    ref: head.headSha,
                  }),
                  getGitHubPullRequestFilePatch({
                    ...location,
                    pullNumber,
                    path: targetPath,
                  }),
                ]);
                const next =
                  targetPath === context.publication?.path &&
                  context.publication.headSha === head.headSha
                    ? carryOverImageTargets(
                        contents,
                        context.publication.markdown ?? "",
                        previous
                      )
                    : contents;
                const review = await reviewGitHubMentionChange({
                  octokit,
                  context,
                  branch: head.headSha,
                  files: [{ path: targetPath, contents: next }],
                });
                if (review.blocked.length > 0) {
                  return {
                    error: GITHUB_MENTION_ACTIVE_CONTENT_BLOCKED_MESSAGE,
                    blocked: review.blocked,
                  };
                }
                const suggestions = buildGitHubMentionSuggestions({
                  path: targetPath,
                  previous,
                  next,
                });
                if (suggestions.length === 0) {
                  return {
                    error: "These contents match the file, nothing to suggest.",
                  };
                }
                if (
                  suggestions.length > GITHUB_MENTION_SUGGESTION.maxSuggestions
                ) {
                  return {
                    error:
                      "This touches too many separate places to review as suggestions. Narrow it down, or commit it if the commenter asked for the change itself.",
                  };
                }
                const commentable = commentableLinesFromPatch(patch);
                const isCommentable = suggestions.every((suggestion) =>
                  isGitHubMentionSuggestionCommentable(suggestion, commentable)
                );
                if (!isCommentable) {
                  return {
                    error:
                      "These lines are not part of this pull request's diff, so GitHub cannot show a suggestion on them. Commit the change if the commenter asked for it, otherwise describe it in your reply.",
                  };
                }
                state.proposals = [
                  ...state.proposals.filter(
                    (proposal) => proposal.path !== targetPath
                  ),
                  {
                    path: targetPath,
                    commitSha: head.headSha,
                    previous,
                    suggestions,
                  },
                ];
                return {
                  suggested: true,
                  path: targetPath,
                  suggestions: suggestions.length,
                };
              }),
          }),
        }
      : {}),
    updatePublishedContent: tool({
      description:
        "Updates the Notra post linked to this pull request and commits the file onto the mention pull request. Do not use this for questions.",
      inputSchema: z.object({
        markdown: z
          .string()
          .describe("Updated markdown for the published file"),
        title: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe("Optional updated title"),
        commitMessage: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe(
            "Commit headline. Defaults to a short docs update message."
          ),
      }),
      execute: ({ markdown, title, commitMessage }) =>
        inWriteOrder(async () => {
          const publication = context.publication;
          if (!publication) {
            return {
              error:
                "No Notra publication is linked to this pull request. Use commitFilesToPullRequest to edit files on the PR instead.",
            };
          }
          const target = await resolveGitHubMentionWriteTarget({
            octokit,
            context,
            state,
          });
          const recordedFile = publication.headSha
            ? await getRepositoryFileContents({
                octokit,
                owner: context.owner,
                repo: context.repo,
                path: publication.path,
                ref: publication.headSha,
              })
            : null;
          const fileContents =
            recordedFile === null
              ? markdown
              : carryOverImageTargets(
                  markdown,
                  publication.markdown ?? "",
                  recordedFile
                );
          const postMarkdown =
            recordedFile === null
              ? markdown
              : carryOverImageTargets(
                  fileContents,
                  recordedFile,
                  publication.markdown ?? ""
                );
          const review = await reviewGitHubMentionChange({
            octokit,
            context,
            branch: target.branch,
            files: [{ path: publication.path, contents: fileContents }],
          });
          if (review.blocked.length > 0) {
            return {
              error: GITHUB_MENTION_ACTIVE_CONTENT_BLOCKED_MESSAGE,
              blocked: review.blocked,
            };
          }
          const result = await updatePublishedContentAndCommit({
            octokit,
            organizationId: context.organizationId,
            postId: publication.postId,
            markdown: postMarkdown,
            fileContents,
            title,
            owner: context.owner,
            repo: context.repo,
            branch: target.branch,
            expectedHeadOid: target.expectedHeadOid,
            publicationHeadSha: publication.headSha,
            path: publication.path,
            publicationId: publication.id,
            scheduleRepair: params.scheduleRepair,
            onCommitted: (sha) => {
              state.committed = true;
              state.commitSha = sha;
              state.pullRequestUrl = target.pullRequestUrl;
            },
            recordPublicationHead:
              context.destination.mode === "same_pull_request",
            commitMessage:
              commitMessage ??
              `docs: update ${publication.title ?? publication.path}`,
          });
          if (context.destination.mode === "same_pull_request") {
            publication.headSha = result.commitSha;
            publication.markdown = postMarkdown;
            if (title !== undefined) {
              publication.title = title;
            }
          }
          await recordWrite(
            { octokit, context, state },
            result.commitSha,
            target
          );
          return {
            postId: publication.postId,
            path: publication.path,
            commitSha: result.commitSha,
            pullRequestUrl: state.pullRequestUrl,
            publicationSync: result.publicationSync,
          };
        }),
    }),
    commitFilesToPullRequest: tool({
      description:
        "Commits one or more content files (Markdown, MDX, text, or the JSON, YAML, TOML, CSV data next to them) onto the mention pull request head. Code, scripts, dot files, and build configuration are rejected. Use after reading files when the change is not the linked Notra publication.",
      inputSchema: z.object({
        headline: z.string().describe("Commit headline"),
        files: z
          .array(
            z.object({
              path: z.string(),
              contents: z.string(),
            })
          )
          .min(1),
      }),
      execute: ({ headline, files }) =>
        inWriteOrder(async () => {
          const { blocked } = partitionGitHubMentionPaths(
            files.map((file) => file.path)
          );
          if (blocked.length > 0) {
            return {
              error:
                "Nothing was committed. Mentions only edit content files; tell the commenter these need a regular commit.",
              blocked,
            };
          }
          const target = await resolveGitHubMentionWriteTarget({
            octokit,
            context,
            state,
          });
          const review = await reviewGitHubMentionChange({
            octokit,
            context,
            branch: target.branch,
            files,
          });
          if (review.blocked.length > 0) {
            return {
              error: GITHUB_MENTION_ACTIVE_CONTENT_BLOCKED_MESSAGE,
              blocked: review.blocked,
            };
          }
          const commitSha = await commitFilesToPullRequest({
            octokit,
            owner: context.owner,
            repo: context.repo,
            branch: target.branch,
            expectedHeadOid: target.expectedHeadOid,
            headline,
            files: files as GitHubMentionFileChange[],
          });
          state.committed = true;
          state.commitSha = commitSha;
          state.pullRequestUrl = target.pullRequestUrl;
          const publicationSync = await syncPublishedPostAfterCommit({
            octokit,
            organizationId: context.organizationId,
            publication: context.publication,
            files,
            commitSha,
            expectedHeadOid: target.expectedHeadOid,
            branch: target.branch,
            recordPublicationHead:
              context.destination.mode === "same_pull_request",
            scheduleRepair: params.scheduleRepair,
          });
          if (
            publicationSync &&
            publicationSync.status === "synchronized" &&
            context.publication
          ) {
            context.publication.headSha = commitSha;
            context.publication.markdown = publicationSync.markdown;
          }
          await recordWrite({ octokit, context, state }, commitSha, target);
          return {
            commitSha,
            pullRequestUrl: state.pullRequestUrl,
            publicationSync,
          };
        }),
    }),
    runRepoSandbox: tool({
      description:
        "Runs a repository sandbox on the mention pull request branch when you need a working tree. Only content files are committed; anything else comes back under skipped. Do not use this for questions or single-file content edits.",
      inputSchema: z.object({
        instruction: z
          .string()
          .describe("What the sandbox should change in the working tree"),
      }),
      execute: ({ instruction }) =>
        inWriteOrder(async () => {
          const target = await resolveGitHubMentionWriteTarget({
            octokit,
            context,
            state,
          });
          const result = await runGitHubMentionSandbox({
            octokit,
            context,
            instruction,
            branch: target.branch,
            expectedHeadOid: target.expectedHeadOid,
            onUsage: state.onUsage,
            scheduleRepair: params.scheduleRepair,
            onCommitted: (sha) => {
              state.committed = true;
              state.commitSha = sha;
              state.pullRequestUrl = target.pullRequestUrl;
            },
          });
          if (!result.available) {
            return { error: result.error };
          }
          if (result.commitSha) {
            await recordWrite(
              { octokit, context, state },
              result.commitSha,
              target
            );
          }
          return result;
        }),
    }),
    updatePostById: tool({
      description:
        "Updates a Notra post by id without committing. Use when you need to change the draft in Notra only.",
      inputSchema: z.object({
        postId: z.string(),
        markdown: z.string().optional(),
        title: z.string().optional(),
      }),
      execute: async ({ postId, markdown, title }) => {
        const publication = await findOpenContentPublicationForPost({
          organizationId: context.organizationId,
          postId,
        });
        await updatePostRecord({
          organizationId: context.organizationId,
          postId,
          markdown,
          title,
        });
        return {
          postId,
          linkedPullRequest: publication?.pullRequestUrl ?? null,
        };
      },
    }),
  };
  return stopOnPermissionError(tools, state);
}
