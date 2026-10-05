"use client";

import { useTranslations } from "use-intl";

import { AgentFeedbackSetupDialog } from "@/components/agent-feedback/feedback-setup-dialog";
import { buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { AGENT_FEEDBACK_DOCS_URL } from "@/constants/agent-feedback";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import type { AgentFeedbackSetupNudgeProps } from "@/types/agent-feedback";

/** Empty inbox prompt on the home page: docs link plus the setup dialog. */
export function AgentFeedbackSetupNudge({
  organizationId,
  compact = false,
}: AgentFeedbackSetupNudgeProps) {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  return (
    <EmptyState
      action={
        <div className="flex items-center gap-2">
          <a
            className={buttonVariants({ size: "sm", variant: "secondary" })}
            href={AGENT_FEEDBACK_DOCS_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            {tCommon("actions.learnMore")}
          </a>
          <AgentFeedbackSetupDialog
            organizationId={organizationId}
            triggerVariant="default"
          />
        </div>
      }
      description={t("feedbackSetupDescription")}
      className={compact ? "min-h-0 py-10" : undefined}
      preview={
        compact ? undefined : (
          <EmptyStateTablePreview
            columns={EMPTY_STATE_TABLE_COLUMNS.feedback}
            rows={EMPTY_STATE_TABLE_ROWS}
          />
        )
      }
      title={t("feedbackSetupTitle")}
    />
  );
}
