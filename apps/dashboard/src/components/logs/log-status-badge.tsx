import { Badge } from "@notra/ui/components/ui/badge";

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
  return (
    <Badge className="capitalize" variant={STATUS_VARIANTS[status.label]}>
      {status.label}
    </Badge>
  );
}
