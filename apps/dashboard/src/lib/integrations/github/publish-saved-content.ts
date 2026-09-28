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
  recordContentPublication,
} from "@notra/ai/utils/content-publication";
import { githubAppInstallationCanPublishContent } from "@notra/ai/utils/github-app-publish-access";
import { getGitHubConnectionMethod } from "@notra/ai/utils/github-connection-method";
import { createOctokit } from "@notra/ai/utils/octokit";
import { retryWrite } from "@notra/ai/utils/retry-write";
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
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getTranslations } from "next-intl/server";

import {
  DEFAULT_GITHUB_CONTENT_DIRECTORIES,
  DEFAULT_GITHUB_CONTENT_OUTPUT_ENABLED,
} from "@/constants/github";
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
import type { PublishSavedContentInput } from "@/types/integrations/github-publish";
import { toGitHubOperationOrpcError } from "@/utils/github-operation-error";
import { getGitHubAppPermissionsRecovery } from "@/utils/github-publish-policy";

export async function publishSavedContentToGitHub(
  input: PublishSavedContentInput
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
      },
    }),
    db
      .select({
        id: githubIntegrations.id,
        owner: githubIntegrations.owner,
        repo: githubIntegrations.repo,
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
  const directory = outputConfig.success
    ? (outputConfig.data.directory ??
      DEFAULT_GITHUB_CONTENT_DIRECTORIES[input.contentType])
    : DEFAULT_GITHUB_CONTENT_DIRECTORIES[input.contentType];
  const path = resolveGitHubContentPath({
    contentId: input.contentId,
    customPath: input.path,
    directory,
    pathTemplate: outputConfig.success ? outputConfig.data.contentPath : null,
    slug: post.slug,
    title: post.title,
  });
  if (path.length > GITHUB_CONTENT_PATH_MAX_LENGTH) {
    const tErrors = await getTranslations("errors.content");
    throw badRequest(tErrors("filePathTooLong"));
  }

  const contentSlug =
    slugify(post.slug ?? "") || slugify(post.title) || input.contentId;

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
            outputConfig.success ? outputConfig.data.imagePath : null
          ),
          markdown: savedMarkdown,
          organizationId: input.organizationId,
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
        return preparedContent;
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
    await db
      .update(posts)
      .set({ githubPublish: githubPublish.data })
      .where(
        and(
          eq(posts.id, input.contentId),
          eq(posts.organizationId, input.organizationId)
        )
      );
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
      console.error("Failed to start content publication reconciliation", {
        ...logContext,
        error,
      });
    }
    try {
      const recordedPublication = await retryWrite(() =>
        recordContentPublication(publication, publishedAt)
      );
      if (
        recordedPublication &&
        recordedPublication.headSha !== result.headSha
      ) {
        const currentPublication = await findOpenContentPublicationForPost({
          organizationId: input.organizationId,
          postId: input.contentId,
        });
        if (
          currentPublication?.id === recordedPublication.id &&
          currentPublication.headSha === recordedPublication.headSha
        ) {
          await retryWrite(() =>
            recordContentPublication(
              {
                ...publication,
                previousHeadSha: currentPublication.headSha,
              },
              publishedAt
            )
          );
        }
      }
      if (!reconciliationScheduled) {
        try {
          await startContentPublicationReconciliation(publication, publishedAt);
        } catch (startError) {
          console.error("Failed to start content publication reconciliation", {
            ...logContext,
            error: startError,
          });
        }
      }
    } catch (error) {
      console.error("Failed to record content publication", {
        ...logContext,
        error,
      });
      // The PR already exists, so hand the idempotent mapping write to a
      // durable workflow instead of relying on this request process. The
      // publish itself succeeded, whatever happens to the handover.
      if (!reconciliationScheduled) {
        try {
          await startContentPublicationReconciliation(publication, publishedAt);
        } catch (startError) {
          console.error("Failed to start content publication reconciliation", {
            ...logContext,
            error: startError,
          });
        }
      }
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
