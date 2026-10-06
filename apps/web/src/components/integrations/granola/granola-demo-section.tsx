import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { GranolaNoteCard } from "@/components/integrations/granola/granola-note-card";
import { IntegrationDraftCard } from "@/components/integrations/integration-draft-card";
import {
  GRANOLA_DRAFT_ACTION_LABEL,
  GRANOLA_DRAFT_BODY,
  GRANOLA_DRAFT_HEADLINE,
  GRANOLA_DRAFT_META,
  GRANOLA_DRAFT_TITLE,
} from "@/constants/granola-integration";

export function GranolaDemoSection() {
  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row">
      <GranolaNoteCard />
      <HugeiconsIcon
        className="text-primary shrink-0 rotate-90 lg:rotate-0"
        icon={ArrowRight02Icon}
        size={28}
        strokeWidth={2.2}
      />
      <IntegrationDraftCard
        actionLabel={GRANOLA_DRAFT_ACTION_LABEL}
        body={GRANOLA_DRAFT_BODY}
        headline={GRANOLA_DRAFT_HEADLINE}
        meta={GRANOLA_DRAFT_META}
        title={GRANOLA_DRAFT_TITLE}
      />
    </div>
  );
}
