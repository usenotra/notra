import "zod/compile";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const ATTACHMENT_FILTER = [
  "all",
  "image",
  "pdf",
  "text",
  "other",
] as const;
export type AttachmentFilter = (typeof ATTACHMENT_FILTER)[number];

export const listAttachmentsInputSchema = z.object({
  organizationId: organizationIdSchema,
  filter: z.enum(ATTACHMENT_FILTER).default("all"),
  cursor: z
    .object({
      createdAt: z.string().datetime(),
      id: z.string(),
    })
    .optional(),
});

export const deleteManyAttachmentsInputSchema = z.object({
  organizationId: organizationIdSchema,
  keys: z.array(z.string().min(1)).min(1).max(500),
});
