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
import { EmailNotificationSettingsNote } from "../components/notification-settings-note";
import type {
  WorkflowPausedEmailProps,
  WorkflowPausedReason,
} from "../types/workflow-paused";
import { EMAIL_CONFIG } from "../utils/config";
import { toPreviewText } from "../utils/preview";

function getReasonCopy(reason: WorkflowPausedReason) {
  if (reason === "ai_credits_depleted") {
    return "Your AI credit balance was empty for 3 automated runs in a row.";
  }

  if (reason === "plan_limit_reached") {
    return "Your plan's monthly content limit was reached for 3 automated runs in a row.";
  }

  return "This workflow failed 3 automated runs in a row.";
}

export const WorkflowPausedEmail = ({
  organizationName = "Acme Inc",
  organizationSlug = "acme",
  automationName = "Weekly Product Updates",
  reason = "workflow_errors",
  settingsLink = `${EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/automation/schedules`,
}: WorkflowPausedEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        {toPreviewText(`${automationName}: ${getReasonCopy(reason)}`)}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded p-[20px]">
            <EmailLogo />

            <Heading className="my-6 text-center text-2xl font-medium text-black">
              Workflow paused
            </Heading>

            <Text className="text-center text-base leading-relaxed text-[#737373]">
              Your <strong>{automationName}</strong> workflow in{" "}
              <strong>{organizationName}</strong> was paused automatically.
            </Text>

            <Section className="mt-8">
              <Text className="m-0 text-[12px] tracking-wide text-[#666666] uppercase">
                Reason:
              </Text>
              <Text className="mt-2 mb-0 text-[14px] leading-[22px] text-black">
                {getReasonCopy(reason)}
              </Text>
            </Section>

            <Section className="my-8 text-center">
              <EmailCtaButton href={settingsLink}>
                Review Workflow
              </EmailCtaButton>
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
