import { z } from "zod";

export const codeResearchBriefSchema = z.object({
  status: z
    .enum(["found", "not_found", "unavailable"])
    .describe(
      "found when the feature was located in the code; not_found when the repository was readable but the feature could not be located; unavailable when code research is disabled, no repository is connected, or the sandbox failed"
    ),
  feature: z
    .string()
    .describe("Short user-facing name of the feature that was researched"),
  summary: z
    .string()
    .describe(
      "3-5 sentences from the user's point of view: what the feature does and why it matters"
    ),
  userFacingBehavior: z
    .array(z.string())
    .default([])
    .describe("Concrete behaviors a user notices, one per entry"),
  howToUse: z
    .array(
      z.object({
        kind: z.enum(["ui", "api", "cli", "config", "sdk"]),
        detail: z
          .string()
          .describe(
            "How a user reaches or uses it: UI navigation (never a route pattern), public endpoint, command, setting, or SDK call"
          ),
      })
    )
    .default([]),
  codeExamples: z
    .array(
      z.object({
        language: z.string(),
        snippet: z
          .string()
          .describe(
            "Only public API, CLI, SDK, or config usage a customer would write. Never internal implementation code."
          ),
        sourcePath: z.string(),
      })
    )
    .default([]),
  limitations: z
    .array(z.string())
    .default([])
    .describe(
      "What a user needs to know to use it: prerequisites, plan gates, permissions, supported platforms"
    ),
  sources: z
    .array(
      z.object({
        path: z.string(),
        sha: z.string(),
      })
    )
    .default([])
    .describe(
      "Files the findings are based on. Internal reference for the writer, never for publication."
    ),
  confidence: z.enum(["high", "medium", "low"]),
  openQuestions: z
    .array(z.string())
    .default([])
    .describe(
      "Things the code did not answer that the writer should not guess"
    ),
  reason: z
    .string()
    .nullable()
    .default(null)
    .describe("For not_found and unavailable, explain what went wrong"),
});
