import { and, desc, eq } from "drizzle-orm";

import { db } from "../drizzle";
import { brandSettings, githubIntegrations } from "../schema";
import type { BrandKnowledgeRecord } from "../types/geo-accuracy";
import { parseBrandKnowledgeRecords } from "./brand-knowledge";

export interface BrandKnowledgeRow {
  voiceId: string;
  organizationId: string;
  websiteUrl: string;
  companyName: string | null;
  githubIntegrationId: string | null;
  records: BrandKnowledgeRecord[];
  syncedAt: string | null;
  syncError: string | null;
}

export interface BrandKnowledgeGithubRepo {
  id: string;
  owner: string;
  repo: string;
}

export async function queryBrandKnowledge(
  organizationId: string,
  voiceId: string
): Promise<BrandKnowledgeRow | null> {
  const voice = await db.query.brandSettings.findFirst({
    where: and(
      eq(brandSettings.id, voiceId),
      eq(brandSettings.organizationId, organizationId)
    ),
    columns: {
      id: true,
      organizationId: true,
      websiteUrl: true,
      companyName: true,
      knowledgeGithubIntegrationId: true,
      knowledgeRecords: true,
      knowledgeSyncedAt: true,
      knowledgeSyncError: true,
    },
  });
  if (!voice) {
    return null;
  }
  return {
    voiceId: voice.id,
    organizationId: voice.organizationId,
    websiteUrl: voice.websiteUrl,
    companyName: voice.companyName,
    githubIntegrationId: voice.knowledgeGithubIntegrationId,
    records: parseBrandKnowledgeRecords(voice.knowledgeRecords),
    syncedAt: voice.knowledgeSyncedAt?.toISOString() ?? null,
    syncError: voice.knowledgeSyncError,
  };
}

export async function listBrandKnowledgeGithubRepos(
  organizationId: string
): Promise<BrandKnowledgeGithubRepo[]> {
  const rows = await db
    .select({
      id: githubIntegrations.id,
      owner: githubIntegrations.owner,
      repo: githubIntegrations.repo,
    })
    .from(githubIntegrations)
    .where(
      and(
        eq(githubIntegrations.organizationId, organizationId),
        eq(githubIntegrations.enabled, true),
        eq(githubIntegrations.repositoryEnabled, true)
      )
    )
    .orderBy(desc(githubIntegrations.updatedAt));
  return rows.flatMap((row) => {
    const owner = row.owner?.trim();
    const repo = row.repo?.trim();
    if (!(owner && repo)) {
      return [];
    }
    return [{ id: row.id, owner, repo }];
  });
}

async function resolveGithubIntegrationId(
  organizationId: string,
  githubIntegrationId: string | null | undefined
): Promise<string | null | undefined> {
  if (githubIntegrationId === undefined) {
    return undefined;
  }
  if (!githubIntegrationId) {
    return null;
  }
  const repos = await listBrandKnowledgeGithubRepos(organizationId);
  if (!repos.some((repo) => repo.id === githubIntegrationId)) {
    throw new Error("GitHub repo not found");
  }
  return githubIntegrationId;
}

export async function updateBrandKnowledge(
  organizationId: string,
  voiceId: string,
  patch: {
    githubIntegrationId?: string | null;
    records?: BrandKnowledgeRecord[];
    syncedAt?: Date | null;
    syncError?: string | null;
  }
): Promise<BrandKnowledgeRow | null> {
  const githubIntegrationId = await resolveGithubIntegrationId(
    organizationId,
    patch.githubIntegrationId
  );
  const [row] = await db
    .update(brandSettings)
    .set({
      ...(githubIntegrationId !== undefined
        ? { knowledgeGithubIntegrationId: githubIntegrationId }
        : {}),
      ...(patch.records !== undefined
        ? { knowledgeRecords: patch.records }
        : {}),
      ...(patch.syncedAt !== undefined
        ? { knowledgeSyncedAt: patch.syncedAt }
        : {}),
      ...(patch.syncError !== undefined
        ? { knowledgeSyncError: patch.syncError }
        : {}),
    })
    .where(
      and(
        eq(brandSettings.id, voiceId),
        eq(brandSettings.organizationId, organizationId)
      )
    )
    .returning({
      id: brandSettings.id,
      organizationId: brandSettings.organizationId,
      websiteUrl: brandSettings.websiteUrl,
      companyName: brandSettings.companyName,
      knowledgeGithubIntegrationId: brandSettings.knowledgeGithubIntegrationId,
      knowledgeRecords: brandSettings.knowledgeRecords,
      knowledgeSyncedAt: brandSettings.knowledgeSyncedAt,
      knowledgeSyncError: brandSettings.knowledgeSyncError,
    });
  if (!row) {
    return null;
  }
  return {
    voiceId: row.id,
    organizationId: row.organizationId,
    websiteUrl: row.websiteUrl,
    companyName: row.companyName,
    githubIntegrationId: row.knowledgeGithubIntegrationId,
    records: parseBrandKnowledgeRecords(row.knowledgeRecords),
    syncedAt: row.knowledgeSyncedAt?.toISOString() ?? null,
    syncError: row.knowledgeSyncError,
  };
}
