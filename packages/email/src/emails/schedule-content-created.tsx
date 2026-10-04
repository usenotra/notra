import { Link, Text } from "react-email";

import { EmailButtonFallbackLink } from "../components/button-fallback-link";
import { EmailCtaButton } from "../components/cta-button";
import { EmailLayout } from "../components/layout";
import { EmailNotificationSettingsNote } from "../components/notification-settings-note";
import { EmailTitleCard } from "../components/title-card";
import { EMAIL_THEME } from "../constants/theme";
import type { ScheduledContentCreatedEmailProps } from "../types/schedule-content-created";

const CONTENT_TYPE_MAP: Record<string, string> = {
  changelog: "Changelog",
  blog_post: "Blog Post",
  linkedin_post: "LinkedIn Post",
  twitter_post: "Twitter Post",
  investor_update: "Investor Update",
};

export const ScheduledContentCreatedEmail = ({
  organizationName = "Acme Inc",
  scheduleName = "Weekly Product Updates",
  createdContent = [
    {
      title: "This week's product updates are live",
      contentLink: "https://app.usenotra.com/acme/content/example-post-id",
    },
  ],
  contentType = "changelog",
  organizationSlug = "acme",
  contentOverviewLink = `https://app.usenotra.com/${organizationSlug}/content`,
}: ScheduledContentCreatedEmailProps) => {
  const contentCount = createdContent.length;
  const primaryContent = createdContent[0];
  const contentLabel = CONTENT_TYPE_MAP[contentType] ?? "Content";
  const reviewLink =
    contentCount === 1
      ? (primaryContent?.contentLink ?? contentOverviewLink)
      : contentOverviewLink;
  const summary =
    contentCount === 1
      ? `just created a new ${contentLabel} draft.`
      : `just created ${contentCount} new ${contentLabel} drafts.`;

  return (
    <EmailLayout
      heading="New scheduled content is ready"
      preview={
        contentCount === 1 && primaryContent
          ? `${primaryContent.title}, ready to review in ${organizationName}`
          : `${contentCount} new ${contentLabel} drafts are ready to review in ${organizationName}`
      }
      subtext={
        <>
          Your <strong>{scheduleName}</strong> schedule in{" "}
          <strong>{organizationName}</strong> {summary}
        </>
      }
    >
      <EmailTitleCard
        heading={
          contentCount === 1 ? "New draft" : `${contentCount} new drafts`
        }
      >
        {createdContent.map((item, index) => (
          <Text
            key={item.contentLink}
            style={{
              borderTop:
                index === 0 ? undefined : `1px solid ${EMAIL_THEME.border}`,
              fontSize: "14px",
              lineHeight: "22px",
              margin: 0,
              padding: index === 0 ? "2px 0 8px" : "8px 0",
            }}
          >
            <Link
              href={item.contentLink}
              style={{ color: EMAIL_THEME.link, textDecoration: "underline" }}
            >
              {item.title}
            </Link>
          </Text>
        ))}
      </EmailTitleCard>

      <EmailCtaButton href={reviewLink}>
        {contentCount === 1 ? "Review content" : "Review all content"}
      </EmailCtaButton>
      <EmailButtonFallbackLink href={reviewLink} />
      <EmailNotificationSettingsNote
        organizationName={organizationName}
        organizationSlug={organizationSlug}
      />
    </EmailLayout>
  );
};
