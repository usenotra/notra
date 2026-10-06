import { Link, Text } from "react-email";

import { EMAIL_THEME } from "../constants/theme";

export const EmailButtonFallbackLink = ({ href }: { href: string }) => (
  <Text
    className="text-[14px] leading-[24px]"
    style={{ color: EMAIL_THEME.foreground }}
  >
    If the button doesn't work, paste this link into your browser:{" "}
    <Link
      href={href}
      style={{
        color: EMAIL_THEME.link,
        textDecoration: "underline",
        overflowWrap: "anywhere",
      }}
    >
      {href}
    </Link>
  </Text>
);
