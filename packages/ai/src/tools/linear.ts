import { getLinearIssuesInputSchema } from "@notra/ai/schemas/tools";
import type { ResolveLinearIntegrationContext } from "@notra/ai/types/agents";
import type {
  BuildLinearDataToolsOptions,
  LinearToolContext,
  LinearToolsAccessConfig,
} from "@notra/ai/types/tools";
import { createLinearClient, getLinearIssues } from "@notra/ai/utils/linear";
import { type Tool, tool } from "ai";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import { getAICachedTools } from "./tool-cache";

function createLinearIntegrationContextResolver(
  config?: LinearToolsAccessConfig,
  resolveContext?: ResolveLinearIntegrationContext
) {
  const cache = new Map<string, Promise<LinearToolContext>>();

  return async (integrationId: string) => {
    if (
      config?.allowedIntegrationIds !== undefined &&
      !config.allowedIntegrationIds.includes(integrationId)
    ) {
      throw new Error(
        `Linear integration access denied. Integration ID ${integrationId} is not in the allowed list.`
      );
    }

    let cached = cache.get(integrationId);
    if (!cached) {
      if (!resolveContext) {
        throw new Error(
          "No resolveContext callback provided for Linear tool integration resolution."
        );
      }
      cached = resolveContext(integrationId, {
        organizationId: config?.organizationId,
      });
      cache.set(integrationId, cached);
      cached.catch(() => {
        cache.delete(integrationId);
      });
    }
    return cached;
  };
}

export function createGetLinearIssuesTool(
  config?: LinearToolsAccessConfig,
  resolveContext?: ResolveLinearIntegrationContext
): Tool {
  const cached = getAICachedTools({
    organizationId: config?.organizationId,
    namespace: "linear",
  });
  const resolveIntegrationContext = createLinearIntegrationContextResolver(
    config,
    resolveContext
  );

  return cached(
    tool({
      description:
        "Get Linear issues for a team (title, state, priority, assignee, labels). Supports since/until ISO timestamps and cursor pagination.",
      inputSchema: getLinearIssuesInputSchema,
      execute: async ({
        integrationId,
        since,
        until,
        cursor,
        includeCompleted,
      }) => {
        const resolved = await resolveIntegrationContext(integrationId);
        const client = createLinearClient(resolved.accessToken);

        const filter: Record<string, unknown> = {};

        if (resolved.linearTeamId) {
          filter.team = { id: { eq: resolved.linearTeamId } };
        }

        if (since || until) {
          filter.updatedAt = {};
          if (since) {
            (filter.updatedAt as Record<string, string>).gte = since;
          }
          if (until) {
            (filter.updatedAt as Record<string, string>).lte = until;
          }
        }

        if (!includeCompleted) {
          filter.completedAt = { null: true };
        }

        return getLinearIssues(client, {
          filter,
          first: 50,
          after: cursor,
          orderBy: "updatedAt" as never,
        });
      },
    }),
    {
      ttl: 5 * 60 * 1000,
      keyGenerator: (params: unknown) => {
        const { integrationId, since, until, cursor, includeCompleted } =
          getLinearIssuesInputSchema.parse(params);
        return `get_linear_issues:integration=${integrationId}:since=${since ?? "none"}:until=${until ?? "none"}:cursor=${cursor ?? "start"}:completed=${String(
          includeCompleted
        )}`;
      },
    }
  );
}

export function createGetLinearProjectsTool(
  config?: LinearToolsAccessConfig,
  resolveContext?: ResolveLinearIntegrationContext
): Tool {
  const cached = getAICachedTools({
    organizationId: config?.organizationId,
    namespace: "linear",
  });
  const resolveIntegrationContext = createLinearIntegrationContextResolver(
    config,
    resolveContext
  );

  return cached(
    tool({
      description:
        "Get Linear projects (name, description, state, progress, timeline). Set includeCompleted to include finished projects.",
      inputSchema: z.object({
        integrationId: z
          .string()
          .describe("The integration ID for the configured Linear workspace"),
        includeCompleted: z
          .boolean()
          .default(false)
          .describe("Whether to include completed projects"),
      }),
      execute: async ({ integrationId, includeCompleted }) => {
        const resolved = await resolveIntegrationContext(integrationId);
        const client = createLinearClient(resolved.accessToken);

        const filter: Record<string, unknown> = {};

        if (resolved.linearTeamId) {
          filter.accessibleTeams = {
            some: { id: { eq: resolved.linearTeamId } },
          };
        }

        if (!includeCompleted) {
          filter.state = { type: { nin: ["completed", "canceled"] } };
        }

        const projects = await client.projects({
          filter,
          first: 25,
          orderBy: "updatedAt" as never,
        });

        const results = await Promise.all(
          projects.nodes.map(async (project) => {
            const lead = await project.lead;
            return {
              id: project.id,
              name: project.name,
              description: project.description
                ? project.description.slice(0, 300)
                : null,
              state: project.state,
              progress: project.progress,
              startDate: project.startDate ?? null,
              targetDate: project.targetDate ?? null,
              lead: lead?.name ?? lead?.displayName ?? null,
              url: project.url,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
            };
          })
        );

        return { projects: results };
      },
    }),
    {
      ttl: 15 * 60 * 1000,
      keyGenerator: (params: unknown) => {
        const { integrationId, includeCompleted } = params as {
          integrationId: string;
          includeCompleted?: boolean;
        };
        return `get_linear_projects:integration=${integrationId}:completed=${String(includeCompleted ?? false)}`;
      },
    }
  );
}

export function createGetLinearCyclesTool(
  config?: LinearToolsAccessConfig,
  resolveContext?: ResolveLinearIntegrationContext
): Tool {
  const cached = getAICachedTools({
    organizationId: config?.organizationId,
    namespace: "linear",
  });
  const resolveIntegrationContext = createLinearIntegrationContextResolver(
    config,
    resolveContext
  );

  return cached(
    tool({
      description:
        "Get recent Linear cycles for a team (name, progress, timeline). Returns the most recent cycles including the active one.",
      inputSchema: z.object({
        integrationId: z
          .string()
          .describe("The integration ID for the configured Linear workspace"),
      }),
      execute: async ({ integrationId }) => {
        const resolved = await resolveIntegrationContext(integrationId);
        const client = createLinearClient(resolved.accessToken);

        if (!resolved.linearTeamId) {
          return {
            cycles: [],
            note: "No team scoped for this integration. Cycles are team-specific in Linear.",
          };
        }

        const team = await client.team(resolved.linearTeamId);
        const cycles = await team.cycles({
          first: 5,
          orderBy: "startsAt" as never,
        });

        const results = cycles.nodes.map((cycle) => ({
          id: cycle.id,
          name: cycle.name ?? null,
          number: cycle.number,
          startsAt: cycle.startsAt,
          endsAt: cycle.endsAt,
          progress: cycle.progress,
          completedAt: cycle.completedAt ?? null,
        }));

        return { cycles: results };
      },
    }),
    {
      ttl: 10 * 60 * 1000,
      keyGenerator: (params: unknown) => {
        const { integrationId } = params as { integrationId: string };
        return `get_linear_cycles:integration=${integrationId}`;
      },
    }
  );
}

export function buildLinearDataTools(
  options: BuildLinearDataToolsOptions
): Record<string, Tool> {
  const {
    organizationId,
    allowedIntegrationIds,
    dataPointSettings,
    resolveContext,
  } = options;

  const includeLinearData = dataPointSettings?.includeLinearData !== false;

  if (!includeLinearData) {
    return {};
  }

  return {
    getLinearIssues: createGetLinearIssuesTool(
      { organizationId, allowedIntegrationIds },
      resolveContext
    ),
    getLinearProjects: createGetLinearProjectsTool(
      { organizationId, allowedIntegrationIds },
      resolveContext
    ),
    getLinearCycles: createGetLinearCyclesTool(
      { organizationId, allowedIntegrationIds },
      resolveContext
    ),
  };
}
