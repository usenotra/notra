import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FEATURES } from "@notra/ai/billing/features";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";

import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";

export function LogRetentionHint() {
  const { check, data: customer } = useBillingCustomer();
  let days = 7;
  if (
    customer &&
    check({ featureId: FEATURES.LOG_RETENTION_30_DAYS }).allowed
  ) {
    days = 30;
  } else if (
    customer &&
    check({ featureId: FEATURES.LOG_RETENTION_14_DAYS }).allowed
  ) {
    days = 14;
  }
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label="Log retention information"
        className="text-muted-foreground hover:text-foreground inline-flex cursor-help transition-colors"
      >
        <HugeiconsIcon className="size-3.5" icon={InformationCircleIcon} />
      </TooltipTrigger>
      <TooltipContent>
        Log data is retained for {days} days. Older entries are automatically
        removed.
      </TooltipContent>
    </Tooltip>
  );
}
