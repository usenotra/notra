import type { GitHubMentionAuth } from "@notra/ai/types/github-mention";
import { db } from "@notra/db/drizzle";
import {
  githubAppInstallations,
  githubIntegrations,
  members,
  socialConnections,
} from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

export async function resolveGitHubMentionAuth(params: {
  githubUserId: number;
  organizationId: string;
}): Promise<GitHubMentionAuth | null> {
  const [row] = await db
    .select({
      userId: socialConnections.userId,
      organizationId: members.organizationId,
    })
    .from(socialConnections)
    .innerJoin(members, eq(members.userId, socialConnections.userId))
    .where(
      and(
        eq(socialConnections.provider, "github"),
        eq(socialConnections.providerAccountId, String(params.githubUserId)),
        eq(members.organizationId, params.organizationId)
      )
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    userId: row.userId,
    organizationId: row.organizationId,
  };
}

export async function listOrganizationsForGitHubInstallation(
  installationId: string
) {
  return await db
    .select({
      organizationId: githubAppInstallations.organizationId,
      installationRecordId: githubAppInstallations.id,
    })
    .from(githubAppInstallations)
    .where(
      and(
        eq(githubAppInstallations.installationId, installationId),
        eq(githubAppInstallations.enabled, true)
      )
    );
}

export async function findGitHubIntegrationForMention(params: {
  organizationId: string;
  githubRepositoryId: string;
  owner: string;
  repo: string;
}) {
  const byGithubId = await db.query.githubIntegrations.findFirst({
    where: and(
      eq(githubIntegrations.organizationId, params.organizationId),
      eq(githubIntegrations.githubRepositoryId, params.githubRepositoryId),
      eq(githubIntegrations.enabled, true),
      eq(githubIntegrations.repositoryEnabled, true)
    ),
    columns: {
      id: true,
      owner: true,
      repo: true,
      defaultBranch: true,
    },
  });
  if (byGithubId) {
    return byGithubId;
  }

  return await db.query.githubIntegrations.findFirst({
    where: and(
      eq(githubIntegrations.organizationId, params.organizationId),
      eq(githubIntegrations.owner, params.owner),
      eq(githubIntegrations.repo, params.repo),
      eq(githubIntegrations.enabled, true),
      eq(githubIntegrations.repositoryEnabled, true)
    ),
    columns: {
      id: true,
      owner: true,
      repo: true,
      defaultBranch: true,
    },
  });
}
