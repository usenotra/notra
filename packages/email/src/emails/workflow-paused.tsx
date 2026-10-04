import { Text } from "react-email";

import { EmailButtonFallbackLink } from "../components/button-fallback-link";
import { EmailCtaButton } from "../components/cta-button";
import { EmailLayout } from "../components/layout";
import { EmailNotificationSettingsNote } from "../components/notification-settings-note";
import { EmailTitleCard } from "../components/title-card";
import { EMAIL_THEME } from "../constants/theme";
import type {
  WorkflowPausedEmailProps,
  WorkflowPausedReason,
} from "../types/workflow-paused";
import { EMAIL_CONFIG } from "../utils/config";
import { toPreviewText } from "../utils/preview";

function getReasonCopy(reason: WorkflowPausedReason) {
  if (reason === "ai_credits_depleted") {
    return "Your AI credit balance was empty for 3 automated runs in a row.";
  }

  if (reason === "plan_limit_reached") {
    return "Your plan's monthly content limit was reached for 3 automated runs in a row.";
  }

  return "This workflow failed 3 automated runs in a row.";
}

export const WorkflowPausedEmail = ({
  organizationName = "Acme Inc",
  organizationSlug = "acme",
  automationName = "Weekly Product Updates",
  reason = "workflow_errors",
  settingsLink = `${EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/automation/schedules`,
}: WorkflowPausedEmailProps) => {
  return (
    <EmailLayout
      heading="Workflow paused"
      preview={toPreviewText(`${automationName}: ${getReasonCopy(reason)}`)}
      subtext={
        <>
          Your <strong>{automationName}</strong> workflow in{" "}
          <strong>{organizationName}</strong> was paused automatically.
        </>
      }
    >
      <EmailTitleCard heading="Reason">
        <Text
          style={{
            color: EMAIL_THEME.foreground,
            fontSize: "14px",
            lineHeight: "22px",
            margin: 0,
          }}
        >
          {getReasonCopy(reason)}
        </Text>
      </EmailTitleCard>

      <EmailCtaButton href={settingsLink}>Review workflow</EmailCtaButton>
      <EmailButtonFallbackLink href={settingsLink} />
      <EmailNotificationSettingsNote
        organizationName={organizationName}
        organizationSlug={organizationSlug}
      />
    </EmailLayout>
  );
};
