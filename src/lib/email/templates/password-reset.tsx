import { Button, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PasswordResetEmailProps {
  resetUrl: string;
  userName?: string | null;
}

export function PasswordResetEmail({
  resetUrl,
  userName,
}: PasswordResetEmailProps) {
  const greeting = userName ? `Hi ${userName},` : "Hi,";

  return (
    <BaseLayout preview="Reset your Notra password">
      <Section style={content}>
        <Text style={paragraph}>{greeting}</Text>
        <Text style={paragraph}>
          We received a request to reset your password for your Notra account.
          Click the button below to create a new password.
        </Text>
        <Section style={buttonContainer}>
          <Button href={resetUrl} style={button}>
            Reset Password
          </Button>
        </Section>
        <Text style={paragraph}>
          This link will expire in 1 hour. If you didn&apos;t request a password
          reset, you can safely ignore this email.
        </Text>
        <Text style={paragraphSmall}>
          If the button doesn&apos;t work, copy and paste this link into your
          browser:
        </Text>
        <Text style={link}>{resetUrl}</Text>
      </Section>
    </BaseLayout>
  );
}

const content = {
  padding: "24px 48px",
};

const paragraph = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const paragraphSmall = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "24px 0 8px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#7c3aed",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const link = {
  color: "#7c3aed",
  fontSize: "14px",
  lineHeight: "20px",
  wordBreak: "break-all" as const,
  margin: "0",
};

export default PasswordResetEmail;
