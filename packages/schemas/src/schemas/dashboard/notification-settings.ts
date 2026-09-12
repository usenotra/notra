import "zod/compile";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const updateNotificationSettingsSchema = z.object({
  scheduledContentCreation: z.boolean().optional(),
  scheduledContentFailed: z.boolean().optional(),
  scheduledContentSkipped: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  dailySummary: z.boolean().optional(),
});

export type UpdateNotificationSettings = z.infer<
  typeof updateNotificationSettingsSchema
>;

export const updateNotificationSettingsInputSchema =
  organizationIdInputSchema.extend(updateNotificationSettingsSchema.shape);

export const onboardingNotificationPrefsSchema = z.object({
  dailySummary: z.boolean(),
  marketingEmails: z.boolean(),
});
