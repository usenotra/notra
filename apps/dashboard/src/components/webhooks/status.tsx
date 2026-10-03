import { Badge } from "@notra/ui/components/ui/badge";
import { useTranslations } from "next-intl";

import { WEBHOOK_STATUS_VARIANTS } from "@/constants/outbound-webhooks";
import type { OutboundDelivery } from "@/types/webhooks/outbound";

export function WebhookStatus({ status }: Pick<OutboundDelivery, "status">) {
  const t = useTranslations("settings.panes.webhooks.statuses");
  return <Badge variant={WEBHOOK_STATUS_VARIANTS[status]}>{t(status)}</Badge>;
}
