import { Row, Section } from "react-email";

import { EmailCtaButton } from "../components/cta-button";
import { GeoChangeList, GeoMetricCell } from "../components/geo-recap";
import { EmailLayout } from "../components/layout";
import { EmailNotificationSettingsNote } from "../components/notification-settings-note";
import { EmailTitleCard } from "../components/title-card";
import type { VisibilityDropEmailProps } from "../types/geo-recap";
import { EMAIL_CONFIG } from "../utils/config";
import { engineEmailLogoSrc } from "../utils/engine-logo";

export const VisibilityDropEmail = ({
  organizationName = "Acme Inc",
  organizationSlug = "acme",
  headline = "Your AI visibility dropped from 41% to 22%.",
  previousLabel = "41%",
  currentLabel = "22%",
  deltaLabel = "−19 pts",
  items = [],
  remainingCount = 0,
  dashboardLink = `${EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/geo`,
}: VisibilityDropEmailProps) => (
  <EmailLayout
    heading={headline}
    preview={headline}
    subtext={`The last two days for ${organizationName}, compared with the week before. We only send this when visibility falls sharply, so it's worth a look before Monday's recap.`}
  >
    <Section>
      <EmailTitleCard heading="Visibility">
        <Row>
          <GeoMetricCell label="Week before" value={previousLabel} />
          <GeoMetricCell
            last
            label="Last 2 days"
            pill={deltaLabel}
            tone="down"
            value={currentLabel}
          />
        </Row>
      </EmailTitleCard>
    </Section>

    {items.length > 0 ? (
      <Section className="mt-4">
        <EmailTitleCard heading="Where you dropped out">
          <GeoChangeList items={items} remainingCount={remainingCount} />
        </EmailTitleCard>
      </Section>
    ) : null}

    <EmailCtaButton href={dashboardLink}>Open in Notra</EmailCtaButton>

    <EmailNotificationSettingsNote
      organizationName={organizationName}
      organizationSlug={organizationSlug}
    />
  </EmailLayout>
);

VisibilityDropEmail.PreviewProps = {
  organizationName: "Acme Inc",
  organizationSlug: "acme",
  headline: "Your AI visibility dropped from 41% to 22%.",
  previousLabel: "41%",
  currentLabel: "22%",
  deltaLabel: "−19 pts",
  items: [
    {
      id: "project:prompt-1:openai/gpt",
      title: "best meeting transcription tool for remote teams",
      changes: [
        { id: "lost", detail: "In 0 of 2 answers, was 6 of 7", tone: "down" },
      ],
      engineLabel: "ChatGPT",
      engineIconSrc: engineEmailLogoSrc("openai"),
    },
    {
      id: "project:prompt-2:google/gemini",
      title: "which transcription apps work offline on a mac",
      changes: [
        { id: "lost", detail: "In 0 of 2 answers, was 5 of 7", tone: "down" },
      ],
      engineLabel: "Gemini",
      engineIconSrc: engineEmailLogoSrc("gemini"),
    },
  ],
  remainingCount: 3,
  dashboardLink: "https://app.usenotra.com/acme/geo",
} satisfies VisibilityDropEmailProps;

export default VisibilityDropEmail;
