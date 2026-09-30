import { WEBHOOK_FILTERS } from "@/constants/outbound-webhooks";
import type { WebhookFilter } from "@/types/webhooks/outbound";

export function isWebhookFilter(value: string): value is WebhookFilter {
  return WEBHOOK_FILTERS.some((status) => status === value);
}
