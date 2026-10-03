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

import { EmailButtonFallbackLink } from "../components/button-fallback-link";
import { EmailCtaButton } from "../components/cta-button";
import { EmailFooter } from "../components/footer";
import { EmailLogo } from "../components/logo";
import { EmailNotificationSettingsNote } from "../components/notification-settings-note";
import { EMAIL_THEME } from "../constants/theme";
import type { ScheduledContentCreatedEmailProps } from "../types/schedule-content-created";

const CONTENT_TYPE_MAP: Record<string, string> = {
  changelog: "Changelog",
  blog_post: "Blog Post",
  linkedin_post: "LinkedIn Post",
  twitter_post: "Twitter Post",
  investor_update: "Investor Update",
};

export const ScheduledContentCreatedEmail = ({
  organizationName = "Acme Inc",
  scheduleName = "Weekly Product Updates",
  createdContent = [
    {
      title: "This week's product updates are live",
      contentLink: "https://app.usenotra.com/acme/content/example-post-id",
    },
  ],
  contentType = "changelog",
  organizationSlug = "acme",
  contentOverviewLink = `https://app.usenotra.com/${organizationSlug}/content`,
}: ScheduledContentCreatedEmailProps) => {
  const contentCount = createdContent.length;
  const primaryContent = createdContent[0];
  const contentLabel = CONTENT_TYPE_MAP[contentType] ?? "Content";
  const summary =
    contentCount === 1
      ? `just created a new ${contentLabel} draft.`
      : `just created ${contentCount} new ${contentLabel} drafts.`;

  return (
    <Html>
      <Head />
      <Preview>
        {contentCount === 1 && primaryContent
          ? `${primaryContent.title}, ready to review in ${organizationName}`
          : `${contentCount} new ${contentLabel} drafts are ready to review in ${organizationName}`}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded p-[20px]">
            <EmailLogo />

            <Heading className="my-6 text-center text-2xl font-medium text-black">
              New scheduled content is ready
            </Heading>

            <Text className="text-center text-base leading-relaxed text-[#737373]">
              Your <strong>{scheduleName}</strong> schedule in{" "}
              <strong>{organizationName}</strong> {summary}
            </Text>

            <Section className="mt-8">
              <Text className="m-0 text-[12px] tracking-wide text-[#666666] uppercase">
                {contentCount === 1 ? "Content title:" : "Created drafts:"}
              </Text>
              {createdContent.map((item) => (
                <Text
                  className="mt-2 mb-0 text-[14px] leading-[22px] text-black"
                  key={item.contentLink}
                >
                  <Link
                    href={item.contentLink}
                    style={{
                      color: EMAIL_THEME.link,
                      textDecoration: "underline",
                    }}
                  >
                    {item.title}
                  </Link>
                </Text>
              ))}
            </Section>

            <Section className="my-8 text-center">
              <EmailCtaButton
                href={
                  contentCount === 1
                    ? (primaryContent?.contentLink ?? contentOverviewLink)
                    : contentOverviewLink
                }
              >
                {contentCount === 1 ? "Review Content" : "Review All Content"}
              </EmailCtaButton>
            </Section>

            <EmailButtonFallbackLink
              href={
                contentCount === 1
                  ? (primaryContent?.contentLink ?? contentOverviewLink)
                  : contentOverviewLink
              }
            />

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
