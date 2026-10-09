// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const repoImageModeSchema = z.enum(["prompt", "pr", "commit"]);
export const REPO_IMAGE_MODES = repoImageModeSchema.options;

export const repoImageFormatSchema = z.enum(["marketing", "diagram"]);

const repoImageRequestFields = {
  integrationId: z.string().min(1, "Integration ID is required"),
  branch: z.string().trim().min(1, "Branch is required"),
  brandIdentityId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      "Optional brand identity id to inject into the image sandbox. Omit to use the default brand identity."
    ),
  mode: repoImageModeSchema,
  format: repoImageFormatSchema
    .optional()
    .describe(
      "marketing (default): a polished 1200x630 social card in the product's own UI style. diagram: a hand-drawn Excalidraw explainer diagram (flow, architecture, state machine, before/after) that the user can also paste into Excalidraw or tldraw and edit. Pick diagram when the user asks how something works, for an architecture or flow diagram, or mentions Excalidraw, tldraw, a whiteboard, or a sketch."
    ),
  prompt: z.string().trim().max(500).optional(),
  prNumber: z.number().int().positive().optional(),
  commitSha: z
    .string()
    .trim()
    .regex(/^[0-9a-f]{7,40}$/i, "Must be a git SHA (7-40 hex chars)")
    .optional(),
};

function validateRepoImageModeInput(
  value: {
    mode: z.infer<typeof repoImageModeSchema>;
    prompt?: string;
    prNumber?: number;
    commitSha?: string;
  },
  ctx: z.RefinementCtx
) {
  if (value.mode === "prompt" && !value.prompt) {
    ctx.addIssue({
      code: "custom",
      path: ["prompt"],
      message: "Prompt is required",
    });
  }
  if (value.mode === "pr" && value.prNumber === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["prNumber"],
      message: "PR number is required",
    });
  }
  if (value.mode === "commit" && !value.commitSha) {
    ctx.addIssue({
      code: "custom",
      path: ["commitSha"],
      message: "Commit SHA is required",
    });
  }
}

export const generateRepoImageInputSchema = z
  .object({
    organizationId: z.string().min(1, "Organization ID is required"),
    ...repoImageRequestFields,
  })
  .superRefine(validateRepoImageModeInput);

export const imageToolInputSchema = z
  .object(repoImageRequestFields)
  .extend({
    title: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .describe("A concise title for the saved image content"),
    sourcePostId: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        "Optional existing image post ID to continue from its saved sandbox snapshot"
      ),
  })
  .superRefine(validateRepoImageModeInput);

export const imageRevisionToolInputSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe("The visual changes to apply to the current image"),
  title: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .describe("Optional updated title for the image content"),
  useRepository: z
    .boolean()
    .optional()
    .describe(
      "Diagrams only. Diagram edits normally take a few seconds and change the existing diagram directly. Set true only when the change needs new facts from the repository code; this restores the sandbox and takes minutes."
    ),
});

export const unavailableImageRevisionToolInputSchema = z.object({
  prompt: z.string().optional(),
});

const repoImageCostNumberSchema = z.number().finite().nonnegative();

const repoImageCostInputTokenDetailsSchema = z
  .object({
    cacheReadTokens: repoImageCostNumberSchema.optional(),
    cacheWriteTokens: repoImageCostNumberSchema.optional(),
    cacheCreationInputTokens: repoImageCostNumberSchema.optional(),
    cache_read_tokens: repoImageCostNumberSchema.optional(),
    cache_write_tokens: repoImageCostNumberSchema.optional(),
    cache_creation_input_tokens: repoImageCostNumberSchema.optional(),
  })
  .passthrough();

export const repoImageCostSchema = z
  .object({
    inputTokens: repoImageCostNumberSchema.optional(),
    input_tokens: repoImageCostNumberSchema.optional(),
    input: repoImageCostNumberSchema.optional(),
    outputTokens: repoImageCostNumberSchema.optional(),
    output_tokens: repoImageCostNumberSchema.optional(),
    output: repoImageCostNumberSchema.optional(),
    cacheReadTokens: repoImageCostNumberSchema.optional(),
    cacheReadInputTokens: repoImageCostNumberSchema.optional(),
    cachedInputTokens: repoImageCostNumberSchema.optional(),
    cache_read_tokens: repoImageCostNumberSchema.optional(),
    cache_read_input_tokens: repoImageCostNumberSchema.optional(),
    cached_input_tokens: repoImageCostNumberSchema.optional(),
    cacheWriteTokens: repoImageCostNumberSchema.optional(),
    cacheWriteInputTokens: repoImageCostNumberSchema.optional(),
    cacheCreationInputTokens: repoImageCostNumberSchema.optional(),
    cache_write_tokens: repoImageCostNumberSchema.optional(),
    cache_write_input_tokens: repoImageCostNumberSchema.optional(),
    cache_creation_input_tokens: repoImageCostNumberSchema.optional(),
    inputTokenDetails: repoImageCostInputTokenDetailsSchema.optional(),
    input_token_details: repoImageCostInputTokenDetailsSchema.optional(),
    computeMs: repoImageCostNumberSchema.optional(),
    compute_ms: repoImageCostNumberSchema.optional(),
    totalUsd: repoImageCostNumberSchema.optional(),
    total_usd: repoImageCostNumberSchema.optional(),
  })
  .passthrough();
