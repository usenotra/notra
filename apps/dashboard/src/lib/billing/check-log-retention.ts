import { Autumn } from "autumn-js";
import { FEATURES } from "./constants";
import type { LogRetentionDays } from "@/lib/webhooks/logging";

const AUTUMN_SECRET_KEY = process.env.AUTUMN_SECRET_KEY;
const autumn = AUTUMN_SECRET_KEY ? new Autumn() : null;

export async function checkLogRetention(
  organizationId: string,
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
