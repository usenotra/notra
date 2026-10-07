import { checkContentBilling } from "@notra/ai/billing/content-billing";
import { getTokenForIntegrationId } from "@notra/ai/integrations/github";
import {
  getDecryptedLinearToken,
  getLinearIntegrationsByOrganization,
} from "@notra/ai/integrations/linear";
import { type ContentType, contentTypeSchema } from "@notra/ai/schemas/content";
import { supportsPostSlug } from "@notra/ai/schemas/post";
import {
  createLinearClient,
  getLinearIssuePreviews,
} from "@notra/ai/utils/linear";
import { createOctokit } from "@notra/ai/utils/octokit";
import { sanitizeMarkdownHtml } from "@notra/ai/utils/sanitize";
import { logError } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import { githubIntegrations, postCollections, posts } from "@notra/db/schema";
import type { BlogPostSubtype } from "@notra/db/types/content";
import { buildPostCollectionName } from "@notra/db/utils/post-collections";
import { extractImageArtifactHtml } from "@notra/db/utils/post-image-artifacts";
import {
  isProjectInOrganization,
  projectScopeFilter,
} from "@notra/db/utils/projects";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  contentListQuerySchema,
  contentRecentsQuerySchema,
  dashboardHomeContentQuerySchema,
} from "@notra/schemas/dashboard/api-params";
import type {
  ContentResponse,
  PostsResponse,
} from "@notra/schemas/dashboard/content";
import {
  contentInputSchema,
  contentOrganizationIdInputSchema,
  contentPreviewRequestSchema,
  createPostCollectionInputSchema,
  createPostInputSchema,
  generateContentInputSchema,
  postCollectionInputSchema,
  postCollectionsListInputSchema,
  postGitHubPublishSchema,
  publishContentToGitHubSchema,
  renamePostCollectionInputSchema,
  updateContentSchema,
  updateExpectedPostCountInputSchema,
} from "@notra/schemas/dashboard/content";
import { clearCompletedGenerationSchema } from "@notra/schemas/dashboard/generations";
import { slugify } from "@notra/utils/slugify";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { marked } from "marked";
import { nanoid } from "nanoid";

import {
  DASHBOARD_HOME_POST_LIMIT,
  GITHUB_API_MAX_PAGES,
  GITHUB_API_MAX_RESULTS,
  GITHUB_API_PAGE_SIZE,
} from "@/constants/content-preview";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { getEnabledDataPoints } from "@/lib/analytics/studio-events";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { assertActiveSubscription } from "@/lib/billing/subscription";
import { getUtcDayRange } from "@/lib/content/content-calendar";
import { getContentPublishingMetrics } from "@/lib/content/content-publishing-metrics.server";
import { projectScopedCollectionIds } from "@/lib/content/project-scope";
import { afterResponse } from "@/lib/framework/after-response";
import {
  addActiveGeneration,
  clearCompletedGeneration,
  generateRunId,
  getActiveGenerations,
  getCompletedGenerations,
} from "@/lib/generations/tracking";
import { requestGeoRescanForPublishedPost } from "@/lib/geo/rescan";
import { getTranslations } from "@/lib/i18n/server";
import { publishSavedContentToGitHub } from "@/lib/integrations/github/publish-saved-content";
import { baseProcedure } from "@/lib/orpc/base";
import { startOnDemandRun } from "@/lib/workflows/start";
import type {
  CommitPreview,
  LinearIntegrationPreviewItem,
  PullRequestPreview,
  ReleasePreview,
  RepositoryPreview,
  RepositoryPreviewFailure,
} from "@/types/content/preview";
import { resolveLookbackRange } from "@/utils/lookback";
import { ratelimit } from "@/utils/ratelimit";

import {
  assertNotDemo,
  badRequest,
  conflict,
  internalServerError,
  notFound,
  paymentRequired,
  tooManyRequests,
} from "../utils/errors";

const TITLE_REGEX = /^#\s+(.+)$/m;

// Upper bound for the sibling rail on the content detail response; matches the
// maximum page size of the content list.
const CONTENT_SIBLING_LIMIT = 100;

const postReadColumns = {
  id: true,
  organizationId: true,
  collectionId: true,
  title: true,
  slug: true,
  content: true,
  htmlUrl: true,
  markdown: true,
  recommendations: true,
  contentType: true,
  contentSubtype: true,
  createdAt: true,
  sourceMetadata: true,
  githubPublish: true,
  status: true,
  updatedAt: true,
} as const;

// List consumers (sidebar "Recent", dashboard home cards) render a title, a
// status and a two-line preview, so text bodies stay in the database.
const POST_LIST_MARKDOWN_PREVIEW_CHARS = 2000;

const postListColumns = {
  id: true,
  title: true,
  slug: true,
  htmlUrl: true,
  contentType: true,
  contentSubtype: true,
  createdAt: true,
  status: true,
  updatedAt: true,
} as const;

const postListExtras = {
  content:
    sql<string>`case when ${posts.contentType} = 'image' then ${posts.content} else '' end`.as(
      "content"
    ),
  markdown: sql<
    string | null
  >`case when ${posts.contentType} = 'image' then ${posts.markdown} else left(${posts.markdown}, ${POST_LIST_MARKDOWN_PREVIEW_CHARS}) end`.as(
    "markdown"
  ),
};

function serializePost(post: {
  content: string;
  contentType: string;
  contentSubtype: BlogPostSubtype | null;
  createdAt: Date;
  htmlUrl: string | null;
  id: string;
  markdown: string | null;
  slug: string | null;
  status: "draft" | "published";
  title: string;
  updatedAt: Date;
}): PostsResponse["posts"][number] {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    htmlUrl: post.contentType === "image" ? post.htmlUrl : null,
    markdown: post.markdown,
    contentType:
      post.contentType as PostsResponse["posts"][number]["contentType"],
    contentSubtype: post.contentSubtype,
    status: post.status,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

function serializeContent(post: {
  content: string;
  contentType: string;
  createdAt: Date;
  htmlUrl: string | null;
  id: string;
  markdown: string | null;
  recommendations: string | null;
  slug: string | null;
  sourceMetadata: unknown;
  githubPublish: unknown;
  status: "draft" | "published";
  title: string;
}): ContentResponse {
  const githubPublish = postGitHubPublishSchema.safeParse(post.githubPublish);

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    htmlUrl: post.contentType === "image" ? post.htmlUrl : null,
    markdown: post.markdown,
    rawHtml: extractImageArtifactHtml(post.sourceMetadata),
    recommendations: post.recommendations,
    contentType: post.contentType as ContentResponse["contentType"],
    status: post.status,
    date: post.createdAt.toISOString(),
    sourceMetadata: post.sourceMetadata as ContentResponse["sourceMetadata"],
    githubPublish: githubPublish.success ? githubPublish.data : null,
  };
}

function normalizeContentTypes(contentTypes: string[]): ContentType[] {
  const normalized: ContentType[] = [];

  for (const contentType of contentTypes) {
    const parsed = contentTypeSchema.safeParse(contentType);
    if (parsed.success && !normalized.includes(parsed.data)) {
      normalized.push(parsed.data);
    }
  }

  return normalized;
}

function normalizeContentType(contentType: string): ContentType {
  return contentTypeSchema.parse(contentType);
}

function formatFailureMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

export async function buildContentUpdateData(
  existingTitle: string,
  input: {
    markdown?: string;
    status?: "draft" | "published";
    title?: string;
  }
) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (input.title !== undefined) {
    updateData.title = input.title;
  }

  if (input.markdown !== undefined) {
    const titleMatch = input.markdown.match(TITLE_REGEX);
    updateData.markdown = input.markdown;

    if (input.title === undefined) {
      updateData.title = titleMatch?.[1] ?? existingTitle;
    }

    updateData.content = sanitizeMarkdownHtml(
      await marked.parse(input.markdown)
    );
  }

  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  return updateData;
}

async function fetchReleasesPreview(params: {
  end: Date;
  octokit: ReturnType<typeof createOctokit>;
  owner: string;
  repo: string;
  start: Date;
}): Promise<ReleasePreview[]> {
  const { octokit, owner, repo, start, end } = params;
  const results: ReleasePreview[] = [];
  let page = 1;

  while (page <= GITHUB_API_MAX_PAGES) {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/releases",
      {
        owner,
        repo,
        per_page: GITHUB_API_PAGE_SIZE,
        page,
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
      }
    );

    const releases = response.data;

    if (releases.length === 0) {
      break;
    }

    for (const release of releases) {
      if (!release.published_at) {
        continue;
      }

      const publishedDate = new Date(release.published_at);

      if (publishedDate >= start && publishedDate <= end) {
        results.push({
          tagName: release.tag_name,
          name: release.name ?? release.tag_name,
          publishedAt: release.published_at,
          authorLogin: release.author?.login ?? "Unknown",
          htmlUrl: release.html_url,
          prerelease: release.prerelease,
        });
      }
    }

    const oldest = releases.at(-1);

    if (!oldest?.published_at || new Date(oldest.published_at) < start) {
      break;
    }

    if (releases.length < GITHUB_API_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return results.slice(0, GITHUB_API_MAX_RESULTS);
}

async function fetchMergedPullRequestsPreview(params: {
  end: Date;
  octokit: ReturnType<typeof createOctokit>;
  owner: string;
  repo: string;
  start: Date;
}): Promise<PullRequestPreview[]> {
  const { octokit, owner, repo, start, end } = params;
  const mergedPullRequests: PullRequestPreview[] = [];
  let page = 1;

  while (page <= GITHUB_API_MAX_PAGES) {
    const response = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
      owner,
      repo,
      state: "closed",
      sort: "updated",
      direction: "desc",
      per_page: GITHUB_API_PAGE_SIZE,
      page,
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });

    const pullRequests = response.data;

    if (pullRequests.length === 0) {
      break;
    }

    for (const pullRequest of pullRequests) {
      if (!pullRequest.merged_at) {
        continue;
      }

      const mergedAt = new Date(pullRequest.merged_at);

      if (mergedAt < start || mergedAt > end) {
        continue;
      }

      mergedPullRequests.push({
        number: pullRequest.number,
        title: pullRequest.title,
        state: pullRequest.state,
        merged: true,
        authorLogin: pullRequest.user?.login ?? "Unknown",
        mergedAt: pullRequest.merged_at,
        htmlUrl: pullRequest.html_url,
      });
    }

    if (pullRequests.length < GITHUB_API_PAGE_SIZE) {
      break;
    }

    const oldestUpdatedAt = pullRequests.at(-1)?.updated_at;

    if (!oldestUpdatedAt || new Date(oldestUpdatedAt) < start) {
      break;
    }

    page += 1;
  }

  return mergedPullRequests
    .sort((left, right) => {
      const leftMergedAt = left.mergedAt
        ? new Date(left.mergedAt).getTime()
        : 0;
      const rightMergedAt = right.mergedAt
        ? new Date(right.mergedAt).getTime()
        : 0;

      return rightMergedAt - leftMergedAt;
    })
    .slice(0, GITHUB_API_MAX_RESULTS);
}

async function fetchCommitsPreview(params: {
  end: Date;
  octokit: ReturnType<typeof createOctokit>;
  owner: string;
  repo: string;
  start: Date;
}): Promise<CommitPreview[]> {
  const { octokit, owner, repo, start, end } = params;
  const results: CommitPreview[] = [];
  let page = 1;

  while (page <= GITHUB_API_MAX_PAGES) {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/commits",
      {
        owner,
        repo,
        since: start.toISOString(),
        until: end.toISOString(),
        per_page: GITHUB_API_PAGE_SIZE,
        page,
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
      }
    );

    const commits = response.data;

    if (commits.length === 0) {
      break;
    }

    for (const commit of commits) {
      results.push({
        sha: commit.sha,
        message: commit.commit.message.split("\n")[0] ?? "",
        authorName: commit.commit.author?.name ?? "Unknown",
        authorLogin: commit.author?.login ?? null,
        authoredAt: commit.commit.author?.date ?? "",
        htmlUrl: commit.html_url,
      });
    }

    if (commits.length < GITHUB_API_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return results.slice(0, GITHUB_API_MAX_RESULTS);
}

export const contentRouter = {
  home: {
    get: baseProcedure
      .input(
        contentOrganizationIdInputSchema.and(dashboardHomeContentQuerySchema)
      )
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const dateRange = getUtcDayRange("today");
        const filters = [eq(posts.organizationId, input.organizationId)];
        const collectionIds = projectScopedCollectionIds(
          input.organizationId,
          input.projectId
        );

        if (collectionIds) {
          filters.push(inArray(posts.collectionId, collectionIds));
        }
        if (dateRange) {
          filters.push(
            gte(posts.createdAt, dateRange.startDate),
            lt(posts.createdAt, dateRange.endDate)
          );
        }

        const items = await db.query.posts.findMany({
          where: and(...filters),
          orderBy: [desc(posts.createdAt), desc(posts.id)],
          limit: DASHBOARD_HOME_POST_LIMIT,
          columns: postListColumns,
          extras: postListExtras,
        });

        return {
          posts: items.map(serializePost),
        };
      }),
  },
  recents: baseProcedure
    .input(contentOrganizationIdInputSchema.and(contentRecentsQuerySchema))
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });

      const filters = [eq(posts.organizationId, input.organizationId)];
      const collectionIds = projectScopedCollectionIds(
        input.organizationId,
        input.projectId
      );
      if (collectionIds) {
        filters.push(inArray(posts.collectionId, collectionIds));
      }

      const items = await db.query.posts.findMany({
        where: and(...filters),
        orderBy: [desc(posts.createdAt), desc(posts.id)],
        limit: input.limit,
        columns: {
          id: true,
          title: true,
          status: true,
        },
      });

      return { posts: items };
    }),
  list: baseProcedure
    .input(contentOrganizationIdInputSchema.and(contentListQuerySchema))
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });

      const dateRange = getUtcDayRange(input.date ?? null);

      if (input.date && !dateRange) {
        throw badRequest(
          (await getTranslations("errors.actions"))("invalidInput")
        );
      }

      const baseFilters = [eq(posts.organizationId, input.organizationId)];
      const projectCollectionIds = projectScopedCollectionIds(
        input.organizationId,
        input.projectId
      );
      if (projectCollectionIds) {
        baseFilters.push(inArray(posts.collectionId, projectCollectionIds));
      }

      if (dateRange) {
        baseFilters.push(
          gte(posts.createdAt, dateRange.startDate),
          lt(posts.createdAt, dateRange.endDate)
        );
      }

      const whereClause = and(...baseFilters);
      const offset = (input.page - 1) * input.pageSize;

      const [items, totalCountResult] = await Promise.all([
        db.query.posts.findMany({
          where: whereClause,
          orderBy: [desc(posts.createdAt), desc(posts.id)],
          limit: input.pageSize,
          offset,
          columns: postListColumns,
          extras: postListExtras,
        }),
        db.select({ value: count() }).from(posts).where(whereClause),
      ]);

      const totalCount = totalCountResult[0]?.value ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalCount / input.pageSize));

      return {
        posts: items.map(serializePost),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalCount,
          totalPages,
        },
      };
    }),
  get: baseProcedure
    .input(contentInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });

      const post = await db.query.posts.findFirst({
        where: and(
          eq(posts.id, input.contentId),
          eq(posts.organizationId, input.organizationId)
        ),
        columns: postReadColumns,
      });

      if (!post) {
        throw notFound("Content not found");
      }

      const collection = await db.query.postCollections.findFirst({
        where: and(
          eq(postCollections.id, post.collectionId),
          eq(postCollections.organizationId, input.organizationId)
        ),
        with: {
          posts: {
            columns: {
              id: true,
              title: true,
              contentType: true,
              status: true,
            },
            // The current post is excluded in SQL, and the rail is bounded: a
            // collection can hold hundreds of posts.
            where: ne(posts.id, post.id),
            orderBy: [asc(posts.createdAt), asc(posts.id)],
            limit: CONTENT_SIBLING_LIMIT,
          },
        },
      });

      return {
        content: serializeContent(post),
        collection: collection
          ? {
              id: collection.id,
              name: collection.name,
              source: collection.source,
              siblings: collection.posts.map((sibling) => ({
                id: sibling.id,
                title: sibling.title,
                contentType: normalizeContentType(sibling.contentType),
                status: sibling.status,
              })),
            }
          : null,
      };
    }),
  create: baseProcedure
    .input(createPostInputSchema)
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      await assertActiveSubscription(input.organizationId);

      if (
        input.projectId &&
        !(await isProjectInOrganization(input.organizationId, input.projectId))
      ) {
        throw badRequest((await getTranslations("errors.server"))("notFound"));
      }

      if (input.slug && !supportsPostSlug(input.contentType)) {
        const tErrors = await getTranslations("errors.content");
        throw badRequest(tErrors("slugNotSupported"));
      }

      const now = new Date();
      const collectionId = nanoid();
      const contentId = nanoid();
      const markdown = input.markdown ?? "";
      const content =
        markdown.length > 0
          ? sanitizeMarkdownHtml(await marked.parse(markdown))
          : "";

      try {
        await db.transaction(async (tx) => {
          await tx.insert(postCollections).values({
            id: collectionId,
            organizationId: input.organizationId,
            projectId: input.projectId ?? null,
            source: "manual",
            sourceId: collectionId,
            name: buildPostCollectionName([input.contentType], now),
            nameSource: "generated",
            contentTypes: [input.contentType],
            expectedPostCount: 1,
            completedPostCount: 1,
            createdAt: now,
            updatedAt: now,
          });

          await tx.insert(posts).values({
            id: contentId,
            organizationId: input.organizationId,
            collectionId,
            title: input.title,
            slug: input.slug ?? null,
            content,
            markdown,
            contentType: input.contentType,
            status: "draft",
            sourceMetadata: null,
            createdAt: now,
            updatedAt: now,
          });
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
        ) {
          const tErrors = await getTranslations("errors.content");
          throw conflict(tErrors("slugTaken"));
        }
        throw error;
      }

      trackServerEvent({
        event: POSTHOG_EVENTS.CONTENT_SAVED,
        headers: context.headers,
        userId: auth.user.id,
        organizationId: input.organizationId,
        properties: {
          content_id: contentId,
          type: input.contentType,
        },
      });

      return { contentId, collectionId };
    }),
  update: baseProcedure
    .input(contentInputSchema.and(updateContentSchema))
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      await assertActiveSubscription(input.organizationId);

      const existingPost = await db.query.posts.findFirst({
        where: and(
          eq(posts.id, input.contentId),
          eq(posts.organizationId, input.organizationId)
        ),
        columns: {
          title: true,
          contentType: true,
          status: true,
        },
      });

      if (!existingPost) {
        throw notFound("Content not found");
      }

      const updateData = await buildContentUpdateData(
        existingPost.title,
        input
      );

      if (input.slug !== undefined) {
        if (!supportsPostSlug(existingPost.contentType)) {
          const tErrors = await getTranslations("errors.content");
          throw badRequest(tErrors("slugNotSupported"));
        }
        updateData.slug = input.slug;
      }

      try {
        const [updatedPost] = await db.transaction(async (tx) => {
          const rows = await tx
            .update(posts)
            .set(updateData)
            .where(
              and(
                eq(posts.id, input.contentId),
                eq(posts.organizationId, input.organizationId)
              )
            )
            .returning({
              id: posts.id,
              organizationId: posts.organizationId,
              collectionId: posts.collectionId,
              title: posts.title,
              slug: posts.slug,
              content: posts.content,
              htmlUrl: posts.htmlUrl,
              markdown: posts.markdown,
              recommendations: posts.recommendations,
              contentType: posts.contentType,
              createdAt: posts.createdAt,
              sourceMetadata: posts.sourceMetadata,
              githubPublish: posts.githubPublish,
              status: posts.status,
              updatedAt: posts.updatedAt,
            });
          return rows;
        });

        if (!updatedPost) {
          throw internalServerError("Failed to update content");
        }

        if (input.markdown !== undefined) {
          trackServerEvent({
            event: POSTHOG_EVENTS.CONTENT_SAVED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              content_id: input.contentId,
              type: existingPost.contentType,
            },
          });
        }

        if (
          input.status !== undefined &&
          input.status !== existingPost.status
        ) {
          trackServerEvent({
            event:
              input.status === "published"
                ? POSTHOG_EVENTS.CONTENT_PUBLISHED
                : POSTHOG_EVENTS.CONTENT_UNPUBLISHED,
            headers: context.headers,
            userId: auth.user.id,
            organizationId: input.organizationId,
            properties: {
              content_id: input.contentId,
              type: existingPost.contentType,
            },
          });
        }

        if (
          updatedPost.status === "published" &&
          existingPost.status !== "published"
        ) {
          afterResponse(() =>
            requestGeoRescanForPublishedPost({
              organizationId: input.organizationId,
              postId: updatedPost.id,
            })
          );
        }

        return {
          success: true,
          content: serializeContent(updatedPost),
        };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
        ) {
          const tErrors = await getTranslations("errors.content");
          throw conflict(tErrors("slugTaken"));
        }
        throw error;
      }
    }),
  publishChangelogToGitHub: baseProcedure
    .input(contentInputSchema.and(publishContentToGitHubSchema))
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      await assertActiveSubscription(input.organizationId);
      // The demo's repository is fictional; GitHub writes need a real one.
      assertNotDemo();

      if (
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        const { success: withinLimit } = await ratelimit.githubPublish.limit(
          `${auth.user.id}:${input.organizationId}`
        );
        if (!withinLimit) {
          const tErrors = await getTranslations("errors.content");
          throw tooManyRequests(tErrors("tooManyPublishRequests"));
        }
      }

      return publishSavedContentToGitHub(input);
    }),
  delete: baseProcedure
    .input(contentInputSchema)
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });

      const existingPost = await db.query.posts.findFirst({
        where: and(
          eq(posts.id, input.contentId),
          eq(posts.organizationId, input.organizationId)
        ),
        columns: {
          id: true,
          contentType: true,
        },
      });

      if (!existingPost) {
        throw notFound("Content not found");
      }

      await db
        .delete(posts)
        .where(
          and(
            eq(posts.id, input.contentId),
            eq(posts.organizationId, input.organizationId)
          )
        );

      trackServerEvent({
        event: POSTHOG_EVENTS.CONTENT_DELETED,
        headers: context.headers,
        userId: auth.user.id,
        organizationId: input.organizationId,
        properties: {
          content_id: input.contentId,
          type: existingPost.contentType,
        },
      });

      return { success: true };
    }),
  collections: {
    list: baseProcedure
      .input(postCollectionsListInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const whereClause = and(
          eq(postCollections.organizationId, input.organizationId),
          projectScopeFilter(postCollections.projectId, input.projectId)
        );
        const offset = (input.page - 1) * input.pageSize;

        const [collectionRows, totalCountResult] = await Promise.all([
          db.query.postCollections.findMany({
            where: whereClause,
            orderBy: [
              desc(postCollections.createdAt),
              desc(postCollections.id),
            ],
            limit: input.pageSize,
            offset,
          }),
          db
            .select({ value: count() })
            .from(postCollections)
            .where(whereClause),
        ]);

        const collectionIds = collectionRows.map((collection) => collection.id);
        // One row per collection: counting and de-duplicating the content types
        // in Postgres avoids shipping every post of every listed collection.
        const aggregateRows =
          collectionIds.length > 0
            ? await db
                .select({
                  collectionId: posts.collectionId,
                  total: sql<number>`count(*)::int`,
                  draft: sql<number>`count(*) filter (where ${posts.status} <> 'published')::int`,
                  published: sql<number>`count(*) filter (where ${posts.status} = 'published')::int`,
                  postId: sql<
                    string | null
                  >`case when count(*) = 1 then min(${posts.id}) end`,
                  postTitle: sql<
                    string | null
                  >`case when count(*) = 1 then min(${posts.title}) end`,
                  types: sql<
                    string[] | null
                  >`array_agg(distinct ${posts.contentType})`,
                })
                .from(posts)
                .where(inArray(posts.collectionId, collectionIds))
                .groupBy(posts.collectionId)
            : [];

        const aggregates = new Map(
          aggregateRows.map((row) => [
            row.collectionId,
            {
              total: Number(row.total),
              draft: Number(row.draft),
              published: Number(row.published),
              types: row.types ?? [],
              postId: row.postId,
              postTitle: row.postTitle,
            },
          ])
        );

        const collections = collectionRows.map((collection) => {
          const aggregate = aggregates.get(collection.id);
          const storedTypes = Array.isArray(collection.contentTypes)
            ? collection.contentTypes.filter(
                (type): type is string => typeof type === "string"
              )
            : [];
          const contentTypes = normalizeContentTypes(
            aggregate && aggregate.types.length > 0
              ? aggregate.types
              : storedTypes
          );
          const postCount = aggregate?.total ?? 0;
          const isGenerating =
            collection.expectedPostCount !== null &&
            collection.completedPostCount < collection.expectedPostCount;

          return {
            id: collection.id,
            name: collection.name,
            source: collection.source,
            nameSource: collection.nameSource,
            contentTypes,
            postCount,
            singlePost:
              postCount === 1 && aggregate?.postId
                ? {
                    id: aggregate.postId,
                    title: aggregate.postTitle ?? collection.name,
                  }
                : null,
            expectedPostCount: collection.expectedPostCount,
            isGenerating,
            statusSummary: {
              total: postCount,
              draft: aggregate?.draft ?? 0,
              published: aggregate?.published ?? 0,
            },
            createdAt: collection.createdAt.toISOString(),
          };
        });

        const totalCount = totalCountResult[0]?.value ?? 0;
        const totalPages = Math.max(1, Math.ceil(totalCount / input.pageSize));

        return {
          collections,
          pagination: {
            page: input.page,
            pageSize: input.pageSize,
            totalCount,
            totalPages,
          },
        };
      }),
    get: baseProcedure
      .input(postCollectionInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const collection = await db.query.postCollections.findFirst({
          where: and(
            eq(postCollections.id, input.collectionId),
            eq(postCollections.organizationId, input.organizationId)
          ),
          with: {
            posts: {
              columns: {
                id: true,
                title: true,
                content: true,
                markdown: true,
                contentType: true,
                contentSubtype: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: [asc(posts.createdAt), asc(posts.id)],
            },
          },
        });

        if (!collection) {
          throw notFound("Post collection not found");
        }

        const storedTypes = Array.isArray(collection.contentTypes)
          ? collection.contentTypes.filter(
              (type): type is string => typeof type === "string"
            )
          : [];
        const postTypes: string[] = [];
        for (const post of collection.posts) {
          if (!postTypes.includes(post.contentType)) {
            postTypes.push(post.contentType);
          }
        }
        const isGenerating =
          collection.expectedPostCount !== null &&
          collection.completedPostCount < collection.expectedPostCount;

        return {
          collection: {
            id: collection.id,
            name: collection.name,
            source: collection.source,
            nameSource: collection.nameSource,
            contentTypes: normalizeContentTypes(
              postTypes.length > 0 ? postTypes : storedTypes
            ),
            expectedPostCount: collection.expectedPostCount,
            isGenerating,
            createdAt: collection.createdAt.toISOString(),
            posts: collection.posts.map((post) => ({
              id: post.id,
              title: post.title,
              content: post.content,
              markdown: post.markdown,
              contentType: normalizeContentType(post.contentType),
              contentSubtype: post.contentSubtype,
              status: post.status,
              createdAt: post.createdAt.toISOString(),
              updatedAt: post.updatedAt.toISOString(),
            })),
          },
        };
      }),
    rename: baseProcedure
      .input(renamePostCollectionInputSchema)
      .handler(async ({ context, input }) => {
        const auth = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        const [updatedCollection] = await db
          .update(postCollections)
          .set({
            name: input.name,
            nameSource: "user",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(postCollections.id, input.collectionId),
              eq(postCollections.organizationId, input.organizationId)
            )
          )
          .returning();

        if (!updatedCollection) {
          throw notFound("Post collection not found");
        }

        trackServerEvent({
          event: POSTHOG_EVENTS.COLLECTION_RENAMED,
          headers: context.headers,
          userId: auth.user.id,
          organizationId: input.organizationId,
          properties: {
            collection_id: updatedCollection.id,
          },
        });

        return {
          collection: {
            id: updatedCollection.id,
            name: updatedCollection.name,
            nameSource: updatedCollection.nameSource,
          },
        };
      }),
    delete: baseProcedure
      .input(postCollectionInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const [deletedCollection] = await db
          .delete(postCollections)
          .where(
            and(
              eq(postCollections.id, input.collectionId),
              eq(postCollections.organizationId, input.organizationId),
              or(
                isNull(postCollections.expectedPostCount),
                gte(
                  postCollections.completedPostCount,
                  postCollections.expectedPostCount
                )
              )
            )
          )
          .returning({ id: postCollections.id });

        if (!deletedCollection) {
          const existingCollection = await db.query.postCollections.findFirst({
            where: and(
              eq(postCollections.id, input.collectionId),
              eq(postCollections.organizationId, input.organizationId)
            ),
            columns: { id: true },
          });

          if (!existingCollection) {
            throw notFound("Post collection not found");
          }

          throw conflict("Cannot delete a collection while it is generating");
        }

        return { success: true };
      }),
    updateExpectedPostCount: baseProcedure
      .input(updateExpectedPostCountInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        const [updatedCollection] = await db
          .update(postCollections)
          .set({
            expectedPostCount: input.expectedPostCount,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(postCollections.id, input.collectionId),
              eq(postCollections.organizationId, input.organizationId)
            )
          )
          .returning({ id: postCollections.id });

        if (!updatedCollection) {
          throw notFound("Post collection not found");
        }

        return { success: true };
      }),
  },
  metrics: {
    get: baseProcedure
      .input(contentOrganizationIdInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        return getContentPublishingMetrics(input.organizationId);
      }),
  },
  preview: baseProcedure
    .input(contentOrganizationIdInputSchema.and(contentPreviewRequestSchema))
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });

      const lookback = resolveLookbackRange(
        input.lookbackWindow,
        input.timezone
      );
      const repositories = await db
        .select({
          id: githubIntegrations.id,
          owner: githubIntegrations.owner,
          repo: githubIntegrations.repo,
        })
        .from(githubIntegrations)
        .where(
          and(
            eq(githubIntegrations.organizationId, input.organizationId),
            eq(githubIntegrations.enabled, true),
            inArray(githubIntegrations.id, input.repositoryIds)
          )
        );

      const failures: RepositoryPreviewFailure[] = [];
      const repoById = new Map(
        repositories.map((repository) => [repository.id, repository])
      );

      for (const repositoryId of input.repositoryIds) {
        if (!repoById.has(repositoryId)) {
          failures.push({
            repositoryId,
            owner: null,
            repo: null,
            stage: "repository_lookup",
            message: "Repository was not found or is not enabled",
          });
        }
      }

      const validRepos = repositories.filter(
        (
          repository
        ): repository is (typeof repositories)[number] & {
          owner: string;
          repo: string;
        } => {
          if (repository.owner && repository.repo) {
            return true;
          }

          failures.push({
            repositoryId: repository.id,
            owner: repository.owner,
            repo: repository.repo,
            stage: "repository_metadata",
            message: "Repository is missing owner or name",
          });

          return false;
        }
      );

      const repositoryResults = await Promise.all(
        validRepos.map(async (repository) => {
          let token: string | null = null;

          try {
            token = await getTokenForIntegrationId(repository.id, {
              organizationId: input.organizationId,
            });
          } catch (error) {
            return {
              repository: null,
              failures: [
                {
                  repositoryId: repository.id,
                  owner: repository.owner,
                  repo: repository.repo,
                  stage: "token" as const,
                  message: formatFailureMessage(error),
                },
              ],
            };
          }

          const octokit = createOctokit(token ?? undefined);
          const [commitsResult, pullsResult, releasesResult] =
            await Promise.allSettled([
              input.includeCommits
                ? fetchCommitsPreview({
                    octokit,
                    owner: repository.owner,
                    repo: repository.repo,
                    start: lookback.start,
                    end: lookback.end,
                  })
                : Promise.resolve([]),
              input.includePullRequests
                ? fetchMergedPullRequestsPreview({
                    octokit,
                    owner: repository.owner,
                    repo: repository.repo,
                    start: lookback.start,
                    end: lookback.end,
                  })
                : Promise.resolve([]),
              input.includeReleases
                ? fetchReleasesPreview({
                    octokit,
                    owner: repository.owner,
                    repo: repository.repo,
                    start: lookback.start,
                    end: lookback.end,
                  })
                : Promise.resolve([]),
            ]);

          const repoFailures: RepositoryPreviewFailure[] = [];
          const commits =
            commitsResult.status === "fulfilled" ? commitsResult.value : [];

          if (commitsResult.status === "rejected") {
            repoFailures.push({
              repositoryId: repository.id,
              owner: repository.owner,
              repo: repository.repo,
              stage: "commits",
              message: formatFailureMessage(commitsResult.reason),
            });
          }

          const pullRequests =
            pullsResult.status === "fulfilled" ? pullsResult.value : [];

          if (pullsResult.status === "rejected") {
            repoFailures.push({
              repositoryId: repository.id,
              owner: repository.owner,
              repo: repository.repo,
              stage: "pull_requests",
              message: formatFailureMessage(pullsResult.reason),
            });
          }

          const releases =
            releasesResult.status === "fulfilled" ? releasesResult.value : [];

          if (releasesResult.status === "rejected") {
            repoFailures.push({
              repositoryId: repository.id,
              owner: repository.owner,
              repo: repository.repo,
              stage: "releases",
              message: formatFailureMessage(releasesResult.reason),
            });
          }

          return {
            repository: {
              repositoryId: repository.id,
              owner: repository.owner,
              repo: repository.repo,
              commits,
              pullRequests,
              releases,
            } satisfies RepositoryPreview,
            failures: repoFailures,
          };
        })
      );

      const results = repositoryResults
        .map((result) => {
          failures.push(...result.failures);
          return result.repository;
        })
        .filter(
          (repository): repository is RepositoryPreview => repository !== null
        );

      let linearIntegrationPreviews: LinearIntegrationPreviewItem[] = [];

      if (input.linearIntegrationIds && input.linearIntegrationIds.length > 0) {
        const linearIntegrations = await getLinearIntegrationsByOrganization(
          input.organizationId
        );
        const requestedIds = new Set(input.linearIntegrationIds);
        const enabledIntegrations = linearIntegrations.filter(
          (i) => i.enabled && requestedIds.has(i.id)
        );

        linearIntegrationPreviews = await Promise.all(
          enabledIntegrations.map(async (integration) => {
            try {
              const token = await getDecryptedLinearToken(integration.id);
              if (!token) {
                return {
                  integrationId: integration.id,
                  displayName: integration.displayName,
                  issues: [],
                };
              }

              const client = createLinearClient(token);
              const filter: Record<string, unknown> = {
                completedAt: { null: false },
              };

              if (integration.linearTeamId) {
                filter.team = { id: { eq: integration.linearTeamId } };
              }

              filter.completedAt = {
                gte: lookback.start.toISOString(),
                lte: lookback.end.toISOString(),
              };

              const issues = await getLinearIssuePreviews(client, {
                filter,
                first: 50,
                orderBy: "updatedAt" as never,
              });

              return {
                integrationId: integration.id,
                displayName: integration.displayName,
                issues,
              };
            } catch (error) {
              logError("[Preview] Failed to fetch Linear issues", error, {
                integrationId: integration.id,
              });
              return {
                integrationId: integration.id,
                displayName: integration.displayName,
                issues: [],
              };
            }
          })
        );
      }

      return {
        repositories: results,
        linearIntegrations:
          linearIntegrationPreviews.length > 0
            ? linearIntegrationPreviews
            : undefined,
        failures,
      };
    }),
  createCollection: baseProcedure
    .input(createPostCollectionInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      await assertActiveSubscription(input.organizationId);

      if (
        input.projectId &&
        !(await isProjectInOrganization(input.organizationId, input.projectId))
      ) {
        throw badRequest((await getTranslations("errors.server"))("notFound"));
      }

      const now = new Date();
      const collectionId = nanoid();

      await db.insert(postCollections).values({
        id: collectionId,
        organizationId: input.organizationId,
        projectId: input.projectId ?? null,
        source: "manual",
        sourceId: collectionId,
        name: buildPostCollectionName(input.contentTypes, now),
        nameSource: "generated",
        contentTypes: input.contentTypes,
        expectedPostCount: input.expectedPostCount,
        completedPostCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      return { collectionId };
    }),
  generate: baseProcedure
    .input(generateContentInputSchema)
    .handler(async ({ context, input }) => {
      const auth = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });
      await assertActiveSubscription(input.organizationId);

      const collection = await db.query.postCollections.findFirst({
        where: and(
          eq(postCollections.id, input.collectionId),
          eq(postCollections.organizationId, input.organizationId)
        ),
      });

      if (!collection) {
        throw notFound("Post collection not found");
      }

      if (
        !input.dataPoints.includePullRequests &&
        !input.dataPoints.includeCommits &&
        !input.dataPoints.includeReleases &&
        !input.dataPoints.includeLinearData
      ) {
        const tErrors = await getTranslations("errors.content");
        throw badRequest(tErrors("dataSourceRequired"));
      }

      if (input.selectedItems) {
        const hasAnySelected =
          (input.selectedItems.commitShas?.length ?? 0) > 0 ||
          (input.selectedItems.pullRequestNumbers?.length ?? 0) > 0 ||
          (input.selectedItems.releaseTagNames?.length ?? 0) > 0 ||
          (input.selectedItems.linearIssueIds?.length ?? 0) > 0;

        if (!hasAnySelected) {
          const tErrors = await getTranslations("errors.content");
          throw badRequest(tErrors("eventRequired"));
        }
      }

      let billing: Awaited<ReturnType<typeof checkContentBilling>>;
      try {
        billing = await checkContentBilling({
          organizationId: input.organizationId,
          outputType: input.contentType,
        });
      } catch {
        throw internalServerError("Failed to verify plan limits");
      }

      if (!billing.allowed) {
        trackServerEvent({
          event: POSTHOG_EVENTS.CONTENT_GENERATION_DENIED,
          headers: context.headers,
          userId: auth.user.id,
          organizationId: input.organizationId,
          properties: {
            reason: billing.reason ?? null,
            format: input.contentType,
          },
        });
        throw paymentRequired(
          (await getTranslations("errors.billing"))("contentLimitReached")
        );
      }

      const runId = generateRunId("manual_on_demand");

      trackServerEvent({
        event: POSTHOG_EVENTS.CONTENT_GENERATION_REQUESTED,
        headers: context.headers,
        userId: auth.user.id,
        organizationId: input.organizationId,
        properties: {
          format: input.contentType,
          voice_id: input.brandIdentityId ?? input.brandVoiceId ?? null,
          source_count:
            (input.repositoryIds ?? input.integrations?.github ?? []).length +
            (input.linearIntegrationIds ?? input.integrations?.linear ?? [])
              .length,
          data_points: getEnabledDataPoints(input.dataPoints),
          lookback: input.lookbackWindow,
          collection_id: input.collectionId,
          run_id: runId,
        },
      });

      await addActiveGeneration(input.organizationId, {
        runId,
        triggerId: "manual_on_demand",
        outputType: input.contentType,
        triggerName: input.contentType,
        startedAt: new Date().toISOString(),
        source: "dashboard",
      });

      let linearIntegrationIds: string[] | undefined;
      if (input.dataPoints.includeLinearData) {
        const linearIntegrations = await getLinearIntegrationsByOrganization(
          input.organizationId
        );
        const requestedLinearIds = new Set(
          input.linearIntegrationIds ?? input.integrations?.linear ?? []
        );

        linearIntegrationIds = linearIntegrations
          .filter(
            (integration) =>
              integration.enabled &&
              (requestedLinearIds.size === 0 ||
                requestedLinearIds.has(integration.id))
          )
          .map((integration) => integration.id);
      }

      await startOnDemandRun({
        organizationId: input.organizationId,
        userId: auth.user.id,
        collectionId: input.collectionId,
        runId,
        contentType: input.contentType,
        lookbackWindow: input.lookbackWindow,
        timezone: input.timezone,
        repositoryIds: input.repositoryIds ?? input.integrations?.github,
        linearIntegrationIds,
        brandVoiceId: input.brandIdentityId ?? input.brandVoiceId,
        dataPoints: input.dataPoints,
        selectedItems: input.selectedItems,
        aiCreditReserved: billing.mode === "ai_credits",
        aiCreditMarkup: billing.useMarkup,
        source: "dashboard",
      });

      return {
        success: true,
        runId,
      };
    }),
  activeGenerations: {
    list: baseProcedure
      .input(contentOrganizationIdInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });

        const [generations, results] = await Promise.all([
          getActiveGenerations(input.organizationId),
          getCompletedGenerations(input.organizationId),
        ]);

        return { generations, results };
      }),
    clearCompleted: baseProcedure
      .input(
        contentOrganizationIdInputSchema.and(clearCompletedGenerationSchema)
      )
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
        });
        await assertActiveSubscription(input.organizationId);

        await clearCompletedGeneration(input.organizationId, input.runId);

        return { success: true };
      }),
  },
};
