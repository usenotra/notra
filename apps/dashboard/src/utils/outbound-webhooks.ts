import {
  WEBHOOK_FILTER_LABELS,
  WEBHOOK_FILTERS,
} from "@/constants/outbound-webhooks";

export function getWebhookFilterLabel(value: string) {
  const filter = WEBHOOK_FILTERS.find((status) => status === value);
  return filter ? WEBHOOK_FILTER_LABELS[filter] : value;
}
