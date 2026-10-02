import crypto from "node:crypto";

import { createOctokit } from "@notra/ai/utils/octokit";
import type { createDb } from "@notra/db/drizzle";
import { githubIntegrations, members } from "@notra/db/schema";
import {
  decodeIntegrationEncryptionKey,
  encryptIntegrationSecret,
} from "@notra/db/utils/integration-encryption";
import { and, asc, eq, sql } from "drizzle-orm";
import { Effect } from "effect";

import {
  GitHubAccessError,
  IntegrationUnavailableError,
} from "../errors/integrations";

type DbClient = ReturnType<typeof createDb>;

export const encryptGitHubIntegrationSecret = (
  secret: string,
  runtimeEnv: {
    INTEGRATION_ENCRYPTION_KEY?: string;
  }
) =>
  Effect.try({
    try: () =>
      encryptIntegrationSecret(
        secret,
        decodeIntegrationEncryptionKey(runtimeEnv.INTEGRATION_ENCRYPTION_KEY)
      ),
    catch: (cause) => new IntegrationUnavailableError({ cause }),
  });

export function generateGitHubIntegrationId() {
  return crypto.randomUUID();
}

export function generateGitHubWebhookSecret() {
  return crypto.randomBytes(32).toString("hex");
}

export async function findGitHubIntegrationCreatorUserId(
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

  return memberRecord?.userId ?? null;
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

export const validateGitHubRepositoryAccess = Effect.fn(
  "integrations.validateGitHubRepositoryAccess"
)(function* (input: { owner: string; repo: string; token?: string | null }) {
  const octokit = createOctokit(input.token ?? undefined);

  yield* Effect.tryPromise({
    try: (signal) =>
      octokit.request("GET /repos/{owner}/{repo}", {
        owner: input.owner,
        repo: input.repo,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
        request: { signal },
      }),
    catch: () =>
      new GitHubAccessError({
        message: input.token
          ? "Invalid GitHub token or insufficient repository access"
          : "Unable to access repository. It may be private and require a Personal Access Token.",
      }),
  });
});
