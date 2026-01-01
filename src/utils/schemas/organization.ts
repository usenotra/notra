// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { RESERVED_ORGANIZATION_SLUGS } from "@/utils/constants";

export const organizationSlugSchema = z
  .string()
  .slugify()
  .min(3, "Organization slug must be at least 3 characters long")
  .max(63, "Organization slug must be at most 63 characters long")
  .refine(
    (value) =>
      !RESERVED_ORGANIZATION_SLUGS.includes(
        value as (typeof RESERVED_ORGANIZATION_SLUGS)[number]
      ),
    "This slug is reserved and cannot be used for an organization"
  );

export const organizationNameSchema = z
  .string()
  .min(2, "Organization name must be at least 2 characters")
  .max(100, "Organization name must be at most 100 characters");

export const organizationWebsiteSchema = z
  .string()
  .url("Please enter a valid URL (e.g., https://example.com)")
  .optional()
  .or(z.literal(""));

export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
  slug: organizationSlugSchema,
  website: organizationWebsiteSchema,
});
