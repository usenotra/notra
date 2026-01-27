import { z } from "zod";

export const routingDecisionSchema = z.object({
  complexity: z
    .enum(["simple", "complex"])
    .describe(
      "Whether the task is simple (greeting, quick question, single-turn) or complex (multi-step, content creation, research)"
    ),
  requiresTools: z
    .boolean()
    .describe(
      "Whether the task requires using tools like editing markdown, fetching GitHub data, or using skills"
    ),
  reasoning: z
    .string()
    .describe("Brief 1-2 sentence explanation of the routing decision"),
});

export type RoutingDecisionSchema = z.infer<typeof routingDecisionSchema>;
