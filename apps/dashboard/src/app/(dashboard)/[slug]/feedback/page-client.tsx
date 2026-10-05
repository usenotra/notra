"use client";

import { useTranslations } from "use-intl";

import { AgentFeedbackInbox } from "@/components/agent-feedback/feedback-inbox";
import { AgentFeedbackSetupDialog } from "@/components/agent-feedback/feedback-setup-dialog";
import { PageHeading } from "@/components/layout/page-heading";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import type { AgentFeedbackPageClientProps } from "@/types/agent-feedback";

export default function PageClient(_props: AgentFeedbackPageClientProps) {
  const t = useTranslations("feedback");
  const tCommon = useTranslations("common");
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";

  return (
    <AgentFeedbackInbox
      heading={(isEmpty) => (
        <PageHeading
          description={t("page.description")}
          title={tCommon("labels.feedback")}
        >
          {organizationId && !isEmpty ? (
            <AgentFeedbackSetupDialog organizationId={organizationId} />
          ) : null}
        </PageHeading>
      )}
      organizationId={organizationId}
    />
  );
}
