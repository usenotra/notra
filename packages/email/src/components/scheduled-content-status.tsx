import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

import type { ScheduledContentStatusTemplateProps } from "../types/scheduled-content-status";
import { toPreviewText } from "../utils/preview";
import { EmailButtonFallbackLink } from "./button-fallback-link";
import { EmailCtaButton } from "./cta-button";
import { EmailFooter } from "./footer";
import { EmailLogo } from "./logo";
import { EmailNotificationSettingsNote } from "./notification-settings-note";

export const ScheduledContentStatusEmail = ({
  organizationName,
  scheduleName,
  reason,
  settingsLink,
  organizationSlug,
  status,
}: ScheduledContentStatusTemplateProps) => {
  const failed = status === "failed";
  const statusLabel = failed ? "failed" : "was skipped";

  return (
    <Html>
      <Head />
      <Preview>{toPreviewText(`${scheduleName}: ${reason}`)}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded p-[20px]">
            <EmailLogo />

            <Heading className="my-6 text-center text-2xl font-medium text-black">
              Scheduled content generation {statusLabel}
            </Heading>

            <Text className="text-center text-base leading-relaxed text-[#737373]">
              Your <strong>{scheduleName}</strong> schedule in{" "}
              <strong>{organizationName}</strong>{" "}
              {failed
                ? "was unable to generate content."
                : "ran successfully, but did not create content."}
            </Text>

            <Section className="mt-8">
              <Text className="m-0 text-[12px] tracking-wide text-[#666666] uppercase">
                Reason:
              </Text>
              <Text className="mt-2 mb-0 text-[14px] leading-[22px] text-black">
                {reason}
              </Text>
            </Section>

            <Section className="my-8 text-center">
              <EmailCtaButton href={settingsLink}>View Schedule</EmailCtaButton>
            </Section>

            <EmailButtonFallbackLink href={settingsLink} />

            <EmailNotificationSettingsNote
              organizationName={organizationName}
              organizationSlug={organizationSlug}
            />

            <EmailFooter />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
