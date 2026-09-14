import "zod/compile";
import { z } from "@hono/zod-openapi";

import {
  skillContentSchema as sharedSkillContentSchema,
  skillDescriptionSchema as sharedSkillDescriptionSchema,
  skillNameSchema as sharedSkillNameSchema,
  skillUpgradePayloadSchema,
  skillUpstreamSchema as sharedSkillUpstreamSchema,
} from "../shared/skills";

const skillNameSchema = sharedSkillNameSchema.openapi({
  description: "Skill name. Lowercase letters, digits, and hyphens only.",
  example: "humanizer",
});

const skillDescriptionSchema = sharedSkillDescriptionSchema.openapi({
  description: "Short description of when the skill should be used.",
  example: "Polish near-final drafts so they sound natural and specific.",
});

const skillContentSchema = sharedSkillContentSchema.openapi({
  description: "Full skill instructions, typically Markdown.",
  example:
    "# Humanizer\n\nRewrite the draft so it reads like a person wrote it. Remove filler, vary sentence length, and keep concrete details.",
});

export const skillParamsSchema = z.object({
  name: skillNameSchema,
});

export const systemSkillVersionParamsSchema = z.object({
  name: skillNameSchema,
  version: z.coerce.number().int().positive().openapi({
    description: "Published version number of the system skill, starting at 1.",
    example: 1,
  }),
});

const skillUpstreamSchema = sharedSkillUpstreamSchema
  .openapi({
    description:
      "Update state of a system skill relative to the Notra registry. Null for custom skills.",
  })
  .openapi("SkillUpstream");

export const createSkillRequestSchema = z
  .object({
    name: skillNameSchema,
    description: skillDescriptionSchema,
    content: skillContentSchema,
  })
  .openapi("CreateSkillRequest");

export const patchSkillRequestSchema = z
  .object({
    name: skillNameSchema.optional(),
    description: skillDescriptionSchema.optional(),
    content: skillContentSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  })
  .openapi("PatchSkillRequest");

const skillSummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    isSystem: z.boolean().openapi({
      description:
        "True for built-in skills provided by Notra. System skills can be edited and renamed but not deleted.",
    }),
    updatedAt: z.string(),
    upstream: skillUpstreamSchema.nullable(),
  })
  .openapi("SkillSummary");

const skillSchema = skillSummarySchema
  .extend({
    content: z.string(),
    createdAt: z.string(),
  })
  .openapi("Skill");

export const listSkillsResponseSchema = z
  .object({
    skills: z.array(skillSummarySchema),
  })
  .openapi("ListSkillsResponse");

export const skillResponseSchema = z
  .object({
    skill: skillSchema,
  })
  .openapi("SkillResponse");

export const createSkillResponseSchema = z
  .object({
    skill: skillSchema,
  })
  .openapi("CreateSkillResponse");

export const patchSkillResponseSchema = z
  .object({
    skill: skillSchema,
  })
  .openapi("PatchSkillResponse");

export const deleteSkillResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .openapi("DeleteSkillResponse");

export const upgradeSkillRequestSchema = skillUpgradePayloadSchema.openapi(
  "UpgradeSkillRequest",
  {
    description:
      'How to rebase the organization\'s copy onto the latest published version. "discard" takes the upstream text, "keep" only rebases and leaves your text alone, "merge" stores the content you resolved.',
  }
);

export const upgradeSkillResponseSchema = z
  .object({
    name: z.string(),
    version: z.number().int().openapi({
      description: "Version the skill is now based on.",
      example: 4,
    }),
  })
  .openapi("UpgradeSkillResponse");

const systemSkillSchema = z
  .object({
    name: z.string(),
    version: z.number().int(),
    description: z.string(),
    changelog: z.string().nullable(),
    publishedAt: z.string(),
  })
  .openapi("SystemSkill");

const systemSkillDetailSchema = systemSkillSchema
  .extend({
    content: z.string(),
  })
  .openapi("SystemSkillDetail");

export const listSystemSkillsResponseSchema = z
  .object({
    systemSkills: z.array(systemSkillSchema),
  })
  .openapi("ListSystemSkillsResponse");

export const systemSkillResponseSchema = z
  .object({
    systemSkill: systemSkillDetailSchema,
  })
  .openapi("SystemSkillResponse");
