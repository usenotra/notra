import type { LogRetentionDays } from "@/lib/webhooks/logging";
import { autumn } from "./autumn";
import { FEATURES } from "./constants";

export async function checkLogRetention(
  organizationId: string
): Promise<LogRetentionDays> {
  if (!autumn) {
    return 30;
  }

  const { data, error } = await autumn.check({
    customer_id: organizationId,
    feature_id: FEATURES.LOG_RETENTION_30_DAYS,
  });

  if (error || !data) {
    return 30;
  }

  return data.allowed ? 30 : 7;
}
