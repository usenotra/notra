import "zod/compile";
import { updateChatSessionSchema } from "@notra/ai/schemas/chat";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import { createChatPostSchema } from "./content";

const chatOrganizationInputSchema = z.object({
  organizationId: organizationIdSchema,
});

export const listChatSessionsInputSchema = chatOrganizationInputSchema.extend({
  projectId: z.string().nullish(),
});

export const chatSessionInputSchema = chatOrganizationInputSchema.extend({
  chatId: z.string().min(1),
});

export const updateChatSessionInputSchema = chatSessionInputSchema.and(
  updateChatSessionSchema
);

export const createChatPostInputSchema = createChatPostSchema.extend({
  organizationId: organizationIdSchema,
});
