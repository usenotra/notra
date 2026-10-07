import { db } from "@notra/db/drizzle";
import { githubIntegrations } from "@notra/db/schema";
import { inArray } from "drizzle-orm";

export function getGitHubWebhookIntegrations(
  integrationId: string,
  repositoryId: string
) {
  // Repository IDs currently are integration IDs; load both path IDs to retain
  // the existing missing-repository and mismatched-integration responses.
  return db
    .select({
      id: githubIntegrations.id,
      organizationId: githubIntegrations.organizationId,
      enabled: githubIntegrations.enabled,
      encryptedWebhookSecret: githubIntegrations.encryptedWebhookSecret,
    })
    .from(githubIntegrations)
    .where(
      inArray(githubIntegrations.id, [
        ...new Set([integrationId, repositoryId]),
      ])
    );
}
