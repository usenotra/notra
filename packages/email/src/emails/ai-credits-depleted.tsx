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

import { EmailButtonFallbackLink } from "../components/button-fallback-link";
import { EmailCtaButton } from "../components/cta-button";
import { EmailFooter } from "../components/footer";
import { EmailLogo } from "../components/logo";
import type { AiCreditsDepletedEmailProps } from "../types/ai-credits-depleted";
import { EMAIL_CONFIG } from "../utils/config";

export const AiCreditsDepletedEmail = ({
  organizationName = "Acme Inc",
  organizationSlug = "acme",
  automationName = "Weekly Product Updates",
  creditsLink = `${EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/settings/credits`,
  limitLabel,
}: AiCreditsDepletedEmailProps) => {
  const heading = limitLabel ? "Plan limit reached" : "AI credits are depleted";
  const previewText = limitLabel
    ? `${automationName} in ${organizationName} is on hold until your plan resets or you upgrade.`
    : `Add AI credits so ${automationName} in ${organizationName} can run again.`;
  const buttonLabel = limitLabel ? "View plan" : "Add AI Credits";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded p-[20px]">
            <EmailLogo />

            <Heading className="my-6 text-center text-2xl font-medium text-black">
              {heading}
            </Heading>

            <Text className="text-center text-base leading-relaxed text-[#737373]">
              Your <strong>{automationName}</strong> automation in{" "}
              <strong>{organizationName}</strong> did not run because{" "}
              {limitLabel
                ? `you've used all the ${limitLabel} included in your plan this month.`
                : "your AI credit balance is empty."}
            </Text>

            <Section className="my-8 text-center">
              <EmailCtaButton href={creditsLink}>{buttonLabel}</EmailCtaButton>
            </Section>

            <EmailButtonFallbackLink href={creditsLink} />

            <EmailFooter />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
