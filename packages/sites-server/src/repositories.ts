import { db } from "@notra/db/drizzle";
import { githubAppInstallations, githubIntegrations } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import { SiteInputError } from "./errors";
import { getRepositorySuggestions } from "./github";
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
        eq(githubAppInstallations.organizationId, organizationId)
      )
    )
    .limit(1);
  const owner = row?.integration.owner;
  const repo = row?.integration.repo;
  if (!(row && owner && repo)) {
    throw new SiteInputError(
      "Connect the repository through the Notra GitHub App first",
      { field: "repository" }
    );
  }
  return {
    integration: row.integration,
    repository: { installationId: row.installationId, owner, repo },
  };
}

export async function organizationRepositorySuggestions(
  params: RepositorySuggestionsParams
): Promise<RepositorySuggestions> {
  const { repository } = await requireOrganizationRepository(
    params.organizationId,
    params.repositoryId
  );
  return await getRepositorySuggestions(repository, params.ref);
}
