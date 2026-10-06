import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { IntegrationDraftCard } from "@/components/integrations/integration-draft-card";
import { SlackThreadCard } from "@/components/integrations/slack/slack-thread-card";
import {
  SLACK_DRAFT_ACTION_LABEL,
  SLACK_DRAFT_BODY,
  SLACK_DRAFT_HEADLINE,
  SLACK_DRAFT_META,
  SLACK_DRAFT_SECONDARY_ACTION_LABEL,
  SLACK_DRAFT_TITLE,
} from "@/constants/slack-integration";

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
      <IntegrationDraftCard
        actionLabel={SLACK_DRAFT_ACTION_LABEL}
        body={SLACK_DRAFT_BODY}
        headline={SLACK_DRAFT_HEADLINE}
        meta={SLACK_DRAFT_META}
        secondaryActionLabel={SLACK_DRAFT_SECONDARY_ACTION_LABEL}
        title={SLACK_DRAFT_TITLE}
      />
    </div>
  );
}
