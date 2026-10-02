import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { SlackDraftCard } from "@/components/integrations/slack/slack-draft-card";
import { SlackThreadCard } from "@/components/integrations/slack/slack-thread-card";

export function SlackDemoSection() {
  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row">
      <SlackThreadCard />
      <HugeiconsIcon
        className="text-primary shrink-0 rotate-90 lg:rotate-0"
        icon={ArrowRight02Icon}
        size={28}
        strokeWidth={2.2}
      />
      <SlackDraftCard />
    </div>
  );
}
