import "zod/compile";
import { organizationIdSchema } from "@notra/schemas/dashboard/auth/organization";
import {
  memberRoleSchema,
  organizationNameSchema,
  organizationSlugSchema,
} from "@notra/schemas/dashboard/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const ORGANIZATION_LOGO_MAX_LENGTH = 2048;
const ORGANIZATION_SLUG_LOOKUP_MAX_LENGTH = 63;
const MEMBER_EMAIL_MAX_LENGTH = 254;
const MEMBER_ID_MAX_LENGTH = 255;
const INVITATION_ID_MAX_LENGTH = 255;

const trimmedOrganizationSlugSchema = z
  .string()
  .trim()
  .pipe(organizationSlugSchema);

const organizationSlugLookupSchema = z
  .string()
  .trim()
  .min(1)
  .max(ORGANIZATION_SLUG_LOOKUP_MAX_LENGTH);

const organizationLogoSchema = z
  .string()
  .trim()
  .url("Logo must be a valid URL")
  .max(ORGANIZATION_LOGO_MAX_LENGTH, "Logo URL is too long");

const memberEmailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address")
  .max(MEMBER_EMAIL_MAX_LENGTH, "Email address is too long");

export const createOrganizationInputSchema = z.object({
  name: organizationNameSchema,
  slug: trimmedOrganizationSlugSchema,
  logo: organizationLogoSchema.optional(),
  keepCurrentActiveOrganization: z.boolean().optional(),
});

export const updateOrganizationInputSchema = z.object({
  organizationId: organizationIdSchema,
  data: z.object({
    name: organizationNameSchema.optional(),
    slug: trimmedOrganizationSlugSchema.optional(),
    logo: organizationLogoSchema.optional(),
  }),
});

export const setActiveOrganizationInputSchema = z.object({
  organizationId: organizationIdSchema.optional(),
  organizationSlug: organizationSlugLookupSchema.optional(),
});

export const organizationLookupQueryInputSchema = z
  .object({
    query: z
      .object({
        organizationId: organizationIdSchema.optional(),
        organizationSlug: organizationSlugLookupSchema.optional(),
      })
      .optional(),
  })
  .optional();

export const organizationScopedQueryInputSchema = z
  .object({
    query: z
      .object({
        organizationId: organizationIdSchema.optional(),
      })
      .optional(),
  })
  .optional();

export const inviteMemberInputSchema = z.object({
  email: memberEmailSchema,
  role: memberRoleSchema,
  organizationId: organizationIdSchema.optional(),
});

export const invitationActionInputSchema = z.object({
  invitationId: z.string().trim().min(1).max(INVITATION_ID_MAX_LENGTH),
});

export const updateMemberRoleInputSchema = z.object({
  memberId: z.string().trim().min(1).max(MEMBER_ID_MAX_LENGTH),
  role: memberRoleSchema,
  organizationId: organizationIdSchema.optional(),
});

export const removeMemberInputSchema = z.object({
  memberIdOrEmail: z.string().trim().min(1).max(MEMBER_EMAIL_MAX_LENGTH),
  organizationId: organizationIdSchema.optional(),
});
