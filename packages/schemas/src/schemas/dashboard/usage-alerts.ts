import "zod/compile";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const USAGE_ALERT_THRESHOLD_TYPES = [
  "usage",
  "usage_percentage",
  "remaining",
  "remaining_percentage",
] as const;

export const usageAlertSchema = z
  .object({
    featureId: z.string().trim().min(1).max(100).optional(),
    enabled: z.boolean(),
    name: z.string().trim().max(80).optional(),
    threshold: z.number().finite().nonnegative(),
    thresholdType: z.enum(USAGE_ALERT_THRESHOLD_TYPES),
  })
  .refine(
    ({ threshold, thresholdType }) =>
      !thresholdType.endsWith("_percentage") || threshold <= 100,
    {
      message: "Percentage thresholds must be between 0 and 100",
      path: ["threshold"],
    }
  );

export const updateUsageAlertsInputSchema = organizationIdInputSchema.extend({
  alerts: z.array(usageAlertSchema).max(20),
});

export type UsageAlertInput = z.infer<typeof usageAlertSchema>;
