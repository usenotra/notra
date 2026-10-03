import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

import { EmailButton } from "../components/button";
import { EmailFooter } from "../components/footer";
import { EmailLogo } from "../components/logo";
import type { ScheduledPublicationFailedEmailProps } from "../types/scheduled-publication-failed";
import { EMAIL_CONFIG } from "../utils/config";

export const ScheduledPublicationFailedEmail = ({
  organizationName = "Acme Inc",
  organizationSlug = "acme",
  postTitle = "Launch week recap",
  destinationLabel = "GitHub",
  scheduledFor = "Tuesday, October 6, 2026 at 10:00 CEST",
  reason = "The pull request could not be merged: required status checks are failing.",
  postLink = `https://app.usenotra.com/${organizationSlug}/content/abc123`,
}: ScheduledPublicationFailedEmailProps) => (
  <Html>
    <Head />
    <Preview>A scheduled post could not be published</Preview>
    <Tailwind>
      <Body className="mx-auto my-auto bg-white px-2 font-sans">
        <Container className="mx-auto my-[40px] max-w-[465px] rounded p-[20px]">
          <EmailLogo />

          <Heading className="my-6 text-center text-2xl font-medium text-black">
            Scheduled publishing failed
          </Heading>

          <Text className="text-center text-base leading-relaxed text-[#737373]">
            <strong>{postTitle}</strong> in <strong>{organizationName}</strong>{" "}
            was scheduled for {scheduledFor}, but publishing to{" "}
            {destinationLabel} did not go through.
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
            <EmailButton href={postLink}>Open post</EmailButton>
          </Section>

          <Text className="text-[14px] leading-[24px] text-black">
            If the button does not work, copy and paste this URL into your
            browser: <Link href={postLink}>{postLink}</Link>
          </Text>

          <Section className="mt-8">
            <Text className="m-0 text-center text-[12px] tracking-wide text-[#666666] uppercase">
              If you don't want to receive these emails, you can click{" "}
              <Link
                href={`${EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/settings/notifications`}
              >
                here
              </Link>{" "}
              to update your notification settings.
            </Text>
          </Section>

          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
