import { db } from "@notra/db/drizzle";
import { githubAppInstallations, githubIntegrations } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import { SiteInputError } from "./errors";
import { getRepositorySuggestions, siteRepositoryToken } from "./github";
import type {
  OrganizationRepository,
  RepositorySuggestions,
} from "./types/github";
import type { RepositorySuggestionsParams } from "./types/sites";

export async function requireOrganizationRepository(
  organizationId: string,
  repositoryId: string
): Promise<OrganizationRepository> {
  const [row] = await db
    .select({
      integration: githubIntegrations,
      installationId: githubAppInstallations.installationId,
    })
    .from(githubIntegrations)
    .innerJoin(
      githubAppInstallations,
      eq(githubIntegrations.githubAppInstallationId, githubAppInstallations.id)
    )
    .where(
      and(
        eq(githubIntegrations.id, repositoryId),
        eq(githubIntegrations.organizationId, organizationId),
        eq(githubAppInstallations.organizationId, organizationId),
        eq(githubIntegrations.enabled, true),
        eq(githubIntegrations.repositoryEnabled, true),
        eq(githubAppInstallations.enabled, true)
      )
    )
    .limit(1);
  const owner = row?.integration.owner;
  const repo = row?.integration.repo;
  if (!(row && owner && repo && row.integration.githubRepositoryId)) {
    throw new SiteInputError(
      "Connect the repository through the Notra GitHub App first",
      { field: "repository" }
    );
  }
  return {
    integration: row.integration,
    repository: {
      organizationId,
      integrationId: row.integration.id,
      githubRepositoryId: row.integration.githubRepositoryId,
      installationId: row.installationId,
      owner,
      repo,
    },
  };
}

export async function organizationRepositorySuggestions(
  params: RepositorySuggestionsParams
): Promise<RepositorySuggestions> {
  const { repository } = await requireOrganizationRepository(
    params.organizationId,
    params.repositoryId
  );
  const token = await siteRepositoryToken(repository, { contents: "read" });
  return await getRepositorySuggestions({ repository, token }, params.ref);
}
