import {
  createOctokit,
  GITHUB_INTERACTIVE_READ_TIMEOUT_MS,
} from "@notra/ai/utils/octokit";
import { db } from "@notra/db/drizzle";
import { sites, users } from "@notra/db/schema";
import { and, asc, eq, or, sql } from "drizzle-orm";

import { GITHUB_API_VERSION_HEADERS } from "@/constants/github";
import { SITE_ENTRY_DIRECTORIES } from "@/constants/site-github-publish";
import type {
  SiteGitHubPublishTarget,
  FindSiteGitHubPublishTargetParams,
  ReadSiteRepositoryTextFileParams,
  ResolveSiteEntryAuthorParams,
} from "@/types/integrations/site-github-publish";
import {
  normalizeSiteRootDirectory,
  parseSiteConfigAuthors,
  readSiteEntryAuthor,
  resolveSiteAuthor,
  resolveSiteConfigPath,
} from "@/utils/site-github-publish";

export async function findSiteGitHubPublishTarget(
  params: FindSiteGitHubPublishTargetParams
): Promise<SiteGitHubPublishTarget | null> {
  const { repository } = params;
  const candidates = await db
    .select({
      id: sites.id,
      rootDirectory: sites.rootDirectory,
      productionBranch: sites.productionBranch,
      mounts: sites.mounts,
    })
    .from(sites)
    .where(
      and(
        eq(sites.organizationId, params.organizationId),
        or(
          eq(sites.repositoryId, repository.id),
          repository.githubRepositoryId
            ? eq(sites.githubRepositoryId, repository.githubRepositoryId)
            : undefined,
          and(
            sql`lower(${sites.repositoryOwner}) = ${repository.owner.toLowerCase()}`,
            sql`lower(${sites.repositoryName}) = ${repository.repo.toLowerCase()}`
          )
        )
      )
    )
    .orderBy(asc(sites.createdAt));
  if (candidates.length === 0) {
    return null;
  }

  const section = SITE_ENTRY_DIRECTORIES[params.contentType];
  const site =
    candidates.find((candidate) => Boolean(candidate.mounts[section])) ??
    candidates[0];
  if (!site) {
    return null;
  }
  return {
    siteId: site.id,
    rootDirectory: normalizeSiteRootDirectory(site.rootDirectory),
    productionBranch: site.productionBranch,
    sectionMounted: Boolean(site.mounts[section]),
  };
}

async function readRepositoryTextFile(
  token: string,
  params: ReadSiteRepositoryTextFileParams
): Promise<string | null> {
  try {
    const { data } = await createOctokit(token, {
      requestTimeoutMs: GITHUB_INTERACTIVE_READ_TIMEOUT_MS,
    }).request("GET /repos/{owner}/{repo}/contents/{path}", {
      ...params,
      headers: GITHUB_API_VERSION_HEADERS,
    });
    if (
      Array.isArray(data) ||
      data.type !== "file" ||
      typeof data.content !== "string"
    ) {
      return null;
    }
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

async function readPublisherName(userId: string | undefined) {
  if (!userId) {
    return null;
  }
  const user = await db.query.users.findFirst({
    columns: { name: true },
    where: eq(users.id, userId),
  });
  return user?.name ?? null;
}

export async function resolveSiteEntryAuthor(
  params: ResolveSiteEntryAuthorParams
): Promise<string | null> {
  const [existingMarkdown, publisherName, siteConfig] = await Promise.all([
    params.existingEntry
      ? readRepositoryTextFile(params.token, {
          owner: params.owner,
          repo: params.repo,
          path: params.existingEntry.path,
          ref: params.existingEntry.branchName,
        })
      : null,
    readPublisherName(params.publisherUserId),
    readRepositoryTextFile(params.token, {
      owner: params.owner,
      repo: params.repo,
      path: resolveSiteConfigPath(params.target.rootDirectory),
      ref: params.target.productionBranch,
    }),
  ]);
  const existingAuthor = existingMarkdown
    ? readSiteEntryAuthor(existingMarkdown)
    : null;
  if (existingAuthor) {
    return existingAuthor;
  }
  return resolveSiteAuthor(
    siteConfig ? parseSiteConfigAuthors(siteConfig) : {},
    publisherName
  );
}
