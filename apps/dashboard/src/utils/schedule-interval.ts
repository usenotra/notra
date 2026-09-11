import type { CustomIntervalCron } from "@notra/ai/types/schedule-interval";
import { triggerSourceConfigSchema } from "@notra/schemas/dashboard/integrations";

/**
 * Reads the "every N days" settings out of a stored trigger source config.
 * Returns `null` for every other frequency or a malformed config.
 */
export function parseCustomIntervalCron(
  sourceConfig: unknown
): CustomIntervalCron | null {
  const parsed = triggerSourceConfigSchema.safeParse(sourceConfig);
  if (!parsed.success) {
    return null;
  }
  const cron = parsed.data.cron;
  if (
    !cron ||
    cron.frequency !== "custom" ||
    cron.intervalDays === undefined ||
    cron.anchorDate === undefined
  ) {
    return null;
  }
  return {
    hour: cron.hour,
    minute: cron.minute,
    intervalDays: cron.intervalDays,
    anchorDate: cron.anchorDate,
  };
}
