import { logError } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import { socialExperiments } from "@notra/db/schema";
import { defineTool } from "eve/tools";

import { ANALYTICS_QUERY_FAILED_MESSAGE } from "../constants/analytics";
import { createAbTestInputSchema } from "../schemas/analytics-tools";
import { requireOrganizationId } from "../utils/organization";

export function createCreateAbTestTool() {
  return defineTool({
    description:
      "Start a social A/B test comparing two published posts on one metric. Use post ids from get_top_posts (the platform_post_id field). The test tracks both posts' live metrics until a winner is declared in the dashboard. Use this to run data-driven experiments on hooks, formats, or topics.",
    inputSchema: createAbTestInputSchema,
    async execute(input, ctx) {
      const organizationId = requireOrganizationId(ctx);

      if (input.variantAPostId === input.variantBPostId) {
        return "Variant A and variant B must be different posts.";
      }

      try {
        const [created] = await db
          .insert(socialExperiments)
          .values({
            id: crypto.randomUUID(),
            organizationId,
            name: input.name,
            hypothesis: input.hypothesis ?? null,
            provider: input.provider,
            variantAPostId: input.variantAPostId,
            variantBPostId: input.variantBPostId,
            metric: input.metric,
          })
          .returning({ id: socialExperiments.id });

        return {
          experiment_id: created?.id ?? null,
          status: "running",
          note: "Metrics update on every analytics sync. Check results with get_ab_tests.",
        };
      } catch (error) {
        logError("Create A/B test tool failed", error, { organizationId });
        return ANALYTICS_QUERY_FAILED_MESSAGE;
      }
    },
  });
}
