import { getGitHubIntegrationById } from "@/lib/services/github-integration";
import type { ContextItem, ValidatedIntegration } from "./types";

export async function validateIntegrations(
  organizationId: string,
  contextItems: ContextItem[] = []
): Promise<ValidatedIntegration[]> {
  if (!contextItems.length) {
    return [];
  }

  const integrationIds = [...new Set(contextItems.map((c) => c.integrationId))];
  const validatedIntegrations: ValidatedIntegration[] = [];

  for (const integrationId of integrationIds) {
    try {
      const integration = await getGitHubIntegrationById(integrationId);

      if (!integration) {
        console.warn(
          `[Integration Validator] Integration not found: ${integrationId}`
        );
        continue;
      }

      if (integration.organizationId !== organizationId) {
        console.warn(
          `[Integration Validator] Integration ${integrationId} does not belong to org ${organizationId}`
        );
        continue;
      }

      if (!integration.enabled) {
        console.warn(
          `[Integration Validator] Integration ${integrationId} is disabled`
        );
        continue;
      }

      const contextRepos = contextItems
        .filter((c) => c.integrationId === integrationId)
        .map((c) => ({ owner: c.owner, repo: c.repo }));

      const enabledRepos = integration.repositories
        .filter((r) => {
          if (!r.enabled) return false;
          return contextRepos.some(
            (cr) => cr.owner === r.owner && cr.repo === r.repo
          );
        })
        .map((r) => ({
          id: r.id,
          owner: r.owner,
          repo: r.repo,
          enabled: r.enabled,
        }));

      if (enabledRepos.length === 0) {
        console.warn(
          `[Integration Validator] No enabled repositories for integration ${integrationId}`
        );
        continue;
      }

      validatedIntegrations.push({
        id: integration.id,
        type: "github",
        enabled: integration.enabled,
        displayName: integration.displayName,
        organizationId: integration.organizationId,
        repositories: enabledRepos,
      });
    } catch (error) {
      console.error(
        `[Integration Validator] Error validating integration ${integrationId}:`,
        error
      );
    }
  }

  return validatedIntegrations;
}

export function hasEnabledGitHubIntegration(
  validatedIntegrations: ValidatedIntegration[]
): boolean {
  return validatedIntegrations.some(
    (i) => i.type === "github" && i.enabled && i.repositories.length > 0
  );
}

export function getRepoContexts(
  validatedIntegrations: ValidatedIntegration[]
): Array<{ owner: string; repo: string }> {
  return validatedIntegrations.flatMap((i) =>
    i.repositories.map((r) => ({
      owner: r.owner,
      repo: r.repo,
    }))
  );
}
