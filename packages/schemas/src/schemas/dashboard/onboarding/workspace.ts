import "zod/compile";
import { optionalPublicWebsiteUrlSchema } from "@notra/geo-core/schemas/url";
import {
  organizationNameSchema,
  organizationSlugSchema,
} from "@notra/schemas/dashboard/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import { ONBOARDING_HEARD_ABOUT_NOTRA_SOURCES } from "../../../constants/dashboard/onboarding";
import type { OnboardingAttributionValue } from "../../../types/dashboard/onboarding";

const heardAboutNotraSourceSchema = z.union([
  z.enum(ONBOARDING_HEARD_ABOUT_NOTRA_SOURCES),
  z.literal(""),
  z.null(),
]);

export const onboardingWorkspaceFieldsSchema = z.object({
  name: organizationNameSchema,
  slug: organizationSlugSchema,
  websiteUrl: optionalPublicWebsiteUrlSchema,
  heardAboutNotraSource: heardAboutNotraSourceSchema,
  heardAboutNotraOther: z.string().trim().max(120).nullish(),
  dailySummary: z.boolean(),
  marketingEmails: z.boolean(),
});

function addAttributionIssues(
  value: OnboardingAttributionValue,
  ctx: z.RefinementCtx
) {
  if (
    value.heardAboutNotraSource === "other" &&
    !value.heardAboutNotraOther?.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please share where you heard about Notra",
      path: ["heardAboutNotraOther"],
    });
  }
}

function normalizeAttribution<T extends OnboardingAttributionValue>(value: T) {
  return {
    ...value,
    heardAboutNotraSource: value.heardAboutNotraSource || null,
    heardAboutNotraOther:
      value.heardAboutNotraSource === "other"
        ? value.heardAboutNotraOther?.trim() || null
        : null,
  };
}

export const onboardingWorkspaceFormFieldsSchema =
  onboardingWorkspaceFieldsSchema.extend({
    heardAboutNotraSource: z.union([
      z.enum(ONBOARDING_HEARD_ABOUT_NOTRA_SOURCES),
      z.literal(""),
    ]),
    heardAboutNotraOther: z.string().trim().max(120),
  });

export const onboardingWorkspaceFormSchema =
  onboardingWorkspaceFormFieldsSchema.superRefine(addAttributionIssues);

export const onboardingWorkspaceAttributionSchema =
  onboardingWorkspaceFieldsSchema
    .pick({
      heardAboutNotraOther: true,
      heardAboutNotraSource: true,
    })
    .superRefine(addAttributionIssues)
    .transform(normalizeAttribution);

export const onboardingWorkspaceSchema = onboardingWorkspaceFieldsSchema
  .superRefine(addAttributionIssues)
  .transform(normalizeAttribution);
