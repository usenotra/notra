import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { EmailButton } from "../components/button";
import { EmailFooter } from "../components/footer";
import { EMAIL_CONFIG } from "../utils/config";

interface InviteUserEmailProps {
  inviteeEmail: string;
  invitedByUsername: string;
  invitedByEmail: string;
  organizationName: string;
  inviteLink: string;
}

export const InviteUserEmail = ({
  inviteeEmail,
  invitedByUsername,
  organizationName,
  inviteLink,
}: InviteUserEmailProps) => {
  const previewText = `Join ${invitedByUsername} on Notra`;
  const logoUrl = EMAIL_CONFIG.getLogoUrl();

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Section className="mt-[32px]">
              <Img
                alt="Notra Logo"
                className="mx-auto"
                height="40"
                src={logoUrl}
                width="40"
              />
            </Section>

            <Heading className="my-6 text-center font-medium text-2xl text-black">
              Join <strong>{organizationName}</strong> on Notra
            </Heading>

            <Text className="text-center text-[#737373] text-base leading-relaxed">
              <strong>{invitedByUsername}</strong> has invited you to join the{" "}
              <strong>{organizationName}</strong> workspace on Notra.
            </Text>

            <Section className="my-8 text-center">
              <EmailButton href={inviteLink}>Join workspace</EmailButton>
            </Section>

            <Text className="text-[14px] text-black leading-[24px]">
              or copy and paste this URL into your browser:{" "}
              <Link className="text-blue-600 no-underline" href={inviteLink}>
                {inviteLink}
              </Link>
            </Text>

            <Hr className="mx-0 mt-[26px] w-full border border-[#eaeaea] border-solid" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              This invitation was intended for{" "}
              <span className="text-black">{inviteeEmail}</span>. If you weren't
              expecting this, you can safely ignore this email. Need help? Reach
              us at {EMAIL_CONFIG.replyTo}.
            </Text>
            <EmailFooter />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default InviteUserEmail;
