import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "react-email";

import { EmailCtaButton } from "../components/cta-button";
import { EmailFooter } from "../components/footer";
import { EmailLogo } from "../components/logo";
import { EmailTitleCard } from "../components/title-card";
import { EMAIL_THEME } from "../constants/theme";
import type {
  DailySummaryChangeTone,
  DailySummaryEmailProps,
} from "../types/daily-summary";
import { EMAIL_CONFIG } from "../utils/config";
import { engineEmailLogoSrc } from "../utils/engine-logo";

const PILL: Record<
  DailySummaryChangeTone,
  { backgroundColor: string; color: string }
> = {
  up: {
    backgroundColor: EMAIL_THEME.geoUpWash,
    color: EMAIL_THEME.geoUp,
  },
  down: {
    backgroundColor: EMAIL_THEME.geoDownWash,
    color: EMAIL_THEME.geoDown,
  },
  neutral: {
    backgroundColor: EMAIL_THEME.muted,
    color: EMAIL_THEME.mutedForeground,
  },
};

function toneFromDelta(label: string): DailySummaryChangeTone {
  if (label.startsWith("+")) {
    return "up";
  }
  if (label.startsWith("-") || label.startsWith("−")) {
    return "down";
  }
  return "neutral";
}

function toneMark(tone: DailySummaryChangeTone): string {
  if (tone === "up") {
    return "+";
  }
  if (tone === "down") {
    return "-";
  }
  return "0";
}

function dailySummarySubtext(organizationName: string, scansCompleted: number) {
  if (scansCompleted <= 0) {
    return `Yesterday in GEO for ${organizationName}. No full scan ran.`;
  }

  if (scansCompleted === 1) {
    return `Yesterday in GEO for ${organizationName}. One scan ran.`;
  }

  return `Yesterday in GEO for ${organizationName}. ${scansCompleted} scans ran.`;
}

export const DailySummaryEmail = ({
  organizationName = "Acme Inc",
  organizationSlug = "acme",
  dateLabel = "September 4, 2026",
  headline = "You gained 8 prompts but lost 1 yesterday.",
  mentionRateLabel = "42%",
  mentionRateDeltaLabel = "+3 pts",
  scansCompleted = 1,
  gained = 8,
  lost = 1,
  items = [
    {
      title: "What is the best changelog tool for startups?",
      changes: [{ detail: "Gained mention", tone: "up" }],
      engineLabel: "ChatGPT",
      engineIconSrc: engineEmailLogoSrc("openai"),
    },
    {
      title: "How should small SaaS teams write release notes?",
      changes: [{ detail: "Lost mention", tone: "down" }],
      engineLabel: "Perplexity",
      engineIconSrc: engineEmailLogoSrc("perplexity"),
    },
    {
      title: "Which AI tools generate changelogs from GitHub?",
      changes: [{ detail: "Position up", tone: "up" }],
      engineLabel: "Gemini",
      engineIconSrc: engineEmailLogoSrc("gemini"),
    },
  ],
  remainingCount = 2,
  dashboardLink = `${EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/geo`,
}: DailySummaryEmailProps) => {
  const rateTone = toneFromDelta(mentionRateDeltaLabel);
  const promptChangesLabel = `+${gained}/-${lost}`;
  const subtext = dailySummarySubtext(organizationName, scansCompleted);

  return (
    <Html>
      <Head />
      <Preview>{headline}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto mt-[16px] mb-[40px] max-w-[465px] rounded px-[20px] pt-0 pb-[20px]">
            <EmailLogo className="mt-0 text-center" variant="wordmark" />

            <Heading className="mt-5 mb-3 text-center text-2xl font-medium text-black">
              {headline}
            </Heading>
            <Text className="mt-0 mb-8 text-center text-base leading-relaxed text-[#737373]">
              {subtext}
            </Text>

            <Section>
              <EmailTitleCard
                action={
                  <Text
                    style={{
                      color: EMAIL_THEME.mutedForeground,
                      fontSize: "12px",
                      margin: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dateLabel}
                  </Text>
                }
                heading="GEO"
              >
                <Row>
                  <MetricCell
                    label="Mention rate"
                    pill={mentionRateDeltaLabel}
                    tone={rateTone}
                    value={mentionRateLabel}
                  />
                  <MetricCell last label="Prompts" value={promptChangesLabel} />
                </Row>
              </EmailTitleCard>
            </Section>

            {items.length > 0 ? (
              <Section className="mt-4">
                <EmailTitleCard heading="What changed">
                  {items.map((item, index) => (
                    <ChangeRow
                      first={index === 0}
                      item={item}
                      key={`${item.engineLabel}-${item.title}`}
                      last={index === items.length - 1}
                    />
                  ))}
                  {remainingCount > 0 ? (
                    <Text
                      style={{
                        color: EMAIL_THEME.mutedForeground,
                        fontSize: "13px",
                        margin: "12px 0 0",
                        textAlign: "center",
                      }}
                    >
                      And {remainingCount} more in GEO...
                    </Text>
                  ) : null}
                </EmailTitleCard>
              </Section>
            ) : null}

            <Section className="my-8 text-center">
              <EmailCtaButton href={dashboardLink}>
                Open in Notra
              </EmailCtaButton>
            </Section>

            <Section className="mt-8">
              <Text className="m-0 text-center text-[12px] text-[#666666] uppercase">
                If you don't want to receive these emails, you can click{" "}
                <Link
                  href={`${EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/settings/notifications`}
                >
                  here
                </Link>{" "}
                to update your notification settings.
              </Text>
            </Section>

            <EmailFooter showPhysicalAddress />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

function MetricCell({
  label,
  last = false,
  pill,
  tone = "neutral",
  value,
}: {
  label: string;
  last?: boolean;
  pill?: string;
  tone?: DailySummaryChangeTone;
  value: string;
}) {
  return (
    <Column
      style={{
        borderRight: last ? undefined : `1px solid ${EMAIL_THEME.border}`,
        paddingRight: last ? undefined : "12px",
        paddingLeft: last ? "12px" : undefined,
        verticalAlign: "top",
        width: "50%",
      }}
    >
      <Text
        style={{
          color: EMAIL_THEME.mutedForeground,
          fontSize: "12px",
          margin: 0,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: EMAIL_THEME.foreground,
          fontSize: "22px",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.2,
          margin: "4px 0 0",
        }}
      >
        {value}
        {pill ? (
          <>
            {" "}
            <GeoPill tone={tone}>{pill}</GeoPill>
          </>
        ) : null}
      </Text>
    </Column>
  );
}

function ChangeRow({
  first,
  item,
  last,
}: {
  first: boolean;
  item: DailySummaryEmailProps["items"][number];
  last: boolean;
}) {
  return (
    <Section
      style={{
        borderBottom: last ? undefined : `1px solid ${EMAIL_THEME.border}`,
        paddingBottom: last ? 0 : "12px",
        paddingTop: first ? 0 : "12px",
      }}
    >
      <Text
        style={{
          color: EMAIL_THEME.foreground,
          fontSize: "14px",
          fontWeight: 500,
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        {item.title}
      </Text>
      <Row>
        <Column style={{ paddingTop: "6px" }}>
          {item.changes.map((change, index) => (
            <span
              key={`${change.detail}-${index}`}
              style={{
                color: EMAIL_THEME.mutedForeground,
                display: "inline-block",
                fontSize: "12px",
                marginRight: "8px",
                verticalAlign: "middle",
              }}
            >
              <GeoToneMark tone={change.tone} />
              {change.detail}
            </span>
          ))}
          {item.engineLabel ? (
            <span
              style={{
                color: EMAIL_THEME.mutedForeground,
                display: "inline-block",
                fontSize: "12px",
                verticalAlign: "middle",
              }}
            >
              {item.engineIconSrc ? (
                <Img
                  alt=""
                  height="14"
                  src={item.engineIconSrc}
                  style={{
                    display: "inline-block",
                    margin: "0 4px 0 0",
                    verticalAlign: "middle",
                  }}
                  width="14"
                />
              ) : null}
              {item.engineLabel}
            </span>
          ) : null}
        </Column>
      </Row>
    </Section>
  );
}

function GeoToneMark({ tone }: { tone: DailySummaryChangeTone }) {
  const colors = PILL[tone];
  const isMinus = tone === "down";

  return (
    <span
      style={{
        backgroundColor: colors.backgroundColor,
        backgroundImage: isMinus
          ? `linear-gradient(${colors.color}, ${colors.color})`
          : undefined,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "8px 2px",
        borderRadius: "9999px",
        color: colors.color,
        display: "inline-block",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: isMinus ? 0 : "12px",
        fontWeight: 600,
        height: "16px",
        lineHeight: "16px",
        marginRight: "6px",
        textAlign: "center",
        verticalAlign: "middle",
        width: "16px",
      }}
    >
      {isMinus ? "\u00a0" : toneMark(tone)}
    </span>
  );
}

function GeoPill({
  children,
  tone,
}: {
  children: string;
  tone: DailySummaryChangeTone;
}) {
  return (
    <span
      style={{
        ...PILL[tone],
        borderRadius: "9999px",
        display: "inline-block",
        fontSize: "11px",
        fontVariantNumeric: "tabular-nums",
        fontWeight: 500,
        lineHeight: "16px",
        padding: "2px 6px",
        verticalAlign: "middle",
      }}
    >
      {children}
    </span>
  );
}

DailySummaryEmail.PreviewProps = {
  organizationName: "Acme Inc",
  organizationSlug: "acme",
  dateLabel: "September 4, 2026",
  headline: "You gained 8 prompts but lost 1 yesterday.",
  mentionRateLabel: "42%",
  mentionRateDeltaLabel: "+3 pts",
  scansCompleted: 1,
  gained: 8,
  lost: 1,
  items: [
    {
      title: "can you recommend something for ai-powered desktop transcription application",
      changes: [
        { detail: "12 citations added", tone: "up" },
        { detail: "7 citations removed", tone: "down" },
      ],
      engineLabel: "Claude",
      engineIconSrc: engineEmailLogoSrc("anthropic"),
    },
    {
      title: "how do i get started with ai-powered desktop transcription application",
      changes: [
        { detail: "Citation added", tone: "up" },
        { detail: "Citation removed", tone: "down" },
      ],
      engineLabel: "Claude",
      engineIconSrc: engineEmailLogoSrc("anthropic"),
    },
    {
      title: "looking for an alternative for ai-powered desktop transcription application, what should i try?",
      changes: [
        { detail: "Citation added", tone: "up" },
        { detail: "Citation removed", tone: "down" },
      ],
      engineLabel: "Claude",
      engineIconSrc: engineEmailLogoSrc("anthropic"),
    },
  ],
  remainingCount: 18,
  dashboardLink: "https://app.usenotra.com/acme/geo",
} satisfies DailySummaryEmailProps;

export default DailySummaryEmail;
