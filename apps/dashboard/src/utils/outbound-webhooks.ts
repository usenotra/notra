import { WEBHOOK_FILTERS } from "@/constants/outbound-webhooks";
import type { WebhookFilter } from "@/types/webhooks/outbound";

export function isWebhookFilter(value: string): value is WebhookFilter {
  return WEBHOOK_FILTERS.some((status) => status === value);
}

/** Host of an endpoint URL for compact display; falls back to the raw value. */
export function webhookHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
