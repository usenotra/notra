import { Link, Section } from "react-email";

import { EmailDetailRow } from "../components/detail-row";
import { EmailLayout } from "../components/layout";
import { EmailMessageCard } from "../components/message-card";
import { EmailTitleCard } from "../components/title-card";
import { EMAIL_THEME } from "../constants/theme";
import type { FeedbackEmailProps } from "../types/feedback";
import { FEEDBACK_SENTIMENT_META } from "../utils/feedback";
import { toPreviewText } from "../utils/preview";

export const FeedbackEmail = ({
  message = "The new editor feels a lot snappier, but I'd love to see dark mode fixes on the mobile nav.",
  sentiment,
  userName = "Jane Doe",
  userEmail = "jane@example.com",
  organizationName,
  organizationSlug,
  pageUrl,
  userAgent,
}: FeedbackEmailProps) => {
  const sentimentMeta = sentiment ? FEEDBACK_SENTIMENT_META[sentiment] : null;

  return (
    <EmailLayout
      heading={`${sentimentMeta ? `${sentimentMeta.emoji} ` : ""}New feedback`}
      preview={toPreviewText(message)}
    >
      <EmailMessageCard message={message} />

      <Section className="mt-4">
        <EmailTitleCard heading="Details">
          <EmailDetailRow first label="From">
            {userName} &lt;
            <Link
              href={`mailto:${userEmail}`}
              style={{ color: EMAIL_THEME.link, textDecoration: "underline" }}
            >
              {userEmail}
            </Link>
            &gt;
          </EmailDetailRow>
          {sentimentMeta ? (
            <EmailDetailRow label="Sentiment">
              {sentimentMeta.emoji} {sentimentMeta.label}
            </EmailDetailRow>
          ) : null}
          {organizationName ? (
            <EmailDetailRow label="Organization">
              {organizationName}
              {organizationSlug ? ` (${organizationSlug})` : ""}
            </EmailDetailRow>
          ) : null}
          {pageUrl ? (
            <EmailDetailRow label="Page">{pageUrl}</EmailDetailRow>
          ) : null}
          {userAgent ? (
            <EmailDetailRow label="User agent">{userAgent}</EmailDetailRow>
          ) : null}
        </EmailTitleCard>
      </Section>
    </EmailLayout>
  );
};

export default FeedbackEmail;
