// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

const ASK_QUERY_MAX_LENGTH = 2000;

export const askRequestSchema = z.object({
  query: z.union([
    z
      .object({
        text: z.string().trim().min(1).max(ASK_QUERY_MAX_LENGTH),
      })
      .catchall(z.unknown()),
    z
      .string()
      .trim()
      .min(1)
      .max(ASK_QUERY_MAX_LENGTH)
      .transform((text) => ({ text })),
  ]),
  context: z.record(z.string(), z.unknown()).optional(),
  streaming: z.boolean().optional(),
  mode: z.string().optional(),
  prefer: z
    .object({
      streaming: z.boolean().optional(),
      response_format: z.string().optional(),
      mode: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
  meta: z
    .object({
      version: z.string().optional(),
      session_context: z.record(z.string(), z.unknown()).optional(),
      user: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    })
    .catchall(z.unknown())
    .optional(),
});
