import { Badge } from "@notra/ui/components/ui/badge";

import { useLogStatusLabels } from "@/lib/hooks/use-log-status-labels";
import type { StatusWithCode } from "@/types/webhooks/webhooks";

const STATUS_VARIANTS: Record<
  StatusWithCode["label"],
  "success" | "destructive" | "secondary"
> = {
  success: "success",
  failed: "destructive",
  pending: "secondary",
  skipped: "secondary",
};

export function LogStatusBadge({ status }: { status: StatusWithCode }) {
  const statusLabels = useLogStatusLabels();
  return (
    <Badge variant={STATUS_VARIANTS[status.label]}>
      {statusLabels[status.label]}
    </Badge>
  );
}
