import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { LinearCycleCard } from "@/components/integrations/linear/linear-cycle-card";
import { LinearDraftCard } from "@/components/integrations/linear/linear-draft-card";

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
      <LinearDraftCard />
    </div>
  );
}
