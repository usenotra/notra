import { getGitHubIntegrationsByOrganization } from "@notra/ai/integrations/github";
import { getGranolaIntegrationsByOrganization } from "@notra/ai/integrations/granola";
import { getLinearIntegrationsByOrganization } from "@notra/ai/integrations/linear";
import { getSlackIntegrationsByOrganization } from "@notra/ai/integrations/slack-workspace";
import { getGitHubConnectionMethod } from "@notra/ai/utils/github-connection-method";
import type { IntegrationType } from "@notra/schemas/dashboard/integrations";

import type {
  IntegrationFetcher,
  IntegrationsResponse,
} from "@/types/services/integrations";

const integrationFetchers: Partial<
  Record<IntegrationType, IntegrationFetcher>
> = {
  github: async (organizationId) => {
    const integrations =
      await getGitHubIntegrationsByOrganization(organizationId);

    return integrations.map((integration) => {
      const uniqueRepositories = Array.from(
        new Map(
          integration.repositories.map((repo) => [
            `${repo.owner}/${repo.repo}`,
            repo,
          ])
        ).values()
      );

      return {
        id: integration.id,
        displayName: integration.displayName,
        type: "github" as const,
        connectionMethod: getGitHubConnectionMethod(integration),
        enabled: integration.enabled,
        createdAt: integration.createdAt,
        managedByGitHubApp: Boolean(integration.githubAppInstallationId),
        repositories: uniqueRepositories.map((repo) => ({
          id: repo.id,
          owner: repo.owner,
          repo: repo.repo,
          defaultBranch: repo.defaultBranch,
          enabled: repo.enabled,
          outputs: repo.outputs.map((output) => ({
            id: output.id,
            outputType: output.outputType,
            enabled: output.enabled,
          })),
        })),
      };
    });
  },
  slack: async (organizationId) => {
    const integrations =
      await getSlackIntegrationsByOrganization(organizationId);

    return integrations.map((integration) => ({
      id: integration.id,
      displayName: integration.displayName,
      type: "slack" as const,
      enabled: integration.enabled,
      createdAt: integration.createdAt,
      repositories: [],
    }));
  },
  linear: async (organizationId) => {
    const integrations =
      await getLinearIntegrationsByOrganization(organizationId);

    return integrations.map((integration) => ({
      id: integration.id,
      displayName: integration.displayName,
      type: "linear" as const,
      enabled: integration.enabled,
      createdAt: integration.createdAt,
      repositories: [],
    }));
  },
  granola: async (organizationId) => {
    const integrations =
      await getGranolaIntegrationsByOrganization(organizationId);

    return integrations.map((integration) => ({
      id: integration.id,
      displayName: integration.displayName,
      type: "granola" as const,
      enabled: integration.enabled,
      createdAt: integration.createdAt,
      repositories: [],
    }));
  },
};

export function registerIntegrationFetcher(
  type: IntegrationType,
  fetcher: IntegrationFetcher
) {
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
) {
  const { count } = await getIntegrationsByOrganization(organizationId);
  return count;
}
