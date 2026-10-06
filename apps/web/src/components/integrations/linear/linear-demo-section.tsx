import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { IntegrationDraftCard } from "@/components/integrations/integration-draft-card";
import { LinearCycleCard } from "@/components/integrations/linear/linear-cycle-card";
import {
  LINEAR_DRAFT_ACTION_LABEL,
  LINEAR_DRAFT_BODY,
  LINEAR_DRAFT_HEADLINE,
  LINEAR_DRAFT_META,
  LINEAR_DRAFT_TITLE,
} from "@/constants/linear-integration";

export function LinearDemoSection() {
  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row">
      <LinearCycleCard />
      <HugeiconsIcon
        className="text-primary shrink-0 rotate-90 lg:rotate-0"
        icon={ArrowRight02Icon}
        size={28}
        strokeWidth={2.2}
      />
      <IntegrationDraftCard
        actionLabel={LINEAR_DRAFT_ACTION_LABEL}
        body={LINEAR_DRAFT_BODY}
        headline={LINEAR_DRAFT_HEADLINE}
        meta={LINEAR_DRAFT_META}
        title={LINEAR_DRAFT_TITLE}
      />
    </div>
  );
}
