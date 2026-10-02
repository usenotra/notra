import { getLinearToolContextByIntegrationId } from "@notra/ai/integrations/linear";
import { createLinearClient, getLinearIssues } from "@notra/ai/utils/linear";
import { defineTool } from "eve/tools";

import { getLinearIssuesInputSchema } from "../schemas/assistant-tools";
import { requireOrganizationId } from "../utils/organization";

export function createGetLinearIssuesTool() {
  return defineTool({
    description:
      "Get Linear issues for a team (title, state, priority, assignee, labels). Supports since/until ISO timestamps and cursor pagination. Requires a connected Linear integration; use get_available_integrations to discover integrationIds.",
    inputSchema: getLinearIssuesInputSchema,
    async execute(
      { integrationId, since, until, cursor, includeCompleted },
      ctx
    ) {
      const organizationId = requireOrganizationId(ctx);
      const resolved = await getLinearToolContextByIntegrationId(
        integrationId,
        { organizationId }
      );
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
  });
}
