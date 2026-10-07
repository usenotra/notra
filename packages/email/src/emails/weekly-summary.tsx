import { Row, Section, Text } from "react-email";

import { EmailCtaButton } from "../components/cta-button";
import {
  GeoActionCard,
  GeoChangeList,
  GeoCompetitorTable,
  GeoMetricCell,
  toneFromDelta,
} from "../components/geo-recap";
import { EmailLayout } from "../components/layout";
import { EmailNotificationSettingsNote } from "../components/notification-settings-note";
import { EmailTitleCard } from "../components/title-card";
import { EMAIL_THEME } from "../constants/theme";
import type { WeeklySummaryEmailProps } from "../types/geo-recap";
import { EMAIL_CONFIG } from "../utils/config";
import { engineEmailLogoSrc } from "../utils/engine-logo";

function weeklySummarySubtext(organizationName: string, quiet: boolean) {
  return quiet
    ? `Last week in GEO for ${organizationName}. Nothing moved enough to report, so this is your monthly check-in.`
    : `Last week in GEO for ${organizationName}, compared with the week before.`;
}

export const WeeklySummaryEmail = ({
  organizationName = "Acme Inc",
  organizationSlug = "acme",
  weekLabel = "Sep 28 – Oct 4",
  headline = "You're now a regular in 3 more AI answers and dropped out of 1.",
  quiet = false,
  visibilityLabel = "42%",
  visibilityDeltaLabel = "+6 pts",
  answersChecked = 140,
  items = [],
  remainingCount = 0,
  competitors = [],
  action,
  dashboardLink = `${EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/geo`,
}: WeeklySummaryEmailProps) => {
  const visibilityPill =
    visibilityDeltaLabel === "—" ? undefined : visibilityDeltaLabel;

  return (
    <EmailLayout
      heading={headline}
      preview={headline}
      subtext={weeklySummarySubtext(organizationName, quiet)}
    >
      <Section>
        <EmailTitleCard
          action={
            <Text
              style={{
                color: EMAIL_THEME.subtleForeground,
                fontSize: "12px",
                margin: 0,
                whiteSpace: "nowrap",
              }}
            >
              {weekLabel}
            </Text>
          }
          heading="GEO this week"
        >
          <Row>
            <GeoMetricCell
              label="Visibility"
              pill={visibilityPill}
              tone={toneFromDelta(visibilityDeltaLabel)}
              value={visibilityLabel}
            />
            <GeoMetricCell
              last
              label="AI answers checked"
              value={answersChecked.toLocaleString("en-US")}
            />
          </Row>
        </EmailTitleCard>
      </Section>

      {items.length > 0 ? (
        <Section className="mt-4">
          <EmailTitleCard heading="What changed">
            <GeoChangeList items={items} remainingCount={remainingCount} />
          </EmailTitleCard>
        </Section>
      ) : null}

      {competitors.length > 0 ? (
        <Section className="mt-4">
          <EmailTitleCard
            action={
              <Text
                style={{
                  color: EMAIL_THEME.subtleForeground,
                  fontSize: "12px",
                  margin: 0,
                }}
              >
                Share of answers
              </Text>
            }
            heading="Competitors"
          >
            <GeoCompetitorTable competitors={competitors} />
          </EmailTitleCard>
        </Section>
      ) : null}

      {action ? (
        <Section className="mt-4">
          <GeoActionCard action={action} />
        </Section>
      ) : null}

      <EmailCtaButton href={dashboardLink}>Open in Notra</EmailCtaButton>

      <EmailNotificationSettingsNote
        organizationName={organizationName}
        organizationSlug={organizationSlug}
      />
    </EmailLayout>
  );
};

WeeklySummaryEmail.PreviewProps = {
  organizationName: "Acme Inc",
  organizationSlug: "acme",
  weekLabel: "Sep 28 – Oct 4",
  headline: "You're now a regular in 3 more AI answers and dropped out of 1.",
  quiet: false,
  visibilityLabel: "42%",
  visibilityDeltaLabel: "+6 pts",
  answersChecked: 168,
  items: [
    {
      id: "project:prompt-1:anthropic/claude",
      title:
        "can you recommend something for ai-powered desktop transcription application",
      changes: [
        {
          id: "gained",
          detail: "In 6 of 7 answers, was 1 of 7",
          tone: "up",
        },
      ],
      engineLabel: "Claude",
      engineIconSrc: engineEmailLogoSrc("anthropic"),
    },
    {
      id: "project:prompt-2:openai/gpt",
      title: "best meeting transcription tool for remote teams",
      changes: [
        {
          id: "gained",
          detail: "In 5 of 7 answers, was 0 of 7",
          tone: "up",
        },
      ],
      engineLabel: "ChatGPT",
      engineIconSrc: engineEmailLogoSrc("openai"),
    },
    {
      id: "project:prompt-3:perplexity/sonar",
      title: "how do i get started with ai-powered desktop transcription",
      changes: [
        {
          id: "rank_up",
          detail: "Average rank from #4 to #2",
          tone: "up",
        },
      ],
      engineLabel: "Perplexity",
      engineIconSrc: engineEmailLogoSrc("perplexity"),
    },
    {
      id: "project:prompt-4:openai/gpt",
      title:
        "looking for an alternative for ai-powered desktop transcription application, what should i try?",
      changes: [
        {
          id: "lost",
          detail: "In 1 of 7 answers, was 6 of 7",
          tone: "down",
        },
      ],
      engineLabel: "ChatGPT",
      engineIconSrc: engineEmailLogoSrc("openai"),
    },
  ],
  remainingCount: 2,
  competitors: [
    {
      name: "Otter",
      shareLabel: "58%",
      deltaLabel: "+9 pts",
    },
    {
      name: "Acme Inc",
      shareLabel: "42%",
      deltaLabel: "+6 pts",
      isOwnBrand: true,
    },
    {
      name: "Rev",
      shareLabel: "31%",
      deltaLabel: "−4 pts",
    },
    {
      name: "Descript",
      shareLabel: "19%",
      deltaLabel: "unchanged",
    },
  ],
  action: {
    eyebrow: "Biggest open gap",
    title: "Best transcription app for interviews with speaker labels",
    body: "You show up in 0% of these answers. Otter and Rev are named instead.",
    href: "https://app.usenotra.com/acme/geo/gaps",
    label: "Write a post for it",
  },
  dashboardLink: "https://app.usenotra.com/acme/geo",
} satisfies WeeklySummaryEmailProps;

export default WeeklySummaryEmail;
