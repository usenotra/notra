import { Hr, Link, Section, Text } from "react-email";

import { EMAIL_CONFIG } from "../utils/config";

export const EmailFooter = ({
  showPhysicalAddress = true,
}: {
  showPhysicalAddress?: boolean;
} = {}) => {
  const currentYear = new Date().getFullYear();
  const address = EMAIL_CONFIG.physicalAddress;

  return (
    <Section>
      <Hr className="mx-0 mb-[26px] w-full border border-solid border-[#eaeaea]" />
      <Text className="m-0 text-center text-xs" style={{ color: "#717175" }}>
        © {currentYear} Notra. All rights reserved.
      </Text>
      {showPhysicalAddress ? (
        <Text className="mt-3 text-center text-xs" style={{ color: "#717175" }}>
          {address.name}
          <br />
          {address.street}
          <br />
          {address.locality}
          <br />
          {address.country}
        </Text>
      ) : null}
      <Text className="mt-4 text-center text-xs" style={{ color: "#717175" }}>
        <Link
          href="https://usenotra.com"
          style={{ color: "#717175", textDecoration: "underline" }}
        >
          Website
        </Link>
        {" · "}
        <Link
          href="https://usenotra.com/legal"
          style={{ color: "#717175", textDecoration: "underline" }}
        >
          Legal Notice
        </Link>
        {" · "}
        <Link
          href="https://usenotra.com/terms"
          style={{ color: "#717175", textDecoration: "underline" }}
        >
          Terms of Service
        </Link>
        {" · "}
        <Link
          href="https://usenotra.com/privacy"
          style={{ color: "#717175", textDecoration: "underline" }}
        >
          Privacy Policy
        </Link>
        {" · "}
        <Link
          href={`mailto:${EMAIL_CONFIG.replyTo}`}
          style={{ color: "#717175", textDecoration: "underline" }}
        >
          Support
        </Link>
      </Text>
    </Section>
  );
};
