import { EmailButtonFallbackLink } from "../components/button-fallback-link";
import { EmailCtaButton } from "../components/cta-button";
import { EmailDetailRow } from "../components/detail-row";
import { EmailLayout } from "../components/layout";
import { EmailNotificationSettingsNote } from "../components/notification-settings-note";
import { EmailTitleCard } from "../components/title-card";
import type { ScheduledPublicationFailedEmailProps } from "../types/scheduled-publication-failed";
import { toPreviewText } from "../utils/preview";

export const ScheduledPublicationFailedEmail = ({
  organizationName = "Acme Inc",
  organizationSlug = "acme",
  postTitle = "Launch week recap",
  destinationLabel = "GitHub",
  scheduledFor = "Tuesday, October 6, 2026 at 10:00 CEST",
  reason = "The pull request could not be merged: required status checks are failing.",
  postLink = `https://app.usenotra.com/${organizationSlug}/content/abc123`,
}: ScheduledPublicationFailedEmailProps) => (
  <EmailLayout
    heading="Scheduled publishing failed"
    preview={toPreviewText(`${postTitle}: ${reason}`)}
    subtext={
      <>
        <strong>{postTitle}</strong> in <strong>{organizationName}</strong>{" "}
        could not be published to {destinationLabel}.
      </>
    }
  >
    <EmailTitleCard heading="Details">
      <EmailDetailRow first label="Scheduled for">
        {scheduledFor}
      </EmailDetailRow>
      <EmailDetailRow label="Destination">{destinationLabel}</EmailDetailRow>
      <EmailDetailRow label="Reason">{reason}</EmailDetailRow>
    </EmailTitleCard>

    <EmailCtaButton href={postLink}>Open post</EmailCtaButton>
    <EmailButtonFallbackLink href={postLink} />
    <EmailNotificationSettingsNote
      organizationName={organizationName}
      organizationSlug={organizationSlug}
    />
  </EmailLayout>
);
