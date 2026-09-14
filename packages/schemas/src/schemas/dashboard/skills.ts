import "zod/compile";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import {
  skillContentSchema,
  skillDescriptionSchema,
  skillNameSchema,
  skillUpgradePayloadSchema,
} from "../shared/skills";

export const createSkillSchema = z.object({
  name: skillNameSchema,
  description: skillDescriptionSchema,
  content: skillContentSchema,
});

export const skillImportUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.host === "skills.sh";
    } catch {
      return false;
    }
  }, "Only skills.sh links are supported");

export const updateSkillSchema = z.object({
  name: skillNameSchema.optional(),
  description: skillDescriptionSchema,
  content: skillContentSchema,
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;

/** Skills are addressed by id so a rename never changes a URL or cache key. */
const skillIdSchema = z.string().trim().min(1, "Skill id is required");

export const listSkillsInputSchema = z.object({
  organizationId: organizationIdSchema,
});

export const getSkillInputSchema = z.object({
  organizationId: organizationIdSchema,
  id: skillIdSchema,
});

export const createSkillInputSchema = z.object({
  organizationId: organizationIdSchema,
  payload: createSkillSchema,
});

export const updateSkillInputSchema = z.object({
  organizationId: organizationIdSchema,
  id: skillIdSchema,
  payload: updateSkillSchema,
});

export const deleteSkillInputSchema = z.object({
  organizationId: organizationIdSchema,
  id: skillIdSchema,
});

export const importSkillFromUrlInputSchema = z.object({
  url: skillImportUrlSchema,
});

/** Base and latest published version of a system skill, for the diff and merge UI. */
export const getSkillUpstreamInputSchema = z.object({
  organizationId: organizationIdSchema,
  id: skillIdSchema,
});

export const upgradeSkillInputSchema = z.object({
  organizationId: organizationIdSchema,
  id: skillIdSchema,
  payload: skillUpgradePayloadSchema,
});

export type UpgradeSkillInput = z.infer<typeof upgradeSkillInputSchema>;
