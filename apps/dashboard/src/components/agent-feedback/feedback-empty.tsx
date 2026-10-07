"use client";

import { useTranslations } from "use-intl";

import { AgentFeedbackSetup } from "@/components/agent-feedback/feedback-setup";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { CopyPromptButton } from "@/components/geo/code-snippet";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { useAgentFeedbackSetup } from "@/lib/hooks/use-agent-feedback";
import type { AgentFeedbackEmptyProps } from "@/types/agent-feedback";

export function AgentFeedbackEmpty({
  organizationId,
}: AgentFeedbackEmptyProps) {
  const t = useTranslations("feedback");
  const { data: setup } = useAgentFeedbackSetup(organizationId);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 select-none sm:px-4 sm:pt-4"
      >
        <div className="mask-[linear-gradient(to_bottom,black_0%,transparent_100%)] opacity-[0.38]">
          <EmptyStateTablePreview
            columns={EMPTY_STATE_TABLE_COLUMNS.feedback}
            rows={EMPTY_STATE_TABLE_ROWS}
          />
        </div>
      </div>
      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
        <div className="mb-6 text-center">
          <h3 className="text-xl font-semibold text-balance">
            {t("empty.title")}
          </h3>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm text-pretty">
            {t("empty.description")}
          </p>
        </div>
        <div className="border-shell-border bg-shell flex h-[4.25rem] items-center justify-between gap-3 rounded-t-2xl border border-b-0 px-4 pb-5 text-left sm:px-5">
          <h4 className="text-sm font-semibold text-balance">
            {t("setup.title")}
          </h4>
          <CopyPromptButton
            className="shrink-0"
            disabled={!setup}
            prompt={setup?.prompt ?? ""}
          />
        </div>
        <AgentFeedbackSetup
          className="border-border bg-card shadow-lift relative -mt-5 rounded-2xl border p-4 text-left sm:p-5"
          setup={setup}
          showPromptAction={false}
        />
      </div>
    </div>
  );
}
