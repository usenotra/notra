import { logError } from "@notra/ai/utils/server-log";

import { CHAT_INTEGRATIONS_CACHE_TTL_SECONDS } from "../constants/chat";
import {
  getGitHubIntegrationsByOrganization,
  getGitHubToolRepositoryContextByIntegrationId,
} from "../integrations/github";
import {
  getGranolaIntegrationsByOrganization,
  getGranolaToolContextByIntegrationId,
} from "../integrations/granola";
import {
  getLinearIntegrationsByOrganization,
  getLinearToolContextByIntegrationId,
} from "../integrations/linear";
import type { ValidatedIntegration } from "../types/orchestration";
import { redis } from "../utils/redis";

function cacheKey(organizationId: string) {
  return `chat:integrations:${organizationId}`;
}

export async function getStandaloneChatIntegrations(
  organizationId: string
): Promise<ValidatedIntegration[]> {
  if (redis) {
    try {
      const cached = await redis.get<ValidatedIntegration[]>(
        cacheKey(organizationId)
      );
      if (cached) {
        return cached;
      }
    } catch (error) {
      logError("[chat-integrations-cache] Redis get failed", error, {
        organizationId,
      });
    }
  }

  const fresh = await loadStandaloneChatIntegrations(organizationId);

  if (redis) {
    try {
      await redis.set(cacheKey(organizationId), fresh, {
        ex: CHAT_INTEGRATIONS_CACHE_TTL_SECONDS,
      });
    } catch (error) {
      logError("[chat-integrations-cache] Redis set failed", error, {
        organizationId,
      });
    }
  }

  return fresh;
}

export async function invalidateStandaloneChatIntegrations(
  organizationId: string
) {
  if (!redis) {
    return;
  }
  try {
    await redis.del(cacheKey(organizationId));
  } catch (error) {
    logError("[chat-integrations-cache] Redis del failed", error, {
      organizationId,
    });
  }
}

async function loadStandaloneChatIntegrations(
  organizationId: string
): Promise<ValidatedIntegration[]> {
  const [githubIntegrations, linearIntegrations, granolaIntegrations] =
    await Promise.all([
      getGitHubIntegrationsByOrganization(organizationId),
      getLinearIntegrationsByOrganization(organizationId),
      getGranolaIntegrationsByOrganization(organizationId),
    ]);

  const github = githubIntegrations
    .filter((integration) => integration.enabled)
    .map((integration): ValidatedIntegration => ({
      id: integration.id,
      type: "github" as const,
      enabled: integration.enabled,
      displayName: integration.displayName,
      organizationId: integration.organizationId,
      repositories: integration.repositories
        .filter((repository) => repository.enabled)
        .map((repository) => ({
          id: repository.id,
          owner: repository.owner,
          repo: repository.repo,
          defaultBranch: repository.defaultBranch ?? null,
          enabled: repository.enabled,
        })),
    }))
    .filter((integration) => {
      return (
        integration.type === "github" && integration.repositories.length > 0
      );
    });

  const linear = linearIntegrations
    .filter((integration) => integration.enabled)
    .map((integration): ValidatedIntegration => ({
      id: integration.id,
      type: "linear" as const,
      enabled: integration.enabled,
      displayName: integration.displayName,
      organizationId: integration.organizationId,
      linearTeamId: integration.linearTeamId,
      linearTeamName: integration.linearTeamName,
    }));

  const granola: ValidatedIntegration[] = [];
  for (const integration of granolaIntegrations) {
    if (integration.enabled) {
      granola.push({
        id: integration.id,
        type: "granola" as const,
        enabled: integration.enabled,
        displayName: integration.displayName,
        organizationId: integration.organizationId,
        workspaceName: integration.workspaceName,
      });
    }
  }

  return [...github, ...linear, ...granola];
}

export const standaloneChatResolvers = {
  resolveContext: getGitHubToolRepositoryContextByIntegrationId,
  resolveLinearContext: getLinearToolContextByIntegrationId,
  resolveGranolaContext: getGranolaToolContextByIntegrationId,
};
