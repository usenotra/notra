import "zod/compile";
import { SKILL_UPGRADE_STRATEGIES } from "@notra/ai/skills/constants";
import { z } from "zod";

import {
  SKILL_CONTENT_MAX_LENGTH,
  SKILL_DESCRIPTION_MAX_LENGTH,
  SKILL_NAME_MAX_LENGTH,
  SKILL_NAME_REGEX,
} from "../../constants/skills";

export const skillNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(
    SKILL_NAME_MAX_LENGTH,
    `Name must be ${SKILL_NAME_MAX_LENGTH} characters or fewer`
  )
  .regex(
    SKILL_NAME_REGEX,
    "Name must be lowercase, start and end with a letter or digit, and contain only letters, digits, and hyphens"
  );

export const skillDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Description is required")
  .max(
    SKILL_DESCRIPTION_MAX_LENGTH,
    `Description must be ${SKILL_DESCRIPTION_MAX_LENGTH} characters or fewer`
  );

export const skillContentSchema = z
  .string()
  .min(1, "Content is required")
  .max(SKILL_CONTENT_MAX_LENGTH, "Content is too large");

export const skillUpgradeStrategySchema = z.enum(SKILL_UPGRADE_STRATEGIES);

/**
 * Derived update state of one org copy of a system skill. `null` for custom
 * skills, which have no upstream version to compare against.
 */
export const skillUpstreamSchema = z.object({
  /** Registry name the copy follows; differs from the skill name after a rename. */
  systemName: z.string(),
  baseVersion: z.number().int(),
  latestVersion: z.number().int(),
  isModified: z.boolean(),
  updateAvailable: z.boolean(),
  changelog: z.string().nullable(),
});

export const skillUpgradePayloadSchema = z
  .object({
    strategy: skillUpgradeStrategySchema,
    content: skillContentSchema.optional(),
    description: skillDescriptionSchema.optional(),
  })
  .refine(
    (value) => value.strategy !== "merge" || Boolean(value.content?.trim()),
    {
      message: 'The "merge" strategy requires the merged content',
      path: ["content"],
    }
  );

export type SkillUpgradePayload = z.infer<typeof skillUpgradePayloadSchema>;
