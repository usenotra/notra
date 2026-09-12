import crypto from "node:crypto";

import { createOctokit } from "@notra/ai/utils/octokit";
import type { createDb } from "@notra/db/drizzle";
import { githubIntegrations, members } from "@notra/db/schema";
import {
  decodeIntegrationEncryptionKey,
  encryptIntegrationSecret,
} from "@notra/db/utils/integration-encryption";
import { and, asc, eq, sql } from "drizzle-orm";

type DbClient = ReturnType<typeof createDb>;

export function encryptGitHubIntegrationToken(
  token: string,
  runtimeEnv: {
    INTEGRATION_ENCRYPTION_KEY?: string;
  }
) {
  try {
    const key = decodeIntegrationEncryptionKey(
      runtimeEnv.INTEGRATION_ENCRYPTION_KEY
    );

    return encryptIntegrationSecret(token, key);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`GitHub integrations are unavailable: ${error.message}`);
    }

    throw error;
  }
}

export function generateGitHubIntegrationId() {
  return crypto.randomUUID();
}

export function generateGitHubWebhookSecret() {
  return crypto.randomBytes(32).toString("hex");
}

export async function getGitHubIntegrationCreatorUserId(
  db: DbClient,
  organizationId: string
) {
  const memberRecord = await db.query.members.findFirst({
    where: eq(members.organizationId, organizationId),
    orderBy: [asc(members.createdAt)],
    columns: {
      userId: true,
    },
  });

  if (!memberRecord) {
    throw new Error(
      "Organization has no members available to own the integration"
    );
  }

  return memberRecord.userId;
}

export async function findMatchingGitHubIntegration(
  db: DbClient,
  organizationId: string,
  owner: string,
  repo: string
) {
  return db.query.githubIntegrations.findFirst({
    where: and(
      eq(githubIntegrations.organizationId, organizationId),
      sql`lower(${githubIntegrations.owner}) = lower(${owner})`,
      sql`lower(${githubIntegrations.repo}) = lower(${repo})`
    ),
    columns: {
      id: true,
      owner: true,
      repo: true,
    },
  });
}

export function getSafeGitHubIntegrationErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  const safeMessages = new Set([
    "Invalid GitHub token or insufficient repository access",
    "Unable to access repository. It may be private and require a Personal Access Token.",
    "Organization has no members available to own the integration",
  ]);

  return safeMessages.has(error.message) ? error.message : null;
}

export function isGitHubIntegrationUnavailableError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith("GitHub integrations are unavailable:")
  );
}

export async function validateGitHubRepositoryAccess(input: {
  owner: string;
  repo: string;
  token?: string | null;
}) {
  const requestOptions = {
    owner: input.owner,
    repo: input.repo,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  };

  if (input.token) {
    const octokit = createOctokit(input.token);

    try {
      await octokit.request("GET /repos/{owner}/{repo}", requestOptions);
      return;
    } catch {
      throw new Error("Invalid GitHub token or insufficient repository access");
    }
  }

  const octokit = createOctokit();

  try {
    await octokit.request("GET /repos/{owner}/{repo}", requestOptions);
  } catch {
    throw new Error(
      "Unable to access repository. It may be private and require a Personal Access Token."
    );
  }
}
