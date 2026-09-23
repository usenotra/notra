import {
  skillContentSchema,
  skillDescriptionSchema,
  skillNameSchema,
} from "@notra/ai/schemas/skills";
import { z } from "zod";

export const skillNameInputSchema = z.object({
  name: z.string().min(1),
});

export const listSkillsInputSchema = z.object({});

export const createSkillInputSchema = z.object({
  name: skillNameSchema.describe(
    "Unique skill name in lowercase kebab-case: must start and end with a letter or digit, with single hyphens only between parts."
  ),
  description: skillDescriptionSchema.describe(
    "One-sentence description of when to apply this skill."
  ),
  content: skillContentSchema.describe(
    "The full skill body: the reusable writing guidance applied when drafting content."
  ),
});

export const updateSkillInputSchema = z
  .object({
    name: z.string().min(1),
    content: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
  })
  .refine(
    (input) => input.content !== undefined || input.description !== undefined,
    { message: "Provide content or description to update" }
  );
