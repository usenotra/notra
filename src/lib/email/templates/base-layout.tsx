import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

interface BaseLayoutProps {
  preview: string;
  children: ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Notra</Text>
          </Section>
          {children}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by Notra. If you didn&apos;t request this
              email, you can safely ignore it.
            </Text>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} Notra. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 48px 24px",
  borderBottom: "1px solid #e6ebf1",
};

const logo = {
  color: "#7c3aed",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0",
};

const footer = {
  padding: "24px 48px",
  borderTop: "1px solid #e6ebf1",
};

const footerText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "0 0 8px",
};
