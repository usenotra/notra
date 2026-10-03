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

import { EmailFooter } from "../components/footer";
import { EmailLogo } from "../components/logo";
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
    <Html>
      <Head />
      <Preview>{toPreviewText(message)}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[520px] rounded p-[20px]">
            <EmailLogo />

            <Heading className="my-6 text-center text-2xl font-medium text-black">
              {sentimentMeta ? `${sentimentMeta.emoji} ` : ""}New feedback
            </Heading>

            <Section className="mt-6 rounded-md border border-solid border-[#eaeaea] bg-[#fafafa] p-5">
              <Text className="m-0 text-[15px] leading-[22px] whitespace-pre-wrap text-black">
                {message}
              </Text>
            </Section>

            <Section className="mt-8">
              <Text className="m-0 text-[12px] tracking-wide text-[#666666] uppercase">
                From
              </Text>
              <Text className="mt-1 mb-0 text-[14px] leading-[22px] text-black">
                {userName} &lt;
                <Link
                  className="text-black underline"
                  href={`mailto:${userEmail}`}
                >
                  {userEmail}
                </Link>
                &gt;
              </Text>
            </Section>

            {sentimentMeta ? (
              <Section className="mt-4">
                <Text className="m-0 text-[12px] tracking-wide text-[#666666] uppercase">
                  Sentiment
                </Text>
                <Text className="mt-1 mb-0 text-[14px] leading-[22px] text-black">
                  {sentimentMeta.emoji} {sentimentMeta.label}
                </Text>
              </Section>
            ) : null}

            {organizationName ? (
              <Section className="mt-4">
                <Text className="m-0 text-[12px] tracking-wide text-[#666666] uppercase">
                  Organization
                </Text>
                <Text className="mt-1 mb-0 text-[14px] leading-[22px] text-black">
                  {organizationName}
                  {organizationSlug ? ` (${organizationSlug})` : ""}
                </Text>
              </Section>
            ) : null}

            {pageUrl ? (
              <Section className="mt-4">
                <Text className="m-0 text-[12px] tracking-wide text-[#666666] uppercase">
                  Page
                </Text>
                <Text className="mt-1 mb-0 text-[14px] leading-[22px] break-all text-black">
                  {pageUrl}
                </Text>
              </Section>
            ) : null}

            {userAgent ? (
              <Section className="mt-4">
                <Text className="m-0 text-[12px] tracking-wide text-[#666666] uppercase">
                  User agent
                </Text>
                <Text className="mt-1 mb-0 text-[12px] leading-[18px] break-all text-[#666666]">
                  {userAgent}
                </Text>
              </Section>
            ) : null}

            <EmailFooter />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default FeedbackEmail;
