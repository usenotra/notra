import type { IntegrationType } from "@/utils/schemas/integrations";
import { getGitHubIntegrationsByOrganization } from "./github-integration";

export interface IntegrationWithRepositories {
  id: string;
  displayName: string;
  type: IntegrationType;
  enabled: boolean;
  createdAt: Date;
  repositories: Array<{
    id: string;
    owner: string;
    repo: string;
    enabled: boolean;
  }>;
}

export interface IntegrationsResponse {
  integrations: IntegrationWithRepositories[];
  count: number;
}

type IntegrationFetcher = (
  organizationId: string
) => Promise<IntegrationWithRepositories[]>;

const integrationFetchers: Partial<
  Record<IntegrationType, IntegrationFetcher>
> = {
  github: async (organizationId) => {
    const integrations =
      await getGitHubIntegrationsByOrganization(organizationId);

    return integrations.map((integration) => ({
      id: integration.id,
      displayName: integration.displayName,
      type: "github" as const,
      enabled: integration.enabled,
      createdAt: integration.createdAt,
      repositories: integration.repositories.map((repo) => ({
        id: repo.id,
        owner: repo.owner,
        repo: repo.repo,
        enabled: repo.enabled,
      })),
    }));
  },
};

export function registerIntegrationFetcher(
  type: IntegrationType,
  fetcher: IntegrationFetcher
): void {
  integrationFetchers[type] = fetcher;
}

export async function getIntegrationsByOrganization(
  organizationId: string
): Promise<IntegrationsResponse> {
  const activeFetchers = Object.entries(integrationFetchers).filter(
    (entry): entry is [IntegrationType, IntegrationFetcher] =>
      entry[1] !== undefined
  );

  const results = await Promise.all(
    activeFetchers.map(([, fetcher]) => fetcher(organizationId))
  );

  const integrations = results.flat();

  return {
    integrations,
    count: integrations.length,
  };
}

export async function getIntegrationCountByOrganization(
  organizationId: string
): Promise<number> {
  const { count } = await getIntegrationsByOrganization(organizationId);
  return count;
}
