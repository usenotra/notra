import { EmailButtonFallbackLink } from "../components/button-fallback-link";
import { EmailCtaButton } from "../components/cta-button";
import { EmailLayout } from "../components/layout";
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
  const buttonLabel = limitLabel ? "View plan" : "Add AI credits";

  return (
    <EmailLayout
      heading={heading}
      preview={previewText}
      subtext={
        <>
          Your <strong>{automationName}</strong> automation in{" "}
          <strong>{organizationName}</strong> did not run because{" "}
          {limitLabel
            ? `you've used all the ${limitLabel} included in your plan this month.`
            : "your AI credit balance is empty."}
        </>
      }
    >
      <EmailCtaButton href={creditsLink}>{buttonLabel}</EmailCtaButton>
      <EmailButtonFallbackLink href={creditsLink} />
    </EmailLayout>
  );
};
