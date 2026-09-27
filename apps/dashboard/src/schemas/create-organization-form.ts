import { RESERVED_ORGANIZATION_SLUGS } from "@notra/schemas/constants/dashboard/organization";
import { z } from "zod";

import type { CreateOrgFormTranslator } from "@/types/dashboard/create-org-form";
import type { CommonTranslator } from "@/types/i18n";

export function createOrganizationFormSchema(
  t: CreateOrgFormTranslator,
  tCommon: CommonTranslator
) {
  return z.object({
    name: z
      .string()
      .min(2, tCommon("messages.organizationNameTooShort"))
      .max(100, tCommon("messages.organizationNameTooLong")),
    slug: z
      .string()
      .slugify()
      .min(2, tCommon("messages.organizationSlugTooShort"))
      .max(63, tCommon("messages.organizationSlugTooLong"))
      .refine(
        (value) =>
          !RESERVED_ORGANIZATION_SLUGS.some((reserved) => reserved === value),
        tCommon("messages.thisSlugIsReservedAnd")
      ),
    website: z.string().url(t("websiteInvalid")).optional().or(z.literal("")),
  });
}
