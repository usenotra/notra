import {
  getGitHubAppBotLogin,
  getGitHubAppInstallationPublishAccess,
  isGitHubAppConfigured,
  listGitHubAppInstallationsByOrganization,
} from "@notra/ai/integrations/github";
import {
  getGitHubPublishTokenEffect,
  selectGitHubAppInstallationForOwner,
} from "@notra/ai/integrations/github-publish-auth";
import {
  findOpenContentPublicationForPost,
  reconcileContentPublication,
} from "@notra/ai/utils/content-publication";
import { githubAncestryValidator } from "@notra/ai/utils/github-ancestry";
import { githubAppInstallationCanPublishContent } from "@notra/ai/utils/github-app-publish-access";
import { getGitHubConnectionMethod } from "@notra/ai/utils/github-connection-method";
import { createOctokit } from "@notra/ai/utils/octokit";
import { retryWrite } from "@notra/ai/utils/retry-write";
import { logError } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import {
  githubAppInstallations,
  githubIntegrations,
  organizations,
  posts,
  repositoryOutputs,
} from "@notra/db/schema";
import { GITHUB_CONTENT_PATH_MAX_LENGTH } from "@notra/schemas/constants/dashboard/github";
import { postGitHubPublishSchema } from "@notra/schemas/dashboard/content";
import { repositoryContentDirectoryConfigSchema } from "@notra/schemas/dashboard/integrations";
import { slugify } from "@notra/utils/slugify";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import {
  DEFAULT_GITHUB_CONTENT_DIRECTORIES,
  DEFAULT_GITHUB_CONTENT_OUTPUT_ENABLED,
} from "@/constants/github";
import { getTranslations } from "@/lib/i18n/server";
import {
  prepareR2GitHubContentAssets,
  resolveGitHubImagePathTemplate,
} from "@/lib/integrations/github/content-assets";
import { clearGitHubPublishFailures } from "@/lib/integrations/github/github-publish-failure-state";
import {
  publishContentDraftPullRequest,
  resolveGitHubContentPath,
} from "@/lib/integrations/github/publish-content-to-github";
import {
  buildOpenInNotraBadgeUrls,
  resolveNotraBaseUrl,
} from "@/lib/integrations/github/pull-request-body";
import {
  findSiteGitHubPublishTarget,
  resolveSiteEntryAuthor,
} from "@/lib/integrations/github/site-publish-target";
import { runOrpcEffect } from "@/lib/orpc/effect";
import {
  badRequest,
  forbidden,
  internalServerError,
  notFound,
} from "@/lib/orpc/utils/errors";
import {
  getGitHubRecoveryMessage,
  toGitHubPublishOrpcError,
} from "@/lib/orpc/utils/github-publish-error";
import { startContentPublicationReconciliation } from "@/lib/workflows/start";
import type {
  PublishSavedContentInput,
  PublishSavedContentOptions,
} from "@/types/integrations/github-publish";
import { toGitHubOperationOrpcError } from "@/utils/github-operation-error";
import { getGitHubAppPermissionsRecovery } from "@/utils/github-publish-policy";
import {
  buildSiteEntryMarkdown,
  resolveSiteEntryDirectory,
  resolveSiteEntrySlug,
  resolveSiteImagePathTemplate,
  resolveSitePublicDirectory,
} from "@/utils/site-github-publish";

export async function publishSavedContentToGitHub(
  input: PublishSavedContentInput,
  options: PublishSavedContentOptions = {}
) {
  const [post, integration, organization] = await Promise.all([
    db.query.posts.findFirst({
      where: and(
        eq(posts.id, input.contentId),
        eq(posts.organizationId, input.organizationId)
      ),
      columns: {
        title: true,
        slug: true,
        markdown: true,
        contentType: true,
        githubPublish: true,
        createdAt: true,
      },
    }),
    db
      .select({
        id: githubIntegrations.id,
        owner: githubIntegrations.owner,
        repo: githubIntegrations.repo,
        githubRepositoryId: githubIntegrations.githubRepositoryId,
        defaultBranch: githubIntegrations.defaultBranch,
        installationId: githubAppInstallations.installationId,
        installationAccountType: githubAppInstallations.accountType,
        installationAccountLogin: githubAppInstallations.accountLogin,
        githubAppInstallationId: githubIntegrations.githubAppInstallationId,
        encryptedToken: githubIntegrations.encryptedToken,
        outputConfig: repositoryOutputs.config,
        outputEnabled: repositoryOutputs.enabled,
        outputId: repositoryOutputs.id,
      })
      .from(githubIntegrations)
      .leftJoin(
        githubAppInstallations,
        and(
          eq(
            githubIntegrations.githubAppInstallationId,
            githubAppInstallations.id
          ),
          eq(githubAppInstallations.organizationId, input.organizationId)
        )
      )
      .leftJoin(
        repositoryOutputs,
        and(
          eq(repositoryOutputs.repositoryId, githubIntegrations.id),
          eq(repositoryOutputs.outputType, input.contentType)
        )
      )
      .where(
        and(
          eq(githubIntegrations.organizationId, input.organizationId),
          eq(githubIntegrations.id, input.repositoryId),
          eq(githubIntegrations.enabled, true),
          eq(githubIntegrations.repositoryEnabled, true)
        )
      )
      .limit(1)
      .then(([result]) => result),
    db.query.organizations.findFirst({
      columns: { slug: true },
      where: eq(organizations.id, input.organizationId),
    }),
  ]);

  if (!post) {
    throw notFound("Content not found");
  }
  if (post.contentType !== input.contentType) {
    const tErrors = await getTranslations("errors.content");
    throw badRequest(tErrors("contentTypeMismatch"));
  }
  if (!post.markdown) {
    const tErrors = await getTranslations("errors.content");
    throw badRequest(tErrors("saveBeforePublishing"));
  }
  const savedMarkdown = post.markdown;
  if (!(integration?.owner && integration.repo)) {
    throw notFound("Selected GitHub repository not found");
  }
  if (!integration.defaultBranch) {
    const tErrors = await getTranslations("errors.content");
    throw badRequest(tErrors("noDefaultBranch"));
  }
  const connectionMethod = isGitHubAppConfigured()
    ? "github-app"
    : getGitHubConnectionMethod(integration);
  if (connectionMethod === "unauthenticated") {
    const tErrors = await getTranslations("errors.content");
    throw forbidden(tErrors("connectViaGithubApp"), {
      code: "github_repository_connection_required",
    });
  }
  let contentOutput = integration.outputId
    ? {
        id: integration.outputId,
        config: integration.outputConfig,
        enabled: integration.outputEnabled ?? false,
      }
    : null;
  if (!contentOutput) {
    if (!DEFAULT_GITHUB_CONTENT_OUTPUT_ENABLED[input.contentType]) {
      const tErrors = await getTranslations("errors.content");
      throw forbidden(tErrors("publishingPaused"), {
        code: "github_content_publishing_paused",
      });
    }

    await db
      .insert(repositoryOutputs)
      .values({
        id: nanoid(),
        repositoryId: integration.id,
        outputType: input.contentType,
        enabled: true,
        config: null,
      })
      .onConflictDoNothing({
        target: [repositoryOutputs.repositoryId, repositoryOutputs.outputType],
      });
    contentOutput =
      (await db.query.repositoryOutputs.findFirst({
        where: and(
          eq(repositoryOutputs.repositoryId, integration.id),
          eq(repositoryOutputs.outputType, input.contentType)
        ),
        columns: { id: true, config: true, enabled: true },
      })) ?? null;
  }
  if (!contentOutput) {
    throw internalServerError("Failed to configure GitHub publishing");
  }
  if (!contentOutput.enabled) {
    const tErrors = await getTranslations("errors.content");
    throw forbidden(tErrors("publishingPaused"), {
      code: "github_content_publishing_paused",
    });
  }
  const outputConfig = repositoryContentDirectoryConfigSchema.safeParse(
    contentOutput.config
  );
  const siteTarget = await findSiteGitHubPublishTarget({
    organizationId: input.organizationId,
    contentType: input.contentType,
    repository: {
      id: integration.id,
      githubRepositoryId: integration.githubRepositoryId,
      owner: integration.owner,
      repo: integration.repo,
    },
  });
  const configuredDirectory = outputConfig.success
    ? outputConfig.data.directory
    : undefined;
  const directory =
    configuredDirectory ??
    (siteTarget
      ? resolveSiteEntryDirectory(siteTarget.rootDirectory, input.contentType)
      : DEFAULT_GITHUB_CONTENT_DIRECTORIES[input.contentType]);
  const postSlug = siteTarget
    ? resolveSiteEntrySlug({
        contentId: input.contentId,
        slug: post.slug,
        title: post.title,
      })
    : post.slug;
  const path = resolveGitHubContentPath({
    contentId: input.contentId,
    customPath: input.path,
    directory,
    pathTemplate: outputConfig.success ? outputConfig.data.contentPath : null,
    slug: postSlug,
    title: post.title,
  });
  if (path.length > GITHUB_CONTENT_PATH_MAX_LENGTH) {
    const tErrors = await getTranslations("errors.content");
    throw badRequest(tErrors("filePathTooLong"));
  }

  const contentSlug =
    slugify(postSlug ?? "") || slugify(post.title) || input.contentId;
  const configuredImagePath = outputConfig.success
    ? outputConfig.data.imagePath
    : null;
  const imagePath =
    siteTarget && !configuredImagePath?.trim()
      ? resolveSiteImagePathTemplate(
          siteTarget.rootDirectory,
          input.contentType
        )
      : configuredImagePath;

  const notraBaseUrl = resolveNotraBaseUrl();
  let publishInstallationId = integration.installationId ?? null;
  let publishInstallationAccountType = integration.installationAccountType;
  let publishInstallationAccountLogin = integration.installationAccountLogin;
  if (connectionMethod === "github-app" && !publishInstallationId) {
    const fallback = selectGitHubAppInstallationForOwner(
      await listGitHubAppInstallationsByOrganization(input.organizationId),
      integration.owner
    );
    if (fallback) {
      publishInstallationId = fallback.installationId;
      publishInstallationAccountType = fallback.accountType;
      publishInstallationAccountLogin = fallback.accountLogin;
    }
  }
  if (connectionMethod === "github-app" && publishInstallationId) {
    const publishAccess = await getGitHubAppInstallationPublishAccess(
      publishInstallationId
    );
    if (githubAppInstallationCanPublishContent(publishAccess) === false) {
      const recovery = getGitHubAppPermissionsRecovery({
        installationId: publishInstallationId,
        installationAccountType: publishInstallationAccountType,
        installationAccountLogin: publishInstallationAccountLogin,
      });
      throw forbidden(
        await getGitHubRecoveryMessage(recovery.data),
        recovery.data
      );
    }
  }

  const token = await runOrpcEffect(
    getGitHubPublishTokenEffect(integration.id, {
      organizationId: input.organizationId,
    }),
    toGitHubOperationOrpcError
  );

  const storedPublish = postGitHubPublishSchema.safeParse(post.githubPublish);
  const linkedPullRequest =
    storedPublish.success &&
    storedPublish.data.repositoryId === integration.id &&
    storedPublish.data.owner.toLowerCase() ===
      integration.owner.toLowerCase() &&
    storedPublish.data.repo.toLowerCase() === integration.repo.toLowerCase()
      ? {
          branchName: storedPublish.data.branchName,
          number: storedPublish.data.pullRequestNumber,
        }
      : undefined;

  const siteEntryAuthor =
    siteTarget && input.contentType === "blog_post"
      ? await resolveSiteEntryAuthor({
          token,
          owner: integration.owner,
          repo: integration.repo,
          target: siteTarget,
          publisherUserId: options.publisherUserId,
          existingEntry:
            linkedPullRequest && storedPublish.success
              ? {
                  branchName: linkedPullRequest.branchName,
                  path: storedPublish.data.path,
                }
              : undefined,
        })
      : null;

  const octokit = createOctokit(token);
  const publisherLogin =
    getGitHubAppBotLogin() ??
    (await octokit
      .request("GET /user")
      .then(({ data }) => data.login)
      .catch(() => undefined));

  try {
    const publishedAt = new Date().toISOString();
    const previousPublication = await findOpenContentPublicationForPost({
      organizationId: input.organizationId,
      postId: input.contentId,
    });
    const result = await publishContentDraftPullRequest(octokit, {
      contentId: input.contentId,
      contentType: input.contentType,
      owner: integration.owner,
      repo: integration.repo,
      defaultBranch: integration.defaultBranch,
      path,
      title: post.title,
      markdown: savedMarkdown,
      organizationId: input.organizationId,
      ...(linkedPullRequest ? { linkedPullRequest } : {}),
      ...(input.linkedOnly ? { requireLinkedPullRequest: true } : {}),
      ...(publisherLogin ? { publisherLogin } : {}),
      prepareContent: async (contentPath: string) => {
        const preparedContent = await prepareR2GitHubContentAssets({
          contentPath,
          imagePathTemplate: resolveGitHubImagePathTemplate(
            contentPath,
            imagePath
          ),
          markdown: savedMarkdown,
          organizationId: input.organizationId,
          ...(siteTarget
            ? {
                publicDirectory: resolveSitePublicDirectory(
                  siteTarget.rootDirectory
                ),
              }
            : {}),
          slug: contentSlug,
        });
        if (
          preparedContent.assets.some(
            (asset) => asset.path.length > GITHUB_CONTENT_PATH_MAX_LENGTH
          )
        ) {
          const tErrors = await getTranslations("errors.content");
          throw badRequest(tErrors("imagePathTooLong"));
        }
        if (!siteTarget) {
          return preparedContent;
        }
        return {
          ...preparedContent,
          markdown: buildSiteEntryMarkdown({
            author: siteEntryAuthor,
            contentType: input.contentType,
            date: post.createdAt,
            markdown: preparedContent.markdown,
            title: post.title,
          }),
        };
      },
      ...(notraBaseUrl && organization
        ? {
            badgeUrls: buildOpenInNotraBadgeUrls(notraBaseUrl),
            contentUrl: `${notraBaseUrl}/${organization.slug}/content/${input.contentId}`,
          }
        : {}),
    });
    await clearGitHubPublishFailures({
      organizationId: input.organizationId,
      outputType: input.contentType,
      repositoryId: integration.id,
    });
    const githubPublish = postGitHubPublishSchema.safeParse({
      branchName: result.branchName,
      owner: integration.owner,
      path: result.path,
      pullRequestNumber: result.pullRequestNumber,
      pullRequestUrl: result.pullRequestUrl,
      repo: integration.repo,
      repositoryId: integration.id,
    });
    if (!githubPublish.success) {
      throw badRequest(
        (await getTranslations("errors.github"))("pullRequestUnavailable")
      );
    }
    // The pull request already exists; losing the mention mapping must not
    // report the publish as failed. Retry the mapping so a later mention
    // can still find the post.
    const publication = {
      organizationId: input.organizationId,
      postId: input.contentId,
      repositoryId: integration.id,
      owner: integration.owner,
      repo: integration.repo,
      path: result.path,
      branch: result.branchName,
      pullRequestNumber: result.pullRequestNumber,
      pullRequestUrl: result.pullRequestUrl,
      headSha: result.headSha,
      previousHeadSha: previousPublication?.headSha ?? null,
    };
    const logContext = {
      organizationId: input.organizationId,
      contentId: input.contentId,
      pullRequestUrl: result.pullRequestUrl,
    };
    // Queue the durable insert/close reconciliation before making the
    // mapping visible. A close event cannot be lost in the gap.
    let reconciliationScheduled = false;
    try {
      await startContentPublicationReconciliation(publication, publishedAt);
      reconciliationScheduled = true;
    } catch (error) {
      logError(
        "Failed to start content publication reconciliation",
        error,
        logContext
      );
    }
    try {
      await retryWrite(() =>
        reconcileContentPublication(
          { publication, publishedAt },
          githubAncestryValidator({
            octokit,
            owner: publication.owner,
            repo: publication.repo,
          })
        )
      );
      if (!reconciliationScheduled) {
        try {
          await startContentPublicationReconciliation(publication, publishedAt);
        } catch (startError) {
          logError(
            "Failed to start content publication reconciliation",
            startError,
            logContext
          );
        }
      }
    } catch (error) {
      logError("Failed to record content publication", error, logContext);
      // The PR already exists, so hand the idempotent mapping write to a
      // durable workflow instead of relying on this request process. The
      // publish itself succeeded, whatever happens to the handover.
      if (!reconciliationScheduled) {
        try {
          await startContentPublicationReconciliation(publication, publishedAt);
        } catch (startError) {
          logError(
            "Failed to start content publication reconciliation",
            startError,
            logContext
          );
        }
      }
    }
    // Keep metadata failure independent of the durable publication handoff.
    // A slower publish must not replace a link written since we read the post.
    try {
      await retryWrite(() =>
        db
          .update(posts)
          .set({ githubPublish: githubPublish.data })
          .where(
            and(
              eq(posts.id, input.contentId),
              eq(posts.organizationId, input.organizationId),
              sql`${posts.githubPublish} is not distinct from ${post.githubPublish === null ? null : JSON.stringify(post.githubPublish)}::jsonb`
            )
          )
      );
    } catch (error) {
      logError(
        "Failed to update GitHub publication metadata",
        error,
        logContext
      );
    }
    return result;
  } catch (error) {
    throw await toGitHubPublishOrpcError(error, {
      organizationId: input.organizationId,
      repositoryId: integration.id,
      outputId: contentOutput.id,
      outputType: input.contentType,
      connectionMethod,
      installationId: publishInstallationId,
      installationAccountType: publishInstallationAccountType,
      installationAccountLogin: publishInstallationAccountLogin,
    });
  }
}
