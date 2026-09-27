"use client";

import { AiMagicIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { AgentFeedbackSetup } from "@/components/agent-feedback/feedback-setup";
import { Button } from "@/components/button";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { useCopyCode } from "@/components/geo/code-snippet";
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
  const tCommon = useTranslations("common");
  const { data: setup } = useAgentFeedbackSetup(organizationId);
  const { copied, copy } = useCopyCode(setup?.prompt ?? "");

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
        <div className="border-border bg-muted flex h-[4.25rem] items-center justify-between gap-3 rounded-t-2xl border border-b-0 px-4 pb-5 text-left sm:px-5">
          <h4 className="text-sm font-semibold text-balance">
            {t("setup.title")}
          </h4>
          <Button
            className="h-8 shrink-0 gap-1.5 px-3"
            disabled={!setup}
            onClick={copy}
            size="sm"
            variant="outline"
          >
            <HugeiconsIcon icon={copied ? Tick01Icon : AiMagicIcon} size={14} />
            {copied
              ? tCommon("labels.promptCopied")
              : tCommon("labels.copyAgentPrompt")}
          </Button>
        </div>
        <AgentFeedbackSetup
          className="border-border bg-card relative -mt-5 rounded-2xl border p-4 text-left sm:p-5"
          setup={setup}
          showPromptAction={false}
        />
      </div>
    </div>
  );
}
