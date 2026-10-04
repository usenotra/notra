import { Text } from "react-email";

import { EMAIL_THEME } from "../constants/theme";
import type { ScheduledContentStatusTemplateProps } from "../types/scheduled-content-status";
import { toPreviewText } from "../utils/preview";
import { EmailButtonFallbackLink } from "./button-fallback-link";
import { EmailCtaButton } from "./cta-button";
import { EmailLayout } from "./layout";
import { EmailNotificationSettingsNote } from "./notification-settings-note";
import { EmailTitleCard } from "./title-card";

export const ScheduledContentStatusEmail = ({
  organizationName,
  scheduleName,
  reason,
  settingsLink,
  organizationSlug,
  status,
}: ScheduledContentStatusTemplateProps) => {
  const failed = status === "failed";

  return (
    <EmailLayout
      heading={
        failed
          ? "Scheduled content generation failed"
          : "Scheduled content generation was skipped"
      }
      preview={toPreviewText(`${scheduleName}: ${reason}`)}
      subtext={
        <>
          Your <strong>{scheduleName}</strong> schedule in{" "}
          <strong>{organizationName}</strong>{" "}
          {failed
            ? "was unable to generate content."
            : "ran successfully, but did not create content."}
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
          {reason}
        </Text>
      </EmailTitleCard>

      <EmailCtaButton href={settingsLink}>View schedule</EmailCtaButton>
      <EmailButtonFallbackLink href={settingsLink} />
      <EmailNotificationSettingsNote
        organizationName={organizationName}
        organizationSlug={organizationSlug}
      />
    </EmailLayout>
  );
};
