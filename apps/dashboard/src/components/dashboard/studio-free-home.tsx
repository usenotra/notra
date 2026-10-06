"use client";

import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { useTranslations } from "use-intl";

import { AgentFeedbackActivityCard } from "@/components/agent-feedback/feedback-activity-card";
import { AgentFeedbackInbox } from "@/components/agent-feedback/feedback-inbox";
import { AgentFeedbackSetupDialog } from "@/components/agent-feedback/feedback-setup-dialog";
import { AgentFeedbackSetupNudge } from "@/components/agent-feedback/feedback-setup-nudge";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import type { StudioFreeHomeProps } from "@/types/dashboard/home";

/** Studio home for workspaces without a paid plan: the free feedback inbox. */
export function StudioFreeHome({ greetingText, slug }: StudioFreeHomeProps) {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const { activeOrganization, getOrganization } = useOrganizationsContext();
  const organizationId =
    (activeOrganization?.slug === slug
      ? activeOrganization
      : getOrganization(slug)
    )?.id ?? "";

  return (
    <AgentFeedbackInbox
      emptyState={<AgentFeedbackSetupNudge organizationId={organizationId} />}
      footer={<AgentFeedbackActivityCard organizationId={organizationId} />}
      heading={(isEmpty) => (
        <div className="space-y-6">
          <PageHeading title={greetingText} />
          <div className="flex flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:items-center @min-[40rem]/main:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">
                {tCommon("labels.feedback")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("feedbackDescription")}
              </p>
            </div>
            {organizationId && !isEmpty ? (
              <AgentFeedbackSetupDialog organizationId={organizationId} />
            ) : null}
          </div>
        </div>
      )}
      organizationId={organizationId}
    />
  );
}
