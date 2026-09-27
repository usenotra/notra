"use client";

import { Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AgentFeedbackSetup } from "@/components/agent-feedback/feedback-setup";
import { Button } from "@/components/button";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useAgentFeedbackSetup } from "@/lib/hooks/use-agent-feedback";
import type { AgentFeedbackSetupDialogProps } from "@/types/agent-feedback";

export function AgentFeedbackSetupDialog({
  organizationId,
}: AgentFeedbackSetupDialogProps) {
  const t = useTranslations("feedback.setup");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const { data: setup } = useAgentFeedbackSetup(organizationId);

  return (
    <>
      <Button
        className="w-fit gap-1.5"
        onClick={() => {
          trackEvent(POSTHOG_EVENTS.AGENT_FEEDBACK_SETUP_OPENED, {
            has_setup: setup !== undefined,
          });
          setOpen(true);
        }}
        size="sm"
        variant="outline"
      >
        <HugeiconsIcon className="size-4" icon={Settings01Icon} />
        {t("trigger")}
      </Button>
      <ResponsiveDialog onOpenChange={setOpen} open={open}>
        <ResponsiveDialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[40rem]">
          <ResponsiveDialogHeader className="shrink-0 border-b p-4 pr-14">
            <ResponsiveDialogTitle>{t("title")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t("dialogDescription")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <AgentFeedbackSetup setup={setup} />
          </div>
          <ResponsiveDialogFooter className="bg-muted/50 mx-0 mb-0 shrink-0 rounded-b-xl border-t p-4">
            <ResponsiveDialogClose render={<Button variant="outline" />}>
              {tCommon("actions.done")}
            </ResponsiveDialogClose>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
