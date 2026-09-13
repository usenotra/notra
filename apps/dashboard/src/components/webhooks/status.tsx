import { Badge } from "@notra/ui/components/ui/badge";

import { WEBHOOK_STATUS_VARIANTS } from "@/constants/outbound-webhooks";
import type { OutboundDelivery } from "@/types/webhooks/outbound";

export function WebhookStatus({ status }: Pick<OutboundDelivery, "status">) {
  return (
    <Badge className="capitalize" variant={WEBHOOK_STATUS_VARIANTS[status]}>
      {status}
    </Badge>
  );
}
