import "zod/compile";
import z from "zod";

export const organizationIdSchema = z.string().min(1);

export const organizationIdInputSchema = z.object({
  organizationId: organizationIdSchema,
});

const ORGANIZATION_SLUG_MAX_LENGTH = 63;

export const organizationSlugParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(ORGANIZATION_SLUG_MAX_LENGTH);
